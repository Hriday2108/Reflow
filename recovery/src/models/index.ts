import mongoose, { Schema, Document } from 'mongoose';
import {
  BookingType,
  BookingStatus,
  DisruptionType,
  Severity,
} from '@/types';

// ── Trip Model ─────────────────────────────────────────────────

const tripSchema = new Schema({
  _id: { type: String, required: true }, // We use UUIDs from seed data
  traveler_name: { type: String, required: true },
  destination: { type: String, required: true },
  start_date: { type: String, required: true },
  end_date: { type: String, required: true },
}, { _id: false });

export const TripModel = mongoose.models.Trip || mongoose.model('Trip', tripSchema);

// ── Booking Model ──────────────────────────────────────────────

const bookingSchema = new Schema({
  _id: { type: String, required: true },
  trip_id: { type: String, required: true, ref: 'Trip' },
  type: { type: String, required: true },
  title: { type: String, required: true },
  location: { type: String, default: null },
  start_time: { type: String, required: true },
  end_time: { type: String, default: null },
  cost: { type: Number, required: true },
  cancellation_policy: { type: String, default: null },
  refund_percent: { type: Number, required: true },
  status: { type: String, required: true },
  position: {
    x: { type: Number },
    y: { type: Number }
  }
}, { _id: false });

export const BookingModel = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);

// ── Dependency Edge Model ──────────────────────────────────────

const dependencySchema = new Schema({
  _id: { type: String, required: true, default: () => new mongoose.Types.ObjectId().toString() }, // Can be random UUID/ObjectID for now, but seed SQL didn't provide IDs
  trip_id: { type: String, required: true, ref: 'Trip' },
  from_booking_id: { type: String, required: true, ref: 'Booking' },
  to_booking_id: { type: String, required: true, ref: 'Booking' },
}, { _id: false });

export const DependencyModel = mongoose.models.Dependency || mongoose.model('Dependency', dependencySchema);

// ── Disruption Event Model ─────────────────────────────────────

const disruptionSchema = new Schema({
  _id: { type: String, required: true, default: () => new mongoose.Types.ObjectId().toString() },
  trip_id: { type: String, required: true, ref: 'Trip' },
  booking_id: { type: String, required: true, ref: 'Booking' },
  type: { type: String, required: true },
  severity: { type: String, required: true },
  description: { type: String, default: null },
  created_at: { type: String, default: () => new Date().toISOString() },
}, { _id: false });

export const DisruptionModel = mongoose.models.Disruption || mongoose.model('Disruption', disruptionSchema);

// ── Recovery Option Model ──────────────────────────────────────

const recoveryOptionSchema = new Schema({
  _id: { type: String, required: true, default: () => new mongoose.Types.ObjectId().toString() },
  disruption_id: { type: String, required: true, ref: 'Disruption' },
  label: { type: String, required: true },
  cost_delta: { type: Number, required: true },
  time_delta_minutes: { type: Number, required: true },
  convenience_score: { type: Number, required: true },
  percent_itinerary_affected: { type: Number, required: true },
  changes: { type: Schema.Types.Mixed, required: true },
  selected: { type: Boolean, default: false },
}, { _id: false });

export const RecoveryOptionModel = mongoose.models.RecoveryOption || mongoose.model('RecoveryOption', recoveryOptionSchema);
