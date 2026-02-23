-- Migration: Add missing columns to talent_pool_entries if they don't exist
-- Run this on your Neon database

-- Add notes column if missing
ALTER TABLE talent_pool_entries ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add source column if missing  
ALTER TABLE talent_pool_entries ADD COLUMN IF NOT EXISTS source TEXT;

-- Add application_id column to link talent pool entry to original application
ALTER TABLE talent_pool_entries ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES applications(id) ON DELETE SET NULL;

-- Create index for application_id lookup
CREATE INDEX IF NOT EXISTS idx_talent_pool_application_id ON talent_pool_entries (application_id);
