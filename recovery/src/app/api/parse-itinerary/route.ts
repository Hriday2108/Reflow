import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import dbConnect from '@/lib/db';
import { TripModel, BookingModel, DependencyModel } from '@/models';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const rawText = (formData.get('text') as string) || '';

    let pdfBase64: string | null = null;
    if (file && typeof (file as any).arrayBuffer === 'function') {
      try {
        const arrayBuffer = await file.arrayBuffer();
        pdfBase64 = Buffer.from(arrayBuffer).toString('base64');
      } catch (fileErr: any) {
        console.warn('Could not read uploaded file buffer:', fileErr);
      }
    }

    if (!pdfBase64 && !rawText.trim()) {
      return NextResponse.json(
        { error: 'No readable ticket PDF or itinerary text provided.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('Missing GEMINI_API_KEY in server environment.');
      return NextResponse.json(
        {
          error:
            'Missing GEMINI_API_KEY. Please ensure you added GEMINI_API_KEY to recovery/.env.local and restarted your terminal dev server (Ctrl+C then npm run dev).',
        },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Schema definition for strictly typed structured output
    const bookingSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        type: { type: Type.STRING, enum: ['flight', 'train', 'hotel', 'transfer', 'activity'] },
        title: { type: Type.STRING, description: 'e.g. Flight 6E 5323 BOM-BLR, Taj Hotel, etc.' },
        location: { type: Type.STRING, description: 'City, airport, or specific venue' },
        start_time: { type: Type.STRING, description: 'Departure or check-in ISO 8601 string' },
        end_time: { type: Type.STRING, description: 'Arrival or check-out ISO 8601 string or null' },
        cost: { type: Type.NUMBER, description: 'Cost in USD (estimate reasonable market cost if missing)' },
        cancellation_policy: { type: Type.STRING, description: 'Cancellation rules or terms' },
        refund_percent: { type: Type.NUMBER, description: 'Estimated refund percentage (0 to 100)' },
        status: { type: Type.STRING, enum: ['confirmed', 'cancelled', 'delayed', 'at-risk'] },
      },
      required: ['type', 'title', 'start_time', 'cost', 'refund_percent', 'status'],
    };

    const tripResponseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        traveler_name: { type: Type.STRING, description: 'Full name of the passenger/traveler' },
        destination: { type: Type.STRING, description: 'Primary destination or route summary' },
        start_date: { type: Type.STRING, description: 'Trip start date (YYYY-MM-DD)' },
        end_date: { type: Type.STRING, description: 'Trip end date (YYYY-MM-DD)' },
        bookings: {
          type: Type.ARRAY,
          items: bookingSchema,
          description: 'Chronologically sorted array of all bookings in the itinerary',
        },
      },
      required: ['traveler_name', 'destination', 'start_date', 'end_date', 'bookings'],
    };

    const promptText = `
      You are an expert travel itinerary extraction engine.
      Analyze the attached travel document (e-ticket PDF, booking confirmation, or text) and extract:
      1. Traveler's full name
      2. Destination or route summary (e.g. "Mumbai → Bengaluru → Mysuru")
      3. Overall trip start and end dates
      4. All individual bookings (flights, trains, transfers, hotel stays, tours) in strict chronological order.

      Rules:
      - If cost is not explicitly written, estimate a realistic market rate in USD ($50 - $400 depending on type).
      - If cancellation terms are not stated, set refund_percent to 100 for flexible or 50 for standard, and policy to "Standard Airline Policy".
      - Set status to "confirmed" unless the document says cancelled.
      - Ensure all timestamps are valid ISO 8601 strings.
      ${rawText ? `\nAdditional text details:\n${rawText}` : ''}
    `;

    const contents: any[] = [];
    if (pdfBase64) {
      contents.push({
        inlineData: {
          data: pdfBase64,
          mimeType: 'application/pdf',
        },
      });
    }
    contents.push(promptText);

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents,
      config: {
        responseMimeType: 'application/json',
        responseSchema: tripResponseSchema,
        temperature: 0.1,
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error('Gemini model did not return any content.');
    }

    const tripData = JSON.parse(resultText);
    const tripId = uuidv4();

    // 1. Create Trip document
    await TripModel.create({
      _id: tripId,
      traveler_name: tripData.traveler_name || 'Traveler',
      destination: tripData.destination || 'Multi-City Itinerary',
      start_date: tripData.start_date || new Date().toISOString().split('T')[0],
      end_date: tripData.end_date || new Date().toISOString().split('T')[0],
    });

    const bookingDocs = [];
    const dependencyDocs = [];
    let previousBookingId: string | null = null;
    let xOffset = 50;

    // 2. Create Bookings and sequential Dependency edges
    for (const b of tripData.bookings) {
      const bookingId = uuidv4();
      const newBooking = {
        _id: bookingId,
        trip_id: tripId,
        type: b.type,
        title: b.title,
        location: b.location || null,
        start_time: b.start_time,
        end_time: b.end_time || null,
        cost: Number(b.cost) || 100,
        cancellation_policy: b.cancellation_policy || 'Standard Carrier Policy',
        refund_percent: Number(b.refund_percent) ?? 100,
        status: b.status || 'confirmed',
        position: { x: xOffset, y: 150 },
      };

      bookingDocs.push(newBooking);

      if (previousBookingId) {
        dependencyDocs.push({
          trip_id: tripId,
          from_booking_id: previousBookingId,
          to_booking_id: bookingId,
        });
      }

      previousBookingId = bookingId;
      xOffset += 320;
    }

    if (bookingDocs.length > 0) {
      await BookingModel.insertMany(bookingDocs);
    }
    if (dependencyDocs.length > 0) {
      await DependencyModel.insertMany(dependencyDocs);
    }

    return NextResponse.json({ tripId });
  } catch (error: any) {
    console.error('Error in parse-itinerary route:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process travel document.' },
      { status: 500 }
    );
  }
}
