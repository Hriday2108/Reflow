import { NextRequest, NextResponse } from 'next/server';
import { fetchWeatherForLocation } from '@/lib/weather/provider';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const location = searchParams.get('location');

  if (!location) {
    return NextResponse.json({ error: 'Location parameter is required' }, { status: 400 });
  }

  try {
    const weatherData = await fetchWeatherForLocation(location);
    if (!weatherData) {
      return NextResponse.json({ error: 'Failed to fetch weather or API key missing' }, { status: 500 });
    }

    return NextResponse.json(weatherData);
  } catch (error) {
    console.error('API /weather error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
