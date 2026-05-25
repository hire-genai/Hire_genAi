import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const resource = process.env.AZURE_OPENAI_RESOURCE;
  const deployment = process.env.NEXT_PUBLIC_AZURE_REALTIME_DEPLOYMENT;
  const voice = process.env.AZURE_REALTIME_VOICE || "shimmer";

  if (!apiKey || !resource || !deployment) {
    return NextResponse.json(
      { error: "Missing required Azure env vars (AZURE_OPENAI_API_KEY, AZURE_OPENAI_RESOURCE, NEXT_PUBLIC_AZURE_REALTIME_DEPLOYMENT)." },
      { status: 500 }
    );
  }

  const sessionsUrl = `${resource.replace(/\/+$/, "")}/openai/v1/realtime/client_secrets`;

  try {
    const resp = await fetch(sessionsUrl, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: deployment,
          instructions:
            "You are an AI interviewer who must always speak in English. Politely refuse and rephrase in English if the user speaks another language. Maintain a professional tone suited for hiring conversations.",
          audio: { output: { voice } },
        },
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("Azure session creation failed:", resp.status, text);
      return NextResponse.json({ error: text }, { status: resp.status });
    }

    const data = await resp.json();
    return NextResponse.json({
      ...data,
      client_secret: { value: data.value, expires_at: data.expires_at },
    });
  } catch (error: any) {
    console.error("Azure session creation error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create Azure session" },
      { status: 500 }
    );
  }
}
