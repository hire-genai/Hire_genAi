-- Set wallet balance to 50 to trigger auto-recharge
-- Replace YOUR_COMPANY_ID with actual UUID

UPDATE company_billing 
SET wallet_balance = 50,
    updated_at = NOW()
WHERE company_id = 'YOUR_COMPANY_ID_HERE';

-- Verify the update
SELECT 
  wallet_balance,
  auto_recharge_enabled,
  auto_recharge_amount,
  auto_recharge_threshold,
  CASE WHEN wallet_balance < auto_recharge_threshold 
       THEN 'TRIGGER AUTO-RECHARGE' 
       ELSE 'NO TRIGGER' 
  END as status
FROM company_billing 
WHERE company_id = 'YOUR_COMPANY_ID_HERE';
