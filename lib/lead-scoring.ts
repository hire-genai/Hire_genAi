/**
 * Lead Scoring Utility
 * Calculates lead score based on form data using rule-based scoring
 * This is internal logic - not exposed to users
 */

export interface LeadFormData {
  companySize?: string
  monthlyHires?: string
  budget?: string
  timeline?: string
}

export interface ScoreBreakdown {
  companySize: number
  monthlyHires: number
  budget: number
  timeline: number
}

export interface LeadScoreResult {
  score: number
  status: 'HOT' | 'WARM' | 'COLD'
  breakdown: ScoreBreakdown
}

/**
 * Calculate lead score based on form data
 * Max possible score: 10 + 10 + 15 + 15 = 50
 * Normalized to percentage for classification
 */
export function calculateLeadScore(formData: LeadFormData): LeadScoreResult {
  const breakdown: ScoreBreakdown = {
    companySize: 0,
    monthlyHires: 0,
    budget: 0,
    timeline: 0,
  }

  // Company Size scoring (max 10)
  switch (formData.companySize) {
    case '1-10':
      breakdown.companySize = 3
      break
    case '11-50':
      breakdown.companySize = 6
      break
    case '51-200':
      breakdown.companySize = 8
      break
    case '200+':
    case '201-500':
    case '501-1000':
    case '1001-5000':
    case '5001-10000':
    case '10000+':
      breakdown.companySize = 10
      break
    default:
      breakdown.companySize = 0
  }

  // Monthly Hires scoring (max 10)
  switch (formData.monthlyHires) {
    case '1-5':
      breakdown.monthlyHires = 4
      break
    case '6-20':
      breakdown.monthlyHires = 7
      break
    case '21-50':
      breakdown.monthlyHires = 9
      break
    case '50+':
    case '51+':
      breakdown.monthlyHires = 10
      break
    default:
      breakdown.monthlyHires = 0
  }

  // Budget scoring (max 15)
  switch (formData.budget) {
    case '<5000':
      breakdown.budget = 3
      break
    case '5000-20000':
      breakdown.budget = 8
      break
    case '20000-50000':
      breakdown.budget = 12
      break
    case '50000+':
      breakdown.budget = 15
      break
    default:
      breakdown.budget = 0
  }

  // Timeline scoring (max 15)
  switch (formData.timeline) {
    case 'immediate':
      breakdown.timeline = 15
      break
    case '1month':
      breakdown.timeline = 12
      break
    case '3months':
    case '1-3months':
      breakdown.timeline = 8
      break
    case '6months':
    case '3-6months':
      breakdown.timeline = 4
      break
    default:
      breakdown.timeline = 0
  }

  // Calculate total score (raw score out of 50, normalized to 100)
  const rawScore = breakdown.companySize + breakdown.monthlyHires + breakdown.budget + breakdown.timeline
  const normalizedScore = Math.round((rawScore / 50) * 100)

  // Determine lead status based on normalized score
  let status: 'HOT' | 'WARM' | 'COLD'
  if (normalizedScore >= 75) {
    status = 'HOT'
  } else if (normalizedScore >= 50) {
    status = 'WARM'
  } else {
    status = 'COLD'
  }

  return {
    score: normalizedScore,
    status,
    breakdown,
  }
}
