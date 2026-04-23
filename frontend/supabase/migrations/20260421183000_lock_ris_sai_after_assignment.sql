BEGIN;

/*
Keep RIS/SAI immutable as the permanent record identifier.
Once assigned, edits to the requisition must not change these numbers.
*/
CREATE OR REPLACE FUNCTION public.lock_request_numbers_after_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.ris_no IS NOT NULL AND NEW.ris_no IS DISTINCT FROM OLD.ris_no THEN
      RAISE EXCEPTION 'RIS number is immutable once assigned.';
    END IF;
    IF OLD.sai_no IS NOT NULL AND NEW.sai_no IS DISTINCT FROM OLD.sai_no THEN
      RAISE EXCEPTION 'SAI number is immutable once assigned.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_request_numbers_after_assignment ON public.requests;
CREATE TRIGGER trg_lock_request_numbers_after_assignment
  BEFORE UPDATE ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.lock_request_numbers_after_assignment();

NOTIFY pgrst, 'reload schema';

COMMIT;
