'use client';

import { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeTypes,
  MarkerType,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import BookingNodeComponent from './booking-node';
import type { Booking, BookingDependency, BookingStatus } from '@/types';

// ── Edge status color map ────────────────────────────────

const edgeStatusColor: Record<BookingStatus, string> = {
  confirmed: '#10b981',
  'at-risk': '#f59e0b',
  disrupted: '#ef4444',
  rebooked: '#3b82f6',
  cancelled: '#6b7280',
};

// ── Node types ───────────────────────────────────────────

const nodeTypes: NodeTypes = {
  booking: BookingNodeComponent,
};

// ── Props ────────────────────────────────────────────────

interface ItineraryGraphProps {
  bookings: Booking[];
  dependencies: BookingDependency[];
  selectedBookingId: string | null;
  onSelectBooking: (booking: Booking) => void;
  selectableBookingIds?: string[];
  isTargetSelectionActive?: boolean;
  onConfirmTarget?: (booking: Booking) => void;
}

// ── Component ────────────────────────────────────────────

export default function ItineraryGraph({
  bookings,
  dependencies,
  selectedBookingId,
  onSelectBooking,
  selectableBookingIds = [],
  isTargetSelectionActive = false,
  onConfirmTarget,
}: ItineraryGraphProps) {
  const handleSelect = useCallback(
    (booking: Booking) => {
      if (isTargetSelectionActive) {
        if (selectableBookingIds.includes(booking.id)) {
          onConfirmTarget?.(booking);
        }
        return;
      }
      onSelectBooking(booking);
    },
    [isTargetSelectionActive, selectableBookingIds, onConfirmTarget, onSelectBooking]
  );

  // Convert bookings to React Flow nodes
  const nodes: Node[] = useMemo(() => {
    return bookings.map((booking) => {
      const isSelectableTarget = Boolean(
        isTargetSelectionActive && selectableBookingIds.includes(booking.id)
      );
      return {
        id: booking.id,
        type: 'booking',
        position: booking.position || { x: 0, y: 0 },
        data: {
          booking,
          isSelected: !isTargetSelectionActive && booking.id === selectedBookingId,
          onSelect: handleSelect,
          isSelectableTarget,
          isTargetSelectionActive,
        },
        draggable: !isTargetSelectionActive,
      };
    });
  }, [bookings, selectedBookingId, handleSelect, isTargetSelectionActive, selectableBookingIds]);

  // Convert dependencies to React Flow edges
  const edges: Edge[] = useMemo(() => {
    return dependencies.map((dep) => {
      const toBooking = bookings.find((b) => b.id === dep.to_booking_id);
      const fromBooking = bookings.find((b) => b.id === dep.from_booking_id);
      const toStatus = toBooking?.status || 'confirmed';
      const fromStatus = fromBooking?.status || 'confirmed';

      // Edge takes the "worst" status of either end
      let edgeStatus: BookingStatus = 'confirmed';
      if (fromStatus === 'disrupted' || toStatus === 'disrupted') edgeStatus = 'disrupted';
      else if (fromStatus === 'at-risk' || toStatus === 'at-risk') edgeStatus = 'at-risk';
      else if (fromStatus === 'cancelled' || toStatus === 'cancelled') edgeStatus = 'cancelled';
      else if (fromStatus === 'rebooked' || toStatus === 'rebooked') edgeStatus = 'rebooked';

      return {
        id: dep.id,
        source: dep.from_booking_id,
        target: dep.to_booking_id,
        type: 'smoothstep',
        animated: !isTargetSelectionActive && (edgeStatus === 'disrupted' || edgeStatus === 'at-risk'),
        style: {
          stroke: edgeStatusColor[edgeStatus],
          strokeWidth: 2.5,
          opacity: isTargetSelectionActive ? 0.15 : edgeStatus === 'cancelled' ? 0.3 : 0.7,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edgeStatusColor[edgeStatus],
          width: 18,
          height: 18,
        },
      };
    });
  }, [dependencies, bookings, isTargetSelectionActive]);

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-border/50 bg-card/30">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.7 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          className="!bg-transparent"
          color="oklch(0.4 0.02 264 / 0.3)"
        />
        <Controls
          className="!bg-card !border-border !rounded-lg !shadow-lg [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground [&>button:hover]:!bg-accent"
          showInteractive={false}
        />
      </ReactFlow>
    </div>
  );
}
