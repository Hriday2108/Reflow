'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Booking, BookingStatus } from '@/types';
import {
  Plane, Train, Hotel, Car, Ticket, CalendarDays,
  Clock, MapPin, IndianRupee, Shield, X, Maximize2, Minimize2, GripHorizontal, Users,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const ICON_MAP: Record<string, React.ElementType> = {
  flight: Plane, train: Train, hotel: Hotel, transfer: Car, activity: Ticket, event: CalendarDays,
};

const STATUS_CFG: Record<BookingStatus, { label: string; color: string; bg: string; border: string; accent: string }> = {
  confirmed:  { label: 'Confirmed', color: '#10b981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.35)',  accent: '#10b981' },
  'at-risk':  { label: 'At Risk',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.35)',  accent: '#f59e0b' },
  disrupted:  { label: 'Disrupted', color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.35)',   accent: '#ef4444' },
  rebooked:   { label: 'Rebooked',  color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.35)',  accent: '#3b82f6' },
  cancelled:  { label: 'Cancelled', color: '#9ca3af', bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.35)', accent: '#9ca3af' },
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

interface BookingDetailPanelProps {
  booking: Booking | null;
  onClose: () => void;
}

const MIN_W = 280;
const MAX_W = 560;
const MIN_H = 260;
const MAX_H = 640;
const DEFAULT_W = 320;
const DEFAULT_H = 400;

export default function BookingDetailPanel({ booking, onClose }: BookingDetailPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H });
  const [pos, setPos] = useState({ x: 16, y: 16 });
  const dragRef = useRef<{ startX: number; startY: number; startPx: number; startPy: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Reset when booking changes
  useEffect(() => {
    if (booking) {
      setSize({ w: DEFAULT_W, h: DEFAULT_H });
      setPos({ x: 16, y: 16 });
      setExpanded(false);
    }
  }, [booking?.id]);

  // ── Drag (move panel) ──────────────────────────────────
  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPx: pos.x, startPy: pos.y };

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      setPos({ x: Math.max(0, dragRef.current.startPx + dx), y: Math.max(0, dragRef.current.startPy + dy) });
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [pos]);

  // ── Resize (bottom-right corner handle) ───────────────
  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: size.w, startH: size.h };

    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const dw = ev.clientX - resizeRef.current.startX;
      const dh = ev.clientY - resizeRef.current.startY;
      setSize({
        w: Math.min(MAX_W, Math.max(MIN_W, resizeRef.current.startW + dw)),
        h: Math.min(MAX_H, Math.max(MIN_H, resizeRef.current.startH + dh)),
      });
    };
    const onUp = () => {
      resizeRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [size]);

  if (!booking) return null;

  const Icon = ICON_MAP[booking.type] ?? Ticket;
  const cfg = STATUS_CFG[booking.status];
  const startDate = new Date(booking.start_time);
  const endDate = booking.end_time ? new Date(booking.end_time) : null;

  const panelW = expanded ? 480 : size.w;
  const panelH = expanded ? 520 : size.h;

  return (
    <AnimatePresence>
      <motion.div
        key={booking.id}
        ref={panelRef}
        initial={{ opacity: 0, scale: 0.92, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: -10 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          top: pos.y,
          left: pos.x,
          width: panelW,
          height: panelH,
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(10, 14, 26, 0.96)',
          border: `1px solid ${cfg.border}`,
          borderRadius: 16,
          boxShadow: `0 0 0 1px ${cfg.border}, 0 20px 60px rgba(0,0,0,0.6), 0 0 30px ${cfg.color}18`,
          backdropFilter: 'blur(20px)',
          overflow: 'hidden',
          userSelect: dragRef.current ? 'none' : 'auto',
        }}
      >
        {/* ── Drag handle / header ─── */}
        <div
          onMouseDown={onDragStart}
          style={{
            cursor: 'move',
            padding: '10px 12px 8px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          {/* Drag dots */}
          <GripHorizontal style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />

          {/* Icon + title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, background: cfg.bg, display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Icon style={{ width: 14, height: 14, color: cfg.color }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {booking.title}
              </p>
              <p style={{ fontSize: 9, color: '#94a3b8', textTransform: 'capitalize' }}>{booking.type}</p>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setExpanded(v => !v)}
              style={{
                width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center',
                justifyContent: 'center', background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', color: '#94a3b8',
                transition: 'all 0.15s',
              }}
              title={expanded ? 'Shrink' : 'Expand'}
            >
              {expanded
                ? <Minimize2 style={{ width: 12, height: 12 }} />
                : <Maximize2 style={{ width: 12, height: 12 }} />
              }
            </button>
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={onClose}
              style={{
                width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center',
                justifyContent: 'center', background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer', color: '#ef4444',
                transition: 'all 0.15s',
              }}
              title="Close"
            >
              <X style={{ width: 12, height: 12 }} />
            </button>
          </div>
        </div>

        {/* ── Status badge ─── */}
        <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
            padding: '4px 10px', borderRadius: 20,
            background: cfg.bg, color: cfg.color,
            border: `1px solid ${cfg.border}`,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />
            {cfg.label}
          </span>
        </div>

        {/* ── Details ─── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {booking.location && (
            <Row icon={MapPin} label="Location" value={booking.location} color={cfg.color} />
          )}
          <Row icon={Clock} label="Departure" value={fmt(booking.start_time)} color={cfg.color} />
          {endDate && (
            <Row icon={Clock} label="Arrival" value={fmt(endDate.toISOString())} color={cfg.color} />
          )}
          <Row icon={Users} label="Traveler" value={(booking as any).traveler_name || 'Alex Morgan'} color={cfg.color} />
          <Row icon={IndianRupee} label="Cost" value={formatCurrency(booking.cost)} color={cfg.color} />
          <Row icon={Shield} label="Refund" value={`${booking.refund_percent}%`} color={cfg.color} />

          {booking.cancellation_policy && (
            <div style={{
              marginTop: 4, padding: '10px 12px', borderRadius: 10,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
                Cancellation Policy
              </p>
              <p style={{ fontSize: 11, color: 'rgba(241,245,249,0.75)', lineHeight: 1.6 }}>
                {booking.cancellation_policy}
              </p>
            </div>
          )}
        </div>

        {/* ── Resize handle (bottom-right corner) ─── */}
        {!expanded && (
          <div
            onMouseDown={onResizeStart}
            style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 20, height: 20, cursor: 'se-resize',
              display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
              padding: 4,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1 9L9 1M5 9L9 5M9 9L9 9" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function Row({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <div style={{ width: 26, height: 26, borderRadius: 7, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon style={{ width: 12, height: 12, color }} />
      </div>
      <div>
        <p style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>{label}</p>
        <p style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 500 }}>{value}</p>
      </div>
    </div>
  );
}
