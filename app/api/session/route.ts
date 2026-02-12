import { NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import { decrypt } from "@/lib/encryption"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get("companyId")

    if (!companyId) {
      return NextResponse.json({ error: "Company ID is required" }, { status: 400 })
    }

    console.log("\n" + "=".repeat(60))
    console.log("🎯 [REALTIME SESSION] Starting session creation...")
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

    const model = process.env.OPENAI_REALTIME_MODEL || "gpt-4o-realtime-preview"
    console.log("🤖 Model:", model)

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    }

    if (projectId) {
      headers["OpenAI-Project"] = projectId
      console.log("✅ [REALTIME SESSION] Using OpenAI Project header:", projectId)
    }

    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        voice: "alloy",
        modalities: ["audio", "text"],
        turn_detection: {
          type: "server_vad",
          silence_duration_ms: 1200,
          threshold: 0.6,
          prefix_padding_ms: 300,
        },
        input_audio_transcription: {
          model: "whisper-1",
        },
        instructions: `You are a professional AI recruiter conducting a technical interview. Core rules: speak fluent English (en-US), ask ONE question at a time, and speak in complete sentences without unnatural pauses.`,
      }),
    })

    if (!response.ok) {
      let errorBody: any = null
      try {
        errorBody = await response.json()
      } catch {
        errorBody = { error: await response.text() }
      }
      return NextResponse.json(
        { error: "Failed to create realtime session", details: errorBody },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log("✅ [REALTIME SESSION] Session created successfully!")
    console.log("🆔 Session ID:", data.id)
    console.log("=".repeat(60) + "\n")
    return NextResponse.json(data)
  } catch (error) {
    console.error("❌ [REALTIME SESSION] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
