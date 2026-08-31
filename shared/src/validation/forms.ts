/**
 * Generic form field validators.
 * All platform-agnostic — no DOM, no RN dependencies.
 */

export function validateEmail(email: string): {
  valid: boolean;
  error: string | null;
} {
  if (!email || email.trim().length === 0) {
    return { valid: false, error: 'Email is required.' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { valid: false, error: 'Enter a valid email address.' };
  }
  return { valid: true, error: null };
}

export function validatePassword(password: string): {
  valid: boolean;
  error: string | null;
} {
  if (!password || password.length === 0) {
    return { valid: false, error: 'Password is required.' };
  }
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters.' };
  }
  return { valid: true, error: null };
}

export function validateRequired(
  value: string,
  fieldName = 'This field'
): { valid: boolean; error: string | null } {
  if (!value || value.trim().length === 0) {
    return { valid: false, error: `${fieldName} is required.` };
  }
  return { valid: true, error: null };
}

export function validateUrl(url: string): {
  valid: boolean;
  error: string | null;
} {
  if (!url || url.trim().length === 0) {
    return { valid: true, error: null }; // Optional field
  }
  try {
    new URL(url.trim());
    return { valid: true, error: null };
  } catch {
    return { valid: false, error: 'Enter a valid URL (include https://).' };
  }
}
