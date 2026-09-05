import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Please define the MONGODB_URI environment variable inside .env.local');
  process.exit(1);
}

const tripSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  traveler_name: { type: String, required: true },
  destination: { type: String, required: true },
  start_date: { type: String, required: true },
  end_date: { type: String, required: true },
}, { _id: false });

const bookingSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  trip_id: { type: String, required: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  location: { type: String, default: null },
  start_time: { type: String, required: true },
  end_time: { type: String, default: null },
  cost: { type: Number, required: true },
  cancellation_policy: { type: String, default: null },
  refund_percent: { type: Number, required: true },
  status: { type: String, required: true },
  position: { x: { type: Number }, y: { type: Number } }
}, { _id: false });

const dependencySchema = new mongoose.Schema({
  _id: { type: String, required: true, default: () => new mongoose.Types.ObjectId().toString() },
  trip_id: { type: String, required: true },
  from_booking_id: { type: String, required: true },
  to_booking_id: { type: String, required: true },
}, { _id: false });

const Trip = mongoose.models.Trip || mongoose.model('Trip', tripSchema);
const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
const Dependency = mongoose.models.Dependency || mongoose.model('Dependency', dependencySchema);
const Disruption = mongoose.models.Disruption || mongoose.model('Disruption', new mongoose.Schema({}, { strict: false }));
const RecoveryOption = mongoose.models.RecoveryOption || mongoose.model('RecoveryOption', new mongoose.Schema({}, { strict: false }));

const DEMO_TRIP_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const INDIAN_DEMO_TRIP_ID = 'ind-001-demo-trip';

async function seed() {
  await mongoose.connect(MONGODB_URI as string, { family: 4 });
  console.log('Connected to MongoDB');

  // Clear existing data
  await RecoveryOption.deleteMany({});
  await Disruption.deleteMany({});
  await Dependency.deleteMany({});
  await Booking.deleteMany({});
  await Trip.deleteMany({});
  console.log('Cleared existing data');

  // Seed Trip
  await Trip.create({
    _id: DEMO_TRIP_ID,
    traveler_name: 'Alex Rivera',
    destination: 'Italy (Rome → Florence → Venice)',
    start_date: '2026-09-15',
    end_date: '2026-09-18'
  });

  await Trip.create({
    _id: INDIAN_DEMO_TRIP_ID,
    traveler_name: 'Rahul Sharma',
    destination: 'India (Delhi → Mumbai → Goa)',
    start_date: '2026-10-10',
    end_date: '2026-10-13'
  });

  // Seed Bookings
  const bookings = [
    {
      _id: 'b0000001-0000-0000-0000-000000000001', trip_id: DEMO_TRIP_ID, type: 'flight', title: 'Flight AA 110 — JFK → FCO', location: 'New York (JFK) → Rome (FCO)', start_time: '2026-09-15T08:00:00+00:00', end_time: '2026-09-15T22:30:00+00:00', cost: 685.00, cancellation_policy: 'Free cancellation up to 24h before departure. After: 50% refund.', refund_percent: 50, status: 'confirmed', position: { x: 100, y: 200 }
    },
    {
      _id: 'b0000001-0000-0000-0000-000000000002', trip_id: DEMO_TRIP_ID, type: 'transfer', title: 'Airport Shuttle — FCO → Hotel', location: 'Rome Fiumicino Airport', start_time: '2026-09-15T23:15:00+00:00', end_time: '2026-09-15T23:55:00+00:00', cost: 35.00, cancellation_policy: 'Free cancellation up to 2h before pickup.', refund_percent: 100, status: 'confirmed', position: { x: 350, y: 200 }
    },
    {
      _id: 'b0000001-0000-0000-0000-000000000003', trip_id: DEMO_TRIP_ID, type: 'hotel', title: 'Hotel Palazzo Manfredi — Rome', location: 'Rome, Via Labicana 125', start_time: '2026-09-16T00:00:00+00:00', end_time: '2026-09-17T10:00:00+00:00', cost: 320.00, cancellation_policy: 'Non-refundable. Modification allowed up to 48h before check-in.', refund_percent: 0, status: 'confirmed', position: { x: 600, y: 200 }
    },
    {
      _id: 'b0000001-0000-0000-0000-000000000004', trip_id: DEMO_TRIP_ID, type: 'activity', title: 'Guided Colosseum & Forum Tour', location: 'Rome, Piazza del Colosseo', start_time: '2026-09-16T09:00:00+00:00', end_time: '2026-09-16T12:00:00+00:00', cost: 75.00, cancellation_policy: 'Full refund if cancelled 24h before. 50% if 12h before.', refund_percent: 50, status: 'confirmed', position: { x: 100, y: 450 }
    },
    {
      _id: 'b0000001-0000-0000-0000-000000000005', trip_id: DEMO_TRIP_ID, type: 'train', title: 'Trenitalia Frecciarossa — Roma → Firenze', location: 'Roma Termini → Firenze SMN', start_time: '2026-09-16T14:00:00+00:00', end_time: '2026-09-16T15:30:00+00:00', cost: 52.00, cancellation_policy: 'Exchangeable up to departure. No refund on base fare.', refund_percent: 0, status: 'confirmed', position: { x: 350, y: 450 }
    },
    {
      _id: 'b0000001-0000-0000-0000-000000000006', trip_id: DEMO_TRIP_ID, type: 'transfer', title: 'Private Car — Firenze SMN → Hotel', location: 'Florence, Santa Maria Novella Station', start_time: '2026-09-16T15:45:00+00:00', end_time: '2026-09-16T16:15:00+00:00', cost: 28.00, cancellation_policy: 'Free cancellation up to 1h before.', refund_percent: 100, status: 'confirmed', position: { x: 600, y: 450 }
    },
    {
      _id: 'b0000001-0000-0000-0000-000000000007', trip_id: DEMO_TRIP_ID, type: 'hotel', title: 'Hotel Lungarno — Florence', location: 'Florence, Borgo San Jacopo 14', start_time: '2026-09-16T16:30:00+00:00', end_time: '2026-09-17T11:00:00+00:00', cost: 290.00, cancellation_policy: 'Free cancellation up to 48h before. After: non-refundable.', refund_percent: 0, status: 'confirmed', position: { x: 850, y: 450 }
    },
    {
      _id: 'b0000001-0000-0000-0000-000000000008', trip_id: DEMO_TRIP_ID, type: 'activity', title: 'Tuscan Cooking Class & Market Tour', location: 'Florence, Mercato Centrale', start_time: '2026-09-17T09:00:00+00:00', end_time: '2026-09-17T12:30:00+00:00', cost: 95.00, cancellation_policy: 'Full refund 48h before. 25% refund within 48h.', refund_percent: 25, status: 'confirmed', position: { x: 100, y: 700 }
    },
    {
      _id: 'b0000001-0000-0000-0000-000000000009', trip_id: DEMO_TRIP_ID, type: 'train', title: 'Italo — Firenze → Venezia', location: 'Firenze SMN → Venezia Santa Lucia', start_time: '2026-09-17T14:00:00+00:00', end_time: '2026-09-17T16:05:00+00:00', cost: 45.00, cancellation_policy: 'Non-exchangeable. Credit voucher only.', refund_percent: 0, status: 'confirmed', position: { x: 350, y: 700 }
    },
    {
      _id: 'b0000001-0000-0000-0000-000000000010', trip_id: DEMO_TRIP_ID, type: 'transfer', title: 'Water Taxi — Santa Lucia → Hotel', location: 'Venice, Santa Lucia Station', start_time: '2026-09-17T16:20:00+00:00', end_time: '2026-09-17T16:50:00+00:00', cost: 60.00, cancellation_policy: 'Free cancellation up to 2h before.', refund_percent: 100, status: 'confirmed', position: { x: 600, y: 700 }
    },
    {
      _id: 'b0000001-0000-0000-0000-000000000011', trip_id: DEMO_TRIP_ID, type: 'hotel', title: 'The Gritti Palace — Venice', location: 'Venice, Campo Santa Maria del Giglio', start_time: '2026-09-17T17:00:00+00:00', end_time: '2026-09-18T11:00:00+00:00', cost: 450.00, cancellation_policy: 'Non-refundable. Modification fee €50.', refund_percent: 0, status: 'confirmed', position: { x: 850, y: 700 }
    },
    {
      _id: 'b0000001-0000-0000-0000-000000000012', trip_id: DEMO_TRIP_ID, type: 'activity', title: 'Private Gondola Tour — Grand Canal', location: 'Venice, Grand Canal', start_time: '2026-09-18T09:00:00+00:00', end_time: '2026-09-18T10:30:00+00:00', cost: 120.00, cancellation_policy: 'Full refund if cancelled 24h before.', refund_percent: 100, status: 'confirmed', position: { x: 100, y: 950 }
    },
    // Indian Itinerary
    {
      _id: 'ind-booking-001', trip_id: INDIAN_DEMO_TRIP_ID, type: 'flight', title: 'Air India AI 805 — DEL → BOM', location: 'Delhi (DEL) → Mumbai (BOM)', start_time: '2026-10-10T08:00:00+00:00', end_time: '2026-10-10T10:15:00+00:00', cost: 120.00, cancellation_policy: 'Free cancellation up to 24h before departure.', refund_percent: 100, status: 'confirmed', position: { x: 100, y: 200 }
    },
    {
      _id: 'ind-booking-002', trip_id: INDIAN_DEMO_TRIP_ID, type: 'transfer', title: 'Airport Shuttle — BOM → CSMT', location: 'Mumbai Airport', start_time: '2026-10-10T10:45:00+00:00', end_time: '2026-10-10T11:45:00+00:00', cost: 25.00, cancellation_policy: 'Non-refundable.', refund_percent: 0, status: 'confirmed', position: { x: 350, y: 200 }
    },
    {
      _id: 'ind-booking-003', trip_id: INDIAN_DEMO_TRIP_ID, type: 'train', title: 'Vande Bharat Express — CSMT → Goa', location: 'Mumbai CSMT → Madgaon', start_time: '2026-10-10T15:00:00+00:00', end_time: '2026-10-10T23:30:00+00:00', cost: 45.00, cancellation_policy: '50% refund up to 12h before.', refund_percent: 50, status: 'confirmed', position: { x: 600, y: 200 }
    },
    {
      _id: 'ind-booking-004', trip_id: INDIAN_DEMO_TRIP_ID, type: 'transfer', title: 'Private Taxi — Madgaon → Taj', location: 'Madgaon Junction', start_time: '2026-10-10T23:45:00+00:00', end_time: '2026-10-11T00:30:00+00:00', cost: 30.00, cancellation_policy: 'Free cancellation.', refund_percent: 100, status: 'confirmed', position: { x: 850, y: 200 }
    },
    {
      _id: 'ind-booking-005', trip_id: INDIAN_DEMO_TRIP_ID, type: 'hotel', title: 'Taj Exotica Resort & Spa — Goa', location: 'Goa, Benaulim Beach', start_time: '2026-10-11T01:00:00+00:00', end_time: '2026-10-13T11:00:00+00:00', cost: 450.00, cancellation_policy: 'Free cancellation up to 48h before.', refund_percent: 100, status: 'confirmed', position: { x: 100, y: 450 }
    }
  ];
  await Booking.insertMany(bookings);

  // Seed Dependencies
  const dependencies = [
    { trip_id: DEMO_TRIP_ID, from_booking_id: 'b0000001-0000-0000-0000-000000000001', to_booking_id: 'b0000001-0000-0000-0000-000000000002' },
    { trip_id: DEMO_TRIP_ID, from_booking_id: 'b0000001-0000-0000-0000-000000000002', to_booking_id: 'b0000001-0000-0000-0000-000000000003' },
    { trip_id: DEMO_TRIP_ID, from_booking_id: 'b0000001-0000-0000-0000-000000000003', to_booking_id: 'b0000001-0000-0000-0000-000000000004' },
    { trip_id: DEMO_TRIP_ID, from_booking_id: 'b0000001-0000-0000-0000-000000000004', to_booking_id: 'b0000001-0000-0000-0000-000000000005' },
    { trip_id: DEMO_TRIP_ID, from_booking_id: 'b0000001-0000-0000-0000-000000000005', to_booking_id: 'b0000001-0000-0000-0000-000000000006' },
    { trip_id: DEMO_TRIP_ID, from_booking_id: 'b0000001-0000-0000-0000-000000000006', to_booking_id: 'b0000001-0000-0000-0000-000000000007' },
    { trip_id: DEMO_TRIP_ID, from_booking_id: 'b0000001-0000-0000-0000-000000000007', to_booking_id: 'b0000001-0000-0000-0000-000000000008' },
    { trip_id: DEMO_TRIP_ID, from_booking_id: 'b0000001-0000-0000-0000-000000000008', to_booking_id: 'b0000001-0000-0000-0000-000000000009' },
    { trip_id: DEMO_TRIP_ID, from_booking_id: 'b0000001-0000-0000-0000-000000000009', to_booking_id: 'b0000001-0000-0000-0000-000000000010' },
    { trip_id: DEMO_TRIP_ID, from_booking_id: 'b0000001-0000-0000-0000-000000000010', to_booking_id: 'b0000001-0000-0000-0000-000000000011' },
    { trip_id: DEMO_TRIP_ID, from_booking_id: 'b0000001-0000-0000-0000-000000000011', to_booking_id: 'b0000001-0000-0000-0000-000000000012' },
    // Indian Itinerary dependencies
    { trip_id: INDIAN_DEMO_TRIP_ID, from_booking_id: 'ind-booking-001', to_booking_id: 'ind-booking-002' },
    { trip_id: INDIAN_DEMO_TRIP_ID, from_booking_id: 'ind-booking-002', to_booking_id: 'ind-booking-003' },
    { trip_id: INDIAN_DEMO_TRIP_ID, from_booking_id: 'ind-booking-003', to_booking_id: 'ind-booking-004' },
    { trip_id: INDIAN_DEMO_TRIP_ID, from_booking_id: 'ind-booking-004', to_booking_id: 'ind-booking-005' }
  ];
  await Dependency.insertMany(dependencies);

  console.log('Seed completed successfully');
  mongoose.connection.close();
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
