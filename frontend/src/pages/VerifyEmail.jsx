import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../config/firebase';
import { authService, formatAuthError } from '../services/authService';
import { useToast } from '../components/ui/Toast';
import authStore from '../stores/authStore';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { logout } = authStore();

  const [email, setEmail] = useState(auth.currentUser?.email || location.state?.email || '');
  const [isChecking, setIsChecking] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Auto-decrement cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Check if already verified on mount
  useEffect(() => {
    if (auth.currentUser?.emailVerified) {
      navigate('/feed');
    }
  }, [navigate]);

  const handleCheckStatus = async () => {
    if (!auth.currentUser) {
      navigate('/login');
      return;
    }

    setIsChecking(true);
    try {
      const isVerified = await authService.reloadUser(auth.currentUser);
      if (isVerified) {
        showToast('Email verified! Welcome to DECKKNOB.', 'success');
        navigate('/feed');
      } else {
        showToast('Email is not verified yet. Please check your inbox and click the link.', 'info');
      }
    } catch (err) {
      showToast(formatAuthError(err), 'error');
    } finally {
      setIsChecking(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isSending) return;
    if (!auth.currentUser) {
      showToast('Please sign in to resend the verification email.', 'warning');
      navigate('/login');
      return;
    }

    setIsSending(true);
    try {
      await authService.sendVerificationEmail(auth.currentUser);
      showToast('Verification email resent! Please check your inbox.', 'success');
      setResendCooldown(60); // 60s cooldown
    } catch (err) {
      showToast(formatAuthError(err), 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#09090B] px-4 py-8 text-white">
      <div className="w-full max-w-md text-center">
        <div className="h-16 w-16 rounded-full bg-[#DFE104]/10 border border-[#DFE104]/30 grid place-items-center text-3xl mx-auto mb-4">
          📧
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#DFE104]">Verification Required</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-black uppercase tracking-tight">
          Verify Your Email
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-zinc-300 max-w-xs mx-auto leading-relaxed">
          We sent a verification link to <strong className="text-white">{email || 'your email'}</strong>. Please click the link in your inbox to activate your account.
        </p>

        <div className="dk-panel mt-6 rounded-3xl p-6 border border-white/[0.08] bg-white/[0.02] space-y-3">
          <button
            onClick={handleCheckStatus}
            disabled={isChecking}
            className="w-full rounded-xl bg-[#DFE104] py-3 text-xs font-black uppercase tracking-wider text-black hover:bg-[#DFE104]/90 transition-all shadow-md active:scale-98 disabled:opacity-50"
          >
            {isChecking ? 'Checking Status...' : "I've Verified My Email"}
          </button>

          <button
            onClick={handleResend}
            disabled={resendCooldown > 0 || isSending}
            className="w-full rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] py-2.5 text-xs font-bold text-zinc-300 hover:text-white transition-all disabled:opacity-40"
          >
            {isSending
              ? 'Sending...'
              : resendCooldown > 0
              ? `Resend available in ${resendCooldown}s`
              : 'Resend Verification Email'}
          </button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-zinc-500">
          <button
            onClick={handleSignOut}
            className="hover:text-white transition-colors underline"
          >
            Sign out / Use another email
          </button>
          <span>•</span>
          <Link to="/feed" className="hover:text-white transition-colors">
            Continue to Feed →
          </Link>
        </div>
      </div>
    </div>
  );
}
