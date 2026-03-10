-- ============================================================
-- ADD STATUS FIELD TO VENDORS TABLE
-- Status: Pending, Qualified, Disqualified
-- ============================================================

-- Add status column to vendors table
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Qualified', 'Disqualified'));

-- Create index for status
CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors(status);

