'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { RiskWarning, Severity } from '@/types';
import {
  ShieldAlert,
  Clock,
  AlertTriangle,
  IndianRupee,
} from 'lucide-react';

const severityConfig: Record<Severity, { color: string; bg: string; label: string }> = {
  low: { color: 'text-rebooked', bg: 'bg-rebooked/10', label: 'Low' },
  medium: { color: 'text-at-risk', bg: 'bg-at-risk/10', label: 'Medium' },
  high: { color: 'text-disrupted', bg: 'bg-disrupted/10', label: 'High' },
};

const typeIcons: Record<string, React.ElementType> = {
  'tight-connection': Clock,
  'non-refundable': IndianRupee,
  'weather-risk': AlertTriangle,
  'late-arrival': Clock,
};

interface RiskRadarProps {
  warnings: RiskWarning[];
}

export default function RiskRadar({ warnings }: RiskRadarProps) {
  if (warnings.length === 0) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-confirmed/10 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-confirmed" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Risk Radar</CardTitle>
              <p className="text-[11px] text-muted-foreground">No warnings detected</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground text-center py-4">
            ✅ All connections look good
          </p>
        </CardContent>
      </Card>
    );
  }

  const highCount = warnings.filter((w) => w.severity === 'high').length;
  const medCount = warnings.filter((w) => w.severity === 'medium').length;

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-at-risk/10 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-at-risk" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Risk Radar</CardTitle>
              <p className="text-[11px] text-muted-foreground">
                Proactive risk detection
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            {highCount > 0 && (
              <Badge className="text-[9px] bg-disrupted/15 text-disrupted border-0 px-1.5">
                {highCount} high
              </Badge>
            )}
            {medCount > 0 && (
              <Badge className="text-[9px] bg-at-risk/15 text-at-risk border-0 px-1.5">
                {medCount} med
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[300px]">
          <div className="space-y-2">
            {warnings.map((warning, idx) => {
              const severity = severityConfig[warning.severity];
              const Icon = typeIcons[warning.type] || AlertTriangle;

              return (
                <motion.div
                  key={warning.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.06, duration: 0.25 }}
                >
                  <div
                    className={`rounded-lg border ${
                      warning.severity === 'high'
                        ? 'border-disrupted/20 bg-disrupted/5'
                        : 'border-at-risk/20 bg-at-risk/5'
                    } p-2.5`}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${severity.bg}`}
                      >
                        <Icon className={`w-3 h-3 ${severity.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Badge
                            className={`text-[8px] px-1 py-0 h-3.5 ${severity.color} ${severity.bg} border-0`}
                          >
                            {severity.label}
                          </Badge>
                          <span className="text-[9px] text-muted-foreground capitalize">
                            {warning.type.replace('-', ' ')}
                          </span>
                        </div>
                        <p className="text-[11px] text-foreground/80 leading-relaxed">
                          {warning.message}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
