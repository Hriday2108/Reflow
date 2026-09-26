'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hotel, X, Plus, Minus, CalendarPlus, ShieldCheck, ShieldAlert, Sparkles, ArrowRight } from 'lucide-react';
import type { Booking } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface HotelExtendModalProps {
  isOpen: boolean;
  booking: Booking | null;
  onClose: () => void;
  onExtended: () => void; // refresh trip data after a successful extend
}

interface Quote {
  addedCost: number;
  newTotalCost: number;
  newCheckout: string;
  cancellationPolicy: string | null;
  source: 'booking.com' | 'estimate';
  matched: boolean;
}

const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

export default function HotelExtendModal({ isOpen, booking, onClose, onExtended }: HotelExtendModalProps) {
  const [nights, setNights] = useState(1);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !booking) return null;

  const setNightsSafe = (n: number) => {
    setNights(Math.max(1, Math.min(14, n)));
    setQuote(null); // invalidate a stale quote when the count changes
  };

  const getQuote = async () => {
    setLoadingQuote(true);
    setError(null);
    try {
      const res = await fetch('/api/hotel/extend?preview=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id, extraNights: nights }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Could not fetch a quote.');
      setQuote(data as Quote);
    } catch (e) {
      setError((e as Error)?.message || 'Could not fetch a quote.');
    } finally {
      setLoadingQuote(false);
    }
  };

  const confirm = async () => {
    setConfirming(true);
    setError(null);
    try {
      const res = await fetch('/api/hotel/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id, extraNights: nights }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Could not extend the stay.');
      onExtended();
      onClose();
    } catch (e) {
      setError((e as Error)?.message || 'Could not extend the stay.');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg rounded-2xl bg-card border border-emerald-500/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          style={{ boxShadow: '0 0 0 1px rgba(16,185,129,0.2), 0 20px 50px rgba(0,0,0,0.5)' }}
        >
          <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 bg-emerald-500/5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center border border-emerald-500/30">
                <Hotel className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  Extend Hotel Stay
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 uppercase tracking-wide">
                    Booking.com
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground truncate max-w-[320px]">{booking.title}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={confirming}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Nights stepper */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                Additional nights
              </label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setNightsSafe(nights - 1)}
                  disabled={nights <= 1}
                  className="w-10 h-10 rounded-xl border border-border/60 bg-card hover:bg-accent/50 flex items-center justify-center text-foreground disabled:opacity-40"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="flex-1 text-center">
                  <span className="text-3xl font-extrabold text-emerald-500">{nights}</span>
                  <span className="text-sm text-muted-foreground ml-1.5">night{nights > 1 ? 's' : ''}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setNightsSafe(nights + 1)}
                  disabled={nights >= 14}
                  className="w-10 h-10 rounded-xl border border-border/60 bg-card hover:bg-accent/50 flex items-center justify-center text-foreground disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Checkout shift preview */}
            <div className="p-3.5 rounded-xl border border-border/60 bg-accent/20 flex items-center justify-between text-xs">
              <div>
                <p className="text-[10px] text-muted-foreground">Current checkout</p>
                <p className="font-semibold text-foreground">
                  {booking.end_time ? fmtDay(booking.end_time) : '—'}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">New checkout</p>
                <p className="font-bold text-emerald-500">
                  {quote ? fmtDay(quote.newCheckout)
                    : booking.end_time
                      ? fmtDay(new Date(new Date(booking.end_time).getTime() + nights * 86400000).toISOString())
                      : '—'}
                </p>
              </div>
            </div>

            {/* Quote result */}
            {quote && (
              <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-500">Quote</p>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      quote.source === 'booking.com'
                        ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                    }`}
                  >
                    {quote.source === 'booking.com'
                      ? <><ShieldCheck className="w-3 h-3" /> Real rate (Booking.com)</>
                      : <><ShieldAlert className="w-3 h-3" /> Estimate</>}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Added cost ({nights} night{nights > 1 ? 's' : ''})</span>
                  <span className="font-bold text-foreground">{formatCurrency(quote.addedCost)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">New stay total</span>
                  <span className="font-bold text-emerald-500">{formatCurrency(quote.newTotalCost)}</span>
                </div>
                {quote.cancellationPolicy && (
                  <div className="pt-2 border-t border-emerald-500/15">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">
                      Cancellation Policy
                    </p>
                    <p className="text-[11px] text-foreground/75 leading-relaxed">{quote.cancellationPolicy}</p>
                  </div>
                )}
              </div>
            )}

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/25 rounded-lg px-3 py-2">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-border/40 bg-card">
            <Button variant="outline" size="sm" onClick={onClose} disabled={confirming} className="text-xs">
              Cancel
            </Button>
            {!quote ? (
              <Button
                size="sm"
                onClick={getQuote}
                disabled={loadingQuote}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5"
              >
                {loadingQuote ? 'Fetching…' : <><Sparkles className="w-3.5 h-3.5" /> Get quote</>}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={confirm}
                disabled={confirming}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5"
              >
                {confirming ? 'Applying…' : <><CalendarPlus className="w-3.5 h-3.5" /> Confirm +{nights} night{nights > 1 ? 's' : ''}</>}
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
