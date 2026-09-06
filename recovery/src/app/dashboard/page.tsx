'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// Components
import AppSidebar, { type SidebarView } from '@/components/sidebar';
import ReflowLoader from '@/components/reflow-loader';
import ItineraryGraph from '@/components/itinerary-graph';
import DisruptionSimulator, { type ScenarioConfig } from '@/components/disruption-simulator';
import ImpactAnalysisPanel from '@/components/impact-analysis';
import RecoveryOptions from '@/components/recovery-options';
import BookingDetailPanel from '@/components/booking-detail-panel';
import DashboardOverview from '@/components/views/dashboard-overview';
import RiskMonitorView from '@/components/views/risk-monitor-view';
import AlertsView from '@/components/views/alerts-view';
import PreferencesView from '@/components/views/preferences-view';
import WeatherView from '@/components/views/weather-view';

// Queries & engine
import {
  fetchTrip, fetchBookings, fetchDependencies,
  fetchDisruptions, fetchAllRecoveryOptions,
  createDisruption, selectRecoveryOption, resetDemo,
} from '@/lib/queries';
import { computeImpactAnalysis, computeRiskWarnings } from '@/lib/disruption-engine';

// Types
import type {
  Trip, Booking, BookingDependency, DisruptionEvent,
  RecoveryOption, ImpactAnalysis, DisruptionType, Severity,
} from '@/types';

// Preferences
import { usePreferences } from '@/context/preferences-context';

// Icons
import {
  Map, Plane, AlertTriangle, RefreshCw, Bell, ChevronRight,
} from 'lucide-react';

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const tripId = searchParams.get('tripId') ?? undefined;

  // ── View state ─────────────────────────────────────────
  const [activeView, setActiveView] = useState<SidebarView>('overview');
  const { preferences } = usePreferences();

  // ── Data state ─────────────────────────────────────────
  const [trip, setTrip] = useState<Trip | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [dependencies, setDependencies] = useState<BookingDependency[]>([]);
  const [disruptions, setDisruptions] = useState<DisruptionEvent[]>([]);
  const [recoveryOptions, setRecoveryOptions] = useState<RecoveryOption[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [impactAnalysis, setImpactAnalysis] = useState<ImpactAnalysis[] | null>(null);
  const [targetSelectionScenario, setTargetSelectionScenario] = useState<ScenarioConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  // Tracks whether the user manually dismissed the impact panel
  const impactDismissedRef = useRef(false);
  const [impactDismissed, setImpactDismissed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Selectable booking IDs during target selection
  const selectableBookingIds = useMemo(() => {
    if (!targetSelectionScenario) return [];
    return bookings
      .filter((b) =>
        targetSelectionScenario.targetTypes.includes(b.type) &&
        (b.status === 'confirmed' || b.status === 'at-risk')
      )
      .map((b) => b.id);
  }, [targetSelectionScenario, bookings]);

  // Filtered bookings based on search
  const filteredBookings = useMemo(() => {
    if (!searchQuery.trim()) return bookings;
    const q = searchQuery.toLowerCase();
    return bookings.filter(b => 
      (b.title?.toLowerCase() || '').includes(q) || 
      (b.type?.toLowerCase() || '').includes(q) ||
      (b.location?.toLowerCase() || '').includes(q) ||
      ((b as any).provider?.toLowerCase() || '').includes(q) ||
      ((b as any).confirmation_code?.toLowerCase() || '').includes(q)
    );
  }, [bookings, searchQuery]);

  // Risk warnings
  const riskWarnings = useMemo(
    () => (bookings.length && dependencies.length ? computeRiskWarnings(bookings, dependencies) : []),
    [bookings, dependencies]
  );

  // Cancel target selection on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && targetSelectionScenario) setTargetSelectionScenario(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [targetSelectionScenario]);

  // ── Data loading ───────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [tripData, bookingsData, depsData, disruptionsData, optionsData] = await Promise.all([
        fetchTrip(tripId), fetchBookings(tripId), fetchDependencies(tripId),
        fetchDisruptions(tripId), fetchAllRecoveryOptions(tripId),
      ]);
      setTrip(tripData);
      setBookings(bookingsData);
      setDependencies(depsData);
      setDisruptions(disruptionsData);
      setRecoveryOptions(optionsData);

      if (disruptionsData.length > 0 && bookingsData.length > 0 && depsData.length > 0) {
        if (!impactDismissedRef.current) {
          setImpactAnalysis(disruptionsData.map(d => computeImpactAnalysis(d, bookingsData, depsData)));
        }
      } else {
        // No disruptions — reset dismissed flag and clear panel
        impactDismissedRef.current = false;
        setImpactDismissed(false);
        setImpactAnalysis(null);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load trip data');
    } finally {
      setIsLoading(false);
    }
  }, [tripId]);

  // Initial load
  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    loadData().finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  // Polling (5s)
  useEffect(() => {
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  // ── Handlers ───────────────────────────────────────────
  const handleTriggerDisruption = useCallback(
    async (bookingId: string, type: DisruptionType, severity: Severity, description: string) => {
      // Reset dismissed flag so the new disruption's impact is shown
      impactDismissedRef.current = false;
      setImpactDismissed(false);
      const disruption = await createDisruption(bookingId, type, severity, description, tripId);
      if (disruption) {
        await loadData();
        // Switch to impact view automatically
        setActiveView('itinerary');
      } else {
        throw new Error('Failed to create disruption');
      }
    },
    [loadData, tripId]
  );

  const handleSelectRecovery = useCallback(
    async (optionId: string) => {
      const success = await selectRecoveryOption(optionId);
      if (success) await loadData();
    },
    [loadData]
  );

  const handleResetDemo = useCallback(async () => {
    setIsResetting(true);
    const ok = await resetDemo(tripId);
    if (ok) {
      toast.success('Demo reset successfully', { description: 'All bookings restored to confirmed status.' });
      setImpactDismissed(false);
      impactDismissedRef.current = false;
      setImpactAnalysis(null);
      setRecoveryOptions([]);
      setDisruptions([]);
      setSelectedBooking(null);
      setActiveView('overview');
      await loadData();
    } else {
      toast.error('Failed to reset demo');
    }
    setIsResetting(false);
  }, [loadData, tripId]);

  const handleSelectBooking = useCallback((booking: Booking) => setSelectedBooking(booking), []);

  const handleStartTargetSelection = useCallback((scenario: ScenarioConfig) => {
    setSelectedBooking(null);
    setTargetSelectionScenario(scenario);
    setActiveView('itinerary'); // switch to itinerary for node selection
  }, [tripId]);

  const handleCancelTargetSelection = useCallback(() => setTargetSelectionScenario(null), []);

  const handleConfirmTarget = useCallback(
    async (booking: Booking) => {
      if (!targetSelectionScenario) return;
      const scenario = targetSelectionScenario;
      setTargetSelectionScenario(null);
      setSelectedBooking(booking);
      try {
        await handleTriggerDisruption(booking.id, scenario.type, scenario.severity, scenario.getDescription(booking));
        toast.success(`${scenario.label} simulated`, { description: `Affected booking: ${booking.title}` });
      } catch {
        toast.error('Failed to trigger disruption');
      }
    },
    [targetSelectionScenario, handleTriggerDisruption]
  );

  const activeDisruptionOptions = useMemo(() => {
    if (disruptions.length === 0) return [];
    const filtered = recoveryOptions.filter(
      (opt) => opt.disruption_id === disruptions[0]?.id && !opt.selected
    );
    // Sort based on user preference priority
    const sorted = [...filtered].sort((a, b) => {
      switch (preferences.priority) {
        case 'lowest-cost':
          return a.cost_delta - b.cost_delta;
        case 'fastest-arrival':
          return a.time_delta_minutes - b.time_delta_minutes;
        case 'best-convenience':
          return b.convenience_score - a.convenience_score;
        case 'minimum-disruption':
        default:
          return a.percent_itinerary_affected - b.percent_itinerary_affected;
      }
    });
    return sorted;
  }, [disruptions, recoveryOptions, preferences.priority]);

  // ── Loading screen ─────────────────────────────────────
  if (isLoading) return <ReflowLoader label="Loading itinerary..." />;

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <AppSidebar
        activeView={activeView}
        onViewChange={setActiveView}
        disruptionCount={disruptions.length}
        alertCount={disruptions.length + riskWarnings.length}
        onReset={handleResetDemo}
        isResetting={isResetting}
        travelerName={trip?.traveler_name}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar — reference style with search, avatar, notification bell */}
        <header
          className="flex-shrink-0 h-14 px-5 flex items-center justify-between backdrop-blur-sm"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}
        >
          {/* Left: trip info */}
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
              <Map className="w-3.5 h-3.5" style={{ color: '#818cf8' }} />
            </div>
            <div>
              <h1 className="text-sm font-bold">{trip?.destination ?? 'Dashboard'}</h1>
              {trip && (
                <p className="text-[11px] text-muted-foreground">
                  {trip.traveler_name} · {new Date(trip.start_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {' – '}
                  {new Date(trip.end_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>

          {/* Center: search bar */}
          <div className="hidden md:flex items-center">
            <input
              className="nav-search"
              placeholder="🔍  Search bookings, alerts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Right: badges + bell + avatar */}
          <div className="flex items-center gap-2">
            {/* Disruption badge */}
            {disruptions.length > 0 && (
              <button
                onClick={() => setActiveView('itinerary')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}
              >
                <AlertTriangle className="w-3 h-3" />
                {disruptions.length} disruption{disruptions.length !== 1 ? 's' : ''}
              </button>
            )}

            {/* Show Impact */}
            {disruptions.length > 0 && impactDismissed && (
              <button
                onClick={() => {
                  impactDismissedRef.current = false;
                  setImpactDismissed(false);
                  if (disruptions.length > 0 && bookings.length > 0 && dependencies.length > 0) {
                    setImpactAnalysis(disruptions.map(d => computeImpactAnalysis(d, bookings, dependencies)));
                  }
                  setActiveView('itinerary');
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}
              >
                <AlertTriangle className="w-3 h-3" />
                Show Impact
              </button>
            )}

            {/* Recovery options badge */}
            {activeDisruptionOptions.length > 0 && (
              <button
                onClick={() => setActiveView('recovery')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors animate-pulse"
                style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8' }}
              >
                <RefreshCw className="w-3 h-3" />
                {activeDisruptionOptions.length} plan{activeDisruptionOptions.length !== 1 ? 's' : ''} ready
              </button>
            )}

            {/* Alert bell */}
            <button
              onClick={() => setActiveView('alerts')}
              className="relative w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <Bell className="w-3.5 h-3.5 text-muted-foreground" />
              {(disruptions.length + riskWarnings.length) > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-disrupted rounded-full text-[8px] font-bold text-white flex items-center justify-center">
                  {disruptions.length + riskWarnings.length}
                </span>
              )}
            </button>

            {/* User avatar */}
            <div className="user-avatar cursor-default" title={`${trip?.traveler_name ?? 'Alex Morgan'} — Premium`}>
              {trip?.traveler_name ? trip.traveler_name.charAt(0).toUpperCase() : 'A'}
            </div>
          </div>
        </header>

        {/* View content */}
        <div className="flex-1 overflow-hidden flex">
          <AnimatePresence mode="wait">
            {/* Overview */}
            {activeView === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex-1 overflow-hidden">
                <DashboardOverview
                  trip={trip}
                  bookings={filteredBookings}
                  dependencies={dependencies}
                  disruptions={disruptions}
                  recoveryOptions={recoveryOptions}
                  onNavigate={setActiveView}
                />
              </motion.div>
            )}

            {/* Itinerary graph */}
            {activeView === 'itinerary' && (
              <motion.div key="itinerary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex-1 flex overflow-hidden">
                {/* Graph area — relative so floating panel is absolute inside it */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Target selection banner */}
                  {targetSelectionScenario && (
                    <div className="flex-shrink-0 mx-3 mt-3 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/30">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <p className="text-sm font-medium flex-1">
                        Click a <span className="text-primary font-bold">{targetSelectionScenario.targetTypes.join(' or ')}</span> node to simulate <span className="text-primary font-bold">{targetSelectionScenario.label}</span>
                      </p>
                      <button onClick={handleCancelTargetSelection} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border/50 transition-colors">
                        Cancel
                      </button>
                    </div>
                  )}

                  {/* Graph + floating booking detail overlay */}
                  <div className="flex-1 min-h-0 relative">
                    <ItineraryGraph
                      bookings={filteredBookings}
                      dependencies={dependencies}
                      selectedBookingId={selectedBooking?.id ?? null}
                      onSelectBooking={handleSelectBooking}
                      selectableBookingIds={selectableBookingIds}
                      isTargetSelectionActive={Boolean(targetSelectionScenario)}
                      onConfirmTarget={handleConfirmTarget}
                    />

                    {/* Floating booking detail — top-left, draggable + resizable */}
                    {selectedBooking && (
                      <BookingDetailPanel
                        booking={selectedBooking}
                        onClose={() => setSelectedBooking(null)}
                      />
                    )}

                    {/* Recovery plans badge — bottom-right of graph */}
                    {activeDisruptionOptions.length > 0 && (
                      <button
                        onClick={() => setActiveView('recovery')}
                        className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-lg glow-blue animate-pulse z-30"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        {activeDisruptionOptions.length} recovery plan{activeDisruptionOptions.length !== 1 ? 's' : ''} ready →
                      </button>
                    )}
                  </div>

                  {/* Impact Analysis — fixed bottom strip with expand + close */}
                  {impactAnalysis && (
                    <div className="flex-shrink-0 px-3 pb-3 pt-2 border-t border-border/30">
                      <ImpactAnalysisPanel
                        analyses={impactAnalysis}
                        onClose={() => {
                          impactDismissedRef.current = true;
                          setImpactDismissed(true);
                          setImpactAnalysis(null);
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Right panel — Disruption Simulator only (no booking detail here) */}
                <div className="w-[340px] flex-shrink-0 border-l border-border/30 bg-card/30 flex flex-col overflow-hidden hidden lg:flex">
                  <div className="flex-1 min-h-0">
                    <DisruptionSimulator
                      bookings={bookings}
                      selectedBooking={selectedBooking}
                      onClearSelection={() => setSelectedBooking(null)}
                      onTrigger={handleTriggerDisruption}
                      isLoading={isLoading}
                      targetSelectionScenario={targetSelectionScenario}
                      onStartTargetSelection={handleStartTargetSelection}
                      onCancelTargetSelection={handleCancelTargetSelection}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Recovery Plans */}
            {activeView === 'recovery' && (
              <motion.div key="recovery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex-1 overflow-y-auto">
                <div className="p-6 max-w-5xl mx-auto">
                  <div className="mb-5">
                    <h2 className="text-xl font-bold">Recovery Plans</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {activeDisruptionOptions.length > 0
                        ? `${activeDisruptionOptions.length} recovery plans available — compare and apply the best option.`
                        : 'No active disruptions. Simulate a disruption to generate recovery plans.'}
                    </p>
                  </div>
                  {impactAnalysis && (
                    <div className="mb-4">
                      <ImpactAnalysisPanel analyses={impactAnalysis} />
                    </div>
                  )}
                  {activeDisruptionOptions.length > 0 ? (
                    <RecoveryOptions options={activeDisruptionOptions} onSelectOption={handleSelectRecovery} maxCost={preferences.maxCost} />
                  ) : (
                    <div className="glass-card rounded-2xl p-12 text-center">
                      <RefreshCw className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">No recovery plans available</p>
                      <button
                        onClick={() => setActiveView('itinerary')}
                        className="mt-4 px-5 py-2 rounded-lg bg-primary/10 border border-primary/20 text-sm text-primary font-medium hover:bg-primary/15 transition-colors"
                      >
                        Go to Itinerary →
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Risk Monitor */}
            {activeView === 'risk' && (
              <motion.div key="risk" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex-1 overflow-hidden">
                <RiskMonitorView bookings={filteredBookings} dependencies={dependencies} onNavigate={setActiveView} />
              </motion.div>
            )}

            {/* Alerts */}
            {activeView === 'alerts' && (
              <motion.div key="alerts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex-1 overflow-hidden">
                <AlertsView disruptions={disruptions} bookings={filteredBookings} onNavigate={setActiveView} />
              </motion.div>
            )}

            {/* Preferences */}
            {activeView === 'preferences' && (
              <motion.div key="preferences" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex-1 overflow-hidden">
                <PreferencesView />
              </motion.div>
            )}

            {activeView === 'weather' && (
              <motion.div key="weather" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex-1 overflow-hidden">
                <WeatherView bookings={filteredBookings} dependencies={dependencies} onNavigate={setActiveView} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

