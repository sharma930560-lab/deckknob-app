/**
 * useInterval — custom hook that calls a callback at a given interval
 * - Calls `callback` every `delay` ms
 * - Clears the interval on unmount or when delay changes
 * - If `delay` is null, the interval is not started
 * Requirements: 3.5
 */
import { useEffect, useRef } from 'react';

export default function useInterval(callback, delay) {
  const savedCallback = useRef(callback);

  // Keep the ref up-to-date with the latest callback without restarting the interval
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    // Do not start if delay is null
    if (delay === null) return;

    const id = setInterval(() => {
      savedCallback.current();
    }, delay);

    return () => clearInterval(id);
  }, [delay]);
}
