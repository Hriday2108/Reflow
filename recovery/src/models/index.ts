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
  // Nullable: parse-itinerary stores null when a value is not explicitly
  // present in the source document rather than inventing one (RAG anti-hallucination).
  cost: { type: Number, default: null },
  cancellation_policy: { type: String, default: null },
  refund_percent: { type: Number, default: null },
  status: { type: String, required: true },
  delay_minutes: { type: Number, default: 0 },
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
  delay_minutes: { type: Number, default: 0 },
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
  // True when the cost/refund figures are backed by a retrieved policy chunk
  // (RAG grounding); false means the numbers are a rule-based estimate.
  policyVerified: { type: Boolean, default: false },
}, { _id: false });

export const RecoveryOptionModel = mongoose.models.RecoveryOption || mongoose.model('RecoveryOption', recoveryOptionSchema);

// ── Policy Knowledge Chunk Model (RAG) ─────────────────────────
// Stores embedded excerpts from /knowledge-base for retrieval-augmented
// grounding. `embedding` holds the Gemini text-embedding-004 vector.

const policyChunkSchema = new Schema({
  _id: { type: String, required: true, default: () => new mongoose.Types.ObjectId().toString() },
  source: { type: String, required: true }, // originating file name
  text: { type: String, required: true },
  embedding: { type: [Number], required: true },
  created_at: { type: String, default: () => new Date().toISOString() },
}, { _id: false });

export const PolicyChunkModel = mongoose.models.PolicyChunk || mongoose.model('PolicyChunk', policyChunkSchema);

// ── User Model (authentication) ────────────────────────────────

const userSchema = new Schema({
  _id: { type: String, required: true, default: () => new mongoose.Types.ObjectId().toString() },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, default: null },
  // Hashed password (scrypt) for local email/password accounts.
  // Null for accounts created via Google sign-in.
  password_hash: { type: String, default: null },
  avatar: { type: String, default: null },
  provider: { type: String, default: 'local' }, // 'local' | 'google'
  created_at: { type: String, default: () => new Date().toISOString() },
}, { _id: false });

export const UserModel = mongoose.models.User || mongoose.model('User', userSchema);

// ── OTP Model (two-step verification) ──────────────────────────

const otpSchema = new Schema({
  _id: { type: String, required: true, default: () => new mongoose.Types.ObjectId().toString() },
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  code_hash: { type: String, required: true }, // hashed 6-digit code
  attempts: { type: Number, default: 0 },
  // MongoDB TTL index — document auto-deletes at this time.
  expires_at: { type: Date, required: true, index: { expires: 0 } },
  created_at: { type: Date, default: () => new Date() },
}, { _id: false });

export const OtpModel = mongoose.models.Otp || mongoose.model('Otp', otpSchema);
