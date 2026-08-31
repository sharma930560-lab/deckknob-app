import { BRAND_COLOR } from '../constants/app';

/**
 * Generate a deterministic fallback avatar URL for a user.
 * Uses ui-avatars.com — matches the pattern used throughout
 * postService.js, reelService.js, notificationService.js, and storyService.js.
 *
 * Example:
 *   getAvatarUrl('bassline_leo')
 *   → 'https://ui-avatars.com/api/?name=bassline_leo&background=DFE104&color=000&bold=true'
 */
export function getAvatarUrl(username: string): string {
  const color = BRAND_COLOR.replace('#', '');
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=${color}&color=000&bold=true`;
}

/**
 * Resolve a profile picture URL — returns the stored URL if available,
 * otherwise falls back to the generated avatar. Used everywhere a profilePic
 * field might be empty or undefined.
 */
export function resolveAvatar(
  profilePic: string | null | undefined,
  username: string
): string {
  if (profilePic && profilePic.trim().length > 0) return profilePic;
  return getAvatarUrl(username);
}
