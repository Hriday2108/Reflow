'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Plane,
  Train,
  Car,
  AlertTriangle,
  X,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import type { Booking } from '@/types';
import { formatCurrency, formatDuration } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ManualDelayModalProps {
  isOpen: boolean;
  booking: Booking | null;
  onClose: () => void;
  onApplyDelay: (booking: Booking, delayMinutes: number, reason: string) => Promise<void>;
  isLoading?: boolean;
}

const PRESET_DELAYS = [
  { label: '+15m', minutes: 15 },
  { label: '+30m', minutes: 30 },
  { label: '+45m', minutes: 45 },
  { label: '+1h', minutes: 60 },
  { label: '+1h 30m', minutes: 90 },
  { label: '+2h', minutes: 120 },
  { label: '+3h', minutes: 180 },
  { label: '+4h', minutes: 240 },
];

const FLIGHT_REASONS = [
  'Late incoming aircraft hold',
  'Air traffic congestion & runway sequencing',
  'Technical inspection & maintenance clearance',
  'Adverse weather & visibility limits',
  'Crew duty-time regulations',
];

const TRAIN_REASONS = [
  'Track maintenance & speed restriction',
  'Signal failure along rail corridor',
  'Late incoming rake turnover',
  'Severe weather / track congestion',
  'Overhead wire inspection',
];

const DEFAULT_REASONS = [
  'Operational delay',
  'Heavy traffic congestion',
  'Technical delay',
  'Adverse weather',
];

export default function ManualDelayModal({
  isOpen,
  booking,
  onClose,
  onApplyDelay,
  isLoading = false,
}: ManualDelayModalProps) {
  const [delayMinutes, setDelayMinutes] = useState<number>(90);
  const [customHours, setCustomHours] = useState<number>(1);
  const [customMins, setCustomMins] = useState<number>(30);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  // Set default reason when booking changes
  const defaultReasons = useMemo(() => {
    if (!booking) return DEFAULT_REASONS;
    if (booking.type === 'flight') return FLIGHT_REASONS;
    if (booking.type === 'train') return TRAIN_REASONS;
    return DEFAULT_REASONS;
  }, [booking?.type]);

  const activeReason = customReason.trim() || selectedReason || defaultReasons[0];

  const handlePresetClick = (mins: number) => {
    setDelayMinutes(mins);
    setCustomHours(Math.floor(mins / 60));
    setCustomMins(mins % 60);
    setIsCustomMode(false);
  };

  const handleHoursChange = (h: number) => {
    const validH = Math.max(0, Math.min(24, h || 0));
    setCustomHours(validH);
    const total = validH * 60 + customMins;
    setDelayMinutes(total > 0 ? total : 15);
    setIsCustomMode(true);
  };

  const handleMinsChange = (m: number) => {
    const validM = Math.max(0, Math.min(59, m || 0));
    setCustomMins(validM);
    const total = customHours * 60 + validM;
    setDelayMinutes(total > 0 ? total : 15);
    setIsCustomMode(true);
  };

  const handleSliderChange = (mins: number) => {
    setDelayMinutes(mins);
    setCustomHours(Math.floor(mins / 60));
    setCustomMins(mins % 60);
    setIsCustomMode(true);
  };

  if (!isOpen || !booking) return null;

  const originalStart = new Date(booking.start_time);
  const delayedStart = new Date(originalStart.getTime() + delayMinutes * 60 * 1000);

  const originalEnd = booking.end_time ? new Date(booking.end_time) : null;
  const delayedEnd = originalEnd ? new Date(originalEnd.getTime() + delayMinutes * 60 * 1000) : null;

  const formatClock = (d: Date) =>
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const formatDay = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const handleSubmit = async () => {
    if (delayMinutes <= 0) return;
    await onApplyDelay(booking, delayMinutes, activeReason);
  };

  const IconComponent = booking.type === 'flight' ? Plane : booking.type === 'train' ? Train : Car;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg rounded-2xl bg-card border border-amber-500/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          style={{
            boxShadow: '0 0 0 1px rgba(245,158,11,0.2), 0 20px 50px rgba(0,0,0,0.5)',
          }}
        >
          {/* Top accent line */}
          <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />

          {/* Modal Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 bg-amber-500/5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center border border-amber-500/30">
                <Clock className="w-5 h-5 text-amber-500 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  Apply Manual Delay
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30 uppercase tracking-wide">
                    Manual Config
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Specify the exact delay duration for this itinerary booking
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={isLoading}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Target Booking Info Card */}
            <div className="p-3.5 rounded-xl border border-border/60 bg-accent/20 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20">
                <IconComponent className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{booking.title}</p>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                  <span className="capitalize">{booking.type}</span>
                  <span>•</span>
                  <span>
                    {formatDay(originalStart)} · {formatClock(originalStart)}
                  </span>
                  <span>•</span>
                  <span>{formatCurrency(booking.cost)}</span>
                </div>
              </div>
            </div>

            {/* Quick Delay Presets */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                1. Select Quick Delay Preset
              </label>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_DELAYS.map((preset) => {
                  const isSelected = delayMinutes === preset.minutes;
                  return (
                    <button
                      key={preset.minutes}
                      type="button"
                      onClick={() => handlePresetClick(preset.minutes)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border text-center ${
                        isSelected
                          ? 'bg-amber-500 text-black border-amber-500 shadow-md scale-[1.02]'
                          : 'bg-card hover:bg-accent/50 border-border/60 text-foreground'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Hours & Minutes Stepper */}
            <div className="space-y-2 p-3.5 rounded-xl border border-border/40 bg-accent/10">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-500" />
                  Custom Manual Delay Duration
                </label>
                <span className="text-xs font-extrabold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                  +{formatDuration(delayMinutes)} ({delayMinutes} min)
                </span>
              </div>

              {/* Number Inputs */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block">Hours</label>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      min={0}
                      max={24}
                      value={customHours}
                      onChange={(e) => handleHoursChange(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                    <span className="absolute right-3 text-xs text-muted-foreground pointer-events-none">
                      hrs
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block">Minutes</label>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      min={0}
                      max={59}
                      step={5}
                      value={customMins}
                      onChange={(e) => handleMinsChange(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                    <span className="absolute right-3 text-xs text-muted-foreground pointer-events-none">
                      mins
                    </span>
                  </div>
                </div>
              </div>

              {/* Interactive Range Slider */}
              <div className="pt-2">
                <input
                  type="range"
                  min={15}
                  max={360}
                  step={15}
                  value={delayMinutes}
                  onChange={(e) => handleSliderChange(parseInt(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-border rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>15m</span>
                  <span>1h</span>
                  <span>2h</span>
                  <span>3h</span>
                  <span>4h</span>
                  <span>6h</span>
                </div>
              </div>
            </div>

            {/* Live Timing Impact Preview */}
            <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Updated Timetable Preview
              </p>
              <div className="flex items-center justify-between text-xs">
                <div>
                  <p className="text-[10px] text-muted-foreground">Original Departure</p>
                  <p className="font-semibold text-foreground line-through opacity-70">
                    {formatClock(originalStart)}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground">Delayed Departure</p>
                  <p className="font-bold text-amber-500 text-sm">
                    {formatClock(delayedStart)}
                  </p>
                </div>
              </div>

              {originalEnd && delayedEnd && (
                <div className="flex items-center justify-between text-xs pt-1 border-t border-amber-500/15">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Original Arrival</p>
                    <p className="font-semibold text-foreground line-through opacity-70">
                      {formatClock(originalEnd)}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">Delayed Arrival</p>
                    <p className="font-bold text-amber-500 text-sm">
                      {formatClock(delayedEnd)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Delay Reason Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                2. Reason / Description
              </label>
              <div className="space-y-1.5">
                {defaultReasons.map((reason) => {
                  const isChecked = (selectedReason === reason || (!selectedReason && !customReason && reason === defaultReasons[0])) && !customReason;
                  return (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => {
                        setSelectedReason(reason);
                        setCustomReason('');
                      }}
                      className={`w-full px-3 py-2 rounded-lg text-left text-xs transition-colors flex items-center justify-between border ${
                        isChecked
                          ? 'border-amber-500/60 bg-amber-500/10 text-foreground font-semibold'
                          : 'border-border/40 bg-card hover:bg-accent/40 text-muted-foreground'
                      }`}
                    >
                      <span className="truncate">{reason}</span>
                      {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 ml-2" />}
                    </button>
                  );
                })}

                {/* Custom Note input */}
                <input
                  type="text"
                  placeholder="Or enter custom reason..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-border/40 bg-card">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isLoading}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={isLoading || delayMinutes <= 0}
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs gap-1.5 shadow-md shadow-amber-500/20"
            >
              {isLoading ? (
                <span>Simulating...</span>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5" />
                  <span>Apply +{formatDuration(delayMinutes)} Delay</span>
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
