import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { BookingModel, DependencyModel, DisruptionModel, RecoveryOptionModel } from '@/models';
import { getDownstreamBookingIds, generateRecoveryOptions } from '@/lib/disruption-engine';
import { retrievePolicyContext } from '@/lib/policy-retrieval';

const DEMO_TRIP_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

export async function POST(request: NextRequest) {
  try {
    const tripId = request.nextUrl.searchParams.get('tripId') || DEMO_TRIP_ID;
    const body = await request.json();
    const { bookingId, type, severity, description, delayMinutes } = body;
    const parsedDelay = delayMinutes ? Number(delayMinutes) : 0;
    
    await dbConnect();
    
    // 1. Insert disruption event
    const disruption = await DisruptionModel.create({
      trip_id: tripId,
      booking_id: bookingId,
      type,
      severity,
      description,
      delay_minutes: parsedDelay,
    });
    
    // 2. Update the affected booking status to 'disrupted' and record delay_minutes
    await BookingModel.updateOne(
      { _id: bookingId },
      { status: 'disrupted', delay_minutes: parsedDelay }
    );
    
    // 3. Get dependencies and mark downstream as 'at-risk'
    const depsDoc = await DependencyModel.find({ trip_id: tripId }).lean();
    const bookingsDoc = await BookingModel.find({ trip_id: tripId }).lean();
    
    // Remap IDs for the engine
    const dependencies = depsDoc.map(d => ({ ...d, id: d._id } as any));
    const bookings = bookingsDoc.map(b => ({ ...b, id: b._id } as any));
    
    const downstreamIds = getDownstreamBookingIds(bookingId, dependencies);
    
    if (downstreamIds.length > 0) {
      await BookingModel.updateMany(
        { _id: { $in: downstreamIds }, status: 'confirmed' },
        { status: 'at-risk' }
      );
    }
    
    // 4. Generate and insert recovery options
    const affectedBooking = bookings.find((b: any) => b.id === bookingId);
    if (affectedBooking) {
      const downstreamBookings = bookings.filter((b: any) => downstreamIds.includes(b.id));
      const options = generateRecoveryOptions(
        { ...disruption.toObject(), id: disruption._id, delay_minutes: parsedDelay },
        affectedBooking,
        downstreamBookings,
        bookings
      );

      // RAG grounding: retrieve relevant policy excerpts for this disruption.
      // The recovery options themselves are computed by rule-based logic from
      // real booking costs, so we don't ask an LLM to invent numbers. We use
      // retrieval only to flag whether the cost/refund figures are backed by a
      // known policy ("Policy-verified") or remain a rule-based estimate.
      const policyQuery = `${type} ${severity} ${affectedBooking.type} ${affectedBooking.title} cancellation refund rebooking policy`;
      const policyChunks = await retrievePolicyContext(policyQuery);
      const policyVerified = policyChunks.length > 0;

      const optionsToInsert = options.map(opt => ({
        disruption_id: disruption._id,
        label: opt.label,
        cost_delta: opt.cost_delta,
        time_delta_minutes: opt.time_delta_minutes,
        convenience_score: opt.convenience_score,
        percent_itinerary_affected: opt.percent_itinerary_affected,
        changes: opt.changes,
        selected: false,
        policyVerified,
      }));
      
      if (optionsToInsert.length > 0) {
        await RecoveryOptionModel.insertMany(optionsToInsert);
      }
    }
    
    return NextResponse.json({ ...disruption.toObject(), id: disruption._id, delay_minutes: parsedDelay });
  } catch (error) {
    console.error('Error creating disruption:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
