'use client';

import { cn } from '@/lib/utils';
import type { BookingStatus } from '@/types';

const STATUS_CONFIG: Record<BookingStatus, {
  label: string;
  dot: string;
  text: string;
  bg: string;
  border: string;
  pulse?: string;
}> = {
  confirmed: {
    label: 'Confirmed',
    dot: 'bg-confirmed',
    text: 'text-confirmed',
    bg: 'bg-confirmed/10',
    border: 'border-confirmed/30',
    pulse: 'animate-confirmed-pulse',
  },
  'at-risk': {
    label: 'At Risk',
    dot: 'bg-at-risk',
    text: 'text-at-risk',
    bg: 'bg-at-risk/10',
    border: 'border-at-risk/30',
    pulse: 'animate-amber-pulse',
  },
  disrupted: {
    label: 'Disrupted',
    dot: 'bg-disrupted',
    text: 'text-disrupted',
    bg: 'bg-disrupted/10',
    border: 'border-disrupted/30',
    pulse: 'animate-ripple',
  },
  rebooked: {
    label: 'Rebooked',
    dot: 'bg-rebooked',
    text: 'text-rebooked',
    bg: 'bg-rebooked/10',
    border: 'border-rebooked/30',
  },
  cancelled: {
    label: 'Cancelled',
    dot: 'bg-cancelled',
    text: 'text-cancelled',
    bg: 'bg-cancelled/10',
    border: 'border-cancelled/30',
  },
};

interface StatusBadgeProps {
  status: BookingStatus;
  size?: 'xs' | 'sm' | 'md';
  showPulse?: boolean;
  className?: string;
}

export default function StatusBadge({
  status,
  size = 'sm',
  showPulse = false,
  className,
}: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status];

  const sizeClasses = {
    xs: 'text-[9px] px-1.5 py-0.5 gap-1',
    sm: 'text-[10px] px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-2',
  };

  const dotSizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold border uppercase tracking-wider',
        cfg.bg,
        cfg.text,
        cfg.border,
        sizeClasses[size],
        className
      )}
    >
      <span
        className={cn(
          'rounded-full flex-shrink-0',
          cfg.dot,
          dotSizes[size],
          showPulse && cfg.pulse
        )}
      />
      {cfg.label}
    </span>
  );
}
