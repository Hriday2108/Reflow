'use client';

// Leaflet inner canvas — imported by map-view.tsx via next/dynamic { ssr: false }
// because Leaflet touches `window` at module load and must run browser-only.

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import '@maplibre/maplibre-gl-leaflet';
import type { MapData, MapPoint } from '@/app/api/map-data/route';

// MapTiler key (public — inlined into the client bundle). When present the base
// map is a MapTiler vector style with labels forced to English; when absent we
// fall back to a no-key dark basemap so the map still renders.
const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;

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

// MapTiler vector base layer (via the maplibre-gl-leaflet bridge). After every
// style load, every symbol layer's label is rewritten to prefer the English name
// (name:en → name:latin → local name), so place names render in English.
function MapTilerLayer({ apiKey }: { apiKey: string }) {
  const map = useMap();
  useEffect(() => {
    // The bridge reads `maplibregl` from global scope when the layer is created.
    (window as unknown as { maplibregl: typeof maplibregl }).maplibregl = maplibregl;

    const gl = (L as unknown as {
      maplibreGL: (opts: Record<string, unknown>) => L.Layer & { getMaplibreMap: () => maplibregl.Map };
    }).maplibreGL({
      style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${apiKey}`,
      attribution:
        '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    });
    gl.addTo(map);

    const glMap = gl.getMaplibreMap();
    const localizeToEnglish = () => {
      const style = glMap.getStyle();
      if (!style?.layers) return;
      for (const layer of style.layers) {
        if (layer.type === 'symbol' && layer.layout && 'text-field' in layer.layout) {
          try {
            glMap.setLayoutProperty(layer.id, 'text-field', [
              'coalesce',
              ['get', 'name:en'],
              ['get', 'name:latin'],
              ['get', 'name'],
            ]);
          } catch {
            /* icon-only symbol layers have no name field — skip */
          }
        }
      }
    };
    glMap.on('styledata', localizeToEnglish);

    return () => {
      glMap.off('styledata', localizeToEnglish);
      map.removeLayer(gl as unknown as L.Layer);
    };
  }, [map, apiKey]);
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

  // Itinerary sequence number per booking (1-based), following chronological
  // route order so each marker's label reflects its position in the itinerary.
  const orderById = useMemo(() => {
    const m = new Map<string, number>();
    data.route.forEach((id, i) => m.set(id, i + 1));
    return m;
  }, [data.route]);

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
      {/* Base map: keyed MapTiler vector with English labels when configured,
          else a no-key dark basemap so the map always renders. */}
      {MAPTILER_KEY ? (
        <MapTilerLayer apiKey={MAPTILER_KEY} />
      ) : (
        <TileLayer
          attribution="Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          maxZoom={16}
        />
      )}

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
        const order = orderById.get(p.bookingId);
        // Coincident markers (same coordinate) keep their true position but fan
        // their labels out around the point so they don't stack on top of each
        // other. First one sits above; the rest cycle around the compass.
        const li = p.labelIndex || 0;
        const LABEL_DIRS = ['top', 'right', 'bottom', 'left'] as const;
        const labelDir = li === 0 ? 'top' : LABEL_DIRS[li % LABEL_DIRS.length];
        const ring = li === 0 ? 0 : 8 + 14 * Math.ceil(li / LABEL_DIRS.length);
        const labelOffset: [number, number] =
          labelDir === 'top' ? [0, -6 - ring]
          : labelDir === 'bottom' ? [0, 6 + ring]
          : labelDir === 'right' ? [6 + ring, 0]
          : [-6 - ring, 0];
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
            {/* Permanent English label so every itinerary stop is readable on the
                map regardless of the region's local script, numbered in trip order.
                Coincident stops fan their labels around the marker (see labelDir). */}
            <Tooltip permanent direction={labelDir} offset={labelOffset} className="reflow-map-label">
              <span style={{ fontWeight: 700 }}>{order ? `${order}. ` : ''}</span>
              {p.location || p.title}
            </Tooltip>
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
