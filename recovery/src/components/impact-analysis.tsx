'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ImpactAnalysis, ImpactItem } from '@/types';
import { formatCurrency } from '@/lib/utils';
import {
  AlertTriangle, DollarSign, Target, ChevronDown,
  Plane, Train, Car, Hotel, Ticket, AlertCircle,
  X, Maximize2, Minimize2,
} from 'lucide-react';

const BOOKING_ICONS: Record<string, React.ElementType> = {
  flight: Plane, train: Train, hotel: Hotel, transfer: Car, activity: Ticket,
};

interface ImpactAnalysisPanelProps {
  analyses: ImpactAnalysis[] | null;
  onClose?: () => void;
}

export default function ImpactAnalysisPanel({ analyses, onClose }: ImpactAnalysisPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [showDownstream, setShowDownstream] = useState(false);

  if (!analyses || analyses.length === 0) return null;

  const totalCostAtRisk = analyses.reduce((sum, a) => sum + a.totalCostAtRisk, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="glass-card border border-disrupted/30 rounded-2xl overflow-hidden"
      style={{ boxShadow: '0 0 0 1px rgba(239,68,68,0.12), 0 -4px 24px rgba(239,68,68,0.07)' }}
    >
      {/* Top accent bar */}
      <div className="h-0.5 bg-gradient-to-r from-disrupted via-at-risk to-disrupted" />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-disrupted/15 bg-disrupted/5">
        {/* Icon */}
        <div className="w-8 h-8 rounded-xl bg-disrupted/15 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-4 h-4 text-disrupted" />
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-none mb-0.5">Impact Analysis</p>
          <p className="text-[10px] text-muted-foreground capitalize">
            {analyses.length} Active Disruption{analyses.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Cost at risk */}
        <div className="text-right flex-shrink-0 mr-2">
          <div className="flex items-center gap-0.5 text-disrupted justify-end">
            <span className="text-lg font-extrabold leading-none">{formatCurrency(totalCostAtRisk)}</span>
          </div>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">total at risk</p>
        </div>

        {/* Expand / Close buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-7 h-7 rounded-lg flex items-center justify-center bg-accent/60 border border-border/50 text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
            title={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded
              ? <Minimize2 className="w-3.5 h-3.5" />
              : <Maximize2 className="w-3.5 h-3.5" />
            }
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center bg-disrupted/10 border border-disrupted/25 text-disrupted hover:bg-disrupted/20 transition-all"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Body — height transitions via inline style (reliable in all browsers) */}
      <div
        style={{
          maxHeight: expanded ? 600 : 200,
          transition: 'max-height 0.3s ease',
          overflowY: 'auto',
        }}
      >
        <div className="p-4 space-y-6">
          {analyses.map((analysis, index) => {
            const { disruption, directImpact, downstreamImpacts } = analysis;
            const DirectIcon = BOOKING_ICONS[directImpact.booking.type] || Target;

            return (
              <div key={disruption.id} className="space-y-3">
                {/* Disruption Header */}
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-disrupted" />
                  <p className="text-xs font-bold text-disrupted uppercase tracking-widest">{disruption.type.replace('-', ' ')} ({disruption.severity})</p>
                </div>

                {/* Direct impact card */}
                <div className="rounded-xl border border-disrupted/15 bg-card/60 overflow-hidden">
                  <div className="p-3 bg-disrupted/5 border-b border-disrupted/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DirectIcon className="w-4 h-4 text-disrupted" />
                      <p className="text-sm font-semibold text-foreground leading-tight">{directImpact.booking.title}</p>
                    </div>
                    {directImpact.booking.cost > 0 && (
                      <p className="text-xs font-medium text-muted-foreground">{formatCurrency(directImpact.booking.cost)}</p>
                    )}
                  </div>
                  <div className="p-3 flex items-start gap-2 bg-disrupted/5">
                    <AlertCircle className="w-3.5 h-3.5 text-disrupted mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground leading-relaxed">{directImpact.reason}</p>
                  </div>
                </div>

                {/* Downstream impact summary/toggle */}
                {downstreamImpacts.length > 0 && (
                  <div className="pt-2">
                    <button
                      onClick={() => setShowDownstream(v => !v)}
                      className="w-full flex items-center justify-between p-2 rounded-lg bg-at-risk/5 border border-at-risk/20 hover:bg-at-risk/10 transition-colors group"
                    >
                      <span className="text-[10px] font-bold text-at-risk uppercase tracking-widest">
                        Cascade Effect ({downstreamImpacts.length})
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 text-at-risk transition-transform duration-300 ${showDownstream ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Downstream items */}
                    <AnimatePresence>
                      {showDownstream && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-2 space-y-2">
                            {downstreamImpacts.map((impact) => {
                              const Icon = BOOKING_ICONS[impact.booking.type] || Target;
                              return (
                                <div key={impact.booking.id} className="p-3 rounded-xl border border-at-risk/15 bg-card/60 flex items-start gap-3">
                                  <div className="mt-0.5 w-6 h-6 rounded-lg bg-at-risk/10 flex items-center justify-center flex-shrink-0">
                                    <Icon className="w-3.5 h-3.5 text-at-risk" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold leading-tight text-foreground mb-1">{impact.booking.title}</p>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">{impact.reason}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
                
                {index < analyses.length - 1 && <div className="h-px bg-border/40 my-4" />}
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

function ImpactCard({ item, variant }: { item: ImpactItem; variant: 'direct' | 'downstream' }) {
  const isDirect = variant === 'direct';
  const Icon = BOOKING_ICONS[item.booking.type] ?? Ticket;
  return (
    <div
      className="rounded-xl border p-3"
      style={{
        background: isDirect ? 'rgba(239,68,68,0.07)' : 'rgba(245,158,11,0.07)',
        borderColor: isDirect ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon
            className="w-3.5 h-3.5 flex-shrink-0"
            style={{ color: isDirect ? '#ef4444' : '#f59e0b' }}
          />
          <p className="text-sm font-semibold truncate">{item.booking.title}</p>
        </div>
        <span className="text-xs text-muted-foreground font-medium ml-2 flex-shrink-0">
          ${Number(item.booking.cost).toFixed(0)}
        </span>
      </div>
      <div
        className="flex items-start gap-2 p-2.5 rounded-lg"
        style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <AlertCircle
          className="w-3 h-3 mt-0.5 flex-shrink-0"
          style={{ color: isDirect ? '#ef4444' : '#f59e0b' }}
        />
        <p className="text-[11px] text-muted-foreground leading-relaxed">{item.reason}</p>
      </div>
    </div>
  );
}
