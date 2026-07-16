import { Navbar } from '@/components/shell/Navbar';
import { Footer } from '@/components/shell/Footer';
import { AuthGate } from '@/components/auth/AuthGate';

/** Shared chrome for all in-app pages — everything here requires a signed-in user. */
export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </AuthGate>
  );
}
