'use client';

import { useEffect } from 'react';
import {
  ReactFlow, Background, Controls, Handle, Position, MarkerType,
  useNodesState, useEdgesState, BackgroundVariant, type Node, type Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { Booking, BookingDependency } from '@/types';
import {
  Plane, Train, Hotel, Car, Ticket, CalendarDays
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  flight: Plane, train: Train, hotel: Hotel, transfer: Car, activity: Ticket, event: CalendarDays,
};

const STATUS_STYLE: Record<string, { border: string; glow: string; iconColor: string; badge: string; badgeText: string }> = {
  confirmed:  { border: '#10b981', glow: '0 0 0 1px #10b981, 0 0 12px rgba(16,185,129,0.25)', iconColor: '#10b981', badge: 'rgba(16,185,129,0.2)', badgeText: '#10b981' },
  'at-risk':  { border: '#f59e0b', glow: '0 0 0 1px #f59e0b, 0 0 12px rgba(245,158,11,0.3)',  iconColor: '#f59e0b', badge: 'rgba(245,158,11,0.2)', badgeText: '#f59e0b' },
  disrupted:  { border: '#ef4444', glow: '0 0 0 1px #ef4444, 0 0 12px rgba(239,68,68,0.3)',   iconColor: '#ef4444', badge: 'rgba(239,68,68,0.2)', badgeText: '#ef4444' },
  rebooked:   { border: '#3b82f6', glow: '0 0 0 1px #3b82f6, 0 0 12px rgba(59,130,246,0.25)', iconColor: '#3b82f6', badge: 'rgba(59,130,246,0.2)', badgeText: '#3b82f6' },
  cancelled:  { border: '#6b7280', glow: '0 0 0 1px #6b7280',                                  iconColor: '#6b7280', badge: 'rgba(107,114,128,0.2)', badgeText: '#9ca3af' },
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function BookingNode({ data, selected }: any) {
  const b: Booking = data.booking;
  const style = STATUS_STYLE[b.status] ?? STATUS_STYLE.confirmed;
  const Icon = ICON_MAP[b.type] ?? Ticket;
  const isTargetMode = data.isTargetSelectionActive;
  const isSelectable = data.isSelectable;

  const nodeStyle: React.CSSProperties = {
    background: selected ? 'rgba(59,130,246,0.12)' : 'rgba(13,17,30,0.95)',
    border: `1px solid ${selected ? '#3b82f6' : style.border}`,
    boxShadow: selected ? '0 0 0 2px rgba(59,130,246,0.5), 0 0 20px rgba(59,130,246,0.2)' : style.glow,
    borderRadius: 12,
    padding: '10px 12px',
    width: 200,
    cursor: isTargetMode ? (isSelectable ? 'crosshair' : 'not-allowed') : 'pointer',
    opacity: isTargetMode && !isSelectable ? 0.35 : 1,
    transition: 'all 0.2s ease',
    animation: isTargetMode && isSelectable ? 'targetPulse 1.5s ease-in-out infinite' : 'none',
  };

  const handleClick = () => {
    if (isTargetMode && isSelectable) {
      data.onConfirmTarget(b);
    } else if (!isTargetMode) {
      data.onSelect(b);
    }
  };

  return (
    <div style={nodeStyle} onClick={handleClick}>
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: style.border, width: 8, height: 8, border: 'none' }}
      />

      {/* Top row: icon + type + status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Icon style={{ width: 12, height: 12, color: style.iconColor }} />
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: style.iconColor }}>
            {b.type}
          </span>
        </div>
        <span style={{
          fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
          background: style.badge, color: style.badgeText, borderRadius: 4,
          padding: '2px 5px',
        }}>
          {b.status.replace('-', ' ')}
        </span>
      </div>

      {/* Title */}
      <p style={{ fontSize: 11, fontWeight: 600, color: '#f1f5f9', marginBottom: 4, lineHeight: 1.3,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {b.title}
      </p>

      {/* Date */}
      <p style={{ fontSize: 9, color: '#94a3b8', marginBottom: 4 }}>
        {formatDateTime(b.start_time)}
      </p>

      {/* Cost */}
      <p style={{ fontSize: 10, fontWeight: 700, color: style.iconColor }}>
        ${Number(b.cost).toLocaleString()}
      </p>

      <Handle
        type="source"
        position={Position.Right}
        style={{ background: style.border, width: 8, height: 8, border: 'none' }}
      />
    </div>
  );
}

const nodeTypes = { bookingNode: BookingNode };

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
          onSelect: onSelectBooking,
          isTargetSelectionActive,
          isSelectable: selectableBookingIds.includes(b.id),
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
