'use client';

import Link from 'next/link';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { InlineLoader } from '@/components/brand/Loader';
import { PageTransition } from '@/components/shell/PageTransition';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

/**
 * In-app messaging is on the roadmap (the Conversation/Message models already
 * exist in the schema, ready for Socket.IO). Until then we show an honest
 * empty state rather than fake conversations — for now buyers reach sellers by
 * phone or email from the listing page.
 */
export default function MessagesPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();
  if (isLoading || !isAuthenticated) return <InlineLoader />;

  return (
    <PageTransition>
      <div className="container-page py-10">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-serif text-3xl tracking-tight text-ink">Messages</h1>
          <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-medium text-gold">
            Realtime chat · Coming soon
          </span>
        </div>

        <EmptyState
          icon="💬"
          title="No conversations yet"
          description="In-app chat is on its way. For now, open any listing and use the seller's phone or email to get in touch — you'll find both on the product page."
          action={
            <Link href="/marketplace">
              <Button>Browse listings</Button>
            </Link>
          }
        />
      </div>
    </PageTransition>
  );
}
