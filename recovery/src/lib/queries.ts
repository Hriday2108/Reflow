// ═══════════════════════════════════════════════════════════
// Recovery — Supabase Queries (data access layer)
// ═══════════════════════════════════════════════════════════

import { supabase } from './supabase';
import {
  Trip,
  Booking,
  BookingDependency,
  DisruptionEvent,
  RecoveryOption,
  DisruptionType,
  Severity,
} from '@/types';
import {
  getDownstreamBookingIds,
  generateRecoveryOptions,
} from './disruption-engine';

// The demo trip ID (deterministic, matches seed.sql)
export const DEMO_TRIP_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

// ── Fetch Trip ───────────────────────────────────────────

export async function fetchTrip(): Promise<Trip | null> {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('id', DEMO_TRIP_ID)
    .single();

  if (error) {
    console.error('Error fetching trip:', error);
    return null;
  }
  return data;
}

// ── Fetch Bookings ───────────────────────────────────────

export async function fetchBookings(): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('trip_id', DEMO_TRIP_ID)
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching bookings:', error);
    return [];
  }
  return data || [];
}

// ── Fetch Dependencies ──────────────────────────────────

export async function fetchDependencies(): Promise<BookingDependency[]> {
  const { data, error } = await supabase
    .from('booking_dependencies')
    .select('*')
    .eq('trip_id', DEMO_TRIP_ID);

  if (error) {
    console.error('Error fetching dependencies:', error);
    return [];
  }
  return data || [];
}

// ── Fetch Disruptions ───────────────────────────────────

export async function fetchDisruptions(): Promise<DisruptionEvent[]> {
  const { data, error } = await supabase
    .from('disruption_events')
    .select('*')
    .eq('trip_id', DEMO_TRIP_ID)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching disruptions:', error);
    return [];
  }
  return data || [];
}

// ── Fetch Recovery Options ──────────────────────────────

export async function fetchRecoveryOptions(disruptionId: string): Promise<RecoveryOption[]> {
  const { data, error } = await supabase
    .from('recovery_options')
    .select('*')
    .eq('disruption_id', disruptionId);

  if (error) {
    console.error('Error fetching recovery options:', error);
    return [];
  }
  return (data || []).map((opt) => ({
    ...opt,
    changes: typeof opt.changes === 'string' ? JSON.parse(opt.changes) : opt.changes,
  }));
}

// ── Fetch All Recovery Options ──────────────────────────

export async function fetchAllRecoveryOptions(): Promise<RecoveryOption[]> {
  // Get all disruption IDs for this trip
  const disruptions = await fetchDisruptions();
  if (disruptions.length === 0) return [];

  const { data, error } = await supabase
    .from('recovery_options')
    .select('*')
    .in(
      'disruption_id',
      disruptions.map((d) => d.id)
    );

  if (error) {
    console.error('Error fetching all recovery options:', error);
    return [];
  }
  return (data || []).map((opt) => ({
    ...opt,
    changes: typeof opt.changes === 'string' ? JSON.parse(opt.changes) : opt.changes,
  }));
}

// ── Create Disruption ───────────────────────────────────

export async function createDisruption(
  bookingId: string,
  type: DisruptionType,
  severity: Severity,
  description: string
): Promise<DisruptionEvent | null> {
  // 1. Insert disruption event
  const { data: disruption, error: disruptionError } = await supabase
    .from('disruption_events')
    .insert({
      trip_id: DEMO_TRIP_ID,
      booking_id: bookingId,
      type,
      severity,
      description,
    })
    .select()
    .single();

  if (disruptionError || !disruption) {
    console.error('Error creating disruption:', disruptionError);
    return null;
  }

  // 2. Update the affected booking status to 'disrupted'
  await supabase
    .from('bookings')
    .update({ status: 'disrupted' })
    .eq('id', bookingId);

  // 3. Get dependencies and mark downstream as 'at-risk'
  const dependencies = await fetchDependencies();
  const bookings = await fetchBookings();
  const downstreamIds = getDownstreamBookingIds(bookingId, dependencies);

  if (downstreamIds.length > 0) {
    await supabase
      .from('bookings')
      .update({ status: 'at-risk' })
      .in('id', downstreamIds)
      .in('status', ['confirmed']); // Only update confirmed bookings, not already disrupted ones
  }

  // 4. Generate and insert recovery options
  const affectedBooking = bookings.find((b) => b.id === bookingId);
  if (affectedBooking) {
    const downstreamBookings = bookings.filter((b) => downstreamIds.includes(b.id));
    const options = generateRecoveryOptions(
      disruption,
      affectedBooking,
      downstreamBookings,
      bookings
    );

    const optionsToInsert = options.map((opt) => ({
      disruption_id: disruption.id,
      label: opt.label,
      cost_delta: opt.cost_delta,
      time_delta_minutes: opt.time_delta_minutes,
      convenience_score: opt.convenience_score,
      percent_itinerary_affected: opt.percent_itinerary_affected,
      changes: opt.changes,
      selected: false,
    }));

    await supabase.from('recovery_options').insert(optionsToInsert);
  }

  return disruption;
}

// ── Select Recovery Option ──────────────────────────────

export async function selectRecoveryOption(optionId: string): Promise<boolean> {
  // 1. Get the recovery option
  const { data: option, error: optError } = await supabase
    .from('recovery_options')
    .select('*')
    .eq('id', optionId)
    .single();

  if (optError || !option) {
    console.error('Error fetching recovery option:', optError);
    return false;
  }

  // 2. Mark this option as selected
  await supabase
    .from('recovery_options')
    .update({ selected: true })
    .eq('id', optionId);

  // 3. Apply changes to bookings
  const changes = typeof option.changes === 'string' ? JSON.parse(option.changes) : option.changes;

  for (const change of changes) {
    if (change.field === 'status') {
      await supabase
        .from('bookings')
        .update({ status: change.new_value })
        .eq('id', change.booking_id);
    }
  }

  return true;
}

// ── Reset Demo ──────────────────────────────────────────

export async function resetDemo(): Promise<boolean> {
  try {
    // 1. Delete recovery options (must go before disruptions due to FK)
    await supabase
      .from('recovery_options')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all

    // 2. Delete disruption events
    await supabase
      .from('disruption_events')
      .delete()
      .eq('trip_id', DEMO_TRIP_ID);

    // 3. Reset all booking statuses to confirmed
    await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('trip_id', DEMO_TRIP_ID);

    return true;
  } catch (error) {
    console.error('Error resetting demo:', error);
    return false;
  }
}
