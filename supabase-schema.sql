create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  email_confirmed_at timestamptz,
  first_name text not null default '',
  last_name text not null default '',
  free_fire_id text not null default '',
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email_confirmed_at timestamptz;
alter table public.profiles add column if not exists free_fire_id text not null default '';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, email_confirmed_at, first_name, last_name, updated_at)
  values (
    new.id,
    new.email,
    new.email_confirmed_at,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    now()
  )
  on conflict (id) do update
  set email = excluded.email,
      email_confirmed_at = excluded.email_confirmed_at,
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
after update of email, email_confirmed_at, raw_user_meta_data on auth.users
for each row execute procedure public.handle_new_user();

insert into public.profiles (id, email, email_confirmed_at, first_name, last_name)
select
  id,
  email,
  email_confirmed_at,
  coalesce(raw_user_meta_data ->> 'first_name', ''),
  coalesce(raw_user_meta_data ->> 'last_name', '')
from auth.users
on conflict (id) do update
set email = excluded.email,
    email_confirmed_at = excluded.email_confirmed_at,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    updated_at = now();

create table if not exists public.revenue_stats (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  value text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.top_up_packs (
  id uuid primary key default gen_random_uuid(),
  tag text not null default 'PACK',
  name text not null,
  diamonds text not null default '0',
  price text not null default '0 HTG',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.gift_cards (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'Gift Card',
  name text not null,
  value text not null default '0 HTG',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.top_up_packs alter column price set default '0 HTG';
alter table public.gift_cards alter column value set default '0 HTG';

create table if not exists public.ai_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'review', 'published', 'rejected')),
  date text not null default to_char(now(), 'YYYY-MM-DD'),
  summary text not null default '',
  content text not null default '',
  tags text[] not null default '{}'::text[],
  image_url text,
  reward text not null default '0',
  created_at timestamptz not null default now()
);

alter table public.ai_events add column if not exists content text not null default '';
alter table public.ai_events add column if not exists tags text[] not null default '{}'::text[];
alter table public.ai_events add column if not exists image_url text;

create table if not exists public.upcoming_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  diamond_cost text not null,
  start_date date not null,
  description_fr text not null,
  description_ht text not null,
  image_url text not null,
  is_active boolean not null default true,
  moderation_status text not null default 'pending' check (moderation_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.upcoming_events
  add column if not exists moderation_status text not null default 'pending'
  check (moderation_status in ('pending', 'approved', 'rejected'));

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  uid text not null,
  payment_method text not null,
  pack_name text not null,
  diamond_count text not null,
  amount text not null,
  status text not null default 'pending' check (status in ('pending', 'validated', 'paid', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.orders add column if not exists user_id uuid references auth.users (id) on delete set null;
alter table public.orders add column if not exists order_type text not null default 'topup';
alter table public.orders add column if not exists reference text;
alter table public.orders add column if not exists transaction_id text;
alter table public.orders add column if not exists payment_phone text;
alter table public.orders add column if not exists proof_path text;
alter table public.orders add column if not exists reviewed_by uuid references public.profiles (id) on delete set null;
alter table public.orders add column if not exists reviewed_at timestamptz;
alter table public.orders add column if not exists payment_channel text not null default 'phone';

alter table public.orders drop constraint if exists orders_status_check;
update public.orders set status = 'paid' where status = 'validated';
alter table public.orders add constraint orders_status_check
  check (status in ('awaiting_payment', 'pending', 'paid', 'rejected'));

alter table public.orders drop constraint if exists orders_payment_channel_check;
alter table public.orders add constraint orders_payment_channel_check
  check (payment_channel in ('phone', 'qr'));

create table if not exists public.payment_channels (
  provider text primary key check (provider in ('moncash', 'natcash')),
  receiver_phone text not null default '',
  qr_path text,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.site_visitors (
  visitor_id uuid primary key,
  user_id uuid references auth.users (id) on delete set null,
  path text not null default '/',
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now()
);

create table if not exists public.site_visits (
  id bigint generated by default as identity primary key,
  visitor_id uuid not null,
  path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.gift_card_orders (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  value text not null,
  payment_method text not null,
  status text not null default 'pending' check (status in ('pending', 'validated', 'paid', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists idx_revenue_stats_sort_order on public.revenue_stats (sort_order);
create index if not exists idx_top_up_packs_sort_order on public.top_up_packs (sort_order);
create index if not exists idx_gift_cards_sort_order on public.gift_cards (sort_order);
create index if not exists idx_ai_events_created_at on public.ai_events (created_at desc);
create index if not exists idx_upcoming_events_active_start_date on public.upcoming_events (start_date asc) where is_active;
create index if not exists idx_orders_created_at on public.orders (created_at desc);
create index if not exists idx_gift_card_orders_created_at on public.gift_card_orders (created_at desc);
create unique index if not exists idx_orders_reference_unique on public.orders (reference) where reference is not null;
create unique index if not exists idx_orders_transaction_unique on public.orders (payment_method, lower(transaction_id)) where transaction_id is not null;
create index if not exists idx_orders_user_created_at on public.orders (user_id, created_at desc);
create index if not exists idx_site_visits_created_at on public.site_visits (created_at desc);
create index if not exists idx_site_visits_visitor_path_created_at on public.site_visits (visitor_id, path, created_at desc);
create index if not exists idx_site_visitors_last_seen on public.site_visitors (last_seen desc);

alter table public.profiles enable row level security;
alter table public.revenue_stats enable row level security;
alter table public.top_up_packs enable row level security;
alter table public.gift_cards enable row level security;
alter table public.ai_events enable row level security;
alter table public.upcoming_events enable row level security;
alter table public.orders enable row level security;
alter table public.gift_card_orders enable row level security;
alter table public.payment_channels enable row level security;
alter table public.site_visitors enable row level security;
alter table public.site_visits enable row level security;

drop policy if exists "Public can read revenue stats" on public.revenue_stats;
create policy "Public can read revenue stats"
on public.revenue_stats for select to anon, authenticated using (true);

drop policy if exists "Public can read top-up packs" on public.top_up_packs;
create policy "Public can read top-up packs"
on public.top_up_packs for select to anon, authenticated using (true);

drop policy if exists "Public can read gift cards" on public.gift_cards;
create policy "Public can read gift cards"
on public.gift_cards for select to anon, authenticated using (true);

grant select on public.revenue_stats, public.top_up_packs, public.gift_cards, public.ai_events to anon, authenticated;

grant select on public.upcoming_events to anon, authenticated;
grant insert on public.upcoming_events to service_role;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

drop policy if exists "Public can read active upcoming events" on public.upcoming_events;
create policy "Public can read active upcoming events"
on public.upcoming_events for select to anon, authenticated
using (is_active = true and moderation_status = 'approved');

drop policy if exists "Admins can read all upcoming events" on public.upcoming_events;
create policy "Admins can read all upcoming events"
on public.upcoming_events for select to authenticated
using ((select public.is_admin()));

drop policy if exists "Admins can moderate upcoming events" on public.upcoming_events;
create policy "Admins can moderate upcoming events"
on public.upcoming_events for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

revoke update on public.upcoming_events from anon, authenticated;
grant update (moderation_status) on public.upcoming_events to authenticated;

drop policy if exists "Admins manage top-up packs" on public.top_up_packs;
create policy "Admins manage top-up packs"
on public.top_up_packs for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "Admins manage gift cards" on public.gift_cards;
create policy "Admins manage gift cards"
on public.gift_cards for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

grant insert, update, delete on public.top_up_packs, public.gift_cards to authenticated;

drop policy if exists "Public can read published events" on public.ai_events;
create policy "Public can read published events"
on public.ai_events for select to anon, authenticated
using (status = 'published' or (select public.is_admin()));

drop policy if exists "Admins update ai events" on public.ai_events;
create policy "Admins update ai events"
on public.ai_events for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "Admins insert ai events" on public.ai_events;
create policy "Admins insert ai events"
on public.ai_events for insert to authenticated
with check ((select public.is_admin()));

drop policy if exists "Admins delete ai events" on public.ai_events;
create policy "Admins delete ai events"
on public.ai_events for delete to authenticated
using ((select public.is_admin()));

grant insert, delete on public.ai_events to authenticated;
grant update (status) on public.ai_events to authenticated;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
on public.profiles for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

revoke update on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (first_name, last_name, free_fire_id) on public.profiles to authenticated;

drop policy if exists "Allow public insert to orders" on public.orders;
drop policy if exists "Customers create their own orders" on public.orders;
create policy "Customers create their own orders"
on public.orders for insert to authenticated
with check (user_id = (select auth.uid()) and status = 'awaiting_payment');

drop policy if exists "Customers submit payment proof" on public.orders;
create policy "Customers submit payment proof"
on public.orders for update to authenticated
using (user_id = (select auth.uid()) and status = 'awaiting_payment')
with check (
  user_id = (select auth.uid()) and status = 'pending'
  and reviewed_by is null and reviewed_at is null
);

drop policy if exists "Users and admins read orders" on public.orders;
create policy "Users and admins read orders"
on public.orders for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "Admins review orders" on public.orders;
create policy "Admins review orders"
on public.orders for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

revoke update on public.orders from anon, authenticated;
grant select, insert on public.orders to authenticated;
grant update (transaction_id, payment_phone, proof_path, status, reviewed_by, reviewed_at)
on public.orders to authenticated;

drop policy if exists "Authenticated users can read payment channels" on public.payment_channels;
create policy "Authenticated users can read payment channels"
on public.payment_channels for select to authenticated using (true);

drop policy if exists "Admins insert payment channels" on public.payment_channels;
create policy "Admins insert payment channels"
on public.payment_channels for insert to authenticated
with check ((select public.is_admin()));

drop policy if exists "Admins update payment channels" on public.payment_channels;
create policy "Admins update payment channels"
on public.payment_channels for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

grant select, insert, update on public.payment_channels to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('merchant-qrs', 'merchant-qrs', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Customers upload their own payment proofs" on storage.objects;
create policy "Customers upload their own payment proofs"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Customers and admins read payment proofs" on storage.objects;
create policy "Customers and admins read payment proofs"
on storage.objects for select to authenticated
using (
  bucket_id = 'payment-proofs'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_admin())
  )
);

drop policy if exists "Authenticated users read merchant QR codes" on storage.objects;
create policy "Authenticated users read merchant QR codes"
on storage.objects for select to authenticated
using (bucket_id = 'merchant-qrs');

drop policy if exists "Admins upload merchant QR codes" on storage.objects;
create policy "Admins upload merchant QR codes"
on storage.objects for insert to authenticated
with check (bucket_id = 'merchant-qrs' and (select public.is_admin()));

drop policy if exists "Admins update merchant QR codes" on storage.objects;
create policy "Admins update merchant QR codes"
on storage.objects for update to authenticated
using (bucket_id = 'merchant-qrs' and (select public.is_admin()))
with check (bucket_id = 'merchant-qrs' and (select public.is_admin()));

drop policy if exists "Admins delete merchant QR codes" on storage.objects;
create policy "Admins delete merchant QR codes"
on storage.objects for delete to authenticated
using (bucket_id = 'merchant-qrs' and (select public.is_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-media', 'event-media', true, 4194304, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public reads AI event media" on storage.objects;
create policy "Public reads AI event media"
on storage.objects for select to anon, authenticated
using (bucket_id = 'event-media');

drop policy if exists "Admins upload AI event media" on storage.objects;
create policy "Admins upload AI event media"
on storage.objects for insert to authenticated
with check (bucket_id = 'event-media' and (select public.is_admin()));

drop policy if exists "Admins delete AI event media" on storage.objects;
create policy "Admins delete AI event media"
on storage.objects for delete to authenticated
using (bucket_id = 'event-media' and (select public.is_admin()));

create or replace function public.track_site_visit(visitor_id_input uuid, path_input text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_path text := left(coalesce(path_input, '/'), 200);
begin
  if normalized_path !~ '^/' or normalized_path ~ '^/(admin|api|_next)(/|$)' then
    return;
  end if;

  insert into public.site_visitors (visitor_id, user_id, path, first_seen, last_seen)
  values (visitor_id_input, auth.uid(), normalized_path, now(), now())
  on conflict (visitor_id) do update
  set user_id = coalesce(auth.uid(), public.site_visitors.user_id),
      path = excluded.path,
      last_seen = now();

  if not exists (
    select 1 from public.site_visits
    where visitor_id = visitor_id_input
      and path = normalized_path
      and created_at > now() - interval '10 seconds'
  ) then
    insert into public.site_visits (visitor_id, path) values (visitor_id_input, normalized_path);
  end if;
end;
$$;

create or replace function public.get_admin_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  with daily_visits as (
    select days.day::date as day, count(visits.id)::integer as visits
    from generate_series(current_date - 6, current_date, interval '1 day') as days(day)
    left join public.site_visits visits
      on visits.created_at >= days.day
      and visits.created_at < days.day + interval '1 day'
    group by days.day
    order by days.day
  ),
  payment_breakdown as (
    select jsonb_agg(jsonb_build_object(
      'provider', payment_method,
      'channel', payment_channel,
      'orders', order_count,
      'amount', amount_total
    )) as items
    from (
      select payment_method, payment_channel, count(*)::integer as order_count,
        coalesce(sum(nullif(regexp_replace(amount, '[^0-9]', '', 'g'), '')::numeric), 0) as amount_total
      from public.orders
      where status = 'paid'
      group by payment_method, payment_channel
    ) grouped_payments
  )
  select jsonb_build_object(
    'visitsToday', (select count(*) from public.site_visits where created_at >= current_date),
    'visitsMonth', (select count(*) from public.site_visits where created_at >= current_date - 29),
    'uniqueVisitorsToday', (select count(distinct visitor_id) from public.site_visits where created_at >= current_date),
    'onlineNow', (select count(*) from public.site_visitors where last_seen >= now() - interval '2 minutes'),
    'registeredUsers', (select count(*) from public.profiles),
    'paidOrders', (select count(*) from public.orders where status = 'paid'),
    'pendingProofs', (select count(*) from public.orders where status = 'pending'),
    'paidAmount', (select coalesce(sum(nullif(regexp_replace(amount, '[^0-9]', '', 'g'), '')::numeric), 0) from public.orders where status = 'paid'),
    'dailyVisits', coalesce((select jsonb_agg(jsonb_build_object('day', day, 'visits', visits) order by day) from daily_visits), '[]'::jsonb),
    'paymentBreakdown', coalesce((select items from payment_breakdown), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

grant execute on function public.track_site_visit(uuid, text) to anon, authenticated;
grant execute on function public.get_admin_dashboard_stats() to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users upload their payment proofs" on storage.objects;
create policy "Users upload their payment proofs"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users and admins read payment proofs" on storage.objects;
create policy "Users and admins read payment proofs"
on storage.objects for select to authenticated
using (
  bucket_id = 'payment-proofs'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_admin())
  )
);

drop policy if exists "Users remove their payment proofs" on storage.objects;
create policy "Users remove their payment proofs"
on storage.objects for delete to authenticated
using (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Allow public read access to revenue_stats" on public.revenue_stats;
create policy "Allow public read access to revenue_stats"
on public.revenue_stats
for select
using (true);

drop policy if exists "Allow public read access to top_up_packs" on public.top_up_packs;
create policy "Allow public read access to top_up_packs"
on public.top_up_packs
for select
using (true);

drop policy if exists "Allow public read access to gift_cards" on public.gift_cards;
create policy "Allow public read access to gift_cards"
on public.gift_cards
for select
using (true);

drop policy if exists "Allow public read access to ai_events" on public.ai_events;
create policy "Allow public read access to ai_events"
on public.ai_events
for select
using (true);

drop policy if exists "Allow public insert to gift_card_orders" on public.gift_card_orders;
revoke insert on public.gift_card_orders from public, anon, authenticated;
