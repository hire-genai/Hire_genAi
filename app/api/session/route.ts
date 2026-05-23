import { NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import { decrypt } from "@/lib/encryption"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Migrated to OpenAI Realtime GA API (Aug 2025).
// - Endpoint: POST /v1/realtime/client_secrets (replaces the deprecated /v1/realtime/sessions beta endpoint)
// - Body shape: { session: { type: "realtime", model, instructions, audio: { input, output }, output_modalities } }
// - Response shape: { value, expires_at, session }
// - No OpenAI-Beta header is sent — the GA API rejects the legacy beta shape.
// - This route normalizes the response to { value, expires_at, model, session } for the client.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get("companyId")

    if (!companyId) {
      return NextResponse.json({ error: "Company ID is required" }, { status: 400 })
    }

    console.log("\n" + "=".repeat(60))
    console.log("🎯 [REALTIME SESSION] Starting GA session creation...")
    console.log("📋 Company ID:", companyId)

    let apiKey: string | null = null
    let projectId: string | null = null

    // Fetch company's OpenAI credentials from database
    try {
      const rows = (await DatabaseService.query(
        `SELECT openai_service_account_key, openai_project_id, name FROM companies WHERE id = $1::uuid LIMIT 1`,
        [companyId]
      )) as any[]

      if (rows && rows.length > 0 && rows[0].openai_service_account_key) {
        try {
          const decryptedKey = decrypt(rows[0].openai_service_account_key).trim()

          if (decryptedKey.startsWith("{")) {
            const keyObj = JSON.parse(decryptedKey)
            apiKey = keyObj.value || keyObj.apiKey || keyObj.api_key || keyObj.key || null
          } else {
            apiKey = decryptedKey
          }

          if (rows[0].openai_project_id) {
            try {
              projectId = decrypt(rows[0].openai_project_id)
            } catch {
              projectId = rows[0].openai_project_id
            }
          }

          console.log("✅ [REALTIME SESSION] Using company service account key from database")
          console.log("🔑 Project ID:", projectId)
        } catch (parseError: any) {
          console.error("❌ [REALTIME SESSION] Failed to parse service key:", parseError.message)
        }
      }
    } catch (err) {
      console.error("❌ [REALTIME SESSION] Failed to fetch company credentials:", err)
    }

    // Fallback to environment variable
    if (!apiKey) {
      apiKey = process.env.OPENAI_API_KEY || null
      if (apiKey) {
        console.log("⚠️  [REALTIME SESSION] Using environment OPENAI_API_KEY (fallback)")
      }
    }

    if (!apiKey) {
      console.error("❌ [REALTIME SESSION] No OpenAI API key available")
      return NextResponse.json(
        { error: "OpenAI credentials not configured. Please connect OpenAI in Settings → Billing." },
        { status: 500 }
      )
    }

    // GA default model is `gpt-realtime`. Keep env override for flexibility.
    const model = process.env.OPENAI_REALTIME_MODEL || "gpt-realtime"
    const voice = process.env.OPENAI_REALTIME_VOICE || "alloy"
    console.log("🤖 Model:", model)

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    }

    if (projectId) {
      headers["OpenAI-Project"] = projectId
      console.log("✅ [REALTIME SESSION] Using OpenAI Project header:", projectId)
    }

    // GA request body — note the nested audio.input/audio.output structure and `type: "realtime"`.
    const requestBody = {
      session: {
        type: "realtime",
        model,
        output_modalities: ["audio"],
        instructions:
          "You are a professional AI recruiter conducting a technical interview. Core rules: speak fluent English (en-US), ask ONE question at a time, and speak in complete sentences without unnatural pauses.",
        audio: {
          input: {
            format: { type: "audio/pcm", rate: 24000 },
            transcription: { model: "whisper-1" },
            turn_detection: {
              type: "server_vad",
              threshold: 0.6,
              prefix_padding_ms: 300,
              silence_duration_ms: 1200,
              create_response: true,
            },
          },
          output: {
            format: { type: "audio/pcm", rate: 24000 },
            voice,
          },
        },
      },
    }

    // Retry on transient 5xx errors (max 2 retries with exponential backoff).
    let response: Response | null = null
    let lastError: any = null
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
          method: "POST",
          headers,
          body: JSON.stringify(requestBody),
        })

        // Don't retry on client errors (4xx); only retry on 5xx
        if (response.ok || response.status < 500) break

        lastError = `HTTP ${response.status}`
        if (attempt < 2) {
          const backoff = 500 * Math.pow(2, attempt)
          console.warn(`⚠️ [REALTIME SESSION] Attempt ${attempt + 1} failed (${lastError}), retrying in ${backoff}ms…`)
          await new Promise(r => setTimeout(r, backoff))
        }
      } catch (err: any) {
        lastError = err?.message || "Network error"
        if (attempt < 2) {
          const backoff = 500 * Math.pow(2, attempt)
          console.warn(`⚠️ [REALTIME SESSION] Attempt ${attempt + 1} threw (${lastError}), retrying in ${backoff}ms…`)
          await new Promise(r => setTimeout(r, backoff))
        }
      }
    }

    if (!response) {
      return NextResponse.json(
        { error: "Failed to reach OpenAI Realtime API", details: lastError },
        { status: 502 }
      )
    }

    if (!response.ok) {
      let errorBody: any = null
      try {
        errorBody = await response.json()
      } catch {
        errorBody = { error: await response.text() }
      }
      console.error("❌ [REALTIME SESSION] OpenAI returned error:", response.status, errorBody)
      return NextResponse.json(
        { error: "Failed to create realtime session", details: errorBody },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log("✅ [REALTIME SESSION] Session created successfully (GA)!")
    console.log("=".repeat(60) + "\n")

    // Normalize the response so callers get a predictable shape regardless of
    // future minor SDK changes. `value` is the ephemeral key for WebRTC auth.
    return NextResponse.json({
      value: data.value,
      expires_at: data.expires_at,
      model: data.session?.model || model,
      session: data.session,
    })
  } catch (error: any) {
    console.error("❌ [REALTIME SESSION] Error:", error)
    return NextResponse.json(
      { error: "Internal Server Error", details: error?.message },
      { status: 500 }
    )
  }
}
