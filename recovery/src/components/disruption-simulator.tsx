'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Booking, BookingType, DisruptionType, Severity } from '@/types';
import { toast } from 'sonner';
import {
  Plane, Train, Hotel, Car, Ticket, CalendarDays, CloudRain,
  Link2Off, UserX, Ban, Clock, Loader2, Zap, RefreshCw, ArrowUpDown
} from 'lucide-react';

export interface ScenarioConfig {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  type: DisruptionType;
  severity: Severity;
  targetTypes: BookingType[];
  accentColor: string;
  getDescription: (b: Booking) => string;
}

export const scenarios: ScenarioConfig[] = [
  {
    id: 'flight-delay', label: 'Flight Delay', description: 'Technical hold or air traffic delay',
    icon: Clock, type: 'delay', severity: 'high', targetTypes: ['flight'],
    accentColor: '#ef4444',
    getDescription: (b) => `${b.title} delayed by 3h 15m due to late incoming aircraft.`,
  },
  {
    id: 'flight-cancellation', label: 'Flight Cancellation', description: 'Grounded due to airline ops',
    icon: Ban, type: 'cancellation', severity: 'high', targetTypes: ['flight'],
    accentColor: '#ef4444',
    getDescription: (b) => `${b.title} cancelled due to crew availability.`,
  },
  {
    id: 'train-delay', label: 'Train Delay', description: 'Track maintenance or congestion',
    icon: Clock, type: 'delay', severity: 'medium', targetTypes: ['train'],
    accentColor: '#f59e0b',
    getDescription: (b) => `${b.title} delayed by 45m due to track work.`,
  },
  {
    id: 'train-cancellation', label: 'Train Cancellation', description: 'Rail corridor strike or fault',
    icon: Ban, type: 'cancellation', severity: 'high', targetTypes: ['train'],
    accentColor: '#ef4444',
    getDescription: (b) => `${b.title} cancelled due to strike action.`,
  },
  {
    id: 'missed-connection', label: 'Missed Connection', description: 'Inbound delay broke connection',
    icon: Link2Off, type: 'missed-connection', severity: 'high', targetTypes: ['flight', 'train'],
    accentColor: '#ef4444',
    getDescription: (b) => `Missed connection for ${b.title} due to late inbound.`,
  },
  {
    id: 'transfer-failure', label: 'Transfer Delay', description: 'Traffic congestion delay',
    icon: Car, type: 'transfer-failure', severity: 'high', targetTypes: ['transfer'],
    accentColor: '#ef4444',
    getDescription: (b) => `Transfer ${b.title} significantly delayed.`,
  },
  {
    id: 'transfer-breakdown', label: 'Breakdown / Failure', description: 'Vehicle breakdown or failure',
    icon: Zap, type: 'transfer-failure', severity: 'high', targetTypes: ['transfer'],
    accentColor: '#ef4444',
    getDescription: (b) => `Vehicle for ${b.title} broke down en route.`,
  },
  {
    id: 'hotel-cancellation', label: 'Hotel Cancellation', description: 'Property cancelled booking',
    icon: Hotel, type: 'cancellation', severity: 'medium', targetTypes: ['hotel'],
    accentColor: '#f59e0b',
    getDescription: (b) => `${b.title} cancelled by hotel due to issue.`,
  },
  {
    id: 'hotel-overbooking', label: 'Hotel Overbooked', description: 'No rooms available on arrival',
    icon: Ban, type: 'cancellation', severity: 'medium', targetTypes: ['hotel'],
    accentColor: '#f59e0b',
    getDescription: (b) => `${b.title} overbooked — no room available.`,
  },
  {
    id: 'activity-cancellation', label: 'Activity Cancellation', description: 'Tour operator or host cancel',
    icon: Ticket, type: 'cancellation', severity: 'low', targetTypes: ['activity', 'event'],
    accentColor: '#10b981',
    getDescription: (b) => `${b.title} cancelled by operator.`,
  },
  {
    id: 'weather-event', label: 'Weather Event', description: 'Adverse weather halts activities',
    icon: CloudRain, type: 'weather', severity: 'medium', targetTypes: ['activity', 'event', 'flight'],
    accentColor: '#f59e0b',
    getDescription: (b) => `${b.title} affected by severe weather conditions.`,
  },
  {
    id: 'traveler-change', label: 'Traveler Change', description: 'User-initiated schedule change',
    icon: UserX, type: 'traveler-initiated', severity: 'low', targetTypes: ['flight', 'train', 'hotel', 'transfer', 'activity', 'event'],
    accentColor: '#10b981',
    getDescription: (b) => `Traveler requested change to ${b.title}.`,
  },
];

type FilterTab = 'All' | 'Flights' | 'Transfers' | 'Trains' | 'Hotels' | 'Activities';

const FILTER_TABS: FilterTab[] = ['All', 'Flights', 'Transfers', 'Trains', 'Hotels', 'Activities'];

const FILTER_MAP: Record<FilterTab, BookingType[]> = {
  All:        ['flight','train','hotel','transfer','activity','event'],
  Flights:    ['flight'],
  Transfers:  ['transfer'],
  Trains:     ['train'],
  Hotels:     ['hotel'],
  Activities: ['activity','event'],
};

interface DisruptionSimulatorProps {
  bookings: Booking[];
  selectedBooking?: Booking | null;
  onClearSelection?: () => void;
  onTrigger: (bookingId: string, type: DisruptionType, severity: Severity, description: string) => Promise<void>;
  isLoading: boolean;
  targetSelectionScenario?: ScenarioConfig | null;
  onStartTargetSelection?: (scenario: ScenarioConfig, eligible: Booking[]) => void;
  onCancelTargetSelection?: () => void;
}

export default function DisruptionSimulator({
  bookings, onTrigger, isLoading,
  targetSelectionScenario, onStartTargetSelection, onCancelTargetSelection,
}: DisruptionSimulatorProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('All');
  const [triggeringId, setTriggeringId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const allowed = FILTER_MAP[activeTab];
    return scenarios.filter(s => s.targetTypes.some(t => allowed.includes(t)));
  }, [activeTab]);

  const getCount = (types: BookingType[]) =>
    bookings.filter(b => types.includes(b.type)).length;

  const handleClick = (scenario: ScenarioConfig) => {
    if (targetSelectionScenario?.id === scenario.id) {
      onCancelTargetSelection?.();
      return;
    }
    const eligible = bookings.filter(
      b => scenario.targetTypes.includes(b.type) && (b.status === 'confirmed' || b.status === 'at-risk')
    );
    if (eligible.length === 0) {
      toast.error(`No eligible bookings for "${scenario.label}"`);
      return;
    }
    onStartTargetSelection?.(scenario, eligible);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-3 pt-3 pb-2 border-b border-border/30">
        <div className="flex items-center gap-2 mb-0.5">
          <div className="w-6 h-6 rounded-md bg-disrupted/20 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-disrupted" />
          </div>
          <span className="text-sm font-bold">Disruption Simulator</span>
          <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-confirmed/20 text-confirmed ml-auto">
            LIVE
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground">Select a node or pick a scenario</p>
      </div>

      {/* Filter tabs — horizontal scroll */}
      <div className="flex-shrink-0 flex items-center gap-1 px-3 py-2 overflow-x-auto scrollbar-none border-b border-border/30">
        {FILTER_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-shrink-0 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
              activeTab === tab
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Scenario cards — 2-col grid */}
      <div className="flex-1 overflow-y-auto p-2">
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((scenario, idx) => {
              const Icon = scenario.icon;
              const count = getCount(scenario.targetTypes);
              const isActive = targetSelectionScenario?.id === scenario.id;
              const severityColor = scenario.severity === 'high' ? '#ef4444' : scenario.severity === 'medium' ? '#f59e0b' : '#10b981';

              return (
                <motion.button
                  key={scenario.id}
                  layout
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ delay: idx * 0.03, duration: 0.15 }}
                  onClick={() => handleClick(scenario)}
                  disabled={isLoading && !isActive}
                  className={`relative flex flex-col gap-1.5 p-2.5 rounded-xl border text-left transition-all ${
                    isActive
                      ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                      : 'border-border/40 bg-card/60 hover:border-primary/40 hover:bg-accent/20'
                  }`}
                >
                  {/* Icon row */}
                  <div className="flex items-center justify-between">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: scenario.accentColor + '20' }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: scenario.accentColor }} />
                    </div>
                    {triggeringId === scenario.id && (
                      <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    )}
                  </div>

                  {/* Label */}
                  <p className="text-[11px] font-bold leading-tight text-foreground">{scenario.label}</p>

                  {/* Description */}
                  <p className="text-[9px] text-muted-foreground leading-tight line-clamp-2">{scenario.description}</p>

                  {/* Count badge */}
                  <div
                    className="mt-auto text-[9px] font-bold px-1.5 py-0.5 rounded self-start"
                    style={{ background: severityColor + '20', color: severityColor }}
                  >
                    {count} available
                  </div>

                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  )}
                </motion.button>
              );
            })}
          </div>
        </AnimatePresence>
      </div>
    </div>
  );
}
