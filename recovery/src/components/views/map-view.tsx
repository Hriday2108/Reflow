'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Map as MapIcon, RefreshCw, AlertCircle, MapPinOff } from 'lucide-react';
import type { SidebarView } from '@/components/sidebar';
import type { MapData } from '@/app/api/map-data/route';
import { cn } from '@/lib/utils';

// Leaflet touches `window` at import, so the canvas is loaded client-only.
const MapCanvas = dynamic(() => import('@/components/views/map-canvas'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-card/10">
      <RefreshCw className="w-8 h-8 text-primary animate-spin" />
    </div>
  ),
});

interface MapViewProps {
  tripId: string;
  onNavigate: (view: SidebarView) => void;
}

const STATUS_LEGEND: { label: string; color: string }[] = [
  { label: 'Confirmed', color: '#22c55e' },
  { label: 'At risk', color: '#eab308' },
  { label: 'Disrupted', color: '#ef4444' },
  { label: 'Rebooked', color: '#6366f1' },
  { label: 'Cancelled', color: '#6b7280' },
];

export default function MapView({ tripId }: MapViewProps) {
  const [data, setData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // No synchronous setState before the first await — the initial-load effect
  // calls this, and set-state-in-effect forbids a sync state update there.
  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/map-data?tripId=${encodeURIComponent(tripId)}`);
      if (!res.ok) throw new Error('Map data unavailable');
      setData(await res.json());
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Map data is temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    // `load` is async and touches state only after its first await, so this is
    // safe despite the rule's static check (matches the app's established pattern).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const hasPoints = (data?.points.length ?? 0) > 0;

  return (
    <div className="h-full flex flex-col bg-background/50">
      {/* Header */}
      <header className="px-6 py-6 border-b border-border/30 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MapIcon className="w-6 h-6 text-primary" />
            Trip Map
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Locations, live weather &amp; risk, and simulated disruption impact across your itinerary.
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); load(); }}
          disabled={loading}
          className="p-2 rounded-lg bg-card/50 border border-border/50 hover:bg-card/80 transition-colors"
        >
          <RefreshCw className={cn('w-4 h-4 text-muted-foreground', loading && 'animate-spin')} />
        </button>
      </header>

      <div className="flex-1 relative min-h-0">
        {error && (
          <div className="absolute inset-0 z-[500] flex items-center justify-center p-6">
            <div className="flex items-center gap-3 p-4 text-sm text-amber-400 bg-amber-900/10 rounded-xl border border-amber-900/30 max-w-md">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          </div>
        )}

        {!error && !loading && data && !hasPoints && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
            <MapPinOff className="w-10 h-10 text-muted-foreground mb-3 opacity-60" />
            <p className="text-sm text-muted-foreground max-w-sm">
              None of this trip&apos;s locations could be placed on the map. Check that bookings
              have locations and that the weather/geocoding key is configured.
            </p>
          </div>
        )}

        {data && hasPoints && (
          <>
            <div className="absolute inset-0">
              <MapCanvas data={data} />
            </div>

            {/* Legend */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-4 left-4 z-[500] rounded-xl border border-border/40 bg-card/90 backdrop-blur px-3 py-2.5 shadow-lg"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Booking status
              </p>
              <div className="space-y-1">
                {STATUS_LEGEND.map((s) => (
                  <div key={s.label} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                    <span className="text-foreground/80">{s.label}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 text-xs pt-1 mt-1 border-t border-border/30">
                  <span className="w-4 h-0.5 rounded" style={{ background: '#ef4444' }} />
                  <span className="text-foreground/80">Impact propagation</span>
                </div>
              </div>
            </motion.div>

            {/* Unmappable list */}
            {data.unmappable.length > 0 && (
              <div className="absolute top-4 right-4 z-[500] rounded-xl border border-border/40 bg-card/90 backdrop-blur px-3 py-2.5 shadow-lg max-w-[220px]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                  <MapPinOff className="w-3 h-3" /> Not mappable
                </p>
                <ul className="space-y-0.5 text-xs text-foreground/70">
                  {data.unmappable.map((t, i) => (
                    <li key={i} className="truncate">{t}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
