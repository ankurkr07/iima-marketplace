'use client';

import { useEffect, useRef } from 'react';

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

// Minimal typing for the GIS global we use.
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (res: { credential: string }) => void;
          }) => void;
          renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
        };
      };
    };
  }
}

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${GIS_SRC}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Google sign-in'));
    document.head.appendChild(s);
  });
}

/**
 * Renders Google's official sign-in button. On success it hands the ID token
 * (credential) back to the parent, which exchanges it with our backend.
 */
export function GoogleSignInButton({
  onCredential,
}: {
  onCredential: (credential: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;
    loadScript().then(() => {
      if (cancelled || !window.google || !ref.current) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (res) => onCredential(res.credential),
      });
      // Size the button to the container (clamped to GIS's 200–400 range) so it
      // never overflows on narrow mobile screens.
      const containerWidth = ref.current.offsetWidth || 300;
      const width = Math.max(200, Math.min(380, containerWidth));
      window.google.accounts.id.renderButton(ref.current, {
        theme: 'outline',
        size: 'large',
        width,
        text: 'continue_with',
        shape: 'pill',
        logo_alignment: 'center',
      });
    });
    return () => {
      cancelled = true;
    };
  }, [onCredential]);

  if (!CLIENT_ID) return null;
  return <div ref={ref} className="flex w-full justify-center overflow-hidden" />;
}
