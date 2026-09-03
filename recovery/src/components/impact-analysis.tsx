'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { ImpactAnalysis, ImpactItem } from '@/types';
import {
  AlertTriangle,
  ArrowRight,
  DollarSign,
  Target,
  ChevronDown,
} from 'lucide-react';

interface ImpactAnalysisPanelProps {
  analysis: ImpactAnalysis | null;
}

export default function ImpactAnalysisPanel({ analysis }: ImpactAnalysisPanelProps) {
  if (!analysis) return null;

  const { disruption, directImpact, downstreamImpacts, totalCostAtRisk } = analysis;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -20, height: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <Card className="border-disrupted/30 bg-card/80 backdrop-blur-sm shadow-xl overflow-hidden">
          {/* Red accent bar */}
          <div className="h-1 w-full bg-gradient-to-r from-disrupted via-at-risk to-disrupted" />

          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-disrupted/10 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-disrupted" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">Impact Analysis</CardTitle>
                  <p className="text-[11px] text-muted-foreground capitalize">
                    {disruption.type.replace('-', ' ')} · {disruption.severity} severity
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-disrupted">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span className="text-sm font-bold">${totalCostAtRisk.toFixed(0)}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">total at risk</p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {/* Direct Impact */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Target className="w-3 h-3 text-disrupted" />
                <span className="text-xs font-semibold text-disrupted uppercase tracking-wider">
                  Direct Impact
                </span>
              </div>
              <ImpactCard item={directImpact} variant="direct" />
            </div>

            {downstreamImpacts.length > 0 && (
              <>
                <div className="flex items-center gap-2 py-1">
                  <Separator className="flex-1" />
                  <div className="flex items-center gap-1 text-at-risk">
                    <ChevronDown className="w-3 h-3" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">
                      Cascade Effect
                    </span>
                    <ChevronDown className="w-3 h-3" />
                  </div>
                  <Separator className="flex-1" />
                </div>

                {/* Downstream Impacts */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <ArrowRight className="w-3 h-3 text-at-risk" />
                    <span className="text-xs font-semibold text-at-risk uppercase tracking-wider">
                      Downstream Impact
                    </span>
                    <Badge variant="secondary" className="text-[9px] h-4 px-1.5 ml-1">
                      {downstreamImpacts.length} booking{downstreamImpacts.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  {downstreamImpacts.map((item, idx) => (
                    <motion.div
                      key={item.booking.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + idx * 0.08, duration: 0.25 }}
                    >
                      <ImpactCard item={item} variant="downstream" />
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

function ImpactCard({
  item,
  variant,
}: {
  item: ImpactItem;
  variant: 'direct' | 'downstream';
}) {
  const borderColor = variant === 'direct' ? 'border-disrupted/30' : 'border-at-risk/30';
  const bgColor = variant === 'direct' ? 'bg-disrupted/5' : 'bg-at-risk/5';

  return (
    <div className={`rounded-lg border ${borderColor} ${bgColor} p-3`}>
      <div className="flex items-start justify-between mb-1.5">
        <p className="text-sm font-semibold text-foreground">{item.booking.title}</p>
        <span className="text-xs text-muted-foreground">
          ${Number(item.booking.cost).toFixed(0)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{item.reason}</p>
    </div>
  );
}
