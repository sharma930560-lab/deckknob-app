import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import KineticMarquee from '../components/ui/KineticMarquee';
import authStore from '../stores/authStore';
import { useToast } from '../components/ui/Toast';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const [usernameOrEmail, setUsernameOrEmail] = useState(location.state?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { login, loginWithGoogle, error, clearError, isLoading, isAuthenticated } = authStore();

  useEffect(() => {
    clearError();
  }, [clearError]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/feed');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!usernameOrEmail.trim() || !password) return;
    try {
      await login(usernameOrEmail.trim(), password);
      showToast('Welcome back to DECKKNOB!', 'success');
      navigate('/feed');
    } catch {
      // Error is set in store and displayed in UI
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      showToast('Successfully logged in with Google!', 'success');
      navigate('/feed');
    } catch (err) {
      showToast(err.message || 'Google Login failed', 'error');
    }
  };

  return (
    <div className="grid min-h-screen bg-[#09090B] text-white lg:grid-cols-[1.1fr_0.9fr]">
      {/* Brand Visual Left Pane */}
      <section className="relative hidden overflow-hidden lg:block">
        <img
          src="https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1600&q=88"
          alt="Festival crowd"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/25 to-[#09090B]" />
        <div className="absolute inset-x-0 bottom-10">
          <KineticMarquee speed="20s">
            <span className="mr-8 text-8xl font-black uppercase tracking-[-0.08em] text-[#DFE104]">DECKKNOB</span>
            <span className="mr-8 text-8xl font-black uppercase tracking-[-0.08em]">FIND THE NIGHT</span>
          </KineticMarquee>
        </div>
      </section>

      {/* Login Form Right Pane */}
      <section className="flex items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-md">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#DFE104]">DJ social network</p>
          <h1 className="mt-2 text-5xl sm:text-6xl font-black uppercase leading-[0.85] tracking-[-0.06em]">
            Enter Deckknob
          </h1>
          <p className="mt-2 text-xs text-zinc-400">
            Sign in to your single verified account to access direct messages, sets, and community.
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs sm:text-sm text-red-400 leading-relaxed">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="dk-panel mt-6 space-y-4 rounded-3xl p-5 sm:p-6 border border-white/[0.08] bg-white/[0.02]">
            <div>
              <label className="block mb-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
                Username or Email
              </label>
              <input
                type="text"
                placeholder="maya.noise or you@domain.com"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 text-sm text-white outline-none focus:border-[#DFE104] transition-colors"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  state={{ email: usernameOrEmail.includes('@') ? usernameOrEmail.trim() : '' }}
                  className="text-xs text-zinc-400 hover:text-[#DFE104] font-semibold transition-colors py-1 px-1.5 -mr-1.5 select-none focus:outline-none focus:text-[#DFE104]"
                >
                  Forgot Password?
                </Link>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 pr-12 text-sm text-white outline-none focus:border-[#DFE104] transition-colors"
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
            </div>

            <button
              type="submit"
              disabled={isLoading || !usernameOrEmail.trim() || !password}
              className="dk-button h-12 w-full bg-[#DFE104] font-black uppercase tracking-[0.14em] text-black disabled:opacity-40 transition-all shadow-md active:scale-98"
            >
              {isLoading ? 'Entering...' : 'Log In'}
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-white/5"></div>
              <span className="flex-shrink mx-3 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600">Or connect with</span>
              <div className="flex-grow border-t border-white/5"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
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
            New to DECKKNOB?{' '}
            <Link to="/signup" className="font-bold text-[#DFE104] hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
