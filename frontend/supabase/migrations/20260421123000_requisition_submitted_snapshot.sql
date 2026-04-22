BEGIN;

ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS submitted_snapshot jsonb;

/*
 Preserve an immutable "original RIS copy" at submit time.
 This allows side-by-side comparison between original submitted values
 and later admin-edited values in the integrity timeline.
*/
CREATE OR REPLACE FUNCTION public.request_submit_atomic(p_request_id uuid)
RETURNS public.requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.requests;
  v_hash text;
  v_snapshot jsonb;
BEGIN
  SELECT * INTO v_req FROM public.requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found.'; END IF;
  IF v_req.requester_id <> auth.uid() THEN RAISE EXCEPTION 'Not allowed.'; END IF;
  IF v_req.status <> 'Draft' THEN RAISE EXCEPTION 'Only Draft requests can be submitted.'; END IF;

  v_hash := public.compute_request_integrity_hash_v2(
    v_req.item_name,
    v_req.description,
    v_req.requisition_payload,
    v_req.quantity,
    v_req.unit_price,
    v_req.total_price,
    v_req.budget_fund_source_id,
    v_req.college_budget_type_id
  );

  v_snapshot := jsonb_build_object(
    'item_name', v_req.item_name,
    'description', v_req.description,
    'requisition_payload', v_req.requisition_payload,
    'quantity', v_req.quantity,
    'unit_price', v_req.unit_price,
    'total_price', v_req.total_price,
    'status', 'Pending',
    'ris_no', v_req.ris_no,
    'sai_no', v_req.sai_no,
    'submitted_at', now()
  );

  UPDATE public.requests
     SET status = 'Pending',
         submitted_payload_hash = coalesce(submitted_payload_hash, v_hash),
         latest_payload_hash = v_hash,
         submitted_snapshot = coalesce(submitted_snapshot, v_snapshot),
         last_integrity_reason = 'Requester submitted requisition.',
         updated_at = now()
   WHERE id = p_request_id
   RETURNING * INTO v_req;

  INSERT INTO public.request_integrity_events (
    request_id, event_type, actor_id, reason, before_payload, after_payload, payload_hash_before, payload_hash_after
  ) VALUES (
    p_request_id, 'submit_locked', auth.uid(), 'Requester submitted requisition.',
    jsonb_build_object('status', 'Draft'),
    jsonb_build_object('status', 'Pending'),
    v_hash,
    v_hash
  );

  RETURN v_req;
END;
$$;

/*
Best-effort backfill for already-submitted records where payload stayed unchanged
(`latest_payload_hash == submitted_payload_hash`).
*/
UPDATE public.requests r
SET submitted_snapshot = jsonb_build_object(
  'item_name', r.item_name,
  'description', r.description,
  'requisition_payload', r.requisition_payload,
  'quantity', r.quantity,
  'unit_price', r.unit_price,
  'total_price', r.total_price,
  'status', r.status,
  'ris_no', r.ris_no,
  'sai_no', r.sai_no
)
WHERE r.submitted_snapshot IS NULL
  AND r.submitted_payload_hash IS NOT NULL
  AND r.latest_payload_hash = r.submitted_payload_hash;

NOTIFY pgrst, 'reload schema';

COMMIT;
