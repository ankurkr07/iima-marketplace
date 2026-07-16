'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader } from '@/components/brand/Loader';

/**
 * Onboarding was removed — profiles are now completed lazily from My Profile.
 * This stub gracefully forwards any stale link (or an open tab) to the
 * marketplace so nobody hits a dead page.
 */
export default function OnboardingRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/marketplace');
  }, [router]);
  return <Loader label="IIMA Marketplace" />;
}
