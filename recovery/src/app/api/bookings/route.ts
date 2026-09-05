import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { BookingModel } from '@/models';

const DEMO_TRIP_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

export async function GET(request: NextRequest) {
    const tripId = request.nextUrl.searchParams.get('tripId') || DEMO_TRIP_ID;
  try {
    await dbConnect();
    const bookings = await BookingModel.find({ trip_id: tripId })
      .sort({ start_time: 1 })
      .lean();
    
    const mapped = bookings.map(b => ({ ...b, id: b._id }));
    return NextResponse.json(mapped);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

