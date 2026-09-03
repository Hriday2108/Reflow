'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import ItineraryGraph from '@/components/itinerary-graph';
import BookingDetailPanel from '@/components/booking-detail-panel';
import DisruptionSimulator from '@/components/disruption-simulator';
import ImpactAnalysisPanel from '@/components/impact-analysis';
import RecoveryOptions from '@/components/recovery-options';
import ReflowLoader from '@/components/reflow-loader';
import { supabase } from '@/lib/supabase';
import {
  fetchTrip,
  fetchBookings,
  fetchDependencies,
  fetchDisruptions,
  fetchAllRecoveryOptions,
  createDisruption,
  selectRecoveryOption,
  resetDemo,
} from '@/lib/queries';
import {
  computeImpactAnalysis,
} from '@/lib/disruption-engine';
import type {
  Trip,
  Booking,
  BookingDependency,
  DisruptionEvent,
  RecoveryOption,
  ImpactAnalysis,
  DisruptionType,
  Severity,
} from '@/types';
import {
  RefreshCw,
  Map,
  Plane,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  // ── State ──────────────────────────────────────────────
  const [trip, setTrip] = useState<Trip | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [dependencies, setDependencies] = useState<BookingDependency[]>([]);
  const [disruptions, setDisruptions] = useState<DisruptionEvent[]>([]);
  const [recoveryOptions, setRecoveryOptions] = useState<RecoveryOption[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [impactAnalysis, setImpactAnalysis] = useState<ImpactAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  // ── Data loading ───────────────────────────────────────

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [tripData, bookingsData, depsData, disruptionsData, optionsData] = await Promise.all([
        fetchTrip(),
        fetchBookings(),
        fetchDependencies(),
        fetchDisruptions(),
        fetchAllRecoveryOptions(),
      ]);

      setTrip(tripData);
      setBookings(bookingsData);
      setDependencies(depsData);
      setDisruptions(disruptionsData);
      setRecoveryOptions(optionsData);

      // Compute impact analysis for the latest disruption
      if (disruptionsData.length > 0 && bookingsData.length > 0 && depsData.length > 0) {
        const latestDisruption = disruptionsData[0];
        const analysis = computeImpactAnalysis(latestDisruption, bookingsData, depsData);
        setImpactAnalysis(analysis);
      } else {
        setImpactAnalysis(null);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load trip data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Supabase Realtime subscription ─────────────────────

  useEffect(() => {
    const channel = supabase
      .channel('bookings-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        (payload) => {
          console.log('Realtime update:', payload);
          // Refresh bookings on any change
          fetchBookings().then((updatedBookings) => {
            setBookings(updatedBookings);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dependencies]);

  // ── Handlers ───────────────────────────────────────────

  const handleTriggerDisruption = useCallback(
    async (bookingId: string, type: DisruptionType, severity: Severity, description: string) => {
      const disruption = await createDisruption(bookingId, type, severity, description);
      if (disruption) {
        // Refresh all data
        await loadData();
      }
    },
    [loadData]
  );

  const handleSelectRecovery = useCallback(
    async (optionId: string) => {
      const success = await selectRecoveryOption(optionId);
      if (success) {
        await loadData();
      }
    },
    [loadData]
  );

  const handleResetDemo = useCallback(async () => {
    setIsResetting(true);
    const success = await resetDemo();
    if (success) {
      setImpactAnalysis(null);
      setRecoveryOptions([]);
      setDisruptions([]);
      setSelectedBooking(null);
      await loadData();
      toast.success('Demo reset successfully', {
        description: 'All bookings restored to confirmed status.',
      });
    } else {
      toast.error('Failed to reset demo');
    }
    setIsResetting(false);
  }, [loadData]);

  const handleSelectBooking = useCallback((booking: Booking) => {
    setSelectedBooking(booking);
  }, []);

  // ── Active disruption options ──────────────────────────

  const activeDisruptionOptions = disruptions.length > 0
    ? recoveryOptions.filter((opt) => opt.disruption_id === disruptions[0]?.id && !opt.selected)
    : [];

  // ── Render ─────────────────────────────────────────────

  if (isLoading) {
    return <ReflowLoader label="Loading itinerary..." />;
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* ── Header ───────────────────────────────────────── */}
      <header className="flex-shrink-0 border-b border-border/50 bg-card/50 backdrop-blur-sm px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Map className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight">
                  {trip?.destination || 'Trip Dashboard'}
                </h1>
                <p className="text-[11px] text-muted-foreground">
                  {trip?.traveler_name} · {trip?.start_date && new Date(trip.start_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {' – '}
                  {trip?.end_date && new Date(trip.end_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Stats */}
            <div className="hidden md:flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Plane className="w-3 h-3" />
                {bookings.length} bookings
              </Badge>
              {disruptions.length > 0 && (
                <Badge className="text-[10px] bg-disrupted/15 text-disrupted border-0 gap-1">
                  {disruptions.length} disruption{disruptions.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <Separator orientation="vertical" className="h-6 hidden md:block" />
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetDemo}
              disabled={isResetting}
              className="text-xs gap-1.5"
            >
              {isResetting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Reset Demo
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Graph + bottom panels */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Graph */}
          <div className="flex-1 p-4 pb-2 min-h-0">
            <ItineraryGraph
              bookings={bookings}
              dependencies={dependencies}
              selectedBookingId={selectedBooking?.id || null}
              onSelectBooking={handleSelectBooking}
            />
          </div>

          {/* Bottom panels: Impact + Recovery */}
          {(impactAnalysis || activeDisruptionOptions.length > 0) && (
            <div className="flex-shrink-0 px-4 pb-4 space-y-3 overflow-y-auto max-h-[45vh]">
              <ImpactAnalysisPanel analysis={impactAnalysis} />
              {activeDisruptionOptions.length > 0 && (
                <RecoveryOptions
                  options={activeDisruptionOptions}
                  onSelectOption={handleSelectRecovery}
                />
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-[340px] flex-shrink-0 border-l border-border/50 bg-card/30 overflow-y-auto p-4 space-y-4 hidden lg:block">
          {/* Booking Detail or Simulator */}
          {selectedBooking ? (
            <BookingDetailPanel
              booking={selectedBooking}
              onClose={() => setSelectedBooking(null)}
            />
          ) : (
            <DisruptionSimulator
              bookings={bookings}
              selectedBooking={selectedBooking}
              onClearSelection={() => setSelectedBooking(null)}
              onTrigger={handleTriggerDisruption}
              isLoading={isLoading}
            />
          )}

          {/* Always show simulator if detail panel is open */}
          {selectedBooking && (
            <DisruptionSimulator
              bookings={bookings}
              selectedBooking={selectedBooking}
              onClearSelection={() => setSelectedBooking(null)}
              onTrigger={handleTriggerDisruption}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
}
