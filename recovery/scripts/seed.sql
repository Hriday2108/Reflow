-- Recovery: Seed Data — 4-day Rome → Florence → Venice Trip
-- Run AFTER schema.sql in the Supabase SQL Editor

-- Clear existing demo data
delete from recovery_options;
delete from disruption_events;
delete from booking_dependencies;
delete from bookings;
delete from trips;

-- ═══════════════════════════════════════════════════════════
-- 1. CREATE THE TRIP
-- ═══════════════════════════════════════════════════════════
insert into trips (id, traveler_name, destination, start_date, end_date)
values (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Alex Rivera',
  'Italy (Rome → Florence → Venice)',
  '2026-09-15',
  '2026-09-18'
);

-- ═══════════════════════════════════════════════════════════
-- 2. CREATE BOOKINGS (10 bookings across 4 days)
-- ═══════════════════════════════════════════════════════════

-- DAY 1: NYC → Rome
-- B1: Flight NYC → Rome
insert into bookings (id, trip_id, type, title, location, start_time, end_time, cost, cancellation_policy, refund_percent, status, position)
values (
  'b0000001-0000-0000-0000-000000000001',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'flight',
  'Flight AA 110 — JFK → FCO',
  'New York (JFK) → Rome (FCO)',
  '2026-09-15T08:00:00+00:00',
  '2026-09-15T22:30:00+00:00',
  685.00,
  'Free cancellation up to 24h before departure. After: 50% refund.',
  50,
  'confirmed',
  '{"x": 100, "y": 200}'
);

-- B2: Airport Transfer Rome
insert into bookings (id, trip_id, type, title, location, start_time, end_time, cost, cancellation_policy, refund_percent, status, position)
values (
  'b0000001-0000-0000-0000-000000000002',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'transfer',
  'Airport Shuttle — FCO → Hotel',
  'Rome Fiumicino Airport',
  '2026-09-15T23:15:00+00:00',
  '2026-09-15T23:55:00+00:00',
  35.00,
  'Free cancellation up to 2h before pickup.',
  100,
  'confirmed',
  '{"x": 350, "y": 200}'
);

-- B3: Hotel Check-in Rome
insert into bookings (id, trip_id, type, title, location, start_time, end_time, cost, cancellation_policy, refund_percent, status, position)
values (
  'b0000001-0000-0000-0000-000000000003',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'hotel',
  'Hotel Palazzo Manfredi — Rome',
  'Rome, Via Labicana 125',
  '2026-09-16T00:00:00+00:00',
  '2026-09-17T10:00:00+00:00',
  320.00,
  'Non-refundable. Modification allowed up to 48h before check-in.',
  0,
  'confirmed',
  '{"x": 600, "y": 200}'
);

-- DAY 2: Rome sightseeing + Train to Florence
-- B4: Morning Colosseum Tour
insert into bookings (id, trip_id, type, title, location, start_time, end_time, cost, cancellation_policy, refund_percent, status, position)
values (
  'b0000001-0000-0000-0000-000000000004',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'activity',
  'Guided Colosseum & Forum Tour',
  'Rome, Piazza del Colosseo',
  '2026-09-16T09:00:00+00:00',
  '2026-09-16T12:00:00+00:00',
  75.00,
  'Full refund if cancelled 24h before. 50% if 12h before.',
  50,
  'confirmed',
  '{"x": 100, "y": 450}'
);

-- B5: Train Rome → Florence
insert into bookings (id, trip_id, type, title, location, start_time, end_time, cost, cancellation_policy, refund_percent, status, position)
values (
  'b0000001-0000-0000-0000-000000000005',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'train',
  'Trenitalia Frecciarossa — Roma → Firenze',
  'Roma Termini → Firenze SMN',
  '2026-09-16T14:00:00+00:00',
  '2026-09-16T15:30:00+00:00',
  52.00,
  'Exchangeable up to departure. No refund on base fare.',
  0,
  'confirmed',
  '{"x": 350, "y": 450}'
);

-- B6: Florence Transfer
insert into bookings (id, trip_id, type, title, location, start_time, end_time, cost, cancellation_policy, refund_percent, status, position)
values (
  'b0000001-0000-0000-0000-000000000006',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'transfer',
  'Private Car — Firenze SMN → Hotel',
  'Florence, Santa Maria Novella Station',
  '2026-09-16T15:45:00+00:00',
  '2026-09-16T16:15:00+00:00',
  28.00,
  'Free cancellation up to 1h before.',
  100,
  'confirmed',
  '{"x": 600, "y": 450}'
);

-- B7: Hotel Florence
insert into bookings (id, trip_id, type, title, location, start_time, end_time, cost, cancellation_policy, refund_percent, status, position)
values (
  'b0000001-0000-0000-0000-000000000007',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'hotel',
  'Hotel Lungarno — Florence',
  'Florence, Borgo San Jacopo 14',
  '2026-09-16T16:30:00+00:00',
  '2026-09-17T11:00:00+00:00',
  290.00,
  'Free cancellation up to 48h before. After: non-refundable.',
  0,
  'confirmed',
  '{"x": 850, "y": 450}'
);

-- DAY 3: Florence → Venice
-- B8: Cooking Class
insert into bookings (id, trip_id, type, title, location, start_time, end_time, cost, cancellation_policy, refund_percent, status, position)
values (
  'b0000001-0000-0000-0000-000000000008',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'activity',
  'Tuscan Cooking Class & Market Tour',
  'Florence, Mercato Centrale',
  '2026-09-17T09:00:00+00:00',
  '2026-09-17T12:30:00+00:00',
  95.00,
  'Full refund 48h before. 25% refund within 48h.',
  25,
  'confirmed',
  '{"x": 100, "y": 700}'
);

-- B9: Train Florence → Venice
insert into bookings (id, trip_id, type, title, location, start_time, end_time, cost, cancellation_policy, refund_percent, status, position)
values (
  'b0000001-0000-0000-0000-000000000009',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'train',
  'Italo — Firenze → Venezia',
  'Firenze SMN → Venezia Santa Lucia',
  '2026-09-17T14:00:00+00:00',
  '2026-09-17T16:05:00+00:00',
  45.00,
  'Non-exchangeable. Credit voucher only.',
  0,
  'confirmed',
  '{"x": 350, "y": 700}'
);

-- B10: Venice Water Taxi + Hotel
insert into bookings (id, trip_id, type, title, location, start_time, end_time, cost, cancellation_policy, refund_percent, status, position)
values (
  'b0000001-0000-0000-0000-000000000010',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'transfer',
  'Water Taxi — Santa Lucia → Hotel',
  'Venice, Santa Lucia Station',
  '2026-09-17T16:20:00+00:00',
  '2026-09-17T16:50:00+00:00',
  60.00,
  'Free cancellation up to 2h before.',
  100,
  'confirmed',
  '{"x": 600, "y": 700}'
);

-- B11: Hotel Venice
insert into bookings (id, trip_id, type, title, location, start_time, end_time, cost, cancellation_policy, refund_percent, status, position)
values (
  'b0000001-0000-0000-0000-000000000011',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'hotel',
  'The Gritti Palace — Venice',
  'Venice, Campo Santa Maria del Giglio',
  '2026-09-17T17:00:00+00:00',
  '2026-09-18T11:00:00+00:00',
  450.00,
  'Non-refundable. Modification fee €50.',
  0,
  'confirmed',
  '{"x": 850, "y": 700}'
);

-- DAY 4: Venice + Departure
-- B12: Gondola Tour
insert into bookings (id, trip_id, type, title, location, start_time, end_time, cost, cancellation_policy, refund_percent, status, position)
values (
  'b0000001-0000-0000-0000-000000000012',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'activity',
  'Private Gondola Tour — Grand Canal',
  'Venice, Grand Canal',
  '2026-09-18T09:00:00+00:00',
  '2026-09-18T10:30:00+00:00',
  120.00,
  'Full refund if cancelled 24h before.',
  100,
  'confirmed',
  '{"x": 100, "y": 950}'
);

-- ═══════════════════════════════════════════════════════════
-- 3. CREATE DEPENDENCY EDGES
-- ═══════════════════════════════════════════════════════════

-- Day 1: Flight → Transfer → Hotel
insert into booking_dependencies (trip_id, from_booking_id, to_booking_id) values
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000002'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000003');

-- Day 2: Hotel(Rome) → Colosseum Tour, Colosseum → Train, Train → Transfer → Hotel(Florence)
insert into booking_dependencies (trip_id, from_booking_id, to_booking_id) values
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b0000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000004'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b0000001-0000-0000-0000-000000000004', 'b0000001-0000-0000-0000-000000000005'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b0000001-0000-0000-0000-000000000005', 'b0000001-0000-0000-0000-000000000006'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b0000001-0000-0000-0000-000000000006', 'b0000001-0000-0000-0000-000000000007');

-- Day 3: Hotel(Florence) → Cooking Class, Cooking → Train, Train → Water Taxi → Hotel(Venice)
insert into booking_dependencies (trip_id, from_booking_id, to_booking_id) values
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b0000001-0000-0000-0000-000000000007', 'b0000001-0000-0000-0000-000000000008'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b0000001-0000-0000-0000-000000000008', 'b0000001-0000-0000-0000-000000000009'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b0000001-0000-0000-0000-000000000009', 'b0000001-0000-0000-0000-000000000010'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b0000001-0000-0000-0000-000000000010', 'b0000001-0000-0000-0000-000000000011');

-- Day 4: Hotel(Venice) → Gondola Tour
insert into booking_dependencies (trip_id, from_booking_id, to_booking_id) values
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b0000001-0000-0000-0000-000000000011', 'b0000001-0000-0000-0000-000000000012');
