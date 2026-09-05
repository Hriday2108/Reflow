'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, AlertTriangle, Info, CheckCircle2, Clock,
  X, ExternalLink, ShieldAlert, Tag, Zap,
} from 'lucide-react';
import type { Booking, DisruptionEvent } from '@/types';

interface AlertsViewProps {
  disruptions: DisruptionEvent[];
  bookings: Booking[];
  onNavigate?: (view: 'recovery') => void;
}

type AlertTab = 'all' | 'unread' | 'alerts' | 'updates';

interface AlertItem {
  id: string;
  type: 'alert' | 'update';
  icon: React.ElementType;
  iconColor: string;
  bg: string;
  border: string;
  title: string;
  description: string;
  detail: string; // full detail shown in modal
  time: string;
  unread: boolean;
  severity?: string;
  affectedBooking?: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#ef4444',
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#10b981',
};

export default function AlertsView({ disruptions, bookings, onNavigate }: AlertsViewProps) {
  const [tab, setTab] = useState<AlertTab>('all');
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);

  const allAlerts: AlertItem[] = useMemo(() => {
    const disruptionAlerts: AlertItem[] = disruptions.map((d) => {
      const b = bookings.find((bk) => bk.id === d.booking_id);
      return {
        id: d.id,
        type: 'alert',
        icon: AlertTriangle,
        iconColor: SEVERITY_COLOR[d.severity] ?? '#ef4444',
        bg: 'bg-disrupted/8',
        border: 'border-disrupted/25',
        title: `${b?.title ?? 'Booking'} — ${d.type.replace(/-/g, ' ')}`,
        description: d.description ?? `${d.type} · ${d.severity} severity`,
        detail: d.description
          ? `${d.description}\n\nThis disruption was detected and logged automatically by the system. The affected booking "${b?.title ?? 'Unknown'}" has been flagged as ${d.severity} severity. Please visit the Recovery Plans page to review and apply a resolution strategy.`
          : `A ${d.type.replace(/-/g, ' ')} event has been detected on "${b?.title ?? 'Unknown'}" with ${d.severity} severity. This may affect downstream bookings in your itinerary. Visit the Recovery Plans page to resolve this disruption.`,
        time: d.created_at,
        unread: true,
        severity: d.severity,
        affectedBooking: b?.title,
      };
    });

    const systemAlerts: AlertItem[] = [
      {
        id: 'sys-1',
        type: 'update',
        icon: CheckCircle2,
        iconColor: '#10b981',
        bg: 'bg-confirmed/8',
        border: 'border-confirmed/25',
        title: 'Itinerary loaded successfully',
        description: `${bookings.length} bookings synced from the database`,
        detail: `Your trip itinerary has been successfully loaded. A total of ${bookings.length} bookings are currently synced and up-to-date. All departure times, hotel check-ins, and transfer schedules are reflected in real time.`,
        time: new Date(Date.now() - 5 * 60000).toISOString(),
        unread: false,
      },
      {
        id: 'sys-2',
        type: 'update',
        icon: ShieldAlert,
        iconColor: '#60a5fa',
        bg: 'bg-rebooked/8',
        border: 'border-rebooked/25',
        title: 'Risk Monitor is actively scanning',
        description: 'Proactive risk detection is running on your itinerary',
        detail: 'The Proactive Risk Monitor is continuously analyzing your itinerary for tight connections, non-refundable bookings, and potential cascade effects. Any detected risks will be shown on the Risk Monitor page in real time.',
        time: new Date(Date.now() - 2 * 60000).toISOString(),
        unread: false,
      },
    ];

    return [...disruptionAlerts, ...systemAlerts].sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
    );
  }, [disruptions, bookings]);

  const filtered = useMemo(() => {
    if (tab === 'all') return allAlerts;
    if (tab === 'unread') return allAlerts.filter((a) => a.unread && !readIds.has(a.id));
    if (tab === 'alerts') return allAlerts.filter((a) => a.type === 'alert');
    return allAlerts.filter((a) => a.type === 'update');
  }, [tab, allAlerts, readIds]);

  const unreadCount = allAlerts.filter((a) => a.unread && !readIds.has(a.id)).length;

  const TABS: { id: AlertTab; label: string; count?: number }[] = [
    { id: 'all',     label: 'All',     count: allAlerts.length },
    { id: 'unread',  label: 'Unread',  count: unreadCount },
    { id: 'alerts',  label: 'Alerts',  count: allAlerts.filter(a => a.type === 'alert').length },
    { id: 'updates', label: 'Updates', count: allAlerts.filter(a => a.type === 'update').length },
  ];

  const handleAlertClick = (alert: AlertItem) => {
    setSelectedAlert(alert);
    // Mark as read
    if (alert.unread) {
      setReadIds(prev => new Set([...prev, alert.id]));
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-5 max-w-3xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Bell className="w-5 h-5" style={{ color: '#818cf8' }} />
              Alerts &amp; Notifications
              {unreadCount > 0 && (
                <span
                  className="text-[11px] px-2 py-0.5 rounded-full font-bold"
                  style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
                >
                  {unreadCount} unread
                </span>
              )}
            </h2>
            {unreadCount > 0 && (
              <button
                onClick={() => setReadIds(new Set(allAlerts.map(a => a.id)))}
                className="text-xs transition-colors"
                style={{ color: '#818cf8' }}
              >
                Mark all as read
              </button>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Click any alert to view full details.
          </p>
        </motion.div>

        {/* Tabs — reference pill style */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as AlertTab)}
              className={`tab-pill flex items-center gap-1.5 ${tab === t.id ? 'tab-pill-active' : 'tab-pill-inactive'}`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span
                  className="text-[9px] font-black px-1 py-0.5 rounded min-w-[16px] text-center"
                  style={tab === t.id
                    ? { background: 'rgba(99,102,241,0.3)', color: '#a5b4fc' }
                    : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)' }
                  }
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Alerts list */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {filtered.length === 0 ? (
              <div className="glass-card rounded-2xl p-12 text-center">
                <CheckCircle2 className="w-10 h-10 text-confirmed mx-auto mb-3 opacity-60" />
                <p className="text-sm text-muted-foreground">No notifications in this category</p>
              </div>
            ) : (
              filtered.map((alert, idx) => {
                const Icon = alert.icon;
                const isRead = readIds.has(alert.id) || !alert.unread;
                return (
                  <motion.button
                    key={alert.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.06 }}
                    onClick={() => handleAlertClick(alert)}
                    className={`w-full text-left glass-card rounded-xl p-4 border ${alert.border} transition-all hover:scale-[1.01] hover:shadow-lg hover:border-white/20 active:scale-[0.99] cursor-pointer ${
                      !isRead ? 'ring-1 ring-inset ring-white/5' : 'opacity-75'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: alert.iconColor + '20' }}
                      >
                        <Icon style={{ color: alert.iconColor, width: 18, height: 18 }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-sm font-semibold leading-snug">{alert.title}</p>
                          {!isRead && (
                            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          {alert.description}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-muted-foreground/50" />
                            <span className="text-[10px] text-muted-foreground">{timeAgo(alert.time)}</span>
                          </div>
                          {alert.severity && (
                            <span
                              className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                              style={{ backgroundColor: alert.iconColor + '20', color: alert.iconColor }}
                            >
                              {alert.severity}
                            </span>
                          )}
                          <span className="text-[10px] text-primary/60 ml-auto">
                            Click to view →
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                );
              })
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Alert Detail Modal */}
      <AnimatePresence>
        {selectedAlert && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAlert(null)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`relative w-full max-w-lg glass-card rounded-2xl overflow-hidden shadow-2xl border ${selectedAlert.border}`}
            >
              {/* Accent bar */}
              <div className="h-1 w-full" style={{ backgroundColor: selectedAlert.iconColor }} />

              {/* Header */}
              <div className="p-5 border-b border-white/5 flex items-start justify-between bg-black/20">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: selectedAlert.iconColor + '20' }}
                  >
                    <selectedAlert.icon style={{ color: selectedAlert.iconColor, width: 20, height: 20 }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base leading-tight">{selectedAlert.title}</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{formatDate(selectedAlert.time)}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="p-2 -mr-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5">
                {selectedAlert.severity && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">Severity</span>
                    <span
                      className="text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: selectedAlert.iconColor + '25', color: selectedAlert.iconColor }}
                    >
                      {selectedAlert.severity}
                    </span>
                    {selectedAlert.affectedBooking && (
                      <>
                        <span className="text-xs text-muted-foreground">Affected</span>
                        <span className="text-xs font-medium text-foreground truncate">{selectedAlert.affectedBooking}</span>
                      </>
                    )}
                  </div>
                )}

                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Details</h4>
                  <p className="text-sm leading-relaxed whitespace-pre-line">{selectedAlert.detail}</p>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-white/5 bg-black/20 flex justify-end gap-3">
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Close
                </button>
                {selectedAlert.type === 'alert' && onNavigate && (
                  <button
                    onClick={() => {
                      setSelectedAlert(null);
                      onNavigate('recovery');
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
                  >
                    <Zap className="w-4 h-4" />
                    View Recovery Plans
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
