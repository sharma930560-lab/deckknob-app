import { USERNAME_RULES } from '../constants/app';

/**
 * Validate a username string.
 * Rules must match backend (users/views.py UsernameCheckView).
 */
export function validateUsername(username: string): {
  valid: boolean;
  error: string | null;
} {
  if (!username || username.trim().length === 0) {
    return { valid: false, error: 'Username is required.' };
  }

  const trimmed = username.toLowerCase().trim();

  if (trimmed.length < USERNAME_RULES.MIN_LENGTH) {
    return {
      valid: false,
      error: `Username must be at least ${USERNAME_RULES.MIN_LENGTH} characters.`,
    };
  }

  if (trimmed.length > USERNAME_RULES.MAX_LENGTH) {
    return {
      valid: false,
      error: `Username must be at most ${USERNAME_RULES.MAX_LENGTH} characters.`,
    };
  }

  if (!USERNAME_RULES.PATTERN.test(trimmed)) {
    return {
      valid: false,
      error:
        'Username can only contain lowercase letters, numbers, and underscores.',
    };
  }

  return { valid: true, error: null };
}

/**
 * Normalise a raw username input to a clean, storable slug.
 * Matches the logic used in authService.js and authUtils.js.
 */
export function normalizeUsername(raw: string): string {
  return raw.toLowerCase().trim().replace(/\s/g, '_');
}

/**
 * Extract all @mention usernames from a text string.
 * Matches the regex used in postService.js and reelService.js.
 */
export function extractMentions(text: string): string[] {
  const matches = (text || '').match(/@(\w+)/g) || [];
  return matches.map((m) => m.slice(1));
}
