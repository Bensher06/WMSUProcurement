-- Bootstrap SQL for new Supabase project
-- Generated from frontend/supabase/migrations in verified working order.
-- Execute in SQL Editor for a fresh project (or prefer `supabase db push` for timestamped migrations).


-- ============================================================================
-- BEGIN MIGRATION: 20250224000000_budget_fund_sources.sql
-- ============================================================================

-- Budget fund sources: breakdown of where each budget's total came from
-- Run this in Supabase SQL Editor if the table does not exist yet.

CREATE TABLE IF NOT EXISTS budget_fund_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  funds_for TEXT,
  source TEXT,
  date_received DATE,
  span TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_fund_sources_budget_id ON budget_fund_sources(budget_id);

-- Optional: trigger to keep updated_at in sync
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS budget_fund_sources_updated_at ON budget_fund_sources;
CREATE TRIGGER budget_fund_sources_updated_at
  BEFORE UPDATE ON budget_fund_sources
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- Allow authenticated users to read; only admins can insert/update/delete (adjust RLS as needed)
ALTER TABLE budget_fund_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for authenticated" ON budget_fund_sources
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all for authenticated" ON budget_fund_sources
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- END MIGRATION: 20250224000000_budget_fund_sources.sql


-- ============================================================================
-- BEGIN MIGRATION: 20250225000000_landing_page.sql
-- ============================================================================

-- Landing page content: one row per section, JSONB data (admin-editable, public read)
CREATE TABLE IF NOT EXISTS landing_page (
  section TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default sections (empty data so landing shows empty until admin fills)
INSERT INTO landing_page (section, data) VALUES
  ('transparency', '{"mission":"","ctaPrimary":{"label":"Active Bidding","url":"/login"},"ctaSecondary":{"label":"Supplemental / Bid Bulletins","url":"/login"}}'),
  ('bidding', '{"rows":[]}'),
  ('documents', '{"items":[]}'),
  ('planning', '{"app":{"title":"APP (Annual Procurement Plan)","description":"","url":""},"pmr":{"title":"PMR (Procurement Monitoring Report)","description":"","url":""}}'),
  ('vendor', '{"accreditationTitle":"Accreditation Portal","accreditationDescription":"","accreditationUrl":"/login","loginTitle":"Login for Registered Suppliers","loginDescription":"","loginUrl":"/login"}'),
  ('bac', '{"secretariatName":"Procurement Office","secretariatEmail":"procurement@wmsu.edu.ph","secretariatPhone":"991-1771","officeAddress":"Western Mindanao State University, Normal Road, Baliwasan, Zamboanga City","officeNote":""}')
ON CONFLICT (section) DO NOTHING;

ALTER TABLE landing_page ENABLE ROW LEVEL SECURITY;

-- Public can read (for unauthenticated landing page)
CREATE POLICY "Anyone can read landing_page" ON landing_page FOR SELECT TO anon, authenticated USING (true);
-- Only authenticated can update (admin check in app)
CREATE POLICY "Authenticated can update landing_page" ON landing_page FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can insert landing_page" ON landing_page FOR INSERT TO authenticated WITH CHECK (true);

-- END MIGRATION: 20250225000000_landing_page.sql


-- ============================================================================
-- BEGIN MIGRATION: 20260330000100_colleges_table.sql
-- ============================================================================

-- Colleges configuration for budget distribution
-- - Admin can add/remove colleges
-- - Each college can use percentage or direct amount allocation

CREATE TABLE IF NOT EXISTS public.colleges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  handler_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  allocation_mode TEXT NOT NULL DEFAULT 'percentage' CHECK (allocation_mode IN ('percentage', 'amount')),
  allocation_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_colleges_name ON public.colleges(name);
CREATE INDEX IF NOT EXISTS idx_colleges_active ON public.colleges(is_active);

CREATE OR REPLACE FUNCTION public.colleges_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS colleges_updated_at_trigger ON public.colleges;
CREATE TRIGGER colleges_updated_at_trigger
  BEFORE UPDATE ON public.colleges
  FOR EACH ROW EXECUTE PROCEDURE public.colleges_set_updated_at();

ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated" ON public.colleges;
CREATE POLICY "Allow all for authenticated"
  ON public.colleges FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON TABLE public.colleges TO authenticated;
GRANT ALL ON TABLE public.colleges TO service_role;

-- Seed defaults (safe if rerun)
INSERT INTO public.colleges (name, allocation_mode, allocation_value)
VALUES
  ('College of Computing Science', 'percentage', 33.33),
  ('College of Nursing', 'percentage', 33.33),
  ('College of Engineering', 'percentage', 33.34)
ON CONFLICT (name) DO NOTHING;

-- Ensure PostgREST sees new table/policies quickly
NOTIFY pgrst, 'reload schema';

-- END MIGRATION: 20260330000100_colleges_table.sql


-- ============================================================================
-- BEGIN MIGRATION: 20260331000000_colleges_unique_handler_id.sql
-- ============================================================================

-- Enforce: one DeptHead (handler_id) can only be assigned to one college.
-- Allows multiple NULL handler_id values.

-- If duplicates already exist, keep the earliest college assignment
-- (by created_at, then id) and clear handler_id on the rest.
with ranked as (
  select
    id,
    handler_id,
    row_number() over (
      partition by handler_id
      order by created_at asc, id asc
    ) as rn
  from public.colleges
  where handler_id is not null
)
update public.colleges c
set handler_id = null
from ranked r
where c.id = r.id
  and r.rn > 1;

create unique index if not exists colleges_unique_handler_id
on public.colleges (handler_id)
where handler_id is not null;

notify pgrst, 'reload schema';


-- END MIGRATION: 20260331000000_colleges_unique_handler_id.sql


-- ============================================================================
-- BEGIN MIGRATION: 20260331001000_request_activity_triggers.sql
-- ============================================================================

-- Populate request_activity automatically (Logs page)

create extension if not exists pgcrypto;

create or replace function public.log_request_activity_for_requests()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- On insert: created
  if (tg_op = 'INSERT') then
    insert into public.request_activity (request_id, actor_id, action, details)
    values (
      new.id,
      auth.uid(),
      'created',
      jsonb_build_object(
        'status', new.status,
        'item_name', new.item_name
      )
    );
    return new;
  end if;

  -- On update: status change
  if (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    insert into public.request_activity (request_id, actor_id, action, details)
    values (
      new.id,
      auth.uid(),
      'status_changed',
      jsonb_build_object(
        'from', old.status,
        'to', new.status
      )
    );
  end if;

  -- On update: delegation change
  if (tg_op = 'UPDATE' and new.delegated_to is distinct from old.delegated_to) then
    insert into public.request_activity (request_id, actor_id, action, details)
    values (
      new.id,
      auth.uid(),
      'delegated',
      jsonb_build_object(
        'from', old.delegated_to,
        'to', new.delegated_to
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_log_request_activity_requests on public.requests;
create trigger trg_log_request_activity_requests
after insert or update on public.requests
for each row
execute function public.log_request_activity_for_requests();


create or replace function public.log_request_activity_for_comments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.request_activity (request_id, actor_id, action, details)
  values (
    new.request_id,
    auth.uid(),
    'comment_added',
    jsonb_build_object(
      'comment_id', new.id
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_log_request_activity_comments on public.request_comments;
create trigger trg_log_request_activity_comments
after insert on public.request_comments
for each row
execute function public.log_request_activity_for_comments();

notify pgrst, 'reload schema';


-- END MIGRATION: 20260331001000_request_activity_triggers.sql


-- ============================================================================
-- BEGIN MIGRATION: 20260331002000_audit_events.sql
-- ============================================================================

-- Generic audit events (logins, account creation, colleges CRUD, etc.)

create extension if not exists pgcrypto;

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_id uuid null references public.profiles(id) on delete set null,
  event_type text not null,
  entity text null,
  entity_id uuid null,
  details jsonb null default '{}'::jsonb
);

create index if not exists idx_audit_events_created_at on public.audit_events(created_at desc);
create index if not exists idx_audit_events_actor_id on public.audit_events(actor_id);

alter table public.audit_events enable row level security;

drop policy if exists "audit_events_select_authenticated" on public.audit_events;
create policy "audit_events_select_authenticated"
on public.audit_events
for select
to authenticated
using (true);

drop policy if exists "audit_events_insert_own" on public.audit_events;
create policy "audit_events_insert_own"
on public.audit_events
for insert
to authenticated
with check (actor_id is null or actor_id = auth.uid());

grant all on table public.audit_events to authenticated;
grant all on table public.audit_events to service_role;

-- Trigger helpers
create or replace function public.audit_log_colleges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.audit_events(actor_id, event_type, entity, entity_id, details)
    values (auth.uid(), 'college_created', 'colleges', new.id, jsonb_build_object('name', new.name));
    return new;
  elsif (tg_op = 'UPDATE') then
    insert into public.audit_events(actor_id, event_type, entity, entity_id, details)
    values (
      auth.uid(),
      'college_updated',
      'colleges',
      new.id,
      jsonb_build_object(
        'before', jsonb_build_object('name', old.name, 'handler_id', old.handler_id, 'allocation_mode', old.allocation_mode, 'allocation_value', old.allocation_value, 'is_active', old.is_active),
        'after',  jsonb_build_object('name', new.name, 'handler_id', new.handler_id, 'allocation_mode', new.allocation_mode, 'allocation_value', new.allocation_value, 'is_active', new.is_active)
      )
    );
    return new;
  elsif (tg_op = 'DELETE') then
    insert into public.audit_events(actor_id, event_type, entity, entity_id, details)
    values (auth.uid(), 'college_deleted', 'colleges', old.id, jsonb_build_object('name', old.name));
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_audit_colleges on public.colleges;
create trigger trg_audit_colleges
after insert or update or delete on public.colleges
for each row execute function public.audit_log_colleges();

create or replace function public.audit_log_profiles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.audit_events(actor_id, event_type, entity, entity_id, details)
    values (new.id, 'account_created', 'profiles', new.id, jsonb_build_object('email', new.email, 'role', new.role, 'department', new.department));
    return new;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_audit_profiles on public.profiles;
create trigger trg_audit_profiles
after insert on public.profiles
for each row execute function public.audit_log_profiles();

notify pgrst, 'reload schema';


-- END MIGRATION: 20260331002000_audit_events.sql


-- ============================================================================
-- BEGIN MIGRATION: 20260331003000_audit_profiles_update.sql
-- ============================================================================

-- Audit: log when a user/profile gets edited

create or replace function public.audit_log_profiles_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only log meaningful edits (avoid spam from updated_at-only writes)
  if (
    new.full_name is distinct from old.full_name
    or new.email is distinct from old.email
    or new.role is distinct from old.role
    or new.department is distinct from old.department
    or new.approved_budget is distinct from old.approved_budget
  ) then
    insert into public.audit_events(actor_id, event_type, entity, entity_id, details)
    values (
      auth.uid(),
      'user_updated',
      'profiles',
      new.id,
      jsonb_build_object(
        'target_user_id', new.id,
        'before', jsonb_build_object(
          'full_name', old.full_name,
          'email', old.email,
          'role', old.role,
          'department', old.department,
          'approved_budget', old.approved_budget
        ),
        'after', jsonb_build_object(
          'full_name', new.full_name,
          'email', new.email,
          'role', new.role,
          'department', new.department,
          'approved_budget', new.approved_budget
        )
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_audit_profiles_update on public.profiles;
create trigger trg_audit_profiles_update
after update on public.profiles
for each row
execute function public.audit_log_profiles_update();

notify pgrst, 'reload schema';


-- END MIGRATION: 20260331003000_audit_profiles_update.sql


-- ============================================================================
-- BEGIN MIGRATION: 20260331004000_college_budget_types.sql
-- ============================================================================

-- Budget types allocation per college (DeptHead view)

create extension if not exists pgcrypto;

create table if not exists public.college_budget_types (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  fund_code text null,
  name text not null,
  amount numeric(12,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_college_budget_types_college_id on public.college_budget_types(college_id);
create index if not exists idx_college_budget_types_created_at on public.college_budget_types(created_at desc);

-- Optional: prevent duplicate fund_code within a college when fund_code is provided
create unique index if not exists college_budget_types_unique_fund_code_per_college
on public.college_budget_types(college_id, fund_code)
where fund_code is not null and fund_code <> '';

alter table public.college_budget_types enable row level security;

drop policy if exists "Allow all for authenticated" on public.college_budget_types;
create policy "Allow all for authenticated"
on public.college_budget_types
for all
to authenticated
using (true)
with check (true);

grant all on table public.college_budget_types to authenticated;
grant all on table public.college_budget_types to service_role;

notify pgrst, 'reload schema';


-- END MIGRATION: 20260331004000_college_budget_types.sql


-- ============================================================================
-- BEGIN MIGRATION: 20260404120000_procurement_doc_features.sql
-- ============================================================================

-- Doc-aligned features: budget-linked requests, partial delivery (ICS / custodian handled in app; no separate supply_entries table)
--
-- Prerequisite: budget_fund_sources must exist (included below if missing — same as 20250224000000_budget_fund_sources.sql)

CREATE TABLE IF NOT EXISTS public.budget_fund_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  funds_for TEXT,
  source TEXT,
  date_received DATE,
  span TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_fund_sources_budget_id ON public.budget_fund_sources(budget_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS budget_fund_sources_updated_at ON public.budget_fund_sources;
CREATE TRIGGER budget_fund_sources_updated_at
  BEFORE UPDATE ON public.budget_fund_sources
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

ALTER TABLE public.budget_fund_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read for authenticated" ON public.budget_fund_sources;
CREATE POLICY "Allow read for authenticated" ON public.budget_fund_sources
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow all for authenticated" ON public.budget_fund_sources;
CREATE POLICY "Allow all for authenticated" ON public.budget_fund_sources
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Requests: link to university fund source + college unit allotment; receiving variance
ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS budget_fund_source_id uuid REFERENCES public.budget_fund_sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS college_budget_type_id uuid REFERENCES public.college_budget_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quantity_received numeric(14, 4),
  ADD COLUMN IF NOT EXISTS partial_delivery_remarks text;

CREATE INDEX IF NOT EXISTS idx_requests_budget_fund_source_id ON public.requests(budget_fund_source_id);
CREATE INDEX IF NOT EXISTS idx_requests_college_budget_type_id ON public.requests(college_budget_type_id);

COMMENT ON COLUMN public.requests.budget_fund_source_id IS 'Layer 1 funding stream (university budget breakdown)';
COMMENT ON COLUMN public.requests.college_budget_type_id IS 'Layer 3 unit / sub-category allotment within college';
COMMENT ON COLUMN public.requests.quantity_received IS 'Actual quantity received (logistics); may differ from quantity';
COMMENT ON COLUMN public.requests.partial_delivery_remarks IS 'Required when quantity_received < quantity';

NOTIFY pgrst, 'reload schema';

-- END MIGRATION: 20260404120000_procurement_doc_features.sql


-- ============================================================================
-- BEGIN MIGRATION: 20260404140000_drop_supply_entries_if_exists.sql
-- ============================================================================

-- Remove redundant supply_entries table if a prior migration created it (consolidated into Inventory Custodian + requisitions).
DROP TABLE IF EXISTS public.supply_entries CASCADE;

NOTIFY pgrst, 'reload schema';

-- END MIGRATION: 20260404140000_drop_supply_entries_if_exists.sql


-- ============================================================================
-- BEGIN MIGRATION: 20260404160000_requests_realtime_publication.sql
-- ============================================================================

-- Live updates for faculty Request & History when college approves (postgres_changes subscription).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.requests;
  END IF;
END $$;

-- END MIGRATION: 20260404160000_requests_realtime_publication.sql


-- ============================================================================
-- BEGIN MIGRATION: 20260409120000_transparency_bulletins_public_read.sql
-- ============================================================================

-- ============================================================
-- Transparency seal entries, bid bulletins, storage, public read
-- Run in Supabase SQL Editor after prior migrations (landing_page, etc.)
-- ============================================================

-- -----------------------------------------------------------------
-- 1. transparency_seal_entries (Active Bidding / featured items)
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transparency_seal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  mission TEXT,
  project_title TEXT NOT NULL DEFAULT '',
  reference_no TEXT NOT NULL DEFAULT '',
  abc NUMERIC(14, 2) NOT NULL DEFAULT 0,
  closing_date DATE,
  opening_date DATE,
  location TEXT,
  description TEXT,
  requirements TEXT[] NOT NULL DEFAULT '{}',
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_transparency_seal_display_order ON public.transparency_seal_entries(display_order);

ALTER TABLE public.transparency_seal_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read transparency_seal_entries" ON public.transparency_seal_entries;
CREATE POLICY "Anyone can read transparency_seal_entries"
  ON public.transparency_seal_entries FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated manage transparency_seal_entries" ON public.transparency_seal_entries;
CREATE POLICY "Authenticated manage transparency_seal_entries"
  ON public.transparency_seal_entries FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------
-- 2. bid_bulletins
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bid_bulletins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  type TEXT NOT NULL DEFAULT 'Bulletins',
  status TEXT NOT NULL DEFAULT 'Active',
  title TEXT NOT NULL DEFAULT '',
  reference_no TEXT NOT NULL DEFAULT '',
  date DATE,
  related_to TEXT,
  description TEXT,
  changes TEXT[] NOT NULL DEFAULT '{}',
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_bid_bulletins_display_order ON public.bid_bulletins(display_order);

ALTER TABLE public.bid_bulletins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read bid_bulletins" ON public.bid_bulletins;
CREATE POLICY "Anyone can read bid_bulletins"
  ON public.bid_bulletins FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated manage bid_bulletins" ON public.bid_bulletins;
CREATE POLICY "Authenticated manage bid_bulletins"
  ON public.bid_bulletins FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------
-- 3. Public storage bucket for bulletin file attachments
-- -----------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('bid-bulletin-attachments', 'bid-bulletin-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Public read bid-bulletin-attachments" ON storage.objects;
CREATE POLICY "Public read bid-bulletin-attachments"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'bid-bulletin-attachments');

DROP POLICY IF EXISTS "Authenticated upload bid-bulletin-attachments" ON storage.objects;
CREATE POLICY "Authenticated upload bid-bulletin-attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'bid-bulletin-attachments');

DROP POLICY IF EXISTS "Authenticated update bid-bulletin-attachments" ON storage.objects;
CREATE POLICY "Authenticated update bid-bulletin-attachments"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'bid-bulletin-attachments')
  WITH CHECK (bucket_id = 'bid-bulletin-attachments');

DROP POLICY IF EXISTS "Authenticated delete bid-bulletin-attachments" ON storage.objects;
CREATE POLICY "Authenticated delete bid-bulletin-attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'bid-bulletin-attachments');

-- -----------------------------------------------------------------
-- 4. Public read for Bid Winners page (anon): awarded requests + supplier names
-- -----------------------------------------------------------------
DROP POLICY IF EXISTS "Anon read requests with awarded supplier" ON public.requests;
CREATE POLICY "Anon read requests with awarded supplier"
  ON public.requests FOR SELECT TO anon
  USING (supplier_id IS NOT NULL);

DROP POLICY IF EXISTS "Anon read suppliers referenced by awarded requests" ON public.suppliers;
CREATE POLICY "Anon read suppliers referenced by awarded requests"
  ON public.suppliers FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.supplier_id = suppliers.id AND r.supplier_id IS NOT NULL
    )
  );

NOTIFY pgrst, 'reload schema';

-- END MIGRATION: 20260409120000_transparency_bulletins_public_read.sql


-- ============================================================================
-- BEGIN MIGRATION: 20260409190000_budget_allocation_history.sql
-- ============================================================================

-- ============================================================
-- Budget allocation history (session-safe, append-only deltas)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.budget_allocation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  college_id UUID NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  dept_head_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_allocation_history_budget_id
  ON public.budget_allocation_history (budget_id);

CREATE INDEX IF NOT EXISTS idx_budget_allocation_history_college_id
  ON public.budget_allocation_history (college_id);

CREATE INDEX IF NOT EXISTS idx_budget_allocation_history_created_at
  ON public.budget_allocation_history (created_at DESC);

ALTER TABLE public.budget_allocation_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read for authenticated" ON public.budget_allocation_history;
CREATE POLICY "Allow read for authenticated"
  ON public.budget_allocation_history FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert for authenticated" ON public.budget_allocation_history;
CREATE POLICY "Allow insert for authenticated"
  ON public.budget_allocation_history FOR INSERT TO authenticated WITH CHECK (true);

NOTIFY pgrst, 'reload schema';

-- END MIGRATION: 20260409190000_budget_allocation_history.sql


-- ============================================================================
-- BEGIN MIGRATION: 20260410193000_budget_allocation_once_per_session.sql
-- ============================================================================

-- ============================================================================
-- Enforce: WMSU Admin can allocate only once per college per budget session
-- New allocations must happen in a new budget session (new budget_id)
-- ============================================================================

-- Safety: ensure helper exists (already present in FIX_SUPABASE_profiles_login.sql)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role text;
BEGIN
  jwt_role := COALESCE(
    auth.jwt() -> 'user_metadata' ->> 'role',
    auth.jwt() -> 'app_metadata' ->> 'role',
    ''
  );
  IF lower(trim(jwt_role)) = 'admin' THEN
    RETURN TRUE;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND lower(trim(p.role::text)) = 'admin'
  );
END;
$$;

ALTER TABLE public.budget_allocation_history ENABLE ROW LEVEL SECURITY;

-- Replace permissive policies with admin-only policies.
DROP POLICY IF EXISTS "Allow read for authenticated" ON public.budget_allocation_history;
DROP POLICY IF EXISTS "Allow insert for authenticated" ON public.budget_allocation_history;
DROP POLICY IF EXISTS "bah_select_admin" ON public.budget_allocation_history;
DROP POLICY IF EXISTS "bah_insert_admin" ON public.budget_allocation_history;

CREATE POLICY "bah_select_admin"
  ON public.budget_allocation_history
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "bah_insert_admin"
  ON public.budget_allocation_history
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Enforce one allocation row per (budget session, college).
CREATE OR REPLACE FUNCTION public.enforce_single_allocation_per_session()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.budget_allocation_history h
    WHERE h.budget_id = NEW.budget_id
      AND h.college_id = NEW.college_id
  ) THEN
    RAISE EXCEPTION
      'Allocation already exists for this college in the current budget session. Start a new session to allocate again.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_single_allocation_per_session ON public.budget_allocation_history;
CREATE TRIGGER trg_single_allocation_per_session
  BEFORE INSERT ON public.budget_allocation_history
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_single_allocation_per_session();

NOTIFY pgrst, 'reload schema';


-- END MIGRATION: 20260410193000_budget_allocation_once_per_session.sql


-- ============================================================================
-- BEGIN MIGRATION: 20260415120000_grant_budget_fund_sources_authenticated.sql
-- ============================================================================

-- Fix PostgREST "permission denied for table budget_fund_sources" (42501) for logged-in users.
-- RLS policies are not enough without GRANT; Supabase CLI-created tables sometimes omit these.

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.budget_fund_sources TO authenticated;
GRANT ALL ON TABLE public.budget_fund_sources TO service_role;

-- Budgets read/write used by faculty snapshot + admin (403 on /rest/v1/budgets if grants missing)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.budgets TO authenticated;
GRANT ALL ON TABLE public.budgets TO service_role;

-- END MIGRATION: 20260415120000_grant_budget_fund_sources_authenticated.sql


-- ============================================================================
-- BEGIN MIGRATION: 20260415140000_requests_status_procuring.sql
-- ============================================================================

-- College procurement workflow (Procuring, ProcurementDone) and final allowed request statuses.
-- Drop any existing CHECK on requests whose definition references status (name varies by migration).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'requests'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.requests DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- Normalize removed statuses before the new CHECK is applied
UPDATE public.requests SET status = 'Pending' WHERE status = 'Negotiating';
UPDATE public.requests SET status = 'Procuring' WHERE status = 'Ordered';

ALTER TABLE public.requests
  ADD CONSTRAINT requests_status_check CHECK (status IN (
    'Draft',
    'Pending',
    'Approved',
    'Rejected',
    'Procuring',
    'ProcurementDone',
    'Received',
    'Completed'
  ));

-- END MIGRATION: 20260415140000_requests_status_procuring.sql


-- ============================================================================
-- BEGIN MIGRATION: 20260415150000_requests_remove_negotiating_ordered.sql
-- ============================================================================

-- Remove Negotiating and Ordered from requests.status (idempotent for DBs that already ran an older 20260415140000).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'requests'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.requests DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

UPDATE public.requests SET status = 'Pending' WHERE status = 'Negotiating';
UPDATE public.requests SET status = 'Procuring' WHERE status = 'Ordered';

ALTER TABLE public.requests
  ADD CONSTRAINT requests_status_check CHECK (status IN (
    'Draft',
    'Pending',
    'Approved',
    'Rejected',
    'Procuring',
    'ProcurementDone',
    'Received',
    'Completed'
  ));

-- END MIGRATION: 20260415150000_requests_remove_negotiating_ordered.sql


-- ============================================================================
-- BEGIN MIGRATION: 20260416170000_mobile_get_college_requests.sql
-- ============================================================================

-- Mobile helper for College Admin request list.
-- SECURITY DEFINER lets a signed-in DeptHead fetch requests from department users
-- in the handled college without requiring broad direct SELECT on public.profiles.

create or replace function public.mobile_get_college_requests()
returns setof public.requests
language plpgsql
security definer
set search_path = public
as $$
declare
  handled_college text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select c.name
    into handled_college
  from public.colleges c
  where c.handler_id = auth.uid()
  limit 1;

  if handled_college is null then
    select p.department
      into handled_college
    from public.profiles p
    where p.id = auth.uid()
    limit 1;
  end if;

  if handled_college is null then
    return;
  end if;

  return query
  select r.*
  from public.requests r
  where r.requester_id in (
    select p.id
    from public.profiles p
    where p.department = handled_college
  )
  order by r.created_at desc;
end;
$$;

grant execute on function public.mobile_get_college_requests() to authenticated;

notify pgrst, 'reload schema';

-- END MIGRATION: 20260416170000_mobile_get_college_requests.sql


-- ============================================================================
-- BEGIN MIGRATION: 20260416190000_requests_add_procurement_failed.sql
-- ============================================================================

-- Add ProcurementFailed as a valid terminal request status.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'requests'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.requests DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.requests
  ADD CONSTRAINT requests_status_check CHECK (status IN (
    'Draft',
    'Pending',
    'Approved',
    'Rejected',
    'ProcurementFailed',
    'Procuring',
    'ProcurementDone',
    'Received',
    'Completed'
  ));

-- END MIGRATION: 20260416190000_requests_add_procurement_failed.sql


-- ============================================================================
-- BEGIN MIGRATION: 20260420000000_seed_wmsu_colleges.sql
-- ============================================================================

-- Seed the full set of WMSU colleges.
-- Safe to run multiple times (ON CONFLICT DO NOTHING on unique name).
-- No admin (handler_id) is assigned by default. Status is derived from handler_id
-- in the application layer (Active when assigned, Not Active when null).

INSERT INTO public.colleges (name, allocation_mode, allocation_value, is_active)
VALUES
  ('College of Law', 'percentage', 0, true),
  ('College of Agriculture', 'percentage', 0, true),
  ('College of Liberal Arts', 'percentage', 0, true),
  ('College of Architecture', 'percentage', 0, true),
  ('College of Nursing', 'percentage', 0, true),
  ('College of Asian & Islamic Studies', 'percentage', 0, true),
  ('College of Computing Studies', 'percentage', 0, true),
  ('College of Forestry & Environmental Studies', 'percentage', 0, true),
  ('College of Criminal Justice Education', 'percentage', 0, true),
  ('College of Home Economics', 'percentage', 0, true),
  ('College of Engineering', 'percentage', 0, true),
  ('College of Medicine', 'percentage', 0, true),
  ('College of Public Administration & Development Studies', 'percentage', 0, true),
  ('College of Sports Science & Physical Education', 'percentage', 0, true),
  ('College of Science and Mathematics', 'percentage', 0, true),
  ('College of Social Work & Community Development', 'percentage', 0, true),
  ('College of Teacher Education', 'percentage', 0, true),
  ('Professional Science Master''s Program', 'percentage', 0, true)
ON CONFLICT (name) DO NOTHING;

NOTIFY pgrst, 'reload schema';

-- END MIGRATION: 20260420000000_seed_wmsu_colleges.sql


-- ============================================================================
-- BEGIN MIGRATION: 20260420010000_registration_approval.sql
-- ============================================================================

-- =============================================================================
-- Self-sign-up + College Admin approval workflow.
--   * Adds `status` to `profiles` (Pending / Approved / Declined).
--   * Extends the handle_new_user() trigger so self-sign-ups land as Pending
--     and we persist the extra profile fields captured on the sign-up form.
--   * Existing profiles are marked Approved so this change is backwards
--     compatible with current users.
--
-- Password safety note:
--   Supabase Auth stores only bcrypt hashes of user passwords in auth.users.
--   Neither the WMSU Admin nor the College Admin can read raw passwords.
-- =============================================================================

-- Split-name columns (safe to re-run; older deployments may not have these).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name     TEXT,
  ADD COLUMN IF NOT EXISTS middle_initial TEXT,
  ADD COLUMN IF NOT EXISTS family_name    TEXT,
  ADD COLUMN IF NOT EXISTS faculty_department TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Approved'
    CHECK (status IN ('Pending', 'Approved', 'Declined'));

-- Backfill: any row that somehow ended up NULL/other -> Approved.
UPDATE public.profiles SET status = 'Approved' WHERE status IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- Trigger function: called after a new auth.users row is inserted.
-- We read the custom user_metadata fields set by the sign-up flow and
-- build a matching profiles row. When the sign-up form flags
-- registration_status = 'Pending' (self sign-up for a Department user),
-- we mark the profile Pending so the account cannot log in until the
-- College Admin approves it.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  first_name     TEXT := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'first_name', '')), '');
  middle_initial TEXT := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'middle_initial', '')), '');
  family_name    TEXT := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'family_name', '')), '');
  full_name_meta TEXT := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), '');
  computed_full  TEXT := NULLIF(TRIM(CONCAT_WS(' ', first_name, middle_initial, family_name)), '');
  role_val       TEXT := COALESCE(NEW.raw_user_meta_data->>'role', 'Faculty');
  department_val TEXT := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'department', '')), '');
  faculty_dept   TEXT := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'faculty_department', '')), '');
  status_val     TEXT := COALESCE(NEW.raw_user_meta_data->>'registration_status', 'Approved');
BEGIN
  IF status_val NOT IN ('Pending', 'Approved', 'Declined') THEN
    status_val := 'Approved';
  END IF;

  INSERT INTO public.profiles (
    id,
    full_name,
    first_name,
    middle_initial,
    family_name,
    email,
    role,
    department,
    faculty_department,
    status
  )
  VALUES (
    NEW.id,
    COALESCE(computed_full, full_name_meta, NEW.email),
    first_name,
    middle_initial,
    family_name,
    NEW.email,
    role_val,
    department_val,
    faculty_dept,
    status_val
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name          = EXCLUDED.full_name,
    first_name         = COALESCE(EXCLUDED.first_name, public.profiles.first_name),
    middle_initial     = COALESCE(EXCLUDED.middle_initial, public.profiles.middle_initial),
    family_name        = COALESCE(EXCLUDED.family_name, public.profiles.family_name),
    department         = COALESCE(EXCLUDED.department, public.profiles.department),
    faculty_department = COALESCE(EXCLUDED.faculty_department, public.profiles.faculty_department),
    status             = EXCLUDED.status;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

NOTIFY pgrst, 'reload schema';

-- END MIGRATION: 20260420010000_registration_approval.sql


-- ============================================================================
-- BEGIN MIGRATION: 20260420020000_colleges_public_read.sql
-- ============================================================================

-- =============================================================================
-- Allow anonymous (pre-login) visitors to READ the list of colleges so that the
-- public Sign-Up page at /signup can populate the "Select College" dropdown.
--
-- Writes are still restricted to authenticated users via the existing
-- "Allow all for authenticated" policy; this new policy only grants SELECT
-- to the `anon` role.
-- =============================================================================

DROP POLICY IF EXISTS "colleges_public_read" ON public.colleges;
CREATE POLICY "colleges_public_read"
  ON public.colleges FOR SELECT
  TO anon
  USING (true);

GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON TABLE public.colleges TO anon;

NOTIFY pgrst, 'reload schema';

-- END MIGRATION: 20260420020000_colleges_public_read.sql


-- ============================================================================
-- BEGIN MIGRATION: 20260420030000_profiles_college_admin_updates.sql
-- ============================================================================

-- =============================================================================
-- Allow College Admins (DeptHead users) to update profiles that belong to
-- their handled college — specifically so they can approve/decline pending
-- registration requests. Without this, Supabase RLS blocks the UPDATE and
-- PostgREST returns "Cannot coerce the result to a single JSON object"
-- because zero rows are affected.
--
-- WMSU Admins and the row's own user keep their existing update ability.
-- =============================================================================

DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_by_own_admin_or_college_admin" ON public.profiles;

CREATE POLICY "profiles_update_by_own_admin_or_college_admin"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id
    OR public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.colleges c
      WHERE c.handler_id = auth.uid()
        AND c.name = public.profiles.department
    )
  )
  WITH CHECK (
    auth.uid() = id
    OR public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.colleges c
      WHERE c.handler_id = auth.uid()
        AND c.name = public.profiles.department
    )
  );

NOTIFY pgrst, 'reload schema';

-- END MIGRATION: 20260420030000_profiles_college_admin_updates.sql


-- ============================================================================
-- BEGIN MIGRATION: 20260420100000_requests_auto_ris_sai.sql
-- ============================================================================

-- Auto-generate RIS No. and SAI No. for procurement requests.
-- Format: RIS-YYYY-0001 / SAI-YYYY-0001 (Type-Year-4digit-Sequence, per calendar year).
--
-- Design:
--   1. Columns live on public.requests (ris_no, sai_no) so they can be indexed,
--      queried, and joined without parsing the legacy `description` blob.
--   2. A dedicated counter table (public.requisition_counters) gives us atomic,
--      race-free sequence generation via INSERT ... ON CONFLICT ... RETURNING.
--      This is immune to the "two concurrent submits read the same MAX" problem
--      that naive `SELECT MAX+1` approaches have.
--   3. Numbers are assigned by a BEFORE INSERT OR UPDATE trigger at the moment a
--      request transitions to 'Pending' (i.e. when it is "sent"). Drafts stay
--      unnumbered so users can abandon them without burning a sequence.
--   4. The trigger function is SECURITY DEFINER so it can always update the
--      counter regardless of the invoking user's RLS policies.

BEGIN;

-- 1. Add columns --------------------------------------------------------------

ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS ris_no text,
  ADD COLUMN IF NOT EXISTS sai_no text;

-- Partial unique indexes: enforce uniqueness only once a number has been
-- assigned (drafts with NULLs are free to coexist).
CREATE UNIQUE INDEX IF NOT EXISTS requests_ris_no_unique
  ON public.requests (ris_no)
  WHERE ris_no IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS requests_sai_no_unique
  ON public.requests (sai_no)
  WHERE sai_no IS NOT NULL;

-- 2. Counter table ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.requisition_counters (
  year        text PRIMARY KEY,
  last_seq    bigint NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.requisition_counters ENABLE ROW LEVEL SECURITY;

-- Only the trigger function (SECURITY DEFINER) touches this table in practice,
-- but we still add a permissive policy so direct admin queries don't fail.
DROP POLICY IF EXISTS requisition_counters_read ON public.requisition_counters;
CREATE POLICY requisition_counters_read
  ON public.requisition_counters
  FOR SELECT
  TO authenticated
  USING (true);

-- 3. Sequence assignment function --------------------------------------------

CREATE OR REPLACE FUNCTION public.assign_requisition_numbers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year text;
  v_seq  bigint;
  v_tag  text;
BEGIN
  -- Only assign once, and only when the request is actually being sent
  -- (Draft -> Pending transition, or an initial INSERT that already carries
  -- Pending status).
  IF NEW.status = 'Pending'
     AND NEW.ris_no IS NULL
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status)
  THEN
    v_year := to_char(COALESCE(NEW.created_at, now()), 'YYYY');

    -- Atomic increment: one row per year. ON CONFLICT takes a row-level lock,
    -- so concurrent submits are serialized for THIS YEAR ONLY.
    INSERT INTO public.requisition_counters (year, last_seq, updated_at)
         VALUES (v_year, 1, now())
    ON CONFLICT (year) DO UPDATE
       SET last_seq  = public.requisition_counters.last_seq + 1,
           updated_at = now()
    RETURNING last_seq INTO v_seq;

    v_tag := v_year || '-' || lpad(v_seq::text, 4, '0');
    NEW.ris_no := 'RIS-' || v_tag;
    NEW.sai_no := 'SAI-' || v_tag;
  END IF;

  RETURN NEW;
END;
$$;

-- SECURITY DEFINER functions must be owned by a trusted role; ensure the
-- function is callable by app users (Supabase `authenticated` role).
REVOKE ALL ON FUNCTION public.assign_requisition_numbers() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_requisition_numbers() TO authenticated;

-- 4. Trigger ------------------------------------------------------------------

DROP TRIGGER IF EXISTS requests_assign_ris_sai ON public.requests;
CREATE TRIGGER requests_assign_ris_sai
  BEFORE INSERT OR UPDATE OF status
  ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_requisition_numbers();

-- 5. Backfill existing non-Draft requests -------------------------------------
-- Give every request that has already been submitted a RIS/SAI number so the
-- UI can render them consistently. We order by created_at so the first request
-- of each year gets -0001, the second -0002, etc.

DO $$
DECLARE
  r record;
  v_year text;
  v_seq  bigint;
  v_tag  text;
BEGIN
  FOR r IN
    SELECT id, created_at
      FROM public.requests
     WHERE status <> 'Draft'
       AND ris_no IS NULL
     ORDER BY created_at ASC
  LOOP
    v_year := to_char(COALESCE(r.created_at, now()), 'YYYY');

    INSERT INTO public.requisition_counters (year, last_seq, updated_at)
         VALUES (v_year, 1, now())
    ON CONFLICT (year) DO UPDATE
       SET last_seq  = public.requisition_counters.last_seq + 1,
           updated_at = now()
    RETURNING last_seq INTO v_seq;

    v_tag := v_year || '-' || lpad(v_seq::text, 4, '0');

    UPDATE public.requests
       SET ris_no = 'RIS-' || v_tag,
           sai_no = 'SAI-' || v_tag
     WHERE id = r.id;
  END LOOP;
END $$;

COMMIT;

-- END MIGRATION: 20260420100000_requests_auto_ris_sai.sql


-- ============================================================================
-- BEGIN MIGRATION: 20260420120000_requisition_integrity.sql
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS submitted_payload_hash text,
  ADD COLUMN IF NOT EXISTS latest_payload_hash text,
  ADD COLUMN IF NOT EXISTS integrity_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_integrity_reason text;

CREATE TABLE IF NOT EXISTS public.request_integrity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (
    event_type IN (
      'submit_locked',
      'admin_edit',
      'approved_with_reason',
      'declined_with_reason',
      'procurement_failed_with_reason',
      'legacy_backfill'
    )
  ),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason text,
  before_payload jsonb,
  after_payload jsonb,
  payload_hash_before text,
  payload_hash_after text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_request_integrity_events_request_id
  ON public.request_integrity_events(request_id, created_at DESC);

ALTER TABLE public.request_integrity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS request_integrity_events_read_auth ON public.request_integrity_events;
CREATE POLICY request_integrity_events_read_auth
  ON public.request_integrity_events
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS request_integrity_events_insert_auth ON public.request_integrity_events;
CREATE POLICY request_integrity_events_insert_auth
  ON public.request_integrity_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = actor_id);

DROP POLICY IF EXISTS request_integrity_events_insert_service ON public.request_integrity_events;
CREATE POLICY request_integrity_events_insert_service
  ON public.request_integrity_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS request_integrity_events_update_none ON public.request_integrity_events;
CREATE POLICY request_integrity_events_update_none
  ON public.request_integrity_events
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS request_integrity_events_delete_none ON public.request_integrity_events;
CREATE POLICY request_integrity_events_delete_none
  ON public.request_integrity_events
  FOR DELETE
  TO authenticated
  USING (false);

CREATE OR REPLACE FUNCTION public.compute_request_integrity_hash(
  p_item_name text,
  p_description text,
  p_quantity numeric,
  p_unit_price numeric,
  p_total_price numeric,
  p_budget_fund_source_id uuid,
  p_college_budget_type_id uuid
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(
    extensions.digest(
      coalesce(trim(p_item_name), '') || '|' ||
      coalesce(trim(p_description), '') || '|' ||
      coalesce(p_quantity::text, '0') || '|' ||
      coalesce(p_unit_price::text, '0') || '|' ||
      coalesce(p_total_price::text, '0') || '|' ||
      coalesce(p_budget_fund_source_id::text, '') || '|' ||
      coalesce(p_college_budget_type_id::text, ''),
      'sha256'
    ),
    'hex'
  );
$$;

CREATE OR REPLACE FUNCTION public.enforce_request_integrity_guardrails()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_is_requester boolean;
  v_protected_changed boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  v_is_requester := (OLD.requester_id = auth.uid());

  v_protected_changed := (
    NEW.item_name IS DISTINCT FROM OLD.item_name OR
    NEW.description IS DISTINCT FROM OLD.description OR
    NEW.quantity IS DISTINCT FROM OLD.quantity OR
    NEW.unit_price IS DISTINCT FROM OLD.unit_price OR
    NEW.total_price IS DISTINCT FROM OLD.total_price OR
    NEW.budget_fund_source_id IS DISTINCT FROM OLD.budget_fund_source_id OR
    NEW.college_budget_type_id IS DISTINCT FROM OLD.college_budget_type_id
  );

  IF v_role = 'Faculty' AND v_is_requester AND OLD.status <> 'Draft' THEN
    IF v_protected_changed THEN
      RAISE EXCEPTION 'Submitted requisitions are immutable for faculty.';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NOT (OLD.status = 'ProcurementDone' AND NEW.status = 'Received') THEN
        RAISE EXCEPTION 'Faculty can only confirm receipt when procurement is done.';
      END IF;
    END IF;
  END IF;

  IF v_role IN ('DeptHead', 'Admin') AND v_protected_changed THEN
    IF coalesce(trim(NEW.last_integrity_reason), '') = '' THEN
      RAISE EXCEPTION 'A reason is required for requisition edits.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_request_integrity_guardrails ON public.requests;
CREATE TRIGGER trg_enforce_request_integrity_guardrails
  BEFORE UPDATE ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_request_integrity_guardrails();

CREATE OR REPLACE FUNCTION public.update_request_integrity_version_hash()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.event_type = 'admin_edit' THEN
      UPDATE public.requests
         SET integrity_version = greatest(1, coalesce(integrity_version, 1)) + 1,
             latest_payload_hash = coalesce(NEW.payload_hash_after, latest_payload_hash),
             last_integrity_reason = coalesce(NEW.reason, last_integrity_reason)
       WHERE id = NEW.request_id;
    ELSIF NEW.event_type IN ('approved_with_reason', 'declined_with_reason', 'procurement_failed_with_reason') THEN
      UPDATE public.requests
         SET last_integrity_reason = coalesce(NEW.reason, last_integrity_reason)
       WHERE id = NEW.request_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_request_integrity_events_apply_request_patch ON public.request_integrity_events;
CREATE TRIGGER trg_request_integrity_events_apply_request_patch
  AFTER INSERT ON public.request_integrity_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_request_integrity_version_hash();

DO $$
DECLARE
  r record;
  v_hash text;
  v_structured boolean;
BEGIN
  FOR r IN
    SELECT id, item_name, description, quantity, unit_price, total_price, budget_fund_source_id, college_budget_type_id, status
    FROM public.requests
  LOOP
    v_structured := coalesce(r.description, '') LIKE '%Requisition Items:%' AND coalesce(r.description, '') LIKE '%Signatories:%';
    IF v_structured THEN
      v_hash := public.compute_request_integrity_hash(
        r.item_name,
        r.description,
        r.quantity,
        r.unit_price,
        r.total_price,
        r.budget_fund_source_id,
        r.college_budget_type_id
      );
      UPDATE public.requests
         SET submitted_payload_hash = coalesce(submitted_payload_hash, v_hash),
             latest_payload_hash = coalesce(latest_payload_hash, v_hash),
             integrity_version = coalesce(integrity_version, 1)
       WHERE id = r.id;

      INSERT INTO public.request_integrity_events (
        request_id,
        event_type,
        actor_id,
        reason,
        after_payload,
        payload_hash_after
      )
      SELECT r.id,
             'legacy_backfill',
             null,
             'Backfilled integrity hash for existing structured requisition.',
             jsonb_build_object(
               'item_name', r.item_name,
               'description', r.description,
               'quantity', r.quantity,
               'unit_price', r.unit_price,
               'total_price', r.total_price
             ),
             v_hash
      WHERE NOT EXISTS (
        SELECT 1 FROM public.request_integrity_events e
        WHERE e.request_id = r.id AND e.event_type = 'legacy_backfill'
      );
    ELSE
      UPDATE public.requests
         SET submitted_payload_hash = null,
             latest_payload_hash = null,
             last_integrity_reason = coalesce(last_integrity_reason, 'legacy_unhashed')
       WHERE id = r.id;
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- END MIGRATION: 20260420120000_requisition_integrity.sql


-- ============================================================================
-- BEGIN MIGRATION: 20260420133000_requests_rls_and_atomic_workflow.sql
-- ============================================================================

BEGIN;

ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS requisition_payload jsonb;

CREATE OR REPLACE FUNCTION public.compute_request_integrity_hash_v2(
  p_item_name text,
  p_description text,
  p_requisition_payload jsonb,
  p_quantity numeric,
  p_unit_price numeric,
  p_total_price numeric,
  p_budget_fund_source_id uuid,
  p_college_budget_type_id uuid
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(
    extensions.digest(
      coalesce(trim(p_item_name), '') || '|' ||
      coalesce(trim(p_description), '') || '|' ||
      coalesce(p_requisition_payload::text, '{}') || '|' ||
      coalesce(p_quantity::text, '0') || '|' ||
      coalesce(p_unit_price::text, '0') || '|' ||
      coalesce(p_total_price::text, '0') || '|' ||
      coalesce(p_budget_fund_source_id::text, '') || '|' ||
      coalesce(p_college_budget_type_id::text, ''),
      'sha256'
    ),
    'hex'
  );
$$;

CREATE OR REPLACE FUNCTION public.request_actor_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'Admin'
  );
$$;

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
    SELECT r.id, r.requester_id, rp.department AS requester_college
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
            AND c.name = req.requester_college
        )
      )
  );
$$;

DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'requests'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.requests', p.policyname);
  END LOOP;
END $$;

CREATE POLICY requests_select_policy
  ON public.requests
  FOR SELECT
  TO authenticated
  USING (
    requester_id = auth.uid()
    OR public.request_actor_can_manage(id)
  );

CREATE POLICY requests_insert_faculty_draft
  ON public.requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    requester_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'Faculty'
    )
    AND coalesce(status, 'Draft') = 'Draft'
  );

CREATE POLICY requests_update_requester_limited
  ON public.requests
  FOR UPDATE
  TO authenticated
  USING (requester_id = auth.uid())
  WITH CHECK (
    requester_id = auth.uid()
    AND (
      status IN ('Draft', 'Pending', 'Received')
    )
  );

CREATE POLICY requests_update_manager_policy
  ON public.requests
  FOR UPDATE
  TO authenticated
  USING (public.request_actor_can_manage(id))
  WITH CHECK (public.request_actor_can_manage(id));

CREATE POLICY requests_delete_requester_draft_only
  ON public.requests
  FOR DELETE
  TO authenticated
  USING (
    requester_id = auth.uid()
    AND status = 'Draft'
  );

DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'request_integrity_events'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.request_integrity_events', p.policyname);
  END LOOP;
END $$;

CREATE POLICY request_integrity_events_read_policy
  ON public.request_integrity_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.requests r
      WHERE r.id = request_id
        AND (
          r.requester_id = auth.uid()
          OR public.request_actor_can_manage(r.id)
        )
    )
  );

CREATE POLICY request_integrity_events_insert_service_only
  ON public.request_integrity_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.enforce_request_status_transitions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'UPDATE' OR NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'Draft' AND NEW.status = 'Pending' THEN RETURN NEW; END IF;
  IF OLD.status = 'Pending' AND NEW.status IN ('Approved', 'Rejected') THEN RETURN NEW; END IF;
  IF OLD.status = 'Approved' AND NEW.status IN ('Procuring', 'Rejected') THEN RETURN NEW; END IF;
  IF OLD.status = 'Procuring' AND NEW.status IN ('ProcurementDone', 'ProcurementFailed') THEN RETURN NEW; END IF;
  IF OLD.status = 'ProcurementDone' AND NEW.status = 'Received' THEN RETURN NEW; END IF;
  IF OLD.status = 'Received' AND NEW.status = 'Completed' THEN RETURN NEW; END IF;

  RAISE EXCEPTION 'Invalid request status transition: % -> %', OLD.status, NEW.status;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_request_status_transitions ON public.requests;
CREATE TRIGGER trg_enforce_request_status_transitions
  BEFORE UPDATE OF status ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_request_status_transitions();

CREATE OR REPLACE FUNCTION public.request_submit_atomic(p_request_id uuid)
RETURNS public.requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.requests;
  v_hash text;
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

  UPDATE public.requests
     SET status = 'Pending',
         submitted_payload_hash = coalesce(submitted_payload_hash, v_hash),
         latest_payload_hash = v_hash,
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

CREATE OR REPLACE FUNCTION public.request_approve_with_reason_atomic(
  p_request_id uuid,
  p_reason text,
  p_college_budget_type_id uuid DEFAULT NULL
)
RETURNS public.requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.requests;
  v_from_status text;
BEGIN
  IF coalesce(trim(p_reason), '') = '' THEN RAISE EXCEPTION 'Reason is required.'; END IF;
  IF NOT public.request_actor_can_manage(p_request_id) THEN RAISE EXCEPTION 'Not allowed.'; END IF;
  SELECT * INTO v_req FROM public.requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found.'; END IF;
  IF v_req.status <> 'Pending' THEN RAISE EXCEPTION 'Only Pending requests can be approved.'; END IF;

  UPDATE public.requests
     SET status = 'Approved',
         approved_by = auth.uid(),
         approved_at = now(),
         college_budget_type_id = p_college_budget_type_id,
         last_integrity_reason = trim(p_reason),
         updated_at = now()
   WHERE id = p_request_id
   RETURNING * INTO v_req;

  INSERT INTO public.request_integrity_events (
    request_id, event_type, actor_id, reason, before_payload, after_payload, payload_hash_before, payload_hash_after
  ) VALUES (
    p_request_id, 'approved_with_reason', auth.uid(), trim(p_reason),
    jsonb_build_object('status', 'Pending'),
    jsonb_build_object('status', 'Approved'),
    v_req.latest_payload_hash,
    v_req.latest_payload_hash
  );

  RETURN v_req;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_decline_with_reason_atomic(
  p_request_id uuid,
  p_reason text
)
RETURNS public.requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.requests;
  v_from_status text;
BEGIN
  IF coalesce(trim(p_reason), '') = '' THEN RAISE EXCEPTION 'Reason is required.'; END IF;
  IF NOT public.request_actor_can_manage(p_request_id) THEN RAISE EXCEPTION 'Not allowed.'; END IF;
  SELECT * INTO v_req FROM public.requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found.'; END IF;
  IF v_req.status NOT IN ('Pending', 'Approved') THEN RAISE EXCEPTION 'Request cannot be declined in this status.'; END IF;

  v_from_status := v_req.status;

  UPDATE public.requests
     SET status = 'Rejected',
         rejection_reason = trim(p_reason),
         approved_by = auth.uid(),
         approved_at = now(),
         last_integrity_reason = trim(p_reason),
         updated_at = now()
   WHERE id = p_request_id
   RETURNING * INTO v_req;

  INSERT INTO public.request_integrity_events (
    request_id, event_type, actor_id, reason, before_payload, after_payload, payload_hash_before, payload_hash_after
  ) VALUES (
    p_request_id, 'declined_with_reason', auth.uid(), trim(p_reason),
    jsonb_build_object('status', v_from_status),
    jsonb_build_object('status', 'Rejected'),
    v_req.latest_payload_hash,
    v_req.latest_payload_hash
  );

  RETURN v_req;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_procurement_failed_with_reason_atomic(
  p_request_id uuid,
  p_reason text
)
RETURNS public.requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.requests;
BEGIN
  IF coalesce(trim(p_reason), '') = '' THEN RAISE EXCEPTION 'Reason is required.'; END IF;
  IF NOT public.request_actor_can_manage(p_request_id) THEN RAISE EXCEPTION 'Not allowed.'; END IF;
  SELECT * INTO v_req FROM public.requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found.'; END IF;
  IF v_req.status <> 'Procuring' THEN RAISE EXCEPTION 'Only Procuring requests can be marked failed.'; END IF;

  UPDATE public.requests
     SET status = 'ProcurementFailed',
         rejection_reason = trim(p_reason),
         last_integrity_reason = trim(p_reason),
         updated_at = now()
   WHERE id = p_request_id
   RETURNING * INTO v_req;

  INSERT INTO public.request_integrity_events (
    request_id, event_type, actor_id, reason, before_payload, after_payload, payload_hash_before, payload_hash_after
  ) VALUES (
    p_request_id, 'procurement_failed_with_reason', auth.uid(), trim(p_reason),
    jsonb_build_object('status', 'Procuring'),
    jsonb_build_object('status', 'ProcurementFailed'),
    v_req.latest_payload_hash,
    v_req.latest_payload_hash
  );

  RETURN v_req;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_adjust_with_reason_atomic(
  p_request_id uuid,
  p_description text,
  p_requisition_payload jsonb,
  p_quantity integer,
  p_unit_price numeric,
  p_reason text,
  p_status text DEFAULT NULL
)
RETURNS public.requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before public.requests;
  v_after public.requests;
  v_hash_before text;
  v_hash_after text;
  v_total numeric;
BEGIN
  IF coalesce(trim(p_reason), '') = '' THEN RAISE EXCEPTION 'Reason is required.'; END IF;
  IF NOT public.request_actor_can_manage(p_request_id) THEN RAISE EXCEPTION 'Not allowed.'; END IF;
  IF p_quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be greater than zero.'; END IF;
  IF p_unit_price < 0 THEN RAISE EXCEPTION 'Unit price cannot be negative.'; END IF;

  SELECT * INTO v_before FROM public.requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found.'; END IF;

  v_total := round((p_quantity::numeric * p_unit_price)::numeric, 2);
  v_hash_before := coalesce(v_before.latest_payload_hash, public.compute_request_integrity_hash_v2(
    v_before.item_name, v_before.description, v_before.requisition_payload, v_before.quantity, v_before.unit_price, v_before.total_price,
    v_before.budget_fund_source_id, v_before.college_budget_type_id
  ));
  v_hash_after := public.compute_request_integrity_hash_v2(
    v_before.item_name, p_description, p_requisition_payload, p_quantity, p_unit_price, v_total,
    v_before.budget_fund_source_id, v_before.college_budget_type_id
  );

  UPDATE public.requests
     SET description = p_description,
         requisition_payload = coalesce(p_requisition_payload, requisition_payload),
         quantity = p_quantity,
         unit_price = p_unit_price,
         total_price = v_total,
         status = coalesce(p_status, status),
         latest_payload_hash = v_hash_after,
         last_integrity_reason = trim(p_reason),
         updated_at = now()
   WHERE id = p_request_id
   RETURNING * INTO v_after;

  INSERT INTO public.request_integrity_events (
    request_id, event_type, actor_id, reason, before_payload, after_payload, payload_hash_before, payload_hash_after
  ) VALUES (
    p_request_id, 'admin_edit', auth.uid(), trim(p_reason),
    jsonb_build_object(
      'description', v_before.description,
      'quantity', v_before.quantity,
      'unit_price', v_before.unit_price,
      'total_price', v_before.total_price,
      'status', v_before.status
    ),
    jsonb_build_object(
      'description', v_after.description,
      'quantity', v_after.quantity,
      'unit_price', v_after.unit_price,
      'total_price', v_after.total_price,
      'status', v_after.status
    ),
    v_hash_before,
    v_hash_after
  );

  RETURN v_after;
END;
$$;

REVOKE ALL ON FUNCTION public.request_submit_atomic(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_approve_with_reason_atomic(uuid, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_decline_with_reason_atomic(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_procurement_failed_with_reason_atomic(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_adjust_with_reason_atomic(uuid, text, jsonb, integer, numeric, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.request_submit_atomic(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_approve_with_reason_atomic(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_decline_with_reason_atomic(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_procurement_failed_with_reason_atomic(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_adjust_with_reason_atomic(uuid, text, jsonb, integer, numeric, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- END MIGRATION: 20260420133000_requests_rls_and_atomic_workflow.sql


-- ============================================================================
-- BEGIN MIGRATION: 20260421100000_budget_ceiling_and_budget_type_rls_hardening.sql
-- ============================================================================

BEGIN;

-- -----------------------------------------------------
-- Helpers: college + budget ceiling checks for requests
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_request_requester_college_id(p_request_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id
  FROM public.requests r
  JOIN public.profiles rp ON rp.id = r.requester_id
  JOIN public.colleges c ON c.name = rp.department
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
  JOIN public.profiles rp ON rp.id = r.requester_id
  JOIN public.colleges c ON c.name = rp.department
  WHERE c.id = p_college_id
    AND r.status IN ('Approved', 'Procuring', 'ProcurementDone', 'Received', 'Completed');
$$;

CREATE OR REPLACE FUNCTION public.get_budget_type_committed_total(p_budget_type_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(sum(total_price), 0)
  FROM public.requests
  WHERE college_budget_type_id = p_budget_type_id
    AND status IN ('Approved', 'Procuring', 'ProcurementDone', 'Received', 'Completed');
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
  LEFT JOIN public.colleges c ON c.name = rp.department
  WHERE r.id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found.';
  END IF;

  IF v_college_id IS NULL THEN
    -- Keep backward compatibility for legacy rows with no resolvable college mapping.
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

-- -----------------------------------------------------
-- Harden atomic workflow functions with budget checks
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_approve_with_reason_atomic(
  p_request_id uuid,
  p_reason text,
  p_college_budget_type_id uuid DEFAULT NULL
)
RETURNS public.requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.requests;
BEGIN
  IF coalesce(trim(p_reason), '') = '' THEN RAISE EXCEPTION 'Reason is required.'; END IF;
  IF NOT public.request_actor_can_manage(p_request_id) THEN RAISE EXCEPTION 'Not allowed.'; END IF;

  SELECT * INTO v_req FROM public.requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found.'; END IF;
  IF v_req.status <> 'Pending' THEN RAISE EXCEPTION 'Only Pending requests can be approved.'; END IF;

  PERFORM public.enforce_request_budget_ceiling(
    p_request_id,
    coalesce(v_req.total_price, 0),
    p_college_budget_type_id
  );

  UPDATE public.requests
     SET status = 'Approved',
         approved_by = auth.uid(),
         approved_at = now(),
         college_budget_type_id = p_college_budget_type_id,
         last_integrity_reason = trim(p_reason),
         updated_at = now()
   WHERE id = p_request_id
   RETURNING * INTO v_req;

  INSERT INTO public.request_integrity_events (
    request_id, event_type, actor_id, reason, before_payload, after_payload, payload_hash_before, payload_hash_after
  ) VALUES (
    p_request_id, 'approved_with_reason', auth.uid(), trim(p_reason),
    jsonb_build_object('status', 'Pending'),
    jsonb_build_object('status', 'Approved'),
    v_req.latest_payload_hash,
    v_req.latest_payload_hash
  );

  RETURN v_req;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_adjust_with_reason_atomic(
  p_request_id uuid,
  p_description text,
  p_requisition_payload jsonb,
  p_quantity integer,
  p_unit_price numeric,
  p_reason text,
  p_status text DEFAULT NULL
)
RETURNS public.requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before public.requests;
  v_after public.requests;
  v_hash_before text;
  v_hash_after text;
  v_total numeric;
BEGIN
  IF coalesce(trim(p_reason), '') = '' THEN RAISE EXCEPTION 'Reason is required.'; END IF;
  IF NOT public.request_actor_can_manage(p_request_id) THEN RAISE EXCEPTION 'Not allowed.'; END IF;
  IF p_quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be greater than zero.'; END IF;
  IF p_unit_price < 0 THEN RAISE EXCEPTION 'Unit price cannot be negative.'; END IF;

  SELECT * INTO v_before FROM public.requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found.'; END IF;

  v_total := round((p_quantity::numeric * p_unit_price)::numeric, 2);

  IF coalesce(p_status, v_before.status) IN ('Approved', 'Procuring', 'ProcurementDone', 'Received', 'Completed') THEN
    PERFORM public.enforce_request_budget_ceiling(
      p_request_id,
      v_total,
      v_before.college_budget_type_id
    );
  END IF;

  v_hash_before := coalesce(v_before.latest_payload_hash, public.compute_request_integrity_hash_v2(
    v_before.item_name, v_before.description, v_before.requisition_payload, v_before.quantity, v_before.unit_price, v_before.total_price,
    v_before.budget_fund_source_id, v_before.college_budget_type_id
  ));
  v_hash_after := public.compute_request_integrity_hash_v2(
    v_before.item_name, p_description, p_requisition_payload, p_quantity, p_unit_price, v_total,
    v_before.budget_fund_source_id, v_before.college_budget_type_id
  );

  UPDATE public.requests
     SET description = p_description,
         requisition_payload = coalesce(p_requisition_payload, requisition_payload),
         quantity = p_quantity,
         unit_price = p_unit_price,
         total_price = v_total,
         status = coalesce(p_status, status),
         latest_payload_hash = v_hash_after,
         last_integrity_reason = trim(p_reason),
         updated_at = now()
   WHERE id = p_request_id
   RETURNING * INTO v_after;

  INSERT INTO public.request_integrity_events (
    request_id, event_type, actor_id, reason, before_payload, after_payload, payload_hash_before, payload_hash_after
  ) VALUES (
    p_request_id, 'admin_edit', auth.uid(), trim(p_reason),
    jsonb_build_object(
      'description', v_before.description,
      'quantity', v_before.quantity,
      'unit_price', v_before.unit_price,
      'total_price', v_before.total_price,
      'status', v_before.status
    ),
    jsonb_build_object(
      'description', v_after.description,
      'quantity', v_after.quantity,
      'unit_price', v_after.unit_price,
      'total_price', v_after.total_price,
      'status', v_after.status
    ),
    v_hash_before,
    v_hash_after
  );

  RETURN v_after;
END;
$$;

-- -----------------------------------------------------
-- Tighten college_budget_types RLS (no global write)
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_manage_college_budget_type(p_college_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles me
    WHERE me.id = auth.uid()
      AND (
        me.role = 'Admin'
        OR (
          me.role = 'DeptHead'
          AND EXISTS (
            SELECT 1
            FROM public.colleges c
            WHERE c.id = p_college_id
              AND c.handler_id = me.id
          )
        )
      )
  );
$$;

DROP POLICY IF EXISTS "Allow all for authenticated" ON public.college_budget_types;

CREATE POLICY college_budget_types_read_authenticated
ON public.college_budget_types
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY college_budget_types_insert_managers
ON public.college_budget_types
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_college_budget_type(college_id));

CREATE POLICY college_budget_types_update_managers
ON public.college_budget_types
FOR UPDATE
TO authenticated
USING (public.can_manage_college_budget_type(college_id))
WITH CHECK (public.can_manage_college_budget_type(college_id));

CREATE POLICY college_budget_types_delete_managers
ON public.college_budget_types
FOR DELETE
TO authenticated
USING (public.can_manage_college_budget_type(college_id));

NOTIFY pgrst, 'reload schema';

COMMIT;

-- END MIGRATION: 20260421100000_budget_ceiling_and_budget_type_rls_hardening.sql


-- ============================================================================
-- BEGIN MIGRATION: 20260421103000_request_comments_live_chat_rls.sql
-- ============================================================================

BEGIN;

ALTER TABLE public.request_comments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.request_chat_allowed(p_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.requests r
    WHERE r.id = p_request_id
      AND (
        r.status IN ('Rejected', 'ProcurementFailed')
        OR EXISTS (
          SELECT 1
          FROM public.request_integrity_events e
          WHERE e.request_id = r.id
            AND e.event_type = 'admin_edit'
        )
      )
  );
$$;

DROP POLICY IF EXISTS request_comments_select_policy ON public.request_comments;
CREATE POLICY request_comments_select_policy
  ON public.request_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.requests r
      WHERE r.id = request_id
        AND (
          r.requester_id = auth.uid()
          OR public.request_actor_can_manage(r.id)
        )
    )
  );

DROP POLICY IF EXISTS request_comments_insert_policy ON public.request_comments;
CREATE POLICY request_comments_insert_policy
  ON public.request_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND public.request_chat_allowed(request_id)
    AND EXISTS (
      SELECT 1
      FROM public.requests r
      WHERE r.id = request_id
        AND (
          r.requester_id = auth.uid()
          OR public.request_actor_can_manage(r.id)
        )
    )
  );

DROP POLICY IF EXISTS request_comments_update_none ON public.request_comments;
CREATE POLICY request_comments_update_none
  ON public.request_comments
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS request_comments_delete_none ON public.request_comments;
CREATE POLICY request_comments_delete_none
  ON public.request_comments
  FOR DELETE
  TO authenticated
  USING (false);

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.request_comments;
  EXCEPTION
    WHEN duplicate_object THEN
      NULL;
  END;
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- END MIGRATION: 20260421103000_request_comments_live_chat_rls.sql


-- ============================================================================
-- BEGIN MIGRATION: 20260421123000_requisition_submitted_snapshot.sql
-- ============================================================================

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

-- END MIGRATION: 20260421123000_requisition_submitted_snapshot.sql


-- ============================================================================
-- BEGIN MIGRATION: 20260421170000_requests_insert_policy_allow_department_role.sql
-- ============================================================================

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

-- END MIGRATION: 20260421170000_requests_insert_policy_allow_department_role.sql


-- ============================================================================
-- BEGIN MIGRATION: 20260421183000_lock_ris_sai_after_assignment.sql
-- ============================================================================

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

-- END MIGRATION: 20260421183000_lock_ris_sai_after_assignment.sql


-- ============================================================================
-- BEGIN MIGRATION: 20260422110000_enforce_school_year_format_on_budgets.sql
-- ============================================================================

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

-- END MIGRATION: 20260422110000_enforce_school_year_format_on_budgets.sql


-- ============================================================================
-- BEGIN MIGRATION: 20260423100000_departments_master_table.sql
-- ============================================================================

-- Departments master table for college-scoped ownership and integrity.
-- Path 2 rollout: College Admins manage departments; user flows consume this table.

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists departments_unique_college_name_ci
  on public.departments (college_id, lower(btrim(name)));

create index if not exists idx_departments_college_id on public.departments(college_id);
create index if not exists idx_departments_active on public.departments(is_active);

create or replace function public.departments_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists departments_updated_at_trigger on public.departments;
create trigger departments_updated_at_trigger
before update on public.departments
for each row execute procedure public.departments_set_updated_at();

alter table public.departments enable row level security;

drop policy if exists "departments_public_read" on public.departments;
create policy "departments_public_read"
  on public.departments for select
  to anon
  using (is_active = true);

drop policy if exists "departments_authenticated_read" on public.departments;
create policy "departments_authenticated_read"
  on public.departments for select
  to authenticated
  using (true);

drop policy if exists "departments_insert_admin_or_college_admin" on public.departments;
create policy "departments_insert_admin_or_college_admin"
  on public.departments for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles me
      where me.id = auth.uid()
        and (
          me.role = 'Admin'
          or (
            me.role = 'DeptHead'
            and exists (
              select 1
              from public.colleges c
              where c.id = departments.college_id
                and c.handler_id = auth.uid()
            )
          )
        )
    )
  );

drop policy if exists "departments_update_admin_or_college_admin" on public.departments;
create policy "departments_update_admin_or_college_admin"
  on public.departments for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles me
      join public.colleges c on c.id = departments.college_id
      where me.id = auth.uid()
        and (
          me.role = 'Admin'
          or (me.role = 'DeptHead' and c.handler_id = auth.uid())
        )
    )
  )
  with check (
    exists (
      select 1
      from public.profiles me
      join public.colleges c on c.id = departments.college_id
      where me.id = auth.uid()
        and (
          me.role = 'Admin'
          or (me.role = 'DeptHead' and c.handler_id = auth.uid())
        )
    )
  );

drop policy if exists "departments_delete_admin_or_college_admin" on public.departments;
create policy "departments_delete_admin_or_college_admin"
  on public.departments for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles me
      join public.colleges c on c.id = departments.college_id
      where me.id = auth.uid()
        and (
          me.role = 'Admin'
          or (me.role = 'DeptHead' and c.handler_id = auth.uid())
        )
    )
  );

grant select on table public.departments to anon;
grant all on table public.departments to authenticated;
grant all on table public.departments to service_role;

alter table public.profiles
  add column if not exists faculty_department_id uuid references public.departments(id) on delete set null;

insert into public.departments (college_id, name, created_by)
select distinct
  c.id,
  btrim(p.faculty_department) as department_name,
  null::uuid
from public.profiles p
join public.colleges c
  on c.name = p.department
where p.faculty_department is not null
  and btrim(p.faculty_department) <> ''
on conflict (college_id, lower(btrim(name))) do nothing;

update public.profiles p
set faculty_department_id = d.id
from public.colleges c,
     public.departments d
where p.department = c.name
  and d.college_id = c.id
  and lower(btrim(d.name)) = lower(btrim(p.faculty_department))
  and p.faculty_department is not null
  and btrim(p.faculty_department) <> ''
  and (p.faculty_department_id is null or p.faculty_department_id <> d.id);

-- END MIGRATION: 20260423100000_departments_master_table.sql


-- ============================================================================
-- BEGIN MIGRATION: add_profiles_approved_budget.sql
-- ============================================================================

-- Add approved_budget to profiles (amount approved for faculty; shown on their dashboard)
-- Run in Supabase SQL Editor.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS approved_budget NUMERIC(12, 2) DEFAULT NULL;

COMMENT ON COLUMN profiles.approved_budget IS 'Budget amount approved for this user (Faculty). Shown as "Your approved budget" on their dashboard.';

-- END MIGRATION: add_profiles_approved_budget.sql


-- ============================================================================
-- BEGIN MIGRATION: add_profiles_faculty_department.sql
-- ============================================================================

-- Faculty-only: department unit within the selected college (Users page "Department" field).
-- Run in Supabase → SQL Editor if this column is missing.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS faculty_department text;

COMMENT ON COLUMN public.profiles.faculty_department IS 'Department within the college (Faculty users only).';

-- END MIGRATION: add_profiles_faculty_department.sql


-- ============================================================================
-- BEGIN MIGRATION: drop_budgets_academic_year_unique.sql
-- ============================================================================

-- Allow duplicate academic years in budgets (each addition is listed as history).
-- Run this in Supabase SQL Editor if you get: duplicate key value violates unique constraint "budgets_academic_year_key"

ALTER TABLE budgets
  DROP CONSTRAINT IF EXISTS budgets_academic_year_key;

-- END MIGRATION: drop_budgets_academic_year_unique.sql

