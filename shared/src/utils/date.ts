import type { FirestoreTimestamp } from '../types/user';

/**
 * Format a Firestore timestamp into a relative time string.
 * Works on both web (Timestamp object) and mobile (plain object with toMillis).
 * Examples: "just now", "5m ago", "2h ago", "Jul 25"
 */
export function formatRelativeTime(
  timestamp: FirestoreTimestamp | null | undefined
): string {
  if (!timestamp) return '';

  const ms = timestamp.toMillis();
  const diff = Date.now() - ms;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  // Fall back to formatted date
  return formatDate(timestamp);
}

/**
 * Format a Firestore timestamp as a short date string.
 * Example: "Jul 25" or "Jan 3, 2025"
 */
export function formatDate(
  timestamp: FirestoreTimestamp | null | undefined
): string {
  if (!timestamp) return '';
  const date = new Date(timestamp.toMillis());
  const now = new Date();
  const isCurrentYear = date.getFullYear() === now.getFullYear();

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(isCurrentYear ? {} : { year: 'numeric' }),
  });
}

/**
 * Format seconds into a "mm:ss" or "h:mm:ss" duration string.
 * Used for video/audio duration display.
 */
export function formatDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '0:00';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}
