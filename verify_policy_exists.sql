-- ============================================================
-- VERIFY POLICY EXISTS AND IS ENABLED
-- Run this to confirm the policy is active
-- ============================================================

-- Check if the policy exists
SELECT 
  policyname,
  roles,
  cmd,
  qual,
  with_check,
  CASE 
    WHEN policyname IS NOT NULL THEN 'EXISTS'
    ELSE 'MISSING'
  END as status
FROM pg_policies 
WHERE tablename = 'vendors'
ORDER BY policyname;

-- Specifically check anon_can_insert_vendors
SELECT 
  policyname,
  roles,
  cmd,
  with_check,
  '✅ EXISTS' as status
FROM pg_policies 
WHERE tablename = 'vendors' 
AND policyname = 'anon_can_insert_vendors';

-- Verify RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'vendors';

