import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { BookingModel, DependencyModel, DisruptionModel, RecoveryOptionModel } from '@/models';
import { getDownstreamBookingIds, generateRecoveryOptions } from '@/lib/disruption-engine';

const DEMO_TRIP_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

export async function POST(request: NextRequest) {
  try {
    const tripId = request.nextUrl.searchParams.get('tripId') || DEMO_TRIP_ID;
    const body = await request.json();
    const { bookingId, type, severity, description } = body;
    
    await dbConnect();
    
    // 1. Insert disruption event
    const disruption = await DisruptionModel.create({
      trip_id: tripId,
      booking_id: bookingId,
      type,
      severity,
      description,
    });
    
    // 2. Update the affected booking status to 'disrupted'
    await BookingModel.updateOne({ _id: bookingId }, { status: 'disrupted' });
    
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
        { ...disruption.toObject(), id: disruption._id },
        affectedBooking,
        downstreamBookings,
        bookings
      );
      
      const optionsToInsert = options.map(opt => ({
        disruption_id: disruption._id,
        label: opt.label,
        cost_delta: opt.cost_delta,
        time_delta_minutes: opt.time_delta_minutes,
        convenience_score: opt.convenience_score,
        percent_itinerary_affected: opt.percent_itinerary_affected,
        changes: opt.changes,
        selected: false,
      }));
      
      if (optionsToInsert.length > 0) {
        await RecoveryOptionModel.insertMany(optionsToInsert);
      }
    }
    
    return NextResponse.json({ ...disruption.toObject(), id: disruption._id });
  } catch (error) {
    console.error('Error creating disruption:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
