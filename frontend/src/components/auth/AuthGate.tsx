'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { Loader } from '@/components/brand/Loader';

/**
 * Gates every in-app page behind authentication — the marketplace is not
 * reachable without signing in. Profile details are NOT required here; they are
 * completed later from My Profile and only enforced when listing an item.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) router.replace('/login');
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return <Loader label="IIMA Marketplace" />;
  }
  return <>{children}</>;
}
