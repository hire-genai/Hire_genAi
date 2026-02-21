'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { useState, useEffect } from 'react'
import { Download, FileText, Mail, Send } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'

interface CandidateActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  candidate: any
  bucketType: string
  onMoved?: () => void
  canModify?: boolean
}

export function CandidateActionDialog({
  open,
  onOpenChange,
  candidate,
  bucketType,
  onMoved,
  canModify = true,
}: CandidateActionDialogProps) {
  const { company, user } = useAuth()
  const [remarks, setRemarks] = useState('')
  const [moveToStage, setMoveToStage] = useState('')
  const [sendEmailToHM, setSendEmailToHM] = useState(false)
  const [showEmailTemplate, setShowEmailTemplate] = useState(false)
  const [emailContent, setEmailContent] = useState('')
  const [emailTo, setEmailTo] = useState('')
  const [emailCc, setEmailCc] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [hiringManagers, setHiringManagers] = useState<{id: string, name: string, email: string}[]>([])
  const [hiringManagersLoading, setHiringManagersLoading] = useState(false)
  const [selectedManager, setSelectedManager] = useState('')
  const [offerAmount, setOfferAmount] = useState('')
  const [offerExpiry, setOfferExpiry] = useState('')
  const [offerBonus, setOfferBonus] = useState('')
  const [offerEquity, setOfferEquity] = useState('')
  const [offerCurrency, setOfferCurrency] = useState(candidate?.offerCurrency || candidate?.jobCurrency || 'USD')
  const [negotiationRounds, setNegotiationRounds] = useState('0')
  const [declineReason, setDeclineReason] = useState('')
  const [backgroundCheckStatus, setBackgroundCheckStatus] = useState('')
  const [referenceCheckStatus, setReferenceCheckStatus] = useState('')
  const [startDate, setStartDate] = useState('')
  const [hireDate, setHireDate] = useState('')
  const [onboardingStatus, setOnboardingStatus] = useState('')
  const [qualityOfHireRating, setQualityOfHireRating] = useState('')
  const [employmentStatus, setEmploymentStatus] = useState('')
  
  // Enhanced data capture fields
  const [interviewScore, setInterviewScore] = useState('')
  const [interviewFeedback, setInterviewFeedback] = useState('')
  const [technicalScore, setTechnicalScore] = useState('')
  const [behavioralScore, setBehavioralScore] = useState('')
  const [communicationScore, setCommunicationScore] = useState('')
  const [interviewRecommendation, setInterviewRecommendation] = useState('')
  const [schedulingDays, setSchedulingDays] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [addToTalentPool, setAddToTalentPool] = useState(false)
  const [talentPoolCategory, setTalentPoolCategory] = useState('future')
  const [talentPoolNotes, setTalentPoolNotes] = useState('')
  const [talentPoolSkillTags, setTalentPoolSkillTags] = useState('')
  const [hmRating, setHmRating] = useState('')
  const [hmFeedback, setHmFeedback] = useState('')
  const [hiringManagerName, setHiringManagerName] = useState('')
  const [hmStatus, setHmStatus] = useState(candidate?.hmStatus || '')
  const [hmInterviewDate, setHmInterviewDate] = useState('')
  const [hmFeedbackDate, setHmFeedbackDate] = useState('')
  const [hmSaveLoading, setHmSaveLoading] = useState(false)
  const [offerStatus, setOfferStatus] = useState(candidate?.offerStatus || 'Not Sent Yet')
  const [interviewType, setInterviewType] = useState('')
  const [interviewerName, setInterviewerName] = useState('')
  const [moveLoading, setMoveLoading] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailSending, setEmailSending] = useState(false)

  // Fetch hiring managers when dialog opens
  useEffect(() => {
    if (open && company?.id) {
      setHiringManagersLoading(true)
      fetch(`/api/settings/users?companyId=${encodeURIComponent(company.id)}`)
        .then(res => res.json())
        .then(data => {
          // Filter for manager role users
          const managers = (data?.users || [])
            .filter((u: any) => u.role === 'manager')
            .map((u: any) => ({
              id: u.id,
              name: u.name,
              email: u.email
            }))
          setHiringManagers(managers)
          if (managers.length > 0) {
            setSelectedManager(managers[0].email)
            setEmailTo(managers[0].email)
          }
        })
        .catch(err => console.error('Failed to fetch hiring managers:', err))
        .finally(() => setHiringManagersLoading(false))
    }
  }, [open, company?.id])

  // Reset ALL states when dialog opens or bucketType changes
  useEffect(() => {
    if (open) {
      // Reset common states
      setRemarks('')
      setMoveToStage('')
      setShowEmailTemplate(false)
      setEmailContent('')
      setEmailTo('')
      setEmailCc(user?.email || '')
      setEmailSubject('')
      setSendEmailToHM(false)
      
      // Reset interview-related states
      setInterviewScore('')
      setInterviewFeedback('')
      setTechnicalScore('')
      setBehavioralScore('')
      setCommunicationScore('')
      setInterviewRecommendation('')
      setSchedulingDays('')
      setInterviewType('')
      setInterviewerName('')
      
      // Reset offer-related states
      setOfferAmount('')
      setOfferExpiry('')
      setOfferBonus('')
      setOfferEquity('')
      setOfferCurrency(candidate?.offerCurrency || candidate?.jobCurrency || 'USD')
      setNegotiationRounds('0')
      
      // Reset hiring manager states
      setHmRating(candidate?.hmRating ? String(candidate.hmRating) : '')
      setHmFeedback(candidate?.hmFeedback || '')
      setHiringManagerName('')
      setHmStatus(candidate?.hmStatus || '')
      setHmInterviewDate(candidate?.hmInterviewDate || '')
      setHmFeedbackDate(candidate?.hmFeedbackDate || new Date().toISOString().split('T')[0])
      
      // Reset rejection/talent pool states
      setRejectionReason('')
      setAddToTalentPool(false)
      setTalentPoolCategory('future')
      setTalentPoolNotes('')
      setTalentPoolSkillTags('')
      setDeclineReason('')
      
      // Reset hired states
      setBackgroundCheckStatus('pending')
      setReferenceCheckStatus('pending')
      setStartDate('')
    }
  }, [open, bucketType])

  // Reset states when dialog closes
  useEffect(() => {
    if (!open) {
      setShowEmailTemplate(false)
      setEmailContent('')
      setSendEmailToHM(false)
      setEmailTo('')
      setEmailCc('')
      setEmailSubject('')
    }
  }, [open])

  // Update offerCurrency when candidate data loads or dialog opens
  useEffect(() => {
    if (candidate?.jobCurrency) {
      setOfferCurrency(candidate.jobCurrency)
    }
  }, [candidate?.jobCurrency, candidate?.id])

  const handleMove = async () => {
    if (!moveToStage || !remarks || !candidate?.id) return
    if (moveToStage === 'rejected' && !rejectionReason) {
      alert('Please select a rejection reason before moving.')
      return
    }
    try {
      setMoveLoading(true)
      const res = await fetch('/api/applications/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: candidate.id,
          moveToStage,
          remarks,
          changedByEmail: user?.email,
          rejectionReason: moveToStage === 'rejected' ? rejectionReason : undefined,
          addToTalentPool: addToTalentPool,
          talentPoolCategory: addToTalentPool ? talentPoolCategory : undefined,
          talentPoolNotes: addToTalentPool ? talentPoolNotes : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || data?.error) {
        console.error('Move failed:', data?.error)
        alert(data?.error || 'Failed to move application')
        return
      }
      console.log('Application moved:', data)

      onOpenChange(false)
      if (onMoved) onMoved()
    } catch (err) {
      console.error('Move error:', err)
      alert('Failed to move application')
    } finally {
      setMoveLoading(false)
    }
  }

  const handleSendInterviewEmail = async () => {
    if (!candidate?.email) {
      alert('Candidate email is missing')
      return
    }
    try {
      setEmailLoading(true)
      const res = await fetch('/api/interview/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: candidate.email,
          candidateName: candidate.name,
          position: candidate.position,
          interviewId: candidate.id,
          preview: true,
        })
      })
      const data = await res.json()
      if (!res.ok || data?.error) {
        console.error('Interview email failed:', data?.error)
        alert(data?.error || 'Failed to send interview email')
        return
      }
      const link = data?.link
      const companyName = data?.companyName || 'our organization'
      setEmailTo(candidate.email)
      setEmailCc(user?.email || '')
      setEmailSubject(`Invitation: AI Interview for ${candidate?.position} Position`)
      setEmailContent(`Dear ${candidate?.name || 'Candidate'},\n\nThank you for your interest in the ${candidate?.position} position at ${companyName}. We have carefully reviewed your application and are impressed by your qualifications and experience.\n\nYour profile demonstrates strong alignment with our requirements, and we would like to invite you to the next stage of our selection process - an AI-powered interview assessment.\n\nNEXT STEPS:\nPlease click the link below to access your personalized interview:\n${link}\n\nIMPORTANT DETAILS:\n• Time Commitment: Approximately 30-45 minutes\n• Deadline: Please complete within 48 hours\n• Technical Requirements: Stable internet connection, webcam, and microphone\n• Link Expiry: The interview link will expire after 48 hours\n\nThis AI interview will help us better understand your skills, experience, and fit for the role. The assessment is designed to be conversational and will cover technical competencies and behavioral aspects relevant to the position.\n\nShould you have any questions or require any accommodations, please don't hesitate to reach out to us.\n\nWe look forward to learning more about you through this interview.\n\nBest regards,\nTalent Acquisition Team`)
      setShowEmailTemplate(true)
    } catch (err) {
      console.error('Interview email error:', err)
      alert('Failed to send interview email')
    } finally {
      setEmailLoading(false)
    }
  }

  const handleResendInterviewEmail = async () => {
    if (!candidate?.email) {
      alert('Candidate email is missing')
      return
    }
    try {
      setEmailLoading(true)
      const res = await fetch('/api/interview/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: candidate.email,
          candidateName: candidate.name,
          position: candidate.position,
          interviewId: candidate.id,
          preview: true,
        })
      })
      const data = await res.json()
      if (!res.ok || data?.error) {
        console.error('Interview email failed:', data?.error)
        alert(data?.error || 'Failed to resend interview email')
        return
      }
      const link = data?.link
      const companyName = data?.companyName || 'our organization'
      setEmailTo(candidate.email)
      setEmailCc(user?.email || '')
      setEmailSubject(`Reminder: Complete Your AI Interview for ${candidate?.position} Position`)
      setEmailContent(`Dear ${candidate?.name || 'Candidate'},\n\nWe hope this message finds you well. This is a friendly reminder regarding the AI-powered interview for the ${candidate?.position} position at ${companyName}.\n\nWe noticed that you haven't yet completed the interview assessment we sent earlier. Your application remains active and we are still very interested in considering you for this opportunity.\n\nINTERVIEW LINK:\n${link}\n\nIMPORTANT REMINDERS:\n• Time Required: 30-45 minutes\n• Deadline: Please complete within the next 48 hours\n• Link Status: This interview link will expire soon\n• Technical Setup: Ensure you have a stable internet connection, working webcam, and microphone\n\nYour professional background and qualifications caught our attention, and we believe this interview will be an excellent opportunity for us to learn more about your capabilities and for you to showcase your skills.\n\nIf you're experiencing any technical difficulties or have questions about the interview process, please reach out to us immediately so we can assist you.\n\nWe look forward to receiving your completed interview assessment.\n\nBest regards,\nTalent Acquisition Team`)
      setShowEmailTemplate(true)
    } catch (err) {
      console.error('Interview email error:', err)
      alert('Failed to resend interview email')
    } finally {
      setEmailLoading(false)
    }
  }

  const handleSaveHM = async () => {
    if (!candidate?.id) return
    try {
      setHmSaveLoading(true)
      const res = await fetch('/api/applications/update-hm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: candidate.id,
          hmStatus: hmStatus || undefined,
          hmRating: hmRating || undefined,
          hmFeedback: hmFeedback || undefined,
          hmInterviewDate: hmInterviewDate || undefined,
          hmFeedbackDate: hmFeedbackDate || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || data?.error) {
        alert(data?.error || 'Failed to save HM data')
        return
      }
      onOpenChange(false)
      if (onMoved) onMoved()
    } catch (err) {
      console.error('HM save error:', err)
      alert('Failed to save HM data')
    } finally {
      setHmSaveLoading(false)
    }
  }

  const handleUpdateOfferStatus = async () => {
    if (!candidate?.id) return
    try {
      setMoveLoading(true)
      const res = await fetch('/api/applications/update-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: candidate.id,
          offerStatus: offerStatus || undefined,
          offerAmount: offerAmount || undefined,
          offerBonus: offerBonus || undefined,
          offerEquity: offerEquity || undefined,
          offerExpiryDate: offerExpiry || undefined,
          negotiationRounds: negotiationRounds || undefined,
          declineReason: declineReason || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || data?.error) {
        alert(data?.error || 'Failed to save offer data')
        return
      }
      onOpenChange(false)
      if (onMoved) onMoved()
    } catch (err) {
      console.error('Offer save error:', err)
      alert('Failed to save offer data')
    } finally {
      setMoveLoading(false)
    }
  }

  const handleSaveOffer = async () => {
    if (!candidate?.id) return
    try {
      setMoveLoading(true)
      const res = await fetch('/api/applications/update-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: candidate.id,
          offerStatus: 'Offer Sent',
          offerAmount: offerAmount || undefined,
          offerBonus: offerBonus || undefined,
          offerEquity: offerEquity || undefined,
          offerExpiryDate: offerExpiry || undefined,
          offerCurrency: offerCurrency || 'USD',
        }),
      })
      const data = await res.json()
      if (!res.ok || data?.error) {
        alert(data?.error || 'Failed to save offer data')
        return
      }
    } catch (err) {
      console.error('Offer save error:', err)
    } finally {
      setMoveLoading(false)
    }
  }

  const handleSaveOnboarding = async () => {
    if (!candidate?.id) return
    try {
      setMoveLoading(true)
      const res = await fetch('/api/applications/update-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: candidate.id,
          hireDate: hireDate || undefined,
          startDate: startDate || undefined,
          backgroundCheckStatus: backgroundCheckStatus || undefined,
          referenceCheckStatus: referenceCheckStatus || undefined,
          onboardingStatus: onboardingStatus || undefined,
          qualityOfHireRating: qualityOfHireRating ? parseInt(qualityOfHireRating) : undefined,
          employmentStatus: employmentStatus || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || data?.error) {
        alert(data?.error || 'Failed to save onboarding data')
        return
      }
      onOpenChange(false)
      if (onMoved) onMoved()
    } catch (err) {
      console.error('Onboarding save error:', err)
      alert('Failed to save onboarding data')
    } finally {
      setMoveLoading(false)
    }
  }

  const onClose = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="sr-only">Candidate Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 overflow-y-auto flex-1 pr-2">
          {/* Candidate Info */}
          <Card className="p-4 bg-gray-50">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xl">
                {candidate?.name?.split(' ').map((n: string) => n[0]).join('')}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900">{candidate?.name}</h3>
                <p className="text-gray-600">{candidate?.position}</p>
                <div className="flex items-center gap-3 mt-2 text-sm">
                  {candidate?.cvScore && (
                    <span className="font-semibold text-blue-700">CV Score: {candidate?.cvScore}</span>
                  )}
                  {candidate?.cvScore && candidate?.interviewScore && candidate?.interviewScore !== 'N/A' && (
                    <span className="text-gray-400">|</span>
                  )}
                  {candidate?.interviewScore && candidate?.interviewScore !== 'N/A' && (
                    <span className="font-semibold text-purple-700">Interview Score: {candidate?.interviewScore}</span>
                  )}
                  {candidate?.offerAmount && (
                    <>
                      <span className="text-gray-400">|</span>
                      <span className="font-semibold text-green-700">Offer: {candidate?.offerAmount}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* CV Screening Actions */}
          {bucketType === 'screening' && (
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">CV Screening Data</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="cvScore">Screening Score</Label>
                  <Input 
                    id="cvScore" 
                    defaultValue={candidate?.screeningScore || candidate?.cvScore || ''} 
                    placeholder="Enter screening score"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="screeningDate">Screening Date</Label>
                  <Input 
                    id="screeningDate" 
                    type="date" 
                    defaultValue={candidate?.screeningDate || new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            </div>
          )}

          {/* AI Interview Actions */}
          {bucketType === 'interview' && (
            <div className="space-y-4">
              {/* Show scoring section when interview has been attempted (Completed or Incomplete) */}
              {candidate?.interviewStatus !== 'Not Scheduled' && candidate?.interviewStatus !== 'Scheduled' && (
                <>
                  <h4 className="font-semibold text-gray-900">Interview Management & Scoring</h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="interviewType">Interview Type</Label>
                      <Input 
                        id="interviewType" 
                        value="AI Interview" 
                        disabled 
                        className="bg-gray-50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="interviewDate">Interview Date</Label>
                      <Input id="interviewDate" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                    </div>
                  </div>
                </>
              )}

              {/* Email buttons based on interview status */}
              {candidate?.interviewStatus === 'Not Scheduled' && (
                <Button onClick={handleSendInterviewEmail} className="w-full gap-2" disabled={emailLoading}>
                  <Send className="h-4 w-4" />
                  {emailLoading ? 'Preparing...' : 'Preview Interview Email'}
                </Button>
              )}

              {candidate?.interviewStatus === 'Scheduled' && (
                <Button onClick={handleResendInterviewEmail} className="w-full gap-2" disabled={emailLoading}>
                  <Mail className="h-4 w-4" />
                  {emailLoading ? 'Preparing...' : 'Preview & Resend Email'}
                </Button>
              )}
            </div>
          )}

          {/* Hiring Manager Actions */}
          {bucketType === 'hiringManager' && (
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Hiring Manager Review</h4>

              {/* For statuses needing update - Only show status dropdown and Save button */}
              {(hmStatus === 'Waiting for HM feedback' || hmStatus === 'Under Review' || hmStatus === 'OnHold') ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="hmStatus">HM Review Status</Label>
                    <Select value={hmStatus} onValueChange={setHmStatus}>
                      <SelectTrigger id="hmStatus">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Waiting for HM feedback">Waiting for HM feedback</SelectItem>
                        <SelectItem value="Under Review">Under Review</SelectItem>
                        <SelectItem value="Approved">Approved for Offer</SelectItem>
                        <SelectItem value="Rejected">Rejected by HM</SelectItem>
                        <SelectItem value="OnHold">On Hold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    onClick={handleSaveHM}
                    disabled={hmSaveLoading}
                    className="w-full"
                  >
                    {hmSaveLoading ? 'Saving...' : 'Save Status'}
                  </Button>
                </>
              ) : (
                <>
                  {/* HM Status and Rating in same row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="hmStatus">HM Review Status</Label>
                      <Select value={hmStatus} onValueChange={setHmStatus}>
                        <SelectTrigger id="hmStatus">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Waiting for HM feedback">Waiting for HM feedback</SelectItem>
                          <SelectItem value="Under Review">Under Review</SelectItem>
                          <SelectItem value="Approved">Approved for Offer</SelectItem>
                          <SelectItem value="Rejected">Rejected by HM</SelectItem>
                          <SelectItem value="OnHold">On Hold</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hmRating">HM Satisfaction Rating (1-5)</Label>
                      <Select value={hmRating} onValueChange={setHmRating}>
                        <SelectTrigger id="hmRating">
                          <SelectValue placeholder="Rate HM satisfaction..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 - Excellent</SelectItem>
                          <SelectItem value="4">4 - Good</SelectItem>
                          <SelectItem value="3">3 - Average</SelectItem>
                          <SelectItem value="2">2 - Below Average</SelectItem>
                          <SelectItem value="1">1 - Poor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* HM Interview Date and Feedback Date in same row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="hmInterviewDate">HM Interview Date</Label>
                      <Input
                        id="hmInterviewDate"
                        type="date"
                        value={hmInterviewDate}
                        onChange={(e) => setHmInterviewDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="feedbackSubmitDate">Feedback Submission Date</Label>
                      <Input
                        id="feedbackSubmitDate"
                        type="date"
                        value={hmFeedbackDate}
                        onChange={(e) => setHmFeedbackDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hmFeedback">HM Detailed Feedback</Label>
                    <Textarea 
                      id="hmFeedback" 
                      placeholder="Hiring manager's assessment, concerns, recommendations..."
                      rows={4}
                      value={hmFeedback}
                      onChange={(e) => setHmFeedback(e.target.value)}
                    />
                  </div>

                  <Button
                    onClick={handleSaveHM}
                    disabled={hmSaveLoading}
                    className="w-full"
                  >
                    {hmSaveLoading ? 'Saving...' : 'Save HM Review'}
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Offer Stage Actions */}
          {bucketType === 'offer' && (
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Offer Management</h4>

              {/* Offer Status Display */}
              <div className="space-y-2">
                <Label htmlFor="offerStatus">Offer Status</Label>
                <Select value={offerStatus} onValueChange={setOfferStatus}>
                  <SelectTrigger id="offerStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Not Sent Yet">Not Sent Yet</SelectItem>
                    <SelectItem value="Offer Sent">Offer Sent</SelectItem>
                    <SelectItem value="Under Review">Under Review</SelectItem>
                    <SelectItem value="Negotiating">Negotiating</SelectItem>
                    <SelectItem value="Accepted">Accepted</SelectItem>
                    <SelectItem value="Declined">Declined</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* For "Not Sent Yet" - Show full offer form and send button */}
              {offerStatus === 'Not Sent Yet' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="offerExtendedDate">Offer Extended Date</Label>
                      <Input 
                        id="offerExtendedDate" 
                        type="date"
                        defaultValue={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="offerExpiry">Offer Expiry Date</Label>
                      <Input 
                        id="offerExpiry" 
                        type="date"
                        value={offerExpiry}
                        onChange={(e) => setOfferExpiry(e.target.value)}
                      />
                    </div>
                  </div>

                  <Card className="p-3 bg-gray-50">
                    <h5 className="font-medium text-sm mb-3">Compensation Package</h5>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Currency</Label>
                        <div className="flex items-center h-9 px-3 rounded-md border bg-gray-100 text-sm text-gray-700 font-medium">
                          {offerCurrency}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="offerAmount" className="text-xs">Base Salary/per annum</Label>
                        <Input 
                          id="offerAmount" 
                          placeholder="e.g., 95000" 
                          value={offerAmount}
                          onChange={(e) => setOfferAmount(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="offerBonus" className="text-xs">Annual Bonus</Label>
                        <Input 
                          id="offerBonus" 
                          placeholder="e.g., 10000"
                          value={offerBonus}
                          onChange={(e) => setOfferBonus(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="offerEquity" className="text-xs">Equity/Stock Options</Label>
                        <Input 
                          id="offerEquity" 
                          placeholder="e.g., 1000 RSUs"
                          value={offerEquity}
                          onChange={(e) => setOfferEquity(e.target.value)}
                        />
                      </div>
                    </div>
                  </Card>

                </>
              ) : (
                <>
                  {/* For other statuses - Show status update options */}
                  <Card className="p-3 bg-blue-50">
                    <h5 className="font-medium text-sm text-blue-900 mb-2">Current Offer Details</h5>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <Label className="text-xs text-gray-600">Base Salary</Label>
                        <p className="font-medium">{candidate?.offerAmount || offerAmount || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">Total Compensation</Label>
                        <p className="font-medium">Calculate from offer data</p>
                      </div>
                    </div>
                  </Card>

                  {(offerStatus === 'Negotiating' || offerStatus === 'Under Review') && (
                    <div className="space-y-2">
                      <Label htmlFor="negotiationRounds">Negotiation Rounds</Label>
                      <Input 
                        id="negotiationRounds" 
                        type="number" 
                        min="0"
                        placeholder="0"
                        value={negotiationRounds}
                        onChange={(e) => setNegotiationRounds(e.target.value)}
                      />
                    </div>
                  )}

                  {offerStatus === 'Declined' && (
                    <Card className="p-3 bg-amber-50 border-amber-200">
                      <h5 className="font-medium text-sm text-amber-900 mb-3">Decline Information</h5>
                      <div className="space-y-2">
                        <Label htmlFor="declineReason">Decline Reason</Label>
                        <Select value={declineReason} onValueChange={setDeclineReason}>
                          <SelectTrigger id="declineReason">
                            <SelectValue placeholder="Select reason..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="compensation">Compensation too low</SelectItem>
                            <SelectItem value="betterOffer">Accepted better offer</SelectItem>
                            <SelectItem value="location">Location concerns</SelectItem>
                            <SelectItem value="culture">Culture fit concerns</SelectItem>
                            <SelectItem value="timing">Timing not right</SelectItem>
                            <SelectItem value="other">Other reason</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </Card>
                  )}

                  <Button onClick={handleUpdateOfferStatus} className="w-full">
                    Update Offer Status
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Hired Stage Actions */}
          {bucketType === 'hired' && (
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Post-Hire & Onboarding</h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="hireDate">Hire Date (Offer Accepted)</Label>
                  <Input 
                    id="hireDate" 
                    type="date"
                    value={hireDate || candidate?.rawHireDate || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setHireDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Expected Start Date</Label>
                  <Input 
                    id="startDate" 
                    type="date"
                    value={startDate || candidate?.rawStartDate || ''}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
              </div>

              <Card className="p-3 bg-gray-50">
                <h5 className="font-medium text-sm mb-2">Final Package Details</h5>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <Label className="text-xs text-gray-600">Base Salary</Label>
                    <p className="font-medium">{candidate?.offerAmount || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Total Compensation</Label>
                    <p className="font-medium">Calculate from offer data</p>
                  </div>
                </div>
              </Card>

              <div className="space-y-2">
                <Label htmlFor="backgroundCheck">Background Check Status</Label>
                <Select value={backgroundCheckStatus} onValueChange={setBackgroundCheckStatus}>
                  <SelectTrigger id="backgroundCheck">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="inProgress">In Progress</SelectItem>
                    <SelectItem value="clear">Clear</SelectItem>
                    <SelectItem value="issues">Issues Found</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="referenceCheck">Reference Check Status</Label>
                <Select value={referenceCheckStatus} onValueChange={setReferenceCheckStatus}>
                  <SelectTrigger id="referenceCheck">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="inProgress">In Progress</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Card className="p-3 bg-gray-50">
                <h5 className="font-medium text-sm mb-2">Onboarding Checklist</h5>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="equipmentOrdered" />
                    <Label htmlFor="equipmentOrdered" className="text-sm">Equipment Ordered</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="accountsCreated" />
                    <Label htmlFor="accountsCreated" className="text-sm">Accounts Created</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="welcomeEmailSent" />
                    <Label htmlFor="welcomeEmailSent" className="text-sm">Welcome Email Sent</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="docsCollected" />
                    <Label htmlFor="docsCollected" className="text-sm">Documents Collected</Label>
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="onboardingStatus">Onboarding Status</Label>
                  <Select value={onboardingStatus || candidate?.hireStatus || 'Awaiting Onboarding'} onValueChange={setOnboardingStatus}>
                    <SelectTrigger id="onboardingStatus">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Awaiting Onboarding">Awaiting Onboarding</SelectItem>
                      <SelectItem value="Onboarding in Progress">Onboarding in Progress</SelectItem>
                      <SelectItem value="On Track">On Track</SelectItem>
                      <SelectItem value="Behind">Behind Schedule</SelectItem>
                      <SelectItem value="Complete">Onboarding Complete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employmentStatus">Employment Status</Label>
                  <Select value={employmentStatus} onValueChange={setEmploymentStatus}>
                    <SelectTrigger id="employmentStatus">
                      <SelectValue placeholder="Select status..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Still with the Firm">Still with the Firm</SelectItem>
                      <SelectItem value="Left the Firm">Left the Firm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hireQuality">Quality of Hire Rating (After 90 days)</Label>
                <Select value={qualityOfHireRating} onValueChange={setQualityOfHireRating}>
                  <SelectTrigger id="hireQuality">
                    <SelectValue placeholder="Rate after 90 days..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 - Exceptional</SelectItem>
                    <SelectItem value="4">4 - Exceeds Expectations</SelectItem>
                    <SelectItem value="3">3 - Meets Expectations</SelectItem>
                    <SelectItem value="2">2 - Below Expectations</SelectItem>
                    <SelectItem value="1">1 - Not Meeting Expectations</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="onboardingNotes">Onboarding Notes</Label>
                <Textarea id="onboardingNotes" placeholder="Progress, issues, feedback..." rows={3} />
              </div>

              <Button onClick={handleSaveOnboarding} disabled={moveLoading} className="w-full gap-2">
                <Mail className="h-4 w-4" />
                {moveLoading ? 'Saving...' : 'Save Onboarding Data'}
              </Button>
            </div>
          )}

          {/* Email Template Display */}
          {showEmailTemplate && (
            <Card className="p-4 bg-green-50 border-green-200 space-y-3">
              <h4 className="font-semibold text-green-900">Email Preview</h4>
              
              <div className="space-y-2">
                <Label htmlFor="templateTo" className="text-xs font-medium">To</Label>
                <Input
                  id="templateTo"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="candidate@email.com"
                  className="bg-white w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="templateCc" className="text-xs font-medium">CC (comma-separated)</Label>
                <Input 
                  id="templateCc"
                  value={emailCc} 
                  onChange={(e) => setEmailCc(e.target.value)}
                  placeholder="recruiter@company.com"
                  className="bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="templateSubject" className="text-xs font-medium">Subject</Label>
                <Input 
                  id="templateSubject"
                  value={emailSubject} 
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="templateBody" className="text-xs font-medium">Body</Label>
                <Textarea
                  id="templateBody"
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                  rows={12}
                  className="font-mono text-xs bg-white"
                />
              </div>

              <div className="flex gap-2 mt-3">
                <Button 
                  className="flex-1" 
                  disabled={emailSending}
                  onClick={async () => {
                    if (!candidate?.email) return
                    try {
                      setEmailSending(true)
                      const res = await fetch('/api/interview/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          to: emailTo,
                          candidateName: candidate.name,
                          position: candidate.position,
                          interviewId: candidate.id,
                          preview: false,
                          cc: emailCc,
                        })
                      })
                      const data = await res.json()
                      if (!res.ok || data?.error) {
                        alert(data?.error || 'Failed to send email')
                        return
                      }
                      alert('Interview email sent successfully!')
                      // Optimistically update status in UI
                      if (candidate) {
                        candidate.interviewStatus = 'Scheduled'
                      }
                      if (onMoved) onMoved()
                      setShowEmailTemplate(false)
                    } catch (err) {
                      console.error('Send email error:', err)
                      alert('Failed to send email')
                    } finally {
                      setEmailSending(false)
                    }
                  }}
                >
                  {emailSending ? 'Sending...' : 'Send Email'}
                </Button>
                <Button variant="outline" onClick={() => setShowEmailTemplate(false)} className="bg-transparent">Cancel</Button>
              </div>
            </Card>
          )}

          {/* Rejected Bucket - Talent Pool Option */}
          {bucketType === 'rejected' && (
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Talent Pool Management</h4>

              <Card className="p-4 bg-amber-50 border-amber-200">
                <h5 className="font-medium text-sm text-amber-900 mb-2">Current Status</h5>
                <p className="text-sm text-gray-700">This candidate has been rejected for the current position.</p>
              </Card>

              <div className="space-y-3">
                <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg border border-green-200">
                  <Checkbox 
                    id="moveToTalentPool" 
                    checked={addToTalentPool}
                    onCheckedChange={(checked) => setAddToTalentPool(checked as boolean)}
                  />
                  <Label htmlFor="moveToTalentPool" className="text-sm font-medium">
                    Move to Talent Pool for future opportunities
                  </Label>
                </div>

                {addToTalentPool && (
                  <Card className="p-3 bg-blue-50 border-blue-200">
                    <h5 className="font-medium text-sm text-blue-900 mb-2">Talent Pool Details</h5>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="talentPoolCategory">Category</Label>
                        <Select value={talentPoolCategory} onValueChange={setTalentPoolCategory}>
                          <SelectTrigger id="talentPoolCategory">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="future">Future Opportunities</SelectItem>
                            <SelectItem value="highPotential">High Potential</SelectItem>
                            <SelectItem value="specialized">Specialized Skills</SelectItem>
                            <SelectItem value="referral">Referral Candidate</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="talentPoolNotes">Notes for Future Reference</Label>
                        <Textarea 
                          id="talentPoolNotes"
                          placeholder="Why this candidate should be considered for future roles..."
                          rows={3}
                          value={talentPoolNotes || `Strong technical skills but timing wasn't right for current role. Would be excellent for future ${candidate?.position} openings.`}
                          onChange={(e) => setTalentPoolNotes(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="skillsTags">Skills Tags (comma-separated)</Label>
                        <Input 
                          id="skillsTags"
                          placeholder="React, Node.js, Leadership, Communication"
                          value={talentPoolSkillTags}
                          onChange={(e) => setTalentPoolSkillTags(e.target.value)}
                        />
                      </div>
                    </div>
                  </Card>
                )}

                <Button 
                  onClick={async () => {
                    if (!addToTalentPool || !candidate?.id) return
                    try {
                      setMoveLoading(true)
                      const res = await fetch('/api/applications/move', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          applicationId: candidate.id,
                          moveToStage: 'talentPool',
                          remarks: 'Added to talent pool from rejected stage',
                          companyId: company?.id || null,
                          addToTalentPool: true,
                          talentPoolCategory,
                          talentPoolNotes,
                          talentPoolSkillTags,
                        })
                      })
                      const data = await res.json()
                      if (!res.ok || data?.error) {
                        alert(data?.error || 'Failed to add to talent pool')
                        return
                      }
                      onOpenChange(false)
                      if (onMoved) onMoved()
                    } catch (err) {
                      console.error('Talent pool error:', err)
                      alert('Failed to add to talent pool')
                    } finally {
                      setMoveLoading(false)
                    }
                  }} 
                  className="w-full"
                  disabled={!addToTalentPool || moveLoading}
                >
                  {moveLoading ? 'Saving...' : addToTalentPool ? 'Move to Talent Pool' : 'Select Option Above'}
                </Button>
              </div>
            </div>
          )}

          {/* Move Application Section */}
          {bucketType !== 'all' && bucketType !== 'rejected' && 
           !(bucketType === 'interview' && candidate?.interviewStatus !== 'Completed' && candidate?.interviewStatus !== 'Incomplete') && (
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-semibold text-gray-900">Move Application</h4>



              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="moveToStage">Move Application To</Label>
                  <Select value={moveToStage} onValueChange={setMoveToStage}>
                    <SelectTrigger id="moveToStage">
                      <SelectValue placeholder="Select stage..." />
                    </SelectTrigger>
                    <SelectContent>
                      {bucketType === 'screening' && (
                        <>
                          <SelectItem value="interview">AI Interview Stage</SelectItem>
                          <SelectItem value="talentPool">Talent Pool</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </>
                      )}
                      {bucketType === 'interview' && (
                        <>
                          <SelectItem value="hiringManager">Hiring Manager Stage</SelectItem>
                          <SelectItem value="talentPool">Talent Pool</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </>
                      )}
                      {bucketType === 'hiringManager' && (
                        <>
                          <SelectItem value="offer">Offer Stage</SelectItem>
                          <SelectItem value="onHold">On Hold</SelectItem>
                          <SelectItem value="talentPool">Talent Pool</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </>
                      )}
                      {bucketType === 'offer' && (
                        <>
                          <SelectItem value="hired">Hired</SelectItem>
                          <SelectItem value="talentPool">Talent Pool</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </>
                      )}
                      {bucketType === 'hired' && (
                        <>
                          <SelectItem value="talentPool">Talent Pool</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="remarks">Remarks (Required)</Label>
                  <Textarea
                    id="remarks"
                    placeholder="Enter your remarks..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={1}
                  />
                </div>
              </div>

              {/* Rejection specific fields */}
              {moveToStage === 'rejected' && (
                <Card className="p-3 bg-red-50 border-red-200">
                  <h5 className="font-medium text-sm text-red-900 mb-3">Rejection Details</h5>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="rejectionReason">Rejection Reason</Label>
                      <Select value={rejectionReason} onValueChange={setRejectionReason}>
                        <SelectTrigger id="rejectionReason">
                          <SelectValue placeholder="Select reason..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="notQualified">Not Qualified</SelectItem>
                          <SelectItem value="betterCandidate">Found Better Candidate</SelectItem>
                          <SelectItem value="cultureFit">Culture Fit Concerns</SelectItem>
                          <SelectItem value="skillsGap">Skills Gap</SelectItem>
                          <SelectItem value="experienceLevel">Experience Level Mismatch</SelectItem>
                          <SelectItem value="salaryExpectations">Salary Expectations</SelectItem>
                          <SelectItem value="locationIssues">Location Issues</SelectItem>
                          <SelectItem value="positionFilled">Position Filled</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="addToTalentPool" 
                        checked={addToTalentPool}
                        onCheckedChange={(checked) => setAddToTalentPool(checked as boolean)}
                      />
                      <Label htmlFor="addToTalentPool" className="text-sm">
                        Add to Talent Pool for future opportunities
                      </Label>
                    </div>

                    {addToTalentPool && (
                      <div className="space-y-2 pt-2">
                        <Label htmlFor="talentPoolNotes">Talent Pool Notes</Label>
                        <Textarea 
                          id="talentPoolNotes" 
                          placeholder="Why keep this candidate? Potential roles?"
                          rows={2}
                        />
                      </div>
                    )}
                  </div>
                </Card>
              )}

              <Button 
                onClick={handleMove} 
                disabled={!moveToStage || !remarks || moveLoading}
                className="w-full"
              >
                {moveLoading ? 'Moving...' : 'Confirm Move'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
