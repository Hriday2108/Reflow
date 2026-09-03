// ═══════════════════════════════════════════════════════════
// Recovery — Core TypeScript Types
// ═══════════════════════════════════════════════════════════

export type BookingStatus = 'confirmed' | 'at-risk' | 'disrupted' | 'rebooked' | 'cancelled';

export type BookingType = 'flight' | 'train' | 'hotel' | 'transfer' | 'activity' | 'event';

export type DisruptionType =
  | 'delay'
  | 'cancellation'
  | 'missed-connection'
  | 'weather'
  | 'traveler-initiated'
  | 'transfer-failure';

export type Severity = 'low' | 'medium' | 'high';

// ── Trip ─────────────────────────────────────────────────

export interface Trip {
  id: string;
  traveler_name: string;
  destination: string;
  start_date: string;
  end_date: string;
}

// ── Booking ──────────────────────────────────────────────

export interface Booking {
  id: string;
  trip_id: string;
  type: BookingType;
  title: string;
  location: string | null;
  start_time: string;
  end_time: string | null;
  cost: number;
  cancellation_policy: string | null;
  refund_percent: number;
  status: BookingStatus;
  position: { x: number; y: number } | null;
}

// ── Dependency Edge ──────────────────────────────────────

export interface BookingDependency {
  id: string;
  trip_id: string;
  from_booking_id: string;
  to_booking_id: string;
}

// ── Disruption Event ─────────────────────────────────────

export interface DisruptionEvent {
  id: string;
  trip_id: string;
  booking_id: string;
  type: DisruptionType;
  severity: Severity;
  description: string | null;
  created_at: string;
}

// ── Recovery Option ──────────────────────────────────────

export interface BookingChange {
  booking_id: string;
  field: string;
  old_value: string;
  new_value: string;
  description: string;
}

export interface RecoveryOption {
  id: string;
  disruption_id: string;
  label: string;
  cost_delta: number;
  time_delta_minutes: number;
  convenience_score: number; // 1-5
  percent_itinerary_affected: number;
  changes: BookingChange[];
  selected: boolean;
}

// ── Impact Analysis ──────────────────────────────────────

export interface ImpactItem {
  booking: Booking;
  reason: string; // plain-language explanation
  severity: Severity;
}

export interface ImpactAnalysis {
  disruption: DisruptionEvent;
  directImpact: ImpactItem;
  downstreamImpacts: ImpactItem[];
  totalCostAtRisk: number;
}

// ── Risk Warning ─────────────────────────────────────────

export interface RiskWarning {
  id: string;
  bookingIds: string[];
  message: string;
  severity: Severity;
  type: 'tight-connection' | 'non-refundable' | 'weather-risk' | 'late-arrival';
}

// ── Graph types for React Flow ───────────────────────────

export interface BookingNodeData {
  booking: Booking;
  isSelected: boolean;
  onSelect: (booking: Booking) => void;
}
