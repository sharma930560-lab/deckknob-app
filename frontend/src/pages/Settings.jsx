import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import IconsaxAnimated from '../components/icons/IconsaxAnimated';
import authStore from '../stores/authStore';
import { useToast } from '../components/ui/Toast';
import {
  updatePassword,
  updateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
} from 'firebase/auth';
import { auth } from '../config/firebase';

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
  const [section, setSection] = useState(null); // 'password' | 'email' | 'delete'
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const reauth = async () => {
    const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPw);
    await reauthenticateWithCredential(auth.currentUser, credential);
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw) { showToast('Fill all fields.', 'error'); return; }
    if (newPw !== confirmPw) { showToast("Passwords don't match.", 'error'); return; }
    if (newPw.length < 6) { showToast('New password must be at least 6 characters.', 'error'); return; }
    setBusy(true);
    try {
      await reauth();
      await updatePassword(auth.currentUser, newPw);
      showToast('Password updated ✓', 'success');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setSection(null);
    } catch (e) {
      showToast(e.code === 'auth/wrong-password' ? 'Current password is wrong.' : e.message, 'error');
    } finally { setBusy(false); }
  };

  const handleChangeEmail = async () => {
    if (!currentPw || !newEmail) { showToast('Fill all fields.', 'error'); return; }
    if (!/\S+@\S+\.\S+/.test(newEmail)) { showToast('Enter a valid email.', 'error'); return; }
    setBusy(true);
    try {
      await reauth();
      await updateEmail(auth.currentUser, newEmail);
      showToast('Email updated ✓', 'success');
      setCurrentPw(''); setNewEmail('');
      setSection(null);
    } catch (e) {
      showToast(e.code === 'auth/wrong-password' ? 'Current password is wrong.' : e.message, 'error');
    } finally { setBusy(false); }
  };

  const handleDeleteAccount = async () => {
    if (!currentPw) { showToast('Enter your password to confirm.', 'error'); return; }
    setBusy(true);
    try {
      await reauth();
      await deleteUser(auth.currentUser);
      showToast('Account deleted.', 'success');
      onDeleted?.();
    } catch (e) {
      showToast(e.code === 'auth/wrong-password' ? 'Current password is wrong.' : e.message, 'error');
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide">Account & Security</h2>
        <p className="text-zinc-500 text-xs mt-1">Manage your login credentials and account safety.</p>
      </div>

      <Section>
        <Row label="Email address" desc={auth.currentUser?.email || user?.email} right="Change →" onClick={() => setSection(section === 'email' ? null : 'email')} />
        <Row label="Password" desc="Change your account password" right="Change →" onClick={() => setSection(section === 'password' ? null : 'password')} />
      </Section>

      {/* Change Password form */}
      {section === 'password' && (
        <div className="space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5">
          <p className="text-sm font-black uppercase tracking-wide text-[#DFE104]">Change Password</p>
          {[
            { label: 'Current Password', value: currentPw, set: setCurrentPw },
            { label: 'New Password', value: newPw, set: setNewPw },
            { label: 'Confirm New Password', value: confirmPw, set: setConfirmPw },
          ].map(({ label, value, set }) => (
            <div key={label}>
              <p className="text-xs text-zinc-500 mb-1">{label}</p>
              <input
                type="password"
                value={value}
                onChange={(e) => set(e.target.value)}
                className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-[#DFE104] transition-colors"
                placeholder="••••••••"
              />
            </div>
          ))}
          <button
            onClick={handleChangePassword}
            disabled={busy}
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
          {[
            { label: 'Current Password', value: currentPw, set: setCurrentPw, type: 'password', ph: '••••••••' },
            { label: 'New Email', value: newEmail, set: setNewEmail, type: 'email', ph: 'new@email.com' },
          ].map(({ label, value, set, type, ph }) => (
            <div key={label}>
              <p className="text-xs text-zinc-500 mb-1">{label}</p>
              <input
                type={type}
                value={value}
                onChange={(e) => set(e.target.value)}
                className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-[#DFE104] transition-colors"
                placeholder={ph}
              />
            </div>
          ))}
          <button
            onClick={handleChangeEmail}
            disabled={busy}
            className="w-full rounded-xl bg-[#DFE104] py-2.5 text-sm font-black text-black disabled:opacity-40"
          >
            {busy ? 'Updating…' : 'Update Email'}
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
              <p className="text-zinc-500 text-xs mt-1">Configure where and how you receive alerts.</p>
            </div>
            <div className="space-y-3">
              <ToggleRow title="Pause All Alerts" desc="Temporarily disable all notifications." checked={notifs.pauseAll} onChange={() => toggleNotif('pauseAll')} />
              <ToggleRow title="Likes & Comments" desc="Get notified when someone interacts with your content." checked={notifs.likesComments} onChange={() => toggleNotif('likesComments')} />
              <ToggleRow title="New Followers" desc="Get notified when someone follows you." checked={notifs.newFollowers} onChange={() => toggleNotif('newFollowers')} />
              <ToggleRow title="Event Broadcasts" desc="Receive notifications about live schedules." checked={notifs.eventBroadcasts} onChange={() => toggleNotif('eventBroadcasts')} />
            </div>
            <p className="text-[10px] text-zinc-600">Preferences saved locally on this device.</p>
          </div>
        );

      case 'time':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide">Time Spent</h2>
              <p className="text-zinc-500 text-xs mt-1">Track your daily usage and set break reminders.</p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold">Daily Limit Reminder</p>
                <p className="text-xs text-zinc-500">A reminder notification to take a break.</p>
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
              desc="You won't see totals on others' posts. You can still see them on your own content."
              checked={likesHidden}
              onChange={() => setLikesHidden((v) => !v)}
            />
          </div>
        );

      case 'suggested':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide">Suggested Content</h2>
              <p className="text-zinc-500 text-xs mt-1">Control content recommendations and filtering.</p>
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
          </div>
        );

      case 'messages':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide">Messages & Replies</h2>
              <p className="text-zinc-500 text-xs mt-1">Configure who can reach your inbox.</p>
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
              <p className="text-zinc-500 text-xs mt-1">Control who can comment on your posts.</p>
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
              <p className="text-zinc-500 text-xs mt-1">Manage automatic saves and local storage.</p>
            </div>
            <div className="space-y-3">
              <ToggleRow title="Save Story to Archive" desc="Auto-save your broadcast stories to your private archive." checked={archiving.saveStory} onChange={() => toggleArchive('saveStory')} />
              <ToggleRow title="Save Klyps to Device" desc="Automatically download recorded klyps to local storage." checked={archiving.saveReels} onChange={() => toggleArchive('saveReels')} />
            </div>
          </div>
        );

      case 'quality':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide">Media Quality</h2>
              <p className="text-zinc-500 text-xs mt-1">Adjust upload and streaming quality settings.</p>
            </div>
            <ToggleRow
              title="Upload at Highest Quality"
              desc="Always upload original resolution. Uses more bandwidth and storage."
              checked={highQuality}
              onChange={() => setHighQuality((v) => !v)}
            />
          </div>
        );

      case 'language':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide">App Language</h2>
              <p className="text-zinc-500 text-xs mt-1">Select your preferred interface language.</p>
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
          </div>
        );

      case 'help':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide">Help & Safety</h2>
              <p className="text-zinc-500 text-xs mt-1">Get answers and report issues.</p>
            </div>
            <Section>
              <Row label="Help Center" desc="Guides and troubleshooting." right="Visit →" onClick={() => window.open('https://github.com', '_blank')} />
              <Row
                label="Account Status"
                desc="Verify your standing and content compliance."
                right={<span className="text-green-400 font-black">✓ Clear</span>}
              />
              <Row label="Report a Problem" desc="Alert our team to bugs or issues." right="Report →" onClick={() => { showToast('Problem report sent. Thank you! 🙏', 'success'); }} />
              <Row label="Privacy Policy" desc="Read our data and privacy practices." right="Read →" onClick={comingSoon} />
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
