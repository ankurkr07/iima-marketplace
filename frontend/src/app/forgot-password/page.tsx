'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="grid min-h-screen place-items-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm text-center"
      >
        <div className="flex justify-center">
          <Logo compact />
        </div>
        <h1 className="mt-8 font-serif text-2xl tracking-tight text-ink">Reset your password</h1>

        {submitted ? (
          <div className="mt-6 rounded-card border border-line bg-sand-50 p-6">
            <p className="text-sm text-ink-soft">
              If an account exists for that username, we&apos;ll send reset instructions to your
              institute email.
            </p>
            <span className="mt-3 inline-block rounded-full bg-gold/15 px-3 py-1 text-xs font-medium text-gold">
              Email delivery · Coming soon
            </span>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(true);
            }}
            className="mt-6 space-y-4"
          >
            <div className="flex items-stretch overflow-hidden rounded-xl border border-line bg-white focus-within:ring-2 focus-within:ring-brick-600/40">
              <input
                required
                placeholder="p26ankur"
                className="w-full bg-transparent px-3.5 py-3 text-sm focus:outline-none"
              />
              <span className="flex select-none items-center border-l border-line bg-sand-100 px-3.5 text-sm font-medium text-ink-muted">
                @iima.ac.in
              </span>
            </div>
            <Button type="submit" fullWidth size="lg">
              Send reset link
            </Button>
          </form>
        )}

        <Link
          href="/login"
          className="mt-6 inline-block text-sm text-ink-muted hover:text-brick-700"
        >
          ← Back to sign in
        </Link>
      </motion.div>
    </div>
  );
}
