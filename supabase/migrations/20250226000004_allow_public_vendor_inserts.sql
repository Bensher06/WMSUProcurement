-- ============================================================
-- ALLOW PUBLIC INSERTS TO VENDORS TABLE
-- This allows suppliers to register without authentication
-- ============================================================

-- First, drop any existing policies that might conflict
DROP POLICY IF EXISTS "Allow all for authenticated" ON vendors;
DROP POLICY IF EXISTS "Allow public inserts for vendor registration" ON vendors;
DROP POLICY IF EXISTS "Allow authenticated all operations" ON vendors;

-- Allow anonymous users (anon) to insert into vendors table
CREATE POLICY "Allow public inserts for vendor registration" ON vendors 
FOR INSERT 
TO anon
WITH CHECK (true);

-- Allow authenticated users to insert
CREATE POLICY "Allow authenticated inserts" ON vendors 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to read all vendors
CREATE POLICY "Allow authenticated select" ON vendors 
FOR SELECT 
TO authenticated
USING (true);

-- Allow authenticated users to update all vendors
CREATE POLICY "Allow authenticated update" ON vendors 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete all vendors
CREATE POLICY "Allow authenticated delete" ON vendors 
FOR DELETE 
TO authenticated
USING (true);
