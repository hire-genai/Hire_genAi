-- Migration: Remove unused post_interview_screenshot columns
-- Date: 2026-02-14
-- Purpose: Clean up unused after-interview screenshot logic

-- Remove the index first
DROP INDEX IF EXISTS idx_applications_post_interview_screenshot;

-- Remove the columns
ALTER TABLE applications DROP COLUMN IF EXISTS post_interview_screenshot;
ALTER TABLE applications DROP COLUMN IF EXISTS post_interview_screenshot_captured_at;

-- Add a comment to track the change
COMMENT ON TABLE applications IS 'Updated 2026-02-14: Removed post_interview_screenshot columns - only using during_interview_screenshot and post_interview_photo_url for verification';
