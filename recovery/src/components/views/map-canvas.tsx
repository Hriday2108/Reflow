'use client';

// Leaflet inner canvas — imported by map-view.tsx via next/dynamic { ssr: false }
// because Leaflet touches `window` at module load and must run browser-only.

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { MapData, MapPoint } from '@/app/api/map-data/route';

// Booking-status → marker color (matches the app's status palette).
const STATUS_COLOR: Record<string, string> = {
  confirmed: '#22c55e',
  'at-risk': '#eab308',
  disrupted: '#ef4444',
  rebooked: '#6366f1',
  cancelled: '#6b7280',
};

const RISK_COLOR: Record<string, string> = {
  SEVERE: '#ef4444',
  HIGH: '#f97316',
  MODERATE: '#eab308',
  LOW: '#22c55e',
};

// Recenter/zoom the map to fit all plotted points whenever they change.
function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lon], 9);
      return;
    }
    const bounds = points.map((p) => [p.lat, p.lon]) as [number, number][];
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 11 });
  }, [points, map]);
  return null;
}

export default function MapCanvas({ data }: { data: MapData }) {
  const byId = useMemo(() => {
    const m = new Map<string, MapPoint>();
    for (const p of data.points) m.set(p.bookingId, p);
    return m;
  }, [data.points]);

  // Normal itinerary route: mappable bookings in chronological order.
  const routeLine = useMemo(
    () => data.route.map((id) => byId.get(id)).filter(Boolean).map((p) => [p!.lat, p!.lon] as [number, number]),
    [data.route, byId]
  );

  // Impact-propagation segments: any edge whose endpoints are both a disruption
  // source or downstream booking (the cascade), drawn distinctly in red.
  const impactSegments = useMemo(() => {
    const segs: [number, number][][] = [];
    for (const e of data.edges) {
      const from = byId.get(e.from);
      const to = byId.get(e.to);
      if (!from || !to) continue;
      const inCascade = (p: MapPoint) => p.impact === 'source' || p.impact === 'downstream';
      if (inCascade(from) && inCascade(to)) {
        segs.push([[from.lat, from.lon], [to.lat, to.lon]]);
      }
    }
    return segs;
  }, [data.edges, byId]);

  const center: [number, number] = data.points.length
    ? [data.points[0].lat, data.points[0].lon]
    : [20, 0];

  return (
    <MapContainer
      center={center}
      zoom={data.points.length ? 6 : 2}
      scrollWheelZoom
      style={{ height: '100%', width: '100%', background: '#0b1220' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FitBounds points={data.points} />

      {/* Normal itinerary route (muted, dashed) */}
      {routeLine.length > 1 && (
        <Polyline positions={routeLine} pathOptions={{ color: '#64748b', weight: 2, dashArray: '6 8', opacity: 0.7 }} />
      )}

      {/* Disruption impact propagation (red, thicker) */}
      {impactSegments.map((seg, i) => (
        <Polyline key={`impact-${i}`} positions={seg} pathOptions={{ color: '#ef4444', weight: 4, opacity: 0.9 }} />
      ))}

      {data.points.map((p) => {
        const color = STATUS_COLOR[p.status] || '#3b82f6';
        const isCascade = p.impact === 'source' || p.impact === 'downstream';
        return (
          <CircleMarker
            key={p.bookingId}
            center={[p.lat, p.lon]}
            radius={p.impact === 'source' ? 11 : 8}
            pathOptions={{
              color: isCascade ? '#ef4444' : color,
              weight: isCascade ? 3 : 2,
              fillColor: color,
              fillOpacity: 0.85,
            }}
          >
            <Popup>
              <div style={{ minWidth: 180 }}>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>{p.title}</div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#64748b', marginBottom: 6 }}>
                  {p.type} • {p.status}
                  {p.impact !== 'none' && (
                    <span style={{ color: '#ef4444', fontWeight: 700 }}>
                      {' '}• {p.impact === 'source' ? 'DISRUPTED' : 'IMPACTED'}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#334155' }}>{p.location}</div>
                {p.weather && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.weather.icon} alt={p.weather.description} width={36} height={36} />
                    <div>
                      <div style={{ fontWeight: 700 }}>{p.weather.temp}°C</div>
                      <div style={{ fontSize: 11 }}>{p.weather.description}</div>
                    </div>
                    {p.risk && (
                      <span
                        style={{
                          marginLeft: 'auto',
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 6,
                          color: '#fff',
                          background: RISK_COLOR[p.risk.level] || '#22c55e',
                        }}
                      >
                        {p.risk.level} {p.risk.score}%
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
