/**
 * Number and text formatting utilities.
 * Platform-agnostic — no DOM, no RN dependencies.
 */

/**
 * Format a large number into a compact representation.
 * Examples: 1234 → "1.2K", 1500000 → "1.5M"
 * Used consistently for like/follower counts across web and mobile.
 */
export function formatCount(n: number): string {
  if (n === undefined || n === null) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/**
 * Truncate a string to a max length, appending ellipsis.
 * Useful for captions in cards and previews.
 */
export function truncate(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
}

/**
 * Slugify a string for URL-safe usage.
 * Example: "Hello World!" → "hello-world"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Capitalise the first letter of each word.
 * Example: "drum and bass" → "Drum And Bass"
 */
export function titleCase(text: string): string {
  return text
    .toLowerCase()
    .replace(/(?:^|\s)\S/g, (char) => char.toUpperCase());
}
