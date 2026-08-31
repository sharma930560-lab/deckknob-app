import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MotionPage from '../components/ui/MotionPage';
import IconsaxAnimated from '../components/icons/IconsaxAnimated';
import authStore from '../stores/authStore';
import { useToast } from '../components/ui/Toast';

export default function ManageSocials() {
  const { user, updateProfile } = authStore();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [links, setLinks] = useState([]);
  const [newPlatform, setNewPlatform] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Instagram Sync States
  const [igUsername, setIgUsername] = useState('');
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'connecting' | 'syncing' | 'success' | 'error'
  const [syncMessage, setSyncMessage] = useState('');

  useEffect(() => {
    if (user?.socialLinks || user?.social_links) {
      setLinks(user.socialLinks || user.social_links || []);
    }
  }, [user]);

  const saveLinks = async (updatedLinks) => {
    setIsSaving(true);
    try {
      await updateProfile({
        socialLinks: updatedLinks,
        social_links: updatedLinks,
      });
      showToast('Links saved to profile ✓', 'success');
    } catch (err) {
      console.error('[ManageSocials] Failed to update social links', err);
      showToast('Failed to save links to Firestore', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const addLink = () => {
    if (!newPlatform.trim() || !newUrl.trim()) return;
    let formattedUrl = newUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }
    const addedLinks = [...links, { platform: newPlatform.trim(), url: formattedUrl }];
    setLinks(addedLinks);
    setNewPlatform('');
    setNewUrl('');
    saveLinks(addedLinks);
  };

  const removeLink = (urlToRemove) => {
    const updatedLinks = links.filter((link) => link.url !== urlToRemove);
    setLinks(updatedLinks);
    saveLinks(updatedLinks);
  };

  const handleInstagramSync = async (e) => {
    e.preventDefault();
    if (!igUsername.trim()) return;

    setSyncStatus('connecting');
    setSyncMessage('Connecting to Instagram profile...');

    await new Promise((resolve) => setTimeout(resolve, 800));
    setSyncStatus('syncing');
    setSyncMessage('Linking Instagram handle to profile...');

    await new Promise((resolve) => setTimeout(resolve, 800));

    try {
      const cleanHandle = igUsername.trim().replace(/^@/, '');
      const igUrl = `https://instagram.com/${cleanHandle}`;

      const otherLinks = links.filter((l) => l.platform.toLowerCase() !== 'instagram');
      const updatedLinks = [...otherLinks, { platform: 'Instagram', url: igUrl }];

      await updateProfile({
        instagramHandle: cleanHandle,
        socialLinks: updatedLinks,
        social_links: updatedLinks,
      });

      setLinks(updatedLinks);
      setSyncStatus('success');
      setSyncMessage(`Linked @${cleanHandle} successfully!`);
      showToast('Instagram connected! 📸', 'success');

      setTimeout(() => {
        navigate('/profile/me');
      }, 1500);
    } catch (err) {
      console.error('[ManageSocials] Instagram sync error:', err);
      setSyncStatus('error');
      setSyncMessage('Could not save Instagram profile link.');
    }
  };

  return (
    <MotionPage className="mx-auto max-w-4xl px-4 py-6 lg:px-8 lg:py-10">
      <div className="mb-6">
        <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-[#DFE104]">Social integration</p>
        <h1 className="mt-2 text-4xl font-black uppercase tracking-tight sm:text-6xl">Link Hub</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
        {/* Left: General social links */}
        <section className="space-y-6">
          <div className="dk-panel p-5 rounded-3xl border border-white/[0.08] bg-[#09090B]/60 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Add Custom Link</h3>
              {isSaving && <span className="text-xs text-[#DFE104] font-bold animate-pulse">Saving…</span>}
            </div>

            <div className="grid gap-3">
              <input
                value={newPlatform}
                onChange={(e) => setNewPlatform(e.target.value)}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 text-sm font-bold outline-none focus:border-[#DFE104] transition-colors"
                placeholder="Platform (e.g. SoundCloud, Mixcloud, Spotify)"
              />
              <input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 text-sm font-bold outline-none focus:border-[#DFE104] transition-colors"
                placeholder="URL (https://soundcloud.com/...)"
              />
              <button
                onClick={addLink}
                disabled={!newPlatform.trim() || !newUrl.trim() || isSaving}
                className="dk-button bg-[#DFE104] text-black h-12 font-black uppercase tracking-wider disabled:opacity-40"
                type="button"
              >
                {isSaving ? 'Saving…' : 'Add Link'}
              </button>
            </div>

            <div className="mt-6 space-y-3">
              {links.length === 0 && (
                <p className="text-zinc-600 text-xs">No active social links.</p>
              )}
              {links.map((link) => (
                <div key={link.url} className="flex items-center justify-between rounded-2xl bg-white/[0.02] border border-white/[0.05] p-4">
                  <div className="flex items-center gap-3 font-bold text-xs min-w-0">
                    <IconsaxAnimated name="link" className="text-[#DFE104] shrink-0" size={18} />
                    <span className="truncate">
                      {link.platform}:{' '}
                      <a href={link.url} target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-white font-normal ml-1 break-all">
                        {link.url}
                      </a>
                    </span>
                  </div>
                  <button onClick={() => removeLink(link.url)} className="text-zinc-500 hover:text-white shrink-0 p-1" aria-label="Remove link">
                    <IconsaxAnimated name="close" size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Right: Instagram Integration Hub */}
        <section className="space-y-6">
          <div className="dk-panel p-5 rounded-3xl border border-white/[0.08] bg-[#09090B]/60 backdrop-blur-xl relative overflow-hidden">
            {/* Header branding */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white">
                <IconsaxAnimated name="instagram" size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider">Instagram Sync</h3>
                <p className="text-[10px] text-zinc-500">Connect your Instagram profile</p>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              Link your Instagram profile to showcase your handle and link directly on your public selector profile.
            </p>

            {syncStatus === 'idle' ? (
              <form onSubmit={handleInstagramSync} className="space-y-3">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-600">@</span>
                  <input
                    value={igUsername}
                    onChange={(e) => setIgUsername(e.target.value)}
                    className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] py-4 pl-8 pr-4 text-sm font-bold outline-none focus:border-[#DFE104] transition-colors"
                    placeholder="instagram_handle"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={!igUsername.trim()}
                  className="dk-button w-full bg-[#DFE104] text-black h-12 font-black uppercase tracking-wider disabled:opacity-40"
                >
                  🔗 Link Instagram
                </button>
              </form>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                {syncStatus === 'connecting' && (
                  <>
                    <span className="animate-spin h-8 w-8 border-4 border-[#ee2a7b]/30 border-t-[#ee2a7b] rounded-full" />
                    <p className="text-xs text-zinc-300 font-bold animate-pulse">{syncMessage}</p>
                  </>
                )}
                {syncStatus === 'syncing' && (
                  <>
                    <span className="animate-spin h-8 w-8 border-4 border-[#f9ce34]/30 border-t-[#f9ce34] rounded-full" />
                    <p className="text-xs text-zinc-300 font-bold animate-pulse">{syncMessage}</p>
                  </>
                )}
                {syncStatus === 'success' && (
                  <>
                    <div className="text-3xl">🎉</div>
                    <p className="text-xs text-emerald-400 font-bold">{syncMessage}</p>
                    <p className="text-[10px] text-zinc-500">Redirecting to profile...</p>
                  </>
                )}
                {syncStatus === 'error' && (
                  <>
                    <div className="text-3xl">⚠️</div>
                    <p className="text-xs text-red-400 font-bold">{syncMessage}</p>
                    <button
                      onClick={() => setSyncStatus('idle')}
                      className="dk-button bg-white/[0.06] text-xs font-bold px-4 py-2 h-auto"
                    >
                      Try Again
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </MotionPage>
  );
}
