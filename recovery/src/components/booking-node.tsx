'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import type { Booking, BookingStatus } from '@/types';
import {
  Plane,
  Train,
  Hotel,
  Car,
  Ticket,
  CalendarDays,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// ── Icon map ─────────────────────────────────────────────

const iconMap: Record<string, React.ElementType> = {
  flight: Plane,
  train: Train,
  hotel: Hotel,
  transfer: Car,
  activity: Ticket,
  event: CalendarDays,
};

// ── Status styling ───────────────────────────────────────

const statusStyles: Record<
  BookingStatus,
  { border: string; bg: string; badge: string; badgeBg: string; glow: string }
> = {
  confirmed: {
    border: 'border-confirmed/60',
    bg: 'bg-confirmed/5',
    badge: 'text-confirmed',
    badgeBg: 'bg-confirmed/15',
    glow: '',
  },
  'at-risk': {
    border: 'border-at-risk/60',
    bg: 'bg-at-risk/5',
    badge: 'text-at-risk',
    badgeBg: 'bg-at-risk/15',
    glow: 'animate-amber-pulse',
  },
  disrupted: {
    border: 'border-disrupted/60',
    bg: 'bg-disrupted/5',
    badge: 'text-disrupted',
    badgeBg: 'bg-disrupted/15',
    glow: 'animate-ripple',
  },
  rebooked: {
    border: 'border-rebooked/60',
    bg: 'bg-rebooked/5',
    badge: 'text-rebooked',
    badgeBg: 'bg-rebooked/15',
    glow: '',
  },
  cancelled: {
    border: 'border-cancelled/60',
    bg: 'bg-cancelled/5',
    badge: 'text-cancelled',
    badgeBg: 'bg-cancelled/15',
    glow: '',
  },
};

const statusLabels: Record<BookingStatus, string> = {
  confirmed: 'Confirmed',
  'at-risk': 'At Risk',
  disrupted: 'Disrupted',
  rebooked: 'Rebooked',
  cancelled: 'Cancelled',
};

// ── Node Data Type ───────────────────────────────────────

type BookingNodeData = {
  booking: Booking;
  isSelected: boolean;
  onSelect: (booking: Booking) => void;
  isSelectableTarget?: boolean;
  isTargetSelectionActive?: boolean;
  onConfirmTarget?: (booking: Booking) => void;
};

// ── Component ────────────────────────────────────────────

function BookingNodeComponent({ data }: NodeProps) {
  const {
    booking,
    isSelected,
    onSelect,
    isSelectableTarget = false,
    isTargetSelectionActive = false,
    onConfirmTarget,
  } = data as unknown as BookingNodeData;
  const Icon = iconMap[booking.type] || CalendarDays;
  const style = statusStyles[booking.status];
  const time = new Date(booking.start_time).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const day = new Date(booking.start_time).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  // Calculate dynamic classes based on selection mode
  const nodeStateClass = isTargetSelectionActive
    ? isSelectableTarget
      ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/70 dark:ring-blue-400/70 ring-offset-2 ring-offset-background scale-[1.04] animate-target-pulse z-20 shadow-lg cursor-pointer hover:scale-[1.06]'
      : 'opacity-35 grayscale-[30%] pointer-events-none transition-all duration-300'
    : `${style.border} ${style.bg} ${style.glow} ${
        isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-105' : ''
      } hover:scale-[1.03] hover:shadow-lg cursor-pointer`;

  return (
    <>
      <Handle type="target" position={Position.Left} className="!bg-border !w-2 !h-2" />
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        onClick={() => {
          if (isTargetSelectionActive) {
            if (isSelectableTarget && onConfirmTarget) onConfirmTarget(booking);
          } else {
            onSelect(booking);
          }
        }}
        className={`
          relative w-[260px] rounded-xl border-2 p-4
          transition-all duration-300 select-none
          ${nodeStateClass}
          bg-card/90 backdrop-blur-sm
        `}
      >
        {/* Select Target Indicator Badge */}
        {isSelectableTarget && (
          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 text-[9px] font-semibold tracking-wide uppercase rounded-full bg-blue-600 text-white shadow-md flex items-center gap-1 z-30 pointer-events-none">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            Target
          </div>
        )}

        {/* Header row */}
        <div className="flex items-start gap-2.5 mb-2">
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${style.badgeBg}`}
          >
            <Icon className={`w-5 h-5 ${style.badge}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold leading-tight truncate text-foreground">
              {booking.title.length > 28
                ? booking.title.substring(0, 28) + '…'
                : booking.title}
            </p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {day} · {time}
            </p>
          </div>
        </div>

        {/* Footer row */}
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-muted-foreground">
            {formatCurrency(booking.cost)}
          </span>
          <Badge
            variant="secondary"
            className={`text-[10px] px-1.5 py-0 h-5 font-semibold ${style.badge} ${style.badgeBg} border-0`}
          >
            {statusLabels[booking.status]}
          </Badge>
        </div>

        {/* Status indicator dot */}
        <div
          className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-card
            ${booking.status === 'confirmed' ? 'bg-confirmed' : ''}
            ${booking.status === 'at-risk' ? 'bg-at-risk' : ''}
            ${booking.status === 'disrupted' ? 'bg-disrupted' : ''}
            ${booking.status === 'rebooked' ? 'bg-rebooked' : ''}
            ${booking.status === 'cancelled' ? 'bg-cancelled' : ''}
          `}
        />
      </motion.div>
      <Handle type="source" position={Position.Right} className="!bg-border !w-2 !h-2" />
    </>
  );
}

export default memo(BookingNodeComponent);
