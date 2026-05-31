# Auto-Recharge Plan Sync - Changelog

## Changes Summary

### 🎯 Main Goal
Auto-recharge amount now automatically syncs with the user's active subscription plan price.

**Example:**
- User has "Starter Monthly" ($99) → Auto-recharge = ₹99
- User upgrades to "Pro Plan" ($199) → Auto-recharge = ₹199
- No manual configuration needed

---

## Updated Files

### 1. Database Schema
**File:** `database/schema.sql`
```sql
ALTER TABLE company_subscriptions
ADD COLUMN plan_amount NUMERIC(12,2);
```

### 2. Database Migration
**File:** `database/migrations/021_add_plan_amount_to_subscriptions.sql`
- Creates new column `plan_amount` in `company_subscriptions`
- Adds comment and index for performance

### 3. Razorpay Webhook
**File:** `app/api/razorpay/webhook/route.ts`
```javascript
// Extract plan amount from webhook
const planAmount = subscription.plan?.item?.amount ? subscription.plan.item.amount / 100 : null

// Pass to upsertSubscription
await DatabaseService.upsertSubscription({
  ...
  planAmount,
  ...
})
```

### 4. Stripe Webhook  
**File:** `stripe/stripeController.ts`
```javascript
// Extract plan amount from subscription items
const priceAmount = subscription.items.data[0]?.price?.unit_amount ? 
  subscription.items.data[0].price.unit_amount / 100 : null

// Pass to upsertSubscription
await DatabaseService.upsertSubscription({
  ...
  planAmount: priceAmount || undefined,
  ...
})
```

### 5. Database Service
**File:** `lib/database.ts`
```typescript
static async upsertSubscription(data: {
  // ... other fields
  planAmount?: number | null  // NEW
})
```

### 6. Auto-Recharge Settings API
**File:** `app/api/billing/auto-recharge-settings/route.ts`

**GET Endpoint:**
- Fetches `plan_amount` and `plan_name` from active subscription
- Returns both in response
```json
{
  "ok": true,
  "settings": {
    "auto_recharge_enabled": true,
    "auto_recharge_amount": 99,
    "auto_recharge_threshold": 10,
    "planAmount": 99,
    "planName": "Starter Monthly"
  }
}
```

**POST Endpoint:**
- Fetches current plan amount and name
- Auto-uses plan amount if enabled and no custom amount provided

### 7. Auto-Recharge Trigger Logic
**File:** `lib/auto-recharge.ts`
```typescript
// Fetch plan_amount from active subscription
const planAmount = billing.plan_amount ? parseFloat(billing.plan_amount) : null

// Use plan amount if available, else fallback
const autoRechargeAmount = planAmount || parseFloat(billing.auto_recharge_amount) || 2
```

### 8. Frontend Component (Major UI Overhaul)
**File:** `components/billing/AutoRechargeSettings.tsx`

#### Interface Update
```typescript
interface AutoRechargeSettings {
  auto_recharge_enabled: boolean
  auto_recharge_amount: number
  auto_recharge_threshold: number
  planAmount?: number | null
  planName?: string | null  // NEW
}
```

#### UI Redesign
1. **Plan Information Card**
   - Shows plan name: "Starter Monthly"
   - Shows recharge amount: "₹99.00"
   - Animated "SYNCED" badge with pulsing indicator
   - Context note: "(matches your plan)"

2. **Amount Display (With Plan)**
   - Shows as read-only synced amount
   - Large, bold display (₹99.00)
   - Linked badge showing plan name
   - Checkmark icon for sync confirmation

3. **Amount Input (No Plan)**
   - Shows editable input field
   - Minimum ₹2000 validation
   - Help text for manual configuration

4. **Threshold Input**
   - Always editable
   - Shows current trigger threshold
   - Clear label and help text

5. **How It Works Section**
   - Step-by-step explanation
   - Shows actual amounts being used
   - Mentions plan-based sync

#### Visual Improvements
- Better color scheme (emerald for active)
- Animated sync indicator
- Clear visual hierarchy
- Responsive layout (1 col mobile, 2 col desktop)
- Professional gradient backgrounds
- Status badges and icons

---

## Behavior Changes

### Before
❌ Auto-recharge amount was manually configured
❌ No link to subscription plan price
❌ Amount could mismatch plan
❌ Users had to remember plan price

### After
✅ Amount automatically syncs to plan price
✅ Shows plan name prominently
✅ Read-only when linked to plan
✅ Updates when plan changes
✅ Fallback to manual amount if no plan
✅ Beautiful UI with clear sync status

---

## Data Flow

```
1. User subscribes to plan
   ↓
2. Razorpay/Stripe webhook event received
   ↓
3. Extract: plan_name="Starter Monthly", plan_amount=99
   ↓
4. Store in company_subscriptions table
   ↓
5. User enables auto-recharge
   ↓
6. Frontend fetches via GET /api/billing/auto-recharge-settings
   ↓
7. API returns: planName, planAmount
   ↓
8. Frontend displays: "YOUR PLAN: Starter Monthly"
                      "AUTO-RECHARGE AMOUNT: ₹99"
   ↓
9. Amount input disabled, shows as synced
   ↓
10. When wallet < threshold
    ↓
11. auto-recharge.ts uses plan_amount (₹99)
    ↓
12. Triggers recharge with plan amount
```

---

## Database Changes

### New Column
```sql
plan_amount NUMERIC(12,2)
```
- Stores subscription plan price
- Can be NULL (for backward compatibility)
- Indexed for performance

### Migration
Run before deployment:
```bash
psql $DATABASE_URL -f database/migrations/021_add_plan_amount_to_subscriptions.sql
```

---

## Backwards Compatibility

✅ **Fully backward compatible:**
- Existing subscriptions without plan_amount continue to work
- Auto-recharge falls back to configured amount if plan_amount is NULL
- No breaking changes to APIs
- Graceful degradation if plan_amount is missing

---

## Testing Checklist

- [ ] Create subscription with Razorpay → plan_amount stored
- [ ] Create subscription with Stripe → plan_amount stored
- [ ] Open settings → plan name and amount displayed
- [ ] Amount input shows as synced/read-only
- [ ] Upgrade plan → amount updates automatically
- [ ] Trigger auto-recharge → uses plan amount
- [ ] User without plan → shows editable amount input
- [ ] Manual amount → works as fallback

---

## Monitoring

### Logs to watch
```
[Auto-Recharge] Settings for company {id}: enabled=true, amount={amount} (plan={planAmount})
[Razorpay Webhook] Subscription: {id}, Amount: ₹{planAmount}
[Stripe] Plan Amount: {priceAmount}
```

### Metrics
- Number of synced auto-recharges
- Plan amount vs. configured amount usage
- Fallback usage rate

---

## Configuration

No new environment variables needed.

Uses existing:
- `RAZORPAY_WEBHOOK_SECRET`
- `STRIPE_SECRET_KEY`

---

## Rollback Plan

If issues occur:
1. Revert UI changes: `components/billing/AutoRechargeSettings.tsx`
2. Remove plan_amount from API responses
3. Set `planAmount` to NULL in database (or delete column)
4. Auto-recharge falls back to configured amount

---

## Future Enhancements

1. **Override Option:** Allow users to set custom amount even with plan
2. **Plan Change History:** Track when plan amount changes
3. **Smart Thresholds:** Auto-calculate threshold based on plan amount
4. **Multiple Plans:** Support different amounts for different plans
5. **Analytics:** Track plan-based recharges separately

---

## Support

For questions or issues:
- Check `lib/auto-recharge.ts` for logic
- Check `app/api/billing/auto-recharge-settings/route.ts` for API
- Check `components/billing/AutoRechargeSettings.tsx` for UI
- Monitor webhook logs for plan amount extraction
