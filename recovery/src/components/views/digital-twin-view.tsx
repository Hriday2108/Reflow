'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FlaskConical, MapPin, Wind, Droplets, Eye, Thermometer, Clock,
  RefreshCw, ShieldAlert, Zap, ArrowRight, DollarSign, TimerReset,
  Plane, Train, Car, Hotel, Ticket, RotateCcw, AlertTriangle,
} from 'lucide-react';
import { Booking, BookingDependency, BookingStatus, DisruptionType, Severity } from '@/types';
import type { SidebarView } from '@/components/sidebar';
import type { WeatherData } from '@/lib/weather/provider';
import { calculateWeatherRisk, WeatherRiskResult, WeatherRiskLevel } from '@/lib/weather/risk';
import { getDownstreamBookingIds, isDisruptionValidForBookingType } from '@/lib/disruption-engine';
import { formatCurrency, formatDuration } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface DigitalTwinViewProps {
  bookings: Booking[];
  dependencies: BookingDependency[];
  tripId: string;
  onInjectDisruption: (
    bookingId: string,
    type: DisruptionType,
    severity: Severity,
    description: string,
    delayMinutes?: number
  ) => Promise<void>;
  onNavigate: (view: SidebarView) => void;
}

// Slider parameters that drive the twin. Neutral defaults are used when live
// weather is unavailable so the simulation still works.
interface Params {
  rainfall: number;    // mm/hr
  windSpeed: number;   // km/h
  visibility: number;  // km
  temp: number;        // °C
  durationHours: number;
  conditionId: number; // OWM condition code
}

const NEUTRAL: Params = {
  rainfall: 0, windSpeed: 8, visibility: 10, temp: 22, durationHours: 2, conditionId: 800,
};

// Condition presets set the OWM conditionId and nudge the sliders toward a
// representative profile for that condition. The user can still fine-tune after.
const CONDITION_PRESETS: { id: string; label: string; conditionId: number; apply: (p: Params) => Params }[] = [
  { id: 'clear',        label: 'Clear',         conditionId: 800, apply: (p) => ({ ...p, conditionId: 800, rainfall: 0, visibility: 10 }) },
  { id: 'light-rain',   label: 'Light rain',    conditionId: 500, apply: (p) => ({ ...p, conditionId: 500, rainfall: Math.max(p.rainfall, 3), visibility: 8 }) },
  { id: 'thunderstorm', label: 'Thunderstorm',  conditionId: 211, apply: (p) => ({ ...p, conditionId: 211, rainfall: Math.max(p.rainfall, 25), windSpeed: Math.max(p.windSpeed, 45), visibility: Math.min(p.visibility, 3) }) },
  { id: 'snow',         label: 'Snow',          conditionId: 601, apply: (p) => ({ ...p, conditionId: 601, temp: Math.min(p.temp, -1), visibility: Math.min(p.visibility, 2) }) },
  { id: 'fog',          label: 'Fog',           conditionId: 741, apply: (p) => ({ ...p, conditionId: 741, visibility: Math.min(p.visibility, 0.3) }) },
  { id: 'tornado',      label: 'Tornado',       conditionId: 781, apply: (p) => ({ ...p, conditionId: 781, windSpeed: Math.max(p.windSpeed, 110), visibility: Math.min(p.visibility, 0.5) }) },
];

function presetIdForCondition(id: number): string {
  if (id === 781 || id === 771) return 'tornado';
  if (id === 741 || id === 701) return 'fog';
  if (id >= 200 && id < 300) return 'thunderstorm';
  if (id >= 600 && id < 700) return 'snow';
  if (id >= 300 && id < 600) return 'light-rain';
  return 'clear';
}

const RISK_BAR: Record<WeatherRiskLevel, string> = {
  SEVERE: 'bg-red-500', HIGH: 'bg-orange-500', MODERATE: 'bg-yellow-500', LOW: 'bg-green-500',
};
const RISK_CHIP: Record<WeatherRiskLevel, string> = {
  SEVERE: 'bg-red-500/20 text-red-400 border-red-500/30',
  HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  MODERATE: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  LOW: 'bg-green-500/20 text-green-400 border-green-500/30',
};
const STATUS_COLOR: Record<BookingStatus, string> = {
  confirmed: '#22c55e', 'at-risk': '#eab308', disrupted: '#ef4444', rebooked: '#6366f1', cancelled: '#6b7280',
};

function iconForType(type: string) {
  switch (type) {
    case 'flight': return <Plane className="w-3.5 h-3.5" />;
    case 'train': return <Train className="w-3.5 h-3.5" />;
    case 'transfer': return <Car className="w-3.5 h-3.5" />;
    case 'hotel': return <Hotel className="w-3.5 h-3.5" />;
    default: return <Ticket className="w-3.5 h-3.5" />;
  }
}

function severityForLevel(level: WeatherRiskLevel): Severity {
  if (level === 'SEVERE' || level === 'HIGH') return 'high';
  if (level === 'MODERATE') return 'medium';
  return 'low';
}

export default function DigitalTwinView({
  bookings, dependencies, onInjectDisruption,
}: DigitalTwinViewProps) {
  const locations = useMemo(() => {
    const locs = bookings.map((b) => b.location).filter(Boolean) as string[];
    return Array.from(new Set(locs));
  }, [bookings]);

  const [selectedLocation, setSelectedLocation] = useState<string>(locations[0] || '');
  const [params, setParams] = useState<Params>(NEUTRAL);
  const [baseline, setBaseline] = useState<Params>(NEUTRAL);
  const [seeding, setSeeding] = useState(false);
  const [applying, setApplying] = useState(false);

  // Seed baseline slider values from live weather. State is only set AFTER the
  // await, satisfying react-hooks/set-state-in-effect (same pattern as
  // weather-view's fetchWeather).
  const seedBaseline = useCallback(async (loc: string) => {
    if (!loc) return;
    setSeeding(true);
    try {
      const res = await fetch(`/api/weather?location=${encodeURIComponent(loc)}`);
      let seeded = NEUTRAL;
      if (res.ok) {
        const w: WeatherData = await res.json();
        seeded = {
          rainfall: w.rainfall ?? 0,
          windSpeed: w.windSpeed ?? 8,
          visibility: w.visibility ?? 10,
          temp: typeof w.temp === 'number' ? Math.round(w.temp) : 22,
          durationHours: 2,
          conditionId: w.conditionId ?? 800,
        };
      }
      setBaseline(seeded);
      setParams(seeded);
    } catch {
      setBaseline(NEUTRAL);
      setParams(NEUTRAL);
    } finally {
      setSeeding(false);
    }
  }, []);

  useEffect(() => {
    // Baseline fetch runs through an async callback; the only synchronous set is
    // the seeding spinner — the same accepted pattern as weather-view/dashboard.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (selectedLocation) seedBaseline(selectedLocation);
  }, [selectedLocation, seedBaseline]);

  const buildWeather = useCallback((p: Params): WeatherData => ({
    city: selectedLocation,
    temp: p.temp,
    description: 'Simulated scenario',
    icon: '',
    isSevere: false,
    conditionId: p.conditionId,
    windSpeed: p.windSpeed,
    visibility: p.visibility,
    rainfall: p.rainfall,
    forecast: [],
  }), [selectedLocation]);

  const baselineRisk: WeatherRiskResult = useMemo(
    () => calculateWeatherRisk(buildWeather(baseline)), [baseline, buildWeather]);
  const simRisk: WeatherRiskResult = useMemo(
    () => calculateWeatherRisk(buildWeather(params)), [params, buildWeather]);

  // The twin: recompute the real system's reaction to the simulated risk using
  // the same pure engine functions the live system uses.
  const twin = useMemo(() => {
    const affected = new Map<string, { booking: Booking; from: BookingStatus; to: BookingStatus; reason: string; downstream: boolean }>();

    if (simRisk.level !== 'LOW' && selectedLocation) {
      const sourceStatus: BookingStatus =
        simRisk.level === 'SEVERE' || simRisk.level === 'HIGH' ? 'disrupted' : 'at-risk';

      const sources = bookings.filter(
        (b) => b.location?.toLowerCase().includes(selectedLocation.toLowerCase()) &&
          (b.status === 'confirmed' || b.status === 'at-risk')
      );

      for (const s of sources) {
        affected.set(s.id, {
          booking: s, from: s.status, to: sourceStatus, downstream: false,
          reason: `${simRisk.level} weather risk in ${selectedLocation}: ${simRisk.reason}`,
        });
        for (const id of getDownstreamBookingIds(s.id, dependencies)) {
          if (affected.has(id)) continue;
          const b = bookings.find((x) => x.id === id);
          if (!b || b.status === 'cancelled') continue;
          // A prolonged severe event escalates downstream from at-risk to disrupted.
          const downStatus: BookingStatus =
            params.durationHours >= 12 && simRisk.level === 'SEVERE' ? 'disrupted' : 'at-risk';
          affected.set(id, {
            booking: b, from: b.status, to: downStatus, downstream: true,
            reason: `Downstream of ${s.title} — may be affected by the weather event.`,
          });
        }
      }
    }

    const items = Array.from(affected.values()).sort(
      (a, b) => new Date(a.booking.start_time).getTime() - new Date(b.booking.start_time).getTime()
    );
    const costAtRisk = items.reduce((sum, it) => sum + it.booking.cost, 0);
    // Prefer a source booking whose type accepts a weather disruption as the inject target.
    const sourceItems = items.filter((it) => !it.downstream);
    const primary =
      sourceItems.find((it) => isDisruptionValidForBookingType('weather', it.booking.type))?.booking ??
      sourceItems[0]?.booking ?? null;

    return { items, costAtRisk, primary };
  }, [bookings, dependencies, selectedLocation, simRisk, params.durationHours]);

  const projectedDelay = Math.round(params.durationHours * 60);
  const canApply = simRisk.level !== 'LOW' && !!twin.primary && !applying;

  const chronological = useMemo(
    () => [...bookings].sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    ), [bookings]);

  const setParam = (k: keyof Params, v: number) =>
    setParams((prev) => ({ ...prev, [k]: v }));

  const handlePreset = (presetId: string) => {
    const preset = CONDITION_PRESETS.find((p) => p.id === presetId);
    if (preset) setParams((prev) => preset.apply(prev));
  };

  const handleApply = async () => {
    if (!twin.primary) return;
    setApplying(true);
    try {
      const severity = severityForLevel(simRisk.level);
      const parts = [
        `Simulated ${CONDITION_PRESETS.find((c) => c.id === presetIdForCondition(params.conditionId))?.label ?? 'weather'} scenario in ${selectedLocation}`,
        `${params.rainfall} mm/hr rain`,
        `${params.windSpeed} km/h wind`,
        `${params.visibility} km visibility`,
        `over ${formatDuration(projectedDelay)}`,
      ];
      const description = `${parts.join(' · ')}. ${simRisk.reason}`;
      await onInjectDisruption(twin.primary.id, 'weather', severity, description, projectedDelay);
    } catch (e) {
      console.error('Digital Twin apply failed:', e);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background/50 overflow-y-auto">
      {/* Header */}
      <header className="px-6 py-6 border-b border-border/30 sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FlaskConical className="w-6 h-6 text-primary" />
              Digital Twin — What-If Simulation
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Drag weather parameters and watch a twin of your itinerary react live, using the same risk &amp; cascade engine as the real system.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="bg-card/50 border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="" disabled>Select Location</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
            <button
              onClick={() => setParams(baseline)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card/50 border border-border/50 hover:bg-card/80 transition-colors text-xs font-medium text-muted-foreground"
              title="Reset sliders to live baseline"
            >
              {seeding ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              Reset to live
            </button>
          </div>
        </div>
      </header>
      <div className="p-6 max-w-6xl mx-auto w-full">
        {!selectedLocation ? (
          <div className="h-64 flex flex-col items-center justify-center border border-border/30 rounded-2xl bg-card/10 text-center">
            <MapPin className="w-8 h-8 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">Add a booking with a location, then pick it above to run a scenario.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* ── Left: Scenario Controls ────────────────────── */}
            <div className="md:col-span-5 space-y-6">
              <div className="rounded-2xl border border-border/30 bg-card/20 p-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-1.5">
                  <SlidersLabel /> Scenario Controls
                </h3>

                {/* Condition preset */}
                <div className="mb-5">
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Condition</label>
                  <div className="grid grid-cols-3 gap-1.5 mt-2">
                    {CONDITION_PRESETS.map((c) => {
                      const active = presetIdForCondition(params.conditionId) === c.id;
                      return (
                        <button
                          key={c.id}
                          onClick={() => handlePreset(c.id)}
                          className={cn(
                            'px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                            active
                              ? 'bg-primary/15 border-primary/40 text-primary'
                              : 'bg-background/50 border-border/40 text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Slider label="Rainfall intensity" icon={<Droplets className="w-3.5 h-3.5 text-blue-400" />} value={params.rainfall} min={0} max={50} step={1} unit="mm/hr" onChange={(v) => setParam('rainfall', v)} />
                <Slider label="Wind speed" icon={<Wind className="w-3.5 h-3.5 text-gray-400" />} value={params.windSpeed} min={0} max={120} step={1} unit="km/h" onChange={(v) => setParam('windSpeed', v)} />
                <Slider label="Visibility" icon={<Eye className="w-3.5 h-3.5 text-purple-400" />} value={params.visibility} min={0} max={10} step={0.1} unit="km" onChange={(v) => setParam('visibility', v)} />
                <Slider label="Temperature" icon={<Thermometer className="w-3.5 h-3.5 text-teal-400" />} value={params.temp} min={-10} max={45} step={1} unit="°C" onChange={(v) => setParam('temp', v)} />
                <Slider label="Event duration" icon={<Clock className="w-3.5 h-3.5 text-amber-400" />} value={params.durationHours} min={0} max={24} step={1} unit="h" onChange={(v) => setParam('durationHours', v)} />

                <p className="text-[10px] text-muted-foreground mt-2">
                  Sliders {seeding ? 'are seeding' : 'seeded'} from live weather in {selectedLocation}. Everything here is a read-only twin until you apply it.
                </p>
              </div>
            </div>

            {/* ── Right: The Twin ───────────────────────────── */}
            <div className="md:col-span-7 space-y-6">
              {/* Risk gauge with baseline → simulated delta */}
              <div className="rounded-2xl border border-border/30 bg-card/20 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Simulated Weather Risk</h3>
                  <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider">
                    <span className={cn('px-2 py-1 rounded-md border', RISK_CHIP[baselineRisk.level])}>
                      {baselineRisk.level} {baselineRisk.score}%
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className={cn('px-2 py-1 rounded-md border', RISK_CHIP[simRisk.level])}>
                      {simRisk.level} {simRisk.score}%
                    </span>
                  </div>
                </div>

                <div className="flex items-end gap-3 mb-2">
                  <span className="text-4xl font-black">{simRisk.score}%</span>
                  <span className="text-xs text-muted-foreground mb-1.5">simulated disruption risk</span>
                </div>
                <div className="w-full h-2 bg-background rounded-full overflow-hidden mb-4">
                  <motion.div
                    animate={{ width: `${simRisk.score}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className={cn('h-full', RISK_BAR[simRisk.level])}
                  />
                </div>
                <div className="p-3 bg-background/50 rounded-lg text-sm flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <p className="text-muted-foreground">
                    <strong className="text-foreground font-medium">Reason:</strong> {simRisk.reason}
                  </p>
                </div>
              </div>

              {/* System response */}
              <div className="rounded-2xl border border-border/30 bg-card/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">System Response (Twin)</h3>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 text-red-400"><DollarSign className="w-3.5 h-3.5" />{formatCurrency(twin.costAtRisk)} at risk</span>
                    <span className="flex items-center gap-1 text-amber-400"><TimerReset className="w-3.5 h-3.5" />+{formatDuration(projectedDelay)}</span>
                  </div>
                </div>

                {twin.items.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground">
                      At this risk level, no bookings in {selectedLocation} change status. Raise rainfall/wind or pick a severe condition to see the itinerary react.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {twin.items.map((it) => (
                      <div key={it.booking.id} className="p-3 rounded-xl bg-background/50 border border-border/30">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-1.5 bg-card rounded-lg border border-border/50 flex-shrink-0">{iconForType(it.booking.type)}</div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">{it.booking.title}</div>
                              <div className="text-[10px] text-muted-foreground uppercase">{it.booking.type}{it.downstream ? ' • downstream' : ''}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase flex-shrink-0">
                            <span style={{ color: STATUS_COLOR[it.from] }}>{it.from}</span>
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                            <span style={{ color: STATUS_COLOR[it.to] }}>{it.to}</span>
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1.5 pl-0.5">{it.reason}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Chronological booking strip */}
                <div className="mt-5 pt-4 border-t border-border/20">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Itinerary timeline</p>
                  <div className="flex items-center gap-1 overflow-x-auto pb-1">
                    {chronological.map((b, i) => {
                      const sim = twin.items.find((it) => it.booking.id === b.id);
                      const status = sim ? sim.to : b.status;
                      return (
                        <div key={b.id} className="flex items-center flex-shrink-0">
                          <div
                            className="flex flex-col items-center gap-1 px-1.5 py-1.5 rounded-lg border transition-colors"
                            style={{ borderColor: `${STATUS_COLOR[status]}55`, background: sim ? `${STATUS_COLOR[status]}18` : 'transparent' }}
                            title={`${b.title} — ${status}`}
                          >
                            <span style={{ color: STATUS_COLOR[status] }}>{iconForType(b.type)}</span>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLOR[status] }} />
                          </div>
                          {i < chronological.length - 1 && (
                            <ArrowRight className="w-3 h-3 text-muted-foreground/40 mx-0.5 flex-shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Apply scenario */}
              <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> Apply Scenario To System
                </h3>
                <p className="text-sm text-foreground/80 mb-4 leading-relaxed">
                  Inject this scenario as a real <span className="font-medium text-foreground">weather</span> disruption. It creates the event, flips the affected booking, cascades downstream, and generates recovery plans — exactly as a live disruption would.
                </p>
                {simRisk.level === 'LOW' ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Risk is LOW — raise the parameters to a disruptive level before applying.
                  </p>
                ) : !twin.primary ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> No eligible booking in {selectedLocation} to disrupt.
                  </p>
                ) : (
                  <button
                    onClick={handleApply}
                    disabled={!canApply}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors"
                  >
                    {applying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    Apply {severityForLevel(simRisk.level)}-severity scenario to {twin.primary.title}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Small labeled range slider used across the control panel.
function Slider({
  label, icon, value, min, max, step, unit, onChange,
}: {
  label: string; icon: React.ReactNode; value: number; min: number; max: number; step: number; unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">{icon}{label}</span>
        <span className="text-xs font-bold tabular-nums">{value}{unit && ` ${unit}`}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary cursor-pointer"
      />
    </div>
  );
}

function SlidersLabel() {
  return <FlaskConical className="w-3.5 h-3.5" />;
}

