import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { BookingModel, RecoveryOptionModel } from '@/models';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { optionId } = body;
    
    await dbConnect();
    
    // 1. Get the recovery option
    const option = await RecoveryOptionModel.findById(optionId).lean();
    if (!option) {
      return NextResponse.json({ error: 'Option not found' }, { status: 404 });
    }
    
    // 2. Mark this option as selected
    await RecoveryOptionModel.updateOne({ _id: optionId }, { selected: true });
    
    // 3. Apply changes to bookings
    const changes = option.changes;
    
    for (const change of changes) {
      if (change.field === 'status') {
        await BookingModel.updateOne(
          { _id: change.booking_id },
          { status: change.new_value }
        );
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error selecting recovery option:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
