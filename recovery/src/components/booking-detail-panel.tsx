'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import type { Booking, BookingStatus } from '@/types';
import {
  Plane,
  Train,
  Hotel,
  Car,
  Ticket,
  CalendarDays,
  Clock,
  MapPin,
  DollarSign,
  Shield,
  X,
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  flight: Plane,
  train: Train,
  hotel: Hotel,
  transfer: Car,
  activity: Ticket,
  event: CalendarDays,
};

const statusConfig: Record<BookingStatus, { label: string; color: string; bgColor: string }> = {
  confirmed: { label: 'Confirmed', color: 'text-confirmed', bgColor: 'bg-confirmed/15' },
  'at-risk': { label: 'At Risk', color: 'text-at-risk', bgColor: 'bg-at-risk/15' },
  disrupted: { label: 'Disrupted', color: 'text-disrupted', bgColor: 'bg-disrupted/15' },
  rebooked: { label: 'Rebooked', color: 'text-rebooked', bgColor: 'bg-rebooked/15' },
  cancelled: { label: 'Cancelled', color: 'text-cancelled', bgColor: 'bg-cancelled/15' },
};

interface BookingDetailPanelProps {
  booking: Booking | null;
  onClose: () => void;
}

export default function BookingDetailPanel({ booking, onClose }: BookingDetailPanelProps) {
  if (!booking) return null;

  const Icon = iconMap[booking.type] || CalendarDays;
  const status = statusConfig[booking.status];
  const startDate = new Date(booking.start_time);
  const endDate = booking.end_time ? new Date(booking.end_time) : null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={booking.id}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.25 }}
      >
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-xl">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${status.bgColor}`}>
                  <Icon className={`w-5 h-5 ${status.color}`} />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold leading-tight">
                    {booking.title}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5 capitalize">{booking.type}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <ScrollArea className="h-auto max-h-[500px]">
              {/* Status */}
              <div className="mb-4">
                <Badge className={`${status.color} ${status.bgColor} border-0 font-semibold`}>
                  {status.label}
                </Badge>
              </div>

              <Separator className="mb-4" />

              {/* Details grid */}
              <div className="space-y-3">
                {booking.location && (
                  <DetailRow icon={MapPin} label="Location" value={booking.location} />
                )}
                <DetailRow
                  icon={Clock}
                  label="Start"
                  value={startDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                />
                {endDate && (
                  <DetailRow
                    icon={Clock}
                    label="End"
                    value={endDate.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  />
                )}
                <DetailRow
                  icon={DollarSign}
                  label="Cost"
                  value={`$${Number(booking.cost).toFixed(2)}`}
                />
                <DetailRow
                  icon={Shield}
                  label="Refund"
                  value={`${booking.refund_percent}%`}
                />
              </div>

              {booking.cancellation_policy && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                      Cancellation Policy
                    </p>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {booking.cancellation_policy}
                    </p>
                  </div>
                </>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p className="text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}
