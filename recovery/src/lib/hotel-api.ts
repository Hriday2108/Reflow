/**
 * Booking.com hotel data via RapidAPI (host: booking-com15.p.rapidapi.com).
 *
 * Used to fill real hotel cost + cancellation policy for parsed itineraries and
 * to quote/apply "extend stay" changes. Every function returns null on a missing
 * key or any failure, so callers degrade gracefully (estimate / "Not stated")
 * rather than throwing.
 */

const RAPIDAPI_HOST = 'booking-com15.p.rapidapi.com';
const BASE = `https://${RAPIDAPI_HOST}`;

function headers() {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) return null;
  return { 'x-rapidapi-key': key, 'x-rapidapi-host': RAPIDAPI_HOST };
}

/** YYYY-MM-DD from an ISO string or Date. */
export function toDateStr(d: string | Date): string {
  return new Date(d).toISOString().split('T')[0];
}

export interface HotelRate {
  totalPrice: number;      // total for the queried date range, in USD
  currency: string;        // 'USD'
  hotelName: string;
  hotelId: string | null;
  cancellationPolicy: string | null;
  matched: boolean;        // true if we matched the itinerary hotel by name
}

interface SearchHotel {
  property?: {
    name?: string;
    id?: string | number;
    priceBreakdown?: { grossPrice?: { value?: number } };
  };
}

async function searchDestination(query: string): Promise<{ dest_id: string; search_type: string } | null> {
  const h = headers();
  if (!h) return null;
  try {
    const url = `${BASE}/api/v1/hotels/searchDestination?query=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: h });
    if (!res.ok) return null;
    const json = await res.json();
    const first = json?.data?.[0];
    if (!first?.dest_id || !first?.search_type) return null;
    return { dest_id: String(first.dest_id), search_type: String(first.search_type) };
  } catch {
    return null;
  }
}

/** Best-effort cancellation policy text from hotel details. */
async function getCancellationPolicy(hotelId: string, arrivalDate: string, departureDate: string): Promise<string | null> {
  const h = headers();
  if (!h) return null;
  try {
    const url = `${BASE}/api/v1/hotels/getHotelDetails?hotel_id=${encodeURIComponent(hotelId)}`
      + `&arrival_date=${arrivalDate}&departure_date=${departureDate}`
      + `&adults=1&room_qty=1&units=metric&temperature_unit=c&languagecode=en-us&currency_code=USD`;
    const res = await fetch(url, { headers: h });
    if (!res.ok) return null;
    const json = await res.json();
    const blocks = json?.data?.block;
    if (Array.isArray(blocks)) {
      for (const b of blocks) {
        const txt = b?.paymentterms?.cancellation?.description
          || b?.block_text?.policies?.[0]?.content;
        if (txt && typeof txt === 'string') return txt.trim();
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch the real Booking.com rate (USD total) for a hotel over a date range.
 * Matches the itinerary hotel by name when possible; otherwise uses the
 * cheapest available property in the destination as a grounded market rate.
 */
export async function getHotelRate(params: {
  city: string;
  hotelName: string;
  arrivalDate: string;   // YYYY-MM-DD
  departureDate: string; // YYYY-MM-DD
}): Promise<HotelRate | null> {
  const h = headers();
  if (!h) return null;
  const { city, hotelName, arrivalDate, departureDate } = params;
  if (!city || !arrivalDate || !departureDate) return null;

  try {
    const dest = await searchDestination(city);
    if (!dest) return null;

    const url = `${BASE}/api/v1/hotels/searchHotels?dest_id=${dest.dest_id}`
      + `&search_type=${encodeURIComponent(dest.search_type)}`
      + `&arrival_date=${arrivalDate}&departure_date=${departureDate}`
      + `&adults=1&room_qty=1&page_number=1&currency_code=USD`
      + `&units=metric&temperature_unit=c&languagecode=en-us`;
    const res = await fetch(url, { headers: h });
    if (!res.ok) return null;
    const json = await res.json();
    const hotels: SearchHotel[] = json?.data?.hotels ?? [];
    if (hotels.length === 0) return null;

    // Fuzzy name match against the itinerary hotel title.
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const target = norm(hotelName || '');
    const firstWord = target.split(' ')[0];
    let chosen = hotels.find((x) => {
      const n = norm(x?.property?.name || '');
      return target && (n.includes(target) || target.includes(n) || (firstWord.length > 3 && n.includes(firstWord)));
    });
    const matched = Boolean(chosen);
    if (!chosen) {
      // Fall back to the cheapest property as a grounded market rate.
      chosen = [...hotels].sort(
        (a, b) => (a?.property?.priceBreakdown?.grossPrice?.value ?? Infinity)
                - (b?.property?.priceBreakdown?.grossPrice?.value ?? Infinity)
      )[0];
    }

    const prop = chosen?.property;
    const totalPrice = prop?.priceBreakdown?.grossPrice?.value;
    if (typeof totalPrice !== 'number') return null;
    const hotelId = prop?.id != null ? String(prop.id) : null;

    const cancellationPolicy = hotelId
      ? await getCancellationPolicy(hotelId, arrivalDate, departureDate)
      : null;

    return {
      totalPrice: Math.round(totalPrice * 100) / 100,
      currency: 'USD',
      hotelName: prop?.name || hotelName,
      hotelId,
      cancellationPolicy,
      matched,
    };
  } catch {
    return null;
  }
}
