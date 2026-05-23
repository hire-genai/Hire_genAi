"use client"

export const dynamic = 'force-dynamic';

import { useParams, useRouter } from "next/navigation"
import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Camera, Check, Loader2, RefreshCw, AlertCircle, User, MoveVertical, Sun, Focus, X } from "lucide-react"
import * as faceapi from 'face-api.js'

export default function PostInterviewVerifyPage() {
  const params = useParams()
  const router = useRouter()
  const applicationId = (params?.applicationId as string) || ""

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [showBackWarning, setShowBackWarning] = useState(false)
  
  // Face detection state
  const [faceStatus, setFaceStatus] = useState<'loading' | 'no_face' | 'too_far' | 'not_centered' | 'poor_lighting' | 'blurry' | 'ready'>('loading')
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)

  // Load face-api.js models
  const loadModels = useCallback(async () => {
    if (modelsLoaded || loadingModels) return
    setLoadingModels(true)
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models')
      ])
      setModelsLoaded(true)
      console.log('[PostVerify] Face detection models loaded')
    } catch (err) {
      console.error('Failed to load face detection models:', err)
    }
    setLoadingModels(false)
  }, [modelsLoaded, loadingModels])

  // Check image quality (blur detection)
  const checkImageQuality = useCallback((canvas: HTMLCanvasElement): { brightness: number; isBlurry: boolean } => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return { brightness: 0, isBlurry: true }
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    
    // Calculate average brightness
    let totalBrightness = 0
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      totalBrightness += (r + g + b) / 3
    }
    const brightness = totalBrightness / (data.length / 4)
    
    // Simple blur detection using Laplacian variance
    let laplacianSum = 0
    const width = canvas.width
    const height = canvas.height
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4
        const center = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
        
        const top = (data[((y - 1) * width + x) * 4] + data[((y - 1) * width + x) * 4 + 1] + data[((y - 1) * width + x) * 4 + 2]) / 3
        const bottom = (data[((y + 1) * width + x) * 4] + data[((y + 1) * width + x) * 4 + 1] + data[((y + 1) * width + x) * 4 + 2]) / 3
        const left = (data[(y * width + x - 1) * 4] + data[(y * width + x - 1) * 4 + 1] + data[(y * width + x - 1) * 4 + 2]) / 3
        const right = (data[(y * width + x + 1) * 4] + data[(y * width + x + 1) * 4 + 1] + data[(y * width + x + 1) * 4 + 2]) / 3
        
        const laplacian = Math.abs(4 * center - top - bottom - left - right)
        laplacianSum += laplacian * laplacian
      }
    }
    
    const variance = laplacianSum / ((width - 2) * (height - 2))
    const isBlurry = variance < 20
    
    return { brightness, isBlurry }
  }, [])

  // Real face detection
  const detectFace = useCallback(async () => {
    if (!videoRef.current || !isCameraReady || !modelsLoaded || !canvasRef.current) return

    try {
      const video = videoRef.current
      const videoWidth = video.videoWidth
      const videoHeight = video.videoHeight
      
      // Real-time brightness check
      const tempCanvas = canvasRef.current
      tempCanvas.width = videoWidth
      tempCanvas.height = videoHeight
      const ctx = tempCanvas.getContext('2d')
      
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        const imageData = ctx.getImageData(0, 0, videoWidth, videoHeight)
        const data = imageData.data
        
        // Calculate average brightness
        let totalBrightness = 0
        for (let i = 0; i < data.length; i += 16) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          totalBrightness += (r + g + b) / 3
        }
        const avgBrightness = totalBrightness / (data.length / 16)
        
        // Block capture if lighting is poor
        if (avgBrightness < 110) {
          setFaceStatus('poor_lighting')
          return
        }
        
        // Check for blur
        const { isBlurry } = checkImageQuality(tempCanvas)
        if (isBlurry) {
          setFaceStatus('blurry')
          return
        }
      }
      
      // Detect faces
      const detections = await faceapi.detectAllFaces(
        video,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
      ).withFaceLandmarks()

      if (detections.length === 0) {
        setFaceStatus('no_face')
        return
      }

      const face = detections[0]
      
      // Check face size (must be at least 50% of frame height)
      const faceHeight = face.detection.box.height
      const faceSizeRatio = faceHeight / videoHeight
      
      if (faceSizeRatio < 0.50) {
        setFaceStatus('too_far')
        return
      }

      // Check if face is centered
      const faceCenterX = face.detection.box.x + face.detection.box.width / 2
      const faceCenterY = face.detection.box.y + face.detection.box.height / 2
      const marginX = videoWidth * 0.2
      const marginY = videoHeight * 0.2
      
      const isCentered = 
        faceCenterX > marginX && faceCenterX < (videoWidth - marginX) &&
        faceCenterY > marginY && faceCenterY < (videoHeight - marginY)

      if (!isCentered) {
        setFaceStatus('not_centered')
        return
      }

      setFaceStatus('ready')
    } catch (err) {
      console.error('Face detection error:', err)
    }
  }, [isCameraReady, modelsLoaded, checkImageQuality])

  // Run face detection periodically
  useEffect(() => {
    if (!isCameraOpen || !isCameraReady || capturedPhoto || !modelsLoaded) return
    const interval = setInterval(detectFace, 500)
    return () => clearInterval(interval)
  }, [isCameraOpen, isCameraReady, capturedPhoto, modelsLoaded, detectFace])

  // Prevent browser back navigation
  useEffect(() => {
    const preventBack = () => {
      window.history.pushState(null, '', window.location.href)
      setShowBackWarning(true)
    }
    
    window.history.pushState(null, '', window.location.href)
    window.addEventListener('popstate', preventBack)
    
    return () => {
      window.removeEventListener('popstate', preventBack)
    }
  }, [])

  // Start camera on mount
  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
    }
  }, [])

  const startCamera = async () => {
    setError(null)
    setCapturedPhoto(null)
    setIsCameraOpen(true)
    setFaceStatus('loading')
    
    // Load face detection models
    await loadModels()
    
    try {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      const constraints = {
        video: {
          facingMode: 'user',
          width: isMobile ? { ideal: 1280 } : { ideal: 1920 },
          height: isMobile ? { ideal: 720 } : { ideal: 1080 }
        },
        audio: false
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
            .then(() => {
              setIsCameraReady(true)
            })
            .catch(err => {
              console.error('Error playing video:', err)
              setError('Error starting video stream. Please try again.')
            })
        }
      }
    } catch (err: any) {
      console.error('Camera access error:', err)
      setError('Could not access camera. Please allow camera permissions and ensure no other app is using it.')
      setIsCameraOpen(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsCameraOpen(false)
    setIsCameraReady(false)
  }

  // Handle countdown and capture
  useEffect(() => {
    if (countdown === null) return
    if (countdown === 0) {
      // Capture photo
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        if (ctx) {
          if (!video.videoWidth || !video.videoHeight) {
            setError('Camera is still starting. Please try again.')
            setCountdown(null)
            return
          }
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          ctx.setTransform(1, 0, 0, 1, 0, 0)
          ctx.translate(canvas.width, 0)
          ctx.scale(-1, 1)
          ctx.drawImage(video, 0, 0)
          setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.95))
          stopCamera()
        }
      }
      setCountdown(null)
      return
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isCameraReady) {
      setError('Camera is not ready. Please refresh the page and try again.')
      return
    }
    if (!videoRef.current.videoWidth || !videoRef.current.videoHeight) {
      setError('Camera is still starting. Please wait 1-2 seconds and try again.')
      return
    }
    // Start countdown
    setCountdown(3)
  }, [isCameraReady])

  const retakePhoto = () => {
    setCapturedPhoto(null)
    setError(null)
    startCamera()
  }

  const savePhotoAndContinue = async () => {
    if (!capturedPhoto) {
      setError('No photo captured. Please take a photo first.')
      return
    }
    
    setSaving(true)
    setError(null)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const response = await fetch('/api/interview/post-verify/save-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          photo: capturedPhoto
        })
      })
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.ok) {
        router.push(`/interview/${encodeURIComponent(applicationId)}/success`)
      } else {
        setError(data.error || 'Failed to save photo')
      }
    } catch (err: any) {
      console.error('Save photo error:', err)
      setError(err?.message || 'Failed to save photo. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Back Navigation Warning Modal */}
      {showBackWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-red-500/40 rounded-xl shadow-2xl max-w-sm w-full mx-4 p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-semibold text-white mb-1">Interview Completed</h2>
                <p className="text-sm text-slate-300">You cannot go back to the interview page.</p>
              </div>
              <button 
                onClick={() => setShowBackWarning(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
              <p className="text-xs text-red-200">
                The interview has been completed. Please complete the photo verification to continue.
              </p>
            </div>

            <Button
              onClick={() => setShowBackWarning(false)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-9 text-sm"
            >
              OK, Continue
            </Button>
          </div>
        </div>
      )}

      <div className="w-full max-w-md mx-auto">
        {/* Interview Completed Message */}
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 mb-3 text-center backdrop-blur-sm">
          <div className="flex justify-center mb-2">
            <div className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center">
              <Check className="h-5 w-5 text-white" />
            </div>
          </div>
          <h1 className="text-sm font-semibold text-emerald-400 mb-0.5">Interview Completed</h1>
          <p className="text-slate-400 text-xs">Take a final verification photo to continue</p>
        </div>

        {/* Photo Capture Card */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-4 shadow-xl">
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/20 mb-2">
              <Camera className="h-5 w-5 text-emerald-400" />
            </div>
            <h2 className="text-base font-semibold text-white">Photo Verification</h2>
            <p className="text-slate-400 text-xs mt-1">Position your face in the circle</p>
          </div>

          {/* Camera / Photo Display */}
          <div className="relative bg-slate-800 rounded-xl overflow-hidden mb-4 flex items-center justify-center py-4">
            <div className={`relative overflow-hidden ring-4 bg-slate-800 ${
              capturedPhoto ? 'ring-emerald-500' :
              faceStatus === 'ready' ? 'ring-emerald-500' :
              faceStatus === 'loading' ? 'ring-slate-500' :
              'ring-red-500'
            }`}
            style={{ width: '240px', height: '320px', borderRadius: '50% / 45%' }}>
              {!capturedPhoto ? (
                <>
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    onClick={() => {
                      if (!isCameraReady && isCameraOpen) {
                        videoRef.current?.play().then(() => setIsCameraReady(true)).catch(() => {})
                      }
                    }}
                  >
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      width="100%"
                      height="100%"
                      className="absolute inset-0 w-full h-full object-cover bg-black z-10"
                      style={{
                        transform: 'scaleX(-1)',
                        objectFit: 'cover',
                        objectPosition: 'center',
                        display: isCameraReady ? 'block' : 'none'
                      }}
                    />
                  </div>

                  {/* Countdown overlay */}
                  {countdown !== null && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
                      <span className="text-6xl font-bold text-white animate-pulse">{countdown}</span>
                    </div>
                  )}

                  {/* Camera loading */}
                  {(!isCameraReady && isCameraOpen) && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-800">
                      <div className="text-center">
                        <Loader2 className="h-12 w-12 text-emerald-400 animate-spin mx-auto mb-3" />
                        <p className="text-emerald-400 text-sm">Starting camera...</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <img
                  src={capturedPhoto}
                  alt="Captured"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
            </div>
          </div>

          {/* Face status feedback */}
          {isCameraReady && !capturedPhoto && (
            <div className="mb-3 flex justify-center">
              <div className={`text-white text-xs px-3 py-1 rounded-full flex items-center gap-1.5 ${
                faceStatus === 'ready' ? 'bg-emerald-500' :
                faceStatus === 'loading' ? 'bg-slate-600' :
                'bg-red-500'
              }`}>
                {faceStatus === 'loading' && (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Loading face detection...</span>
                  </>
                )}
                {faceStatus === 'no_face' && (
                  <>
                    <User className="h-3 w-3" />
                    <span>No face detected</span>
                  </>
                )}
                {faceStatus === 'too_far' && (
                  <>
                    <MoveVertical className="h-3 w-3" />
                    <span>Move closer to camera</span>
                  </>
                )}
                {faceStatus === 'not_centered' && (
                  <>
                    <User className="h-3 w-3" />
                    <span>Center your face in the oval</span>
                  </>
                )}
                {faceStatus === 'poor_lighting' && (
                  <>
                    <Sun className="h-3 w-3" />
                    <span>Improve lighting</span>
                  </>
                )}
                {faceStatus === 'blurry' && (
                  <>
                    <Focus className="h-3 w-3" />
                    <span>Hold still - image blurry</span>
                  </>
                )}
                {faceStatus === 'ready' && (
                  <>
                    <Check className="h-3 w-3" />
                    <span>Ready to capture</span>
                  </>
                )}
              </div>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />

          {/* Error Message */}
          {error && (
            <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs">{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            {!capturedPhoto ? (
              <Button
                onClick={capturePhoto}
                disabled={!isCameraReady || countdown !== null || faceStatus !== 'ready'}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-10 text-sm disabled:opacity-50"
              >
                {countdown !== null ? (
                  <span>Capturing...</span>
                ) : faceStatus !== 'ready' ? (
                  <span className="text-xs">Position your face correctly</span>
                ) : (
                  <>
                    <Camera className="h-4 w-4 mr-2" />
                    Capture Photo
                  </>
                )}
              </Button>
            ) : (
              <>
                <Button
                  onClick={retakePhoto}
                  variant="outline"
                  className="w-full sm:flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 h-10 text-sm"
                  disabled={saving}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retake
                </Button>
                <Button
                  onClick={savePhotoAndContinue}
                  disabled={saving}
                  className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-10 text-sm"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Save & Continue
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Security Note */}
        <p className="text-center text-slate-500 text-xs mt-3">
          🔒 Securely stored for verification only
        </p>
      </div>
    </div>
  )
}
