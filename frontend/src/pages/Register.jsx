import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import IconsaxAnimated from '../components/icons/IconsaxAnimated';
import authStore from '../stores/authStore';
import { authAPI } from '../utils/authUtils';
import { useToast } from '../components/ui/Toast';
import {
  normalizeEmail,
  validatePassword,
  calculatePasswordStrength
} from '../utils/passwordPolicy';

const roles = [
  { id: 'dj', label: 'DJ', icon: 'reel' },
  { id: 'producer', label: 'Producer', icon: 'settings' },
  { id: 'fan', label: 'Fan', icon: 'heart' },
];

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function Register() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState(location.state?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState('dj');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Duplicate email detection state
  const [isDuplicateEmail, setIsDuplicateEmail] = useState(false);

  const { register, loginWithGoogle, error, clearError, isLoading, isAuthenticated } = authStore();

  // Username check state
  const [usernameStatus, setUsernameStatus] = useState(null); // null | 'checking' | 'available' | 'taken'
  const [suggestions, setSuggestions] = useState([]);
  const debouncedUsername = useDebounce(username, 400);

  // Live password validation
  const passwordValidation = validatePassword(password, confirmPassword);
  const passwordStrength = calculatePasswordStrength(password);

  useEffect(() => {
    clearError();
    setIsDuplicateEmail(false);
  }, [clearError]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/onboarding');
    }
  }, [isAuthenticated, navigate]);

  // Real-time username availability check
  useEffect(() => {
    if (!debouncedUsername || debouncedUsername.length < 3) {
      setUsernameStatus(null);
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    setUsernameStatus('checking');
    authAPI.checkUsername(debouncedUsername).then((result) => {
      if (cancelled) return;
      if (result.available) {
        setUsernameStatus('available');
        setSuggestions([]);
      } else {
        setUsernameStatus('taken');
        setSuggestions(result.suggestions || []);
      }
    }).catch(() => {
      if (!cancelled) setUsernameStatus(null);
    });
    return () => { cancelled = true; };
  }, [debouncedUsername]);

  const handleGoogleSignup = async () => {
    try {
      await loginWithGoogle();
      showToast('Welcome to DECKKNOB!', 'success');
      navigate('/onboarding');
    } catch (err) {
      showToast(err.message || 'Google Sign-up failed', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsDuplicateEmail(false);

    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail) {
      showToast('Please enter a valid email address.', 'warning');
      return;
    }

    if (!displayName.trim()) {
      showToast('Please enter your display name.', 'warning');
      return;
    }

    if (!username.trim() || username.length < 3) {
      showToast('Username must be at least 3 characters.', 'warning');
      return;
    }

    if (usernameStatus === 'taken' || usernameStatus === 'checking') {
      showToast('Please choose an available username first.', 'warning');
      return;
    }

    if (!passwordValidation.isValid) {
      showToast(passwordValidation.errors[0] || 'Please meet all password requirements.', 'warning');
      return;
    }

    if (!agreedToTerms) {
      showToast('Please accept the Terms of Service and Privacy Policy to continue.', 'warning');
      return;
    }

    try {
      await register(username, cleanEmail, password, role, displayName.trim());
      showToast('Account created! A verification email has been sent.', 'success');
      navigate('/verify-email', { state: { email: cleanEmail } });
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('already exist') || msg.includes('email-already-in-use')) {
        setIsDuplicateEmail(true);
      } else {
        showToast(msg || 'Registration could not be completed.', 'error');
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#09090B] px-4 py-8 text-white">
      <div className="w-full max-w-lg">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#DFE104]">Single Account Registration</p>
        <h1 className="mt-2 text-5xl sm:text-6xl font-black uppercase leading-[0.88] tracking-[-0.06em]">
          Join DECKKNOB
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-zinc-400">
          One account per email. Select your scene role and build your selector profile.
        </p>

        {/* Duplicate Email Guided Resolution Banner */}
        {isDuplicateEmail && (
          <div className="mt-5 rounded-2xl border border-[#DFE104]/40 bg-[#DFE104]/10 p-5 shadow-lg">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-[#DFE104]">Account Already Exists</p>
                <p className="mt-1 text-xs text-zinc-300 leading-relaxed">
                  An account is already registered for <strong className="text-white">{email}</strong>. Each email address maps to one single DECKKNOB profile.
                </p>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => navigate('/login', { state: { email } })}
                    className="px-4 py-2 rounded-xl bg-[#DFE104] text-black font-black text-xs uppercase tracking-wider hover:bg-[#DFE104]/90 transition-all"
                  >
                    Log In to Existing Account
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password', { state: { email } })}
                    className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white font-bold text-xs transition-all border border-white/10"
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Generic Error message if not duplicate */}
        {!isDuplicateEmail && error && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs sm:text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="dk-panel mt-6 space-y-4 rounded-3xl p-5 sm:p-6 border border-white/[0.08] bg-white/[0.02]">
          
          {/* Display Name */}
          <div>
            <label className="block mb-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
              Display Name
            </label>
            <input
              type="text"
              placeholder="e.g. Maya Lin"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 text-sm text-white outline-none focus:border-[#DFE104] transition-colors"
              required
            />
          </div>

          {/* Username with live check */}
          <div>
            <label className="block mb-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-xs">@</span>
              <input
                className={`h-11 w-full rounded-xl border bg-white/[0.04] pl-8 pr-10 text-sm outline-none transition-colors ${
                  usernameStatus === 'available'
                    ? 'border-green-500/70 focus:border-green-400'
                    : usernameStatus === 'taken'
                    ? 'border-red-500/70 focus:border-red-400'
                    : 'border-white/[0.08] focus:border-[#DFE104]'
                }`}
                placeholder="mayanoise"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                required
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm">
                {usernameStatus === 'checking' && <span className="animate-spin inline-block text-zinc-400">⟳</span>}
                {usernameStatus === 'available' && <span className="text-green-500 font-bold">✓</span>}
                {usernameStatus === 'taken' && <span className="text-red-500 font-bold">✗</span>}
              </span>
            </div>

            {usernameStatus === 'available' && (
              <p className="mt-1 text-xs text-green-500 font-semibold">✓ Username is available</p>
            )}
            {usernameStatus === 'taken' && (
              <div className="mt-1.5">
                <p className="text-xs text-red-400 font-medium mb-1.5">Username is taken. Try one of these:</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setUsername(s);
                        setUsernameStatus(null);
                        setSuggestions([]);
                      }}
                      className="rounded-lg border border-[#DFE104]/40 bg-[#DFE104]/10 px-2.5 py-0.5 text-xs font-bold text-[#DFE104] hover:bg-[#DFE104]/20"
                    >
                      @{s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Email Address */}
          <div>
            <label className="block mb-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
              Email Address
            </label>
            <input
              type="email"
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (isDuplicateEmail) setIsDuplicateEmail(false);
              }}
              className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 text-sm text-white outline-none focus:border-[#DFE104] transition-colors"
              required
            />
          </div>

          {/* Password with Strength Meter & Show/Hide */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
                Password
              </label>
              {password && (
                <span
                  className="text-xs font-bold"
                  style={{ color: passwordStrength.color }}
                >
                  {passwordStrength.label}
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 12 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 pr-10 text-sm text-white outline-none focus:border-[#DFE104] transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs font-bold"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            {/* Visual Strength Meter Bar */}
            {password && (
              <div className="mt-2">
                <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${passwordStrength.percent}%`,
                      backgroundColor: passwordStrength.color
                    }}
                  />
                </div>

                {/* Password Requirements Checklist */}
                <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-[11px]">
                  <span className={passwordValidation.requirements.minLength ? 'text-green-400' : 'text-zinc-500'}>
                    {passwordValidation.requirements.minLength ? '✓' : '○'} 12+ Characters
                  </span>
                  <span className={passwordValidation.requirements.hasUpper ? 'text-green-400' : 'text-zinc-500'}>
                    {passwordValidation.requirements.hasUpper ? '✓' : '○'} Uppercase (A-Z)
                  </span>
                  <span className={passwordValidation.requirements.hasLower ? 'text-green-400' : 'text-zinc-500'}>
                    {passwordValidation.requirements.hasLower ? '✓' : '○'} Lowercase (a-z)
                  </span>
                  <span className={passwordValidation.requirements.hasNumber ? 'text-green-400' : 'text-zinc-500'}>
                    {passwordValidation.requirements.hasNumber ? '✓' : '○'} Number (0-9)
                  </span>
                  <span className={passwordValidation.requirements.hasSpecial ? 'text-green-400' : 'text-zinc-500'}>
                    {passwordValidation.requirements.hasSpecial ? '✓' : '○'} Symbol (!@#$...)
                  </span>
                  <span className={passwordValidation.requirements.notCommon ? 'text-green-400' : 'text-zinc-500'}>
                    {passwordValidation.requirements.notCommon ? '✓' : '○'} Unique phrase
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block mb-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`h-11 w-full rounded-xl border bg-white/[0.04] px-3.5 pr-10 text-sm text-white outline-none transition-colors ${
                  confirmPassword && !passwordValidation.requirements.matchesConfirm
                    ? 'border-red-500/70 focus:border-red-400'
                    : confirmPassword && passwordValidation.requirements.matchesConfirm
                    ? 'border-green-500/70 focus:border-green-400'
                    : 'border-white/[0.08] focus:border-[#DFE104]'
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs font-bold"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {confirmPassword && !passwordValidation.requirements.matchesConfirm && (
              <p className="mt-1 text-xs text-red-400">Passwords do not match.</p>
            )}
            {confirmPassword && passwordValidation.requirements.matchesConfirm && (
              <p className="mt-1 text-xs text-green-400">✓ Passwords match</p>
            )}
          </div>

          {/* Role selection (1 single account role) */}
          <div>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
              Primary Role
            </span>
            <div className="grid grid-cols-3 gap-2">
              {roles.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setRole(item.id)}
                  className={`rounded-2xl border p-3 text-center transition-all ${
                    role === item.id
                      ? 'border-[#DFE104] bg-[#DFE104] text-black font-black'
                      : 'border-white/[0.08] bg-white/[0.04] text-zinc-400 hover:border-white/20'
                  }`}
                >
                  <IconsaxAnimated name={item.icon} size={20} className="mx-auto" filled={role === item.id} />
                  <span className="mt-1.5 block text-xs uppercase tracking-wider">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Terms & Privacy Checkbox */}
          <div className="pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 text-[#DFE104] focus:ring-0 cursor-pointer"
                required
              />
              <span className="text-xs text-zinc-400 leading-relaxed">
                I agree to the <span className="text-white underline">Terms of Service</span> and <span className="text-white underline">Privacy Policy</span>. One account is permitted per email address.
              </span>
            </label>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading || usernameStatus === 'taken' || usernameStatus === 'checking' || !agreedToTerms}
            className="dk-button h-12 w-full bg-[#DFE104] font-black uppercase tracking-[0.14em] text-black disabled:opacity-40 transition-all shadow-md active:scale-98"
          >
            {isLoading ? 'Creating single account...' : 'Create Account & Continue'}
          </button>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-white/5"></div>
            <span className="flex-shrink mx-3 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600">Or continue with</span>
            <div className="flex-grow border-t border-white/5"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={isLoading}
            className="dk-button h-11 w-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.7 0 3.25.61 4.47 1.625l2.437-2.437C17.312 1.696 14.933 1 12.24 1 6.58 1 2 5.58 2 11.24s4.58 10.24 10.24 10.24c5.795 0 10.254-4.074 10.254-10.24 0-.695-.08-1.355-.22-1.955H12.24z"/>
            </svg>
            Google
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-zinc-500">
          Already registered?{' '}
          <Link to="/login" state={{ email }} className="font-bold text-[#DFE104] hover:underline">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}
