-- Enforce School Year format on budgets.academic_year:
-- SY YYYY-YYYY where second year = first year + 1.
ALTER TABLE public.budgets
  DROP CONSTRAINT IF EXISTS budgets_academic_year_school_year_check;

ALTER TABLE public.budgets
  ADD CONSTRAINT budgets_academic_year_school_year_check
  CHECK (
    CASE
      WHEN academic_year ~ '^SY [0-9]{4}-[0-9]{4}$' THEN
        split_part(replace(academic_year, 'SY ', ''), '-', 2)::int =
        split_part(replace(academic_year, 'SY ', ''), '-', 1)::int + 1
      ELSE false
    END
  ) NOT VALID;
