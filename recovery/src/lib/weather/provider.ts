import { GoogleGenAI } from '@google/genai';

export interface ForecastPoint {
  time: string; // ISO string or formatted time
  temp: number;
  description: string;
  icon: string;
  isSevere: boolean;
  conditionId: number;
}

export interface WeatherData {
  city: string;
  temp: number;
  feelsLike?: number;
  description: string;
  icon: string;
  isSevere: boolean;
  conditionId: number;
  windSpeed?: number; // km/h
  humidity?: number; // %
  visibility?: number; // km
  rainfall?: number; // mm/hr
  forecast: ForecastPoint[];
}

function generateLocationCandidates(location: string): string[] {
  const candidates = new Set<string>();
  
  // 1. Always try the raw string first
  candidates.add(location);

  // 2. Clean the string (remove anything in parentheses or brackets)
  let clean = location.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').trim();
  
  // 3. If it looks like a route, we usually want the destination (the last part)
  const routeSeps = ['→', '->', '—', '-'];
  for (const sep of routeSeps) {
    if (clean.includes(sep)) {
      clean = clean.split(sep).pop()!.trim();
      break;
    }
  }

  if (clean) candidates.add(clean);

  // 4. If it's a comma-separated address, try parts
  if (clean.includes(',')) {
    const parts = clean.split(',').map(p => p.trim()).filter(Boolean);
    if (parts.length > 0) candidates.add(parts[0]);
    if (parts.length > 1) candidates.add(parts[parts.length - 1]);
  }

  // 5. Extreme fallback: try the last word
  const words = clean.split(' ').map(w => w.trim()).filter(Boolean);
  if (words.length > 0) {
     candidates.add(words[words.length - 1]);
  }

  // 6. Keyword mapping (Bypass Gemini)
  const keywordMap: Record<string, string> = {
    'delhi': 'New Delhi',
    'mumbai': 'Mumbai',
    'bengaluru': 'Bengaluru',
    'bangalore': 'Bengaluru',
    'mysuru': 'Mysuru',
    'mysore': 'Mysuru',
    'goa': 'Goa',
    'madgaon': 'Goa',
    'benaulim': 'Goa',
    'rome': 'Rome',
    'new york': 'New York'
  };

  const locLower = location.toLowerCase();
  const routeMatch = locLower.match(/to\s+([a-z\s]+)(?:t\d|jn|station|airport)?$/i);
  let searchCity = routeMatch ? routeMatch[1].trim() : locLower;

  for (const [key, city] of Object.entries(keywordMap)) {
    if (searchCity.includes(key)) {
      const arr = Array.from(candidates);
      arr.unshift(city);
      return Array.from(new Set(arr));
    }
  }

  return Array.from(candidates);
}

export interface GeoPoint {
  lat: number;
  lon: number;
  name: string;      // resolved place name (short)
  country?: string;  // ISO 3166 country code (uppercase), when known
  label?: string;    // full resolved place name (e.g. "CSMT, Mumbai, Maharashtra, India")
  placeType?: string[]; // MapTiler feature place_type(s), e.g. ["municipality"] / ["address"]
}

/**
 * Precise-mode candidates: preserve the *specific* point (station / airport /
 * terminal / address) instead of collapsing to a city like
 * generateLocationCandidates does for weather. We only strip parenthetical codes
 * ("Delhi (DEL) Airport" → "Delhi Airport") and normalise whitespace — we do NOT
 * reduce to the city name or apply the weather keyword map, so the geocoder can
 * return the exact facility.
 */
function generatePreciseCandidates(location: string): string[] {
  const out: string[] = [];
  const raw = location.trim();
  if (raw) out.push(raw);
  const noParen = raw.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  if (noParen && noParen !== raw) out.push(noParen);
  return Array.from(new Set(out.filter(Boolean)));
}

/** Pull the ISO country code out of a MapTiler geocoding feature. */
function countryFromMapTilerFeature(feat: any): string | undefined {
  // MapTiler puts the ISO country code directly on the feature's properties
  // (and on every `context` entry) as `country_code`, e.g. "us" / "it".
  const direct = feat?.properties?.country_code;
  if (typeof direct === 'string' && direct) return direct.toUpperCase();
  const ctx = Array.isArray(feat?.context) ? feat.context : [];
  for (const c of ctx) {
    if (typeof c?.id === 'string' && c.id.startsWith('country') && typeof c?.country_code === 'string') {
      return c.country_code.toUpperCase();
    }
  }
  for (const c of ctx) {
    if (typeof c?.country_code === 'string' && c.country_code) return c.country_code.toUpperCase();
  }
  return undefined;
}

/**
 * MapTiler geocoding — relevance-ranked, so a prominent place (Goa, India) wins
 * over an obscure namesake. `countryHint` (ISO code) restricts results to that
 * country to disambiguate. Returns null on missing key / no result.
 */
async function geocodeViaMapTiler(query: string, countryHint?: string): Promise<GeoPoint | null> {
  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  if (!key || key === 'your_maptiler_key_here') return null;
  try {
    const params = new URLSearchParams({ key, limit: '5', language: 'en' });
    if (countryHint) params.set('country', countryHint.toLowerCase());
    const res = await fetch(
      `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?${params.toString()}`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const feats = Array.isArray(data?.features) ? data.features : [];
    if (feats.length === 0) return null;
    const top = feats[0]; // features are relevance-sorted
    const center = top?.center;
    if (!Array.isArray(center) || typeof center[0] !== 'number' || typeof center[1] !== 'number') return null;
    return {
      lat: center[1],
      lon: center[0],
      name: top?.text || query,
      country: countryFromMapTilerFeature(top),
      label: top?.place_name || top?.text || query,
      placeType: Array.isArray(top?.place_type) ? top.place_type : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * OpenWeatherMap direct geocoding fallback. Requests up to 5 matches and, when a
 * `countryHint` is given, both scopes the query (`q=city,COUNTRY`) and prefers a
 * result in that country — instead of blindly taking the first global match.
 */
async function geocodeViaOWM(query: string, countryHint?: string): Promise<GeoPoint | null> {
  const apiKey = process.env.WEATHER_API_KEY;
  if (!apiKey || apiKey === 'your_openweathermap_api_key_here') return null;
  try {
    const q = countryHint ? `${query},${countryHint}` : query;
    const res = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=5&appid=${apiKey}`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;
    const arr = await res.json();
    if (!Array.isArray(arr) || arr.length === 0) return null;
    let hit = arr[0];
    if (countryHint) {
      hit = arr.find((h: any) => (h?.country || '').toUpperCase() === countryHint.toUpperCase()) || arr[0];
    }
    if (typeof hit?.lat !== 'number' || typeof hit?.lon !== 'number') return null;
    return {
      lat: hit.lat,
      lon: hit.lon,
      name: hit.name || query,
      country: (hit.country || '').toUpperCase() || undefined,
      label: [hit.name, hit.state, hit.country].filter(Boolean).join(', ') || hit.name || query,
    };
  } catch {
    return null;
  }
}

/**
 * Resolve a location string to coordinates. Tries MapTiler first
 * (relevance-ranked), then OpenWeatherMap, across candidate variants. Pass
 * `countryHint` (ISO code) to disambiguate cities that share a name across
 * countries. Pass `precise: true` to resolve the exact facility
 * (station/airport/terminal/address) instead of collapsing to the nearest city
 * (which is what the weather lookups want). Returns null if nothing resolves.
 */
export async function geocodeLocation(
  location: string,
  opts: { countryHint?: string; precise?: boolean } = {}
): Promise<GeoPoint | null> {
  if (!location) return null;
  const { countryHint, precise } = opts;
  const candidates = precise
    ? generatePreciseCandidates(location)
    : generateLocationCandidates(location);

  for (const candidate of candidates) {
    const hit = await geocodeViaMapTiler(candidate, countryHint);
    if (hit) return hit;
  }
  for (const candidate of candidates) {
    const hit = await geocodeViaOWM(candidate, countryHint);
    if (hit) return hit;
  }
  return null;
}

export async function fetchWeatherForLocation(location: string): Promise<WeatherData | null> {
  const apiKey = process.env.WEATHER_API_KEY;
  if (!apiKey || apiKey === 'your_openweathermap_api_key_here') {
    console.warn('Weather API key is not configured.');
    return null;
  }
  if (!location) return null;

  const candidates = generateLocationCandidates(location);

  for (const candidate of candidates) {
    try {
      const q = encodeURIComponent(candidate);
      const [currentRes, forecastRes] = await Promise.all([
        fetch(`https://api.openweathermap.org/data/2.5/weather?q=${q}&appid=${apiKey}&units=metric`, { next: { revalidate: 1800 } }),
        fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${q}&appid=${apiKey}&units=metric`, { next: { revalidate: 1800 } })
      ]);
      
      if (!currentRes.ok) {
        continue; // Try next candidate
      }

      const current = await currentRes.json();
      let forecastData: ForecastPoint[] = [];

      if (forecastRes.ok) {
        const forecastJson = await forecastRes.json();
        if (forecastJson.list && Array.isArray(forecastJson.list)) {
          forecastData = forecastJson.list.slice(0, 8).map((point: any) => {
            const conditionId = point.weather[0]?.id || 800;
            return {
              time: point.dt_txt,
              temp: Math.round(point.main.temp),
              description: point.weather[0]?.description || 'Unknown',
              icon: `https://openweathermap.org/img/wn/${point.weather[0]?.icon}@2x.png`,
              isSevere: conditionId < 600 || conditionId === 771 || conditionId === 781,
              conditionId
            };
          });
        }
      }

      const description = current.weather[0]?.description || 'Unknown';
      const conditionId = current.weather[0]?.id || 800;
      
      return {
        city: current.name, // Use the actual name returned by OWM
        temp: Math.round(current.main?.temp || 0),
        feelsLike: current.main?.feels_like ? Math.round(current.main.feels_like) : undefined,
        description: description.charAt(0).toUpperCase() + description.slice(1),
        icon: `https://openweathermap.org/img/wn/${current.weather[0]?.icon || '01d'}@2x.png`,
        isSevere: conditionId < 600 || conditionId === 771 || conditionId === 781,
        conditionId,
        windSpeed: current.wind?.speed ? Math.round(current.wind.speed * 3.6) : undefined,
        humidity: current.main?.humidity,
        visibility: current.visibility ? current.visibility / 1000 : undefined,
        rainfall: current.rain?.['1h'] || current.rain?.['3h'],
        forecast: forecastData
      };
    } catch (e) {
      console.error(`Weather fetch failed for candidate ${candidate}:`, e);
      continue;
    }
  }

  // 4. Final Fallback: If all static string candidates fail, use Gemini to magically extract the city
  if (process.env.GEMINI_API_KEY) {
    try {
      console.log(`[WEATHER FETCH] All candidates failed for "${location}". Falling back to Gemini API...`);
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Identify the nearest major city with a weather station for this travel itinerary location string: "${location}". This might be an airport, train station, or landmark. Return ONLY the exact city name (e.g. "Rome", "Mumbai", "New Delhi", "Goa"), nothing else. If you absolutely cannot determine any valid location, return "UNKNOWN".`;
      const candidateModels = [
        'gemini-3.1-flash-lite',
        'gemini-3.5-flash-lite',
        'gemini-flash-latest',
        'gemini-3.8-flash',
      ];
      let response: any = null;
      for (const modelName of candidateModels) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
          });
          if (response?.text) break;
        } catch {
          continue;
        }
      }
      const aiCity = response.text ? response.text.trim() : '';
      
      if (aiCity && aiCity !== 'UNKNOWN') {
        const q = encodeURIComponent(aiCity);
        const [currentRes, forecastRes] = await Promise.all([
          fetch(`https://api.openweathermap.org/data/2.5/weather?q=${q}&appid=${apiKey}&units=metric`, { next: { revalidate: 1800 } }),
          fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${q}&appid=${apiKey}&units=metric`, { next: { revalidate: 1800 } })
        ]);

        if (currentRes.ok) {
          const current = await currentRes.json();
          let forecastData: ForecastPoint[] = [];

          if (forecastRes.ok) {
            const forecastJson = await forecastRes.json();
            if (forecastJson.list && Array.isArray(forecastJson.list)) {
              forecastData = forecastJson.list.slice(0, 8).map((point: any) => {
                const conditionId = point.weather[0]?.id || 800;
                return {
                  time: point.dt_txt,
                  temp: Math.round(point.main.temp),
                  description: point.weather[0]?.description || 'Unknown',
                  icon: `https://openweathermap.org/img/wn/${point.weather[0]?.icon}@2x.png`,
                  isSevere: conditionId < 600 || conditionId === 771 || conditionId === 781,
                  conditionId
                };
              });
            }
          }

          const description = current.weather[0]?.description || 'Unknown';
          const conditionId = current.weather[0]?.id || 800;
          
          return {
            city: current.name,
            temp: Math.round(current.main?.temp || 0),
            feelsLike: current.main?.feels_like ? Math.round(current.main.feels_like) : undefined,
            description: description.charAt(0).toUpperCase() + description.slice(1),
            icon: `https://openweathermap.org/img/wn/${current.weather[0]?.icon || '01d'}@2x.png`,
            isSevere: conditionId < 600 || conditionId === 771 || conditionId === 781,
            conditionId,
            windSpeed: current.wind?.speed ? Math.round(current.wind.speed * 3.6) : undefined,
            humidity: current.main?.humidity,
            visibility: current.visibility ? current.visibility / 1000 : undefined,
            rainfall: current.rain?.['1h'] || current.rain?.['3h'],
            forecast: forecastData
          };
        }
      }
    } catch (e) {
       console.error(`Gemini fallback failed for location: ${location}`, e);
    }
  }

  // If even Gemini fails
  console.error(`Failed to fetch weather for all candidates of location: ${location}`);
  return null;
}
