# Environment Variables Configuration

This document lists all environment variables that need to be configured in your `.env.local` file.

## Trial Period Configuration

```bash
# Trial period duration in days (default: 7)
# Set to 1 for 1-day trial, 7 for 7-day trial, 10 for 10-day trial, etc.
TRIAL_DAYS=7
```

## Payment Configuration

```bash
# Razorpay payment link URL (must be NEXT_PUBLIC_ for client-side access)
# Replace with your actual Razorpay payment page URL
NEXT_PUBLIC_RAZORPAY_PAYMENT_LINK=https://pages.razorpay.com/hire-genai

# Razorpay API Keys (server-side only)
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxx

# Razorpay Subscription Plan IDs
# Create plans in Razorpay Dashboard > Subscriptions > Plans
RAZORPAY_PLAN_ID_MONTHLY=plan_xxxxxxxxxx
RAZORPAY_PLAN_ID_YEARLY=plan_xxxxxxxxxx
```

## Complete .env.local Example

```bash
# Trial Configuration
TRIAL_DAYS=7

# Payment Configuration  
NEXT_PUBLIC_RAZORPAY_PAYMENT_LINK=https://pages.razorpay.com/hire-genai

# Razorpay API Keys
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxx

# Razorpay Subscription Plans
RAZORPAY_PLAN_ID_MONTHLY=plan_xxxxxxxxxx
RAZORPAY_PLAN_ID_YEARLY=plan_xxxxxxxxxx

# Add your other existing environment variables here...
# DATABASE_URL=...
# etc.
```

## Usage Examples

### Different Trial Periods
- For 1-day trial: `TRIAL_DAYS=1`
- For 7-day trial: `TRIAL_DAYS=7` 
- For 10-day trial: `TRIAL_DAYS=10`
- For 30-day trial: `TRIAL_DAYS=30`

### Different Payment Links
- Production: `NEXT_PUBLIC_RAZORPAY_PAYMENT_LINK=https://pages.razorpay.com/hire-genai`
- Staging: `NEXT_PUBLIC_RAZORPAY_PAYMENT_LINK=https://pages.razorpay.com/hire-genai-staging`
- Development: `NEXT_PUBLIC_RAZORPAY_PAYMENT_LINK=https://pages.razorpay.com/hire-genai-dev`

### Razorpay Subscription Plans
Create subscription plans in Razorpay Dashboard:
1. Go to Dashboard > Subscriptions > Plans
2. Create Monthly plan (e.g., ₹999/month)
3. Create Yearly plan (e.g., ₹9999/year)
4. Copy the plan IDs to your .env.local

## Implementation Notes

- `TRIAL_DAYS` affects trial expiry calculations across the entire application (server-side)
- `NEXT_PUBLIC_RAZORPAY_PAYMENT_LINK` is used in billing components and signup flow (client-side)
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are used for server-side API calls
- `RAZORPAY_WEBHOOK_SECRET` is used to verify webhook signatures
- `RAZORPAY_PLAN_ID_*` are used when creating subscriptions
- Both variables are dynamically loaded at runtime, no hardcoding
- Changes take effect immediately after server restart
- `NEXT_PUBLIC_` prefix is required for client-side environment variables in Next.js

## Files Updated

The following files now use these environment variables:

### Trial Period (`TRIAL_DAYS`)
- `app/api/billing/status/route.ts` - Trial period calculations
- `lib/database.ts` - Trial expiry logic

### Payment Link (`NEXT_PUBLIC_RAZORPAY_PAYMENT_LINK`)  
- `components/billing/SubscriptionCard.tsx` - Billing page payment button
- `app/(app)/signup/page.tsx` - Signup flow payment redirect

### Razorpay Subscriptions
- `app/api/razorpay/webhook/route.ts` - Webhook handler for subscription events
- `app/api/subscriptions/create/route.ts` - Create new subscriptions
- `app/api/subscriptions/status/route.ts` - Get subscription status
- `app/api/subscriptions/cancel/route.ts` - Cancel subscriptions
- `lib/database.ts` - Subscription database functions
