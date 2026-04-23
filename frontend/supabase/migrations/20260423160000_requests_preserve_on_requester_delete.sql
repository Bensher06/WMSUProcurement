-- Keep procurement requests, comments, and activity when a Faculty profile / Auth user is removed.
-- 1) Denormalize college + faculty department on requests for RLS after requester_id is cleared.
-- 2) requests.requester_id + request_comments.author_id: ON DELETE SET NULL (was CASCADE on requests).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Denormalized requester context (frozen while profile still exists)
-- ---------------------------------------------------------------------------
ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS requester_college text,
  ADD COLUMN IF NOT EXISTS requester_faculty_department text;

COMMENT ON COLUMN public.requests.requester_college IS
  'College name copied from the requester profile; kept when requester_id is set null so RLS and reporting still work.';
COMMENT ON COLUMN public.requests.requester_faculty_department IS
  'Faculty sub-department copied from the requester profile; kept when requester_id is set null.';

UPDATE public.requests r
SET
  requester_college = COALESCE(NULLIF(BTRIM(r.requester_college), ''), p.department),
  requester_faculty_department = COALESCE(NULLIF(BTRIM(r.requester_faculty_department), ''), p.faculty_department)
FROM public.profiles p
WHERE p.id = r.requester_id;

CREATE OR REPLACE FUNCTION public.requests_preserve_requester_context()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.requester_id IS NOT NULL
     AND NEW.requester_id IS NULL THEN
    NEW.requester_college := COALESCE(NULLIF(BTRIM(NEW.requester_college), ''), NULLIF(BTRIM(OLD.requester_college), ''));
    NEW.requester_faculty_department := COALESCE(
      NULLIF(BTRIM(NEW.requester_faculty_department), ''),
      NULLIF(BTRIM(OLD.requester_faculty_department), '')
    );
    RETURN NEW;
  END IF;

  IF NEW.requester_id IS NOT NULL THEN
    SELECT p.department, p.faculty_department
      INTO NEW.requester_college, NEW.requester_faculty_department
    FROM public.profiles p
    WHERE p.id = NEW.requester_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_requests_preserve_requester_context ON public.requests;
CREATE TRIGGER trg_requests_preserve_requester_context
  BEFORE INSERT OR UPDATE OF requester_id ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.requests_preserve_requester_context();

-- ---------------------------------------------------------------------------
-- 2. FK: requests.requester_id → SET NULL on profile delete
-- ---------------------------------------------------------------------------
ALTER TABLE public.requests DROP CONSTRAINT IF EXISTS requests_requester_id_fkey;

ALTER TABLE public.requests
  ALTER COLUMN requester_id DROP NOT NULL;

ALTER TABLE public.requests
  ADD CONSTRAINT requests_requester_id_fkey
  FOREIGN KEY (requester_id) REFERENCES public.profiles (id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 3. FK: request_comments.author_id → SET NULL (keep comment text/history)
-- ---------------------------------------------------------------------------
ALTER TABLE public.request_comments DROP CONSTRAINT IF EXISTS request_comments_author_id_fkey;

ALTER TABLE public.request_comments
  ALTER COLUMN author_id DROP NOT NULL;

ALTER TABLE public.request_comments
  ADD CONSTRAINT request_comments_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES public.profiles (id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 4. RLS helpers: resolve college when profile row is gone
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_actor_can_manage(p_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT id, role
    FROM public.profiles
    WHERE id = auth.uid()
  ),
  req AS (
    SELECT
      r.id,
      r.requester_id,
      COALESCE(NULLIF(BTRIM(r.requester_college), ''), rp.department) AS requester_college
    FROM public.requests r
    LEFT JOIN public.profiles rp ON rp.id = r.requester_id
    WHERE r.id = p_request_id
  )
  SELECT EXISTS (
    SELECT 1
    FROM me, req
    WHERE
      me.role = 'Admin'
      OR (
        me.role = 'DeptHead'
        AND EXISTS (
          SELECT 1
          FROM public.colleges c
          WHERE c.handler_id = me.id
            AND c.name IS NOT DISTINCT FROM req.requester_college
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.get_request_requester_college_id(p_request_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id
  FROM public.requests r
  LEFT JOIN public.profiles rp ON rp.id = r.requester_id
  JOIN public.colleges c ON c.name = COALESCE(NULLIF(BTRIM(r.requester_college), ''), rp.department)
  WHERE r.id = p_request_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_college_committed_total(p_college_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(sum(r.total_price), 0)
  FROM public.requests r
  WHERE r.status IN ('Approved', 'Procuring', 'ProcurementDone', 'Received', 'Completed')
    AND EXISTS (
      SELECT 1
      FROM public.colleges c
      WHERE c.id = p_college_id
        AND (
          EXISTS (
            SELECT 1
            FROM public.profiles rp
            WHERE rp.id = r.requester_id
              AND rp.department = c.name
          )
          OR r.requester_college = c.name
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.enforce_request_budget_ceiling(
  p_request_id uuid,
  p_target_total numeric,
  p_target_budget_type_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_college_id uuid;
  v_college_name text;
  v_request_total numeric;
  v_existing_type_id uuid;
  v_effective_type_id uuid;
  v_college_ceiling numeric;
  v_college_committed numeric;
  v_college_remaining numeric;
  v_type_amount numeric;
  v_type_name text;
  v_type_college_id uuid;
  v_type_is_active boolean;
  v_type_committed numeric;
  v_type_remaining numeric;
BEGIN
  IF p_target_total < 0 THEN
    RAISE EXCEPTION 'Budget check failed: target total cannot be negative.';
  END IF;

  SELECT r.total_price, r.college_budget_type_id, c.id, c.name
    INTO v_request_total, v_existing_type_id, v_college_id, v_college_name
  FROM public.requests r
  LEFT JOIN public.profiles rp ON rp.id = r.requester_id
  LEFT JOIN public.colleges c ON c.name = COALESCE(NULLIF(BTRIM(r.requester_college), ''), rp.department)
  WHERE r.id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found.';
  END IF;

  IF v_college_id IS NULL THEN
    RETURN;
  END IF;

  SELECT p.approved_budget
    INTO v_college_ceiling
  FROM public.colleges c
  LEFT JOIN public.profiles p ON p.id = c.handler_id
  WHERE c.id = v_college_id;

  v_college_committed := public.get_college_committed_total(v_college_id);
  v_college_remaining := greatest(0, coalesce(v_college_ceiling, 0) - (v_college_committed - coalesce(v_request_total, 0)));

  IF coalesce(v_college_ceiling, 0) > 0 AND p_target_total > v_college_remaining THEN
    RAISE EXCEPTION
      'Budget ceiling exceeded for college "%": request total % is above remaining %.',
      coalesce(v_college_name, 'Unknown'),
      p_target_total,
      v_college_remaining;
  END IF;

  v_effective_type_id := coalesce(p_target_budget_type_id, v_existing_type_id);
  IF v_effective_type_id IS NULL THEN
    RETURN;
  END IF;

  SELECT t.amount, t.name, t.college_id, t.is_active
    INTO v_type_amount, v_type_name, v_type_college_id, v_type_is_active
  FROM public.college_budget_types t
  WHERE t.id = v_effective_type_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Selected budget type is no longer available.';
  END IF;
  IF v_type_college_id <> v_college_id THEN
    RAISE EXCEPTION 'Budget type does not belong to requester college.';
  END IF;
  IF coalesce(v_type_is_active, false) = false THEN
    RAISE EXCEPTION 'Selected budget type is inactive.';
  END IF;

  v_type_committed := public.get_budget_type_committed_total(v_effective_type_id);
  v_type_remaining := greatest(0, coalesce(v_type_amount, 0) - (v_type_committed - coalesce(v_request_total, 0)));

  IF p_target_total > v_type_remaining THEN
    RAISE EXCEPTION
      'Budget ceiling exceeded for type "%": request total % is above remaining %.',
      coalesce(v_type_name, 'Unknown'),
      p_target_total,
      v_type_remaining;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.mobile_get_college_requests()
RETURNS SETOF public.requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  handled_college text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT c.name
    INTO handled_college
  FROM public.colleges c
  WHERE c.handler_id = auth.uid()
  LIMIT 1;

  IF handled_college IS NULL THEN
    SELECT p.department
      INTO handled_college
    FROM public.profiles p
    WHERE p.id = auth.uid()
    LIMIT 1;
  END IF;

  IF handled_college IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT r.*
  FROM public.requests r
  WHERE
    r.requester_id IN (
      SELECT p.id
      FROM public.profiles p
      WHERE p.department = handled_college
    )
    OR r.requester_college = handled_college
  ORDER BY r.created_at DESC;
END;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
