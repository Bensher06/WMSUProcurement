-- ============================================================
-- TEST SUPPLIERS INSERT - Run this to verify it works
-- ============================================================

-- Test 1: Verify policy is enabled (not disabled)
SELECT 
  policyname,
  roles,
  cmd,
  with_check,
  permissive
FROM pg_policies 
WHERE tablename = 'suppliers' 
AND policyname = 'anon_can_insert_suppliers';

-- Test 2: Direct insert test as anon role
DO $$
DECLARE
  test_id UUID;
BEGIN
  -- Set role to anon (simulating PostgREST)
  SET LOCAL ROLE anon;
  
  -- Try to insert
  INSERT INTO suppliers (name, contact_person, email)
  VALUES ('Test Supplier', 'Test Person', 'test@supplier.com')
  RETURNING id INTO test_id;
  
  RAISE NOTICE '✅ SUCCESS! Insert worked. Test ID: %', test_id;
  
  -- Clean up
  DELETE FROM suppliers WHERE id = test_id;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ FAILED: % (Code: %)', SQLERRM, SQLSTATE;
END $$;

-- Test 3: Verify grants
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'suppliers'
AND grantee = 'anon'
AND privilege_type = 'INSERT';

