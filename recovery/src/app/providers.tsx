'use client';

import { PreferencesProvider } from '@/context/preferences-context';
import type { ReactNode } from 'react';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <PreferencesProvider>
      {children}
    </PreferencesProvider>
  );
}
