'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/components/feedback/ToastProvider';
import { authApi } from '@/lib/queries';
import type { AuthResponse } from '@/lib/types';

const pwSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, 'Enter your username')
    .regex(/^[a-z0-9._-]+$/, 'Letters, numbers, dots and hyphens only'),
  password: z.string().min(1, 'Enter your password'),
});
type PwValues = z.infer<typeof pwSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithGoogle, loginWithMock } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [mockEmail, setMockEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { data: config } = useQuery({ queryKey: ['auth-config'], queryFn: authApi.config });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PwValues>({ resolver: zodResolver(pwSchema) });

  const routeAfter = (res: AuthResponse) => {
    toast(`Welcome, ${res.user.name.split(' ')[0]}`, 'success');
    router.push('/marketplace');
  };

  const runLogin = async (fn: () => Promise<AuthResponse>) => {
    setBusy(true);
    try {
      routeAfter(await fn());
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Sign-in failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-brick-700 lg:block">
        <div className="pointer-events-none absolute inset-0 opacity-[0.13]">
          <svg width="100%" height="100%" aria-hidden="true">
            <defs>
              <pattern id="lg-arches" width="100" height="100" patternUnits="userSpaceOnUse">
                <path d="M12 88V50a38 38 0 0 1 76 0v38" fill="none" stroke="white" strokeWidth="2" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#lg-arches)" />
          </svg>
        </div>
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link href="/" aria-label="Home">
            <span className="font-serif text-xl font-semibold text-white">IIMA Marketplace</span>
          </Link>
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-md font-serif text-4xl font-semibold leading-tight text-white text-balance"
            >
              The campus marketplace, built on trust.
            </motion.h2>
            <p className="mt-4 max-w-sm text-brick-100">
              Sign in with your institute Google account to buy and sell within the IIM Ahmedabad
              community.
            </p>
          </div>
          <p className="text-sm text-brick-200">Built by Agile CCC for IIM Ahmedabad</p>
        </div>
      </div>

      {/* Auth panel */}
      <div className="flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm"
        >
          <div className="lg:hidden">
            <Logo />
          </div>

          <div className="mt-8 lg:mt-0">
            <h1 className="font-serif text-3xl tracking-tight text-ink">Welcome</h1>
            <p className="mt-2 text-sm text-ink-muted">
              Access is limited to verified{' '}
              <span className="font-medium text-ink-soft">@iima.ac.in</span> accounts.
            </p>
          </div>

          {/* Primary: Google sign-in */}
          <div className="mt-8 space-y-4">
            {config?.googleEnabled && (
              <div className="flex justify-center">
                <GoogleSignInButton onCredential={(cred) => runLogin(() => loginWithGoogle(cred))} />
              </div>
            )}

            {/* Dev-only mock sign-in when Google isn't configured yet */}
            {config?.mockEnabled && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void runLogin(() => loginWithMock(mockEmail));
                }}
                className="rounded-card border border-dashed border-line bg-sand-50 p-4"
              >
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gold">
                  Dev sign-in (Google not configured)
                </p>
                <div className="flex items-stretch overflow-hidden rounded-xl border border-line bg-white focus-within:ring-2 focus-within:ring-brick-600/40">
                  <input
                    value={mockEmail.replace('@iima.ac.in', '')}
                    onChange={(e) => setMockEmail(`${e.target.value.trim()}@iima.ac.in`)}
                    placeholder="yourname"
                    className="w-full bg-transparent px-3.5 py-2.5 text-sm focus:outline-none"
                  />
                  <span className="flex select-none items-center border-l border-line bg-sand-100 px-3 text-sm font-medium text-ink-muted">
                    @iima.ac.in
                  </span>
                </div>
                <Button type="submit" size="sm" fullWidth className="mt-3" disabled={busy || !mockEmail}>
                  {busy ? 'Signing in…' : 'Continue'}
                </Button>
              </form>
            )}

            {/* Divider between Google and password sign-in */}
            {config?.googleEnabled && (
              <div className="flex items-center gap-3 py-1">
                <span className="h-px flex-1 bg-line" />
                <span className="text-xs text-ink-faint">or</span>
                <span className="h-px flex-1 bg-line" />
              </div>
            )}

            {/* Email + password sign-in (always available — e.g. for admins). */}
            <div>
              <button
                onClick={() => setShowPassword((v) => !v)}
                className="text-sm font-medium text-ink-soft hover:text-brick-700"
              >
                {showPassword ? 'Hide password sign-in' : 'Sign in with email & password'}
              </button>
              {showPassword && (
                <form
                  onSubmit={handleSubmit((v) => runLogin(() => login(v.username, v.password)))}
                  className="mt-3 space-y-3"
                  noValidate
                >
                  <div className="flex items-stretch overflow-hidden rounded-xl border border-line bg-white focus-within:ring-2 focus-within:ring-brick-600/40">
                    <input
                      autoComplete="username"
                      placeholder="username"
                      className="w-full bg-transparent px-3.5 py-2.5 text-sm focus:outline-none"
                      {...register('username')}
                    />
                    <span className="flex select-none items-center border-l border-line bg-sand-100 px-3 text-sm font-medium text-ink-muted">
                      @iima.ac.in
                    </span>
                  </div>
                  {errors.username && (
                    <p className="text-xs text-brick-600">{errors.username.message}</p>
                  )}
                  <input
                    type="password"
                    autoComplete="current-password"
                    placeholder="Password"
                    className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brick-600/40"
                    {...register('password')}
                  />
                  {errors.password && (
                    <p className="text-xs text-brick-600">{errors.password.message}</p>
                  )}
                  <Button type="submit" size="md" fullWidth disabled={busy}>
                    {busy ? 'Signing in…' : 'Login'}
                  </Button>
                </form>
              )}
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-ink-faint">
            By continuing you agree to keep campus trade respectful and safe.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
