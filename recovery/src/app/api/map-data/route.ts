import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { BookingModel, DependencyModel, DisruptionModel } from '@/models';
import { geocodeLocation, fetchWeatherForLocation, type GeoPoint } from '@/lib/weather/provider';
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
  // How many earlier points share this point's (near-identical) coordinate. The
  // client fans out the labels of coincident markers so they don't overlap, while
  // every marker stays at its own true coordinate. 0 = first/only at this spot.
  labelIndex: number;
}

export interface MapData {
  points: MapPoint[];
  route: string[];            // bookingIds in chronological order (mappable only)
  edges: { from: string; to: string }[];
  unmappable: string[];       // titles of bookings whose location didn't geocode
}

// Route-style location strings ("Delhi (DEL) → Mumbai (BOM)") encode two
// endpoints. Split only on arrow-like separators — never a plain hyphen, which
// occurs inside real place names.
function splitRoute(loc: string): string[] {
  for (const sep of ['→', '->', '—', '–']) {
    if (loc.includes(sep)) return loc.split(sep).map((s) => s.trim()).filter(Boolean);
  }
  return [loc.trim()];
}

// The specific endpoint this booking's marker represents. Vehicle legs
// (flight/train/transfer) are pinned at their DEPARTURE point so the line to the
// next stop traces the journey and the trip's origin still gets a marker; stays
// and activities use the place as-is.
function endpointToken(type: BookingType, location: string): string {
  const parts = splitRoute(location);
  if (parts.length >= 2) {
    return type === 'flight' || type === 'train' || type === 'transfer'
      ? parts[0]
      : parts[parts.length - 1];
  }
  return location.trim();
}

// Enrich the endpoint with a facility keyword so the geocoder returns the exact
// airport/station rather than the city, when the string doesn't already say so.
function facilityQuery(type: BookingType, token: string): string {
  const low = token.toLowerCase();
  if (type === 'flight' && !low.includes('airport') && !low.includes('airfield')) return `${token} Airport`;
  if (type === 'train' && !/(station|junction|terminus|termini|\bjn\b|smn|hbf|hauptbahnhof)/.test(low)) {
    return `${token} railway station`;
  }
  return token;
}

// Haversine distance in km — used to sanity-check that a "precise" facility hit
// isn't wildly far from the city it should be in.
function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

// Do a query and a resolved place name share a meaningful (non-generic) word?
// Guards country re-resolution: re-querying "Madgaon Junction" in-country still
// yields "Madgaon" (accept), but forcing a genuine foreign origin like
// "New York (JFK)" into the trip's country yields an unrelated name (reject).
const GENERIC_TOKENS = new Set([
  'airport', 'airfield', 'station', 'railway', 'junction', 'terminus', 'termini',
  'international', 'road', 'the', 'city', 'central', 'centrale', 'beach', 'hotel', 'resort',
]);
function sharesToken(query: string, name?: string): boolean {
  if (!name) return false;
  const toks = (s: string) =>
    new Set(
      s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((t) => t.length >= 3 && !GENERIC_TOKENS.has(t))
    );
  const q = toks(query);
  const n = toks(name);
  for (const t of q) if (n.has(t)) return true;
  return false;
}

// A country-correction retry is only trustworthy if it lands on an actual
// settlement/region, not a street or POI that merely contains the query words
// (e.g. a "Via New York" street in Italy when the real stop is JFK in the US).
// Reject those so a legitimate foreign endpoint keeps its true coordinate.
const NON_SETTLEMENT_TYPES = new Set(['address', 'street', 'road', 'poi', 'postal_code']);
function looksLikeSettlement(g: GeoPoint): boolean {
  if (!g.placeType || g.placeType.length === 0) return true; // OWM / unknown → city-level
  return !g.placeType.some((t) => NON_SETTLEMENT_TYPES.has(t));
}

// The bare city/settlement portion of an endpoint, used as the country-vote key,
// fallback anchor, and weather lookup — kept distinct from the precise facility
// query. Stripping a parenthetical code and any ", detail" suffix lets the coarse
// geocoder resolve the *city* ("Florence, Mercato Centrale" → "Florence",
// "New York (JFK)" → "New York") instead of a foreign namesake of the full
// facility string (e.g. a "Mercato Centrale" night market in Cebu, Philippines).
function cityToken(endpoint: string): string {
  const noParen = endpoint.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  const firstPart = noParen.split(',')[0].trim();
  return firstPart || noParen;
}

// Default region bias. Ambiguous place names (e.g. "Goa", "Mysuru") are steered
// to India, and India is assumed when an itinerary gives no confident country
// signal — overridable per-trip when the stops themselves clearly vote another
// country (e.g. an all-Italy trip). Set NEXT_PUBLIC_GEO_REGION to change it.
const DEFAULT_REGION = (process.env.NEXT_PUBLIC_GEO_REGION || 'IN').toUpperCase();

// Coarse country bounding boxes ([minLat, maxLat, minLon, maxLon]) used to
// validate that a resolved coordinate actually falls inside the itinerary's
// expected country. A hit outside the box is a geocoding miss (a same-named
// place abroad) and is dropped back to the city-level anchor.
const REGION_BBOX: Record<string, [number, number, number, number]> = {
  IN: [6.5, 37.1, 68.1, 97.4],
  IT: [35.4, 47.1, 6.6, 18.6],
  US: [24.4, 49.4, -125.0, -66.9],
  GB: [49.8, 60.9, -8.7, 1.8],
  FR: [41.3, 51.1, -5.2, 9.6],
  AE: [22.6, 26.1, 51.5, 56.4],
  SG: [1.1, 1.5, 103.6, 104.1],
  TH: [5.6, 20.5, 97.3, 105.7],
};
function inRegion(lat: number, lon: number, country?: string): boolean {
  if (!country) return true; // no expectation → can't invalidate
  const box = REGION_BBOX[country];
  if (!box) return true; // region we don't have a box for → don't second-guess
  return lat >= box[0] && lat <= box[1] && lon >= box[2] && lon <= box[3];
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

    // Bookings that can be placed on the map: those with a location string.
    const geoBookings = bookings.filter(
      (b): b is BookingDoc & { location: string } => Boolean(b.location)
    );

    // Per-booking geocoding target: the specific endpoint (departure point for
    // vehicle legs), a facility-enriched "precise" query for the exact
    // airport/station/place, and the bare city token used as a fallback anchor
    // and for the trip's country vote.
    const targetByBooking = new Map<string, { token: string; preciseQ: string; cityQ: string }>();
    for (const b of geoBookings) {
      const token = endpointToken(b.type, b.location);
      targetByBooking.set(b._id, {
        token,
        preciseQ: facilityQuery(b.type, token),
        cityQ: cityToken(token),
      });
    }
    const targets = Array.from(targetByBooking.values());
    const uniqueCities = Array.from(new Set(targets.map((t) => t.cityQ)));
    const uniquePrecise = Array.from(new Set(targets.map((t) => t.preciseQ)));

    // --- Pass 1: resolve every city token (coarse) and every precise facility
    // query independently. ---
    const cityGeo = new Map<string, GeoPoint | null>();
    const preciseGeo = new Map<string, GeoPoint | null>();
    await Promise.all([
      ...uniqueCities.map(async (c) => { cityGeo.set(c, await geocodeLocation(c)); }),
      ...uniquePrecise.map(async (q) => { preciseGeo.set(q, await geocodeLocation(q, { precise: true })); }),
    ]);

    // Infer the trip's dominant country from the (more reliable) city resolutions,
    // biased toward the default region: give it a +1 head start so ambiguous /
    // weakly-signalled itineraries resolve to India, while a trip whose stops
    // clearly vote another country (e.g. all-Italy) still wins on its own count.
    const countryCounts = new Map<string, number>();
    countryCounts.set(DEFAULT_REGION, 1);
    for (const g of cityGeo.values()) {
      if (g?.country) countryCounts.set(g.country, (countryCounts.get(g.country) || 0) + 1);
    }
    let dominantCountry: string | undefined;
    let bestCount = 0;
    for (const [country, count] of countryCounts) {
      if (count > bestCount) { bestCount = count; dominantCountry = country; }
    }
    // No usable signal at all → fall back to the default region outright.
    if (!dominantCountry) dominantCountry = DEFAULT_REGION;
    // --- Pass 2: any city token that resolved to a *different* country than the
    // trip's dominant one is likely an ambiguous namesake ("Goa" → Philippines).
    // Re-query it scoped to the dominant country and accept only if the result is
    // an actual settlement that still shares a meaningful token (guards against
    // forcing a genuine foreign origin like "New York" → a "Via New York" street
    // in Italy). ---
    if (dominantCountry && countryCounts.size > 1) {
      await Promise.all(
        uniqueCities.map(async (c) => {
          const g = cityGeo.get(c);
          if (!g?.country || g.country === dominantCountry) return;
          const retry = await geocodeLocation(c, { countryHint: dominantCountry });
          if (retry && sharesToken(c, retry.name) && looksLikeSettlement(retry)) {
            console.warn(
              `[map-data] "${c}" first resolved to ${g.country} (${g.lat}, ${g.lon}); ` +
              `re-resolved within trip country ${dominantCountry} to (${retry.lat}, ${retry.lon}).`
            );
            cityGeo.set(c, retry);
          } else {
            console.warn(
              `[map-data] "${c}" resolved to ${g.country} (${g.lat}, ${g.lon}), outside the ` +
              `trip's dominant country ${dominantCountry}, and had no confident in-country ` +
              `settlement match. Plotting as-is — a legitimately foreign stop, or verify the string.`
            );
          }
        })
      );
    }
    // --- Pass 3: choose each stop's final coordinate. Prefer the precise facility
    // hit, but reject one that landed in the wrong country or implausibly far from
    // its city anchor (noisy POI namesakes, e.g. "Santa Lucia Station" → a
    // "Santa Lucia" town 68 km from Venice); try an in-country re-query, else fall
    // back to the city coordinate with a warning. 45 km keeps genuine out-of-town
    // airports while rejecting a facility that landed in a different settlement. ---
    const MAX_FACILITY_KM = 45;
    const pairKey = (t: { preciseQ: string; cityQ: string }) => `${t.cityQ}|||${t.preciseQ}`;
    const uniquePairs = Array.from(new Map(targets.map((t) => [pairKey(t), t])).values());
    const finalGeo = new Map<string, { lat: number; lon: number } | null>();
    await Promise.all(
      uniquePairs.map(async (t) => {
        const key = pairKey(t);
        const city = cityGeo.get(t.cityQ) || null;
        let precise = preciseGeo.get(t.preciseQ) || null;

        const wrongCountry = (p: GeoPoint) =>
          Boolean(dominantCountry && p.country && p.country !== dominantCountry);
        const tooFar = (p: GeoPoint) =>
          Boolean(city && distanceKm(p.lat, p.lon, city.lat, city.lon) > MAX_FACILITY_KM);

        if (precise && (wrongCountry(precise) || tooFar(precise))) {
          const retry = dominantCountry
            ? await geocodeLocation(t.preciseQ, { countryHint: dominantCountry, precise: true })
            : null;
          precise = retry && sharesToken(t.preciseQ, retry.name) && !tooFar(retry) ? retry : null;
        }

        if (precise) {
          finalGeo.set(key, { lat: precise.lat, lon: precise.lon });
        } else if (city) {
          console.warn(
            `[map-data] precise geocode for "${t.preciseQ}" unavailable or implausible; ` +
            `falling back to city anchor "${t.cityQ}" (${city.lat}, ${city.lon}).`
          );
          finalGeo.set(key, { lat: city.lat, lon: city.lon });
        } else {
          finalGeo.set(key, null);
        }
      })
    );
    // --- Pass 4: region validation. Confirm every final coordinate falls inside
    // the trip's expected country box; a hit outside it slipped past the country
    // hint (missing/blank country_code on the feature) and is a same-named place
    // abroad. Drop back to the city-level anchor when that anchor is itself
    // in-region; otherwise keep the coordinate but warn (a legitimately foreign
    // stop, e.g. an intercontinental flight's origin, has no in-region fallback). ---
    if (REGION_BBOX[dominantCountry]) {
      for (const t of uniquePairs) {
        const key = pairKey(t);
        const fg = finalGeo.get(key);
        if (!fg || inRegion(fg.lat, fg.lon, dominantCountry)) continue;
        const city = cityGeo.get(t.cityQ) || null;
        if (city && inRegion(city.lat, city.lon, dominantCountry)) {
          console.warn(
            `[map-data] "${t.preciseQ}" resolved to (${fg.lat}, ${fg.lon}), outside the trip's ` +
            `expected region ${dominantCountry}; falling back to city anchor "${t.cityQ}" ` +
            `(${city.lat}, ${city.lon}).`
          );
          finalGeo.set(key, { lat: city.lat, lon: city.lon });
        } else {
          console.warn(
            `[map-data] "${t.preciseQ}" resolved to (${fg.lat}, ${fg.lon}), outside the trip's ` +
            `expected region ${dominantCountry}, with no in-region city fallback. Plotting as-is ` +
            `— a legitimately foreign stop, or verify the location string.`
          );
        }
      }
    }
    // --- Weather + risk once per unique city token, then reuse. ---
    const weatherByCity = new Map<string, { weather: MapPoint['weather']; risk: MapPoint['risk'] }>();
    await Promise.all(
      uniqueCities.map(async (c) => {
        let weather: MapPoint['weather'] = null;
        let risk: MapPoint['risk'] = null;
        if (cityGeo.get(c)) {
          const w = await fetchWeatherForLocation(c);
          if (w) {
            weather = { temp: w.temp, description: w.description, icon: w.icon };
            const r = calculateWeatherRisk(w);
            risk = { level: r.level, score: r.score };
          }
        }
        weatherByCity.set(c, { weather, risk });
      })
    );

    const chronological = [...bookings].sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    const points: MapPoint[] = [];
    const unmappable: string[] = [];
    // Count coincident coordinates so the client can fan out overlapping labels.
    // Markers/lines keep their TRUE coordinates — we never move a point, so every
    // segment still connects two real locations. ~11 m bucket (4 dp) = "same spot".
    const seenCoord = new Map<string, number>();

    for (const b of chronological) {
      const target = targetByBooking.get(b._id);
      const geo = target ? finalGeo.get(pairKey(target)) : null;
      if (!geo) {
        unmappable.push(b.title);
        continue;
      }
      const { lat, lon } = geo;
      const ck = `${lat.toFixed(4)},${lon.toFixed(4)}`;
      const labelIndex = seenCoord.get(ck) || 0;
      seenCoord.set(ck, labelIndex + 1);

      const wr = target ? weatherByCity.get(target.cityQ) : undefined;
      points.push({
        bookingId: b._id,
        title: b.title,
        type: b.type,
        location: b.location || '',
        lat,
        lon,
        status: b.status,
        impact: sourceIds.has(b._id) ? 'source' : downstreamIds.has(b._id) ? 'downstream' : 'none',
        weather: wr?.weather ?? null,
        risk: wr?.risk ?? null,
        labelIndex,
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
