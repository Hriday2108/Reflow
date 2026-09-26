import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { BookingModel, DependencyModel, DisruptionModel } from '@/models';
import { geocodeLocation, fetchWeatherForLocation } from '@/lib/weather/provider';
import { calculateWeatherRisk } from '@/lib/weather/risk';
import { getDownstreamBookingIds } from '@/lib/disruption-engine';
import type { BookingDependency, BookingStatus, BookingType } from '@/types';

interface BookingDoc {
  _id: string;
  trip_id: string;
  type: BookingType;
  title: string;
  location?: string | null;
  start_time: string;
  end_time?: string | null;
  status: BookingStatus;
}

interface DisruptionDoc {
  _id: string;
  booking_id: string;
}

export interface MapPoint {
  bookingId: string;
  title: string;
  type: BookingType;
  location: string;
  lat: number;
  lon: number;
  status: BookingStatus;
  impact: 'source' | 'downstream' | 'none';
  weather: { temp: number; description: string; icon: string } | null;
  risk: { level: string; score: number } | null;
}

export interface MapData {
  points: MapPoint[];
  route: string[];            // bookingIds in chronological order (mappable only)
  edges: { from: string; to: string }[];
  unmappable: string[];       // titles of bookings whose location didn't geocode
}

/**
 * GET /api/map-data?tripId=
 *
 * Assembles everything the map view needs in one payload: each booking with a
 * geocoded location gets coordinates + live weather + weather-risk, is colored
 * by booking status, and is flagged as the source/downstream of any active
 * disruption (impact propagation via the dependency graph). Locations that
 * can't be geocoded are returned in `unmappable` rather than placed on a guess.
 */
export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const tripId = req.nextUrl.searchParams.get('tripId');
    if (!tripId) {
      return NextResponse.json({ error: 'tripId is required.' }, { status: 400 });
    }

    const [bookings, deps, disruptions] = await Promise.all([
      BookingModel.find({ trip_id: tripId }).lean() as unknown as Promise<BookingDoc[]>,
      DependencyModel.find({ trip_id: tripId }).lean() as unknown as Promise<BookingDependency[]>,
      DisruptionModel.find({ trip_id: tripId }).lean() as unknown as Promise<DisruptionDoc[]>,
    ]);

    // Impact propagation: mark disrupted bookings (source) + everything downstream.
    const sourceIds = new Set(disruptions.map((d) => d.booking_id));
    const downstreamIds = new Set<string>();
    for (const d of disruptions) {
      for (const id of getDownstreamBookingIds(d.booking_id, deps)) downstreamIds.add(id);
    }

    // Geocode + weather once per unique location string, then reuse.
    const locationCache = new Map<string, {
      geo: { lat: number; lon: number } | null;
      weather: MapPoint['weather'];
      risk: MapPoint['risk'];
    }>();

    const uniqueLocations = Array.from(
      new Set(bookings.map((b) => b.location).filter((l): l is string => Boolean(l)))
    );

    await Promise.all(
      uniqueLocations.map(async (loc) => {
        const geo = await geocodeLocation(loc);
        let weather: MapPoint['weather'] = null;
        let risk: MapPoint['risk'] = null;
        if (geo) {
          const w = await fetchWeatherForLocation(loc);
          if (w) {
            weather = { temp: w.temp, description: w.description, icon: w.icon };
            const r = calculateWeatherRisk(w);
            risk = { level: r.level, score: r.score };
          }
        }
        locationCache.set(loc, { geo: geo ? { lat: geo.lat, lon: geo.lon } : null, weather, risk });
      })
    );

    const chronological = [...bookings].sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    const points: MapPoint[] = [];
    const unmappable: string[] = [];

    for (const b of chronological) {
      const cached = b.location ? locationCache.get(b.location) : undefined;
      if (!cached?.geo) {
        unmappable.push(b.title);
        continue;
      }
      points.push({
        bookingId: b._id,
        title: b.title,
        type: b.type,
        location: b.location || '',
        lat: cached.geo.lat,
        lon: cached.geo.lon,
        status: b.status,
        impact: sourceIds.has(b._id) ? 'source' : downstreamIds.has(b._id) ? 'downstream' : 'none',
        weather: cached.weather,
        risk: cached.risk,
      });
    }

    const data: MapData = {
      points,
      route: points.map((p) => p.bookingId),
      edges: deps.map((d) => ({ from: d.from_booking_id, to: d.to_booking_id })),
      unmappable,
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in map-data route:', error);
    return NextResponse.json(
      { error: (error as Error)?.message || 'Failed to build map data.' },
      { status: 500 }
    );
  }
}
