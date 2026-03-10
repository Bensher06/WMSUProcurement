-- ============================================================
-- COMPREHENSIVE RLS DIAGNOSIS
-- Run this to identify what's wrong
-- ============================================================

-- 1. Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ ENABLED'
    ELSE '❌ DISABLED - THIS IS THE PROBLEM!'
  END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'vendors';

-- 2. List ALL policies (check for conflicts)
SELECT 
  policyname,
  roles,
  cmd,
  qual,
  with_check,
  permissive
FROM pg_policies 
WHERE tablename = 'vendors'
ORDER BY policyname;

-- 3. Check if anon_can_insert_vendors policy exists and is correct
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ POLICY EXISTS'
    ELSE '❌ POLICY MISSING - THIS IS THE PROBLEM!'
  END as policy_status,
  roles,
  cmd,
  with_check
FROM pg_policies 
WHERE tablename = 'vendors' 
AND policyname = 'anon_can_insert_vendors';

-- 4. Verify GRANT permissions
SELECT 
  grantee,
  privilege_type,
  CASE 
    WHEN privilege_type = 'INSERT' AND grantee = 'anon' THEN '✅ INSERT GRANTED TO ANON'
    ELSE privilege_type || ' for ' || grantee
  END as status
FROM information_schema.role_table_grants
WHERE table_name = 'vendors'
AND grantee IN ('anon', 'authenticated', 'public')
ORDER BY grantee, privilege_type;

-- 5. Test insert as anon role directly
DO $$
DECLARE
  test_id UUID;
  test_result TEXT;
BEGIN
  -- Set role to anon
  SET LOCAL ROLE anon;
  
  -- Try to insert
  BEGIN
    INSERT INTO vendors (name, contact_person, email)
    VALUES ('Diagnostic Test', 'Test Person', 'test@diagnostic.com')
    RETURNING id INTO test_id;
    
    test_result := '✅ SUCCESS - Insert worked! Test ID: ' || test_id::TEXT;
    
    -- Clean up
    DELETE FROM vendors WHERE id = test_id;
    
  EXCEPTION WHEN OTHERS THEN
    test_result := '❌ FAILED - Error: ' || SQLERRM || ' (Code: ' || SQLSTATE || ')';
  END;
  
  RAISE NOTICE '%', test_result;
END $$;

-- 6. Check if there are any triggers that might interfere
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'vendors';

-- 7. Verify table structure (check for any constraints)
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'vendors'
ORDER BY ordinal_position;

