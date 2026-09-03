'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Booking, BookingType, DisruptionType, Severity } from '@/types';
import { toast } from 'sonner';
import {
  Plane,
  Train,
  Hotel,
  Car,
  Ticket,
  CalendarDays,
  CloudRain,
  Link2Off,
  UserX,
  Ban,
  Zap,
  Clock,
  X,
  Loader2,
  Sparkles,
  Crosshair,
} from 'lucide-react';

export interface ScenarioConfig {
  id: string;
  label: string;
  shortDescription: string;
  icon: React.ElementType;
  type: DisruptionType;
  severity: Severity;
  targetTypes: BookingType[];
  accentColor: string;
  bgStyles: string;
  badgeStyles: string;
  getDescription: (b: Booking) => string;
}

export function getTargetTypeNoun(targetTypes: BookingType[]): string {
  if (targetTypes.length === 1) {
    return targetTypes[0];
  }
  if (targetTypes.length === 2 && targetTypes.includes('activity') && targetTypes.includes('event')) {
    return 'activity';
  }
  if (targetTypes.length === 2 && targetTypes.includes('flight') && targetTypes.includes('train')) {
    return 'flight or train';
  }
  return 'booking';
}

export interface DisruptionSimulatorProps {
  bookings: Booking[];
  selectedBooking?: Booking | null;
  onClearSelection?: () => void;
  onTrigger: (bookingId: string, type: DisruptionType, severity: Severity, description: string) => Promise<void>;
  isLoading: boolean;
  targetSelectionScenario?: ScenarioConfig | null;
  onStartTargetSelection?: (scenario: ScenarioConfig, eligibleBookings: Booking[]) => void;
  onCancelTargetSelection?: () => void;
}

const typeIconMap: Record<BookingType, React.ElementType> = {
  flight: Plane,
  train: Train,
  hotel: Hotel,
  transfer: Car,
  activity: Ticket,
  event: CalendarDays,
};

export const scenarios: ScenarioConfig[] = [
  // ── Flight Scenarios ──────────────────────────────────
  {
    id: 'flight-delay',
    label: 'Flight Delay',
    shortDescription: 'Technical hold or air traffic delay',
    icon: Plane,
    type: 'delay',
    severity: 'medium',
    targetTypes: ['flight'],
    accentColor: 'text-amber-500 dark:text-amber-400',
    bgStyles: 'border-amber-500/20 bg-gradient-to-br from-amber-500/[0.08] to-amber-500/[0.02] hover:border-amber-500/40 hover:from-amber-500/[0.14] active:from-amber-500/[0.18]',
    badgeStyles: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
    getDescription: (b) => `${b.title} delayed by 3 hours due to technical issues at origin airport.`,
  },
  {
    id: 'flight-cancel',
    label: 'Flight Cancellation',
    shortDescription: 'Grounded due to airline crew shortage',
    icon: Ban,
    type: 'cancellation',
    severity: 'high',
    targetTypes: ['flight'],
    accentColor: 'text-rose-500 dark:text-rose-400',
    bgStyles: 'border-rose-500/20 bg-gradient-to-br from-rose-500/[0.08] to-rose-500/[0.02] hover:border-rose-500/40 hover:from-rose-500/[0.14] active:from-rose-500/[0.18]',
    badgeStyles: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25',
    getDescription: (b) => `${b.title} cancelled by airline due to operational crew shortage.`,
  },

  // ── Train Scenarios ───────────────────────────────────
  {
    id: 'train-delay',
    label: 'Train Delay',
    shortDescription: 'Track maintenance or signal failure',
    icon: Train,
    type: 'delay',
    severity: 'medium',
    targetTypes: ['train'],
    accentColor: 'text-amber-500 dark:text-amber-400',
    bgStyles: 'border-amber-500/20 bg-gradient-to-br from-amber-500/[0.08] to-amber-500/[0.02] hover:border-amber-500/40 hover:from-amber-500/[0.14] active:from-amber-500/[0.18]',
    badgeStyles: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
    getDescription: (b) => `${b.title} delayed by 85 minutes due to signaling work on the rail corridor.`,
  },
  {
    id: 'train-cancel',
    label: 'Train Cancellation',
    shortDescription: 'Rail corridor strike or line closure',
    icon: Ban,
    type: 'cancellation',
    severity: 'high',
    targetTypes: ['train'],
    accentColor: 'text-rose-500 dark:text-rose-400',
    bgStyles: 'border-rose-500/20 bg-gradient-to-br from-rose-500/[0.08] to-rose-500/[0.02] hover:border-rose-500/40 hover:from-rose-500/[0.14] active:from-rose-500/[0.18]',
    badgeStyles: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25',
    getDescription: (b) => `${b.title} cancelled due to rail network strikes and line maintenance.`,
  },
  {
    id: 'missed-connection',
    label: 'Missed Connection',
    shortDescription: 'Inbound delay broke connection timing',
    icon: Link2Off,
    type: 'missed-connection',
    severity: 'high',
    targetTypes: ['train', 'flight'],
    accentColor: 'text-rose-500 dark:text-rose-400',
    bgStyles: 'border-rose-500/20 bg-gradient-to-br from-rose-500/[0.08] to-rose-500/[0.02] hover:border-rose-500/40 hover:from-rose-500/[0.14] active:from-rose-500/[0.18]',
    badgeStyles: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25',
    getDescription: (b) => `Previous delay caused connection window to expire for ${b.title}.`,
  },

  // ── Transfer Scenarios (Car / Shuttle) ────────────────
  {
    id: 'transfer-delay',
    label: 'Transfer Delay',
    shortDescription: 'Traffic congestion delayed driver',
    icon: Clock,
    type: 'delay',
    severity: 'medium',
    targetTypes: ['transfer'],
    accentColor: 'text-amber-500 dark:text-amber-400',
    bgStyles: 'border-amber-500/20 bg-gradient-to-br from-amber-500/[0.08] to-amber-500/[0.02] hover:border-amber-500/40 hover:from-amber-500/[0.14] active:from-amber-500/[0.18]',
    badgeStyles: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
    getDescription: (b) => `Gridlock traffic delayed vehicle arrival for ${b.title} by 50 minutes.`,
  },
  {
    id: 'transfer-failure',
    label: 'Breakdown / Failure',
    shortDescription: 'Vehicle breakdown or driver no-show',
    icon: Car,
    type: 'transfer-failure',
    severity: 'medium',
    targetTypes: ['transfer'],
    accentColor: 'text-orange-500 dark:text-orange-400',
    bgStyles: 'border-orange-500/20 bg-gradient-to-br from-orange-500/[0.08] to-orange-500/[0.02] hover:border-orange-500/40 hover:from-orange-500/[0.14] active:from-orange-500/[0.18]',
    badgeStyles: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/25',
    getDescription: (b) => `Transfer vehicle breakdown — service cancelled and driver unavailable for ${b.title}.`,
  },

  // ── Hotel Scenarios ───────────────────────────────────
  {
    id: 'hotel-cancel',
    label: 'Hotel Cancellation',
    shortDescription: 'Property cancelled booking',
    icon: Ban,
    type: 'cancellation',
    severity: 'high',
    targetTypes: ['hotel'],
    accentColor: 'text-rose-500 dark:text-rose-400',
    bgStyles: 'border-rose-500/20 bg-gradient-to-br from-rose-500/[0.08] to-rose-500/[0.02] hover:border-rose-500/40 hover:from-rose-500/[0.14] active:from-rose-500/[0.18]',
    badgeStyles: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25',
    getDescription: (b) => `Hotel reservation unexpectedly cancelled by property for ${b.title}.`,
  },
  {
    id: 'hotel-overbooked',
    label: 'Hotel Overbooked',
    shortDescription: 'No rooms available upon arrival',
    icon: Hotel,
    type: 'cancellation',
    severity: 'high',
    targetTypes: ['hotel'],
    accentColor: 'text-rose-500 dark:text-rose-400',
    bgStyles: 'border-rose-500/20 bg-gradient-to-br from-rose-500/[0.08] to-rose-500/[0.02] hover:border-rose-500/40 hover:from-rose-500/[0.14] active:from-rose-500/[0.18]',
    badgeStyles: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25',
    getDescription: (b) => `${b.title} is overbooked — reservation cannot be accommodated at check-in.`,
  },

  // ── Activity & Event Scenarios ────────────────────────
  {
    id: 'activity-cancel',
    label: 'Activity Cancellation',
    shortDescription: 'Tour operator or host cancelled',
    icon: Ticket,
    type: 'cancellation',
    severity: 'medium',
    targetTypes: ['activity', 'event'],
    accentColor: 'text-rose-500 dark:text-rose-400',
    bgStyles: 'border-rose-500/20 bg-gradient-to-br from-rose-500/[0.08] to-rose-500/[0.02] hover:border-rose-500/40 hover:from-rose-500/[0.14] active:from-rose-500/[0.18]',
    badgeStyles: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25',
    getDescription: (b) => `Tour provider cancelled scheduled booking for ${b.title}.`,
  },

  // ── Multi-type Scenarios ──────────────────────────────
  {
    id: 'weather',
    label: 'Weather Event',
    shortDescription: 'Adverse weather halting operations',
    icon: CloudRain,
    type: 'weather',
    severity: 'medium',
    targetTypes: ['flight', 'train', 'transfer', 'activity', 'event'],
    accentColor: 'text-sky-500 dark:text-sky-400',
    bgStyles: 'border-sky-500/20 bg-gradient-to-br from-sky-500/[0.08] to-sky-500/[0.02] hover:border-sky-500/40 hover:from-sky-500/[0.14] active:from-sky-500/[0.18]',
    badgeStyles: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25',
    getDescription: (b) => `Severe storms and adverse weather warning impacting ${b.title}.`,
  },

  // ── Universal Scenario (All booking types) ────────────
  {
    id: 'traveler-change',
    label: 'Traveler Change',
    shortDescription: 'User-requested schedule adjustment',
    icon: UserX,
    type: 'traveler-initiated',
    severity: 'low',
    targetTypes: ['flight', 'train', 'hotel', 'transfer', 'activity', 'event'],
    accentColor: 'text-violet-500 dark:text-violet-400',
    bgStyles: 'border-violet-500/20 bg-gradient-to-br from-violet-500/[0.08] to-violet-500/[0.02] hover:border-violet-500/40 hover:from-violet-500/[0.14] active:from-violet-500/[0.18]',
    badgeStyles: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/25',
    getDescription: (b) => `Traveler requested an itinerary rescheduling for ${b.title}.`,
  },
];

export default function DisruptionSimulator({
  bookings,
  selectedBooking,
  onClearSelection,
  onTrigger,
  isLoading,
  targetSelectionScenario,
  onStartTargetSelection,
  onCancelTargetSelection,
}: DisruptionSimulatorProps) {
  const [triggering, setTriggering] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<BookingType | 'all'>('all');

  // When a node is selected, dynamically show only the disruption types relevant to that booking's type
  const visibleScenarios = useMemo(() => {
    if (selectedBooking) {
      return scenarios.filter((scenario) => scenario.targetTypes.includes(selectedBooking.type));
    }
    if (categoryFilter !== 'all') {
      return scenarios.filter((scenario) => scenario.targetTypes.includes(categoryFilter));
    }
    return scenarios;
  }, [selectedBooking, categoryFilter]);

  // Check how many bookings are available for each scenario:
  // Must be: (a) the correct type for that disruption, and (b) currently confirmed or at-risk
  const getAvailableCount = (scenario: ScenarioConfig): number => {
    return bookings.filter(
      (b) =>
        scenario.targetTypes.includes(b.type) &&
        (b.status === 'confirmed' || b.status === 'at-risk')
    ).length;
  };

  // Determine if the currently selected booking can be targeted for this scenario
  const isSelectedBookingTargetable = (scenario: ScenarioConfig): boolean => {
    if (!selectedBooking) return false;
    const isCorrectType = scenario.targetTypes.includes(selectedBooking.type);
    const isEligibleStatus =
      selectedBooking.status === 'confirmed' || selectedBooking.status === 'at-risk';
    return isCorrectType && isEligibleStatus;
  };

  const handleTrigger = async (scenario: ScenarioConfig) => {
    // If user clicks the scenario that is already active in target selection mode, cancel it
    if (targetSelectionScenario?.id === scenario.id) {
      onCancelTargetSelection?.();
      return;
    }

    // Determine eligible bookings for this scenario
    const eligibleBookings = bookings.filter(
      (b) =>
        scenario.targetTypes.includes(b.type) &&
        (b.status === 'confirmed' || b.status === 'at-risk')
    );

    if (eligibleBookings.length === 0) {
      toast.error(`No eligible ${scenario.label.toLowerCase()} bookings available`, {
        description: 'All matching bookings are already disrupted, cancelled, or not found.',
      });
      return;
    }

    // When eligible-booking count is greater than 1, enter "select target" mode
    if (eligibleBookings.length > 1) {
      onStartTargetSelection?.(scenario, eligibleBookings);
      return;
    }

    // When eligible count is exactly 1, skip selection step entirely and apply directly
    const targetBooking = eligibleBookings[0];
    setTriggering(scenario.id);
    onCancelTargetSelection?.();

    try {
      await onTrigger(
        targetBooking.id,
        scenario.type,
        scenario.severity,
        scenario.getDescription(targetBooking)
      );
      toast.success(`${scenario.label} simulated`, {
        description: `Affected booking: ${targetBooking.title}`,
      });
    } catch {
      toast.error('Failed to trigger disruption');
    } finally {
      setTriggering(null);
    }
  };

  const SelectedIcon = selectedBooking ? typeIconMap[selectedBooking.type] || Zap : null;

  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/85 backdrop-blur-md shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.3)] transition-all duration-300">
      {/* Decorative subtle ambient glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-36 h-36 rounded-full bg-primary/[0.04] blur-2xl pointer-events-none" />

      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-disrupted/10 border border-disrupted/20 flex items-center justify-center shadow-xs flex-shrink-0">
              <Zap className="w-4 h-4 text-disrupted animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold tracking-tight text-foreground">
                  Disruption Simulator
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-medium tracking-wide uppercase rounded-full bg-primary/10 text-primary border border-primary/20">
                  Live
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground/90 font-medium leading-tight">
                {selectedBooking
                  ? `Targeting ${selectedBooking.type} booking`
                  : 'Select a node or pick a scenario'}
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Context Header: Shows Selected Node or Quick-Filter Pills */}
        <AnimatePresence mode="wait">
          {selectedBooking ? (
            <motion.div
              key="selected-banner"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="mt-3 p-2.5 rounded-xl border border-primary/25 bg-gradient-to-r from-primary/[0.08] to-primary/[0.02] flex items-center justify-between gap-2 shadow-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-background/80 dark:bg-card border border-border/60 flex items-center justify-center flex-shrink-0 shadow-xs">
                  {SelectedIcon && <SelectedIcon className="w-3.5 h-3.5 text-primary" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold truncate text-foreground">
                      {selectedBooking.title}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1.5 py-0 h-3.5 font-medium border-0 ${
                        selectedBooking.status === 'confirmed'
                          ? 'bg-confirmed/15 text-confirmed'
                          : selectedBooking.status === 'at-risk'
                          ? 'bg-at-risk/15 text-at-risk'
                          : 'bg-disrupted/15 text-disrupted'
                      }`}
                    >
                      {selectedBooking.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground capitalize">
                      {selectedBooking.type}
                    </span>
                  </div>
                </div>
              </div>

              {onClearSelection && (
                <button
                  type="button"
                  onClick={onClearSelection}
                  className="w-6 h-6 rounded-lg hover:bg-background/80 dark:hover:bg-card border border-transparent hover:border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-150 flex-shrink-0"
                  title="Clear selection and show all scenarios"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="global-filter"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-2.5 flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar"
            >
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'flight', label: 'Flights' },
                  { id: 'transfer', label: 'Transfers' },
                  { id: 'train', label: 'Trains' },
                  { id: 'hotel', label: 'Hotels' },
                  { id: 'activity', label: 'Activities' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCategoryFilter(tab.id)}
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-lg transition-all duration-150 whitespace-nowrap ${
                    categoryFilter === tab.id
                      ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </CardHeader>

      <CardContent className="px-4 pb-4 pt-1">
        {/* Inline Target Selection Prompt */}
        <AnimatePresence>
          {targetSelectionScenario && (
            <motion.div
              key="target-selection-prompt"
              initial={{ opacity: 0, height: 0, scale: 0.95 }}
              animate={{ opacity: 1, height: 'auto', scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="mb-3 p-2.5 rounded-xl border border-blue-500/40 bg-gradient-to-r from-blue-500/15 via-blue-500/10 to-indigo-500/10 shadow-sm flex items-center justify-between gap-2.5 overflow-hidden"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                  <Crosshair className="w-4 h-4 text-blue-500 dark:text-blue-400 animate-spin" style={{ animationDuration: '8s' }} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold leading-tight text-foreground">
                    Which {getTargetTypeNoun(targetSelectionScenario.targetTypes)} is affected?
                  </p>
                  <p className="text-[11px] text-blue-600 dark:text-blue-300 font-medium leading-tight mt-0.5">
                    Click a highlighted node.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onCancelTargetSelection}
                className="px-2 py-1 text-[10px] font-medium rounded-lg bg-background/80 hover:bg-background border border-border/70 text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer shadow-xs"
                title="Cancel target selection (Esc)"
              >
                <span>Cancel</span>
                <kbd className="text-[9px] px-1 py-0.5 rounded bg-muted font-mono border border-border/50">Esc</kbd>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-2 gap-2">
          <AnimatePresence mode="popLayout">
            {visibleScenarios.map((scenario) => {
              const Icon = scenario.icon;
              const availableCount = getAvailableCount(scenario);
              const isTriggering = triggering === scenario.id;
              const isTargetSelecting = targetSelectionScenario?.id === scenario.id;

              // Check if action can proceed
              let isDisabled = isLoading || isTriggering;
              let statusNote = `${availableCount} available`;

              if (selectedBooking) {
                const isTargetEligible = isSelectedBookingTargetable(scenario);
                if (!isTargetEligible) {
                  isDisabled = true;
                  statusNote =
                    selectedBooking.status === 'disrupted'
                      ? 'Already disrupted'
                      : selectedBooking.status === 'cancelled'
                      ? 'Cancelled'
                      : 'Not eligible';
                }
              } else if (availableCount === 0) {
                isDisabled = true;
                statusNote = '0 available';
              }

              return (
                <motion.div
                  key={scenario.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.16 }}
                  className="h-full"
                >
                  <Button
                    variant="outline"
                    onClick={() => handleTrigger(scenario)}
                    disabled={isDisabled}
                    className={`group relative w-full h-full min-h-[82px] py-2 px-2.5 flex flex-col justify-between items-start text-left rounded-xl transition-all duration-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] ${
                      scenario.bgStyles
                    } ${
                      isTargetSelecting
                        ? 'ring-2 ring-blue-500 dark:ring-blue-400 ring-offset-2 ring-offset-background border-blue-500/60 shadow-md'
                        : ''
                    } ${isDisabled ? 'opacity-40 pointer-events-none' : 'cursor-pointer'}`}
                  >
                    <div className="w-full space-y-1">
                      {/* Top Row: Icon + Label (multi-line enabled, no ellipsis) */}
                      <div className="flex items-start gap-1.5 w-full">
                        <div className="w-5 h-5 rounded-md bg-background/60 dark:bg-background/40 flex items-center justify-center flex-shrink-0 border border-border/40 group-hover:scale-105 transition-transform duration-150 mt-0.5">
                          {isTriggering ? (
                            <Loader2 className="w-3 h-3 animate-spin text-foreground" />
                          ) : (
                            <Icon className={`w-3 h-3 ${scenario.accentColor}`} />
                          )}
                        </div>
                        <span className="text-[11.5px] font-semibold text-foreground tracking-tight leading-[1.25] break-words flex-1 whitespace-normal">
                          {scenario.label}
                        </span>
                      </div>

                      {/* Subtitle / Micro description */}
                      <p className="text-[10px] text-muted-foreground/85 leading-snug line-clamp-1 w-full pl-0.5 font-normal">
                        {scenario.shortDescription}
                      </p>
                    </div>

                    {/* Counter / Status Badge */}
                    <div className="mt-1 w-full flex items-center justify-between">
                      {isTargetSelecting ? (
                        <Badge
                          variant="secondary"
                          className="text-[9px] px-1.5 py-0 h-4 font-semibold rounded-md border tracking-tight bg-blue-500/20 text-blue-600 dark:text-blue-300 border-blue-500/40 flex items-center gap-1"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                          Selecting target...
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className={`text-[9px] px-1.5 py-0 h-4 font-medium rounded-md border tracking-tight ${scenario.badgeStyles}`}
                        >
                          {statusNote}
                        </Badge>
                      )}
                      {selectedBooking && isSelectedBookingTargetable(scenario) && !isTargetSelecting && (
                        <span className="text-[8.5px] font-medium text-primary flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" />
                          Target
                        </span>
                      )}
                    </div>
                  </Button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {visibleScenarios.length === 0 && (
          <div className="py-6 text-center">
            <p className="text-xs text-muted-foreground">No disruptions apply to this selection.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
