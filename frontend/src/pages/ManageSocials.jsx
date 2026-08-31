import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MotionPage from '../components/ui/MotionPage';
import IconsaxAnimated from '../components/icons/IconsaxAnimated';
import authStore from '../stores/authStore';
import { API_BASE } from '../config/api';

export default function ManageSocials() {
  const { user } = authStore();
  const navigate = useNavigate();
  const [links, setLinks] = useState([]);
  const [newPlatform, setNewPlatform] = useState('');
  const [newUrl, setNewUrl] = useState('');

  // Instagram Sync States
  const [igUsername, setIgUsername] = useState('');
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'connecting' | 'syncing' | 'success' | 'error'
  const [syncMessage, setSyncMessage] = useState('');

  useEffect(() => {
    if (user?.social_links) {
      setLinks(user.social_links);
    }
  }, [user]);

  const addLink = () => {
    if (!newPlatform || !newUrl) return;
    const addedLinks = [...links, { platform: newPlatform, url: newUrl }];
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

  const saveLinks = async (updatedLinks) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;
      await fetch(`${API_BASE}/users/me/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ social_links: updatedLinks }),
      });
    } catch (err) {
      console.error('Failed to update social links', err);
    }
  };

  const handleInstagramSync = async (e) => {
    e.preventDefault();
    if (!igUsername.trim()) return;

    setSyncStatus('connecting');
    setSyncMessage('Establishing secure handshake with Instagram Graph API...');

    // Phase 1 Simulator Delay
    await new Promise((resolve) => setTimeout(resolve, 1400));
    setSyncStatus('syncing');
    setSyncMessage('Importing media, verifying captions, and caching assets locally...');

    // Phase 2 Simulator Delay
    await new Promise((resolve) => setTimeout(resolve, 1600));

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE}/posts/instagram-sync/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ instagram_username: igUsername.trim() }),
      });

      if (!res.ok) {
        throw new Error('Failed to complete Instagram import.');
      }

      const data = await res.json();
      setSyncStatus('success');
      setSyncMessage(data.message || 'Import successful!');

      // Save Instagram link to user social links
      const alreadyLinked = links.some((l) => l.platform.toLowerCase() === 'instagram');
      if (!alreadyLinked) {
        const updatedLinks = [...links, { platform: 'Instagram', url: `https://instagram.com/${igUsername.trim()}` }];
        setLinks(updatedLinks);
        saveLinks(updatedLinks);
      }

      // Redirect after showing success
      setTimeout(() => {
        navigate('/profile/me');
      }, 2000);
    } catch (err) {
      setSyncStatus('error');
      setSyncMessage('Instagram integration error. Please make sure the account is public.');
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
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4">Add Custom Link</h3>
            <div className="grid gap-3">
              <input
                value={newPlatform}
                onChange={(e) => setNewPlatform(e.target.value)}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 text-sm font-bold outline-none focus:border-[#DFE104] transition-colors"
                placeholder="Platform (e.g. SoundCloud)"
              />
              <input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 text-sm font-bold outline-none focus:border-[#DFE104] transition-colors"
                placeholder="URL (https://...)"
              />
              <button onClick={addLink} className="dk-button bg-[#DFE104] text-black h-12 font-black uppercase tracking-wider" type="button">
                Add Link
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
                  <button onClick={() => removeLink(link.url)} className="text-zinc-500 hover:text-white shrink-0" aria-label="Remove link">
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
                <p className="text-[10px] text-zinc-500">Auto-import posts and reels</p>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              Link your Instagram profile to import all your media contents (posts, reels) onto Deckknob instantly.
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
                  🔗 Link & Sync Feed
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
                    <p className="text-[10px] text-zinc-500">Updating your profile display...</p>
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
