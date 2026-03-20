# Razorpay Payment Integration - Setup Guide

## Issues Fixed ✅

1. **QR Code Scanning Issue** - Removed unnecessary QR scanning, enabled all payment methods (UPI, Cards, NetBanking, Wallets)
2. **Login Requirement** - Payment works without authentication, like Stripe
3. **Amount Display** - Fixed amount conversion (paise to rupees)
4. **Payment Flow** - Simplified checkout process with proper Razorpay configuration

## Environment Variables Required

Create a `.env.local` file in the root directory with:

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id

# PayPal Configuration (for international payments)
PAYPAL_CLIENT_ID=your_paypal_client_id
```

## Getting Razorpay Credentials

### For Testing (Test Mode):
1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Sign up or login
3. Navigate to **Settings** → **API Keys**
4. Click **Generate Test Key**
5. Copy both **Key ID** and **Key Secret**

### For Production (Live Mode):
1. Complete KYC verification on Razorpay
2. Activate your account
3. Generate **Live Keys** from Settings → API Keys
4. Use live keys in production environment

## Test Payment Credentials

### Razorpay Test Cards:
- **Card Number**: 4111 1111 1111 1111
- **CVV**: 123
- **Expiry**: Any future date (e.g., 12/25)
- **Name**: Any name

### Test UPI:
- **UPI ID**: success@razorpay
- This will simulate successful payment

### Test NetBanking:
- Select any bank
- Use credentials provided by Razorpay test mode

## How to Test

### Option 1: Payment Demo Page (Recommended)
```
http://localhost:3000/payment-demo
```
- No login required
- Test different amounts
- See payment success/failure immediately

### Option 2: Pricing Page
```
http://localhost:3000/pricing
```
- Click on any plan's "Choose" button
- Sign up (if needed)
- Go to billing section

### Option 3: Direct Billing Page
```
http://localhost:3000/admin-hiregenai/billing
```
- Requires authentication
- Full billing dashboard with payment

## Payment Flow

1. **Country Detection**: Automatically detects India vs International
   - India → Razorpay (INR)
   - International → PayPal (USD)

2. **Payment Methods Available**:
   - ✅ UPI (PhonePe, Google Pay, Paytm, etc.)
   - ✅ Credit/Debit Cards (Visa, Mastercard, RuPay, Amex)
   - ✅ Net Banking (All major banks)
   - ✅ Wallets (Paytm, Mobikwik, etc.)

3. **Amount Handling**:
   - Frontend: Amount in paise (10000 paise = ₹100)
   - Display: Converted to rupees (₹100)
   - Razorpay: Receives amount in paise

## Code Changes Made

### 1. PaymentCheckout Component (`components/billing/PaymentCheckout.tsx`)
- ✅ Enabled all payment methods (UPI, Card, NetBanking, Wallet)
- ✅ Removed authentication requirements
- ✅ Fixed amount display (paise → rupees)
- ✅ Improved Razorpay configuration
- ✅ Better error handling

### 2. Create Order API (`app/api/create-order/route.ts`)
- ✅ Fixed amount conversion (removed double multiplication)
- ✅ Proper error messages
- ✅ Better logging

### 3. Payment Demo Page (`app/(www)/payment-demo/page.tsx`)
- ✅ New standalone page for testing
- ✅ No login required
- ✅ Custom amount selection
- ✅ Test instructions included

## Troubleshooting

### Issue: "Payment configuration missing on server"
**Solution**: Check if environment variables are set correctly in `.env.local`

### Issue: "Unable to scan QR code"
**Solution**: Fixed! QR scanning is not needed. Use UPI apps directly or other payment methods.

### Issue: "Login required"
**Solution**: Fixed! Payment works without authentication on `/payment-demo` page.

### Issue: Wrong amount displayed
**Solution**: Fixed! Amount is now properly converted from paise to rupees.

### Issue: Payment methods not showing
**Solution**: All payment methods are now enabled in Razorpay configuration.

## Production Checklist

Before going live:

- [ ] Replace test keys with live Razorpay keys
- [ ] Complete Razorpay KYC verification
- [ ] Test with real payment methods
- [ ] Set up webhook for payment verification
- [ ] Implement payment success/failure handling in database
- [ ] Add proper error logging and monitoring
- [ ] Test refund flow
- [ ] Set up payment reconciliation

## Webhook Setup (Optional but Recommended)

Create webhook endpoint: `/api/razorpay/webhook`

```typescript
// app/api/razorpay/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('x-razorpay-signature')
  
  // Verify webhook signature
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex')
  
  if (signature === expectedSignature) {
    const event = JSON.parse(body)
    
    // Handle payment.captured, payment.failed, etc.
    console.log('Razorpay Event:', event.event)
    
    return NextResponse.json({ ok: true })
  }
  
  return NextResponse.json({ ok: false }, { status: 400 })
}
```

## Support

For issues or questions:
- Razorpay Docs: https://razorpay.com/docs/
- Razorpay Support: https://razorpay.com/support/
- Test Mode Guide: https://razorpay.com/docs/payments/payments/test-card-details/

## Summary

✅ Payment integration is now working like Stripe
✅ No login required for payment demo
✅ All payment methods enabled (UPI, Cards, NetBanking, Wallets)
✅ Proper amount handling and display
✅ Test page available at `/payment-demo`
✅ Ready for testing with Razorpay test credentials
