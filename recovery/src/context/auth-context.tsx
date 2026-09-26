'use client';

/**
 * Isolated, additive authentication layer for reFlow.
 *
 * This provider is deliberately self-contained: it only supplies React context
 * and (optionally) opens the global <AuthModal />. It does not alter any existing
 * page layout, styling, or feature. Session state is persisted to localStorage
 * (demo-grade — no server-verified session cookie/JWT).
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  provider: 'local' | 'google';
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isReady: boolean; // localStorage has been read
  isAuthModalOpen: boolean;
  /** Open the sign-in modal. Optionally run a callback once auth succeeds. */
  openAuth: (onSuccess?: () => void) => void;
  closeAuth: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  /** Called by the Google Identity Services credential handler. */
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => void;

  // ── Two-step verification (email OTP) ──
  /** True while the modal should show the OTP entry step. */
  otpStep: boolean;
  /** Email the OTP was sent to. */
  otpEmail: string | null;
  /** Dev-only: the code, when email delivery isn't configured. */
  otpDevCode: string | null;
  verifyOtp: (code: string) => Promise<void>;
  resendOtp: () => Promise<void>;
  cancelOtp: () => void;
}

const STORAGE_KEY = 'reflow.auth.user';
const TRUSTED_PREFIX = 'reflow.auth.trusted.'; // + email → this browser skips OTP

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Decode a Google ID token (JWT) payload client-side — no secret required. */
function decodeGoogleCredential(credential: string): {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
} {
  const payload = credential.split('.')[1];
  const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(decodeURIComponent(escape(json)));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Two-step verification state.
  const [otpStep, setOtpStep] = useState(false);
  const [otpEmail, setOtpEmail] = useState<string | null>(null);
  const [otpDevCode, setOtpDevCode] = useState<string | null>(null);
  const [pendingOtpUser, setPendingOtpUser] = useState<AuthUser | null>(null);

  // Restore session on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      // ignore corrupt storage
    }
    setIsReady(true);
  }, []);

  const persist = useCallback((u: AuthUser | null) => {
    setUser(u);
    try {
      if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore storage failures
    }
  }, []);

  const finishAuth = useCallback(
    (u: AuthUser) => {
      persist(u);
      setOtpStep(false);
      setOtpEmail(null);
      setOtpDevCode(null);
      setPendingOtpUser(null);
      setIsAuthModalOpen(false);
      if (pendingAction) {
        const action = pendingAction;
        setPendingAction(null);
        // Defer so the modal close animation doesn't race the next action.
        setTimeout(action, 50);
      }
    },
    [persist, pendingAction]
  );

  // ── Two-step verification helpers ──
  const isBrowserTrusted = useCallback((email: string) => {
    try {
      return localStorage.getItem(TRUSTED_PREFIX + email.toLowerCase()) === '1';
    } catch {
      return false;
    }
  }, []);

  const trustBrowser = useCallback((email: string) => {
    try {
      localStorage.setItem(TRUSTED_PREFIX + email.toLowerCase(), '1');
    } catch {
      // ignore storage failures
    }
  }, []);

  const sendOtp = useCallback(async (email: string) => {
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to send verification code');
    setOtpEmail(email);
    setOtpDevCode(data?.devCode ?? null);
    setOtpStep(true);
  }, []);

  const openAuth = useCallback((onSuccess?: () => void) => {
    setPendingAction(() => onSuccess ?? null);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuth = useCallback(() => {
    setIsAuthModalOpen(false);
    setPendingAction(null);
    setOtpStep(false);
    setOtpEmail(null);
    setOtpDevCode(null);
    setPendingOtpUser(null);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Login failed');

      // Password verified. If this browser is already trusted, finish;
      // otherwise require an emailed OTP first.
      if (isBrowserTrusted(email)) {
        finishAuth(data.user);
      } else {
        setPendingOtpUser(data.user);
        await sendOtp(email);
      }
    },
    [finishAuth, isBrowserTrusted, sendOtp]
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Registration failed');

      // A brand-new account always verifies via OTP on first sign-in.
      setPendingOtpUser(data.user);
      await sendOtp(email);
    },
    [sendOtp]
  );

  const verifyOtp = useCallback(
    async (code: string) => {
      if (!otpEmail) throw new Error('No pending verification');
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Verification failed');
      trustBrowser(otpEmail);
      finishAuth(data.user || pendingOtpUser);
    },
    [otpEmail, pendingOtpUser, trustBrowser, finishAuth]
  );

  const resendOtp = useCallback(async () => {
    if (otpEmail) await sendOtp(otpEmail);
  }, [otpEmail, sendOtp]);

  const cancelOtp = useCallback(() => {
    setOtpStep(false);
    setOtpEmail(null);
    setOtpDevCode(null);
    setPendingOtpUser(null);
  }, []);

  const loginWithGoogle = useCallback(
    async (credential: string) => {
      const info = decodeGoogleCredential(credential);
      finishAuth({
        id: info.sub,
        email: info.email,
        name: info.name ?? null,
        avatar: info.picture ?? null,
        provider: 'google',
      });
    },
    [finishAuth]
  );

  const logout = useCallback(() => {
    persist(null);
    // Clear Google's remembered session so the account chooser appears again
    // (and a different account can be selected) on the next sign-in.
    try {
      (window as any).google?.accounts?.id?.disableAutoSelect?.();
    } catch {
      // GSI not loaded — nothing to clear.
    }
  }, [persist]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isReady,
        isAuthModalOpen,
        openAuth,
        closeAuth,
        login,
        register,
        loginWithGoogle,
        logout,
        otpStep,
        otpEmail,
        otpDevCode,
        verifyOtp,
        resendOtp,
        cancelOtp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
