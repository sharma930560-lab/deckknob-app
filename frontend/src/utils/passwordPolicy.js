/**
 * DECKKNOB Strong Password Policy & Email Normalization Utilities
 *
 * Rules:
 * - At least 12 characters
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one numeric digit (0-9)
 * - At least one special symbol (!@#$%^&*...)
 * - Reject common or easily guessed passwords
 * - Reject mismatched confirmation passwords
 * - Normalize email consistently (trim + lowercase) without stripping dots or plus tags
 */

export const COMMON_PASSWORDS = new Set([
  'password',
  'password123',
  'password1234',
  'password12345',
  '123456789012',
  '1234567890123',
  'qwerty123456',
  'deckknob123!',
  'deckknob2026',
  'welcome1234!',
  'admin1234567',
  'letmein12345',
  'iloveyou1234',
  'changeme1234',
  'master123456',
  'football1234',
  'monkey123456',
  'shadow123456',
  'sunshine1234',
  'princess1234'
]);

/**
 * Normalizes email address consistently:
 * Trims surrounding whitespace and converts to lowercase.
 * Preserves dots and plus aliases to avoid incorrectly merging distinct accounts.
 */
export function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Validates a password against DECKKNOB's strong password requirements.
 *
 * @param {string} password - The password to evaluate
 * @param {string|null} confirmPassword - Optional confirmation password
 * @returns {object} Validation result with detailed requirements and errors
 */
export function validatePassword(password, confirmPassword = null) {
  const pwd = typeof password === 'string' ? password : '';
  
  const requirements = {
    minLength: pwd.length >= 12,
    hasUpper: /[A-Z]/.test(pwd),
    hasLower: /[a-z]/.test(pwd),
    hasNumber: /[0-9]/.test(pwd),
    hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(pwd),
    notCommon: pwd.length > 0 && !COMMON_PASSWORDS.has(pwd.toLowerCase().trim()),
    matchesConfirm: confirmPassword === null || (pwd.length > 0 && pwd === confirmPassword)
  };

  const errors = [];
  if (!requirements.minLength) {
    errors.push('Password must be at least 12 characters.');
  }
  if (!requirements.hasUpper) {
    errors.push('Include at least one uppercase letter (A-Z).');
  }
  if (!requirements.hasLower) {
    errors.push('Include at least one lowercase letter (a-z).');
  }
  if (!requirements.hasNumber) {
    errors.push('Include at least one number (0-9).');
  }
  if (!requirements.hasSpecial) {
    errors.push('Include at least one special character (!@#$%^&*...).');
  }
  if (!requirements.notCommon) {
    errors.push('Password is too common or easily guessed. Choose a more unique phrase.');
  }
  if (confirmPassword !== null && !requirements.matchesConfirm) {
    errors.push('Passwords do not match.');
  }

  const passedCount = [
    requirements.minLength,
    requirements.hasUpper,
    requirements.hasLower,
    requirements.hasNumber,
    requirements.hasSpecial,
    requirements.notCommon
  ].filter(Boolean).length;

  let score = 0;
  if (pwd.length > 0) {
    if (passedCount <= 2) score = 1; // Weak
    else if (passedCount <= 4) score = 2; // Fair
    else if (passedCount === 5) score = 3; // Good
    else if (passedCount === 6) score = 4; // Strong
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    score,
    errors,
    requirements
  };
}

/**
 * Calculates password strength visual metadata.
 */
export function calculatePasswordStrength(password) {
  const { score, requirements } = validatePassword(password);
  
  switch (score) {
    case 1:
      return { score, label: 'Weak', color: '#EF4444', percent: 25, requirements };
    case 2:
      return { score, label: 'Fair', color: '#F59E0B', percent: 50, requirements };
    case 3:
      return { score, label: 'Good', color: '#3B82F6', percent: 75, requirements };
    case 4:
      return { score, label: 'Strong', color: '#10B981', percent: 100, requirements };
    default:
      return { score: 0, label: '', color: '#3F3F46', percent: 0, requirements };
  }
}
