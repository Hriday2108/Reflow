// ═══════════════════════════════════════════════════════════
// Recovery — Disruption Engine (pure logic, no DB calls)
// ═══════════════════════════════════════════════════════════

import {
  Booking,
  BookingType,
  BookingDependency,
  DisruptionType,
  ImpactItem,
  ImpactAnalysis,
  DisruptionEvent,
  RecoveryOption,
  RiskWarning,
} from '@/types';
import { formatCurrency } from '@/lib/utils';

// ── Downstream traversal (BFS) ──────────────────────────

export function getDownstreamBookingIds(
  bookingId: string,
  dependencies: BookingDependency[]
): string[] {
  const downstream: string[] = [];
  const queue = [bookingId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    for (const dep of dependencies) {
      if (dep.from_booking_id === current && !visited.has(dep.to_booking_id)) {
        downstream.push(dep.to_booking_id);
        queue.push(dep.to_booking_id);
      }
    }
  }

  return downstream;
}

// ── Impact Analysis ─────────────────────────────────────

export function computeImpactAnalysis(
  disruption: DisruptionEvent,
  bookings: Booking[],
  dependencies: BookingDependency[]
): ImpactAnalysis {
  const affectedBooking = bookings.find((b) => b.id === disruption.booking_id)!;
  const downstreamIds = getDownstreamBookingIds(disruption.booking_id, dependencies);
  const downstreamBookings = bookings.filter((b) => downstreamIds.includes(b.id));

  const directImpact: ImpactItem = {
    booking: affectedBooking,
    reason: getDirectImpactReason(disruption, affectedBooking),
    severity: disruption.severity,
  };

  const downstreamImpacts: ImpactItem[] = downstreamBookings.map((b) => ({
    booking: b,
    reason: getDownstreamImpactReason(disruption, affectedBooking, b),
    severity: disruption.severity === 'high' ? 'high' : 'medium',
  }));

  const totalCostAtRisk =
    affectedBooking.cost +
    downstreamBookings.reduce((sum, b) => sum + b.cost, 0);

  return {
    disruption,
    directImpact,
    downstreamImpacts,
    totalCostAtRisk,
  };
}

function getDirectImpactReason(disruption: DisruptionEvent, booking: Booking): string {
  const desc = disruption.description || '';
  switch (disruption.type) {
    case 'delay':
      return `${booking.title} has been delayed. ${desc}`;
    case 'cancellation':
      return `${booking.title} has been cancelled. ${desc}`;
    case 'missed-connection':
      return `Connection missed — ${booking.title} can no longer be reached in time. ${desc}`;
    case 'weather':
      return `Weather disruption affecting ${booking.title}. ${desc}`;
    case 'traveler-initiated':
      return `You've requested a change to ${booking.title}. ${desc}`;
    case 'transfer-failure':
      return `Transfer service for ${booking.title} is unavailable. ${desc}`;
    default:
      return `${booking.title} has been disrupted. ${desc}`;
  }
}

function getDownstreamImpactReason(
  disruption: DisruptionEvent,
  source: Booking,
  downstream: Booking
): string {
  const sourceTime = source.end_time
    ? new Date(source.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : '';
  const downTime = new Date(downstream.start_time).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  switch (disruption.type) {
    case 'delay':
      return `${downstream.title} (scheduled ${downTime}) is at risk because ${source.title} is delayed past its ${sourceTime} arrival.`;
    case 'cancellation':
      return `${downstream.title} depends on ${source.title}, which has been cancelled.`;
    case 'missed-connection':
      return `${downstream.title} will be missed due to the broken connection at ${source.title}.`;
    case 'weather':
      return `${downstream.title} may be affected by the weather event impacting ${source.title}.`;
    case 'transfer-failure':
      return `${downstream.title} depends on the transfer ${source.title}, which is unavailable.`;
    default:
      return `${downstream.title} is downstream of the disrupted ${source.title}.`;
  }
}

// ── Recovery Option Generation ──────────────────────────

export function generateRecoveryOptions(
  disruption: DisruptionEvent,
  affectedBooking: Booking,
  downstreamBookings: Booking[],
  allBookings: Booking[]
): Omit<RecoveryOption, 'id' | 'disruption_id'>[] {
  const totalBookings = allBookings.length;

  switch (disruption.type) {
    case 'delay':
      return generateDelayOptions(affectedBooking, downstreamBookings, totalBookings);
    case 'cancellation':
      return generateCancellationOptions(affectedBooking, downstreamBookings, totalBookings);
    case 'weather':
      return generateWeatherOptions(affectedBooking, downstreamBookings, totalBookings);
    case 'transfer-failure':
      return generateTransferFailureOptions(affectedBooking, downstreamBookings, totalBookings);
    default:
      return generateGenericOptions(affectedBooking, downstreamBookings, totalBookings);
  }
}

function generateDelayOptions(
  booking: Booking,
  downstream: Booking[],
  totalBookings: number
): Omit<RecoveryOption, 'id' | 'disruption_id'>[] {
  const affectedCount = 1 + downstream.length;
  const pctAffected = Math.round((affectedCount / totalBookings) * 100);

  return [
    {
      label: 'Wait It Out — Keep Current Booking',
      cost_delta: 0,
      time_delta_minutes: 120,
      convenience_score: 2,
      percent_itinerary_affected: pctAffected,
      changes: [
        {
          booking_id: booking.id,
          field: 'status',
          old_value: 'disrupted',
          new_value: 'confirmed',
          description: `Accept delay on ${booking.title} and adjust downstream timings`,
        },
        ...downstream.map((b) => ({
          booking_id: b.id,
          field: 'status',
          old_value: 'at-risk',
          new_value: 'confirmed',
          description: `Adjust ${b.title} timing to accommodate delay`,
        })),
      ],
      selected: false,
    },
    {
      label: `Rebook Next Available ${booking.type === 'flight' ? 'Flight' : 'Service'}`,
      cost_delta: booking.type === 'flight' ? 85 : 25,
      time_delta_minutes: 45,
      convenience_score: 4,
      percent_itinerary_affected: Math.round((2 / totalBookings) * 100),
      changes: [
        {
          booking_id: booking.id,
          field: 'status',
          old_value: 'disrupted',
          new_value: 'rebooked',
          description: `Rebook to next available ${booking.type} — minimal delay`,
        },
        ...downstream.slice(0, 1).map((b) => ({
          booking_id: b.id,
          field: 'status',
          old_value: 'at-risk',
          new_value: 'confirmed',
          description: `${b.title} adjusted to match new timing`,
        })),
        ...downstream.slice(1).map((b) => ({
          booking_id: b.id,
          field: 'status',
          old_value: 'at-risk',
          new_value: 'confirmed',
          description: `${b.title} remains on schedule`,
        })),
      ],
      selected: false,
    },
    {
      label: 'Switch to Alternative Transport + Adjust Downstream',
      cost_delta: booking.type === 'flight' ? 45 : 15,
      time_delta_minutes: 90,
      convenience_score: 3,
      percent_itinerary_affected: pctAffected,
      changes: [
        {
          booking_id: booking.id,
          field: 'status',
          old_value: 'disrupted',
          new_value: 'rebooked',
          description: `Switch to alternative ${booking.type === 'flight' ? 'train' : 'bus'} service`,
        },
        ...downstream.map((b) => ({
          booking_id: b.id,
          field: 'status',
          old_value: 'at-risk',
          new_value: 'confirmed',
          description: `${b.title} rescheduled to fit new arrival`,
        })),
      ],
      selected: false,
    },
  ];
}

function generateCancellationOptions(
  booking: Booking,
  downstream: Booking[],
  totalBookings: number
): Omit<RecoveryOption, 'id' | 'disruption_id'>[] {
  const affectedCount = 1 + downstream.length;
  const pctAffected = Math.round((affectedCount / totalBookings) * 100);
  const refundAmount = (booking.cost * booking.refund_percent) / 100;

  return [
    {
      label: `Rebook Same Day — New ${booking.type === 'flight' ? 'Flight' : 'Service'}`,
      cost_delta: booking.type === 'flight' ? 120 : 40,
      time_delta_minutes: 180,
      convenience_score: 4,
      percent_itinerary_affected: Math.round((2 / totalBookings) * 100),
      changes: [
        {
          booking_id: booking.id,
          field: 'status',
          old_value: 'disrupted',
          new_value: 'rebooked',
          description: `Rebook on same-day alternative. Refund of ${formatCurrency(refundAmount)} applied.`,
        },
        ...downstream.map((b) => ({
          booking_id: b.id,
          field: 'status',
          old_value: 'at-risk',
          new_value: 'confirmed',
          description: `${b.title} adjusted to new arrival time`,
        })),
      ],
      selected: false,
    },
    {
      label: 'Cancel Remainder of Day — Refund & Rebook Tomorrow',
      cost_delta: -refundAmount + 60,
      time_delta_minutes: 0,
      convenience_score: 3,
      percent_itinerary_affected: pctAffected,
      changes: [
        {
          booking_id: booking.id,
          field: 'status',
          old_value: 'disrupted',
          new_value: 'cancelled',
          description: `Cancel and claim ${formatCurrency(refundAmount)} refund`,
        },
        ...downstream.map((b) => ({
          booking_id: b.id,
          field: 'status',
          old_value: 'at-risk',
          new_value: 'rebooked',
          description: `${b.title} rescheduled for next day`,
        })),
      ],
      selected: false,
    },
    {
      label: 'Switch to Alternative Route',
      cost_delta: booking.type === 'flight' ? 65 : 20,
      time_delta_minutes: 120,
      convenience_score: 2,
      percent_itinerary_affected: pctAffected,
      changes: [
        {
          booking_id: booking.id,
          field: 'status',
          old_value: 'disrupted',
          new_value: 'rebooked',
          description: `Take alternative route via different ${booking.type === 'flight' ? 'airline/train' : 'service'}`,
        },
        ...downstream.map((b) => ({
          booking_id: b.id,
          field: 'status',
          old_value: 'at-risk',
          new_value: 'confirmed',
          description: `${b.title} rescheduled to fit new route`,
        })),
      ],
      selected: false,
    },
  ];
}

function generateWeatherOptions(
  booking: Booking,
  downstream: Booking[],
  totalBookings: number
): Omit<RecoveryOption, 'id' | 'disruption_id'>[] {
  const affectedCount = 1 + downstream.length;
  const pctAffected = Math.round((affectedCount / totalBookings) * 100);

  return [
    {
      label: 'Reschedule to Next Clear Window',
      cost_delta: 15,
      time_delta_minutes: 240,
      convenience_score: 3,
      percent_itinerary_affected: pctAffected,
      changes: [
        {
          booking_id: booking.id,
          field: 'status',
          old_value: 'disrupted',
          new_value: 'rebooked',
          description: `Reschedule ${booking.title} to next available weather window`,
        },
        ...downstream.map((b) => ({
          booking_id: b.id,
          field: 'status',
          old_value: 'at-risk',
          new_value: 'confirmed',
          description: `${b.title} shifted to accommodate weather delay`,
        })),
      ],
      selected: false,
    },
    {
      label: 'Switch to Indoor Alternative',
      cost_delta: 30,
      time_delta_minutes: 0,
      convenience_score: 4,
      percent_itinerary_affected: Math.round((1 / totalBookings) * 100),
      changes: [
        {
          booking_id: booking.id,
          field: 'status',
          old_value: 'disrupted',
          new_value: 'rebooked',
          description: `Replace with indoor alternative activity`,
        },
        ...downstream.map((b) => ({
          booking_id: b.id,
          field: 'status',
          old_value: 'at-risk',
          new_value: 'confirmed',
          description: `${b.title} remains on schedule`,
        })),
      ],
      selected: false,
    },
    {
      label: 'Cancel & Get Full Refund (Weather Policy)',
      cost_delta: -booking.cost,
      time_delta_minutes: 0,
      convenience_score: 2,
      percent_itinerary_affected: pctAffected,
      changes: [
        {
          booking_id: booking.id,
          field: 'status',
          old_value: 'disrupted',
          new_value: 'cancelled',
          description: `Cancel due to weather — full refund of ${formatCurrency(booking.cost)}`,
        },
        ...downstream.map((b) => ({
          booking_id: b.id,
          field: 'status',
          old_value: 'at-risk',
          new_value: 'confirmed',
          description: `${b.title} — free time in schedule`,
        })),
      ],
      selected: false,
    },
  ];
}

function generateTransferFailureOptions(
  booking: Booking,
  downstream: Booking[],
  totalBookings: number
): Omit<RecoveryOption, 'id' | 'disruption_id'>[] {
  const affectedCount = 1 + downstream.length;
  const pctAffected = Math.round((affectedCount / totalBookings) * 100);

  return [
    {
      label: 'Book Rideshare (Uber/Taxi)',
      cost_delta: 25,
      time_delta_minutes: 15,
      convenience_score: 5,
      percent_itinerary_affected: Math.round((1 / totalBookings) * 100),
      changes: [
        {
          booking_id: booking.id,
          field: 'status',
          old_value: 'disrupted',
          new_value: 'rebooked',
          description: `Replace with rideshare — fast, flexible pickup`,
        },
        ...downstream.map((b) => ({
          booking_id: b.id,
          field: 'status',
          old_value: 'at-risk',
          new_value: 'confirmed',
          description: `${b.title} stays on schedule`,
        })),
      ],
      selected: false,
    },
    {
      label: 'Take Public Transit',
      cost_delta: -booking.cost + 5,
      time_delta_minutes: 45,
      convenience_score: 2,
      percent_itinerary_affected: pctAffected,
      changes: [
        {
          booking_id: booking.id,
          field: 'status',
          old_value: 'disrupted',
          new_value: 'rebooked',
          description: `Switch to public transit — cheaper but slower`,
        },
        ...downstream.map((b) => ({
          booking_id: b.id,
          field: 'status',
          old_value: 'at-risk',
          new_value: 'confirmed',
          description: `${b.title} may need minor timing adjustment`,
        })),
      ],
      selected: false,
    },
    {
      label: 'Wait for Next Transfer Slot',
      cost_delta: 0,
      time_delta_minutes: 60,
      convenience_score: 3,
      percent_itinerary_affected: pctAffected,
      changes: [
        {
          booking_id: booking.id,
          field: 'status',
          old_value: 'disrupted',
          new_value: 'confirmed',
          description: `Wait for next available transfer pickup`,
        },
        ...downstream.map((b) => ({
          booking_id: b.id,
          field: 'status',
          old_value: 'at-risk',
          new_value: 'confirmed',
          description: `${b.title} shifted by ~1 hour`,
        })),
      ],
      selected: false,
    },
  ];
}

function generateGenericOptions(
  booking: Booking,
  downstream: Booking[],
  totalBookings: number
): Omit<RecoveryOption, 'id' | 'disruption_id'>[] {
  const affectedCount = 1 + downstream.length;
  const pctAffected = Math.round((affectedCount / totalBookings) * 100);

  return [
    {
      label: 'Rebook at Nearest Availability',
      cost_delta: 50,
      time_delta_minutes: 60,
      convenience_score: 4,
      percent_itinerary_affected: Math.round((2 / totalBookings) * 100),
      changes: [
        {
          booking_id: booking.id,
          field: 'status',
          old_value: 'disrupted',
          new_value: 'rebooked',
          description: `Rebook ${booking.title} at next available slot`,
        },
        ...downstream.map((b) => ({
          booking_id: b.id,
          field: 'status',
          old_value: 'at-risk',
          new_value: 'confirmed',
          description: `${b.title} adjusted accordingly`,
        })),
      ],
      selected: false,
    },
    {
      label: 'Cancel & Refund',
      cost_delta: -(booking.cost * booking.refund_percent) / 100,
      time_delta_minutes: 0,
      convenience_score: 2,
      percent_itinerary_affected: pctAffected,
      changes: [
        {
          booking_id: booking.id,
          field: 'status',
          old_value: 'disrupted',
          new_value: 'cancelled',
          description: `Cancel ${booking.title} and process refund`,
        },
        ...downstream.map((b) => ({
          booking_id: b.id,
          field: 'status',
          old_value: 'at-risk',
          new_value: 'confirmed',
          description: `${b.title} freed up`,
        })),
      ],
      selected: false,
    },
    {
      label: 'Keep & Monitor',
      cost_delta: 0,
      time_delta_minutes: 30,
      convenience_score: 3,
      percent_itinerary_affected: pctAffected,
      changes: [
        {
          booking_id: booking.id,
          field: 'status',
          old_value: 'disrupted',
          new_value: 'confirmed',
          description: `Monitor ${booking.title} — situation may resolve`,
        },
        ...downstream.map((b) => ({
          booking_id: b.id,
          field: 'status',
          old_value: 'at-risk',
          new_value: 'confirmed',
          description: `${b.title} held pending resolution`,
        })),
      ],
      selected: false,
    },
  ];
}

// ── Risk Warnings ────────────────────────────────────────

export function computeRiskWarnings(
  bookings: Booking[],
  dependencies: BookingDependency[]
): RiskWarning[] {
  const warnings: RiskWarning[] = [];
  let warningId = 0;

  for (const dep of dependencies) {
    const from = bookings.find((b) => b.id === dep.from_booking_id);
    const to = bookings.find((b) => b.id === dep.to_booking_id);
    if (!from || !to) continue;

    // Check tight connections (< 60 min gap)
    if (from.end_time && to.start_time) {
      const gapMinutes =
        (new Date(to.start_time).getTime() - new Date(from.end_time).getTime()) / (1000 * 60);

      if (gapMinutes > 0 && gapMinutes < 60) {
        warnings.push({
          id: `risk-${warningId++}`,
          bookingIds: [from.id, to.id],
          message: `Only ${Math.round(gapMinutes)} min between ${from.title} and ${to.title} — tight connection`,
          severity: gapMinutes < 30 ? 'high' : 'medium',
          type: 'tight-connection',
        });
      }
    }

    // Check non-refundable downstream bookings
    if (to.refund_percent === 0 && to.cost > 100) {
      warnings.push({
        id: `risk-${warningId++}`,
        bookingIds: [to.id],
        message: `${to.title} (${formatCurrency(to.cost)}) is non-refundable — consider travel insurance`,
        severity: 'medium',
        type: 'non-refundable',
      });
    }
  }

  return warnings;
}

// ── Booking Type Disruption Mapping ──────────────────────

export const VALID_DISRUPTIONS_BY_BOOKING_TYPE: Record<BookingType, DisruptionType[]> = {
  flight: ['delay', 'cancellation', 'weather', 'traveler-initiated'],
  train: ['delay', 'cancellation', 'missed-connection', 'weather', 'traveler-initiated'],
  transfer: ['delay', 'transfer-failure', 'weather', 'traveler-initiated'],
  hotel: ['cancellation', 'traveler-initiated'],
  activity: ['cancellation', 'weather', 'traveler-initiated'],
  event: ['cancellation', 'weather', 'traveler-initiated'],
};

export function isDisruptionValidForBookingType(
  disruptionType: DisruptionType,
  bookingType: BookingType
): boolean {
  return VALID_DISRUPTIONS_BY_BOOKING_TYPE[bookingType]?.includes(disruptionType) ?? false;
}

export function isBookingEligibleForDisruption(
  booking: Booking,
  targetTypes: BookingType[]
): boolean {
  const isTypeValid = targetTypes.includes(booking.type);
  const isStatusEligible = booking.status === 'confirmed' || booking.status === 'at-risk';
  return isTypeValid && isStatusEligible;
}
