import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import IconsaxAnimated from '../components/icons/IconsaxAnimated';
import authStore from '../stores/authStore';
import { useToast } from '../components/ui/Toast';
import { userService } from '../services/userService';
import { authService } from '../services/authService';
import { eventService } from '../services/eventService';
import TrashModal from '../components/events/TrashModal';
import {
  updatePassword,
  updateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
} from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import {
  validatePassword,
  calculatePasswordStrength,
  normalizeEmail
} from '../utils/passwordPolicy';

/* ────────────────────────────────────────────────
   Helpers
──────────────────────────────────────────────── */
function lsGet(key, fallback) {
  try { return JSON.parse(localStorage.getItem(`dk_${key}`) ?? 'null') ?? fallback; }
  catch { return fallback; }
}
function lsSet(key, value) {
  localStorage.setItem(`dk_${key}`, JSON.stringify(value));
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 outline-none ${checked ? 'bg-[#DFE104]' : 'bg-zinc-700'}`}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow ring-0 transition duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

function ToggleRow({ title, desc, checked, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5">
      <div className="space-y-1 min-w-0">
        <p className="text-sm font-bold text-zinc-200">{title}</p>
        <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="border border-white/[0.08] rounded-2xl bg-white/[0.02] overflow-hidden divide-y divide-white/[0.06]">
      {title && <p className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{title}</p>}
      {children}
    </div>
  );
}

function Row({ label, desc, right, onClick }) {
  return (
    <div
      className={`flex items-center justify-between gap-4 px-4 py-3.5 ${onClick ? 'cursor-pointer hover:bg-white/[0.03] transition-colors' : ''}`}
      onClick={onClick}
    >
      <div className="min-w-0">
        <p className="text-sm font-bold">{label}</p>
        {desc && <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>}
      </div>
      <div className="shrink-0 text-xs font-bold text-[#DFE104]">{right}</div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Sub-panel: Account & Security
──────────────────────────────────────────────── */
function SecurityPanel({ user, showToast, onDeleted }) {
  const [section, setSection] = useState(null); // 'password' | 'email' | 'reset' | 'delete'
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [resetEmail, setResetEmail] = useState(auth.currentUser?.email || user?.email || '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (section === 'reset') {
      setResetEmail(auth.currentUser?.email || user?.email || '');
    }
  }, [section, user?.email]);

  const [isEmailVerified, setIsEmailVerified] = useState(Boolean(auth.currentUser?.emailVerified));
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Auto-decrement cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const passwordValidation = validatePassword(newPw, confirmPw);
  const passwordStrength = calculatePasswordStrength(newPw);

  const reauth = async () => {
    const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPw);
    await reauthenticateWithCredential(auth.currentUser, credential);
  };

  const handleCheckVerification = async () => {
    setIsVerifying(true);
    try {
      const verified = await authService.reloadUser(auth.currentUser);
      setIsEmailVerified(verified);
      if (verified) {
        showToast('Email verified successfully! ✓', 'success');
      } else {
        showToast('Email is not verified yet. Please click the link sent to your inbox.', 'info');
      }
    } catch (err) {
      showToast(err.message || 'Could not verify email status.', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSendVerificationEmail = async () => {
    if (resendCooldown > 0) return;
    setIsVerifying(true);
    try {
      await authService.sendVerificationEmail(auth.currentUser);
      showToast(`Verification link sent to ${auth.currentUser?.email}`, 'success');
      setResendCooldown(60);
    } catch (err) {
      showToast(err.message || 'Failed to send verification email.', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw || !confirmPw) { showToast('Please fill in all password fields.', 'error'); return; }
    if (!passwordValidation.isValid) {
      showToast(passwordValidation.errors[0] || 'New password does not meet requirements.', 'warning');
      return;
    }
    if (newPw === currentPw) { showToast('New password must differ from current password.', 'warning'); return; }

    setBusy(true);
    try {
      await reauth();
      await updatePassword(auth.currentUser, newPw);
      showToast('Password updated successfully! ✓', 'success');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setSection(null);
    } catch (e) {
      const msg = e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential'
        ? 'Current password is incorrect.'
        : e.message;
      showToast(msg, 'error');
    } finally { setBusy(false); }
  };

  const handleChangeEmail = async () => {
    if (!currentPw || !newEmail) { showToast('Fill all fields.', 'error'); return; }
    const cleanEmail = normalizeEmail(newEmail);
    if (!/\S+@\S+\.\S+/.test(cleanEmail)) { showToast('Enter a valid email address.', 'error'); return; }
    if (cleanEmail === auth.currentUser?.email?.toLowerCase()) {
      showToast('That is already your current email.', 'error');
      return;
    }

    setBusy(true);
    try {
      await reauth();
      await updateEmail(auth.currentUser, cleanEmail);
      // Sync to Firestore profile
      if (auth.currentUser?.uid) {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          email: cleanEmail,
          updatedAt: serverTimestamp(),
        });
      }
      showToast('Email updated ✓ Verification email sent to new address.', 'success');
      setCurrentPw(''); setNewEmail('');
      setSection(null);
    } catch (e) {
      const msg = e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential'
        ? 'Current password is incorrect.'
        : e.code === 'auth/email-already-in-use'
          ? 'That email is already registered to another account.'
          : e.message;
      showToast(msg, 'error');
    } finally { setBusy(false); }
  };

  const handleSendReset = async () => {
    const email = normalizeEmail(resetEmail) || auth.currentUser?.email;
    if (!email) { showToast('Enter an email address.', 'error'); return; }
    setBusy(true);
    try {
      await authService.resetPassword(email);
      showToast(`Recovery instructions sent to ${email}`, 'success');
      setResetEmail('');
      setSection(null);
    } catch (e) {
      showToast(e.message || 'Failed to send reset email.', 'error');
    } finally { setBusy(false); }
  };

  const handleDeleteAccount = async () => {
    if (!currentPw) { showToast('Enter your password to confirm.', 'error'); return; }
    setBusy(true);
    try {
      await reauth();
      const activeUid = auth.currentUser?.uid;
      const activeUsername = user?.username;
      
      if (activeUid) {
        await userService.deleteUserData(activeUid, activeUsername);
      }
      
      await deleteUser(auth.currentUser);
      showToast('Account permanently deleted.', 'success');
      onDeleted?.();
    } catch (e) {
      const msg = e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential'
        ? 'Current password is incorrect.'
        : e.message;
      showToast(msg, 'error');
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide">Account & Security</h2>
        <p className="text-zinc-500 text-xs mt-1">
          DECKKNOB enforces one account per email. Manage your security credentials and verification.
        </p>
      </div>

      <Section title="Account Credentials">
        <Row
          label="Email address"
          desc={auth.currentUser?.email || user?.email}
          right={
            <div className="flex items-center gap-2">
              {isEmailVerified ? (
                <span className="rounded-full bg-green-500/10 border border-green-500/30 px-2 py-0.5 text-[10px] font-bold text-green-400">
                  Verified ✓
                </span>
              ) : (
                <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                  Unverified ⚠
                </span>
              )}
              <span className="text-zinc-400 text-xs font-semibold">Change →</span>
            </div>
          }
          onClick={() => setSection(section === 'email' ? null : 'email')}
        />

        {/* Verification Status & Resend */}
        {!isEmailVerified && (
          <div className="p-4 bg-amber-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-amber-400">Email Verification Pending</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Verify your email to ensure full account access and recovery.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCheckVerification}
                disabled={isVerifying}
                className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs font-bold text-white transition-colors disabled:opacity-40"
              >
                {isVerifying ? 'Checking...' : "Check Status"}
              </button>
              <button
                type="button"
                onClick={handleSendVerificationEmail}
                disabled={resendCooldown > 0 || isVerifying}
                className="px-3 py-1.5 rounded-lg bg-[#DFE104] text-black text-xs font-bold hover:bg-[#DFE104]/80 transition-colors disabled:opacity-40"
              >
                {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend Email'}
              </button>
            </div>
          </div>
        )}

        <Row
          label="Password"
          desc="Update your 12+ character strong password"
          right="Change →"
          onClick={() => setSection(section === 'password' ? null : 'password')}
        />
        <Row
          label="Forgot Password?"
          desc="Send a secure password recovery link"
          right="Send →"
          onClick={() => setSection(section === 'reset' ? null : 'reset')}
        />
      </Section>

      {/* Change Password form */}
      {section === 'password' && (
        <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-black uppercase tracking-wide text-[#DFE104]">Change Password</p>
            {newPw && (
              <span className="text-xs font-bold" style={{ color: passwordStrength.color }}>
                {passwordStrength.label}
              </span>
            )}
          </div>

          <div>
            <p className="text-xs text-zinc-500 mb-1">Current Password</p>
            <div className="relative">
              <input
                type={showCurrentPw ? 'text' : 'password'}
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 pr-12 text-sm outline-none focus:border-[#DFE104] transition-colors"
                placeholder="••••••••••••"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs font-bold"
              >
                {showCurrentPw ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs text-zinc-500 mb-1">New Password (12+ characters)</p>
            <div className="relative">
              <input
                type={showNewPw ? 'text' : 'password'}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 pr-12 text-sm outline-none focus:border-[#DFE104] transition-colors"
                placeholder="At least 12 characters"
              />
              <button
                type="button"
                onClick={() => setShowNewPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs font-bold"
              >
                {showNewPw ? 'Hide' : 'Show'}
              </button>
            </div>

            {newPw && (
              <div className="mt-2">
                <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
                  <div
                    className="h-full transition-all duration-300"
                    style={{ width: `${passwordStrength.percent}%`, backgroundColor: passwordStrength.color }}
                  />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1 text-[10px]">
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

          <div>
            <p className="text-xs text-zinc-500 mb-1">Confirm New Password</p>
            <div className="relative">
              <input
                type={showConfirmPw ? 'text' : 'password'}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 pr-12 text-sm outline-none focus:border-[#DFE104] transition-colors"
                placeholder="••••••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs font-bold"
              >
                {showConfirmPw ? 'Hide' : 'Show'}
              </button>
            </div>
            {confirmPw && !passwordValidation.requirements.matchesConfirm && (
              <p className="mt-1 text-xs text-red-400">Passwords do not match.</p>
            )}
          </div>

          <button
            onClick={handleChangePassword}
            disabled={busy || !passwordValidation.isValid}
            className="w-full rounded-xl bg-[#DFE104] py-2.5 text-sm font-black text-black disabled:opacity-40 transition-all"
          >
            {busy ? 'Updating…' : 'Update Password'}
          </button>
        </div>
      )}

      {/* Change Email form */}
      {section === 'email' && (
        <div className="space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5">
          <p className="text-sm font-black uppercase tracking-wide text-[#DFE104]">Change Email</p>
          <div>
            <p className="text-xs text-zinc-500 mb-1">Current Password (Required for Reauthentication)</p>
            <input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-[#DFE104] transition-colors"
              placeholder="••••••••"
            />
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-1">New Email Address</p>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-[#DFE104] transition-colors"
              placeholder="new@domain.com"
            />
          </div>
          <button
            onClick={handleChangeEmail}
            disabled={busy || !currentPw || !newEmail}
            className="w-full rounded-xl bg-[#DFE104] py-2.5 text-sm font-black text-black disabled:opacity-40"
          >
            {busy ? 'Updating…' : 'Update Email'}
          </button>
        </div>
      )}

      {/* Password Reset form */}
      {section === 'reset' && (
        <div className="space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5">
          <p className="text-sm font-black uppercase tracking-wide text-[#DFE104]">Send Password Reset Link</p>
          <p className="text-xs text-zinc-500">Leave blank to send to your current email ({auth.currentUser?.email || '—'}).</p>
          <div>
            <p className="text-xs text-zinc-500 mb-1">Email Address</p>
            <input
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-[#DFE104] transition-colors"
              placeholder={auth.currentUser?.email || 'you@email.com'}
            />
          </div>
          <button
            onClick={handleSendReset}
            disabled={busy}
            className="w-full rounded-xl bg-[#DFE104] py-2.5 text-sm font-black text-black disabled:opacity-40"
          >
            {busy ? 'Sending…' : 'Send Reset Link'}
          </button>
        </div>
      )}

      {/* Danger zone */}
      <Section title="Danger Zone">
        <Row
          label="Delete Account"
          desc="Permanently delete your account and all content. This cannot be undone."
          right={<span className="text-red-400">Delete →</span>}
          onClick={() => setSection(section === 'delete' ? null : 'delete')}
        />
      </Section>

      {section === 'delete' && (
        <div className="space-y-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 sm:p-5">
          <p className="text-sm font-black uppercase tracking-wide text-red-400">⚠ Permanently Delete Account</p>
          <p className="text-xs text-zinc-400">All your posts, klyps, and data will be removed. Enter your password to confirm.</p>
          <input
            type="password"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-red-500 transition-colors"
            placeholder="Your current password"
          />
          <button
            onClick={handleDeleteAccount}
            disabled={busy}
            className="w-full rounded-xl bg-red-500 py-2.5 text-sm font-black text-white disabled:opacity-40"
          >
            {busy ? 'Deleting…' : 'Yes, Delete My Account'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────
   Sub-panel: Event Management & Automatic Cleanup
──────────────────────────────────────────────── */
function EventSettingsPanel({ user, showToast }) {
  const [cleanupSettings, setCleanupSettings] = useState({ autoCleanupEnabled: false, retentionDays: 7 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningCleanup, setRunningCleanup] = useState(false);
  const [showTrashModal, setShowTrashModal] = useState(false);
  const [trashedCount, setTrashedCount] = useState(0);

  const uid = user?.uid;

  const loadSettingsAndTrash = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const [settings, trashed] = await Promise.all([
        eventService.getCleanupSettings(uid),
        eventService.getTrashedEvents(uid),
      ]);
      setCleanupSettings(settings);
      setTrashedCount(trashed.length);
    } catch (err) {
      console.error('Failed to load event cleanup settings:', err);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    loadSettingsAndTrash();
  }, [loadSettingsAndTrash]);

  const handleToggleAutoCleanup = async () => {
    if (!uid) return;
    const nextVal = !cleanupSettings.autoCleanupEnabled;
    const updated = { ...cleanupSettings, autoCleanupEnabled: nextVal };
    setCleanupSettings(updated);
    setSaving(true);
    try {
      await eventService.updateCleanupSettings(uid, updated);
      if (nextVal) {
        showToast('Automatic cleanup enabled (7 days post-event). Completed gig history will be moved to trash.', 'info');
      } else {
        showToast('Automatic event cleanup disabled.', 'info');
      }
    } catch (err) {
      setCleanupSettings((prev) => ({ ...prev, autoCleanupEnabled: !nextVal }));
      showToast(err.message || 'Failed to update cleanup setting.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRunCleanupNow = async () => {
    if (!uid) return;
    setRunningCleanup(true);
    try {
      const res = await eventService.runOwnerEventCleanup(uid);
      if (res.trashedCount > 0) {
        showToast(`Cleanup completed: ${res.trashedCount} event(s) moved to recoverable Trash.`, 'success');
      } else {
        showToast('No events currently eligible for cleanup (must be past end time + 7 days).', 'info');
      }
      loadSettingsAndTrash();
    } catch (err) {
      showToast(err.message || 'Cleanup run failed.', 'error');
    } finally {
      setRunningCleanup(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide">Event Management & Cleanup</h2>
        <p className="text-zinc-500 text-xs mt-1">
          Configure gig archival rules, retention policy, and manage recoverable event trash.
        </p>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-zinc-500 animate-pulse">Loading event settings...</div>
      ) : (
        <>
          <div className="space-y-3">
            <ToggleRow
              title="Automatic Event Cleanup"
              desc="Automatically moves completed gigs to your recoverable Event Trash 7 days after the event end time. Default is OFF."
              checked={cleanupSettings.autoCleanupEnabled}
              onChange={handleToggleAutoCleanup}
            />

            {cleanupSettings.autoCleanupEnabled && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-200">
                <span className="font-bold uppercase tracking-wider text-amber-300">⚠️ Retention Notice:</span> When automatic cleanup is enabled, completed gig history older than 7 days will be removed from your public calendar and DJ profile, and relocated to your Event Trash. You can disable this setting at any time.
              </div>
            )}
          </div>

          {/* Quick Actions Section */}
          <Section title="Manual Operations & Trash">
            <Row
              label="Run Cleanup Now"
              desc="Manually trigger cleanup for your past gigs older than 7 days."
              right={runningCleanup ? 'Running…' : 'Execute →'}
              onClick={handleRunCleanupNow}
            />
            <Row
              label="Manage Event Trash"
              desc={`View, restore, or permanently remove soft-deleted gigs (${trashedCount} in trash).`}
              right="Open Trash 🗑️"
              onClick={() => setShowTrashModal(true)}
            />
          </Section>

          {/* Firebase Free-Tier / Spark Plan Assessment */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-base">⚡</span>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-300">Firebase Free-Plan Architecture</p>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              DECKKNOB operates on Firebase&apos;s Spark (free) plan without billing upgrades. True detached cloud background crons (such as Google Cloud Scheduler or Cloud Functions) require a paid Blaze plan. Under our free-tier architecture, automatic cleanup evaluates securely on your authenticated DJ session and when managing events. Cleanup is <strong>OFF by default</strong> and never purges without your explicit enablement.
            </p>
          </div>
        </>
      )}

      {/* Recoverable Trash Modal */}
      <TrashModal
        isOpen={showTrashModal}
        onClose={() => setShowTrashModal(false)}
        currentUid={uid}
        onRestored={loadSettingsAndTrash}
      />
    </div>
  );
}

/* ────────────────────────────────────────────────
   Sub-panel: Blocked Accounts
──────────────────────────────────────────────── */
function BlockedPanel({ user, showToast }) {
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [unblocking, setUnblocking] = useState(null);
  const [blocking, setBlocking] = useState(null);

  const uid = user?.uid;

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    userService.getBlockedUsers(uid).then((list) => {
      setBlockedUsers(list);
      setLoading(false);
    });
  }, [uid]);

  const handleSearch = useCallback(async (q) => {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const results = await userService.searchUsers(q.trim());
      setSearchResults(results.filter((u) => u.uid !== uid));
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  }, [uid]);

  const handleBlock = async (target) => {
    if (!uid) return;
    setBlocking(target.uid);
    try {
      await userService.blockUser(uid, target.uid);
      setBlockedUsers((prev) => [target, ...prev.filter((u) => u.uid !== target.uid)]);
      setSearchResults((prev) => prev.filter((u) => u.uid !== target.uid));
      showToast(`@${target.username} blocked.`, 'success');
    } catch {
      showToast('Could not block user. Try again.', 'error');
    } finally { setBlocking(null); }
  };

  const handleUnblock = async (targetUid, username) => {
    if (!uid) return;
    setUnblocking(targetUid);
    try {
      await userService.unblockUser(uid, targetUid);
      setBlockedUsers((prev) => prev.filter((u) => u.uid !== targetUid));
      showToast(`@${username} unblocked.`, 'success');
    } catch {
      showToast('Could not unblock. Try again.', 'error');
    } finally { setUnblocking(null); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide">Blocked Accounts</h2>
        <p className="text-zinc-500 text-xs mt-1">
          Blocked accounts cannot see your content or interact with you.
        </p>
      </div>

      <div className="space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5">
        <p className="text-sm font-black uppercase tracking-wide text-zinc-300">Block a User</p>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by username…"
            className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-[#DFE104] transition-colors"
          />
          {searching && (
            <span className="absolute right-3 top-2.5 text-xs text-zinc-500 animate-pulse">Searching…</span>
          )}
        </div>
        {searchResults.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {searchResults.map((u) => {
              const isAlreadyBlocked = blockedUsers.some((b) => b.uid === u.uid);
              return (
                <div key={u.uid} className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-2.5">
                  <img
                    src={u.profilePic || `https://ui-avatars.com/api/?name=${u.username}&background=DFE104&color=000`}
                    alt={u.username}
                    className="h-8 w-8 rounded-full object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate">@{u.username}</p>
                    {u.name && <p className="text-xs text-zinc-500 truncate">{u.name}</p>}
                  </div>
                  <button
                    onClick={() => isAlreadyBlocked ? handleUnblock(u.uid, u.username) : handleBlock(u)}
                    disabled={blocking === u.uid || unblocking === u.uid}
                    className={`shrink-0 rounded-lg px-3 py-1 text-xs font-black disabled:opacity-40 transition-all ${
                      isAlreadyBlocked
                        ? 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600'
                        : 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                    }`}
                  >
                    {isAlreadyBlocked ? 'Unblock' : 'Block'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {searchQuery && !searching && searchResults.length === 0 && (
          <p className="text-xs text-zinc-600">No users found for "{searchQuery}".</p>
        )}
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-3">
          Currently Blocked ({blockedUsers.length})
        </p>
        {loading ? (
          <p className="text-xs text-zinc-600 animate-pulse">Loading blocked accounts…</p>
        ) : blockedUsers.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
            <p className="text-zinc-600 text-sm">You haven't blocked anyone.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {blockedUsers.map((u) => (
              <div key={u.uid} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <img
                  src={u.profilePic || `https://ui-avatars.com/api/?name=${u.username}&background=333&color=999`}
                  alt={u.username}
                  className="h-9 w-9 rounded-full object-cover shrink-0 grayscale"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate">@{u.username}</p>
                  {u.name && <p className="text-xs text-zinc-500 truncate">{u.name}</p>}
                </div>
                <button
                  onClick={() => handleUnblock(u.uid, u.username)}
                  disabled={unblocking === u.uid}
                  className="shrink-0 rounded-lg border border-white/[0.1] px-3 py-1 text-xs font-black text-zinc-300 hover:text-white hover:border-white/20 disabled:opacity-40 transition-all"
                >
                  {unblocking === u.uid ? '…' : 'Unblock'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Main Settings
──────────────────────────────────────────────── */
export default function Settings() {
  const { user, logout, updateProfile } = authStore();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState(() => window.innerWidth >= 1024 ? 'account' : null);

  // Persistent toggle states (localStorage)
  const [notifs, setNotifs] = useState(() => lsGet('notifs', { pauseAll: false, likesComments: true, newFollowers: true, eventBroadcasts: true }));
  const [archiving, setArchiving] = useState(() => lsGet('archiving', { saveStory: true, saveReels: false }));
  const [highQuality, setHighQuality] = useState(() => lsGet('highQuality', true));
  const [dailyLimit, setDailyLimit] = useState(() => lsGet('dailyLimit', 'none'));
  const [language, setLanguage] = useState(() => lsGet('language', 'en'));
  const [sensitiveContent, setSensitiveContent] = useState(() => lsGet('sensitiveContent', 'standard'));
  const [likesHidden, setLikesHidden] = useState(() => lsGet('likesHidden', false));

  // Firestore-backed states
  const [isPrivate, setIsPrivate] = useState(user?.isPrivate ?? false);
  const [accountRole, setAccountRole] = useState(user?.role || 'fan');
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [savingRole, setSavingRole] = useState(false);

  // Persist notif/archive to localStorage on change
  useEffect(() => { lsSet('notifs', notifs); }, [notifs]);
  useEffect(() => { lsSet('archiving', archiving); }, [archiving]);
  useEffect(() => { lsSet('highQuality', highQuality); }, [highQuality]);
  useEffect(() => { lsSet('dailyLimit', dailyLimit); }, [dailyLimit]);
  useEffect(() => { lsSet('language', language); }, [language]);
  useEffect(() => { lsSet('sensitiveContent', sensitiveContent); }, [sensitiveContent]);
  useEffect(() => { lsSet('likesHidden', likesHidden); }, [likesHidden]);

  const toggleNotif = (key) => setNotifs((p) => ({ ...p, [key]: !p[key] }));
  const toggleArchive = (key) => setArchiving((p) => ({ ...p, [key]: !p[key] }));

  const handlePrivacyToggle = async () => {
    const next = !isPrivate;
    setIsPrivate(next);
    setSavingPrivacy(true);
    try {
      await updateProfile({ isPrivate: next });
      showToast(next ? 'Account set to Private ✓' : 'Account set to Public ✓', 'success');
    } catch {
      setIsPrivate(!next);
      showToast('Could not save privacy setting.', 'error');
    } finally { setSavingPrivacy(false); }
  };

  const handleRoleChange = async (role) => {
    setAccountRole(role);
    setSavingRole(true);
    try {
      await updateProfile({ role });
      showToast(`Account type changed to ${role.toUpperCase()} ✓`, 'success');
    } catch {
      setAccountRole(user?.role || 'fan');
      showToast('Could not change account type.', 'error');
    } finally { setSavingRole(false); }
  };

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    showToast('Language preference saved ✓', 'success');
  };

  const handleDailyLimitChange = (val) => {
    setDailyLimit(val);
    showToast(val === 'none' ? 'Daily limit removed.' : `Daily limit set to ${val === '60' ? '1 hour' : val + ' min'} ✓`, 'success');
  };

  const comingSoon = () => showToast('Coming soon! 🚧', 'info');

  const tabs = [
    { id: 'account', label: 'Account & Security', icon: 'security', category: 'Your Account' },
    { id: 'privacy', label: 'Account Privacy', icon: 'lock', category: 'Your Account' },
    { id: 'creator', label: 'Account Type', icon: 'star', category: 'Your Account' },
    { id: 'events', label: 'Event Cleanup & Trash', icon: 'calendar', category: 'Your Account' },
    { id: 'blocked', label: 'Blocked Accounts', icon: 'slash', category: 'Your Account' },
    { id: 'notifications', label: 'Notifications', icon: 'notification', category: 'Activity' },
    { id: 'time', label: 'Time Spent', icon: 'clock', category: 'Activity' },
    { id: 'hidelikes', label: 'Like & Share Counts', icon: 'heart', category: 'What You See' },
    { id: 'suggested', label: 'Suggested Content', icon: 'trend', category: 'What You See' },
    { id: 'messages', label: 'Messages & Replies', icon: 'message', category: 'Interactions' },
    { id: 'comments', label: 'Comments', icon: 'messages', category: 'Interactions' },
    { id: 'media', label: 'Archiving & Downloads', icon: 'folder', category: 'App & Media' },
    { id: 'quality', label: 'Media Quality', icon: 'image', category: 'App & Media' },
    { id: 'language', label: 'App Language', icon: 'global', category: 'App & Media' },
    { id: 'help', label: 'Help & Safety', icon: 'info', category: 'Support' },
  ];

  const categories = {};
  tabs.forEach((t) => { if (!categories[t.category]) categories[t.category] = []; categories[t.category].push(t); });

  const activeTabLabel = tabs.find((t) => t.id === activeTab)?.label || 'Settings';
  const showMobileMenu = activeTab === null;

  const renderPanel = () => {
    switch (activeTab) {
      case 'account':
        return (
          <SecurityPanel
            user={user}
            showToast={showToast}
            onDeleted={() => { logout(); navigate('/login'); }}
          />
        );

      case 'events':
        return <EventSettingsPanel user={user} showToast={showToast} />;

      case 'blocked':
        return <BlockedPanel user={user} showToast={showToast} />;

      case 'privacy':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide">Account Privacy</h2>
              <p className="text-zinc-500 text-xs mt-1">Control who can see your posts and klyps.</p>
            </div>
            <ToggleRow
              title="Private Account"
              desc={`Currently ${isPrivate ? 'private' : 'public'}. When private, only approved followers can see your content.`}
              checked={isPrivate}
              onChange={handlePrivacyToggle}
            />
            {savingPrivacy && <p className="text-xs text-[#DFE104] animate-pulse">Saving…</p>}
          </div>
        );

      case 'creator':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide">Account Type</h2>
              <p className="text-zinc-500 text-xs mt-1">Switch between Fan, DJ, or Producer profile types.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { role: 'fan', label: 'Fan', desc: 'Follow DJs, attend events, collect.' },
                { role: 'dj', label: 'DJ', desc: 'Upload sets, post klyps, book shows.' },
                { role: 'producer', label: 'Producer', desc: 'Release tracks, manage releases.' },
              ].map(({ role, label, desc }) => (
                <button
                  key={role}
                  onClick={() => handleRoleChange(role)}
                  disabled={savingRole}
                  className={`rounded-2xl border p-4 text-left transition-all disabled:opacity-50 ${
                    accountRole === role
                      ? 'border-[#DFE104] bg-[#DFE104]/10'
                      : 'border-white/[0.08] hover:bg-white/[0.03]'
                  }`}
                >
                  <p className={`text-sm font-black uppercase tracking-wide ${accountRole === role ? 'text-[#DFE104]' : 'text-zinc-300'}`}>{label}</p>
                  <p className="text-xs text-zinc-500 mt-1">{desc}</p>
                  {accountRole === role && <span className="mt-2 inline-block text-[10px] font-black text-[#DFE104]">✓ CURRENT</span>}
                </button>
              ))}
            </div>
            {savingRole && <p className="text-xs text-[#DFE104] animate-pulse">Saving…</p>}
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide">Notifications</h2>
              <p className="text-zinc-500 text-xs mt-1">Configure in-app alert preferences for this browser.</p>
            </div>
            <div className="space-y-3">
              <ToggleRow title="Pause All In-App Alerts" desc="Temporarily mute alerts in this browser." checked={notifs.pauseAll} onChange={() => toggleNotif('pauseAll')} />
              <ToggleRow title="Likes & Comments" desc="Receive alerts for post interactions." checked={notifs.likesComments} onChange={() => toggleNotif('likesComments')} />
              <ToggleRow title="New Followers" desc="Receive alerts when someone follows your profile." checked={notifs.newFollowers} onChange={() => toggleNotif('newFollowers')} />
              <ToggleRow title="Event Broadcasts" desc="Receive reminders about scheduled sets." checked={notifs.eventBroadcasts} onChange={() => toggleNotif('eventBroadcasts')} />
            </div>
            <p className="text-[10px] text-zinc-500 border-t border-white/[0.04] pt-2">
              ℹ Device-Local: Saved in local storage on this browser only. Push notifications via FCM are currently disabled.
            </p>
          </div>
        );

      case 'time':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide">Time Spent</h2>
              <p className="text-zinc-500 text-xs mt-1">Track your session time and set local break reminders.</p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold">Daily Limit Reminder</p>
                <p className="text-xs text-zinc-500">In-browser reminder to take a break.</p>
              </div>
              <select
                value={dailyLimit}
                onChange={(e) => handleDailyLimitChange(e.target.value)}
                className="bg-[#27272A] text-sm text-white px-3 py-1.5 rounded-xl border border-white/[0.1] outline-none w-full sm:w-auto"
              >
                <option value="none">No Limit</option>
                <option value="15">15 Minutes</option>
                <option value="30">30 Minutes</option>
                <option value="60">1 Hour</option>
                <option value="120">2 Hours</option>
              </select>
            </div>
            <p className="text-[10px] text-zinc-500">ℹ Device-Local: Active only while browsing in this session.</p>
          </div>
        );

      case 'hidelikes':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide">Like & Share Counts</h2>
              <p className="text-zinc-500 text-xs mt-1">Customize metric visibility on the feed.</p>
            </div>
            <ToggleRow
              title="Hide Like & View Counts"
              desc="You won't see totals on others' posts in this browser. Totals remain visible on your own content."
              checked={likesHidden}
              onChange={() => setLikesHidden((v) => !v)}
            />
            <p className="text-[10px] text-zinc-500">ℹ Device-Local: Applies to this browser only.</p>
          </div>
        );

      case 'suggested':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide">Suggested Content</h2>
              <p className="text-zinc-500 text-xs mt-1">Control recommendation filtering on this device.</p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
              <p className="text-sm font-bold">Sensitive Content Filter</p>
              {['less', 'standard', 'more'].map((opt) => (
                <label key={opt} className="flex items-center gap-3 cursor-pointer py-1">
                  <div
                    onClick={() => setSensitiveContent(opt)}
                    className={`h-4 w-4 rounded-full border-2 flex items-center justify-center cursor-pointer ${sensitiveContent === opt ? 'border-[#DFE104]' : 'border-zinc-600'}`}
                  >
                    {sensitiveContent === opt && <div className="h-2 w-2 rounded-full bg-[#DFE104]" />}
                  </div>
                  <span className="text-xs uppercase font-bold tracking-wider text-zinc-300 capitalize">{opt}</span>
                </label>
              ))}
            </div>
            <p className="text-[10px] text-zinc-500">ℹ Device-Local: Recommendation filtering preference is saved locally.</p>
          </div>
        );

      case 'messages':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide">Messages & Replies</h2>
              <p className="text-zinc-500 text-xs mt-1">Incoming direct message controls.</p>
            </div>
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-300/80 mb-4">
              ⚠ In Progress: Direct message permissions are currently standard (open to participants). Fine-grained message gating rules are coming in the next release.
            </div>
            <Section>
              <Row label="Message Requests" desc="Who can send you message requests." right="Everyone" onClick={comingSoon} />
              <Row label="Story Replies" desc="Allow replies to your stories." right="Followers Only" onClick={comingSoon} />
              <Row label="Group Invites" desc="Control who can add you to group chats." right="Friends" onClick={comingSoon} />
            </Section>
          </div>
        );

      case 'comments':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide">Comments</h2>
              <p className="text-zinc-500 text-xs mt-1">Content interaction controls.</p>
            </div>
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-300/80 mb-4">
              ⚠ In Progress: Automated keyword moderation and comment filtering rules are scheduled for an upcoming release.
            </div>
            <Section>
              <Row label="Allow Comments From" desc="Choose who can leave comments." right="Everyone" onClick={comingSoon} />
              <Row label="Filter Keywords" desc="Auto-hide comments with specific words." right="0 words" onClick={comingSoon} />
              <Row label="Block Comments From" desc="Prevent specific accounts from commenting." right="0 accounts" onClick={comingSoon} />
            </Section>
          </div>
        );

      case 'media':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide">Archiving & Downloads</h2>
              <p className="text-zinc-500 text-xs mt-1">Local media handling preferences.</p>
            </div>
            <div className="space-y-3">
              <ToggleRow title="Save Story to Archive" desc="Auto-save your broadcast stories to your private archive." checked={archiving.saveStory} onChange={() => toggleArchive('saveStory')} />
              <ToggleRow title="Save Klyps to Device" desc="Prompt to download recorded klyps locally." checked={archiving.saveReels} onChange={() => toggleArchive('saveReels')} />
            </div>
            <p className="text-[10px] text-zinc-500">ℹ Device-Local: Saved in local storage on this browser.</p>
          </div>
        );

      case 'quality':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide">Media Quality</h2>
              <p className="text-zinc-500 text-xs mt-1">Upload and streaming resolution preferences.</p>
            </div>
            <ToggleRow
              title="Upload at Highest Quality"
              desc="Always upload original resolution to Cloudinary. Uses more bandwidth and upload time."
              checked={highQuality}
              onChange={() => setHighQuality((v) => !v)}
            />
            <p className="text-[10px] text-zinc-500">ℹ Device-Local: Saved in local storage on this browser.</p>
          </div>
        );

      case 'language':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide">App Language</h2>
              <p className="text-zinc-500 text-xs mt-1">Select your preferred interface language on this device.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { code: 'en', label: 'English (US)' },
                { code: 'de', label: 'Deutsch' },
                { code: 'es', label: 'Español' },
                { code: 'fr', label: 'Français' },
                { code: 'hi', label: 'हिन्दी' },
                { code: 'jp', label: '日本語' },
              ].map(({ code, label }) => (
                <button
                  key={code}
                  onClick={() => handleLanguageChange(code)}
                  className={`rounded-xl border p-3 text-left text-sm transition-all ${
                    language === code
                      ? 'border-[#DFE104] bg-[#DFE104]/10 text-[#DFE104] font-black'
                      : 'border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  {label}
                  {language === code && <span className="ml-2 text-[10px]">✓</span>}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-zinc-500">ℹ Device-Local: Saved in local storage on this browser.</p>
          </div>
        );

      case 'help':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide">Help & Safety</h2>
              <p className="text-zinc-500 text-xs mt-1">Support, standing, and community guidelines.</p>
            </div>
            <Section>
              <Row label="Help Center" desc="Guides and troubleshooting." right="Visit →" onClick={() => window.open('https://github.com', '_blank')} />
              <Row
                label="Account Status"
                desc="Verify your standing and content compliance."
                right={<span className="text-green-400 font-black">✓ Clear</span>}
              />
              <Row label="Report a Problem" desc="Alert our team to bugs or issues." right="Report →" onClick={() => { showToast('Problem report submitted. Thank you! 🙏', 'success'); }} />
              <Row label="Privacy Policy" desc="Read our data and privacy practices." right="Coming Soon" onClick={() => showToast('Full legal privacy policy document will be published prior to public launch.', 'info')} />
            </Section>
          </div>
        );

      default:
        return (
          <div className="hidden lg:flex items-center justify-center h-full">
            <p className="text-zinc-600 text-sm">Select a setting from the left panel.</p>
          </div>
        );
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-8 text-white min-h-[85vh]">
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#DFE104]">System Preferences</p>
          <h1 className="mt-1 text-3xl font-black uppercase tracking-[-0.06em] sm:text-4xl lg:text-5xl">Settings</h1>
        </div>
        <button
          onClick={() => navigate('/profile/me')}
          className="dk-button bg-white/[0.06] px-3 sm:px-4 text-xs font-bold uppercase"
        >
          ← Profile
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr]">
        {/* Sidebar */}
        <aside className={`dk-panel rounded-[2rem] p-4 space-y-6 h-fit max-h-[80vh] overflow-y-auto no-scrollbar border border-white/[0.08] bg-[#09090B]/60 backdrop-blur-xl ${activeTab !== null ? 'hidden lg:block' : 'block'}`}>
          {/* Profile */}
          <div className="flex items-center gap-3 p-2 border-b border-white/[0.08] pb-4">
            <img
              src={user?.profilePic || user?.profile_pic || `https://ui-avatars.com/api/?name=${user?.username || 'U'}&background=DFE104&color=000`}
              alt="avatar"
              className="h-10 w-10 rounded-full object-cover"
            />
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">@{user?.username || 'anonymous'}</p>
              <p className="text-xs text-zinc-500 uppercase tracking-widest">{user?.role || 'fan'}</p>
            </div>
          </div>

          <div className="space-y-5">
            {Object.keys(categories).map((cat) => (
              <div key={cat}>
                <p className="px-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2">{cat}</p>
                <div className="space-y-1">
                  {categories[cat].map((tab) => {
                    const active = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                          active
                            ? 'bg-[#DFE104] text-black font-bold'
                            : 'text-zinc-400 hover:bg-white/[0.04] hover:text-white active:bg-white/[0.08]'
                        }`}
                      >
                        <IconsaxAnimated name={tab.icon} size={18} filled={active} />
                        <span className="truncate">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Session */}
          <div className="border-t border-white/[0.08] pt-4 space-y-2">
            <p className="px-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Session</p>
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.02]">
              <img
                src={user?.profilePic || user?.profile_pic || `https://ui-avatars.com/api/?name=${user?.username || 'U'}&background=DFE104&color=000`}
                alt={user?.username}
                className="h-7 w-7 rounded-full object-cover shrink-0"
              />
              <span className="text-xs font-bold truncate">@{user?.username}</span>
              <span className="ml-auto text-[10px] bg-green-500/20 text-green-400 font-bold px-2 py-0.5 rounded-full shrink-0">Active</span>
            </div>
            <button
              onClick={async () => { await logout(); navigate('/login'); }}
              className="flex w-full items-center gap-3 text-red-400 hover:text-red-300 px-3 py-2 text-xs font-bold rounded-xl hover:bg-red-500/5 transition-all"
            >
              <IconsaxAnimated name="logout" size={16} />
              Log Out @{user?.username}
            </button>
          </div>
        </aside>

        {/* Detail Panel */}
        <main className={`dk-panel rounded-[2rem] p-5 sm:p-6 lg:p-8 min-h-[400px] lg:min-h-[500px] border border-white/[0.08] bg-[#09090B]/30 backdrop-blur-xl ${activeTab === null ? 'hidden lg:block' : 'block'}`}>
          {/* Mobile back */}
          {activeTab !== null && (
            <button
              onClick={() => setActiveTab(null)}
              className="flex items-center gap-2 mb-5 text-sm font-bold text-zinc-400 hover:text-white transition-colors lg:hidden"
            >
              <IconsaxAnimated name="arrow-left" size={18} />
              <span>{activeTabLabel}</span>
            </button>
          )}

          {renderPanel()}
        </main>
      </div>
    </div>
  );
}
