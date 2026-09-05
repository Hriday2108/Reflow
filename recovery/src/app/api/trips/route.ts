import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { TripModel } from '@/models';

// The demo trip ID
const DEMO_TRIP_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

export async function GET(request: NextRequest) {
    const tripId = request.nextUrl.searchParams.get('tripId') || DEMO_TRIP_ID;
  try {
    await dbConnect();
    // Using lean() to return a plain JS object, and removing __v
    const trip = await TripModel.findOne({ _id: tripId }).select('-_id -__v').lean();
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }
    // Remap id (we didn't use _id because we turned it off in select, wait no, we need id)
    // Actually our schema uses _id as the string ID.
    const tripDoc = await TripModel.findOne({ _id: tripId }).lean();
    if (!tripDoc) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }
    return NextResponse.json({ ...tripDoc, id: tripDoc._id });
  } catch (error) {
    console.error('Error fetching trip:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

