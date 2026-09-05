// ═══════════════════════════════════════════════════════════
// Recovery — API Queries (data access layer)
// ═══════════════════════════════════════════════════════════

import {
  Trip,
  Booking,
  BookingDependency,
  DisruptionEvent,
  RecoveryOption,
  DisruptionType,
  Severity,
} from '@/types';

// The demo trip ID (matches seed data)
export const DEMO_TRIP_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

// ── Fetch Trip ───────────────────────────────────────────

export async function fetchTrip(tripId?: string): Promise<Trip | null> {
  try {
    const url = tripId ? `/api/trips?tripId=${tripId}` : '/api/trips';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch trip');
    return await res.json();
  } catch (error) {
    console.error('Error fetching trip:', error);
    return null;
  }
}

// ── Fetch Bookings ───────────────────────────────────────

export async function fetchBookings(tripId?: string): Promise<Booking[]> {
  try {
    const url = tripId ? `/api/bookings?tripId=${tripId}` : '/api/bookings';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch bookings');
    return await res.json();
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return [];
  }
}

// ── Fetch Dependencies ──────────────────────────────────

export async function fetchDependencies(tripId?: string): Promise<BookingDependency[]> {
  try {
    const url = tripId ? `/api/dependencies?tripId=${tripId}` : '/api/dependencies';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch dependencies');
    return await res.json();
  } catch (error) {
    console.error('Error fetching dependencies:', error);
    return [];
  }
}

// ── Fetch Disruptions ───────────────────────────────────

export async function fetchDisruptions(tripId?: string): Promise<DisruptionEvent[]> {
  try {
    const url = tripId ? `/api/disruptions?tripId=${tripId}` : '/api/disruptions';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch disruptions');
    return await res.json();
  } catch (error) {
    console.error('Error fetching disruptions:', error);
    return [];
  }
}

// ── Fetch All Recovery Options ──────────────────────────

export async function fetchAllRecoveryOptions(tripId?: string): Promise<RecoveryOption[]> {
  try {
    const url = tripId ? `/api/recovery-options?tripId=${tripId}` : '/api/recovery-options';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch recovery options');
    return await res.json();
  } catch (error) {
    console.error('Error fetching all recovery options:', error);
    return [];
  }
}

// ── Create Disruption ───────────────────────────────────

export async function createDisruption(
  bookingId: string,
  type: DisruptionType,
  severity: Severity,
  description: string,
  tripId?: string
): Promise<DisruptionEvent | null> {
  try {
    const url = tripId ? `/api/actions/disruptions?tripId=${tripId}` : '/api/actions/disruptions';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, type, severity, description })
    });
    if (!res.ok) throw new Error('Failed to create disruption');
    return await res.json();
  } catch (error) {
    console.error('Error creating disruption:', error);
    return null;
  }
}

// ── Select Recovery Option ──────────────────────────────

export async function selectRecoveryOption(optionId: string): Promise<boolean> {
  try {
    const res = await fetch('/api/actions/recovery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optionId })
    });
    if (!res.ok) throw new Error('Failed to select recovery option');
    return true;
  } catch (error) {
    console.error('Error selecting recovery option:', error);
    return false;
  }
}

// ── Reset Demo ──────────────────────────────────────────

export async function resetDemo(tripId?: string): Promise<boolean> {
  try {
    const url = tripId ? `/api/actions/reset?tripId=${tripId}` : '/api/actions/reset';
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reset demo');
    return true;
  } catch (error) {
    console.error('Error resetting demo:', error);
    return false;
  }
}

