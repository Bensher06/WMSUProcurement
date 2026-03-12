-- Allow 'Negotiating' in requests.status (fix for "requests_status_check" violation)
ALTER TABLE public.requests
  DROP CONSTRAINT IF EXISTS requests_status_check;

ALTER TABLE public.requests
  ADD CONSTRAINT requests_status_check
  CHECK (status IN (
    'Draft',
    'Pending',
    'Negotiating',
    'Approved',
    'Rejected',
    'Ordered',
    'Received',
    'Completed'
  ));
