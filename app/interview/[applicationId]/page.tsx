"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, CheckCircle2, X, AlertTriangle } from "lucide-react"

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
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [closingCountdown, setClosingCountdown] = useState<number | null>(null)
  const screenshotCapturedRef = useRef<boolean>(false)
  const screenshotDataRef = useRef<string | null>(null)

  const [conversation, setConversation] = useState<{ role: "agent" | "user"; text: string; t: number }[]>([])
  const [interviewCompleted, setInterviewCompleted] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(true)
  const [showEndWarning, setShowEndWarning] = useState(false)
  const [incompleteStats, setIncompleteStats] = useState<{ questionsAsked: number; totalQuestions: number; candidateResponses: number } | null>(null)
  const endingRef = useRef(false)

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

  const isEnglishText = (text: string): boolean => {
    if (!text || text.trim().length === 0) return false

    // Remove common punctuation and spaces for checking
    const cleanText = text.replace(/[.,!?;:()\-\s]+/g, "")

    // Check if text contains only English characters (a-z, A-Z, numbers, common punctuation)
    const englishRegex = /^[a-zA-Z0-9.,!?;:()\-'\s]+$/

    // Must pass English character test
    if (!englishRegex.test(text)) {
      console.log("🚫 [FILTER] Non-English text rejected:", text.substring(0, 50))
      return false
    }

    // Additional check: Reject if text has excessive non-ASCII characters
    const nonAsciiCount = (text.match(/[^\x00-\x7F]/g) || []).length
    const nonAsciiRatio = nonAsciiCount / text.length

    if (nonAsciiRatio > 0.3) {
      // More than 30% non-ASCII = probably not English
      console.log("🚫 [FILTER] High non-ASCII ratio rejected:", text.substring(0, 50))
      return false
    }

    console.log("✅ [FILTER] English text accepted:", text.substring(0, 50))
    return true
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

      if (finalTranscript && finalTranscript !== "[inaudible]") {
        // Filter non-English text
        if (!isEnglishText(finalTranscript)) {
          console.log("🚫 [FILTER] User transcript rejected (non-English)")
          return
        }

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

        // Filter non-English text
        if (!isEnglishText(text)) {
          console.log("🚫 [FILTER] Agent transcript rejected (non-English)")
          return
        }

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

            countdownIntervalRef.current = countdownInterval

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

  // Check if interview is complete enough before ending
  const checkInterviewCompleteness = (): { isComplete: boolean; questionsAsked: number; totalQuestions: number; candidateResponses: number } => {
    const totalQuestions = interviewQuestions.length || 7
    let questionsAsked = 0
    let candidateResponses = 0

    for (const turn of conversation) {
      if (turn.role === "agent" && turn.text.includes("?")) {
        questionsAsked++
      } else if (turn.role === "user" && turn.text.length > 0 && turn.text !== "[inaudible]") {
        candidateResponses++
      }
    }

    // Also check buffered agent text
    if (agentTextBufferRef.current && agentTextBufferRef.current.includes("?")) {
      questionsAsked++
    }

    const isComplete = questionsAsked >= totalQuestions && candidateResponses >= 5
    return { isComplete, questionsAsked, totalQuestions, candidateResponses }
  }

  // Called when user clicks end button - shows warning if incomplete
  const handleEndClick = () => {
    // If auto-end timer triggered (closing message detected), skip warning
    if (isInterviewClosing) {
      endInterview()
      return
    }

    const stats = checkInterviewCompleteness()
    if (!stats.isComplete) {
      setIncompleteStats(stats)
      setShowEndWarning(true)
      return
    }
    endInterview()
  }

  // Force end (user confirmed from warning dialog)
  const confirmEndInterview = () => {
    setShowEndWarning(false)
    endInterview()
  }

  const endInterview = async () => {
    // Prevent multiple calls using ref (state is async, ref is sync)
    if (endingRef.current || interviewCompleted) {
      console.log("🚫 Interview already ending, skipping duplicate call")
      return
    }
    endingRef.current = true
    
    // Mark as completed immediately to prevent duplicate calls
    setInterviewCompleted(true)
    
    if (autoEndTimerRef.current) {
      clearTimeout(autoEndTimerRef.current)
      autoEndTimerRef.current = null
    }

    // Clear countdown interval
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }

    // Reset countdown display
    setClosingCountdown(null)

    // Force capture screenshot before ending (if not already captured)
    await captureScreenshotSilently()

    // Wait for screenshot upload to complete
    console.log('⏳ Waiting for screenshot upload...')
    await new Promise(resolve => setTimeout(resolve, 1000))
    console.log('✅ Screenshot upload complete, now closing camera')

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

        // Only trigger evaluation if interview is NOT incomplete
        if (result.incomplete) {
          console.log("⚠️ Interview is incomplete - skipping evaluation")
          console.log("⚠️ Reasons:", result.validationErrors)
        } else {
          // Trigger evaluation (non-blocking)
          fetch(`/api/applications/${encodeURIComponent(applicationId)}/evaluate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transcript, companyId }),
          }).catch((e) => {
            console.error("❌ Failed to run evaluation:", e)
          })
        }

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

  // Interview Already Completed - Direct redirect to home
  if (interviewCompleted) {
    // Use useEffect to handle redirection instead of during render
    useEffect(() => {
      router.push("/")
    }, [interviewCompleted, router])
    
    // Show loading spinner while redirecting
    return (
      <div className="flex items-center justify-center h-screen bg-[#0b1220]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
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

  // Warning Dialog for incomplete interview
  const EndWarningDialog = () => {
    if (!showEndWarning || !incompleteStats) return null
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-red-500/40 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Interview Incomplete</h2>
              <p className="text-xs text-slate-400">This interview will NOT be evaluated</p>
            </div>
          </div>

          
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-5">
            <p className="text-xs text-red-200">
              <span className="font-semibold">Warning:</span> Ending now will mark this interview as <span className="font-bold">Incomplete</span>. 
              No evaluation or score will be generated. Are you sure you want to end?
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold"
              onClick={() => setShowEndWarning(false)}
            >
              Continue Interview
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              onClick={confirmEndInterview}
            >
              End Anyway
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <InstructionModal />
      <EndWarningDialog />
      <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col overflow-hidden">
                
        
        {/* Main Content - Teams Layout */}
        <main className="flex items-start justify-between gap-4 px-3 sm:px-4 lg:px-6 py-2 sm:py-3 h-full">
          {/* Main Video - Left Side */}
          <div className="flex-1 h-full">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-black h-full aspect-video">
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
                  <video ref={avatarVideoRef} src="https://storage.googleapis.com/ai_recruiter_bucket_prod/assets/videos/olivia_character_no_audio.mp4" className="w-[80px] h-[45px] sm:w-[110px] sm:h-[62px] md:w-[150px] md:h-[84px] object-cover" muted playsInline preload="auto" onEnded={() => { if (avatarVideoRef.current) { avatarVideoRef.current.currentTime = 3; avatarVideoRef.current.play() } }} />
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

              {/* Interview Timer */}
              <div className="absolute top-3 right-3 sm:top-6 sm:right-6 flex flex-col items-end gap-2 z-40">
                {isInterviewClosing && closingCountdown !== null ? (
                  <div className="bg-amber-600/90 backdrop-blur-md border border-amber-500/50 text-white text-xs px-4 py-2 rounded-lg font-medium animate-pulse">
                    <span className="text-amber-100">Interview ending in </span>
                    <span className="text-white font-bold text-sm">{closingCountdown}s</span>
                  </div>
                ) : (
                  <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 text-white text-xs px-4 py-2 rounded-lg font-medium">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-shrink-0">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <div className="absolute inset-0 h-2 w-2 rounded-full bg-emerald-500 animate-ping opacity-75"></div>
                      </div>
                      <span className="text-emerald-400 font-semibold">{interviewStartTime ? Math.floor((Date.now() - interviewStartTime) / 60000) : 0}:{interviewStartTime ? String(Math.floor(((Date.now() - interviewStartTime) % 60000) / 1000)).padStart(2, '0') : '00'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Live Interview Card - Right Side */}
          <div className="w-[280px] flex-shrink-0">
            <div className="bg-[#0b1220]/80 backdrop-blur-xl rounded-2xl shadow-lg shadow-blue-500/10 border border-white/10 p-4 h-full">
              {/* Header with LIVE indicator and controls */}
              <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse"></div>
                    <div className="absolute inset-0 h-2.5 w-2.5 rounded-full bg-red-500 animate-ping opacity-75"></div>
                  </div>
                  <p className="text-sm text-white font-semibold tracking-wide">LIVE INTERVIEW</p>
                </div>
                
                {/* Control Buttons - Now in header */}
                <div className="flex items-center gap-2">
                  <Button 
                    size="icon" 
                    className={`w-8 h-8 rounded-full transition-all duration-200 hover:scale-105 ${
                      micOn 
                        ? "bg-green-500/10 border border-green-500/30 hover:bg-green-500/20 hover:border-green-500/40" 
                        : "bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/40"
                    }`} 
                    onClick={toggleMic}
                  >
                    {micOn ? <Mic className="h-3 w-3 text-green-400" /> : <MicOff className="h-3 w-3 text-red-400" />}
                  </Button>
                  <Button 
                    size="icon" 
                    className={`w-8 h-8 rounded-full transition-all duration-200 hover:scale-105 ${
                      camOn 
                        ? "bg-green-500/10 border border-green-500/30 hover:bg-green-500/20 hover:border-green-500/40" 
                        : "bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/40"
                    }`} 
                    onClick={toggleCam}
                  >
                    {camOn ? <VideoIcon className="h-3 w-3 text-green-400" /> : <VideoOff className="h-3 w-3 text-red-400" />}
                  </Button>
                  <Button 
                    size="icon" 
                    className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/40 transition-all duration-200 hover:scale-105" 
                    onClick={handleEndClick}
                  >
                    <PhoneOff className="h-3 w-3 text-red-400" />
                  </Button>
                </div>
              </div>
              
              {/* Interview Details Cards */}
              <div className="space-y-3">
                {/* Position Card */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 backdrop-blur-md transition-all duration-200 hover:border-blue-500/30 hover:bg-blue-500/15">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/60 font-medium">Position</p>
                    <p className="text-sm text-white font-semibold truncate">{jobDetails?.jobTitle || "Position"}</p>
                  </div>
                </div>
                
                {/* Company Card */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20 backdrop-blur-md transition-all duration-200 hover:border-green-500/30 hover:bg-green-500/15">
                  <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/60 font-medium">Company</p>
                    <p className="text-sm text-white font-semibold truncate">{jobDetails?.company || "Company"}</p>
                  </div>
                </div>
                
                {/* Candidate Card */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 backdrop-blur-md transition-all duration-200 hover:border-purple-500/30 hover:bg-purple-500/15">
                  <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/60 font-medium">Candidate</p>
                    <p className="text-sm text-white font-semibold truncate">{jobDetails?.candidateName || "Candidate"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
