import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { BookingModel, DisruptionModel, RecoveryOptionModel } from '@/models';

const DEMO_TRIP_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

export async function POST(request: NextRequest) {
  try {
    const tripId = request.nextUrl.searchParams.get('tripId') || DEMO_TRIP_ID;
    await dbConnect();
    
    // 1. Delete recovery options
    await RecoveryOptionModel.deleteMany({});
    
    // 2. Delete disruption events
    await DisruptionModel.deleteMany({ trip_id: tripId });
    
    // 3. Reset all booking statuses to confirmed
    await BookingModel.updateMany(
      { trip_id: tripId },
      { status: 'confirmed' }
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error resetting demo:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
