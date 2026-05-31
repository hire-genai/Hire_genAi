# Auto-Recharge Plan Sync Feature

## Overview
The auto-recharge amount now automatically matches the user's active subscription plan price. When a user has an active subscription (Razorpay or Stripe), the auto-recharge system uses the plan's price instead of a manually configured amount.

**Example:**
- User subscribes to `starter_monthly` ($99) → Auto-recharge amount = $99
- User subscribes to `pro_plan` ($199) → Auto-recharge amount = $199
- When wallet balance < $10 → Auto-recharge triggers with the plan amount

---

## Changes Made

### 1. Database Schema
**File:** `database/schema.sql`  
**Change:** Added `plan_amount NUMERIC(12,2)` column to `company_subscriptions` table

```sql
ALTER TABLE company_subscriptions
ADD COLUMN plan_amount NUMERIC(12,2);
```

**Migration:** `database/migrations/021_add_plan_amount_to_subscriptions.sql`

### 2. Payment Webhooks

#### Razorpay Webhook
**File:** `app/api/razorpay/webhook/route.ts`

- Extracts plan amount from webhook payload:
  ```javascript
  const planAmount = subscription.plan?.item?.amount ? subscription.plan.item.amount / 100 : null
  ```
- Stores in database via `upsertSubscription()` with `planAmount` parameter

#### Stripe Webhook
**File:** `stripe/stripeController.ts`

- Extracts plan amount from subscription items:
  ```javascript
  const priceAmount = subscription.items.data[0]?.price?.unit_amount ? subscription.items.data[0].price.unit_amount / 100 : null
  ```
- Stores in database via `upsertSubscription()` with `planAmount` parameter

### 3. Database Service
**File:** `lib/database.ts`

Updated `upsertSubscription()` method:
- Accepts `planAmount?: number | null` parameter
- Stores and updates `plan_amount` in the database
- Handles both INSERT and UPDATE operations

```typescript
static async upsertSubscription(data: {
  companyId: string
  provider: string
  subscriptionId: string
  planId?: string
  planName?: string
  planAmount?: number | null  // ← New parameter
  status: string
  // ... other fields
})
```

### 4. Auto-Recharge Settings API
**File:** `app/api/billing/auto-recharge-settings/route.ts`

#### GET Endpoint
- Fetches both billing settings and active subscription plan amount
- Returns `planAmount` in response alongside other settings
- Example response:
  ```json
  {
    "ok": true,
    "settings": {
      "auto_recharge_enabled": true,
      "auto_recharge_amount": 99.00,
      "auto_recharge_threshold": 10.00,
      "planAmount": 99.00
    }
  }
  ```

#### POST Endpoint
- When enabling auto-recharge without a custom amount, uses plan amount
- Falls back to configured amount if no active plan exists
- Automatically populates `auto_recharge_amount` with `plan_amount` when available

### 5. Auto-Recharge Trigger Logic
**File:** `lib/auto-recharge.ts`

Updated `checkAndAutoRecharge()` function:
- Fetches `plan_amount` from active subscription
- Uses plan amount if available: `const autoRechargeAmount = planAmount || parseFloat(billing.auto_recharge_amount) || 2`
- Falls back to configured amount if no subscription

```typescript
// Before (manual amount only)
const autoRechargeAmount = parseFloat(billing.auto_recharge_amount) || 2

// After (plan-aware)
const planAmount = billing.plan_amount ? parseFloat(billing.plan_amount) : null
const autoRechargeAmount = planAmount || parseFloat(billing.auto_recharge_amount) || 2
```

### 6. Frontend UI
**File:** `components/billing/AutoRechargeSettings.tsx`

Complete redesign with:

#### Visual Improvements
- Better color scheme (emerald for active, gray for disabled)
- Icon-based status indicators
- Active/Inactive state visualization
- Gradient backgrounds for plan amount display

#### Plan Amount Display
- Shows "Active Plan Amount" badge when subscription is linked
- Displays amount prominently (e.g., "₹99.00")
- Shows "Linked" badge indicating synchronization

#### Input Controls
- Recharge amount input is **read-only** (disabled) when plan amount exists
- Shows "Synced" badge on the input field
- Threshold input remains editable
- Currency symbols (₹) in input fields

#### Enhanced Help Text
- Clearer descriptions of each field
- Status-aware help messages
- Visual indicators for synced vs. manual amounts

#### How It Works Section
- Step-by-step explanation of the auto-recharge process
- Shows the actual amounts being used
- Indicates when amount is from plan vs. manually set

#### Disabled State
- When auto-recharge is disabled, shows a call-to-action to enable
- Explains the benefit of auto-recharge
- Easy one-click enable button

---

## Data Flow

```
User subscribes to plan
  ↓
Razorpay/Stripe webhook event received
  ↓
Webhook extracts plan.item.amount (Razorpay) or price.unit_amount (Stripe)
  ↓
Converts to proper currency (divide by 100 for both)
  ↓
Stores in company_subscriptions.plan_amount
  ↓
User opens settings → GET /api/billing/auto-recharge-settings
  ↓
API fetches plan_amount from active subscription
  ↓
Returns planAmount in response
  ↓
Frontend displays plan amount, disables amount input
  ↓
When wallet balance < threshold
  ↓
checkAndAutoRecharge() fetches plan_amount from DB
  ↓
Uses plan amount for auto-recharge charge
  ↓
Stripe/Razorpay charges the plan amount to subscription payment method
```

---

## Backwards Compatibility

The feature is **fully backwards compatible**:

1. **No Plan:** If user has no active subscription, auto-recharge uses the manually configured amount
2. **Existing Settings:** Users can still manually set a custom amount (if no plan is active)
3. **Plan Changes:** When subscription plan changes, auto-recharge amount automatically updates
4. **Graceful Degradation:** If `plan_amount` is NULL, falls back to configured amount

---

## Testing Scenarios

### Scenario 1: New User with Subscription
1. User signs up and purchases `starter_monthly` plan ($99)
2. Razorpay/Stripe webhook stores `plan_amount = 99`
3. User enables auto-recharge in settings
4. Frontend shows "Active Plan Amount: ₹99"
5. Recharge amount input is disabled
6. When wallet < $10, auto-recharge triggers with $99

### Scenario 2: User Without Subscription
1. User has no active subscription
2. User enables auto-recharge
3. Frontend shows no plan amount badge
4. User can manually set recharge amount (e.g., $50)
5. When wallet < threshold, auto-recharge triggers with $50

### Scenario 3: Subscription Upgrade
1. User has `starter_monthly` ($99), plan_amount = 99
2. User upgrades to `pro_plan` ($199)
3. Stripe/Razorpay webhook updates `plan_amount = 199`
4. Frontend automatically shows new amount (₹199)
5. Next auto-recharge uses $199

### Scenario 4: Subscription Cancellation
1. User cancels subscription
2. `plan_amount` remains in DB but subscription status changes
3. Frontend no longer shows plan amount
4. Auto-recharge uses fallback configured amount (or disabled if not set)

---

## Database Queries

### Check if plan amount is stored
```sql
SELECT company_id, plan_name, plan_amount, status
FROM company_subscriptions
WHERE plan_amount IS NOT NULL;
```

### View auto-recharge settings with plan amount
```sql
SELECT 
  cb.auto_recharge_enabled,
  cb.auto_recharge_amount,
  cb.auto_recharge_threshold,
  cs.plan_amount,
  cs.plan_name
FROM company_billing cb
LEFT JOIN company_subscriptions cs ON cb.company_id = cs.company_id AND cs.status IN ('active', 'past_due')
WHERE cb.company_id = 'company-uuid';
```

---

## Files Modified

1. `database/schema.sql` - Added plan_amount column
2. `database/migrations/021_add_plan_amount_to_subscriptions.sql` - Migration file
3. `app/api/razorpay/webhook/route.ts` - Extract Razorpay plan amount
4. `stripe/stripeController.ts` - Extract Stripe plan amount
5. `lib/database.ts` - Update upsertSubscription() function
6. `app/api/billing/auto-recharge-settings/route.ts` - GET/POST endpoints
7. `lib/auto-recharge.ts` - Use plan amount in trigger logic
8. `components/billing/AutoRechargeSettings.tsx` - Enhanced UI

---

## Environment Variables

No new environment variables required. Uses existing:
- `RAZORPAY_WEBHOOK_SECRET` - Razorpay webhook verification
- `STRIPE_SECRET_KEY` - Stripe API access

---

## Migration Steps

1. Run database migration:
   ```bash
   psql $DATABASE_URL -f database/migrations/021_add_plan_amount_to_subscriptions.sql
   ```

2. Deploy new code with all changes

3. No manual data migration needed - plan amounts will be populated on next webhook event

4. Users will see plan amount in settings after their next subscription event (or can trigger by updating subscription)

---

## Monitoring

### Logs to watch for
```
[Auto-Recharge] Settings for company {id}: enabled=true, amount={amount} (plan={planAmount}), threshold={threshold}
[Razorpay Webhook] Subscription: {id}, Status: {status}, Plan: {planId}, Amount: ₹{planAmount}
[Stripe] Subscription event: {eventType} — id: {id}, status: {status}
```

### Metrics to track
- Number of auto-recharges triggered with plan amount
- Average auto-recharge amount per plan type
- Fallback usage (when no plan_amount available)
- Failed auto-recharges

---

## Future Enhancements

1. **Custom Plan Amounts:** Allow users to set a different amount than their plan price
2. **Multiple Auto-Recharge Tiers:** Different amounts based on plan tier
3. **Auto-Recharge History:** Show when plan amount was last updated
4. **Plan Change Notifications:** Notify users when plan amount changes
5. **Smart Thresholds:** Automatically set threshold based on plan amount

---

## Support

For issues or questions, check:
- `lib/auto-recharge.ts` - Core recharge logic
- `app/api/billing/auto-recharge-settings/route.ts` - API endpoints
- `components/billing/AutoRechargeSettings.tsx` - Frontend UI
- Database logs for webhook processing
