import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <div className="flex justify-center">
          <Logo compact />
        </div>
        <p className="mt-8 font-serif text-7xl font-semibold text-brick-700">404</p>
        <h1 className="mt-2 font-serif text-2xl text-ink">This page took a different path.</h1>
        <p className="mt-2 text-sm text-ink-muted">
          The listing or page you&apos;re looking for isn&apos;t here.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/marketplace">
            <Button>Browse marketplace</Button>
          </Link>
          <Link href="/">
            <Button variant="outline">Go home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
