/**
 * Migration script to add missing columns to video_interview_usage table
 * Run this with: node scripts/migrate-video-usage.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔄 Starting migration for video_interview_usage table...\n');

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '../database/migrations/add_video_interview_usage_columns.sql'),
      'utf8'
    );

    console.log('📝 Executing migration SQL...');
    await pool.query(migrationSQL);

    console.log('✅ Migration completed successfully!\n');
    console.log('Added columns:');
    console.log('  - interview_id (UUID)');
    console.log('  - candidate_id (UUID)');
    console.log('  - video_quality (TEXT)');
    console.log('  - completed_questions (INTEGER)');
    console.log('  - total_questions (INTEGER)');
    console.log('  - minute_price (NUMERIC)');
    console.log('  - openai_base_cost (NUMERIC)');
    console.log('  - pricing_source (TEXT)');
    console.log('  - tokens_used (INTEGER)');
    console.log('  - profit_margin_percent (NUMERIC)');
    console.log('\n✅ duration_seconds is now nullable');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
