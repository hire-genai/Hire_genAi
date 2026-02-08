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
