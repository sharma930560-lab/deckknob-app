/**
 * useDoubleTap — double-tap / double-click detection hook
 *
 * Returns an `onTap` handler to attach to `onClick` or `onPointerUp`.
 * Fires `callback(event)` only when two taps occur within `delay` ms.
 * Single taps are silently ignored.
 *
 * Usage:
 *   const { onTap } = useDoubleTap((e) => {
 *     const { clientX, clientY } = e;
 *     showHeartAt(clientX, clientY);
 *   }, 300);
 *
 *   <div onClick={onTap}>...</div>
 *
 * Requirements: 5.7
 */

import { useCallback, useEffect, useRef } from 'react';

export default function useDoubleTap(callback, delay = 300) {
  const timerRef = useRef(null);
  const lastTapRef = useRef(null);

  // Clean up the pending timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const onTap = useCallback(
    (event) => {
      if (timerRef.current) {
        // Second tap arrived within the delay window — fire callback
        clearTimeout(timerRef.current);
        timerRef.current = null;
        lastTapRef.current = null;
        callback(event);
      } else {
        // First tap — start the window timer
        lastTapRef.current = event;
        timerRef.current = setTimeout(() => {
          // Timer expired without a second tap — single tap, do nothing
          timerRef.current = null;
          lastTapRef.current = null;
        }, delay);
      }
    },
    [callback, delay],
  );

  return { onTap };
}
