-- Migration: Drop payment_transactions table
-- Reason: This table is no longer used. All payment tracking is now done via subscription_payments table.
-- Date: 2026-04-05

-- Drop indexes first
DROP INDEX IF EXISTS idx_payment_transactions_company_id;
DROP INDEX IF EXISTS idx_payment_transactions_provider;
DROP INDEX IF EXISTS idx_payment_transactions_status;
DROP INDEX IF EXISTS idx_payment_transactions_provider_payment_id;

-- Drop the table
DROP TABLE IF EXISTS payment_transactions;
