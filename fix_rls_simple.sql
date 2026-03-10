-- ============================================================
-- SIMPLE FIX FOR RLS - Run this in Supabase SQL Editor
-- ============================================================

-- Step 1: Ensure RLS is enabled
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies
DROP POLICY IF EXISTS "Allow all for authenticated" ON vendors;
DROP POLICY IF EXISTS "Allow public inserts for vendor registration" ON vendors;
DROP POLICY IF EXISTS "anon_can_insert_vendors" ON vendors;
DROP POLICY IF EXISTS "authenticated_can_insert_vendors" ON vendors;
DROP POLICY IF EXISTS "authenticated_can_select_vendors" ON vendors;
DROP POLICY IF EXISTS "authenticated_can_update_vendors" ON vendors;
DROP POLICY IF EXISTS "authenticated_can_delete_vendors" ON vendors;

-- Step 3: Create the critical policy for anonymous inserts
CREATE POLICY "anon_can_insert_vendors" 
ON vendors 
FOR INSERT 
TO anon
WITH CHECK (true);

-- Step 4: Create policies for authenticated users
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

-- Step 5: Verify the policy exists
SELECT 
  policyname,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'vendors' 
AND policyname = 'anon_can_insert_vendors';

-- Step 6: Test insert as anon (should work)
DO $$
DECLARE
  test_id UUID;
BEGIN
  SET LOCAL ROLE anon;
  INSERT INTO vendors (name, contact_person, email)
  VALUES ('Test Insert', 'Test', 'test@test.com')
  RETURNING id INTO test_id;
  RAISE NOTICE '✅ SUCCESS! Insert worked. Test ID: %', test_id;
  DELETE FROM vendors WHERE id = test_id;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ FAILED: %', SQLERRM;
END $$;

