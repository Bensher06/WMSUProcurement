-- ============================================================
-- CREATE SUPPLIERS TABLE
-- This table stores supplier registration data
-- ============================================================

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  contact_number TEXT,
  email TEXT,
  address TEXT,
  category TEXT,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Qualified', 'Disqualified')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_email ON suppliers(email);
CREATE INDEX IF NOT EXISTS idx_suppliers_category ON suppliers(category);

-- Enable RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT INSERT ON suppliers TO anon;
GRANT SELECT ON suppliers TO authenticated;
GRANT UPDATE ON suppliers TO authenticated;
GRANT DELETE ON suppliers TO authenticated;

-- Create RLS policies

-- Allow anonymous users to INSERT (for registration)
CREATE POLICY "anon_can_insert_suppliers" 
ON suppliers 
FOR INSERT 
TO anon
WITH CHECK (true);

-- Allow authenticated users to INSERT
CREATE POLICY "authenticated_can_insert_suppliers" 
ON suppliers 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to SELECT (read/view)
CREATE POLICY "authenticated_can_select_suppliers" 
ON suppliers 
FOR SELECT 
TO authenticated
USING (true);

-- Allow authenticated users to UPDATE
CREATE POLICY "authenticated_can_update_suppliers" 
ON suppliers 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to DELETE
CREATE POLICY "authenticated_can_delete_suppliers" 
ON suppliers 
FOR DELETE 
TO authenticated
USING (true);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_suppliers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_suppliers_updated_at();

