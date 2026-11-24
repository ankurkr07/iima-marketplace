'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk, wishlistApi } from '@/lib/queries';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/components/feedback/ToastProvider';
import type { Product } from '@/lib/types';

/**
 * One source of truth for "is this saved?" — shared by every product card,
 * the product page and the navbar badge. Toggling is optimistic so the heart
 * responds instantly, and rolls back if the server refuses.
 */
export function useWishlist() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data = [] } = useQuery({
    queryKey: qk.wishlist,
    queryFn: wishlistApi.list,
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const savedIds = new Set(data.map((p) => p.id));

  const mutation = useMutation({
    mutationFn: (product: Product) => wishlistApi.toggle(product.id),
    onMutate: async (product) => {
      await queryClient.cancelQueries({ queryKey: qk.wishlist });
      const previous = queryClient.getQueryData<Product[]>(qk.wishlist) ?? [];
      const exists = previous.some((p) => p.id === product.id);
      queryClient.setQueryData<Product[]>(
        qk.wishlist,
        exists ? previous.filter((p) => p.id !== product.id) : [product, ...previous],
      );
      return { previous };
    },
    onSuccess: (res) => toast(res.saved ? 'Saved to your wishlist' : 'Removed from wishlist', 'success'),
    onError: (_e, _p, ctx) => {
      if (ctx) queryClient.setQueryData(qk.wishlist, ctx.previous);
      toast('Could not update wishlist', 'error');
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: qk.wishlist }),
  });

  const toggle = (product: Product) => {
    if (!isAuthenticated) {
      toast('Sign in to save listings', 'info');
      return;
    }
    mutation.mutate(product);
  };

  return { savedIds, count: data.length, isSaved: (id: string) => savedIds.has(id), toggle, pending: mutation.isPending };
}
