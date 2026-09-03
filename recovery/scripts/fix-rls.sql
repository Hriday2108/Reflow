-- ═══════════════════════════════════════════════════════════
-- QUICK FIX: Run this in Supabase SQL Editor to fix RLS
-- This allows the app to read/write all tables
-- ═══════════════════════════════════════════════════════════

-- Trips
alter table trips enable row level security;
drop policy if exists "Public read trips" on trips;
drop policy if exists "Public write trips" on trips;
drop policy if exists "Public update trips" on trips;
drop policy if exists "Public delete trips" on trips;
create policy "Public read trips" on trips for select using (true);
create policy "Public write trips" on trips for insert with check (true);
create policy "Public update trips" on trips for update using (true) with check (true);
create policy "Public delete trips" on trips for delete using (true);

-- Bookings
alter table bookings enable row level security;
drop policy if exists "Public read bookings" on bookings;
drop policy if exists "Public write bookings" on bookings;
drop policy if exists "Public update bookings" on bookings;
drop policy if exists "Public delete bookings" on bookings;
create policy "Public read bookings" on bookings for select using (true);
create policy "Public write bookings" on bookings for insert with check (true);
create policy "Public update bookings" on bookings for update using (true) with check (true);
create policy "Public delete bookings" on bookings for delete using (true);

-- Booking Dependencies
alter table booking_dependencies enable row level security;
drop policy if exists "Public read deps" on booking_dependencies;
drop policy if exists "Public write deps" on booking_dependencies;
drop policy if exists "Public update deps" on booking_dependencies;
drop policy if exists "Public delete deps" on booking_dependencies;
create policy "Public read deps" on booking_dependencies for select using (true);
create policy "Public write deps" on booking_dependencies for insert with check (true);
create policy "Public update deps" on booking_dependencies for update using (true) with check (true);
create policy "Public delete deps" on booking_dependencies for delete using (true);

-- Disruption Events
alter table disruption_events enable row level security;
drop policy if exists "Public read disruptions" on disruption_events;
drop policy if exists "Public write disruptions" on disruption_events;
drop policy if exists "Public update disruptions" on disruption_events;
drop policy if exists "Public delete disruptions" on disruption_events;
create policy "Public read disruptions" on disruption_events for select using (true);
create policy "Public write disruptions" on disruption_events for insert with check (true);
create policy "Public update disruptions" on disruption_events for update using (true) with check (true);
create policy "Public delete disruptions" on disruption_events for delete using (true);

-- Recovery Options
alter table recovery_options enable row level security;
drop policy if exists "Public read options" on recovery_options;
drop policy if exists "Public write options" on recovery_options;
drop policy if exists "Public update options" on recovery_options;
drop policy if exists "Public delete options" on recovery_options;
create policy "Public read options" on recovery_options for select using (true);
create policy "Public write options" on recovery_options for insert with check (true);
create policy "Public update options" on recovery_options for update using (true) with check (true);
create policy "Public delete options" on recovery_options for delete using (true);
