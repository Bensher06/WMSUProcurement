-- ============================================================
-- DROP SUPPLIERS TABLE AND REVERT CHANGES
-- ============================================================

-- Drop the trigger first (revert to original)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'Faculty')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop RLS policies
DROP POLICY IF EXISTS "Public can read approved suppliers" ON suppliers;
DROP POLICY IF EXISTS "Suppliers can read own profile" ON suppliers;
DROP POLICY IF EXISTS "Admins can read all suppliers" ON suppliers;
DROP POLICY IF EXISTS "Suppliers can update own profile" ON suppliers;
DROP POLICY IF EXISTS "Allow insert for authenticated" ON suppliers;
DROP POLICY IF EXISTS "Admins can update all suppliers" ON suppliers;

-- Drop indexes
DROP INDEX IF EXISTS idx_suppliers_email;
DROP INDEX IF EXISTS idx_suppliers_status;
DROP INDEX IF EXISTS idx_suppliers_company_name;

-- Drop the suppliers table
DROP TABLE IF EXISTS suppliers;

