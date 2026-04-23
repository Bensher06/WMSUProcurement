-- Allow suspending department (and other) accounts without deleting auth users.

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('Pending', 'Approved', 'Declined', 'Suspended'));

NOTIFY pgrst, 'reload schema';
