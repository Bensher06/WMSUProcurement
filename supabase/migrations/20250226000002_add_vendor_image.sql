-- ============================================================
-- ADD IMAGE FIELD TO VENDORS TABLE
-- ============================================================

-- Add image_url column to vendors table
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create index for image_url if needed
CREATE INDEX IF NOT EXISTS idx_vendors_image_url ON vendors(image_url) WHERE image_url IS NOT NULL;

