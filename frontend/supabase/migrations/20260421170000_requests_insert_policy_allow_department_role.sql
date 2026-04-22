BEGIN;

/*
Allow request creation for both canonical Faculty rows and legacy/label rows
stored as "Department". This keeps RLS aligned with frontend role mapping.
*/
DROP POLICY IF EXISTS requests_insert_faculty_draft ON public.requests;

CREATE POLICY requests_insert_faculty_draft
  ON public.requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    requester_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND lower(trim(coalesce(p.role, ''))) IN ('faculty', 'department')
    )
    AND coalesce(status, 'Draft') = 'Draft'
  );

NOTIFY pgrst, 'reload schema';

COMMIT;
