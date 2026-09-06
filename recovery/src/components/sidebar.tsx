'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  LayoutDashboard,
  Map,
  Zap,
  Wand2,
  ShieldAlert,
  Bell,
  Settings,
  SlidersHorizontal,
  RefreshCw,
  Plane,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Compass,
  CloudLightning,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type SidebarView =
  | 'overview'
  | 'itinerary'
  | 'recovery'
  | 'risk'
  | 'weather'
  | 'alerts'
  | 'preferences';

interface NavItem {
  id: SidebarView;
  label: string;
  icon: React.ElementType;
  badge?: number;
  accent?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview',     label: 'Dashboard',      icon: LayoutDashboard },
  { id: 'itinerary',    label: 'My Trips',        icon: Compass },
  { id: 'recovery',     label: 'Recovery Plans',  icon: Wand2 },
  { id: 'risk',         label: 'Risk Monitor',    icon: ShieldAlert },
  { id: 'weather',      label: 'Weather & Risk',  icon: CloudLightning },
  { id: 'alerts',       label: 'Alerts',          icon: Bell },
  { id: 'preferences',  label: 'Preferences',     icon: SlidersHorizontal },
];

interface AppSidebarProps {
  activeView: SidebarView;
  onViewChange: (view: SidebarView) => void;
  disruptionCount?: number;
  alertCount?: number;
  onReset?: () => void;
  isResetting?: boolean;
  travelerName?: string;
}

export default function AppSidebar({
  activeView,
  onViewChange,
  disruptionCount = 0,
  alertCount = 0,
  onReset,
  isResetting,
  travelerName,
}: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const items = NAV_ITEMS.map((item) => {
    let badge: number | undefined;
    if (item.id === 'alerts' && alertCount > 0) badge = alertCount;
    return { ...item, badge };
  });

  return (
    <motion.aside
      animate={{ width: collapsed ? 60 : 220 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="relative flex-shrink-0 flex flex-col h-full overflow-hidden z-10"
      style={{ background: 'var(--sidebar)', borderRight: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 h-14 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: 'rgba(181, 101, 29, 0.12)',
            border: '1px solid rgba(181, 101, 29, 0.25)',
            boxShadow: '0 0 16px rgba(181, 101, 29, 0.15)',
          }}
        >
          <Plane className="w-4 h-4" style={{ color: '#8b3e17' }} />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              className="text-base font-black tracking-widest gradient-text-blue"
            >
              REFLOW
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden px-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-all duration-200 group relative text-left',
                isActive
                  ? 'text-primary font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              style={isActive ? {
                background: 'rgba(181, 101, 29, 0.15)',
                borderLeft: '3px solid #b5651d',
                paddingLeft: '9px',
              } : undefined}
            >
              <div className="relative flex-shrink-0">
                <Icon
                  className="w-[18px] h-[18px]"
                  style={isActive ? { color: '#b5651d' } : undefined}
                />
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-disrupted text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="text-sm font-medium whitespace-nowrap"
                    style={isActive ? { color: '#8b3e17' } : undefined}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-2 py-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>

        {/* User avatar row */}
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-2.5 py-2 mb-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div className="user-avatar flex-shrink-0">{travelerName ? travelerName.charAt(0).toUpperCase() : 'A'}</div>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate">{travelerName ?? 'Alex Morgan'}</p>
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}
              >
                Premium
              </span>
            </div>
          </div>
        )}

        {onReset && (
          <button
            onClick={onReset}
            disabled={isResetting}
            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-all text-left"
          >
            {isResetting ? (
              <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
            ) : (
              <RefreshCw className="w-4 h-4 flex-shrink-0" />
            )}
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm font-medium whitespace-nowrap"
                >
                  Reset Demo
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        )}

        <Link href="/">
          <button className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-all text-left">
            <Settings className="w-4 h-4 flex-shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm font-medium whitespace-nowrap"
                >
                  Home
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </Link>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute top-1/2 -translate-y-1/2 -right-3 w-6 h-6 rounded-full flex items-center justify-center hover:bg-accent transition-colors z-20"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-muted-foreground" />
        )}
      </button>
    </motion.aside>
  );
}
