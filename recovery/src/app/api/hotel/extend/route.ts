import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { BookingModel, DependencyModel } from '@/models';
import { getHotelRate, toDateStr } from '@/lib/hotel-api';
import { retrievePolicyContext } from '@/lib/policy-retrieval';
import { getDownstreamBookingIds } from '@/lib/disruption-engine';
import { extractCityFromLocation } from '@/lib/utils';
import type { BookingDependency } from '@/types';

const DAY_MS = 24 * 60 * 60 * 1000;

interface BookingDoc {
  _id: string;
  trip_id: string;
  type: string;
  title?: string;
  location?: string | null;
  start_time: string;
  end_time?: string | null;
  cost?: number | null;
  cancellation_policy?: string | null;
}

/**
 * Extend a hotel stay by N nights.
 *
 * POST /api/hotel/extend  body: { bookingId, extraNights }
 *   ?preview=1 → quote only (added cost + new checkout + policy), no writes.
 *   otherwise  → persists: hotel end_time/cost/policy updated AND every
 *                downstream booking is shifted forward by `extraNights` days.
 *
 * Added cost uses REAL Booking.com data for the extra-night range when
 * available (source:'booking.com'); otherwise it falls back to the stay's own
 * per-night rate (source:'estimate'). Never invents a policy.
 */
export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const preview = req.nextUrl.searchParams.get('preview') === '1';
    const body = await req.json();
    const bookingId = String(body?.bookingId || '');
    const extraNights = Math.max(1, Math.min(14, Math.floor(Number(body?.extraNights) || 0)));

    if (!bookingId || extraNights < 1) {
      return NextResponse.json({ error: 'bookingId and a valid extraNights (1–14) are required.' }, { status: 400 });
    }

    const booking = await BookingModel.findById(bookingId).lean() as BookingDoc | null;
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }
    if (booking.type !== 'hotel') {
      return NextResponse.json({ error: 'Extend Stay is only available for hotel bookings.' }, { status: 400 });
    }
    if (!booking.end_time) {
      return NextResponse.json({ error: 'This hotel booking has no checkout date to extend.' }, { status: 400 });
    }

    const checkIn = new Date(booking.start_time);
    const oldCheckout = new Date(booking.end_time);
    const newCheckout = new Date(oldCheckout.getTime() + extraNights * DAY_MS);

    const origNights = Math.max(1, Math.round((oldCheckout.getTime() - checkIn.getTime()) / DAY_MS));
    const existingCost: number | null = booking.cost != null ? Number(booking.cost) : null;

    // Price the EXTRA nights with real Booking.com data when possible.
    const city = extractCityFromLocation(booking.location || '') || booking.location || '';
    const rate = city
      ? await getHotelRate({
          city,
          hotelName: booking.title || '',
          arrivalDate: toDateStr(oldCheckout),
          departureDate: toDateStr(newCheckout),
        })
      : null;

    let addedCost: number;
    let source: 'booking.com' | 'estimate';
    let cancellationPolicy: string | null = booking.cancellation_policy ?? null;

    if (rate) {
      addedCost = rate.totalPrice;
      source = 'booking.com';
      if (rate.cancellationPolicy) cancellationPolicy = rate.cancellationPolicy;
    } else {
      // Fall back to the stay's own per-night rate (grounded in the existing
      // booking) rather than inventing a market price.
      const perNight = existingCost != null ? existingCost / origNights : 0;
      addedCost = Math.round(perNight * extraNights * 100) / 100;
      source = 'estimate';
    }

    // Ground a still-missing policy from the knowledge base as a last resort.
    if (!cancellationPolicy) {
      const chunks = await retrievePolicyContext(`hotel ${booking.title} cancellation refund policy`, 1);
      if (chunks.length > 0) {
        cancellationPolicy = `Per policy: ${chunks[0].text.slice(0, 240)}… (source: ${chunks[0].source})`;
      }
    }

    const newTotalCost = existingCost != null ? Math.round((existingCost + addedCost) * 100) / 100 : addedCost;

    if (preview) {
      return NextResponse.json({
        preview: true,
        extraNights,
        addedCost,
        newTotalCost,
        newCheckout: newCheckout.toISOString(),
        currency: 'USD',
        cancellationPolicy,
        source,
        matched: rate?.matched ?? false,
      });
    }

    // ── Persist: update the hotel booking ─────────────────────────
    await BookingModel.updateOne(
      { _id: bookingId },
      {
        $set: {
          end_time: newCheckout.toISOString(),
          cost: newTotalCost,
          cancellation_policy: cancellationPolicy,
        },
      }
    );

    // ── Shift every downstream booking forward by extraNights days ─
    const deps = await DependencyModel.find({ trip_id: booking.trip_id }).lean() as unknown as BookingDependency[];
    const downstreamIds = getDownstreamBookingIds(bookingId, deps);
    let shiftedCount = 0;
    if (downstreamIds.length > 0) {
      const downstream = await BookingModel.find({ _id: { $in: downstreamIds } }).lean() as BookingDoc[];
      await Promise.all(
        downstream.map((b) => {
          const set: Record<string, string> = {};
          if (b.start_time) set.start_time = new Date(new Date(b.start_time).getTime() + extraNights * DAY_MS).toISOString();
          if (b.end_time) set.end_time = new Date(new Date(b.end_time).getTime() + extraNights * DAY_MS).toISOString();
          if (Object.keys(set).length === 0) return Promise.resolve();
          shiftedCount++;
          return BookingModel.updateOne({ _id: b._id }, { $set: set });
        })
      );
    }

    return NextResponse.json({
      success: true,
      extraNights,
      addedCost,
      newTotalCost,
      newCheckout: newCheckout.toISOString(),
      currency: 'USD',
      cancellationPolicy,
      source,
      matched: rate?.matched ?? false,
      shiftedCount,
    });
  } catch (error) {
    console.error('Error in hotel/extend route:', error);
    return NextResponse.json({ error: (error as Error)?.message || 'Failed to extend hotel stay.' }, { status: 500 });
  }
}
