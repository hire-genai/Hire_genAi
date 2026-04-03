// Simple test to check trial expiry logic
const testTrialExpiry = () => {
  const TRIAL_DAYS = parseInt(process.env.TRIAL_DAYS || '7');
  
  // Simulate company created 2 days ago
  const companyCreatedAt = new Date();
  companyCreatedAt.setDate(companyCreatedAt.getDate() - 2); // 2 days ago
  
  const now = new Date();
  const msSinceCreation = now.getTime() - companyCreatedAt.getTime();
  const daysSinceCreation = Math.floor(msSinceCreation / (1000 * 60 * 60 * 24));
  
  const walletBalance = 0; // No balance
  const isExpired = daysSinceCreation >= TRIAL_DAYS && walletBalance <= 0;
  
  console.log('=== TRIAL EXPIRY TEST ===');
  console.log('TRIAL_DAYS:', TRIAL_DAYS);
  console.log('Company created:', companyCreatedAt.toISOString());
  console.log('Current time:', now.toISOString());
  console.log('Days since creation:', daysSinceCreation);
  console.log('Wallet balance:', walletBalance);
  console.log('Is trial expired?', isExpired);
  console.log('========================');
  
  return isExpired;
};

// Set TRIAL_DAYS=1 for test
process.env.TRIAL_DAYS = '1';
testTrialExpiry();
