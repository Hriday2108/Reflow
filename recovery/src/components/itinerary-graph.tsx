'use client';

import { useEffect } from 'react';
import {
  ReactFlow, Background, Controls, Handle, Position, MarkerType,
  useNodesState, useEdgesState, BackgroundVariant, type Node, type Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { Booking, BookingDependency } from '@/types';
import BookingNodeComponent from './booking-node';

const nodeTypes = { bookingNode: BookingNodeComponent };

interface ItineraryGraphProps {
  bookings: Booking[];
  dependencies: BookingDependency[];
  selectedBookingId: string | null;
  onSelectBooking: (b: Booking) => void;
  selectableBookingIds?: string[];
  isTargetSelectionActive?: boolean;
  onConfirmTarget?: (b: Booking) => void;
}

export default function ItineraryGraph({
  bookings, dependencies, selectedBookingId, onSelectBooking,
  selectableBookingIds = [], isTargetSelectionActive = false, onConfirmTarget,
}: ItineraryGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    if (!bookings.length) return;

    // Sort by start time
    const sorted = [...bookings].sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    // Group into rows by day
    const rows: Booking[][] = [];
    let currentRow: Booking[] = [];
    let lastDay = '';

    sorted.forEach((b) => {
      const day = new Date(b.start_time).toDateString();
      if (day !== lastDay && currentRow.length >= 4) {
        rows.push(currentRow);
        currentRow = [b];
      } else {
        currentRow.push(b);
      }
      lastDay = day;
    });
    if (currentRow.length) rows.push(currentRow);

    const colGap = 260;
    const rowGap = 170;

    const layoutedNodes: Node[] = rows.flatMap((row, rowIdx) =>
      row.map((b, colIdx) => ({
        id: b.id,
        type: 'bookingNode',
        position: b.position ?? { x: colIdx * colGap + 40, y: rowIdx * rowGap + 40 },
        data: {
          booking: b,
          isSelected: selectedBookingId === b.id,
          onSelect: onSelectBooking,
          isTargetSelectionActive,
          isSelectableTarget: selectableBookingIds.includes(b.id),
          onConfirmTarget,
        },
        selected: selectedBookingId === b.id,
      }))
    );

    const layoutedEdges: Edge[] = dependencies.map((dep) => {
      const fromB = bookings.find((b) => b.id === dep.from_booking_id);
      const isHot = fromB?.status === 'disrupted' || fromB?.status === 'at-risk';
      return {
        id: dep.id,
        source: dep.from_booking_id,
        target: dep.to_booking_id,
        animated: isHot,
        style: { stroke: isHot ? '#f59e0b' : '#10b981', strokeWidth: isHot ? 2 : 1.5, opacity: 0.7 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isHot ? '#f59e0b' : '#10b981',
          width: 16, height: 16,
        },
      };
    });

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [bookings, dependencies, selectedBookingId, isTargetSelectionActive, selectableBookingIds, onSelectBooking, onConfirmTarget, setNodes, setEdges]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <style>{`
        @keyframes targetPulse {
          0%, 100% { box-shadow: 0 0 0 1px #3b82f6, 0 0 12px rgba(59,130,246,0.3); }
          50% { box-shadow: 0 0 0 2px #3b82f6, 0 0 24px rgba(59,130,246,0.6); }
        }
        .react-flow__controls { background: rgba(13,17,30,0.9) !important; border: 1px solid rgba(255,255,255,0.1) !important; border-radius: 12px !important; overflow: hidden; }
        .react-flow__controls-button { background: transparent !important; border-bottom: 1px solid rgba(255,255,255,0.08) !important; color: #94a3b8 !important; fill: #94a3b8 !important; }
        .react-flow__controls-button:hover { background: rgba(59,130,246,0.15) !important; fill: #3b82f6 !important; }
        .react-flow__attribution { display: none; }
      `}</style>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        minZoom={0.15}
        maxZoom={1.8}
        style={{ background: 'transparent' }}
      >
        <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="rgba(255,255,255,0.04)" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
