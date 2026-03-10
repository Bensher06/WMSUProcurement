-- ============================================================
-- VERIFY SUPPLIERS TABLE RLS SETUP
-- Run this to check if everything is configured correctly
-- ============================================================

-- 1. Check if table exists
SELECT 
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ RLS ENABLED'
    ELSE '❌ RLS DISABLED - THIS IS THE PROBLEM!'
  END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'suppliers';

-- 2. List ALL policies on suppliers table
SELECT 
  policyname,
  roles,
  cmd,
  qual,
  with_check,
  permissive
FROM pg_policies 
WHERE tablename = 'suppliers'
ORDER BY policyname;

-- 3. Check if anon_can_insert_suppliers policy exists
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ POLICY EXISTS'
    ELSE '❌ POLICY MISSING - THIS IS THE PROBLEM!'
  END as policy_status,
  roles,
  cmd,
  with_check
FROM pg_policies 
WHERE tablename = 'suppliers' 
AND policyname = 'anon_can_insert_suppliers';

-- 4. Verify GRANT permissions
SELECT 
  grantee,
  privilege_type,
  CASE 
    WHEN privilege_type = 'INSERT' AND grantee = 'anon' THEN '✅ INSERT GRANTED TO ANON'
    ELSE privilege_type || ' for ' || grantee
  END as status
FROM information_schema.role_table_grants
WHERE table_name = 'suppliers'
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
    INSERT INTO suppliers (name, contact_person, email)
    VALUES ('RLS Test Supplier', 'Test Person', 'test@supplier.com')
    RETURNING id INTO test_id;
    
    test_result := '✅ SUCCESS - Insert worked! Test ID: ' || test_id::TEXT;
    
    -- Clean up
    DELETE FROM suppliers WHERE id = test_id;
    
  EXCEPTION WHEN OTHERS THEN
    test_result := '❌ FAILED - Error: ' || SQLERRM || ' (Code: ' || SQLSTATE || ')';
  END;
  
  RAISE NOTICE '%', test_result;
END $$;

