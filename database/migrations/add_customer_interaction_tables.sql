-- Migration: Add Customer Interaction Tables
-- Description: Adds meeting_bookings and email_templates tables, and updates contact_messages

-- Add missing columns to contact_messages
ALTER TABLE contact_messages 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS interaction_summary TEXT,
ADD COLUMN IF NOT EXISTS replied BOOLEAN DEFAULT FALSE;

-- Create meeting_bookings table
CREATE TABLE IF NOT EXISTS meeting_bookings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name         TEXT NOT NULL,
  work_email        TEXT NOT NULL,
  company_name      TEXT NOT NULL,
  phone_number      TEXT,
  meeting_date      DATE,
  meeting_time      TEXT,
  meeting_end_time  TEXT,
  duration_minutes  INT DEFAULT 30,
  timezone          TEXT DEFAULT 'India Standard Time',
  meeting_location  TEXT DEFAULT 'google-meet',
  meeting_link      TEXT,
  notes             TEXT,
  ip_address        TEXT,
  user_agent        TEXT,
  source            TEXT DEFAULT 'website',
  status            contact_message_status NOT NULL DEFAULT 'new_lead',
  admin_notes       TEXT,
  interaction_summary TEXT,
  confirmed_at      TIMESTAMPTZ,
  cancelled_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_meeting_bookings_status ON meeting_bookings (status);
CREATE INDEX IF NOT EXISTS idx_meeting_bookings_meeting_date ON meeting_bookings (meeting_date);
CREATE INDEX IF NOT EXISTS idx_meeting_bookings_work_email ON meeting_bookings (work_email);

-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  subject     TEXT NOT NULL,
  body        TEXT NOT NULL,
  category    TEXT DEFAULT 'general',
  is_default  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates (category);

-- Add triggers for updated_at
CREATE TRIGGER set_updated_at_contact_messages 
  BEFORE UPDATE ON contact_messages 
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_meeting_bookings 
  BEFORE UPDATE ON meeting_bookings 
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_email_templates 
  BEFORE UPDATE ON email_templates 
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
