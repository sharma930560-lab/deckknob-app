/**
 * useInfiniteScroll — window scroll-based infinite loading hook
 *
 * Attaches a scroll listener to `window`. When the user scrolls within
 * `threshold` pixels of the bottom of the page, `fetchFn` is called —
 * but only when `enabled` is true and no fetch is already in flight.
 *
 * Usage:
 *   useInfiniteScroll(
 *     () => dispatch(loadMorePosts()),
 *     { threshold: 200, enabled: hasMore },
 *   );
 *
 * Requirements: 5.2
 */

import { useCallback, useEffect, useRef } from 'react';

export default function useInfiniteScroll(
  fetchFn,
  { threshold = 200, enabled = true } = {},
) {
  const isLoadingRef = useRef(false);

  const handleScroll = useCallback(async () => {
    if (!enabled || isLoadingRef.current) return;

    const distanceFromBottom =
      document.body.scrollHeight - (window.scrollY + window.innerHeight);

    if (distanceFromBottom <= threshold) {
      isLoadingRef.current = true;
      try {
        await fetchFn();
      } finally {
        isLoadingRef.current = false;
      }
    }
  }, [fetchFn, threshold, enabled]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);
}
