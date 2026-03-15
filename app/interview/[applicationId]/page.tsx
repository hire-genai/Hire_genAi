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
  const lastQuestionAskedRef = useRef<string>("")
  const questionSnapshotRef = useRef<string>("") // The question user is CURRENTLY answering - only advances AFTER answer stored
  const questionQueueRef = useRef<string[]>([]) // Queue of questions agent asked, waiting for user to answer current one first
  const currentCriterionRef = useRef<string>("")
  const questionElaborationRef = useRef<{ question: string; combinedText: string; prompts: number } | null>(null)
  const currentQuestionNumberRef = useRef<number>(1)
  const currentQuestionIndexRef = useRef<number>(0)
  const waitingForResponseRef = useRef<boolean>(false)
  const questionsAnsweredRef = useRef<Map<number, string>>(new Map())
  const interviewQuestionsRef = useRef<any[]>([])
  const realTimeEvaluationsRef = useRef<any[]>([])

  const [conversation, setConversation] = useState<{ role: "agent" | "user"; text: string; t: number }[]>([])
  const [interviewCompleted, setInterviewCompleted] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(true)
  const [showEndWarning, setShowEndWarning] = useState(false)
  const [incompleteStats, setIncompleteStats] = useState<{ questionsAsked: number; totalQuestions: number; candidateResponses: number } | null>(null)
  const endingRef = useRef(false)
  const agentSpeakingRef = useRef(false)
  const audioTrackRef = useRef<MediaStreamTrack | null>(null)

  // Mute user mic while AI is speaking to prevent echo feedback
  const setUserMicEnabled = (enabled: boolean) => {
    if (audioTrackRef.current) {
      audioTrackRef.current.enabled = enabled
      console.log(`🎙️ [MIC] ${enabled ? 'UNMUTED' : 'MUTED'} (AI ${enabled ? 'stopped' : 'started'} speaking)`)
    }
  }

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

  const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length

  // Check if user response is a real answer (not just acknowledgment/filler)
  const isRealAnswer = (text: string): boolean => {
    const lower = text.toLowerCase().trim()
    
    // Check for repeat requests FIRST (before word count check)
    const repeatPhrases = [
      "can you please repeat", "please repeat", "repeat the question", "can you repeat",
      "say again", "could you repeat", "say that again", "what was the question"
    ]
    
    for (const phrase of repeatPhrases) {
      if (lower.includes(phrase)) {
        console.log("🚫 [ANSWER] Detected repeat request:", text)
        return false
      }
    }
    
    const words = countWords(text)
    
    // Too short to be a real answer (less than 5 words)
    if (words < 5) {
      // Check for common non-answer phrases
      const nonAnswerPhrases = [
        "thank you", "thanks", "okay", "ok", "yes", "no", "sure", "alright",
        "got it", "understood", "i see", "right", "correct", "please",
        "go ahead", "continue", "next", "let's go", "let's start",
        "please do", "proceed", "i understand", "fine", "good",
        "yeah", "yep", "nope", "hmm", "uh", "um", "well",
        "that's it", "that is it", "nothing else", "no more",
        "last question", "next question", "the situation", "and stay",
        "bye", "goodbye", "see you", "take care"
      ]
      
      for (const phrase of nonAnswerPhrases) {
        if (lower.includes(phrase) || lower === phrase) {
          console.log("🚫 [ANSWER] Detected non-answer phrase:", text)
          return false
        }
      }
      
      console.log("🚫 [ANSWER] Too short to be real answer:", text)
      return false
    }
    
    console.log("✅ [ANSWER] Real answer detected:", text.substring(0, 50), `(${words} words)`)
    return true
  }

  // Check if candidate explicitly wants to end the interview
  const isCandidateEndingInterview = (text: string): boolean => {
    const lower = text.toLowerCase().trim()
    const endPhrases = [
      "i want to end the interview",
      "i'd like to end",
      "i would like to end",
      "please end the interview",
      "end this interview",
      "stop the interview",
      "i'm done with the interview",
      "i want to stop",
      "let's end this",
      "i want to quit",
      "i don't want to continue"
    ]
    return endPhrases.some(phrase => lower.includes(phrase))
  }

  // Store individual answer to database immediately
  const storeAnswerToDb = async (questionIndex: number, questionText: string, answerText: string) => {
    try {
      console.log(`💾 [STORE] Saving answer for Q${questionIndex + 1} to database...`)
      questionsAnsweredRef.current.set(questionIndex, answerText)
      
      // Build partial transcript from all stored answers so far
      const partialTranscript = Array.from(questionsAnsweredRef.current.entries())
        .sort(([a], [b]) => a - b)
        .map(([idx, ans]) => {
          const q = interviewQuestionsRef.current[idx]
          return `Interviewer: ${q?.text || 'Question ' + (idx + 1)}\n\nCandidate: ${ans}`
        })
        .join("\n\n")
      
      // Save partial transcript to localStorage for resilience
      try {
        localStorage.setItem(`interview-answers:${applicationId}`, JSON.stringify({
          answers: Object.fromEntries(questionsAnsweredRef.current),
          lastUpdated: Date.now()
        }))
      } catch {}
      
      console.log(`✅ [STORE] Answer for Q${questionIndex + 1} stored (${questionsAnsweredRef.current.size} total answers)`)
    } catch (err) {
      console.error(`❌ [STORE] Failed to store answer for Q${questionIndex + 1}:`, err)
    }
  }

  // Real-time single answer evaluation (non-blocking)
  const evaluateSingleAnswerRealTime = async (questionIndex: number, questionText: string, answerText: string) => {
    try {
      const question = interviewQuestionsRef.current[questionIndex]
      console.log(`🎯 [REALTIME] Evaluating Q${questionIndex + 1}...`)

      const response = await fetch(`/api/applications/${encodeURIComponent(applicationId)}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          singleAnswer: true,
          questionIndex,
          questionText,
          criterion: question?.criterion || currentCriterionRef.current || "General",
          difficulty: question?.difficulty || "Medium",
          marks: question?.marks || 10,
          answerText,
          jobTitle: jobDetails?.jobTitle,
          companyName: jobDetails?.company,
          companyId: companyIdRef.current,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok && result.evaluation) {
          realTimeEvaluationsRef.current.push(result.evaluation)
          console.log(`✅ [REALTIME] Q${questionIndex + 1} evaluated: ${result.evaluation.score}/100`)
        }
      } else {
        console.error(`❌ [REALTIME] Failed to evaluate Q${questionIndex + 1}`)
      }
    } catch (err) {
      console.error(`❌ [REALTIME] Error evaluating Q${questionIndex + 1}:`, err)
    }
  }

  // Send instruction to AI agent via session update (invisible to transcript)
  const sendAgentInstruction = (instruction: string, forceSpeak: boolean = false) => {
    const dc = dcRef.current
    if (!dc || dc.readyState !== "open") {
      console.log("⚠️ [INSTRUCT] Data channel not ready")
      return
    }

    console.log("📤 [INSTRUCT] Updating session with instruction:", instruction.substring(0, 100))

    if (forceSpeak) {
      // First cancel any ongoing response to prevent agent from generating its own response
      const cancelMsg = { type: "response.cancel" }
      dc.send(JSON.stringify(cancelMsg))
      console.log("🛑 [INSTRUCT] Sent response.cancel")
      
      // Wait 200ms for cancel to take effect, then send the instruction
      setTimeout(() => {
        const responseMsg = {
          type: "response.create",
          response: {
            modalities: ["audio", "text"],
            instructions: instruction,
          },
        }
        dc.send(JSON.stringify(responseMsg))
        console.log("📤 [INSTRUCT] Sent response.create after cancel")
      }, 200)
    } else {
      console.log("📝 [INSTRUCT] Analysis logged (not forcing AI response):", instruction)
    }
  }

  const ensureElaborationState = (question: string) => {
    if (!question) return
    const existing = questionElaborationRef.current
    if (!existing || existing.question !== question) {
      questionElaborationRef.current = { question, combinedText: "", prompts: 0 }
    }
  }

  const appendToCombinedAnswer = (chunk: string) => {
    const normalizedChunk = chunk.trim()
    if (!normalizedChunk) return ""
    const state = questionElaborationRef.current
    if (!state) return normalizedChunk
    const combined = state.combinedText ? `${state.combinedText} ${normalizedChunk}` : normalizedChunk
    state.combinedText = combined
    return combined
  }

  const maybePromptForElaboration = () => {
    const state = questionElaborationRef.current
    if (!state) return
    const totalWords = countWords(state.combinedText)
    
    // If answer has 30+ words, it's sufficient - no elaboration needed
    if (totalWords >= 30) {
      console.log(`✅ [ELABORATE] Answer sufficient (${totalWords} words), no elaboration needed`)
      return
    }
    
    // Maximum 1 elaboration prompt per question to avoid annoying the candidate
    if (state.prompts >= 1) {
      console.log("[ELABORATE] Already prompted once, moving on")
      return
    }

    // Only prompt if answer is between 10-29 words (real answer but too short)
    if (totalWords >= 10 && totalWords < 30) {
      const promptMessage = "Could you please elaborate a bit more on that?"
      console.log(`📢 [ELABORATE] Prompting for question "${state.question.substring(0, 40)}..." (wordCount=${totalWords})`)
      sendAgentInstruction(`Please politely ask: "${promptMessage}"`, true)
      state.prompts += 1
    } else {
      console.log(`⏭️ [ELABORATE] Skipping - answer too short to be real (${totalWords} words)`)
    }
  }

  const isEnglishText = (text: string): boolean => {
    if (!text || text.trim().length === 0) return false

    // Normalize smart quotes and special characters to ASCII equivalents
    const normalizedText = text
      .replace(/['']/g, "'")  // Smart single quotes
      .replace(/[""]/g, '"')  // Smart double quotes
      .replace(/[–—]/g, "-")  // En-dash and em-dash
      .replace(/…/g, "...")   // Ellipsis

    // Check if text contains mostly English characters (a-z, A-Z, numbers, common punctuation)
    const englishRegex = /^[a-zA-Z0-9.,!?;:()\-'"\s@#$%&*+=\[\]{}|\\/<>~`_]+$/

    // Must pass English character test
    if (!englishRegex.test(normalizedText)) {
      console.log("🚫 [FILTER] Non-English text rejected:", text.substring(0, 50))
      return false
    }

    console.log("✅ [FILTER] English text accepted:", text.substring(0, 50))
    return true
  }

  // Check if text is just filler/noise that should be completely ignored
  const isFillerResponse = (text: string): boolean => {
    const normalized = text.toLowerCase().trim().replace(/[.,!?]+$/, "")
    const fillerPhrases = [
      "ok", "okay", "bye", "goodbye", "good bye", "thank you", "thanks", "thankyou",
      "hmm", "uh", "um", "ah", "eh", "oh", "hm", "mhm", "uh huh", "yeah",
      "hi", "hello", "hey", "huh", "what", "sorry", "pardon"
    ]
    // Check exact match or very short text that's likely noise
    if (fillerPhrases.includes(normalized)) return true
    if (normalized.length <= 3) return true
    // Check if it starts with filler and is very short
    if (normalized.length < 15 && fillerPhrases.some(f => normalized.startsWith(f))) return true
    return false
  }

  // Check if text is a valid setup confirmation (yes, I can hear you, etc.)
  const isSetupConfirmation = (text: string): boolean => {
    const normalized = text.toLowerCase().trim()
    const confirmPhrases = [
      "yes", "yeah", "yep", "yup", "sure", "okay", "ok", "fine",
      "i can hear", "i can see", "working", "good", "great", "perfect",
      "all good", "sounds good", "looks good", "clear", "confirmed",
      "ready", "i'm ready", "let's start", "let's go", "proceed",
      "audio is", "video is", "everything is", "all set"
    ]
    // Must contain at least one confirmation phrase
    return confirmPhrases.some(phrase => normalized.includes(phrase))
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

  const handleTranscriptionCompleted = async (event: any) => {
    if (event.type === "conversation.item.input_audio_transcription.completed") {
      const finalTranscript = !event.transcript || event.transcript === "\n" ? "[inaudible]" : event.transcript
      console.log("🎤 [TRANSCRIPTION] User said:", finalTranscript.substring(0, 100))
      console.log("🎤 [TRANSCRIPTION] lastQuestionAskedRef.current:", lastQuestionAskedRef.current?.substring(0, 50) || "(EMPTY!)")
      console.log("🎤 [TRANSCRIPTION] currentQuestionIndex:", currentQuestionIndexRef.current, "waitingForResponse:", waitingForResponseRef.current)

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

        // Check if candidate wants to end the interview
        if (isCandidateEndingInterview(finalTranscript)) {
          console.log("🏁 [FLOW] Candidate explicitly requested to end interview")
          sendAgentInstruction(
            `The candidate has requested to end the interview. Say EXACTLY: "Thank you for interviewing today. Our recruitment team will respond soon." Do NOT say anything else.`,
            true
          )
          return
        }

        // FIRST: Filter out filler responses that should not trigger any action
        if (isFillerResponse(finalTranscript)) {
          console.log("🚫 [FILLER] Ignoring filler response:", finalTranscript.substring(0, 30))
          return
        }

        // SKIP PHRASE DETECTION: Handle when candidate wants to skip a question
        const skipPhrases = [
          "don't have answer",
          "i don't have an answer",
          "no answer",
          "skip this",
          "next question please",
          "please ask next",
          "i cannot answer",
          "i do not know",
          "pass"
        ]
        const lowerTranscript = finalTranscript.toLowerCase()
        const isSkipPhrase = skipPhrases.some(phrase => lowerTranscript.includes(phrase))
        
        if (isSkipPhrase && lastQuestionAskedRef.current) {
          const skippedQuestion = questionSnapshotRef.current || lastQuestionAskedRef.current
          const qIdx = interviewQuestionsRef.current
            .findIndex(q => q.text === skippedQuestion)
          console.log(`⏭️ [SKIP] Candidate wants to skip Q${qIdx + 1}: "${finalTranscript.substring(0, 50)}"`)
          
          if (qIdx === -1) return
          
          // Store empty answer for current question
          await storeAnswerToDb(qIdx, skippedQuestion, "")
          
          // Trigger real-time evaluation with empty answer (will get 0 score)
          evaluateSingleAnswerRealTime(qIdx, skippedQuestion, "")
          
          // Advance snapshot to next question
          if (questionQueueRef.current.length > 0) {
            questionSnapshotRef.current = questionQueueRef.current.shift()!
            console.log("📸 [SNAPSHOT] Advanced after skip (queue size:", questionQueueRef.current.length, "):", questionSnapshotRef.current.substring(0, 50))
            ensureElaborationState(questionSnapshotRef.current)
          } else if (lastQuestionAskedRef.current && lastQuestionAskedRef.current !== skippedQuestion) {
            questionSnapshotRef.current = lastQuestionAskedRef.current
            console.log("📸 [SNAPSHOT] Queue empty after skip, jumped to lastQuestionAsked:", questionSnapshotRef.current.substring(0, 50))
            ensureElaborationState(questionSnapshotRef.current)
          }
          
          waitingForResponseRef.current = false
          
          console.log(`⏭️ [SKIP] Q${qIdx + 1} marked as skipped. Agent will naturally move to next question.`)
          return
        }

        // Real-time answer analysis - check if this is a setup question
        const isSetupQuestion =
          lastQuestionAskedRef.current.toLowerCase().includes("audio") ||
          lastQuestionAskedRef.current.toLowerCase().includes("video") ||
          lastQuestionAskedRef.current.toLowerCase().includes("hear") ||
          lastQuestionAskedRef.current.toLowerCase().includes("see me") ||
          lastQuestionAskedRef.current.toLowerCase().includes("setup") ||
          lastQuestionAskedRef.current.toLowerCase().includes("working fine")

        if (isSetupQuestion) {
          // MUST be a real confirmation, not just any response
          if (!isSetupConfirmation(finalTranscript)) {
            console.log("⏸️ [SETUP] Waiting for proper confirmation, got:", finalTranscript.substring(0, 30))
            return
          }
          console.log("⏭️ [ANALYZE] Setup confirmed - agent will proceed with first question naturally")
          // Agent controls the flow - it will ask the first question after setup confirmation
        } else if (isInterviewClosing) {
          console.log("⏭️ [ANALYZE] Skipping analysis - interview is in closing phase")
        } else if (lastQuestionAskedRef.current && finalTranscript !== '[inaudible]' && finalTranscript.length > 5) {
          // We have a question and got a response
          if (isRealAnswer(finalTranscript)) {
            // Use snapshot - this is the question user is CURRENTLY answering
            // Snapshot does NOT change when agent asks next question
            const answeredQuestion = questionSnapshotRef.current || lastQuestionAskedRef.current
            const qIdx = interviewQuestionsRef.current
              .findIndex(q => q.text === answeredQuestion)
            const questions = interviewQuestionsRef.current
            
            if (qIdx === -1) {
              console.log("⚠️ [ANALYZE] Could not match snapshot to question list, skipping")
              return
            }
            
            console.log("✅ [ANALYZE] Got answer for question", qIdx + 1, "of", questions.length)
            console.log("✅ [ANALYZE] Answered question:", answeredQuestion.substring(0, 50))
            
            const combinedAnswer = appendToCombinedAnswer(finalTranscript)
            
            // Answer received - store it and let agent continue naturally
            const state = questionElaborationRef.current
            const answerToStore = state?.combinedText || finalTranscript
            
            const alreadyAnswered = questionsAnsweredRef.current.has(qIdx)
            if (alreadyAnswered) {
              console.log(`⏭️ [ANALYZE] Q${qIdx + 1} already answered, updating with combined answer`)
            }
            
            // Store answer to DB immediately
            await storeAnswerToDb(qIdx, answeredQuestion, answerToStore)
            
            // Only trigger evaluation if first answer for this question
            if (!alreadyAnswered) {
              evaluateSingleAnswerRealTime(qIdx, answeredQuestion, answerToStore)
            } else {
              console.log(`⏭️ [ANALYZE] Skipping re-evaluation for Q${qIdx + 1} (elaboration stored)`)
            }
            
            // NOW advance snapshot to next question
            if (questionQueueRef.current.length > 0) {
              // Pop next from queue
              questionSnapshotRef.current = questionQueueRef.current.shift()!
              console.log("📸 [SNAPSHOT] Advanced from queue (queue size:", questionQueueRef.current.length, "):", questionSnapshotRef.current.substring(0, 50))
              ensureElaborationState(questionSnapshotRef.current)
            } else if (lastQuestionAskedRef.current && lastQuestionAskedRef.current !== answeredQuestion) {
              // Queue empty but agent already asked a different question - jump to it
              questionSnapshotRef.current = lastQuestionAskedRef.current
              console.log("📸 [SNAPSHOT] Queue empty, jumped to lastQuestionAsked:", questionSnapshotRef.current.substring(0, 50))
              ensureElaborationState(questionSnapshotRef.current)
            }
            
            // Check if all questions are done
            if (qIdx + 1 >= questions.length) {
              console.log("🏁 [FLOW] All questions answered! Agent will deliver closing message.")
              captureScreenshotSilently()
            } else {
              console.log(`⏭️ [FLOW] Answer stored for Q${qIdx + 1}. Agent will ask next question naturally.`)
            }
          } else {
            console.log("⏭️ [ANALYZE] Skipping - not a real answer (acknowledgment/filler)")
            // Don't do anything - the AI is already waiting for the real answer
          }
        } else {
          console.log("⏭️ [ANALYZE] No question tracked yet, ignoring user input")
        }
      }
    } else if (event.type === "response.audio_transcript.done") {
      const text = agentTextBufferRef.current
      if (text) {
        agentTextBufferRef.current = ""

        console.log("✅ [AGENT] Transcript:", text.substring(0, 80))

        // Filter out agent filler responses that shouldn't be in the conversation
        const lowerText = text.toLowerCase().trim()
        const isFillerResponse = (
          lowerText === "ok" || lowerText === "okay" || lowerText === "bye" ||
          lowerText === "thank you" || lowerText === "thanks" ||
          lowerText === "goodbye" || lowerText === "alright" ||
          (lowerText.length < 15 && !lowerText.includes("?") && 
           (lowerText.includes("ok") || lowerText.includes("bye") || lowerText.includes("thank")))
        )
        
        if (isFillerResponse && !isInterviewClosing) {
          console.log("🚫 [AGENT] Filtered out filler response:", text)
          return // Don't add filler to conversation
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

        // Track the question asked by the agent for real-time analysis
        // FIX 2 & 3: Always update lastQuestionAskedRef when agent text contains question mark and matches interview questions
        const hasQuestionMark = text.includes("?")
        
        // If agent text is substantial, check if it matches any interview question
        if (text.length > 20) {
          const questions = interviewQuestionsRef.current
          const agentText = text.toLowerCase()
          let bestMatch: any = null
          let bestScore = 0
          for (const q of questions) {
            const qText = q.text?.toLowerCase() || ""
            // Use ALL keywords (not just first 5) for better discrimination
            const keyWords = qText.split(" ").filter((w: string) => w.length > 4)
            const matchCount = keyWords.filter((kw: string) => agentText.includes(kw)).length
            const matchRatio = keyWords.length > 0 ? matchCount / keyWords.length : 0
            // Check first 30 chars substring match as strong signal
            const substringMatch = agentText.includes(qText.substring(0, 30)) ? 1 : 0
            const score = matchRatio + substringMatch
            if ((matchCount >= 2 || substringMatch) && score > bestScore) {
              bestScore = score
              bestMatch = q
            }
          }
          const matchedQuestion = bestMatch
          if (matchedQuestion) {
            console.log("🔍 [MATCH] Best match score:", bestScore.toFixed(2), "for:", matchedQuestion.text?.substring(0, 50))
          }

          if (matchedQuestion) {
            lastQuestionAskedRef.current = matchedQuestion.text
            currentCriterionRef.current = matchedQuestion.criterion || matchedQuestion.criteria?.[0] || "General"
            waitingForResponseRef.current = true
            
            // Check if current snapshot question was already answered
            const snapshotIdx = questionSnapshotRef.current 
              ? interviewQuestionsRef.current.findIndex((q: any) => q.text === questionSnapshotRef.current)
              : -1
            const snapshotAlreadyAnswered = snapshotIdx !== -1 && questionsAnsweredRef.current.has(snapshotIdx)
            
            if (!questionSnapshotRef.current || snapshotAlreadyAnswered) {
              // No snapshot yet OR current snapshot already answered - set directly
              // First drain any queued questions that were already answered
              while (questionQueueRef.current.length > 0) {
                const nextInQueue = questionQueueRef.current[0]
                const nextIdx = interviewQuestionsRef.current.findIndex((q: any) => q.text === nextInQueue)
                if (nextIdx !== -1 && questionsAnsweredRef.current.has(nextIdx)) {
                  questionQueueRef.current.shift()
                  console.log("📸 [QUEUE] Drained already-answered question from queue:", nextInQueue.substring(0, 50))
                } else {
                  break
                }
              }
              // Set snapshot to this new question
              questionSnapshotRef.current = matchedQuestion.text
              console.log("📸 [SNAPSHOT] Set snapshot directly:", questionSnapshotRef.current.substring(0, 50))
              ensureElaborationState(matchedQuestion.text)
            } else if (matchedQuestion.text === questionSnapshotRef.current) {
              // Agent repeated the SAME question user is answering - no change
              console.log("📸 [SNAPSHOT] Same as current, no change:", questionSnapshotRef.current.substring(0, 50))
            } else {
              // Agent asked a DIFFERENT question while user hasn't answered current - add to queue
              const alreadyQueued = questionQueueRef.current.includes(matchedQuestion.text)
              if (!alreadyQueued) {
                questionQueueRef.current.push(matchedQuestion.text)
                console.log("📸 [SNAPSHOT] Keeping current:", questionSnapshotRef.current.substring(0, 50))
                console.log("⏳ [QUEUE] Question added to queue (size:", questionQueueRef.current.length, "):", matchedQuestion.text.substring(0, 50))
              } else {
                console.log("⏳ [QUEUE] Already in queue, skipping:", matchedQuestion.text.substring(0, 50))
              }
            }
            
            console.log("📝 [TRACK] Current question:", lastQuestionAskedRef.current.substring(0, 50))
            console.log("🎯 [TRACK] Criterion:", currentCriterionRef.current)
          } else {
            // Text substantial but doesn't match our list - keep current question unchanged
            console.log("📝 [TRACK] Agent text not in list, keeping previous:", lastQuestionAskedRef.current?.substring(0, 50))
          }
        } else {
          // Text too short - keep current question unchanged
          console.log("📝 [TRACK] Agent text too short, keeping previous:", lastQuestionAskedRef.current?.substring(0, 50))
          
          // Check if this is the closing thank-you message (no question mark)
          const isClosingMessage =
            lowerText.includes("thank you for interviewing") ||
            lowerText.includes("thank you for your time today") ||
            (lowerText.includes("thank you") && lowerText.includes("recruitment team")) ||
            (lowerText.includes("thank you") && lowerText.includes("respond soon"))

          if (isClosingMessage && !isInterviewClosing) {
            console.log("🏁 [CLOSING] Detected closing message - starting 20-second auto-end timer")
            setIsInterviewClosing(true)
            setClosingCountdown(20)

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
            router.push(`/interview/${encodeURIComponent(applicationId)}/post-verify`)
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
              round.questions?.map((q: any, index: number) => ({
                text: typeof q === "string" ? q : q.text || q.question || "",
                criterion: typeof q === "object" ? q.criterion : round.criteria?.[0] || "General",
                difficulty: typeof q === "object" ? q.difficulty : "Medium",
                marks: typeof q === "object" && q.marks !== undefined ? q.marks : 10,
                roundName: round.name,
                criteria: round.criteria || [],
                sequence: index + 1,
              })) || []
            ) || []

          const duration = json.rounds?.[0]?.duration_minutes || 30

          setJobDetails(details)
          setInterviewQuestions(allQuestions)
          interviewQuestionsRef.current = allQuestions
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
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      streamRef.current = stream
      // Store audio track reference for muting during AI speech
      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length > 0) {
        audioTrackRef.current = audioTracks[0]
        console.log("🎙️ [MIC] Audio track stored for echo prevention")
      }
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
        // Build structured 6-step interview instructions (agent controls the flow)
        let instructions = `You are Olivia, a professional AI recruiter conducting a structured video interview. Follow this EXACT 6-step process:

**IMPORTANT LANGUAGE POLICY:**
- You MUST speak ONLY in English throughout the entire interview.
- If the candidate speaks in ANY language other than English (Hindi, Spanish, French, Chinese, etc.), IMMEDIATELY and POLITELY respond:
  "I apologize, but I can only conduct this interview in English. Please respond in English so I can properly evaluate your answers. Let me repeat the question in English..."
- Then repeat the last question in English.
- DO NOT answer or respond to questions asked in any language other than English.
- This policy applies at ALL times during the interview.

**STEP 1: GREETING & SETUP CHECK**
- Greet warmly: "Hello ${details?.candidateName || "there"}, welcome and thank you for joining today's interview."
- Confirm setup: "Before we begin, can you please confirm that your audio and video are working fine, and you can hear/see me clearly?"
- Mention language policy: "Please note that this interview will be conducted entirely in English. If you're comfortable with that, let's proceed."
- Wait for confirmation before proceeding.

**STEP 2: START INTERVIEW & TIME MANAGEMENT**  
- Once setup confirmed: "Great, let's get started. This interview will last about ${duration} minutes. I'll be asking you questions based on the ${details?.jobTitle || "position"} role you applied for at ${details?.company || "our company"}."
- Keep track of time and ensure interview finishes within ${duration} minutes.

**STEP 3: QUESTION FLOW**
You MUST ask ONLY these questions in this exact order. Do NOT ask any other questions, do NOT generate new questions, do NOT deviate from this list:`

        // Add the specific questions from database
        if (questions && questions.length > 0) {
          questions.forEach((q, index) => {
            instructions += `\n${index + 1}. ${q.text}`
          })
          instructions += `

**CRITICAL CONSTRAINT: QUESTION ADHERENCE**
- You MUST ask ONLY the questions listed above
- Do NOT ask any follow-up questions beyond what is listed
- Do NOT generate or improvise new questions
- Do NOT ask clarifying questions that are not in the list
- If the candidate asks you to ask a different question, politely decline and continue with the next question from the list
- After the LAST question is answered, you MUST ONLY say the closing message (see STEP 4)

**ANSWER HANDLING RULES:**
After candidate responds:

RULE 1 - SKIP PHRASES:
If candidate says:
'i dont have answer', 'no answer',
'skip', 'next question', 'pass',
'i cannot answer', 'i dont know':
→ Say: 'No problem, let us move on.'
→ Ask next question immediately.

RULE 2 - REPEAT REQUEST:
If candidate says:
'please repeat', 'can you repeat',
'repeat the question', 'say again':
→ Repeat EXACT same question word for word.
→ Do NOT say Got it or Thank you.
→ Wait for proper answer.

RULE 3 - SHORT ANSWER:
If response is less than 15 words
AND not a skip phrase
AND not a repeat request:
→ Ask ONCE: 'Could you please elaborate a bit more on that?'
→ Wait for response.
→ Whatever response comes next, 15+ words or not, move to next question.
→ NEVER ask to elaborate more than once per question under any circumstance.

RULE 4 - PROPER ANSWER:
If response is 15+ words:
→ Say: 'Thank you.'
→ Ask next question immediately.

THESE RULES APPLY TO EVERY QUESTION THE SAME WAY. Q1, Q2, Q3... all same.

**IMPORTANT:** 
- Do NOT ask "Have you finished?" or "Anything else to add?" - just proceed naturally
- Keep the flow conversational and natural
- Do NOT ask "Do you have any questions for me?" or similar - go directly to closing`
        } else {
          // Build fallback questions and set them on the ref for sequential tracking
          const fallbackQuestions = [
            { text: "Tell me about yourself and your relevant experience.", criteria: ["Communication"], sequence: 1, criterion: "Communication", difficulty: "Medium", marks: 10 },
            { text: `Why are you interested in this ${details?.jobTitle || "position"}?`, criteria: ["Culture fit"], sequence: 2, criterion: "Culture fit", difficulty: "Medium", marks: 10 },
            { text: "What motivates you in your work?", criteria: ["Culture fit"], sequence: 3, criterion: "Culture fit", difficulty: "Medium", marks: 10 },
            { text: "Describe a challenging situation you faced and how you handled it.", criteria: ["Problem-solving"], sequence: 4, criterion: "Problem-solving", difficulty: "Medium", marks: 10 },
            { text: "How do you handle feedback and criticism?", criteria: ["Communication"], sequence: 5, criterion: "Communication", difficulty: "Medium", marks: 10 },
            { text: "Tell me about a time you worked in a team to achieve a goal.", criteria: ["Teamwork"], sequence: 6, criterion: "Teamwork", difficulty: "Medium", marks: 10 },
            { text: "What technical skills do you bring to this role?", criteria: ["Technical Skills"], sequence: 7, criterion: "Technical Skills", difficulty: "Medium", marks: 10 },
            { text: "How do you stay updated with the latest technologies in your field?", criteria: ["Technical Skills"], sequence: 8, criterion: "Technical Skills", difficulty: "Medium", marks: 10 },
            { text: "Describe a technical problem you solved recently.", criteria: ["Problem-solving"], sequence: 9, criterion: "Problem-solving", difficulty: "Medium", marks: 10 },
          ]
          interviewQuestionsRef.current = fallbackQuestions
          fallbackQuestions.forEach((q, index) => {
            instructions += `\n${index + 1}. ${q.text}`
          })
          instructions += `

**CRITICAL CONSTRAINT: QUESTION ADHERENCE**
- You MUST ask ONLY the questions listed above
- Do NOT ask any follow-up questions beyond what is listed
- Do NOT generate or improvise new questions
- Do NOT ask clarifying questions that are not in the list
- If the candidate asks you to ask a different question, politely decline and continue with the next question from the list
- After the LAST question is answered, you MUST ONLY say the closing message (see STEP 4)

**ANSWER HANDLING RULES:**
After candidate responds:

RULE 1 - SKIP PHRASES:
If candidate says:
'i dont have answer', 'no answer',
'skip', 'next question', 'pass',
'i cannot answer', 'i dont know':
→ Say: 'No problem, let us move on.'
→ Ask next question immediately.

RULE 2 - REPEAT REQUEST:
If candidate says:
'please repeat', 'can you repeat',
'repeat the question', 'say again':
→ Repeat EXACT same question word for word.
→ Do NOT say Got it or Thank you.
→ Wait for proper answer.

RULE 3 - SHORT ANSWER:
If response is less than 15 words
AND not a skip phrase
AND not a repeat request:
→ Ask ONCE: 'Could you please elaborate a bit more on that?'
→ Wait for response.
→ Whatever response comes next, 15+ words or not, move to next question.
→ NEVER ask to elaborate more than once per question under any circumstance.

RULE 4 - PROPER ANSWER:
If response is 15+ words:
→ Say: 'Thank you.'
→ Ask next question immediately.

THESE RULES APPLY TO EVERY QUESTION THE SAME WAY. Q1, Q2, Q3... all same.

**IMPORTANT:** 
- Do NOT ask "Have you finished?" or "Anything else to add?" - just proceed naturally
- Keep the flow conversational and natural
- Do NOT ask "Do you have any questions for me?" or similar - go directly to closing`
        }

        instructions += `

**STEP 4: CLOSING (MANDATORY - NO EXCEPTIONS)**
Once the candidate answers the LAST question from the list above:
- Say EXACTLY this message: "Thank you for interviewing today. Our recruitment team will respond soon."
- Do NOT ask "Do you have any questions for me?" or any similar question
- Do NOT ask anything else after this closing message
- Do NOT continue the conversation after the closing message
- Simply pause and wait - the system will handle ending the interview
- This is the FINAL statement - nothing more should be said

**CRITICAL: After saying the closing message, you MUST remain silent. Do not respond to anything the candidate says.**

**INTERVIEW CONTEXT:**
- Candidate: ${details?.candidateName || "Candidate"}
- Position: ${details?.jobTitle || "Position"}
- Company: ${details?.company || "Company"}
- Duration: ${duration} minutes
- Total Questions: ${questions?.length || 10}

**EVALUATION CRITERIA:**
${questions?.[0]?.criteria?.join(", ") || "Communication, Technical skills, Culture fit, Problem-solving"}

**CRITICAL REMINDERS:**
1. ALWAYS speak in English only
2. If candidate uses any other language, politely redirect to English immediately
3. Be professional, warm, and keep the interview structured and on-time
4. Maintain the English-only policy throughout the entire interview
5. Do NOT ask "Have you finished your answer?" - the system will handle elaboration prompts automatically
6. When the system instructs you to ask for elaboration, follow the exact phrasing provided
7. **CRITICAL: ONLY ask the questions listed above - NO ad-hoc questions, NO generated questions, NO clarifying questions beyond the list**
8. **If candidate asks for a different question, politely decline and continue with the next question from the list**
9. **NEVER deviate from the question list under any circumstances**
10. **NEVER ask "Do you have any questions for me?" - go directly to the closing message after the last question**
11. **After saying the closing message, remain COMPLETELY SILENT - do not respond to anything**
12. **The interview will automatically end 20 seconds after the closing message**`

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
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 2500,
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
        
        // Mute user mic when AI starts speaking to prevent echo
        if (msg.type === "response.audio.delta" || msg.type === "response.created") {
          if (!agentSpeakingRef.current) {
            agentSpeakingRef.current = true
            setUserMicEnabled(false)
          }
        }
        
        // Unmute user mic when AI stops speaking
        if (msg.type === "response.done" || msg.type === "response.audio.done") {
          if (agentSpeakingRef.current) {
            agentSpeakingRef.current = false
            // Small delay before unmuting to ensure audio playback is complete
            setTimeout(() => setUserMicEnabled(true), 300)
          }
        }
        
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

        // Always trigger evaluation - even for incomplete interviews
        // Evaluation will use whatever answers are available
        if (result.incomplete) {
          console.log("⚠️ Interview is incomplete but still triggering evaluation with available answers")
          console.log("⚠️ Reasons:", result.validationErrors)
        }
        
        // Trigger evaluation (non-blocking) - always run regardless of completion status
        fetch(`/api/applications/${encodeURIComponent(applicationId)}/evaluate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            transcript, 
            companyId,
            realTimeEvaluations: realTimeEvaluationsRef.current,
          }),
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
    router.push(`/interview/${encodeURIComponent(applicationId)}/post-verify`)
  }

  // Show loading spinner while interview is ending/redirecting
  if (interviewCompleted) {
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
