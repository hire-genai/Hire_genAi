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
  const [emailCc, setEmailCc] = useState('recruiter@company.com')
  const [emailSubject, setEmailSubject] = useState('')
  const [offerAmount, setOfferAmount] = useState('')
  const [offerExpiry, setOfferExpiry] = useState('')
  const [offerBonus, setOfferBonus] = useState('')
  const [offerEquity, setOfferEquity] = useState('')
  const [negotiationRounds, setNegotiationRounds] = useState('0')
  const [declineReason, setDeclineReason] = useState('')
  const [backgroundCheckStatus, setBackgroundCheckStatus] = useState('')
  const [referenceCheckStatus, setReferenceCheckStatus] = useState('')
  const [startDate, setStartDate] = useState('')
  
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
  const [offerStatus, setOfferStatus] = useState(candidate?.offerStatus || 'Not Sent Yet')
  const [interviewType, setInterviewType] = useState('')
  const [interviewerName, setInterviewerName] = useState('')
  const [moveLoading, setMoveLoading] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailSending, setEmailSending] = useState(false)

  // Reset ALL states when dialog opens or bucketType changes
  useEffect(() => {
    if (open) {
      // Reset common states
      setRemarks('')
      setMoveToStage('')
      setShowEmailTemplate(false)
      setEmailContent('')
      setEmailTo('')
      setEmailCc(user?.email || 'recruiter@company.com')
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
      setNegotiationRounds('0')
      
      // Reset hiring manager states
      setHmRating('')
      setHmFeedback('')
      setHiringManagerName('')
      
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
      setEmailCc('recruiter@company.com')
      setEmailSubject('')
    }
  }, [open])

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
          changedByEmail: candidate?.email || candidate?.candidateEmail || null,
          companyId: company?.id || null,
          rejectionReason: moveToStage === 'rejected' ? rejectionReason : undefined,
          addToTalentPool: addToTalentPool || undefined,
          talentPoolCategory: addToTalentPool ? talentPoolCategory : undefined,
          talentPoolNotes: addToTalentPool ? talentPoolNotes : undefined,
          talentPoolSkillTags: addToTalentPool ? talentPoolSkillTags : undefined,
        })
      })

      const data = await res.json()
      if (!res.ok || data?.error) {
        console.error('Move failed:', data?.error)
        alert(data?.error || 'Failed to move application')
        return
      }

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

  const handleUpdateOfferStatus = () => {
    console.log('[v0] Updating offer status to:', offerStatus)
    onOpenChange(false)
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
                    onClick={() => {
                      console.log('[v0] Saving HM status:', hmStatus)
                      onOpenChange(false)
                    }} 
                    className="w-full"
                  >
                    Save Status
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
                      <Input id="hmInterviewDate" type="date" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="feedbackSubmitDate">Feedback Submission Date</Label>
                      <Input id="feedbackSubmitDate" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
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
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="offerAmount">Base Salary</Label>
                        <Input 
                          id="offerAmount" 
                          placeholder="e.g., $95,000" 
                          value={offerAmount}
                          onChange={(e) => setOfferAmount(e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="offerBonus">Annual Bonus</Label>
                          <Input 
                            id="offerBonus" 
                            placeholder="e.g., $10,000"
                            value={offerBonus}
                            onChange={(e) => setOfferBonus(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="offerEquity">Equity/Stock Options</Label>
                          <Input 
                            id="offerEquity" 
                            placeholder="e.g., 1000 RSUs"
                            value={offerEquity}
                            onChange={(e) => setOfferEquity(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>

                  <div className="space-y-2">
                    <Label htmlFor="offerNotes">Offer Notes & Benefits</Label>
                    <Textarea 
                      id="offerNotes" 
                      placeholder="Additional benefits, perks, special conditions..."
                      rows={3}
                    />
                  </div>

                  <Button onClick={() => {
                    console.log('[v0] Sending offer email to:', candidate?.name)
                    setEmailTo(candidate?.email || '')
                    setEmailCc('recruiter@company.com, hr@company.com')
                    setEmailSubject(`Congratulations! Job Offer for ${candidate?.position} Position`)
                    setEmailContent(`Dear ${candidate?.name},

We are delighted to extend you an offer of employment for the position of ${candidate?.position} at our organization.

POSITION DETAILS:
• Job Title: ${candidate?.position}
• Department: Engineering
• Reports To: Engineering Manager
• Employment Type: Full-time
• Start Date: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}

COMPENSATION PACKAGE:
• Base Salary: ${offerAmount || '$95,000'} per annum
• Annual Performance Bonus: ${offerBonus || '$10,000'} (subject to company and individual performance)
• Equity/Stock Options: ${offerEquity || '1,000 RSUs'} vesting over 4 years
• Sign-on Bonus: $5,000 (paid with first paycheck)

BENEFITS:
• Health Insurance: Comprehensive medical, dental, and vision coverage
• 401(k) Retirement Plan: Company match up to 6%
• Paid Time Off: 20 days per year plus public holidays
• Professional Development: $2,000 annual learning budget
• Remote Work: Flexible hybrid work arrangement
• Equipment: Latest laptop, monitor, and home office setup

ADDITIONAL PERKS:
• Gym membership reimbursement
• Commuter benefits
• Team events and activities
• Stock purchase plan at 15% discount

OFFER ACCEPTANCE:
This offer is valid until ${offerExpiry || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. Please review the attached offer letter and click the link below to accept or discuss any questions you may have.

Offer Portal Link: https://app.hiregenai.com/offer/accept/abc123

ATTACHED DOCUMENTS:
✓ Formal Offer Letter (PDF)
✓ Employee Handbook
✓ Benefits Summary
✓ Equity Agreement

We believe you will be a valuable addition to our team, and we look forward to working with you. If you have any questions or would like to discuss any aspect of this offer, please don't hesitate to reach out.

Congratulations once again, and we hope to welcome you aboard soon!

Best regards,
Talent Acquisition Team`)
                    setShowEmailTemplate(true)
                  }} className="w-full gap-2">
                    <Mail className="h-4 w-4" />
                    Send Offer Letter to Candidate
                  </Button>

                  <p className="text-xs text-gray-600">
                    Note: Email will include formal offer letter with all compensation details and attached documents.
                  </p>
                </>
              ) : (
                <>
                  {/* For other statuses - Show status update options */}
                  <Card className="p-3 bg-blue-50">
                    <h5 className="font-medium text-sm text-blue-900 mb-2">Current Offer Details</h5>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-semibold">Base Salary:</span> {candidate?.offerAmount || offerAmount || 'N/A'}</p>
                      <p><span className="font-semibold">Status:</span> {offerStatus}</p>
                      <p><span className="font-semibold">Extended:</span> {new Date().toLocaleDateString()}</p>
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
                    defaultValue={candidate?.hireDate || new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Expected Start Date</Label>
                  <Input 
                    id="startDate" 
                    type="date"
                    value={startDate}
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

              <div className="space-y-2">
                <Label htmlFor="onboardingStatus">Onboarding Status</Label>
                <Select defaultValue={candidate?.hireStatus || 'Awaiting Onboarding'}>
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
                <Label htmlFor="hireQuality">Quality of Hire Rating (After 90 days)</Label>
                <Select>
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

              <Button className="w-full gap-2">
                <Mail className="h-4 w-4" />
                Send Onboarding Summary to HR
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
                  className="bg-white"
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

              {bucketType === 'interview' && (
                <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                  <Checkbox 
                    id="sendHMEmail" 
                    checked={sendEmailToHM}
                    onCheckedChange={(checked) => {
                      setSendEmailToHM(checked as boolean)
                      if (checked) {
                        // Auto-generate subject
                        setEmailSubject(`Excellent Candidate for ${candidate?.position} - ${candidate?.name}`)
                        
                        // Generate comprehensive email body
                        setEmailContent(`Dear Hiring Manager,

I am pleased to recommend an outstanding candidate for the ${candidate?.position} position. Based on our comprehensive AI-powered screening process, ${candidate?.name} has demonstrated exceptional qualifications and strong alignment with our requirements.

CANDIDATE SUMMARY:
${candidate?.name} is a highly qualified professional with impressive performance across both CV screening and AI interview assessments. With a CV score of ${candidate?.cvScore || 'N/A'} and an AI interview score of ${candidate?.interviewScore || 'N/A'}, this candidate stands out as a top-tier prospect.

CANDIDATE DETAILS:
• Name: ${candidate?.name}
• Position Applied: ${candidate?.position}
• Years of Experience: 6+ years
• Expected Salary: $120,000 - $140,000
• Preferred Joining Date: Within 2-4 weeks
• Available for Next Round: Flexible - Monday to Friday, 10 AM - 4 PM

ASSESSMENT SCORES:
• CV Screening Score: ${candidate?.cvScore || 'N/A'}
• AI Interview Score: ${candidate?.interviewScore || 'N/A'}

ATTACHED DOCUMENTS:
✓ CV Screening Report
✓ AI Interview Assessment Report
✓ Complete Candidate Resume

This candidate demonstrates strong technical skills, excellent communication abilities, and a proven track record in their field. I highly recommend scheduling the next round of interviews at your earliest convenience.

Please let me know your availability, and I will coordinate the interview schedule.

Best regards,
Recruitment Team`)
                      } else {
                        setEmailContent('')
                        setEmailTo('')
                        setEmailSubject('')
                      }
                    }}
                  />
                  <Label htmlFor="sendHMEmail" className="text-sm font-medium">
                    Send email to Hiring Manager when moving to HM stage
                  </Label>
                </div>
              )}

              {sendEmailToHM && (
                <Card className="p-4 bg-green-50 space-y-3">
                  <h5 className="text-sm font-semibold text-green-900">Email to Hiring Manager</h5>
                  
                  <div className="space-y-2">
                    <Label htmlFor="emailTo" className="text-xs font-medium">To (comma-separated emails)</Label>
                    <Input 
                      id="emailTo"
                      value={emailTo} 
                      onChange={(e) => setEmailTo(e.target.value)}
                      placeholder="hiring.manager@company.com, director@company.com"
                      className="bg-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emailCc" className="text-xs font-medium">CC (comma-separated emails)</Label>
                    <Input 
                      id="emailCc"
                      value={emailCc} 
                      onChange={(e) => setEmailCc(e.target.value)}
                      placeholder="recruiter@company.com, hr@company.com"
                      className="bg-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emailSubject" className="text-xs font-medium">Subject</Label>
                    <Input 
                      id="emailSubject"
                      value={emailSubject} 
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="bg-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emailBody" className="text-xs font-medium">Body</Label>
                    <Textarea 
                      id="emailBody"
                      value={emailContent} 
                      onChange={(e) => setEmailContent(e.target.value)}
                      rows={12}
                      className="bg-white font-mono text-xs"
                    />
                  </div>
                </Card>
              )}

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
                {moveLoading ? 'Moving...' : 'Move Application'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
