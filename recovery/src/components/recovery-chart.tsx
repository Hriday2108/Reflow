'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from 'recharts';
import type { RecoveryOption } from '@/types';

const COLORS = ['#6366f1', '#10b981', '#f59e0b'];
const LABELS = ['Option A', 'Option B', 'Option C'];

interface RecoveryChartProps {
  options: RecoveryOption[];
}

export default function RecoveryChart({ options }: RecoveryChartProps) {
  if (options.length === 0) return null;

  // Bar chart data
  const barData = [
    {
      metric: 'Cost ($)',
      ...Object.fromEntries(
        options.map((opt, i) => [LABELS[i], Math.abs(opt.cost_delta)])
      ),
    },
    {
      metric: 'Time (min)',
      ...Object.fromEntries(
        options.map((opt, i) => [LABELS[i], opt.time_delta_minutes])
      ),
    },
    {
      metric: 'Impact (%)',
      ...Object.fromEntries(
        options.map((opt, i) => [LABELS[i], opt.percent_itinerary_affected])
      ),
    },
  ];

  // Radar chart data
  const radarData = [
    {
      subject: 'Cost Efficiency',
      ...Object.fromEntries(
        options.map((opt, i) => [
          LABELS[i],
          opt.cost_delta <= 0 ? 5 : Math.max(1, 5 - Math.floor(opt.cost_delta / 30)),
        ])
      ),
    },
    {
      subject: 'Speed',
      ...Object.fromEntries(
        options.map((opt, i) => [
          LABELS[i],
          Math.max(1, 5 - Math.floor(opt.time_delta_minutes / 60)),
        ])
      ),
    },
    {
      subject: 'Convenience',
      ...Object.fromEntries(
        options.map((opt, i) => [LABELS[i], opt.convenience_score])
      ),
    },
    {
      subject: 'Min. Disruption',
      ...Object.fromEntries(
        options.map((opt, i) => [
          LABELS[i],
          Math.max(1, 5 - Math.floor(opt.percent_itinerary_affected / 20)),
        ])
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Bar Chart */}
      <div className="h-[160px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.02 264 / 0.3)" />
            <XAxis
              dataKey="metric"
              tick={{ fontSize: 11, fill: 'oklch(0.6 0.02 264)' }}
              axisLine={{ stroke: 'oklch(0.3 0.02 264 / 0.3)' }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'oklch(0.6 0.02 264)' }}
              axisLine={{ stroke: 'oklch(0.3 0.02 264 / 0.3)' }}
            />
            <Tooltip
              contentStyle={{
                background: 'oklch(0.17 0.015 264)',
                border: '1px solid oklch(1 0 0 / 0.1)',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'oklch(0.96 0.005 264)',
              }}
            />
            {options.map((_, i) => (
              <Bar key={LABELS[i]} dataKey={LABELS[i]} radius={[4, 4, 0, 0]}>
                {barData.map((__, idx) => (
                  <Cell key={idx} fill={COLORS[i]} opacity={0.85} />
                ))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Radar Chart */}
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData}>
            <PolarGrid stroke="oklch(0.3 0.02 264 / 0.3)" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fontSize: 10, fill: 'oklch(0.6 0.02 264)' }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 5]}
              tick={{ fontSize: 9, fill: 'oklch(0.5 0.02 264)' }}
            />
            {options.map((_, i) => (
              <Radar
                key={LABELS[i]}
                name={LABELS[i]}
                dataKey={LABELS[i]}
                stroke={COLORS[i]}
                fill={COLORS[i]}
                fillOpacity={0.15}
                strokeWidth={2}
              />
            ))}
            <Legend
              wrapperStyle={{ fontSize: '11px', color: 'oklch(0.6 0.02 264)' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
