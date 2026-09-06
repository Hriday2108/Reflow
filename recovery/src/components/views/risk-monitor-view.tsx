'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, ArrowRight, Eye, X, AlertTriangle, Info, Map } from 'lucide-react';
import type { Booking, BookingDependency, RiskWarning } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { computeRiskWarnings } from '@/lib/disruption-engine';

interface RiskMonitorViewProps {
  bookings: Booking[];
  dependencies: BookingDependency[];
  onNavigate?: (view: 'itinerary' | 'weather') => void;
}

const RISK_COLORS = {
  high:   { border: 'border-disrupted/40',  bg: 'bg-disrupted/8',  text: 'text-disrupted',  badge: 'bg-disrupted/15 text-disrupted',   ring: '#ef4444' },
  medium: { border: 'border-at-risk/40',    bg: 'bg-at-risk/8',    text: 'text-at-risk',    badge: 'bg-at-risk/15 text-at-risk',       ring: '#f59e0b' },
  low:    { border: 'border-confirmed/40',  bg: 'bg-confirmed/8',  text: 'text-confirmed',  badge: 'bg-confirmed/15 text-confirmed',   ring: '#10b981' },
};

const RISK_PERCENT: Record<string, number> = {
  high: 78, medium: 54, low: 28,
};

function RiskRing({ pct, color }: { pct: number; color: string }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width="72" height="72" className="rotate-[-90deg]">
      <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
      <motion.circle
        cx="36" cy="36" r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
      <text
        x="36" y="40"
        textAnchor="middle"
        fontSize="13"
        fontWeight="700"
        fill={color}
        transform="rotate(90 36 36)"
      >
        {pct}%
      </text>
    </svg>
  );
}

export default function RiskMonitorView({ bookings, dependencies, onNavigate }: RiskMonitorViewProps) {
  const engineWarnings = useMemo(() => computeRiskWarnings(bookings, dependencies), [bookings, dependencies]);
  const [selectedRisk, setSelectedRisk] = useState<RiskWarning | null>(null);
  const [weatherWarnings, setWeatherWarnings] = useState<RiskWarning[]>([]);

  // Fetch weather and map severe weather to RiskWarnings
  useEffect(() => {
    const locs = Array.from(new Set(bookings.map(b => b.location).filter(Boolean)));
    if (locs.length === 0) return;

    let mounted = true;
    const fetchWeathers = async () => {
      try {
        const results = await Promise.all(locs.map(async loc => {
           const res = await fetch(`/api/weather?location=${encodeURIComponent(loc as string)}`);
           if (!res.ok) return null;
           return { loc, data: await res.json() };
        }));

        if (!mounted) return;

        const newWarnings: RiskWarning[] = [];
        results.forEach(r => {
           if (r && r.data && r.data.isSevere) {
             newWarnings.push({
               id: `weather-${r.loc}`,
               type: 'weather' as any,
               severity: 'high',
               message: `Severe weather (${r.data.description}) expected in ${r.loc}. This may affect your connections.`,
               bookingIds: bookings.filter(b => b.location === r.loc).map(b => b.id)
             });
           }
        });
        setWeatherWarnings(newWarnings);
      } catch (e) {
         console.error(e);
      }
    };
    fetchWeathers();
    return () => { mounted = false; };
  }, [bookings]);

  const warnings = useMemo(() => [...engineWarnings, ...weatherWarnings], [engineWarnings, weatherWarnings]);


  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-5 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" style={{ color: '#f59e0b' }} />
            Proactive Risk Monitor
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Upcoming risks detected in your itinerary based on connection times and booking policies.
          </p>
        </motion.div>

        {/* Recovery Summary stats */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3"
        >
          {[
            { label: 'Risks Detected', value: warnings.length, color: warnings.length > 0 ? '#ef4444' : '#10b981' },
            { label: 'High Priority', value: warnings.filter(w => w.severity === 'high').length, color: '#ef4444' },
            { label: 'Bookings at Risk', value: [...new Set(warnings.flatMap(w => w.bookingIds))].length, color: '#f59e0b' },
          ].map((stat) => (
            <div key={stat.label} className="ref-card p-4 text-center">
              <div className="text-3xl font-black mb-1" style={{ color: stat.color }}>{stat.value}</div>
              <div className="text-[10px] text-muted-foreground font-medium">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {warnings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="ref-card rounded-2xl p-12 text-center"
          >
            <ShieldAlert className="w-12 h-12 text-confirmed mx-auto mb-4 opacity-60" />
            <h3 className="text-lg font-semibold mb-2">All Clear</h3>
            <p className="text-sm text-muted-foreground">No upcoming risks detected in your itinerary.</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {warnings.map((warning, idx) => {
              const cfg = RISK_COLORS[warning.severity];
              const pct = RISK_PERCENT[warning.severity];
              const ring = cfg.ring;

              return (
                <motion.div
                  key={warning.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  className="ref-card p-5"
                  style={{ borderColor: ring + '30' }}
                >
                  <div className="flex items-start gap-5">
                    {/* Risk ring */}
                    <div className="flex-shrink-0">
                      <RiskRing pct={pct} color={ring} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${cfg.badge}`}>
                          {warning.severity} risk
                        </span>
                        <span className="text-[10px] text-muted-foreground capitalize">
                          {warning.type.replace(/-/g, ' ')}
                        </span>
                      </div>

                      <p className="text-sm font-medium mb-1 leading-snug">{warning.message}</p>

                      {warning.bookingIds.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Affects {warning.bookingIds.length} booking{warning.bookingIds.length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>

                    {/* CTA buttons */}
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={() => {
                          if (warning.type === 'weather' as any && onNavigate) {
                            onNavigate('weather');
                          } else {
                            setSelectedRisk(selectedRisk?.id === warning.id ? null : warning);
                          }
                        }}
                        className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase transition-colors border ${cfg.border} hover:bg-white/5`}
                        style={{ color: ring }}
                      >
                        {warning.type === 'weather' as any ? (
                          <>View Weather Impact <ArrowRight className="w-3.5 h-3.5" /></>
                        ) : (
                          <>
                            {selectedRisk?.id === warning.id ? (
                              <><X className="w-3.5 h-3.5" /> Close Details</>
                            ) : (
                              <><Eye className="w-3.5 h-3.5" /> Inspect Risk</>
                            )}
                          </>
                        )}
                      </button>
                      {onNavigate && (
                        <button
                          onClick={() => onNavigate('itinerary')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                          style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8' }}
                        >
                          <Map className="w-3.5 h-3.5" />
                          View Itinerary
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="ref-card p-4"
        >
          <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Risk Level Guide</p>
          <div className="grid grid-cols-3 gap-4 text-xs">
            {[
              { level: 'High',   desc: 'Immediate action recommended', color: '#ef4444' },
              { level: 'Medium', desc: 'Monitor closely, plan alternatives', color: '#f59e0b' },
              { level: 'Low',    desc: 'Minor risk, likely self-resolving',  color: '#10b981' },
            ].map((r) => (
              <div key={r.level} className="flex items-start gap-2">
                <div className="w-2.5 h-2.5 rounded-full mt-0.5 flex-shrink-0" style={{ backgroundColor: r.color }} />
                <div>
                  <p className="font-semibold" style={{ color: r.color }}>{r.level}</p>
                  <p className="text-muted-foreground text-[10px]">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Risk Details Modal */}
      <AnimatePresence>
        {selectedRisk && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRisk(null)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`relative w-full max-w-2xl glass-card rounded-2xl overflow-hidden shadow-2xl border ${RISK_COLORS[selectedRisk.severity].border}`}
            >
              {/* Header */}
              <div className={`p-4 border-b border-white/5 flex items-start justify-between ${RISK_COLORS[selectedRisk.severity].bg}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${RISK_COLORS[selectedRisk.severity].badge}`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight text-foreground">Risk Details</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${RISK_COLORS[selectedRisk.severity].badge}`}>
                        {selectedRisk.severity} risk
                      </span>
                      <span className="text-[10px] text-muted-foreground capitalize">
                        {selectedRisk.type.replace(/-/g, ' ')}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRisk(null)}
                  className="p-2 -mr-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
                {/* Risk Score & Quick Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-black/20 border border-white/5 flex flex-col items-center justify-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5">Risk Score</p>
                    <RiskRing pct={RISK_PERCENT[selectedRisk.severity]} color={RISK_COLORS[selectedRisk.severity].ring} />
                  </div>
                  <div className="p-3 rounded-xl bg-black/20 border border-white/5 flex flex-col justify-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Bookings at Risk</p>
                    <p className="text-2xl font-bold">{selectedRisk.bookingIds.length}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      of {bookings.length} total
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-black/20 border border-white/5 flex flex-col justify-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Financial Exposure</p>
                    <p className="text-2xl font-bold text-disrupted">
                      {formatCurrency(selectedRisk.bookingIds.reduce((sum, id) => {
                        const b = bookings.find(bk => bk.id === id);
                        return sum + (b ? b.cost : 0);
                      }, 0))}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">total value at risk</p>
                  </div>
                </div>

                {/* Time Gap Analysis (for tight connections) */}
                {selectedRisk.type === 'tight-connection' && (() => {
                  const fromBooking = bookings.find(b => b.id === selectedRisk.bookingIds[0]);
                  const toBooking = bookings.find(b => b.id === selectedRisk.bookingIds[1]);
                  if (!fromBooking || !toBooking || !fromBooking.end_time || !toBooking.start_time) return null;
                  const gapMs = new Date(toBooking.start_time).getTime() - new Date(fromBooking.end_time).getTime();
                  const gapMin = Math.round(gapMs / (1000 * 60));
                  const recommendedMin = fromBooking.type === 'flight' ? 90 : fromBooking.type === 'train' ? 45 : 30;
                  const gapPct = Math.min(100, Math.round((gapMin / recommendedMin) * 100));
                  return (
                    <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Connection Time Analysis</h4>
                      <div className="flex items-end gap-6">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Current Gap</span>
                            <span className={`text-sm font-bold ${gapMin < 30 ? 'text-disrupted' : 'text-at-risk'}`}>{gapMin} min</span>
                          </div>
                          <div className="w-full h-2.5 rounded-full bg-white/5 overflow-hidden">
                            <motion.div
                              className={`h-full rounded-full ${gapMin < 30 ? 'bg-disrupted' : 'bg-at-risk'}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${gapPct}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                            />
                          </div>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[10px] text-muted-foreground">0 min</span>
                            <span className="text-[10px] text-confirmed font-medium">{recommendedMin} min (recommended)</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                        The current buffer between these bookings is <span className="font-semibold text-foreground">{gapMin} minutes</span>,
                        {' '}which is <span className="font-semibold text-disrupted">{recommendedMin - gapMin} minutes short</span> of the
                        recommended {recommendedMin}-minute minimum for {fromBooking.type} connections.
                        {gapMin < 20 && ' This leaves almost no room for even minor delays, baggage claim, or transit between locations.'}
                        {gapMin >= 20 && gapMin < 40 && ' A delay of even 15–20 minutes could cause a missed connection.'}
                        {gapMin >= 40 && ' While borderline, unexpected delays or long queues could still cause issues.'}
                      </p>
                    </div>
                  );
                })()}

                {/* Affected Bookings — detailed */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Affected Bookings</h4>
                  <div className="space-y-2.5">
                    {selectedRisk.bookingIds.map((id, idx) => {
                      const b = bookings.find((bk) => bk.id === id);
                      if (!b) return null;
                      const isFrom = idx === 0 && selectedRisk.type === 'tight-connection';
                      const isTo = idx === 1 && selectedRisk.type === 'tight-connection';
                      return (
                        <div key={id} className="p-4 rounded-xl bg-black/20 border border-white/5">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {isFrom && <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-primary/20 text-primary">From</span>}
                              {isTo && <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-at-risk/20 text-at-risk">To</span>}
                              <p className="text-sm font-semibold">{b.title}</p>
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              b.status === 'confirmed' ? 'bg-confirmed/15 text-confirmed' :
                              b.status === 'disrupted' ? 'bg-disrupted/15 text-disrupted' :
                              b.status === 'at-risk' ? 'bg-at-risk/15 text-at-risk' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {b.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Type</p>
                              <p className="text-xs font-medium capitalize mt-0.5">{b.type}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Cost</p>
                              <p className="text-xs font-medium mt-0.5">{formatCurrency(b.cost)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Refund</p>
                              <p className={`text-xs font-medium mt-0.5 ${b.refund_percent === 0 ? 'text-disrupted' : ''}`}>
                                {b.refund_percent}%{b.refund_percent === 0 && ' ⚠'}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{b.end_time ? 'Ends' : 'Starts'}</p>
                              <p className="text-xs font-medium mt-0.5">
                                {new Date(b.end_time || b.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                              </p>
                            </div>
                          </div>
                          {b.location && (
                            <p className="text-[10px] text-muted-foreground mt-2">📍 {b.location}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* AI Risk Assessment */}
                <div className={`p-4 rounded-xl border ${RISK_COLORS[selectedRisk.severity].border} ${RISK_COLORS[selectedRisk.severity].bg}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className={`w-4 h-4 ${RISK_COLORS[selectedRisk.severity].text}`} />
                    <h4 className={`text-sm font-bold ${RISK_COLORS[selectedRisk.severity].text}`}>Risk Assessment</h4>
                  </div>
                  <div className="space-y-2">
                    {selectedRisk.type === 'tight-connection' && (() => {
                      const fromB = bookings.find(b => b.id === selectedRisk.bookingIds[0]);
                      const toB = bookings.find(b => b.id === selectedRisk.bookingIds[1]);
                      const assessments = [];
                      if (fromB && toB) {
                        const totalCostAtRisk = (fromB?.cost || 0) + (toB?.cost || 0);
                        assessments.push(`If ${fromB.title} is delayed, you risk missing ${toB.title}. The combined value of these bookings is ${formatCurrency(totalCostAtRisk)}.`);
                        if (toB.refund_percent === 0) {
                          assessments.push(`⚠ ${toB.title} is non-refundable. If missed due to a connection delay, the full ${formatCurrency(toB.cost)} would be lost with no possibility of reimbursement from the provider.`);
                        } else if (toB.refund_percent < 50) {
                          assessments.push(`${toB.title} has only a ${toB.refund_percent}% refund rate. You would only recover ${formatCurrency(toB.cost * toB.refund_percent / 100)} of the ${formatCurrency(toB.cost)} if cancelled.`);
                        }
                        if (fromB.type === 'flight') {
                          assessments.push('Flight delays are common, especially during peak travel seasons. Airlines typically do not compensate for missed third-party connections.');
                        }
                        if (fromB.type === 'train') {
                          assessments.push('Train delays can cascade — even a 10-minute delay at an intermediate station can compound further down the line.');
                        }
                      }
                      return assessments.map((text, i) => (
                        <p key={i} className={`text-xs ${RISK_COLORS[selectedRisk.severity].text} opacity-80 leading-relaxed`}>{text}</p>
                      ));
                    })()}
                    {selectedRisk.type === 'non-refundable' && (() => {
                      const b = bookings.find(bk => bk.id === selectedRisk.bookingIds[0]);
                      if (!b) return null;
                      const assessments = [
                        `${b.title} has a strict non-refundable policy. If this booking is disrupted or missed due to upstream delays, the full ${formatCurrency(b.cost)} would be a total loss.`,
                        b.cost > 500
                          ? `Given the significant value (${formatCurrency(b.cost)}), travel insurance covering trip interruption is strongly recommended. Many policies cover non-refundable bookings for a fraction of the cost.`
                          : `While the amount is moderate, purchasing travel insurance could protect against unexpected disruptions.`,
                        'Check if your credit card offers any built-in trip protection benefits that may apply to this booking.',
                      ];
                      return assessments.map((text, i) => (
                        <p key={i} className={`text-xs ${RISK_COLORS[selectedRisk.severity].text} opacity-80 leading-relaxed`}>{text}</p>
                      ));
                    })()}
                    {selectedRisk.type === 'weather-risk' && (
                      <p className={`text-xs ${RISK_COLORS[selectedRisk.severity].text} opacity-80 leading-relaxed`}>
                        Weather disruptions are unpredictable and can affect multiple bookings simultaneously. Monitor weather forecasts for the destination and consider flexible booking options.
                      </p>
                    )}
                    {selectedRisk.type === 'late-arrival' && (
                      <p className={`text-xs ${RISK_COLORS[selectedRisk.severity].text} opacity-80 leading-relaxed`}>
                        Late arrivals may impact check-in deadlines, activity start times, or dinner reservations. Contact the downstream provider to confirm their late-arrival policy.
                      </p>
                    )}
                  </div>
                </div>

                {/* Mitigation Suggestions */}
                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="w-4 h-4 text-primary" />
                    <h4 className="text-sm font-bold text-primary">Suggested Mitigations</h4>
                  </div>
                  <ul className="space-y-2">
                    {selectedRisk.type === 'tight-connection' && [
                      'Add buffer time by rebooking to an earlier departure or later connecting service.',
                      'Set up real-time delay alerts for the first booking so you can act quickly.',
                      'Research alternative connections or direct routes to avoid the tight transfer.',
                      selectedRisk.severity === 'high' ? 'Consider booking a backup option now — high-risk connections fail frequently.' : 'Keep a backup plan in mind, but active monitoring may be sufficient.',
                    ].map((tip, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary text-xs mt-0.5">•</span>
                        <p className="text-xs text-primary/80 leading-relaxed">{tip}</p>
                      </li>
                    ))}
                    {selectedRisk.type === 'non-refundable' && [
                      'Purchase comprehensive travel insurance that covers trip interruption and non-refundable bookings.',
                      'Contact the provider to check if flexible upgrade options are available (e.g., flexible cancellation add-on).',
                      'Ensure upstream bookings have sufficient buffer to minimize the chance of missing this one.',
                      'Save confirmation emails and booking references for easy access during the trip.',
                    ].map((tip, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary text-xs mt-0.5">•</span>
                        <p className="text-xs text-primary/80 leading-relaxed">{tip}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-white/5 bg-black/20 flex justify-end gap-3">
                <button
                  onClick={() => setSelectedRisk(null)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setSelectedRisk(null);
                    onNavigate?.('itinerary');
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <Map className="w-4 h-4" />
                  View on Itinerary
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
