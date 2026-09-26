'use client';

import { PreferencesProvider } from '@/context/preferences-context';
import { AuthProvider } from '@/context/auth-context';
import AuthModal from '@/components/auth-modal';
import type { ReactNode } from 'react';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <PreferencesProvider>
        {children}
        {/* Global sign-in overlay — rendered once, controlled via auth context */}
        <AuthModal />
      </PreferencesProvider>
    </AuthProvider>
  );
}
