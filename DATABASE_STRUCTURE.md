# Database Structure - Simplified Billing & Subscriptions

## 🎯 Simplified Schema (After Cleanup)

### Main Tables (3 total):

#### 1. `company_subscriptions` - PRIMARY TABLE
**Purpose**: Main subscription data for all companies
**Providers**: Razorpay, Stripe, PayPal
**Key Fields**:
- `company_id` - Company reference
- `provider` - razorpay, stripe, paypal
- `subscription_id` - Provider's subscription ID
- `subscription_link` - Razorpay short_url (for Manage Plan)
- `status` - active, pending, cancelled
- `plan_id` - Plan identifier
- `next_billing_time` - Next renewal date

#### 2. `subscription_payments` - PAYMENT HISTORY
**Purpose**: Individual payment transactions
**Key Fields**:
- `subscription_id` - Links to company_subscriptions
- `payment_id` - Provider's payment ID
- `amount`, `currency` - Payment details
- `status` - captured, failed, pending

#### 3. `payment_methods` - SAVED PAYMENT METHODS
**Purpose**: Saved cards/bank accounts (future use)
**Key Fields**:
- `company_id` - Company reference
- `method_type` - card, bank_account
- `last_four` - Last 4 digits
- `external_id` - Provider's token

## ❌ Removed Tables:
- `subscriptions` - Duplicate functionality, not used in code

## 🔄 Data Flow:
1. **Subscription Created** → `company_subscriptions` (main record)
2. **Payment Made** → `subscription_payments` (history)
3. **Manage Plan** → Uses `subscription_link` from `company_subscriptions`

## 📊 Relationships:
```
companies (1) → (1) company_subscriptions → (many) subscription_payments
companies (1) → (many) payment_methods
```

## 🚀 Benefits:
- ✅ Simple: Only 3 tables instead of 4+
- ✅ Clear: Each table has specific purpose
- ✅ Multi-provider: Supports Razorpay, Stripe, PayPal
- ✅ Future-ready: payment_methods for saved cards

## 🔧 Migration:
Run migrations in order:
1. `004_add_subscription_link.sql` - Add subscription_link column
2. `005_cleanup_unused_tables.sql` - Remove unused subscriptions table
