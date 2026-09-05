'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

// ── Types ────────────────────────────────────────────────

export type Priority = 'lowest-cost' | 'minimum-disruption' | 'fastest-arrival' | 'best-convenience';

export interface TransportPrefs {
  flights: boolean;
  trains: boolean;
  transfers: boolean;
  taxis: boolean;
}

export interface AvoidPrefs {
  longLayovers: boolean;
  overnightTravel: boolean;
  multipleChanges: boolean;
}

export interface UserPreferences {
  priority: Priority;
  maxCost: number;
  transport: TransportPrefs;
  avoid: AvoidPrefs;
}

// ── Defaults ─────────────────────────────────────────────

const DEFAULT_PREFERENCES: UserPreferences = {
  priority: 'minimum-disruption',
  maxCost: 10000,
  transport: { flights: true, trains: true, transfers: true, taxis: false },
  avoid: { longLayovers: true, overnightTravel: false, multipleChanges: true },
};

const STORAGE_KEY = 'recovery-user-preferences';

// ── Context ──────────────────────────────────────────────

interface PreferencesContextValue {
  preferences: UserPreferences;
  setPreferences: (prefs: UserPreferences) => void;
  updatePreferences: (partial: Partial<UserPreferences>) => void;
  resetPreferences: () => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferencesState] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<UserPreferences>;
        setPreferencesState((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // Ignore parse errors, use defaults
    }
    setLoaded(true);
  }, []);

  // Persist to localStorage whenever preferences change (after initial load)
  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    }
  }, [preferences, loaded]);

  const setPreferences = useCallback((prefs: UserPreferences) => {
    setPreferencesState(prefs);
  }, []);

  const updatePreferences = useCallback((partial: Partial<UserPreferences>) => {
    setPreferencesState((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferencesState(DEFAULT_PREFERENCES);
  }, []);

  return (
    <PreferencesContext.Provider value={{ preferences, setPreferences, updatePreferences, resetPreferences }}>
      {children}
    </PreferencesContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within a PreferencesProvider');
  return ctx;
}
