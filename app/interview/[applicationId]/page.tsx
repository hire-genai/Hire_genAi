"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, CheckCircle2, X } from "lucide-react"

export default function InterviewPage() {
  const params = useParams()
  const router = useRouter()
  const applicationId = (params?.applicationId as string) || ""
  const userVideoRef = useRef<HTMLVideoElement | null>(null)
  const avatarVideoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const agentAudioRef = useRef<HTMLAudioElement | null>(null)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [initializing, setInitializing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [agentReady, setAgentReady] = useState(false)
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [jobDetails, setJobDetails] = useState<any>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [interviewQuestions, setInterviewQuestions] = useState<any[]>([])
  const [interviewStartTime, setInterviewStartTime] = useState<number | null>(null)
  const [interviewDuration, setInterviewDuration] = useState(30)
  const [showInstructions, setShowInstructions] = useState(true)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const initSeqRef = useRef(0)
  const agentTextBufferRef = useRef<string>("")
  const userTextBufferRef = useRef<string>("")
  const avatarFirstPlayRef = useRef<boolean>(true)
  const companyIdRef = useRef<string | null>(null)
  const [isInterviewClosing, setIsInterviewClosing] = useState(false)
  const autoEndTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [closingCountdown, setClosingCountdown] = useState<number | null>(null)
  const screenshotCapturedRef = useRef<boolean>(false)
  const screenshotDataRef = useRef<string | null>(null)

  const [conversation, setConversation] = useState<{ role: "agent" | "user"; text: string; t: number }[]>([])
  const [interviewCompleted, setInterviewCompleted] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(true)

  const logTs = (label: string, text?: string) => {
    const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    if (text !== undefined) {
      console.log(`[${ts}] ${label}`, text)
    } else {
      console.log(`[${ts}] ${label}`)
    }
  }

  const extractMessageText = (content: any[] = []): string => {
    if (!Array.isArray(content)) return ""
    return content
      .map((c) => {
        if (!c || typeof c !== "object") return ""
        if (c.type === "input_text") return c.text ?? ""
        if (c.type === "audio") return c.transcript ?? ""
        if (c.type === "input_audio") return c.transcript ?? ""
        return ""
      })
      .filter(Boolean)
      .join("\n")
  }

  // Silent screenshot capture function - captures from user's video and stores in ref
  const captureScreenshotSilently = async () => {
    console.log('📸 [SCREENSHOT] captureScreenshotSilently called')
    
    // Only capture once
    if (screenshotCapturedRef.current) {
      console.log('📸 [SCREENSHOT] Already captured, skipping')
      return
    }
    screenshotCapturedRef.current = true
    
    try {
      const videoElement = userVideoRef.current
      console.log('📸 [SCREENSHOT] Video element:', videoElement ? 'exists' : 'null')
      
      if (!videoElement || !videoElement.srcObject) {
        console.log('📸 [SCREENSHOT] No video element or srcObject - aborting')
        screenshotCapturedRef.current = false
        return
      }
      
      // Create a canvas to capture the video frame
      const canvas = document.createElement('canvas')
      canvas.width = videoElement.videoWidth || 1280
      canvas.height = videoElement.videoHeight || 720
      console.log('📸 [SCREENSHOT] Canvas size:', canvas.width, 'x', canvas.height)
      
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        console.log('📸 [SCREENSHOT] Failed to get canvas context')
        return
      }
      
      // Draw the current video frame to canvas (mirror it back since video is mirrored)
      ctx.save()
      ctx.scale(-1, 1)
      ctx.drawImage(videoElement, -canvas.width, 0, canvas.width, canvas.height)
      ctx.restore()
      
      // Convert to base64 and store in ref
      const screenshot = canvas.toDataURL('image/jpeg', 0.8)
      screenshotDataRef.current = screenshot
      console.log('📸 [SCREENSHOT] Screenshot captured and stored, size:', screenshot.length, 'bytes')
      
      // Send to backend
      try {
        await fetch(`/api/applications/${encodeURIComponent(applicationId)}/interview-screenshot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ screenshot, type: 'during_interview' })
        })
        console.log('📸 [SCREENSHOT] Screenshot uploaded to server')
      } catch (uploadErr) {
        console.error('📸 [SCREENSHOT] Failed to upload screenshot:', uploadErr)
      }
      
    } catch (err) {
      console.error('📸 [SCREENSHOT] Capture error:', err)
    }
  }

  const handleTranscriptionCompleted = (event: any) => {
    if (event.type === "conversation.item.input_audio_transcription.completed") {
      const finalTranscript = !event.transcript || event.transcript === "\n" ? "[inaudible]" : event.transcript
      console.log("🎤 [TRANSCRIPTION] User said:", finalTranscript.substring(0, 100))

      if (finalTranscript) {
        setConversation((prev) => {
          const last = prev[prev.length - 1]
          if (last && last.role === "user" && last.text === finalTranscript) return prev
          const next = [...prev, { role: "user" as const, text: finalTranscript, t: Date.now() }]
          try {
            localStorage.setItem(`interview:${applicationId}`, JSON.stringify({ id: applicationId, createdAt: Date.now(), conversation: next }))
          } catch {}
          return next
        })
      }
    } else if (event.type === "response.audio_transcript.done") {
      const text = agentTextBufferRef.current
      if (text) {
        agentTextBufferRef.current = ""
        setConversation((prev) => {
          const last = prev[prev.length - 1]
          if (last && last.role === "agent" && last.text === text) return prev
          const next = [...prev, { role: "agent" as const, text, t: Date.now() }]
          try {
            localStorage.setItem(`interview:${applicationId}`, JSON.stringify({ id: applicationId, createdAt: Date.now(), conversation: next }))
          } catch {}
          return next
        })

        // Check for closing message
        if (!text.includes("?")) {
          const lowerText = text.toLowerCase()
          const isClosingMessage =
            lowerText.includes("thank you for interviewing") ||
            lowerText.includes("thank you for your time today") ||
            (lowerText.includes("thank you") && lowerText.includes("recruitment team")) ||
            (lowerText.includes("thank you") && lowerText.includes("respond soon"))

          if (isClosingMessage && !isInterviewClosing) {
            console.log("🏁 [CLOSING] Detected closing message - starting 20-second auto-end timer")
            setIsInterviewClosing(true)
            setClosingCountdown(20)
            
            // Capture silent screenshot when closing detected
            captureScreenshotSilently()

            if (autoEndTimerRef.current) clearTimeout(autoEndTimerRef.current)

            let countdown = 20
            const countdownInterval = setInterval(() => {
              countdown -= 1
              setClosingCountdown(countdown)
              if (countdown <= 0) clearInterval(countdownInterval)
            }, 1000)

            autoEndTimerRef.current = setTimeout(() => {
              console.log("⏰ [AUTO-END] 20 seconds elapsed - automatically ending interview")
              clearInterval(countdownInterval)
              endInterview()
            }, 20000)
          }
        }
      }
    }
  }

  const handleTranscriptionDelta = (event: any) => {
    if (event.type === "response.audio_transcript.delta" && typeof event.delta === "string") {
      agentTextBufferRef.current += event.delta
    }
  }

  const handleHistoryAdded = (item: any) => {
    if (!item || item.type !== "message") return
    const { role, content = [] } = item
    let text = extractMessageText(content)
    if (text && text !== "[Transcribing...]") {
      setConversation((prev) => {
        const last = prev[prev.length - 1]
        if (last && last.role === role && last.text === text) return prev
        return [...prev, { role: role as "agent" | "user", text, t: Date.now() }]
      })
    }
  }

  // Check if interview is already completed, then init
  useEffect(() => {
    if (!applicationId) {
      router.push("/")
      return
    }

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/applications/${encodeURIComponent(applicationId)}/interview-status`, { cache: "no-store" })
        const json = await res.json()

        if (res.ok && json?.ok) {
          if (!json.canInterview) {
            setInterviewCompleted(true)
            setCheckingStatus(false)
            return
          }
        }
        await init()
      } catch (e) {
        console.error("Failed to check interview status:", e)
        await init()
      }
    }

    const init = async () => {
      try {
        const res = await fetch(`/api/applications/${encodeURIComponent(applicationId)}/interview-questions`, { cache: "no-store" })
        const json = await res.json()

        if (res.ok && json?.ok) {
          const details = {
            jobTitle: json.application?.jobTitle || "Position",
            company: json.application?.companyName || "Company",
            candidateName: json.application?.candidateName || "Candidate",
          }

          const fetchedCompanyId = json.application?.companyId || null
          if (fetchedCompanyId) {
            setCompanyId(fetchedCompanyId)
            companyIdRef.current = fetchedCompanyId
          }

          const allQuestions =
            json.rounds?.flatMap((round: any) =>
              round.questions?.map((q: string, index: number) => ({
                text: q,
                roundName: round.name,
                criteria: round.criteria || [],
                sequence: index + 1,
              })) || []
            ) || []

          const duration = json.rounds?.[0]?.duration_minutes || 30

          setJobDetails(details)
          setInterviewQuestions(allQuestions)
          setInterviewDuration(duration)
          setCheckingStatus(false)

          await requestPermissions(details, allQuestions, duration, fetchedCompanyId)
        } else {
          setCheckingStatus(false)
          await requestPermissions(null, [], 30, null)
        }
      } catch (e) {
        console.error("Failed to fetch interview questions:", e)
        setCheckingStatus(false)
        await requestPermissions(null, [], 30, null)
      }
    }

    checkStatus()
  }, [applicationId])

  const requestPermissions = async (details: any, questions: any[] = [], duration: number = 30, fetchedCompanyId: string | null = null) => {
    setInitializing(true)
    setError(null)
    const initSeq = ++initSeqRef.current
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, aspectRatio: { ideal: 1.7777778 }, facingMode: "user" },
        audio: true,
      })
      streamRef.current = stream
      if (userVideoRef.current) {
        userVideoRef.current.srcObject = stream
        await userVideoRef.current.play().catch(() => {})
      }

      const activeCompanyId = fetchedCompanyId || companyId
      if (!activeCompanyId) {
        throw new Error("Company ID not available. Cannot create interview session without company credentials.")
      }

      logTs("Init: Requesting ephemeral session…")
      const resp = await fetch(`/api/session?companyId=${encodeURIComponent(activeCompanyId)}`)
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}))
        throw new Error(j?.error || "Failed to init AI agent session")
      }
      const data = await resp.json()
      logTs("Init: Ephemeral session received")
      setSessionInfo(data)
      await initRealtimeConnection(data, stream, details, questions, duration, initSeq)
      setAgentReady(true)
      setInterviewStartTime(Date.now())
      logTs("Agent Connected")
    } catch (e: any) {
      console.error("❌ Interview initialization failed:", e)
      setError(e?.message || "Please allow camera and microphone to start the interview.")
    } finally {
      setInitializing(false)
    }
  }

  const initRealtimeConnection = async (session: any, localStream: MediaStream, details: any, questions: any[] = [], duration: number = 30, initSeq?: number) => {
    pcRef.current?.close()
    pcRef.current = null

    const pc = new RTCPeerConnection({ iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }] })
    pcRef.current = pc
    pc.onconnectionstatechange = () => {
      logTs("RTC connectionState =", pc.connectionState)
      if (pc.connectionState === "connected") {
        try { avatarVideoRef.current?.play().catch(() => {}) } catch {}
      }
    }

    const remoteStream = new MediaStream()
    if (agentAudioRef.current) {
      agentAudioRef.current.srcObject = remoteStream
      agentAudioRef.current.autoplay = true
      agentAudioRef.current.muted = false
    }
    pc.ontrack = (event) => {
      try {
        if (event.streams?.[0]) {
          event.streams[0].getTracks().forEach((t) => remoteStream.addTrack(t))
        } else if (event.track) {
          remoteStream.addTrack(event.track)
        }
        agentAudioRef.current?.play().catch(() => {})
      } catch {}
    }

    localStream.getAudioTracks().forEach((track) => pc.addTrack(track, localStream))
    pc.addTransceiver("audio", { direction: "recvonly" })
    pc.addTransceiver("video", { direction: "recvonly" })

    const dc = pc.createDataChannel("oai-events")
    dcRef.current = dc
    dc.onopen = () => {
      logTs("DC open")
      try { avatarVideoRef.current?.play().catch(() => {}) } catch {}
      try {
        let instructions = `You are Olivia, a professional AI recruiter conducting a structured video interview. Follow this EXACT process:

**IMPORTANT LANGUAGE POLICY:**
- You MUST speak ONLY in English throughout the entire interview.
- If the candidate speaks in ANY language other than English, IMMEDIATELY and POLITELY respond:
  "I apologize, but I can only conduct this interview in English. Please respond in English so I can properly evaluate your answers."

**STEP 1: GREETING & SETUP CHECK**
- Greet warmly: "Hello ${details?.candidateName || "there"}, welcome and thank you for joining today's interview."
- Confirm setup: "Before we begin, can you please confirm that your audio and video are working fine?"
- Wait for confirmation before proceeding.

**STEP 2: START INTERVIEW**
- Once setup confirmed: "Great, let's get started. This interview will last about ${duration} minutes. I'll be asking you questions based on the ${details?.jobTitle || "position"} role you applied for at ${details?.company || "our company"}."

**STEP 3: QUESTION FLOW**
You MUST ask ONLY these questions in this exact order:`

        if (questions && questions.length > 0) {
          questions.forEach((q, index) => {
            instructions += `\n${index + 1}. ${q.text}`
          })
        } else {
          instructions += `\n1. Tell me about yourself and your relevant experience.
2. Why are you interested in this position?
3. What motivates you in your work?
4. Describe a challenging situation you faced and how you handled it.
5. How do you handle feedback and criticism?
6. Tell me about a time you worked in a team to achieve a goal.
7. What technical skills do you bring to this role?`
        }

        instructions += `

**ANSWER HANDLING:**
After each candidate response:
1. If the answer is RELEVANT → Acknowledge briefly and proceed to the NEXT question
2. If the answer is NOT relevant → Politely redirect
3. Do NOT ask "Have you finished your answer?" - just proceed naturally

**STEP 4: CLOSING**
Once the candidate answers the LAST question:
- Say EXACTLY: "Thank you for interviewing today. Our recruitment team will respond soon."
- Do NOT ask anything else after this closing message
- Remain silent after the closing message

**INTERVIEW CONTEXT:**
- Candidate: ${details?.candidateName || "Candidate"}
- Position: ${details?.jobTitle || "Position"}
- Company: ${details?.company || "Company"}
- Duration: ${duration} minutes
- Total Questions: ${questions?.length || 7}`

        const updateMsg = {
          type: "session.update",
          session: {
            modalities: ["audio", "text"],
            instructions,
            voice: "alloy",
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            input_audio_transcription: { model: "whisper-1" },
            turn_detection: {
              type: "server_vad",
              threshold: 0.6,
              prefix_padding_ms: 300,
              silence_duration_ms: 1200,
            },
          },
        }
        dc.send(JSON.stringify(updateMsg))

        const startMsg = {
          type: "response.create",
          response: { modalities: ["audio", "text"] },
        }
        dc.send(JSON.stringify(startMsg))
        logTs("Interview started - Step 1: Greeting & Setup")
      } catch (e) {
        console.error("Error in dc.onopen:", e)
      }
    }
    dc.onerror = (e) => console.log("[DC] error", e)
    dc.onclose = () => console.log("[DC] close")
    dc.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data)
        switch (msg.type) {
          case "conversation.item.input_audio_transcription.completed":
            handleTranscriptionCompleted(msg)
            break
          case "response.audio_transcript.done":
            handleTranscriptionCompleted(msg)
            break
          case "response.audio_transcript.delta":
            handleTranscriptionDelta(msg)
            break
          case "conversation.item.created":
            handleHistoryAdded(msg.item || msg)
            break
        }
        if (msg.type === "response.output_text.delta" && typeof msg.delta === "string") {
          agentTextBufferRef.current += msg.delta
        }
      } catch {
        console.log("[DC raw]", evt.data)
      }
    }

    logTs("RTC: Creating offer…")
    if (initSeq != null && initSeq !== initSeqRef.current) return

    const offer = await pc.createOffer()
    if (initSeq != null && initSeq !== initSeqRef.current) return
    await pc.setLocalDescription(offer)

    const baseUrl = "https://api.openai.com/v1/realtime"
    const model = session?.model || "gpt-4o-realtime-preview"
    const clientSecret = session?.client_secret?.value
    if (!clientSecret) throw new Error("Missing realtime client secret from session response")

    logTs("RTC: Exchanging SDP with OpenAI…")
    const sdpResponse = await fetch(`${baseUrl}?model=${encodeURIComponent(model)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${clientSecret}`, "Content-Type": "application/sdp" },
      body: offer.sdp || "",
    })
    if (!sdpResponse.ok) {
      const txt = await sdpResponse.text()
      throw new Error(`Realtime SDP exchange failed: ${txt}`)
    }
    const answerSdp = await sdpResponse.text()
    if (initSeq != null && initSeq !== initSeqRef.current) return

    try {
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp })
    } catch (e) {
      const isActive = pc.signalingState === "stable" || pc.signalingState === "have-local-offer"
      if (!isActive) return
      throw e
    }
    logTs("RTC: Remote description set. Waiting for tracks…")
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      initSeqRef.current += 1
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      pcRef.current?.close()
      pcRef.current = null
      if (autoEndTimerRef.current) {
        clearTimeout(autoEndTimerRef.current)
        autoEndTimerRef.current = null
      }
    }
  }, [])

  // Sync avatar video with agent audio
  useEffect(() => {
    const agentAudio = agentAudioRef.current
    const avatarVideo = avatarVideoRef.current
    if (!agentAudio || !avatarVideo) return

    const handlePlay = () => { avatarVideo.play().catch(() => {}) }
    const handlePause = () => { avatarVideo.pause() }

    agentAudio.addEventListener("play", handlePlay)
    agentAudio.addEventListener("playing", handlePlay)
    agentAudio.addEventListener("pause", handlePause)
    agentAudio.addEventListener("ended", handlePause)

    return () => {
      agentAudio.removeEventListener("play", handlePlay)
      agentAudio.removeEventListener("playing", handlePlay)
      agentAudio.removeEventListener("pause", handlePause)
      agentAudio.removeEventListener("ended", handlePause)
    }
  }, [agentReady])

  const toggleMic = () => {
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !t.enabled))
    setMicOn((prev) => !prev)
  }

  const toggleCam = () => {
    streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !t.enabled))
    setCamOn((prev) => !prev)
  }

  const endInterview = async () => {
    if (autoEndTimerRef.current) {
      clearTimeout(autoEndTimerRef.current)
      autoEndTimerRef.current = null
    }

    // Force capture screenshot before ending (if not already captured)
    await captureScreenshotSilently()

    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    try { pcRef.current?.close(); pcRef.current = null } catch {}

    try {
      const turns = (() => {
        let arr = [] as { role: "agent" | "user"; text: string; t: number }[]
        try { arr = JSON.parse(JSON.stringify(conversation)) } catch { arr = conversation }
        if (agentTextBufferRef.current) {
          arr.push({ role: "agent", text: agentTextBufferRef.current, t: Date.now() })
          agentTextBufferRef.current = ""
        }
        return arr
      })()

      localStorage.setItem(`interview:${applicationId}`, JSON.stringify({ id: applicationId, createdAt: Date.now(), conversation: turns }))

      const transcript = turns.map((t) => `${t.role === "agent" ? "Interviewer" : "Candidate"}: ${t.text}`).join("\n\n")
      console.log("📝 Saving transcript to database...")
      console.log("📝 Conversation turns:", turns.length)

      const response = await fetch(`/api/applications/${encodeURIComponent(applicationId)}/interview-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, startedAt: interviewStartTime }),
      }).catch((e) => {
        console.error("❌ Failed to mark interview as completed:", e)
        return null
      })

      if (response && response.ok) {
        const result = await response.json()
        console.log("✅ Interview marked as completed:", result)

        // Trigger evaluation (non-blocking)
        fetch(`/api/applications/${encodeURIComponent(applicationId)}/evaluate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript, companyId }),
        }).catch((e) => {
          console.error("❌ Failed to run evaluation:", e)
        })

        // Immediate redirect to post-verify page
        console.log("🔄 Redirecting to post-verify page...")
        router.push(`/interview/${encodeURIComponent(applicationId)}/post-verify`)
        return
      } else {
        console.error("❌ Failed to mark interview as completed")
      }
    } catch (error) {
      console.error("❌ Error ending interview:", error)
    }

    // Fallback redirect on error
    router.push("/")
  }

  // Interview Already Completed
  if (interviewCompleted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="mb-6 flex justify-center">
            <div className="h-16 w-16 rounded-full bg-orange-100 flex items-center justify-center">
              <svg className="h-8 w-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Interview Already Completed</h1>
          <p className="text-lg text-slate-600 mb-6">This interview link has already been used.</p>
          <p className="text-sm text-slate-500 mb-8">Each interview link can only be used once for security purposes.</p>
          <Button onClick={() => router.push("/")} className="bg-black text-white hover:bg-gray-900">Go to Home</Button>
          <div className="mt-6 text-xs text-slate-400">Application ID: <span className="font-mono">{applicationId.substring(0, 12)}...</span></div>
        </div>
      </div>
    )
  }

  // Loading
  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-slate-600">Checking interview status...</p>
        </div>
      </div>
    )
  }

  // Instruction Modal
  const InstructionModal = () => (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-300 ${showInstructions ? "bg-black/60 backdrop-blur-sm" : "pointer-events-none"}`}>
      <div className={`bg-gradient-to-br from-slate-900 to-slate-800 border border-emerald-500/30 rounded-2xl shadow-2xl max-w-xl w-full mx-4 transform transition-all duration-300 ${showInstructions ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}>
        <div className="border-b border-emerald-500/20 px-5 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Interview Instructions</h2>
              <p className="text-xs text-slate-400">Please read before starting</p>
            </div>
          </div>
          <button onClick={() => setShowInstructions(false)} className="text-slate-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-5 space-y-3">
          {[
            { title: "Ensure Good Lighting", desc: "Position yourself in a well-lit area. Avoid backlighting." },
            { title: "Test Your Microphone & Camera", desc: "Make sure both are working properly." },
            { title: "Stable Internet Connection", desc: "Use a wired connection if possible." },
            { title: "Quiet Environment", desc: "Choose a quiet place with minimal background noise." },
            { title: "Keep Camera On", desc: "Your camera must remain on throughout the interview." },
            { title: "Professional Setting", desc: "Ensure your background is clean and professional." },
          ].map((item, i) => (
            <div key={i} className="flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-white text-sm mb-0.5">{item.title}</h3>
                <p className="text-xs text-slate-400">{item.desc}</p>
              </div>
            </div>
          ))}
          <div className="bg-emerald-600/10 border border-emerald-500/30 rounded-lg p-3">
            <p className="text-xs text-emerald-200">
              <span className="font-semibold">Tip:</span> The interview will be recorded for evaluation purposes. Speak clearly and take your time.
            </p>
          </div>
        </div>
        <div className="border-t border-emerald-500/20 px-5 py-4 flex justify-end">
          <Button onClick={() => setShowInstructions(false)} className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold shadow-lg text-sm px-4 py-2">
            I Understand, Let&apos;s Start
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <InstructionModal />
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Header */}
        <header className="border-b border-emerald-500/30 bg-gradient-to-r from-slate-900/80 via-slate-800/80 to-slate-900/80 backdrop-blur-lg sticky top-0 z-40 shadow-lg">
          <div className="mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg flex-shrink-0">
                <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <h1 className="text-base font-bold text-white leading-tight">AI Interview</h1>
                <p className="text-sm font-semibold text-emerald-300">{jobDetails?.jobTitle || "Position"}</p>
                <p className="text-xs text-slate-400">{jobDetails?.company || "Company"}</p>
              </div>
            </div>
            <div className="w-full sm:w-auto sm:ml-auto flex items-center justify-end gap-3">
              <Button size="icon" variant="ghost" className={`rounded-lg transition-all duration-300 hover:scale-110 ${micOn ? "bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400" : "bg-red-600/20 hover:bg-red-600/40 text-red-400"}`} onClick={toggleMic}>
                {micOn ? <Mic className="h-7 w-7" /> : <MicOff className="h-7 w-7" />}
              </Button>
              <Button size="icon" variant="ghost" className={`rounded-lg transition-all duration-300 hover:scale-110 ${camOn ? "bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400" : "bg-red-600/20 hover:bg-red-600/40 text-red-400"}`} onClick={toggleCam}>
                {camOn ? <VideoIcon className="h-7 w-7" /> : <VideoOff className="h-7 w-7" />}
              </Button>
              <Button size="icon" className="rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg transition-all duration-300 hover:scale-110" onClick={endInterview}>
                <PhoneOff className="h-7 w-7" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex items-start justify-center px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="w-full max-w-4xl">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-black aspect-video group">
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 to-black">
                <video ref={userVideoRef} className={`block w-full h-full object-cover object-center transition-opacity duration-300 ${camOn ? "opacity-100" : "opacity-30"}`} style={{ transform: "scaleX(-1)" }} muted playsInline autoPlay />
                {!camOn && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="h-20 w-20 rounded-full bg-slate-700 flex items-center justify-center mb-4">
                      <VideoOff className="h-10 w-10 text-slate-400" />
                    </div>
                    <p className="text-slate-300 font-medium">Camera is off</p>
                  </div>
                )}
              </div>

              {/* Avatar PIP */}
              <div className="absolute right-2 bottom-2 sm:right-4 sm:bottom-6 md:right-6 md:bottom-8">
                <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500/40 shadow-2xl bg-black/80 backdrop-blur-md">
                  <video ref={avatarVideoRef} src="https://storage.googleapis.com/ai_recruiter_bucket_prod/assets/videos/olivia_character_no_audio.mp4" className="w-[110px] h-[62px] sm:w-[150px] sm:h-[84px] md:w-[220px] md:h-[124px] object-cover" muted playsInline preload="auto" onEnded={() => { if (avatarVideoRef.current) { avatarVideoRef.current.currentTime = 3; avatarVideoRef.current.play() } }} />
                  <audio ref={agentAudioRef} className="hidden" />
                  <div className="absolute left-2 bottom-2 text-[9px] md:text-xs font-semibold text-emerald-300 drop-shadow-lg">Olivia</div>
                  {agentReady && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-emerald-600/90 text-white text-[9px] md:text-xs px-2 py-0.5 rounded-full shadow-lg">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-200 animate-pulse"></div>
                      Connected
                    </div>
                  )}
                </div>
              </div>

              {/* Timer/Status */}
              <div className="absolute top-3 right-3 sm:top-6 sm:right-6 flex flex-col items-end gap-2 z-40">
                {isInterviewClosing && closingCountdown !== null ? (
                  <div className="bg-amber-600/90 backdrop-blur-md border border-amber-500/50 text-white text-xs px-4 py-2 rounded-lg font-medium animate-pulse">
                    <span className="text-amber-100">Interview ending in </span>
                    <span className="text-white font-bold text-sm">{closingCountdown}s</span>
                  </div>
                ) : (
                  <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 text-white text-xs px-4 py-2 rounded-lg font-medium">
                    <span className="text-slate-400">Status: </span>
                    <span className="text-emerald-400 font-semibold">Recording</span>
                  </div>
                )}
              </div>
            </div>

            {/* Instructions below video */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: <Mic className="h-4 w-4 text-emerald-400" />, title: "Microphone", desc: "Ensure your mic is on and working properly" },
                { icon: <VideoIcon className="h-4 w-4 text-emerald-400" />, title: "Camera", desc: "Keep your camera on throughout the interview" },
                { icon: <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>, title: "Connection", desc: "Maintain a stable internet connection" },
              ].map((item, i) => (
                <div key={i} className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-4 text-sm text-slate-300">
                  <div className="flex items-center gap-2 mb-2">
                    {item.icon}
                    <span className="font-semibold text-white">{item.title}</span>
                  </div>
                  <p className="text-xs text-slate-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
