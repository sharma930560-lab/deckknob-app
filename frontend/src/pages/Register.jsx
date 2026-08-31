import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import IconsaxAnimated from '../components/icons/IconsaxAnimated';
import authStore from '../stores/authStore';
import { authAPI } from '../utils/authUtils';
import { useToast } from '../components/ui/Toast';

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
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('dj');
  const navigate = useNavigate();
  const { showToast } = useToast();

  const { register, loginWithGoogle, error, clearError, isLoading, isAuthenticated } = authStore();

  const handleGoogleSignup = async () => {
    try {
      await loginWithGoogle();
      showToast('Welcome to DECKKNOB!', 'success');
      navigate('/onboarding');
    } catch (err) {
      showToast(err.message || 'Google Sign-up failed', 'error');
    }
  };

  // Username check state
  const [usernameStatus, setUsernameStatus] = useState(null); // null | 'checking' | 'available' | 'taken'
  const [suggestions, setSuggestions] = useState([]);
  const debouncedUsername = useDebounce(username, 500);

  useEffect(() => {
    clearError();
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !email || !password) return;
    if (usernameStatus === 'taken' || usernameStatus === 'checking') {
      showToast('Please choose an available username first.', 'warning');
      return;
    }
    try {
      await register(username, email, password, role);
      showToast('Account created successfully! Verification email sent.', 'success');
      navigate('/onboarding');
    } catch (err) {
      // Error handled by store
      showToast(err.message || 'Registration failed.', 'error');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#09090B] px-5 py-10 text-white">
      <div className="w-full max-w-lg">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#DFE104]">Join the underground</p>
        <h1 className="mt-3 text-6xl font-black uppercase leading-[0.82] tracking-[-0.08em]">Build your signal</h1>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="dk-panel mt-8 space-y-4 rounded-[2rem] p-5">
          {/* Username field with live check */}
          <div>
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Username</span>
              <div className="relative">
                <input
                  className={`h-12 w-full rounded-2xl border bg-white/[0.04] px-4 pr-12 text-sm outline-none transition-colors ${
                    usernameStatus === 'available'
                      ? 'border-green-500 focus:border-green-400'
                      : usernameStatus === 'taken'
                      ? 'border-red-500 focus:border-red-400'
                      : 'border-white/[0.08] focus:border-[#DFE104]'
                  }`}
                  placeholder="dj_underground"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  required
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-base">
                  {usernameStatus === 'checking' && <span className="animate-spin inline-block text-zinc-400">⟳</span>}
                  {usernameStatus === 'available' && <span className="text-green-500">✓</span>}
                  {usernameStatus === 'taken' && <span className="text-red-500">✗</span>}
                </span>
              </div>
            </label>

            {/* Status messages */}
            {usernameStatus === 'available' && (
              <p className="mt-1 text-xs text-green-500 font-bold">✓ Username is available</p>
            )}
            {usernameStatus === 'taken' && (
              <div className="mt-2">
                <p className="text-xs text-red-400 font-bold mb-2">✗ Username already taken. Try one of these:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setUsername(s);
                        setUsernameStatus(null);
                        setSuggestions([]);
                      }}
                      className="rounded-xl border border-[#DFE104]/40 bg-[#DFE104]/10 px-3 py-1 text-xs font-bold text-[#DFE104] hover:bg-[#DFE104]/20 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Field
            label="Email"
            placeholder="you@deckknob.club"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Field
            label="Password"
            placeholder="••••••••"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div>
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">I am a</span>
            <div className="grid grid-cols-3 gap-2">
              {roles.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setRole(item.id)}
                  className={`rounded-3xl border p-4 text-center transition-colors ${
                    role === item.id ? 'border-[#DFE104] bg-[#DFE104] text-black' : 'border-white/[0.08] bg-white/[0.04] text-zinc-400'
                  }`}
                >
                  <IconsaxAnimated name={item.icon} size={24} className="mx-auto" filled={role === item.id} />
                  <span className="mt-2 block text-xs font-black uppercase tracking-[0.12em]">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={isLoading || usernameStatus === 'taken' || usernameStatus === 'checking'}
            className="dk-button h-12 w-full bg-[#DFE104] font-black uppercase tracking-[0.14em] text-black disabled:opacity-50"
          >
            {isLoading ? 'Creating account...' : 'Create Account & Continue'}
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-white/5"></div>
            <span className="flex-shrink mx-4 text-xs font-bold uppercase tracking-[0.18em] text-zinc-600">Or sign up with</span>
            <div className="flex-grow border-t border-white/5"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={isLoading}
            className="dk-button h-12 w-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white font-black uppercase tracking-[0.14em] flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.7 0 3.25.61 4.47 1.625l2.437-2.437C17.312 1.696 14.933 1 12.24 1 6.58 1 2 5.58 2 11.24s4.58 10.24 10.24 10.24c5.795 0 10.254-4.074 10.254-10.24 0-.695-.08-1.355-.22-1.955H12.24z"/>
            </svg>
            Google
          </button>
        </form>
        <p className="mt-5 text-sm text-zinc-500">
          Already in? <Link to="/login" className="font-bold text-[#DFE104]">Login</Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">{label}</span>
      <input className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 text-sm outline-none transition-colors focus:border-[#DFE104]" {...props} />
    </label>
  );
}
