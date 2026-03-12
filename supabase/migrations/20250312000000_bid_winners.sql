-- Bid winners table: record who won each procurement project (manual upload or linked to request)
CREATE TABLE IF NOT EXISTS public.bid_winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES public.requests(id) ON DELETE SET NULL,
  project_title text NOT NULL,
  reference_no text,
  winner_supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  winner_name text,
  contract_amount numeric(14,2) NOT NULL DEFAULT 0,
  date_awarded date,
  notes text,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.bid_winners IS 'Procurement project bid winners / awardees (uploaded or linked to requests)';

CREATE INDEX IF NOT EXISTS idx_bid_winners_request_id ON public.bid_winners(request_id);
CREATE INDEX IF NOT EXISTS idx_bid_winners_winner_supplier_id ON public.bid_winners(winner_supplier_id);
CREATE INDEX IF NOT EXISTS idx_bid_winners_date_awarded ON public.bid_winners(date_awarded DESC);
CREATE INDEX IF NOT EXISTS idx_bid_winners_display_order ON public.bid_winners(display_order);

ALTER TABLE public.bid_winners ENABLE ROW LEVEL SECURITY;

-- Public can read (for landing / PMR)
CREATE POLICY "bid_winners_select_public"
  ON public.bid_winners FOR SELECT
  USING (true);

-- Only admins (and optionally DeptHead) can insert/update/delete
CREATE POLICY "bid_winners_insert_admin"
  ON public.bid_winners FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
    )
  );

CREATE POLICY "bid_winners_update_admin"
  ON public.bid_winners FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
    )
  );

CREATE POLICY "bid_winners_delete_admin"
  ON public.bid_winners FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
    )
  );

-- Trigger to keep updated_at
CREATE OR REPLACE FUNCTION public.set_bid_winners_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bid_winners_updated_at ON public.bid_winners;
CREATE TRIGGER bid_winners_updated_at
  BEFORE UPDATE ON public.bid_winners
  FOR EACH ROW EXECUTE FUNCTION public.set_bid_winners_updated_at();
