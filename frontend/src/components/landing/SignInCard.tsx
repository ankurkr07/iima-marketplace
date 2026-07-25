'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/components/feedback/ToastProvider';
import { authApi } from '@/lib/queries';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { Button } from '@/components/ui/Button';
import type { AuthResponse } from '@/lib/types';

/**
 * The sign-in panel shown directly on the landing page (right column). Google
 * sign-in first, with an email/password fallback. When already signed in it
 * simply offers a way into the marketplace.
 */
export function SignInCard() {
  const router = useRouter();
  const { login, loginWithGoogle, isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { data: config } = useQuery({ queryKey: ['auth-config'], queryFn: authApi.config });

  const run = async (fn: () => Promise<AuthResponse>) => {
    setBusy(true);
    try {
      const res = await fn();
      toast(`Welcome, ${res.user.name.split(' ')[0]}`, 'success');
      router.push('/marketplace');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Sign-in failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (isAuthenticated) {
    return (
      <div className="rounded-[18px] border border-line bg-white/90 p-7 shadow-card backdrop-blur-sm">
        <h2 className="font-serif text-2xl tracking-tight text-ink">
          Welcome back{user ? `, ${user.name.split(' ')[0]}` : ''}
        </h2>
        <p className="mt-1.5 text-sm text-ink-muted">You&apos;re signed in and ready to go.</p>
        <Button size="lg" fullWidth className="mt-6" onClick={() => router.push('/marketplace')}>
          Enter marketplace
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-[18px] border border-line bg-white/90 p-7 shadow-card backdrop-blur-sm">
      <h2 className="font-serif text-2xl tracking-tight text-ink">Sign in</h2>
      <p className="mt-1.5 text-sm text-ink-muted">
        Use your institute Google account to get started.
      </p>

      <div className="mt-6 space-y-4">
        {config?.googleEnabled ? (
          <div className="flex justify-center">
            <GoogleSignInButton onCredential={(cred) => run(() => loginWithGoogle(cred))} />
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-line bg-sand-50 px-4 py-3 text-center text-xs text-ink-muted">
            Google sign-in is being configured. Use email &amp; password below for now.
          </p>
        )}

        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-line" />
          <span className="text-xs text-ink-faint">IIMA students only</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <div>
          <button
            onClick={() => setShowPassword((v) => !v)}
            className="text-sm font-medium text-ink-soft transition-colors hover:text-brick-700"
          >
            {showPassword ? 'Hide password sign-in' : 'Sign in with email & password'}
          </button>
          {showPassword && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run(() => login(username, password));
              }}
              className="mt-3 space-y-3"
              noValidate
            >
              <div className="flex items-stretch overflow-hidden rounded-xl border border-line bg-white focus-within:ring-2 focus-within:ring-brick-600/40">
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  placeholder="username"
                  className="w-full bg-transparent px-3.5 py-2.5 text-sm focus:outline-none"
                />
                <span className="flex select-none items-center border-l border-line bg-sand-100 px-3 text-sm font-medium text-ink-muted">
                  @iima.ac.in
                </span>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Password"
                className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brick-600/40"
              />
              <Button type="submit" size="md" fullWidth disabled={busy}>
                {busy ? 'Signing in…' : 'Login'}
              </Button>
            </form>
          )}
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-ink-faint">
        By continuing you agree to keep campus trade respectful and safe. For IIMA students only.
      </p>
    </div>
  );
}
