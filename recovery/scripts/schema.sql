-- Recovery: Travel Disruption Recovery Engine
-- Run this in the Supabase SQL Editor to create all tables

-- Trips table
create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  traveler_name text not null,
  destination text not null,
  start_date date not null,
  end_date date not null
);

-- Bookings table
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  type text not null check (type in ('flight','train','hotel','transfer','activity','event')),
  title text not null,
  location text,
  start_time timestamptz not null,
  end_time timestamptz,
  cost numeric not null default 0,
  cancellation_policy text,
  refund_percent int default 0,
  status text not null default 'confirmed' check (status in ('confirmed','at-risk','disrupted','rebooked','cancelled')),
  position jsonb -- for graph node x/y
);

-- Booking dependencies (directed graph edges)
create table if not exists booking_dependencies (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  from_booking_id uuid references bookings(id) on delete cascade,
  to_booking_id uuid references bookings(id) on delete cascade
);

-- Disruption events
create table if not exists disruption_events (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  booking_id uuid references bookings(id) on delete cascade,
  type text not null check (type in ('delay','cancellation','missed-connection','weather','traveler-initiated','transfer-failure')),
  severity text not null default 'medium' check (severity in ('low','medium','high')),
  description text,
  created_at timestamptz default now()
);

-- Recovery options
create table if not exists recovery_options (
  id uuid primary key default gen_random_uuid(),
  disruption_id uuid references disruption_events(id) on delete cascade,
  label text not null,
  cost_delta numeric not null default 0,
  time_delta_minutes int not null default 0,
  convenience_score int not null default 3, -- 1-5
  percent_itinerary_affected int not null default 0,
  changes jsonb not null, -- structured list of booking changes
  selected boolean default false
);

-- Enable realtime on bookings so the graph updates live
alter publication supabase_realtime add table bookings;

-- ═══════════════════════════════════════════════════════════
-- RLS Policies — allow public access (no auth for this demo)
-- ═══════════════════════════════════════════════════════════

-- Trips
alter table trips enable row level security;
create policy "Public read trips" on trips for select using (true);
create policy "Public write trips" on trips for insert with check (true);
create policy "Public update trips" on trips for update using (true) with check (true);
create policy "Public delete trips" on trips for delete using (true);

-- Bookings
alter table bookings enable row level security;
create policy "Public read bookings" on bookings for select using (true);
create policy "Public write bookings" on bookings for insert with check (true);
create policy "Public update bookings" on bookings for update using (true) with check (true);
create policy "Public delete bookings" on bookings for delete using (true);

-- Booking Dependencies
alter table booking_dependencies enable row level security;
create policy "Public read deps" on booking_dependencies for select using (true);
create policy "Public write deps" on booking_dependencies for insert with check (true);
create policy "Public update deps" on booking_dependencies for update using (true) with check (true);
create policy "Public delete deps" on booking_dependencies for delete using (true);

-- Disruption Events
alter table disruption_events enable row level security;
create policy "Public read disruptions" on disruption_events for select using (true);
create policy "Public write disruptions" on disruption_events for insert with check (true);
create policy "Public update disruptions" on disruption_events for update using (true) with check (true);
create policy "Public delete disruptions" on disruption_events for delete using (true);

-- Recovery Options
alter table recovery_options enable row level security;
create policy "Public read options" on recovery_options for select using (true);
create policy "Public write options" on recovery_options for insert with check (true);
create policy "Public update options" on recovery_options for update using (true) with check (true);
create policy "Public delete options" on recovery_options for delete using (true);
