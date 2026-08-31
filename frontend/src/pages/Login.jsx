import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import KineticMarquee from '../components/ui/KineticMarquee';
import authStore from '../stores/authStore';
import { authService } from '../services/authService';
import { useToast } from '../components/ui/Toast';

export default function Login() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
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
    if (!usernameOrEmail || !password) return;
    try {
      await login(usernameOrEmail, password);
      showToast('Welcome back to the underground!', 'success');
      navigate('/feed');
    } catch (err) {
      // Error handled by store
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

  const handleForgotPassword = async () => {
    if (!usernameOrEmail) {
      showToast('Please enter your email or username first to reset your password.', 'warning');
      return;
    }
    
    let email = usernameOrEmail;
    if (!usernameOrEmail.includes('@')) {
      showToast('Please enter your full email address in the field to reset password.', 'warning');
      return;
    }
    
    try {
      await authService.resetPassword(email);
      showToast('Password reset link sent to your email!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to send reset email.', 'error');
    }
  };

  return (
    <div className="grid min-h-screen bg-[#09090B] text-white lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative hidden overflow-hidden lg:block">
        <img src="https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1600&q=88" alt="Festival crowd" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/25 to-[#09090B]" />
        <div className="absolute inset-x-0 bottom-10">
          <KineticMarquee speed="20s">
            <span className="mr-8 text-8xl font-black uppercase tracking-[-0.08em] text-[#DFE104]">DECKKNOB</span>
            <span className="mr-8 text-8xl font-black uppercase tracking-[-0.08em]">FIND THE NIGHT</span>
          </KineticMarquee>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#DFE104]">DJ social network</p>
          <h1 className="mt-3 text-6xl font-black uppercase leading-[0.82] tracking-[-0.08em]">Enter Deckknob</h1>
          
          {error && (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="dk-panel mt-8 space-y-4 rounded-[2rem] p-5">
            <Field 
              label="Username or Email" 
              placeholder="maya.noise or you@deckknob.club" 
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              required 
            />
            <div className="space-y-1">
              <Field 
                label="Password" 
                placeholder="••••••••" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
              <div className="text-right">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-zinc-500 hover:text-[#DFE104] font-bold transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
            </div>
            
            <button 
              type="submit" 
              disabled={isLoading}
              className="dk-button h-12 w-full bg-[#DFE104] font-black uppercase tracking-[0.14em] text-black disabled:opacity-50"
            >
              {isLoading ? 'Entering...' : 'Login'}
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-white/5"></div>
              <span className="flex-shrink mx-4 text-xs font-bold uppercase tracking-[0.18em] text-zinc-600">Or connect with</span>
              <div className="flex-grow border-t border-white/5"></div>
            </div>

            <button 
              type="button" 
              onClick={handleGoogleLogin}
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
            New to the scene? <Link to="/signup" className="font-bold text-[#DFE104]">Create account</Link>
          </p>
        </div>
      </section>
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
