'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Plane, Train, Hotel, Car, Ticket, CalendarDays,
  AlertTriangle, TrendingUp, CheckCircle2, ShieldAlert,
  ArrowRight, Clock, IndianRupee, Activity, Zap,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import StatusBadge from '@/components/status-badge';
import type { Trip, Booking, BookingDependency, DisruptionEvent, RecoveryOption } from '@/types';
import { computeRiskWarnings } from '@/lib/disruption-engine';
import type { SidebarView } from '@/components/sidebar';

const BOOKING_ICONS: Record<string, React.ElementType> = {
  flight: Plane,
  train: Train,
  hotel: Hotel,
  transfer: Car,
  activity: Ticket,
  event: CalendarDays,
};

interface DashboardOverviewProps {
  trip: Trip | null;
  bookings: Booking[];
  dependencies: BookingDependency[];
  disruptions: DisruptionEvent[];
  recoveryOptions: RecoveryOption[];
  onNavigate: (view: SidebarView) => void;
}

/** Circular SVG ring gauge — matches reference image */
function HealthRing({ pct, color }: { pct: number; color: string }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="relative flex items-center justify-center">
      <svg width="96" height="96" className="rotate-[-90deg]">
        <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
        <motion.circle
          cx="48" cy="48" r={r}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: 'easeOut', delay: 0.3 }}
          style={{ filter: `drop-shadow(0 0 6px ${color}90)` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-black" style={{ color }}>{pct}%</span>
        <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Health</span>
      </div>
    </div>
  );
}

/** Mini horizontal risk bar */
function RiskBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground truncate pr-2">{label}</span>
        <span className="font-bold flex-shrink-0" style={{ color }}>{pct}%</span>
      </div>
      <div className="risk-bar-track">
        <motion.div
          className="risk-bar-fill"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
        />
      </div>
    </div>
  );
}

export default function DashboardOverview({
  trip, bookings, dependencies, disruptions, recoveryOptions, onNavigate,
}: DashboardOverviewProps) {
  const confirmedCount = bookings.filter((b) => b.status === 'confirmed').length;
  const atRiskCount    = bookings.filter((b) => b.status === 'at-risk').length;
  const disruptedCount = bookings.filter((b) => b.status === 'disrupted').length;
  const rebookedCount  = bookings.filter((b) => b.status === 'rebooked').length;

  const tripHealth = bookings.length > 0
    ? Math.round(((confirmedCount + rebookedCount) / bookings.length) * 100)
    : 100;

  const healthColor = tripHealth >= 90 ? '#10b981' : tripHealth >= 70 ? '#f59e0b' : '#ef4444';

  const riskWarnings = useMemo(() => {
    if (bookings.length && dependencies.length) {
      return computeRiskWarnings(bookings, dependencies);
    }
    return [];
  }, [bookings, dependencies]);

  const alertCount = disruptions.length + riskWarnings.length;

  // Estimated extra cost from disruptions
  const extraCost = disruptions.length > 0
    ? recoveryOptions.filter(o => !o.selected).reduce((sum, o) => sum + Math.abs(o.cost_delta), 0)
    : 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const STATS = [
    {
      label: 'Total Bookings',
      sub: 'Confirmed',
      value: bookings.length,
      icon: CheckCircle2,
      color: '#60a5fa',
      stripe: 'stat-card-blue',
    },
    {
      label: 'At Risk',
      sub: 'Needs Attention',
      value: atRiskCount + disruptedCount,
      icon: AlertTriangle,
      color: atRiskCount + disruptedCount > 0 ? '#ef4444' : '#10b981',
      stripe: atRiskCount + disruptedCount > 0 ? 'stat-card-red' : 'stat-card-green',
    },
    {
      label: 'Alerts',
      sub: 'Unread',
      value: alertCount,
      icon: ShieldAlert,
      color: alertCount > 0 ? '#f59e0b' : '#10b981',
      stripe: alertCount > 0 ? 'stat-card-amber' : 'stat-card-green',
    },
    {
      label: 'Est. Extra Cost',
      sub: 'Potential',
      value: formatCurrency(extraCost),
      icon: IndianRupee,
      color: extraCost > 0 ? '#f59e0b' : '#10b981',
      stripe: extraCost > 0 ? 'stat-card-amber' : 'stat-card-green',
    },
  ];

  const journeyBookings = bookings.slice(0, 5);

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-5 max-w-5xl mx-auto">

        {/* Greeting */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold">
            {greeting},{' '}
            <span className="gradient-text-blue">{trip?.traveler_name?.split(' ')[0] ?? 'Traveler'}</span>{' '}
            👋
          </h1>
          {trip && (
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <span>{trip.destination}</span>
              <span className="text-border">·</span>
              <span>
                {new Date(trip.start_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {' – '}
                {new Date(trip.end_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span
                className="ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}
              >
                is being monitored
              </span>
            </p>
          )}
        </motion.div>

        {/* 4 stat cards — reference style with color top stripe */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {STATS.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.07 }}
                className={`stat-card ${stat.stripe}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">{stat.label}</p>
                    <p className="text-[10px] text-muted-foreground/60">{stat.sub}</p>
                  </div>
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: stat.color + '18' }}
                  >
                    <Icon className="w-4 h-4" style={{ color: stat.color }} />
                  </div>
                </div>
                <div className="text-3xl font-black" style={{ color: stat.color }}>
                  {stat.value}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Trip Health ring + Journey Overview — two-column */}
        <div className="grid md:grid-cols-2 gap-4">

          {/* Health ring card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="ref-card p-5"
          >
            <div className="flex items-center gap-5">
              <HealthRing pct={tripHealth} color={healthColor} />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-bold">Trip Health</p>
                <p className="text-[11px] text-muted-foreground">Based on current booking statuses</p>
                <div className="space-y-1.5 pt-1">
                  {confirmedCount > 0 && <RiskBar label={`${confirmedCount} confirmed`} pct={Math.round((confirmedCount / bookings.length) * 100)} color="#10b981" />}
                  {atRiskCount > 0 && <RiskBar label={`${atRiskCount} at risk`} pct={Math.round((atRiskCount / bookings.length) * 100)} color="#f59e0b" />}
                  {disruptedCount > 0 && <RiskBar label={`${disruptedCount} disrupted`} pct={Math.round((disruptedCount / bookings.length) * 100)} color="#ef4444" />}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Journey Overview */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="ref-card p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold">Journey Overview</p>
              <button
                onClick={() => onNavigate('itinerary')}
                className="text-xs flex items-center gap-1 transition-colors"
                style={{ color: '#818cf8' }}
              >
                View Itinerary <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-center gap-0 overflow-x-auto pb-1">
              {journeyBookings.map((booking, idx) => {
                const Icon = BOOKING_ICONS[booking.type] ?? Ticket;
                const statusColors: Record<string, string> = {
                  confirmed: '#10b981', 'at-risk': '#f59e0b', disrupted: '#ef4444',
                  rebooked: '#3b82f6', cancelled: '#6b7280',
                };
                const color = statusColors[booking.status] ?? '#6b7280';
                const isLast = idx === journeyBookings.length - 1;
                return (
                  <div key={booking.id} className="flex items-center flex-shrink-0">
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: color + '15', border: `1px solid ${color}40` }}
                      >
                        <Icon className="w-4.5 h-4.5" style={{ color }} />
                      </div>
                      <span className="text-[9px] text-muted-foreground text-center max-w-[52px] leading-tight">
                        {booking.title.split('—')[0].trim().substring(0, 12)}
                      </span>
                      <StatusBadge status={booking.status} size="xs" />
                    </div>
                    {!isLast && (
                      <div className="flex items-center mx-1.5 flex-shrink-0">
                        <div className="h-px w-5 bg-border/50" />
                        <ArrowRight className="w-2 h-2 text-muted-foreground/40 -ml-0.5" />
                      </div>
                    )}
                  </div>
                );
              })}
              {bookings.length > 5 && (
                <div className="flex items-center ml-2 flex-shrink-0">
                  <span className="text-xs text-muted-foreground">+{bookings.length - 5} more</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Upcoming Risks + Recent Alerts */}
        <div className="grid md:grid-cols-2 gap-4">

          {/* Upcoming Risks */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="ref-card p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-at-risk" />
                Upcoming Risks
              </p>
              <button onClick={() => onNavigate('risk')} className="text-xs flex items-center gap-1 transition-colors" style={{ color: '#818cf8' }}>
                Monitor <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            {riskWarnings.length === 0 ? (
              <div className="text-center py-5">
                <TrendingUp className="w-7 h-7 text-confirmed mx-auto mb-2 opacity-60" />
                <p className="text-xs text-muted-foreground">No upcoming risks detected</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">All connections look safe</p>
              </div>
            ) : (
              <div className="space-y-3">
                {riskWarnings.slice(0, 3).map((w) => {
                  const pct = w.severity === 'high' ? 78 : w.severity === 'medium' ? 54 : 28;
                  const color = w.severity === 'high' ? '#ef4444' : w.severity === 'medium' ? '#f59e0b' : '#10b981';
                  return (
                    <div key={w.id} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase"
                          style={{ background: color + '20', color }}
                        >
                          {w.severity}
                        </span>
                        <p className="text-xs text-muted-foreground flex-1 truncate">{w.message}</p>
                      </div>
                      <RiskBar label="" pct={pct} color={color} />
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Active Disruptions / Recent Alerts */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="ref-card p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-disrupted" />
                Recent Alerts
              </p>
              <button onClick={() => onNavigate('alerts')} className="text-xs flex items-center gap-1 transition-colors" style={{ color: '#818cf8' }}>
                View all <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            {disruptions.length === 0 ? (
              <div className="text-center py-5">
                <CheckCircle2 className="w-7 h-7 text-confirmed mx-auto mb-2 opacity-60" />
                <p className="text-xs text-muted-foreground">No active disruptions</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">Your trip is on track</p>
              </div>
            ) : (
              <div className="space-y-2">
                {disruptions.slice(0, 3).map((d) => {
                  const affectedBooking = bookings.find((b) => b.id === d.booking_id);
                  const color = (d.severity as string) === 'high' || (d.severity as string) === 'critical' ? '#ef4444' : d.severity === 'medium' ? '#f59e0b' : '#10b981';
                  const stripe = (d.severity as string) === 'high' || (d.severity as string) === 'critical' ? 'alert-stripe-red' : d.severity === 'medium' ? 'alert-stripe-amber' : 'alert-stripe-green';
                  return (
                    <div
                      key={d.id}
                      className={`alert-stripe ${stripe} py-2 pr-3 rounded-r-lg`}
                      style={{ background: color + '08', borderRadius: '0 8px 8px 0' }}
                    >
                      <p className="text-xs font-semibold" style={{ color }}>{affectedBooking?.title ?? 'Unknown'}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{d.type.replace(/-/g, ' ')} · {d.severity}</p>
                    </div>
                  );
                })}
                {disruptions.length > 0 && recoveryOptions.filter(o => !o.selected).length > 0 && (
                  <button
                    onClick={() => onNavigate('recovery')}
                    className="w-full mt-2 py-2 rounded-lg text-xs font-semibold transition-colors"
                    style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8' }}
                  >
                    View Recovery Plans →
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </div>

        {/* Cost summary */}
        {bookings.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="ref-card p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold flex items-center gap-2">
                  <IndianRupee className="w-4 h-4" style={{ color: '#818cf8' }} />
                  Total Trip Cost
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Sum of all bookings in itinerary</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black gradient-text-blue">
                  {formatCurrency(bookings.reduce((s, b) => s + Number(b.cost), 0))}
                </div>
                <p className="text-[10px] text-muted-foreground">{bookings.length} bookings</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
