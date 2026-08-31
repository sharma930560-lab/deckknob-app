/**
 * useWebSocket — manages a WebSocket connection lifecycle
 *
 * - Connects on mount when `url` is provided
 * - Disconnects on unmount
 * - Exponential back-off reconnect on close/error: 1s → 2s → 4s → 8s … max 30s
 * - Exposes: { lastMessage, readyState, isReconnecting }
 *   - lastMessage: parsed JSON of the last received message (or null)
 *   - readyState: 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED
 *   - isReconnecting: true when attempting to reconnect after a disconnect
 *
 * Requirements: 8.7
 */

import { useEffect, useRef, useState, useCallback } from 'react';

const INITIAL_DELAY_MS = 1000;
const MAX_DELAY_MS = 30000;

export default function useWebSocket(url) {
  const [lastMessage, setLastMessage] = useState(null);
  const [readyState, setReadyState] = useState(3); // CLOSED initially
  const [isReconnecting, setIsReconnecting] = useState(false);

  const wsRef = useRef(null);
  const reconnectDelayRef = useRef(INITIAL_DELAY_MS);
  const reconnectTimerRef = useRef(null);
  // Track whether the hook is still mounted to avoid state updates after unmount
  const mountedRef = useRef(true);
  // Track whether we should reconnect (false when intentionally closing on unmount)
  const shouldReconnectRef = useRef(true);

  const connect = useCallback(() => {
    if (!url) return;
    if (!mountedRef.current) return;

    // Clean up any existing socket before creating a new one
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.onopen = null;
      wsRef.current.close();
    }

    const ws = new WebSocket(url);
    wsRef.current = ws;

    if (mountedRef.current) {
      setReadyState(WebSocket.CONNECTING);
    }

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setReadyState(WebSocket.OPEN);
      setIsReconnecting(false);
      // Reset back-off delay on successful connection
      reconnectDelayRef.current = INITIAL_DELAY_MS;
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const parsed = JSON.parse(event.data);
        setLastMessage(parsed);
      } catch {
        // Non-JSON message — store raw string wrapped in an object
        setLastMessage({ raw: event.data });
      }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setReadyState(WebSocket.CLOSED);

      if (!shouldReconnectRef.current) return;

      // Schedule reconnect with exponential back-off
      const delay = reconnectDelayRef.current;
      reconnectDelayRef.current = Math.min(delay * 2, MAX_DELAY_MS);

      setIsReconnecting(true);
      reconnectTimerRef.current = setTimeout(() => {
        if (mountedRef.current && shouldReconnectRef.current) {
          connect();
        }
      }, delay);
    };

    ws.onerror = () => {
      // onerror is always followed by onclose, so reconnect logic lives in onclose
      if (!mountedRef.current) return;
      setReadyState(WebSocket.CLOSED);
    };
  }, [url]);

  useEffect(() => {
    if (!url) {
      setReadyState(3); // CLOSED
      setIsReconnecting(false);
      return;
    }

    mountedRef.current = true;
    shouldReconnectRef.current = true;

    connect();

    return () => {
      mountedRef.current = false;
      shouldReconnectRef.current = false;

      // Cancel any pending reconnect timer
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      // Close the socket without triggering reconnect
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
        wsRef.current.onopen = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [url, connect]);

  return { lastMessage, readyState, isReconnecting };
}
