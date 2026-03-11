-- Migration: Update contact_message_status enum
-- This fixes the enum to include the correct status values

-- Step 1: Drop columns that reference the enum
ALTER TABLE contact_messages DROP COLUMN IF EXISTS status;
ALTER TABLE meeting_bookings DROP COLUMN IF EXISTS status;

-- Step 2: Drop the old enum
DROP TYPE contact_message_status;

-- Step 3: Create the new enum with correct values
CREATE TYPE contact_message_status AS ENUM ('new_lead', 'active_prospect', 'inactive_prospect', 'converted_to_customer', 'archived', 'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show', 'rescheduled');

-- Step 4: Add columns back with the new enum type
ALTER TABLE contact_messages ADD COLUMN status contact_message_status NOT NULL DEFAULT 'new_lead';
ALTER TABLE meeting_bookings ADD COLUMN status contact_message_status NOT NULL DEFAULT 'new_lead';

-- Step 5: Update any existing data that might have old enum values
-- This is a safety measure - update any records that might have old status values
UPDATE contact_messages SET status = 'new_lead' WHERE status NOT IN ('new_lead', 'active_prospect', 'inactive_prospect', 'converted_to_customer', 'archived', 'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show', 'rescheduled');
UPDATE meeting_bookings SET status = 'new_lead' WHERE status NOT IN ('new_lead', 'active_prospect', 'inactive_prospect', 'converted_to_customer', 'archived', 'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show', 'rescheduled');
