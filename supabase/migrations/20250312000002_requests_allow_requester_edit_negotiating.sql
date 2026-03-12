-- Allow faculty (requester) to update their own request when status is Negotiating
-- so they can edit the request after admin clicks "Negotiate".
CREATE POLICY "requests_update_requester_negotiating"
  ON public.requests
  FOR UPDATE
  USING (
    auth.uid() = requester_id
    AND status = 'Negotiating'
  )
  WITH CHECK (
    auth.uid() = requester_id
    AND status = 'Negotiating'
  );
