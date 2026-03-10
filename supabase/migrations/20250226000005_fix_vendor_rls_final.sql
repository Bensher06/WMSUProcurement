-- ============================================================
-- FIX VENDOR RLS POLICIES - FINAL VERSION
-- This ensures suppliers can register without authentication
-- ============================================================

-- Drop ALL existing policies on vendors table to start fresh
DROP POLICY IF EXISTS "Allow all for authenticated" ON vendors;
DROP POLICY IF EXISTS "Allow public inserts for vendor registration" ON vendors;
DROP POLICY IF EXISTS "Allow authenticated inserts" ON vendors;
DROP POLICY IF EXISTS "Allow authenticated select" ON vendors;
DROP POLICY IF EXISTS "Allow authenticated update" ON vendors;
DROP POLICY IF EXISTS "Allow authenticated delete" ON vendors;
DROP POLICY IF EXISTS "Allow authenticated all operations" ON vendors;

-- CRITICAL: Allow anonymous users (anon role) to INSERT
-- This is what allows public registration without login
CREATE POLICY "anon_can_insert_vendors" ON vendors 
FOR INSERT 
TO anon
WITH CHECK (true);

-- Allow authenticated users to INSERT
CREATE POLICY "authenticated_can_insert_vendors" ON vendors 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to SELECT (read)
CREATE POLICY "authenticated_can_select_vendors" ON vendors 
FOR SELECT 
TO authenticated
USING (true);

-- Allow authenticated users to UPDATE
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

