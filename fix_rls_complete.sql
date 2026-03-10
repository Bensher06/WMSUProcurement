-- ============================================================
-- COMPLETE FIX FOR RLS - Run this ENTIRE script in Supabase SQL Editor
-- This ensures the anon role can insert into vendors table
-- ============================================================

-- Step 1: Ensure RLS is enabled
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- Step 2: Grant INSERT permission to anon role (this is critical!)
GRANT INSERT ON vendors TO anon;
GRANT SELECT ON vendors TO authenticated;
GRANT UPDATE ON vendors TO authenticated;
GRANT DELETE ON vendors TO authenticated;

-- Step 3: Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Allow all for authenticated" ON vendors;
DROP POLICY IF EXISTS "Allow public inserts for vendor registration" ON vendors;
DROP POLICY IF EXISTS "anon_can_insert_vendors" ON vendors;
DROP POLICY IF EXISTS "authenticated_can_insert_vendors" ON vendors;
DROP POLICY IF EXISTS "authenticated_can_select_vendors" ON vendors;
DROP POLICY IF EXISTS "authenticated_can_update_vendors" ON vendors;
DROP POLICY IF EXISTS "authenticated_can_delete_vendors" ON vendors;

-- Step 4: Create policy for anonymous INSERT (this is what allows public registration)
CREATE POLICY "anon_can_insert_vendors" 
ON vendors 
FOR INSERT 
TO anon
WITH CHECK (true);

-- Step 5: Create policies for authenticated users
CREATE POLICY "authenticated_can_insert_vendors" 
ON vendors 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "authenticated_can_select_vendors" 
ON vendors 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "authenticated_can_update_vendors" 
ON vendors 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "authenticated_can_delete_vendors" 
ON vendors 
FOR DELETE 
TO authenticated
USING (true);

-- Step 6: Verify the policy exists
SELECT 
  policyname,
  roles,
  cmd,
  with_check
FROM pg_policies 
WHERE tablename = 'vendors' 
AND policyname = 'anon_can_insert_vendors';

-- Step 7: Test insert as anon role (should work now)
DO $$
DECLARE
  test_id UUID;
BEGIN
  -- Set role to anon (simulating PostgREST behavior)
  SET LOCAL ROLE anon;
  
  -- Try to insert
  INSERT INTO vendors (name, contact_person, email)
  VALUES ('RLS Test Final', 'Test Person', 'test@final.com')
  RETURNING id INTO test_id;
  
  RAISE NOTICE '✅ SUCCESS! Insert worked. Test ID: %', test_id;
  
  -- Clean up
  DELETE FROM vendors WHERE id = test_id;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ FAILED: %', SQLERRM;
  RAISE NOTICE 'Error Code: %', SQLSTATE;
END $$;

-- Step 8: Verify grants
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'vendors'
AND grantee IN ('anon', 'authenticated')
ORDER BY grantee, privilege_type;

