const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'hire_genai',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function checkSubscriptions() {
  try {
    const query = `
      SELECT 
        company_id,
        subscription_id,
        customer_id,
        token_id,
        status,
        provider,
        created_at,
        updated_at
      FROM company_subscriptions 
      WHERE status = 'active'
      LIMIT 5;
    `;
    
    const result = await pool.query(query);
    
    console.log('\n=== ACTIVE SUBSCRIPTIONS ===\n');
    console.log(`Total rows: ${result.rows.length}\n`);
    
    result.rows.forEach((row, idx) => {
      console.log(`Row ${idx + 1}:`);
      console.log(`  company_id: ${row.company_id}`);
      console.log(`  subscription_id: ${row.subscription_id}`);
      console.log(`  customer_id: ${row.customer_id}`);
      console.log(`  token_id: ${row.token_id}`);
      console.log(`  status: ${row.status}`);
      console.log(`  provider: ${row.provider}`);
      console.log(`  created_at: ${row.created_at}`);
      console.log(`  updated_at: ${row.updated_at}`);
      console.log('');
    });
    
    if (result.rows.length === 0) {
      console.log('No active subscriptions found in database.');
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkSubscriptions();
