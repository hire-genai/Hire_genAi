-- Migration: Replace contact_messages with contact_leads table
-- Date: 2025-03-07
-- Purpose: Update contact form structure to match new form fields

-- Drop old contact_messages table
DROP TABLE IF EXISTS contact_messages CASCADE;

-- Drop the old enum if it exists
DROP TYPE IF EXISTS contact_message_status CASCADE;

-- Create new contact_leads table
CREATE TABLE IF NOT EXISTS contact_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255) NOT NULL,
  mobile VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  company_size VARCHAR(50) NOT NULL,
  industry VARCHAR(100) NOT NULL,
  tools TEXT[],
  pain_points TEXT,
  budget VARCHAR(100),
  timeline VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_contact_leads_email ON contact_leads(email);
CREATE INDEX idx_contact_leads_company_name ON contact_leads(company_name);
CREATE INDEX idx_contact_leads_created_at ON contact_leads(created_at);

-- Add comments
COMMENT ON TABLE contact_leads IS 'Stores contact form submissions from the new contact page with detailed company information';
