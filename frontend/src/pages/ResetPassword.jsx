import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { authService, formatAuthError } from '../services/authService';
import { useToast } from '../components/ui/Toast';
import {
  validatePassword,
  calculatePasswordStrength
} from '../utils/passwordPolicy';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const oobCode = searchParams.get('oobCode');

  const [email, setEmail] = useState('');
  const [isValidatingCode, setIsValidatingCode] = useState(true);
  const [codeError, setCodeError] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Live password validation
  const passwordValidation = validatePassword(password, confirmPassword);
  const passwordStrength = calculatePasswordStrength(password);

  useEffect(() => {
    if (!oobCode) {
      setCodeError('Missing password reset verification code. Please request a new link.');
      setIsValidatingCode(false);
      return;
    }

    let isMounted = true;
    authService.verifyResetCode(oobCode)
      .then((accountEmail) => {
        if (isMounted) {
          setEmail(accountEmail);
          setIsValidatingCode(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setCodeError(formatAuthError(err));
          setIsValidatingCode(false);
        }
      });

    return () => { isMounted = false; };
  }, [oobCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!passwordValidation.isValid) {
      showToast(passwordValidation.errors[0] || 'Please satisfy all password requirements.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.confirmNewPassword(oobCode, password);
      setIsSuccess(true);
      showToast('Password reset successful! Please log in with your new password.', 'success');
    } catch (err) {
      showToast(formatAuthError(err), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#09090B] px-4 py-8 text-white">
      <div className="w-full max-w-md">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#DFE104]">Account Security</p>
        <h1 className="mt-2 text-4xl sm:text-5xl font-black uppercase tracking-tight">
          New Password
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-zinc-400">
          Create a new strong password for your single DECKKNOB account.
        </p>

        {isValidatingCode ? (
          <div className="mt-8 rounded-3xl border border-white/[0.08] bg-white/[0.02] p-8 text-center">
            <div className="h-8 w-8 rounded-full border-2 border-[#DFE104] border-t-transparent animate-spin mx-auto mb-3" />
            <p className="text-xs text-zinc-400">Verifying reset authorization link...</p>
          </div>
        ) : codeError ? (
          <div className="mt-6 rounded-3xl border border-red-500/20 bg-red-500/5 p-6 text-center">
            <div className="h-12 w-12 rounded-full bg-red-500/10 text-red-400 grid place-items-center text-xl mx-auto mb-3">
              ✕
            </div>
            <h2 className="text-sm font-bold text-red-400">Link Expired or Invalid</h2>
            <p className="mt-1 text-xs text-zinc-300 leading-relaxed max-w-xs mx-auto">
              {codeError}
            </p>
            <div className="mt-5">
              <Link
                to="/forgot-password"
                className="inline-block px-5 py-2.5 rounded-xl bg-[#DFE104] text-black font-black text-xs uppercase tracking-wider hover:bg-[#DFE104]/90 transition-all"
              >
                Request a New Reset Link
              </Link>
            </div>
          </div>
        ) : isSuccess ? (
          <div className="mt-6 rounded-3xl border border-green-500/20 bg-green-500/5 p-6 text-center">
            <div className="h-12 w-12 rounded-full bg-green-500/10 text-green-400 grid place-items-center text-xl mx-auto mb-3">
              ✓
            </div>
            <h2 className="text-base font-bold text-white">Password Updated!</h2>
            <p className="mt-1 text-xs text-zinc-300 leading-relaxed max-w-xs mx-auto">
              Your password has been changed. You can now log in using your new credentials.
            </p>
            <div className="mt-5">
              <Link
                to="/login"
                state={{ email }}
                className="inline-block w-full rounded-xl bg-[#DFE104] py-3 text-xs font-black uppercase tracking-wider text-black hover:bg-[#DFE104]/90 transition-all"
              >
                Log In Now
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="dk-panel mt-6 space-y-4 rounded-3xl p-5 sm:p-6 border border-white/[0.08] bg-white/[0.02]">
            {email && (
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3.5 py-2.5 text-xs text-zinc-300">
                Resetting password for: <strong className="text-white">{email}</strong>
              </div>
            )}

            {/* New Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
                  New Password
                </label>
                {password && (
                  <span className="text-xs font-bold" style={{ color: passwordStrength.color }}>
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
                  className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 pr-12 text-sm text-white outline-none focus:border-[#DFE104] transition-colors"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs font-bold"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>

              {/* Password Strength Progress Bar */}
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

                  <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-[11px]">
                    <span className={passwordValidation.requirements.minLength ? 'text-green-400' : 'text-zinc-500'}>
                      {passwordValidation.requirements.minLength ? '✓' : '○'} 12+ Chars
                    </span>
                    <span className={passwordValidation.requirements.hasUpper ? 'text-green-400' : 'text-zinc-500'}>
                      {passwordValidation.requirements.hasUpper ? '✓' : '○'} Uppercase
                    </span>
                    <span className={passwordValidation.requirements.hasLower ? 'text-green-400' : 'text-zinc-500'}>
                      {passwordValidation.requirements.hasLower ? '✓' : '○'} Lowercase
                    </span>
                    <span className={passwordValidation.requirements.hasNumber ? 'text-green-400' : 'text-zinc-500'}>
                      {passwordValidation.requirements.hasNumber ? '✓' : '○'} Number
                    </span>
                    <span className={passwordValidation.requirements.hasSpecial ? 'text-green-400' : 'text-zinc-500'}>
                      {passwordValidation.requirements.hasSpecial ? '✓' : '○'} Symbol
                    </span>
                    <span className={passwordValidation.requirements.notCommon ? 'text-green-400' : 'text-zinc-500'}>
                      {passwordValidation.requirements.notCommon ? '✓' : '○'} Unique phrase
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block mb-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`h-11 w-full rounded-xl border bg-white/[0.04] px-3.5 pr-12 text-sm text-white outline-none transition-colors ${
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

            <button
              type="submit"
              disabled={isSubmitting || !passwordValidation.isValid}
              className="dk-button h-12 w-full bg-[#DFE104] font-black uppercase tracking-[0.14em] text-black disabled:opacity-40 transition-all shadow-md active:scale-98"
            >
              {isSubmitting ? 'Saving New Password...' : 'Save Password & Continue'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
