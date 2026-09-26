'use client';

/**
 * Self-contained sign-in / sign-up overlay.
 *
 * Rendered once globally (from providers.tsx) and controlled entirely by
 * auth-context state, so it floats above the app via a portal and never
 * affects existing page layout or features.
 *
 * NOTE: For "Continue with Google" to work, the current origin
 * (e.g. http://localhost:3001) must be listed as an *Authorized JavaScript
 * origin* on the OAuth client in Google Cloud Console.
 */

import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAuth } from '@/context/auth-context';
import { Loader2 } from 'lucide-react';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

declare global {
  interface Window {
    google?: any;
  }
}

export default function AuthModal() {
  const {
    isAuthModalOpen, closeAuth, login, register, loginWithGoogle,
    otpStep, otpEmail, otpDevCode, verifyOtp, resendOtp, cancelOtp,
  } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Reset form whenever the modal opens/closes.
  useEffect(() => {
    if (!isAuthModalOpen) {
      setError(null);
      setLoading(false);
      setPassword('');
      setOtpCode('');
    }
  }, [isAuthModalOpen]);

  // Clear the code field / errors when entering or leaving the OTP step.
  useEffect(() => {
    setOtpCode('');
    setError(null);
    setLoading(false);
  }, [otpStep]);

  // Load + render the Google Identity Services button while the modal is open.
  useEffect(() => {
    if (!isAuthModalOpen || otpStep || !GOOGLE_CLIENT_ID) return;

    let cancelled = false;
    let rafId = 0;

    const doRender = () => {
      if (cancelled || !window.google) return;
      // The modal content mounts through a portal, so the target div may not
      // exist on the first tick after re-opening. Retry until it's present.
      if (!googleBtnRef.current) {
        rafId = requestAnimationFrame(doRender);
        return;
      }
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        auto_select: false,
        callback: async (response: { credential: string }) => {
          try {
            setError(null);
            setLoading(true);
            await loginWithGoogle(response.credential);
          } catch (e: any) {
            setError(e?.message || 'Google sign-in failed');
            setLoading(false);
          }
        },
      });
      googleBtnRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        width: 320,
        text: 'continue_with',
      });
    };

    if (window.google) {
      doRender();
    } else {
      const existing = document.getElementById('google-gsi-script');
      if (existing) {
        existing.addEventListener('load', doRender, { once: true });
      } else {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.id = 'google-gsi-script';
        script.onload = doRender;
        document.body.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isAuthModalOpen, otpStep, loginWithGoogle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'signup') {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err?.message || 'Something went wrong');
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await verifyOtp(otpCode.trim());
    } catch (err: any) {
      setError(err?.message || 'Verification failed');
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError(null);
    try {
      await resendOtp();
    } catch (err: any) {
      setError(err?.message || 'Could not resend code');
    }
  };

  return (
    <Dialog open={isAuthModalOpen} onOpenChange={(open) => { if (!open) closeAuth(); }}>
      <DialogContent className="sm:max-w-md">
        {otpStep ? (
          <>
            <DialogHeader>
              <DialogTitle>Enter verification code</DialogTitle>
              <DialogDescription>
                We sent a 6-digit code to <span className="font-medium text-foreground">{otpEmail}</span>. It expires in 10 minutes.
              </DialogDescription>
            </DialogHeader>

            {otpDevCode && (
              <p className="text-xs text-amber-600 bg-amber-500/10 rounded-md px-3 py-2">
                Email isn't configured — dev code: <span className="font-mono font-bold">{otpDevCode}</span>
              </p>
            )}

            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3 mt-1">
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                maxLength={6}
                placeholder="______"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-3 text-center text-2xl tracking-[0.5em] font-mono outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="btn-wandor-primary w-full justify-center disabled:opacity-60"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Verify & continue
              </button>
            </form>

            <div className="flex items-center justify-between mt-2 text-xs">
              <button type="button" onClick={cancelOtp} className="text-muted-foreground hover:text-foreground">
                ← Back
              </button>
              <button type="button" onClick={handleResendOtp} className="text-primary font-medium hover:underline">
                Resend code
              </button>
            </div>
          </>
        ) : (
        <>
        <DialogHeader>
          <DialogTitle>{mode === 'login' ? 'Sign in to reFlow' : 'Create your account'}</DialogTitle>
          <DialogDescription>
            {mode === 'login'
              ? 'Sign in to view and apply recovery plans.'
              : 'Sign up to unlock intelligent recovery plans.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-1">
          {mode === 'signup' && (
            <input
              type="text"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
            />
          )}
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          />

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="btn-wandor-primary w-full justify-center disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'login' ? 'Sign in' : 'Sign up'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-1">
          <div className="h-px flex-1 bg-foreground/10" />
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-foreground/10" />
        </div>

        {/* Google Identity Services renders its button here */}
        <div className="flex justify-center">
          {GOOGLE_CLIENT_ID ? (
            <div ref={googleBtnRef} />
          ) : (
            <p className="text-xs text-muted-foreground">Google sign-in is not configured.</p>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-2">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); }}
            className="text-primary font-medium hover:underline"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
        </>
        )}
      </DialogContent>
    </Dialog>
  );
}
