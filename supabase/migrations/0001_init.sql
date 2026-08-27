-- SonicAurora — core schema
--
-- Three tables, matching the three things src/lib/ reads and writes:
--   app_documents    per-listener documents (attunement, playback, trial meter)
--   shared_documents app-wide content the owner authors (the frequency catalog)
--   entitlements     memberships, written only by the Stripe webhook
--
-- Everything is locked down with RLS. The anon key is public by definition, so
-- the policies below — not the client — are what actually protect the data.

-- ─────────────────────────────────────────────────────────────
-- App owners
-- ─────────────────────────────────────────────────────────────
-- Membership of this table is what grants the artist portal and the right to
-- edit the shared catalog. Add yourself after your first sign-in:
--   insert into public.app_owners (user_id) values ('<your-auth-uid>');

create table if not exists public.app_owners (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_owners enable row level security;

create policy "owners readable by owners"
  on public.app_owners for select
  to authenticated
  using (user_id = auth.uid());

create or replace function public.is_app_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.app_owners where user_id = auth.uid());
$$;

-- ─────────────────────────────────────────────────────────────
-- Per-listener documents
-- ─────────────────────────────────────────────────────────────
create table if not exists public.app_documents (
  user_id    uuid not null references auth.users (id) on delete cascade,
  collection text not null,
  doc_id     text not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, collection, doc_id)
);

create index if not exists app_documents_user_collection_idx
  on public.app_documents (user_id, collection, updated_at desc);

alter table public.app_documents enable row level security;

-- A listener may do anything to their own documents, and nothing to anyone
-- else's. `with check` on write is what stops a forged user_id.
create policy "own documents readable"
  on public.app_documents for select
  to authenticated
  using (user_id = auth.uid());

create policy "own documents insertable"
  on public.app_documents for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "own documents updatable"
  on public.app_documents for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "own documents deletable"
  on public.app_documents for delete
  to authenticated
  using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- Shared, app-wide content (the frequency catalog)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.shared_documents (
  id         uuid primary key default gen_random_uuid(),
  collection text not null,
  doc_id     text not null,
  data       jsonb not null default '{}'::jsonb,
  position   integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (collection, doc_id)
);

create index if not exists shared_documents_collection_idx
  on public.shared_documents (collection, position);

alter table public.shared_documents enable row level security;

-- Readable by everyone including signed-out visitors: the library is the first
-- thing the app shows, and it must render before anyone has an account.
create policy "shared content is public"
  on public.shared_documents for select
  to anon, authenticated
  using (true);

create policy "shared content writable by owners"
  on public.shared_documents for all
  to authenticated
  using (public.is_app_owner())
  with check (public.is_app_owner());

-- ─────────────────────────────────────────────────────────────
-- Entitlements (memberships)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.entitlements (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users (id) on delete cascade,
  sku                    text not null,
  status                 text not null check (status in ('active', 'past_due', 'canceled', 'incomplete')),
  period_end             timestamptz,
  stripe_customer_id     text,
  stripe_subscription_id text,
  updated_at             timestamptz not null default now(),
  unique (user_id, sku)
);

create index if not exists entitlements_user_idx on public.entitlements (user_id);

alter table public.entitlements enable row level security;

-- Read-only to the listener who owns it. There is deliberately NO insert or
-- update policy: entitlements are written exclusively by the Stripe webhook
-- using the service-role key, which bypasses RLS. A client cannot grant itself
-- a membership.
create policy "own entitlements readable"
  on public.entitlements for select
  to authenticated
  using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- Realtime
-- ─────────────────────────────────────────────────────────────
-- useLive / useLiveShared / payments.onPayment subscribe to these.
alter publication supabase_realtime add table public.app_documents;
alter publication supabase_realtime add table public.shared_documents;
alter publication supabase_realtime add table public.entitlements;

-- ─────────────────────────────────────────────────────────────
-- updated_at maintenance
-- ─────────────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger app_documents_touch
  before update on public.app_documents
  for each row execute function public.touch_updated_at();

create trigger shared_documents_touch
  before update on public.shared_documents
  for each row execute function public.touch_updated_at();

create trigger entitlements_touch
  before update on public.entitlements
  for each row execute function public.touch_updated_at();
