import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { DisruptionModel, RecoveryOptionModel } from '@/models';

const DEMO_TRIP_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

export async function GET(request: NextRequest) {
    const tripId = request.nextUrl.searchParams.get('tripId') || DEMO_TRIP_ID;
  try {
    await dbConnect();
    
    // Get all disruptions first
    const disruptions = await DisruptionModel.find({ trip_id: tripId }).lean();
    if (disruptions.length === 0) {
      return NextResponse.json([]);
    }
    
    const disruptionIds = disruptions.map(d => d._id);
    
    const options = await RecoveryOptionModel.find({ disruption_id: { $in: disruptionIds } }).lean();
    
    const mapped = options.map(opt => ({ ...opt, id: opt._id }));
    return NextResponse.json(mapped);
  } catch (error) {
    console.error('Error fetching recovery options:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

