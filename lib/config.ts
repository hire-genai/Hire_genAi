// Application configuration
// Billing and pricing configuration - reads from environment variables

export const config = {
  billing: {
    enabled: process.env.BILLING_ENABLED === 'true',
    currency: process.env.BILLING_CURRENCY || 'USD',
  },
  pricing: {
    perInterview: parseFloat(process.env.PRICE_PER_INTERVIEW || '0'),
    perScreening: parseFloat(process.env.PRICE_PER_SCREENING || '0'),
  },
  openai: {
    adminKey: process.env.OPENAI_ADMIN_KEY,
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
}

export function getConfig() {
  return config
}

export function getBillingPrices() {
  return {
    cvParsingCost: parseFloat(process.env.COST_PER_CV_PARSING || '0.50'),
    questionGenerationCostPer10: parseFloat(process.env.COST_PER_10_QUESTIONS || '0.30'),
    videoInterviewCostPerMinute: parseFloat(process.env.COST_PER_VIDEO_MINUTE || '0.10'),
  }
}

export function getCVParsingCost(): number {
  return parseFloat(process.env.COST_PER_CV_PARSING || '0.50')
}

export function getQuestionGenerationCostPer10(): number {
  return parseFloat(process.env.COST_PER_10_QUESTIONS || '0.30')
}

export function getVideoInterviewCostPerMinute(): number {
  return parseFloat(process.env.COST_PER_VIDEO_MINUTE || '0.10')
}

export function getQuestionGenerationCost(questionCount: number): { cost: number; tier: string } {
  if (questionCount <= 4) {
    return { cost: 0, tier: '1-4 (Free)' }
  }
  // For 5-10 questions, use single price from .env
  const costPer10 = parseFloat(process.env.COST_PER_10_QUESTIONS || '0.30')
  return { cost: costPer10, tier: '5-10' }
}
