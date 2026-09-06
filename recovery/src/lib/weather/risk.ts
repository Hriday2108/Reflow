import { WeatherData } from './provider';

export type WeatherRiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';

export interface WeatherRiskResult {
  score: number;
  level: WeatherRiskLevel;
  reason: string;
}

export function calculateWeatherRisk(weather: WeatherData): WeatherRiskResult {
  let score = 0;
  const reasons: string[] = [];

  // Wind speed (km/h)
  if (weather.windSpeed !== undefined) {
    if (weather.windSpeed > 80) { score += 50; reasons.push('destructive winds'); }
    else if (weather.windSpeed > 50) { score += 30; reasons.push('strong winds'); }
    else if (weather.windSpeed > 30) { score += 10; reasons.push('breezy conditions'); }
  }

  // Rainfall (mm/hr)
  if (weather.rainfall !== undefined) {
    if (weather.rainfall > 20) { score += 40; reasons.push('torrential rain'); }
    else if (weather.rainfall > 10) { score += 25; reasons.push('heavy rain'); }
    else if (weather.rainfall > 2) { score += 10; reasons.push('moderate rain'); }
  }

  // Visibility (km)
  if (weather.visibility !== undefined) {
    if (weather.visibility < 0.5) { score += 40; reasons.push('near-zero visibility'); }
    else if (weather.visibility < 2) { score += 20; reasons.push('poor visibility'); }
  }

  // Condition codes (OWM 2xx=Thunderstorm, 6xx=Snow, 781=Tornado, etc)
  const id = weather.conditionId;
  if (id === 781 || id === 771) { score += 80; reasons.push('extreme severe weather'); }
  else if (id >= 200 && id < 300) { score += 40; reasons.push('thunderstorms'); }
  else if (id >= 600 && id < 700) { score += 30; reasons.push('snow/ice conditions'); }
  
  // Base risk if none apply, or cap at 100
  if (score === 0) {
    // If it's raining but not heavily (3xx or 5xx)
    if (id >= 300 && id < 600) {
      score = 20;
      reasons.push('light precipitation');
    } else {
      score = 12; // Base inherent travel risk 
    }
  }
  
  score = Math.min(100, score);

  let level: WeatherRiskLevel = 'LOW';
  if (score >= 80) level = 'SEVERE';
  else if (score >= 60) level = 'HIGH';
  else if (score >= 30) level = 'MODERATE';

  let reasonStr = 'Typical weather conditions expected.';
  if (reasons.length > 0) {
    // Capitalize first letter of array
    reasonStr = `${reasons[0].charAt(0).toUpperCase() + reasons[0].slice(1)}`;
    if (reasons.length > 1) {
      reasonStr += ` and ${reasons.slice(1).join(', ')}`;
    }
    reasonStr += ` may affect travel during the scheduled travel window.`;
  }

  return { score, level, reason: reasonStr };
}
