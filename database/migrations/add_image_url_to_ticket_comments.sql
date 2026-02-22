-- Add image_url column to ticket_comments table for image attachments
ALTER TABLE ticket_comments 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add comment to describe the column
COMMENT ON COLUMN ticket_comments.image_url IS 'URL of image attachment uploaded to Vercel Blob storage';
