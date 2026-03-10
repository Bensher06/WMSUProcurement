-- ============================================================
-- TEST ANONYMOUS INSERT - Run this in Supabase SQL Editor
-- This will help us verify if the RLS policy is working
-- ============================================================

-- Step 1: Verify RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'vendors';

-- Step 2: List all policies on vendors table
SELECT 
  policyname,
  roles,
  cmd as command,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'vendors'
ORDER BY policyname;

-- Step 3: Check if anon_can_insert_vendors policy exists and is correct
SELECT 
  policyname,
  roles,
  cmd,
  with_check
FROM pg_policies 
WHERE tablename = 'vendors' 
AND policyname = 'anon_can_insert_vendors';

-- Step 4: Test insert as anon role (this should work if policy is correct)
-- Note: This simulates what PostgREST does when you use the anon key
DO $$
DECLARE
  test_id UUID;
BEGIN
  -- Set the role to anon (simulating PostgREST behavior)
  SET LOCAL ROLE anon;
  
  -- Try to insert
  INSERT INTO vendors (name, contact_person, email)
  VALUES ('RLS Test Company', 'Test Person', 'test@rls.com')
  RETURNING id INTO test_id;
  
  RAISE NOTICE 'SUCCESS: Insert worked! Test ID: %', test_id;
  
  -- Clean up
  DELETE FROM vendors WHERE id = test_id;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'FAILED: %', SQLERRM;
END $$;

-- Step 5: Verify the policy is actually enabled (not just created)
-- Policies can be disabled, so we need to check
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'vendors'
ORDER BY policyname;
