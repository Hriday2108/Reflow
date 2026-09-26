import { NextRequest, NextResponse } from 'next/server';
import { fetchNewsItems, summarizeSignals } from '@/lib/social-signals';

/**
 * GET /api/social-signals?location=&weather=
 *
 * Returns a digest of real public news coverage about the location's weather.
 * `signals` is null when there is nothing to show. Errors degrade to a 200 with
 * `signals: null` — this is a supplementary panel, so it must never surface a hard
 * error that disrupts the Weather & Risk view.
 */
export async function GET(req: NextRequest) {
  const location = req.nextUrl.searchParams.get('location');
  const weather = req.nextUrl.searchParams.get('weather') || undefined;

  if (!location) {
    return NextResponse.json({ error: 'Location parameter is required' }, { status: 400 });
  }

  try {
    const posts = await fetchNewsItems(location, weather);
    const signals = await summarizeSignals(location, weather, posts);
    return NextResponse.json({ location, weather: weather ?? null, signals });
  } catch (error) {
    console.error('API /social-signals error:', error);
    return NextResponse.json({ location, weather: weather ?? null, signals: null });
  }
}
