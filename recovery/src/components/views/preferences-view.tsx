'use client';

import { motion } from 'framer-motion';
import { SlidersHorizontal, Check, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { usePreferences, type Priority } from '@/context/preferences-context';
import { formatCurrency } from '@/lib/utils';

export default function PreferencesView() {
  const { preferences, updatePreferences, resetPreferences } = usePreferences();
  const { priority, maxCost, transport, avoid } = preferences;

  const handleSave = () => {
    // Preferences are already auto-saved to localStorage via context.
    // This button acts as explicit user confirmation.
    toast.success('Preferences saved!', {
      description: 'Recovery plans will now be sorted and filtered based on your preferences.',
    });
  };

  const handleReset = () => {
    resetPreferences();
    toast.info('Preferences reset to defaults.');
  };

  const PRIORITIES: { id: Priority; label: string; desc: string }[] = [
    { id: 'lowest-cost',        label: 'Lowest Cost',        desc: 'Sort recovery plans by lowest additional spend first' },
    { id: 'minimum-disruption', label: 'Minimum Disruption', desc: 'Sort by fewest itinerary changes — preserve your original plan' },
    { id: 'fastest-arrival',    label: 'Fastest Arrival',    desc: 'Sort by shortest time impact — reach your destination fastest' },
    { id: 'best-convenience',   label: 'Best Convenience',   desc: 'Sort by highest comfort & convenience rating' },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-6 max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-primary" />
            Recovery Preferences
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Customize how recovery plans are sorted, filtered, and ranked.
            Changes take effect immediately on the Recovery Plans page.
          </p>
        </motion.div>

        {/* Active indicator */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-confirmed/10 border border-confirmed/20">
          <div className="w-2 h-2 rounded-full bg-confirmed animate-pulse" />
          <p className="text-xs text-confirmed font-medium">
            Preferences are live — recovery plans are actively sorted by <span className="font-bold capitalize">{priority.replace(/-/g, ' ')}</span> with
            a {formatCurrency(maxCost)} budget cap.
          </p>
        </motion.div>

        {/* Priority */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl p-5">
          <p className="text-sm font-semibold mb-1">Priority Preference</p>
          <p className="text-xs text-muted-foreground mb-4">Controls how recovery plans are sorted — the top plan will best match your priority.</p>
          <div className="space-y-2.5">
            {PRIORITIES.map((p) => (
              <button
                key={p.id}
                onClick={() => updatePreferences({ priority: p.id })}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                  priority === p.id
                    ? 'border-primary/50 bg-primary/10'
                    : 'border-border/40 hover:border-border/80 hover:bg-accent/30'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  priority === p.id ? 'border-primary' : 'border-muted-foreground/40'
                }`}>
                  {priority === p.id && <div className="w-2 h-2 rounded-full bg-primary" />}
                </div>
                <div>
                  <p className="text-sm font-medium">{p.label}</p>
                  <p className="text-xs text-muted-foreground">{p.desc}</p>
                </div>
                {priority === p.id && (
                  <Check className="w-4 h-4 text-primary ml-auto flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Max cost */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold">Maximum Additional Cost</p>
            <span className="text-lg font-bold gradient-text-blue">
              {formatCurrency(maxCost)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Plans exceeding this budget will be flagged with a warning badge.</p>
          <input
            type="range"
            min="0"
            max="50000"
            step="500"
            value={maxCost}
            onChange={(e) => updatePreferences({ maxCost: Number(e.target.value) })}
            className="w-full h-2 rounded-full accent-primary cursor-pointer"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>{formatCurrency(0)}</span>
            <span>{formatCurrency(50000)}</span>
          </div>
        </motion.div>

        {/* Transport */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="glass-card rounded-2xl p-5">
          <p className="text-sm font-semibold mb-1">Preferred Transport</p>
          <p className="text-xs text-muted-foreground mb-4">Toggle which transport modes you&apos;re open to in recovery plans.</p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(transport) as (keyof typeof transport)[]).map((key) => (
              <button
                key={key}
                onClick={() => updatePreferences({ transport: { ...transport, [key]: !transport[key] } })}
                className={`flex items-center gap-2 p-3 rounded-xl border text-left text-sm transition-all capitalize ${
                  transport[key]
                    ? 'border-primary/50 bg-primary/10 text-primary'
                    : 'border-border/40 text-muted-foreground hover:border-border/80'
                }`}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                  transport[key] ? 'bg-primary border-primary' : 'border-muted-foreground/40'
                }`}>
                  {transport[key] && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                </div>
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Avoid */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="glass-card rounded-2xl p-5">
          <p className="text-sm font-semibold mb-1">Avoid</p>
          <p className="text-xs text-muted-foreground mb-4">Flag recovery plans that include these inconveniences.</p>
          <div className="space-y-2">
            {[
              { key: 'longLayovers'    as const, label: 'Long Layovers', desc: 'Connections over 3 hours' },
              { key: 'overnightTravel' as const, label: 'Overnight Travel', desc: 'Avoid travel between 11pm–6am' },
              { key: 'multipleChanges' as const, label: 'Multiple Changes', desc: 'Prefer direct routes' },
            ].map(({ key, label, desc }) => (
              <button
                key={key}
                onClick={() => updatePreferences({ avoid: { ...avoid, [key]: !avoid[key] } })}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                  avoid[key]
                    ? 'border-disrupted/40 bg-disrupted/8'
                    : 'border-border/40 hover:border-border/80 hover:bg-accent/30'
                }`}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                  avoid[key] ? 'bg-disrupted border-disrupted' : 'border-muted-foreground/40'
                }`}>
                  {avoid[key] && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Action buttons */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all glow-blue shadow-lg shadow-primary/20"
          >
            <Save className="w-4 h-4" />
            Save Preferences
          </button>
          <button
            onClick={handleReset}
            className="flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl border border-border/60 text-muted-foreground font-medium text-sm hover:text-foreground hover:bg-accent/30 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </motion.div>
      </div>
    </div>
  );
}
