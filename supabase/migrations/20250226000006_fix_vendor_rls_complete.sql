-- ============================================================
-- COMPLETE FIX FOR VENDOR RLS POLICIES
-- This ensures suppliers can register without authentication
-- ============================================================

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Allow all for authenticated" ON vendors;
DROP POLICY IF EXISTS "Allow public inserts for vendor registration" ON vendors;
DROP POLICY IF EXISTS "Allow authenticated inserts" ON vendors;
DROP POLICY IF EXISTS "Allow authenticated select" ON vendors;
DROP POLICY IF EXISTS "Allow authenticated update" ON vendors;
DROP POLICY IF EXISTS "Allow authenticated delete" ON vendors;
DROP POLICY IF EXISTS "Allow authenticated all operations" ON vendors;
DROP POLICY IF EXISTS "Admin can manage vendors" ON vendors;
DROP POLICY IF EXISTS "Authenticated users can view vendors" ON vendors;
DROP POLICY IF EXISTS "anon_can_insert_vendors" ON vendors;
DROP POLICY IF EXISTS "authenticated_can_insert_vendors" ON vendors;
DROP POLICY IF EXISTS "authenticated_can_select_vendors" ON vendors;
DROP POLICY IF EXISTS "authenticated_can_update_vendors" ON vendors;
DROP POLICY IF EXISTS "authenticated_can_delete_vendors" ON vendors;

-- CRITICAL: Allow anonymous users (anon role) to INSERT
-- This MUST be present for public registration to work
CREATE POLICY "anon_can_insert_vendors" ON vendors 
FOR INSERT 
TO anon
WITH CHECK (true);

-- Allow authenticated users to INSERT
CREATE POLICY "authenticated_can_insert_vendors" ON vendors 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to SELECT (read/view)
CREATE POLICY "authenticated_can_select_vendors" ON vendors 
FOR SELECT 
TO authenticated
USING (true);

-- Allow authenticated users to UPDATE (only status for qualify/disqualify)
CREATE POLICY "authenticated_can_update_vendors" ON vendors 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to DELETE
CREATE POLICY "authenticated_can_delete_vendors" ON vendors 
FOR DELETE 
TO authenticated
USING (true);

