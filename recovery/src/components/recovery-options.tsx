'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import RecoveryChart from './recovery-chart';
import type { RecoveryOption } from '@/types';
import { toast } from 'sonner';
import {
  Wand2,
  Clock,
  DollarSign,
  Star,
  PieChart,
  CheckCircle2,
  Loader2,
  ArrowRight,
} from 'lucide-react';

interface RecoveryOptionsProps {
  options: RecoveryOption[];
  onSelectOption: (optionId: string) => Promise<void>;
}

const OPTION_COLORS = [
  { accent: 'text-indigo', bg: 'bg-indigo/10', border: 'border-indigo/30', ring: 'ring-indigo/50' },
  { accent: 'text-confirmed', bg: 'bg-confirmed/10', border: 'border-confirmed/30', ring: 'ring-confirmed/50' },
  { accent: 'text-at-risk', bg: 'bg-at-risk/10', border: 'border-at-risk/30', ring: 'ring-at-risk/50' },
];

const OPTION_LABELS = ['Option A', 'Option B', 'Option C'];

export default function RecoveryOptions({
  options,
  onSelectOption,
}: RecoveryOptionsProps) {
  const [selecting, setSelecting] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (options.length === 0) return null;

  const handleSelect = async (optionId: string) => {
    setSelecting(optionId);
    try {
      await onSelectOption(optionId);
      setSelectedId(optionId);
      toast.success('Recovery option applied!', {
        description: 'Your itinerary has been updated.',
      });
    } catch {
      toast.error('Failed to apply recovery option');
    } finally {
      setSelecting(null);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-xl overflow-hidden">
          {/* Accent bar */}
          <div className="h-1 w-full bg-gradient-to-r from-indigo via-confirmed to-at-risk" />

          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo/10 flex items-center justify-center">
                <Wand2 className="w-4 h-4 text-indigo" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Recovery Options</CardTitle>
                <p className="text-[11px] text-muted-foreground">
                  {options.length} options generated — compare and select
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Option Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {options.slice(0, 3).map((option, idx) => {
                const colorScheme = OPTION_COLORS[idx] || OPTION_COLORS[0];
                const isSelected = selectedId === option.id;
                const isSelecting = selecting === option.id;

                return (
                  <motion.div
                    key={option.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + idx * 0.1, duration: 0.3 }}
                  >
                    <div
                      className={`
                        rounded-xl border-2 p-4 transition-all duration-300
                        ${isSelected
                          ? `${colorScheme.border} ${colorScheme.bg} ring-2 ${colorScheme.ring}`
                          : `border-border/50 hover:${colorScheme.border} hover:${colorScheme.bg}`
                        }
                      `}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between mb-3">
                        <Badge
                          className={`text-[10px] font-bold ${colorScheme.accent} ${colorScheme.bg} border-0`}
                        >
                          {OPTION_LABELS[idx]}
                        </Badge>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-confirmed" />
                        )}
                      </div>

                      {/* Label */}
                      <h4 className="text-sm font-semibold mb-3 leading-tight">
                        {option.label}
                      </h4>

                      <Separator className="mb-3" />

                      {/* Metrics */}
                      <div className="space-y-2 mb-4">
                        <MetricRow
                          icon={DollarSign}
                          label="Cost Impact"
                          value={
                            option.cost_delta >= 0
                              ? `+$${option.cost_delta.toFixed(0)}`
                              : `-$${Math.abs(option.cost_delta).toFixed(0)}`
                          }
                          valueColor={option.cost_delta <= 0 ? 'text-confirmed' : 'text-disrupted'}
                        />
                        <MetricRow
                          icon={Clock}
                          label="Time Impact"
                          value={
                            option.time_delta_minutes === 0
                              ? 'No delay'
                              : `+${option.time_delta_minutes} min`
                          }
                          valueColor={
                            option.time_delta_minutes <= 30
                              ? 'text-confirmed'
                              : option.time_delta_minutes <= 90
                              ? 'text-at-risk'
                              : 'text-disrupted'
                          }
                        />
                        <MetricRow
                          icon={Star}
                          label="Convenience"
                          value={
                            <span className="flex gap-0.5">
                              {Array.from({ length: 5 }, (_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3 h-3 ${
                                    i < option.convenience_score
                                      ? 'text-at-risk fill-at-risk'
                                      : 'text-muted-foreground/30'
                                  }`}
                                />
                              ))}
                            </span>
                          }
                        />
                        <MetricRow
                          icon={PieChart}
                          label="Affected"
                          value={`${option.percent_itinerary_affected}% of trip`}
                          valueColor={
                            option.percent_itinerary_affected <= 20
                              ? 'text-confirmed'
                              : 'text-at-risk'
                          }
                        />
                      </div>

                      {/* Changes preview */}
                      <div className="mb-4">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                          Changes
                        </p>
                        <div className="space-y-1">
                          {option.changes.slice(0, 3).map((change, ci) => (
                            <div key={ci} className="flex items-start gap-1.5">
                              <ArrowRight className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                              <p className="text-[11px] text-muted-foreground leading-tight">
                                {change.description}
                              </p>
                            </div>
                          ))}
                          {option.changes.length > 3 && (
                            <p className="text-[10px] text-muted-foreground/60 ml-4.5">
                              +{option.changes.length - 3} more changes
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Select button */}
                      <Button
                        className="w-full"
                        variant={isSelected ? 'secondary' : 'default'}
                        size="sm"
                        onClick={() => handleSelect(option.id)}
                        disabled={isSelecting || isSelected || !!selectedId}
                      >
                        {isSelecting ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        ) : isSelected ? (
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                        ) : null}
                        {isSelected ? 'Applied' : isSelecting ? 'Applying...' : 'Select This Option'}
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Comparison Chart */}
            <Separator />
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Visual Comparison
              </h4>
              <RecoveryChart options={options.slice(0, 3)} />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

function MetricRow({
  icon: Icon,
  label,
  value,
  valueColor,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <Icon className="w-3 h-3 text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
      <span className={`text-xs font-semibold ${valueColor || 'text-foreground'}`}>
        {value}
      </span>
    </div>
  );
}
