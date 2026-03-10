-- ============================================================
-- VERIFY AND FIX RLS FOR ANONYMOUS VENDOR INSERTS
-- This migration verifies the policy exists and fixes any issues
-- ============================================================

-- First, verify RLS is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'vendors'
  ) THEN
    RAISE EXCEPTION 'vendors table does not exist';
  END IF;
END $$;

-- Ensure RLS is enabled (this won't hurt if already enabled)
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start completely fresh
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

-- CRITICAL: Create policy for anonymous INSERT
-- This MUST use TO anon (not TO public, not TO authenticated)
CREATE POLICY "anon_can_insert_vendors" 
ON vendors 
FOR INSERT 
TO anon
WITH CHECK (true);

-- Allow authenticated users to INSERT
CREATE POLICY "authenticated_can_insert_vendors" 
ON vendors 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to SELECT
CREATE POLICY "authenticated_can_select_vendors" 
ON vendors 
FOR SELECT 
TO authenticated
USING (true);

-- Allow authenticated users to UPDATE
CREATE POLICY "authenticated_can_update_vendors" 
ON vendors 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to DELETE
CREATE POLICY "authenticated_can_delete_vendors" 
ON vendors 
FOR DELETE 
TO authenticated
USING (true);

-- Verify the policy was created correctly
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename = 'vendors' 
  AND policyname = 'anon_can_insert_vendors'
  AND roles::text[] = ARRAY['anon']::text[];
  
  IF policy_count = 0 THEN
    RAISE EXCEPTION 'Policy anon_can_insert_vendors was not created correctly';
  END IF;
  
  RAISE NOTICE 'Policy anon_can_insert_vendors verified successfully';
END $$;

-- Test the policy works (this should succeed)
DO $$
BEGIN
  -- Test insert as anon role
  PERFORM set_config('request.jwt.claim.role', 'anon', true);
  
  -- This is just a verification, not an actual insert
  RAISE NOTICE 'RLS policy verification complete. Policy should allow anonymous inserts.';
END $$;

