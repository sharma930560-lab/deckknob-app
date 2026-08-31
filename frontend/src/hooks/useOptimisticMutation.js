/**
 * useOptimisticMutation — optimistic UI mutation hook
 *
 * Applies an optimistic update immediately, fires the async mutation,
 * and rolls back + shows an error toast if the mutation fails.
 *
 * Usage:
 *   const { mutate } = useOptimisticMutation();
 *
 *   mutate({
 *     optimisticUpdate: () => store.setLiked(true),
 *     mutationFn:       () => api.likePost(postId),
 *     rollbackFn:       () => store.setLiked(false),
 *   });
 *
 * Requirements: 5.2, 5.3, 14.3
 */

import { useCallback, useRef } from 'react';
import { useToast } from '../components/ui/Toast';

export default function useOptimisticMutation() {
  const { showToast } = useToast();
  // Track in-flight mutations to allow concurrent independent mutations
  const loadingRef = useRef(false);

  const mutate = useCallback(
    async ({ optimisticUpdate, mutationFn, rollbackFn }) => {
      // 1. Apply the optimistic update synchronously
      optimisticUpdate();

      loadingRef.current = true;

      try {
        // 2. Fire the real async mutation
        await mutationFn();
        // Success — optimistic state is already correct, nothing to do
      } catch (err) {
        // 3. Mutation failed — roll back and notify the user
        rollbackFn();
        const message =
          err?.message || 'Something went wrong. Please try again.';
        showToast(message, 'error');
      } finally {
        loadingRef.current = false;
      }
    },
    [showToast],
  );

  return { mutate };
}
