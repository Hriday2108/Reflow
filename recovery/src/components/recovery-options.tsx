'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import RecoveryChart from './recovery-chart';
import type { RecoveryOption, DisruptionEvent } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Wand2, Clock, IndianRupee, Star, CheckCircle2,
  Loader2, ArrowRight, Plane, Train, Hotel, Car, Ticket, X, Info, Check
} from 'lucide-react';

interface RecoveryOptionsProps {
  options: RecoveryOption[];
  onSelectOption: (optionId: string) => Promise<void>;
  maxCost?: number;
}

const OPTION_COLORS = [
  { accent: 'text-confirmed',      bg: 'bg-confirmed/10',      border: 'border-confirmed/30',      ring: 'ring-confirmed/50',  shadow: 'shadow-[0_0_20px_rgba(16,185,129,0.15)]' },
  { accent: 'text-indigo-light',   bg: 'bg-indigo-light/10',   border: 'border-indigo-light/30',   ring: 'ring-indigo-light/50', shadow: 'shadow-[0_0_20px_rgba(129,140,248,0.15)]' },
  { accent: 'text-purple-light',   bg: 'bg-purple-light/10',   border: 'border-purple-light/30',   ring: 'ring-purple-light/50', shadow: 'shadow-[0_0_20px_rgba(167,139,250,0.15)]' },
  { accent: 'text-electric-light', bg: 'bg-electric-light/10', border: 'border-electric-light/30', ring: 'ring-electric-light/50', shadow: 'shadow-[0_0_20px_rgba(96,165,250,0.15)]' },
];

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-3.5 h-3.5 ${s <= rating ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`}
        />
      ))}
    </div>
  );
}

export default function RecoveryOptions({ options, onSelectOption, maxCost }: RecoveryOptionsProps) {
  const [selecting, setSelecting] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'compare'>('cards');
  const [viewingOption, setViewingOption] = useState<RecoveryOption | null>(null);
  const isOverBudget = (opt: RecoveryOption) => maxCost !== undefined && opt.cost_delta > maxCost;

  const generatePlanAnalysis = (opt: RecoveryOption) => {
    const analysis = [];
    
    // Cost analysis
    if (opt.cost_delta > 0) {
      analysis.push(`This plan requires an additional out-of-pocket cost of ${formatCurrency(opt.cost_delta)}. Depending on your policy, this may be recoverable through travel insurance or carrier compensation.`);
    } else if (opt.cost_delta < 0) {
      analysis.push(`This plan results in a net savings/refund of ${formatCurrency(Math.abs(opt.cost_delta))}. The refund will be processed to your original payment method.`);
    } else {
      analysis.push(`This plan is cost-neutral. Any cancellation refunds perfectly offset the new booking costs, resulting in ${formatCurrency(0)} additional out-of-pocket expenses.`);
    }

    // Time analysis
    if (opt.time_delta_minutes > 120) {
      const hours = Math.floor(opt.time_delta_minutes / 60);
      const mins = opt.time_delta_minutes % 60;
      analysis.push(`Your overall itinerary will be extended by ${hours}h ${mins}m. Please ensure your destination arrangements (like hotel check-ins) are updated to reflect the new arrival time.`);
    } else if (opt.time_delta_minutes > 0) {
      analysis.push(`There is a minor time impact of +${opt.time_delta_minutes}m, keeping you relatively close to your original schedule.`);
    }

    // Convenience analysis
    if (opt.convenience_score >= 4) {
      analysis.push(`This is a highly convenient recovery route. It minimizes stress and requires the least amount of active intervention on your part.`);
    } else if (opt.convenience_score <= 2) {
      analysis.push(`Note: This option has a lower convenience rating. It may involve tight connections, longer layovers, or multiple transfers.`);
    }

    return analysis;
  };

  if (options.length === 0) return null;

  const handleSelect = async (optionId: string) => {
    setSelecting(optionId);
    try {
      await onSelectOption(optionId);
      toast.success('Recovery plan applied successfully!', {
        description: 'Your itinerary has been updated.',
      });
    } catch {
      toast.error('Failed to apply recovery plan');
    } finally {
      setSelecting(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold">We found {options.length} recovery options for you</h3>
        </div>
        <div className="flex items-center bg-card border border-border/50 rounded-lg p-0.5 text-[11px] font-medium">
          <button
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1.5 rounded-md transition-all ${viewMode === 'cards' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Cards
          </button>
          <button
            onClick={() => setViewMode('compare')}
            className={`px-3 py-1.5 rounded-md transition-all ${viewMode === 'compare' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Compare
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'cards' ? (
          <motion.div
            key="cards"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4"
          >
            {options.map((opt, idx) => {
              const color = OPTION_COLORS[idx % OPTION_COLORS.length];
              const isRecommended = idx === 0;

              return (
                <div
                  key={opt.id}
                  className={`relative flex flex-col glass-card rounded-2xl overflow-hidden border ${isRecommended ? 'border-primary/50 ' + color.shadow : 'border-border/40 hover:border-border/80'}`}
                >
                  {isRecommended && (
                    <div className="absolute top-0 left-0 right-0 text-center py-1 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest z-10">
                      ★ Best Match
                    </div>
                  )}
                  {isOverBudget(opt) && (
                    <div className={`absolute ${isRecommended ? 'top-7' : 'top-0'} right-0 px-2.5 py-1 rounded-bl-lg bg-disrupted text-white text-[10px] font-bold uppercase tracking-wider z-10`}>
                      Over Budget
                    </div>
                  )}

                  <div className={`p-4 ${isRecommended ? 'pt-8' : ''} flex-1 flex flex-col`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="text-base font-bold">{opt.label}</h4>
                        <p className={`text-xs font-semibold ${isRecommended ? 'text-primary' : 'text-muted-foreground'}`}>
                          {opt.label === 'Plan A' ? 'Minimum Disruption' : opt.label === 'Plan B' ? 'Cheapest Option' : opt.label === 'Plan C' ? 'Fastest Recovery' : 'Balanced Option'}
                        </p>
                      </div>
                    </div>

                    {/* Change summary */}
                    <div className="space-y-1.5 my-4">
                      {opt.changes.slice(0, 5).map((change, i) => (
                        <div key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                          {change.description.includes('flight') || change.description.includes('departure') ? (
                            <Plane className="w-3.5 h-3.5 text-foreground mt-0.5 flex-shrink-0" />
                          ) : change.description.includes('train') ? (
                            <Train className="w-3.5 h-3.5 text-foreground mt-0.5 flex-shrink-0" />
                          ) : change.description.includes('transfer') ? (
                            <Car className="w-3.5 h-3.5 text-foreground mt-0.5 flex-shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-confirmed mt-0.5 flex-shrink-0" />
                          )}
                          <span className="leading-tight">{change.description}</span>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-confirmed" />
                        Keep remaining itinerary
                      </div>
                    </div>

                    <div className="mt-auto space-y-4">
                      <div className="flex items-center justify-between border-t border-border/40 pt-4">
                        <div>
                          <p className="text-xl font-bold">{formatCurrency(opt.cost_delta)}</p>
                          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Additional Cost</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-disrupted">+{opt.time_delta_minutes}m</p>
                          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Time Impact</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <RatingStars rating={opt.convenience_score} />
                        <span className="text-[10px] text-muted-foreground font-medium">Convenience</span>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={() => setViewingOption(opt)}
                          className="flex-1 py-2 rounded-lg border border-border/60 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleSelect(opt.id)}
                          disabled={!!selecting}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                            isRecommended
                              ? 'bg-primary text-primary-foreground hover:bg-primary/90 glow-blue'
                              : 'bg-primary/20 text-primary hover:bg-primary/30'
                          }`}
                        >
                          {selecting === opt.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Apply Plan'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key="compare"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card rounded-2xl overflow-hidden border border-border/40"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="p-4 font-semibold text-muted-foreground bg-black/20">Criteria</th>
                    {options.map((opt, idx) => (
                      <th key={opt.id} className={`p-4 font-bold ${idx === 0 ? 'bg-primary/10 text-primary' : 'bg-black/20'}`}>
                        {idx === 0 && <span className="text-[9px] uppercase tracking-widest block mb-1 text-primary">★ Best Match</span>}
                        {opt.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  <tr>
                    <td className="p-4 text-muted-foreground font-medium bg-black/20">Additional Cost</td>
                    {options.map((opt, idx) => (
                      <td key={opt.id} className={`p-4 font-bold ${idx === 0 ? 'bg-primary/5' : ''}`}>
                        {formatCurrency(opt.cost_delta)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4 text-muted-foreground font-medium bg-black/20">Time Impact</td>
                    {options.map((opt, idx) => (
                      <td key={opt.id} className={`p-4 text-disrupted font-semibold ${idx === 0 ? 'bg-primary/5' : ''}`}>
                        +{opt.time_delta_minutes}m
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4 text-muted-foreground font-medium bg-black/20">Bookings Changed</td>
                    {options.map((opt, idx) => (
                      <td key={opt.id} className={`p-4 font-semibold ${idx === 0 ? 'bg-primary/5' : ''}`}>
                        {opt.changes.length}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4 text-muted-foreground font-medium bg-black/20">Convenience</td>
                    {options.map((opt, idx) => (
                      <td key={opt.id} className={`p-4 ${idx === 0 ? 'bg-primary/5' : ''}`}>
                        <RatingStars rating={opt.convenience_score} />
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4 bg-black/20"></td>
                    {options.map((opt, idx) => (
                      <td key={opt.id} className={`p-4 ${idx === 0 ? 'bg-primary/5' : ''}`}>
                        <button
                          onClick={() => handleSelect(opt.id)}
                          disabled={!!selecting}
                          className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all ${
                            idx === 0
                              ? 'bg-primary text-primary-foreground hover:bg-primary/90 glow-blue'
                              : 'bg-primary/20 text-primary hover:bg-primary/30'
                          }`}
                        >
                          {selecting === opt.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : `Apply ${opt.label}`}
                        </button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Details Modal */}
      <AnimatePresence>
        {viewingOption && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingOption(null)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl glass-card rounded-2xl overflow-hidden shadow-2xl border border-white/10"
            >
              {/* Header */}
              <div className="p-5 border-b border-white/5 flex items-start justify-between bg-black/20">
                <div>
                  <h3 className="font-bold text-xl leading-tight text-foreground">{viewingOption.label}</h3>
                  <p className="text-sm text-muted-foreground mt-1">Review the specific changes this plan will make to your itinerary.</p>
                </div>
                <button
                  onClick={() => setViewingOption(null)}
                  className="p-2 -mr-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                {/* Stats Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Additional Cost</p>
                    <p className="text-lg font-bold">{formatCurrency(viewingOption.cost_delta)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Time Impact</p>
                    <p className="text-lg font-bold text-disrupted">+{viewingOption.time_delta_minutes}m</p>
                  </div>
                  <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Convenience</p>
                    <RatingStars rating={viewingOption.convenience_score} />
                  </div>
                </div>

                {/* Plan Analysis (AI generated) */}
                <div className="p-5 rounded-xl bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Wand2 className="w-4 h-4 text-primary" />
                    <h4 className="text-sm font-bold text-primary">Plan Impact Analysis</h4>
                  </div>
                  <div className="space-y-3">
                    {generatePlanAnalysis(viewingOption).map((text, i) => (
                      <p key={i} className="text-sm text-primary/80 leading-relaxed">
                        {text}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Changes List */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Proposed Changes ({viewingOption.changes.length})</h4>
                  <div className="space-y-2">
                    {viewingOption.changes.map((change, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-3">
                        <div className="mt-0.5 p-1 rounded-full bg-primary/20 text-primary">
                          <Check className="w-3 h-3" />
                        </div>
                        <div>
                          <p className="text-sm font-medium leading-relaxed">{change.description}</p>
                          {change.field === 'status' && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Status will change from <span className="uppercase text-[10px] tracking-wider text-disrupted">{change.old_value}</span> to <span className="uppercase text-[10px] tracking-wider text-confirmed">{change.new_value}</span>.
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-white/5 bg-black/20 flex justify-end gap-3">
                <button
                  onClick={() => setViewingOption(null)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleSelect(viewingOption.id);
                    setViewingOption(null);
                  }}
                  disabled={!!selecting}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
                >
                  {selecting === viewingOption.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply Plan Now'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
