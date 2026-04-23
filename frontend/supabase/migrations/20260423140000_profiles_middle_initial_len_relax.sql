-- Relax middle name / initial length (e.g. "Procurement" exceeded a short cap).
-- Safe if the constraint is missing (idempotent).

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_middle_initial_len;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_middle_initial_len
  CHECK (middle_initial IS NULL OR char_length(middle_initial) <= 120);

NOTIFY pgrst, 'reload schema';
