import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { authService, formatAuthError } from '../services/authService';
import { normalizeEmail } from '../utils/passwordPolicy';

export default function ForgotPassword() {
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await authService.resetPassword(cleanEmail);
      setIsSent(true);
    } catch (err) {
      if (err.code === 'auth/invalid-email') {
        setErrorMessage('Please enter a valid email address.');
      } else if (err.code === 'auth/network-request-failed') {
        setErrorMessage('Network connection failure. Please check your internet connection.');
      } else if (err.code === 'auth/too-many-requests') {
        setErrorMessage('Too many requests. Please wait a few moments before trying again.');
      } else {
        // For 'auth/user-not-found' or other generic codes, show generic confirmation to prevent user enumeration
        setIsSent(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#09090B] px-4 py-8 text-white">
      <div className="w-full max-w-md">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#DFE104]">Account Security</p>
        <h1 className="mt-2 text-4xl sm:text-5xl font-black uppercase tracking-tight">
          Recover Password
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-zinc-400">
          Enter your registered email address and we'll send you a secure link to reset your password.
        </p>

        {isSent ? (
          <div className="mt-6 rounded-3xl border border-white/[0.08] bg-white/[0.02] p-6 text-center">
            <div className="h-14 w-14 rounded-full bg-[#DFE104]/10 border border-[#DFE104]/30 grid place-items-center text-2xl mx-auto mb-4">
              ✉️
            </div>
            <h2 className="text-base font-bold text-white">Check Your Inbox</h2>
            <p className="mt-2 text-xs text-zinc-300 leading-relaxed max-w-xs mx-auto">
              If an account matches <strong className="text-white">{email}</strong>, recovery instructions have been sent. The link expires shortly for your security.
            </p>
            <div className="mt-6 space-y-2">
              <Link
                to="/login"
                state={{ email }}
                className="block w-full rounded-xl bg-[#DFE104] py-3 text-xs font-black uppercase tracking-wider text-black hover:bg-[#DFE104]/90 transition-all text-center"
              >
                Return to Login
              </Link>
              <button
                type="button"
                onClick={() => setIsSent(false)}
                className="block w-full rounded-xl bg-white/[0.04] py-2.5 text-xs font-bold text-zinc-400 hover:text-white transition-all text-center"
              >
                Send to a different email
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="dk-panel mt-6 space-y-4 rounded-3xl p-5 sm:p-6 border border-white/[0.08] bg-white/[0.02]">
            {errorMessage && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
                {errorMessage}
              </div>
            )}

            <div>
              <label className="block mb-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
                Email Address
              </label>
              <input
                type="email"
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 text-sm text-white outline-none focus:border-[#DFE104] transition-colors"
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !email.trim()}
              className="dk-button h-12 w-full bg-[#DFE104] font-black uppercase tracking-[0.14em] text-black disabled:opacity-40 transition-all shadow-md active:scale-98"
            >
              {isSubmitting ? 'Sending Link...' : 'Send Recovery Link'}
            </button>

            <div className="text-center pt-2">
              <Link to="/login" className="text-xs text-zinc-500 hover:text-white transition-colors">
                ← Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
