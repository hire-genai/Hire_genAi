-- Migration: Create auto_recharge_transactions table
-- Purpose: Separate auto-recharge transactions from subscription_payments for better organization

-- Create auto_recharge_transactions table
CREATE TABLE auto_recharge_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Razorpay transaction details
    payment_id VARCHAR(255) UNIQUE NOT NULL,
    order_id VARCHAR(255) NOT NULL,
    customer_id VARCHAR(255) NOT NULL,
    token_id VARCHAR(255) NOT NULL,
    
    -- Transaction amounts
    amount DECIMAL(10,2) NOT NULL, -- Amount in INR
    amount_paise INTEGER NOT NULL, -- Amount in paise (for Razorpay)
    currency VARCHAR(3) DEFAULT 'INR',
    
    -- Transaction status
    status VARCHAR(50) NOT NULL DEFAULT 'created', -- created, authorized, captured, failed, refunded
    method VARCHAR(50), -- card, netbanking, wallet, upi
    
    -- Customer details
    email VARCHAR(255),
    contact VARCHAR(20),
    
    -- Payment details
    card_last4 VARCHAR(4),
    card_network VARCHAR(50),
    card_type VARCHAR(50),
    
    -- Error details (if failed)
    error_code VARCHAR(100),
    error_description TEXT,
    error_reason VARCHAR(255),
    
    -- Wallet balance tracking
    wallet_balance_before DECIMAL(10,2),
    wallet_balance_after DECIMAL(10,2),
    
    -- Raw Razorpay response data
    raw_data JSONB,
    
    -- Metadata
    notes JSONB,
    description TEXT DEFAULT 'Wallet Auto Recharge',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    razorpay_created_at TIMESTAMP WITH TIME ZONE,
    
    -- Indexes for performance
    CONSTRAINT auto_recharge_transactions_amount_positive CHECK (amount > 0),
    CONSTRAINT auto_recharge_transactions_amount_paise_positive CHECK (amount_paise > 0)
);

-- Create indexes for better query performance
CREATE INDEX idx_auto_recharge_transactions_company_id ON auto_recharge_transactions(company_id);
CREATE INDEX idx_auto_recharge_transactions_payment_id ON auto_recharge_transactions(payment_id);
CREATE INDEX idx_auto_recharge_transactions_status ON auto_recharge_transactions(status);
CREATE INDEX idx_auto_recharge_transactions_created_at ON auto_recharge_transactions(created_at);
CREATE INDEX idx_auto_recharge_transactions_order_id ON auto_recharge_transactions(order_id);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_auto_recharge_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_recharge_transactions_updated_at
    BEFORE UPDATE ON auto_recharge_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_auto_recharge_transactions_updated_at();

-- Add comments for documentation
COMMENT ON TABLE auto_recharge_transactions IS 'Stores auto-recharge transaction details separate from subscription payments';
COMMENT ON COLUMN auto_recharge_transactions.payment_id IS 'Unique Razorpay payment ID';
COMMENT ON COLUMN auto_recharge_transactions.order_id IS 'Razorpay order ID for this transaction';
COMMENT ON COLUMN auto_recharge_transactions.amount IS 'Transaction amount in INR (decimal)';
COMMENT ON COLUMN auto_recharge_transactions.amount_paise IS 'Transaction amount in paise (integer for Razorpay)';
COMMENT ON COLUMN auto_recharge_transactions.raw_data IS 'Complete Razorpay webhook/API response data';
COMMENT ON COLUMN auto_recharge_transactions.wallet_balance_before IS 'Wallet balance before this auto-recharge';
COMMENT ON COLUMN auto_recharge_transactions.wallet_balance_after IS 'Wallet balance after this auto-recharge (if successful)';
