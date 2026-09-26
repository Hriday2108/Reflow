import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { BookingModel, DisruptionModel, RecoveryOptionModel } from '@/models';

const ALLOWED_FIELDS = new Set(['status', 'start_time', 'end_time', 'title', 'cost', 'location', 'delay_minutes']);

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

    // 2. Apply every change to the relevant booking
    const changes = option.changes as {
      booking_id: string;
      field: string;
      new_value: string;
    }[];

    // Group changes by booking_id so we can do one update per booking
    const changeMap = new Map<string, Record<string, any>>();
    for (const change of changes) {
      if (!ALLOWED_FIELDS.has(change.field)) continue;
      if (!changeMap.has(change.booking_id)) {
        changeMap.set(change.booking_id, { delay_minutes: 0 }); // Default clear delay when resolved
      }
      changeMap.get(change.booking_id)![change.field] = change.new_value;
    }

    // Run all booking updates
    await Promise.all(
      Array.from(changeMap.entries()).map(([bookingId, fields]) =>
        BookingModel.updateOne({ _id: bookingId }, { $set: fields })
      )
    );

    // 3. Delete the disruption event so the trip is no longer "disrupted"
    await DisruptionModel.deleteOne({ _id: option.disruption_id });

    // 4. Delete ALL recovery options for this disruption (clean up siblings)
    await RecoveryOptionModel.deleteMany({ disruption_id: option.disruption_id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error applying recovery option:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
