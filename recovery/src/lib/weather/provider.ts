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
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
      });
      const aiCity = response.text.trim();
      
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
