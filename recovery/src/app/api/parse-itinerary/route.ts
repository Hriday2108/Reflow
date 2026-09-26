import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import dbConnect from '@/lib/db';
import { TripModel, BookingModel, DependencyModel } from '@/models';
import { retrievePolicyContext } from '@/lib/policy-retrieval';
import { getHotelRate, toDateStr } from '@/lib/hotel-api';
import { extractCityFromLocation } from '@/lib/utils';
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
        cost: { type: Type.NUMBER, description: 'Cost in USD. If the document states the price in another currency (e.g. INR), convert it to its approximate USD value. Use null if no price is explicitly present — do NOT estimate or invent.', nullable: true },
        cancellation_policy: { type: Type.STRING, description: 'Cancellation rules or terms exactly as stated. Use null if not present — do NOT invent.', nullable: true },
        refund_percent: { type: Type.NUMBER, description: 'Refund percentage (0 to 100) only if explicitly stated. Use null if not present — do NOT estimate.', nullable: true },
        status: { type: Type.STRING, enum: ['confirmed', 'cancelled', 'delayed', 'at-risk'] },
      },
      required: ['type', 'title', 'start_time', 'status'],
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
      - Extract ONLY information explicitly present in the document. Never invent facts.
      - Costs must be expressed in USD. If the document lists a price in another currency (e.g. INR ₹, EUR €), convert it to its approximate USD value before returning it.
      - If cost is not explicitly written, output null for cost. Do NOT estimate a market rate.
      - If cancellation terms are not stated, output null for cancellation_policy and null for refund_percent. Do NOT guess a policy or refund percentage.
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

    const candidateModels = [
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash-lite',
      'gemini-flash-latest',
      'gemini-3.8-flash',
      'gemini-3.5-flash',
    ];

    let response: any = null;
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            responseMimeType: 'application/json',
            responseSchema: tripResponseSchema,
            temperature: 0.1,
          },
        });
        if (response?.text) {
          console.log(`[PARSE-ITINERARY] Successfully parsed with model: ${modelName}`);
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[PARSE-ITINERARY] Model ${modelName} failed (${err?.message?.slice(0, 80)}). Trying next candidate...`);
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error('All Gemini model candidates are temporarily unavailable. Please try again in a few moments.');
    }

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

      // Preserve null when a value wasn't in the document (no fabrication).
      let cost = b.cost != null ? Number(b.cost) : null;
      const refundPercent = b.refund_percent != null ? Number(b.refund_percent) : null;
      let cancellationPolicy: string | null = b.cancellation_policy ?? null;

      // Hotel enrichment: when the document didn't state a cost or policy, fill
      // the gap with REAL Booking.com data (never an invented number) for the
      // stay's actual date range. Falls back silently on any failure.
      if (b.type === 'hotel' && (cost == null || !cancellationPolicy) && b.start_time && b.end_time) {
        const city = extractCityFromLocation(b.location || '') || b.location || '';
        if (city) {
          const rate = await getHotelRate({
            city,
            hotelName: b.title || '',
            arrivalDate: toDateStr(b.start_time),
            departureDate: toDateStr(b.end_time),
          });
          if (rate) {
            if (cost == null) cost = rate.totalPrice;
            if (!cancellationPolicy && rate.cancellationPolicy) {
              cancellationPolicy = rate.cancellationPolicy;
            }
          }
        }
      }

      // Optional RAG fill: when no policy was stated (and none from the hotel
      // API), try to ground it from the knowledge base instead of leaving it
      // permanently blank.
      if (!cancellationPolicy) {
        const chunks = await retrievePolicyContext(`${b.type} ${b.title} cancellation refund policy`, 1);
        if (chunks.length > 0) {
          cancellationPolicy = `Per policy: ${chunks[0].text.slice(0, 240)}… (source: ${chunks[0].source})`;
        }
      }

      const newBooking = {
        _id: bookingId,
        trip_id: tripId,
        type: b.type,
        title: b.title,
        location: b.location || null,
        start_time: b.start_time,
        end_time: b.end_time || null,
        cost,
        cancellation_policy: cancellationPolicy,
        refund_percent: refundPercent,
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

    let friendlyMessage = error?.message || 'Failed to process travel document.';
    
    // Check if error is serialized JSON from Google API
    try {
      const parsed = JSON.parse(error.message);
      if (parsed?.error?.code === 429 || parsed?.error?.status === 'RESOURCE_EXHAUSTED') {
        friendlyMessage = 'Gemini AI rate limit reached. Please wait a moment and try again.';
      } else if (parsed?.error?.message) {
        friendlyMessage = parsed.error.message;
      }
    } catch {
      if (friendlyMessage.includes('429') || friendlyMessage.includes('quota') || friendlyMessage.includes('RESOURCE_EXHAUSTED')) {
        friendlyMessage = 'Gemini AI rate limit reached. Please wait a moment and try again.';
      }
    }

    return NextResponse.json(
      { error: friendlyMessage },
      { status: 500 }
    );
  }
}
