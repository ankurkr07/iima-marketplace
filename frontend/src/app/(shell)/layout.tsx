import { Navbar, MobileTabBar } from '@/components/shell/Navbar';
import { Footer } from '@/components/shell/Footer';
import { AuthGate } from '@/components/auth/AuthGate';

/** Shared chrome for all in-app pages — everything here requires a signed-in user. */
export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <div className="flex min-h-screen flex-col pb-safe-nav md:pb-0">
        <a
          href="#main"
          className="sr-only z-50 rounded-full bg-brick-700 px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        <Navbar />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
        <MobileTabBar />
      </div>
    </AuthGate>
  );
}
