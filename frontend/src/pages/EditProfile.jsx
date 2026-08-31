import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MotionPage from '../components/ui/MotionPage';
import authStore from '../stores/authStore';
import { authAPI } from '../utils/authUtils';
import IconsaxAnimated from '../components/icons/IconsaxAnimated';
import { storageService } from '../services/storageService';
import { useToast } from '../components/ui/Toast';

const GENRES = [
  'Techno', 'House', 'Afro House', 'Electro', 'Drum & Bass',
  'Jungle', 'Breaks', 'Hard Groove', 'Ambient', 'Experimental',
  'Hip-Hop', 'Trap', 'Bass Music', 'Other'
];

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function EditProfile() {
  const { user, updateProfile, isLoading, error, clearError } = authStore();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const fileInputRef = useRef(null);
  
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [genre, setGenre] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [username, setUsername] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [usernameStatus, setUsernameStatus] = useState(null); // null | 'checking' | 'available' | 'taken'
  const [suggestions, setSuggestions] = useState([]);
  const debouncedUsername = useDebounce(username, 500);

  useEffect(() => {
    clearError();
    if (user) {
      setName(user.name || '');
      setBio(user.bio || '');
      setCity(user.city || '');
      setGenre(user.genre || '');
      setProfilePic(user.profilePic || user.profile_pic || '');
      setUsername(user.username || '');
    }
  }, [user, clearError]);

  // Real-time username availability check
  useEffect(() => {
    if (!debouncedUsername || debouncedUsername.length < 3 || debouncedUsername === user?.username) {
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
  }, [debouncedUsername, user]);

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setProfilePic(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (usernameStatus === 'checking' || usernameStatus === 'taken') {
      showToast('Please choose a valid username', 'error');
      return;
    }
    
    try {
      let finalPicUrl = profilePic;
      if (photoFile) {
        setIsUploadingPhoto(true);
        finalPicUrl = await storageService.uploadProfilePhoto(user.uid, photoFile);
      }
      await updateProfile({
        name,
        bio,
        city,
        genre,
        profilePic: finalPicUrl,
        profile_pic: finalPicUrl,
        username,
      });
      showToast('Profile updated successfully! ✓', 'success');
      navigate('/profile/me');
    } catch (err) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  if (!user) {
    return (
      <MotionPage className="mx-auto max-w-3xl px-4 py-12 lg:px-8 text-center">
        <p className="text-zinc-400">Please login to edit your profile.</p>
        <Link to="/login" className="dk-button mt-4 bg-[#DFE104] text-black">Log In</Link>
      </MotionPage>
    );
  }

  return (
    <MotionPage className="mx-auto max-w-2xl px-4 py-6 lg:py-10">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#DFE104]">User configuration</p>
        <h1 className="mt-2 text-4xl font-black uppercase tracking-[-0.06em] sm:text-6xl">Edit Profile</h1>
      </div>
      
      {error && (
        <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs font-bold text-red-400">
          ⚠ {error}
        </div>
      )}

      <form className="dk-panel rounded-[2rem] p-6 space-y-6 border border-white/[0.08] bg-[#09090B]/60 backdrop-blur-xl" onSubmit={handleSubmit}>
        {/* Instagram-style Avatar upload */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6 bg-white/[0.02] border border-white/[0.05] p-5 rounded-[1.5rem]">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <img 
              src={profilePic || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=85'} 
              alt={user.username} 
              className="h-24 w-24 rounded-full border-2 border-white/10 object-cover group-hover:opacity-70 transition-opacity" 
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 rounded-full transition-opacity">
              <IconsaxAnimated name="edit" size={20} className="text-white" />
            </div>
          </div>
          
          <div className="text-center sm:text-left space-y-2">
            <h3 className="text-lg font-black uppercase tracking-wider">{user.username}</h3>
            <div className="flex flex-wrap justify-center sm:justify-start gap-2">
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="dk-button bg-[#DFE104] text-black text-xs font-bold px-4 py-2 h-auto"
                disabled={isUploadingPhoto}
              >
                Change Photo
              </button>
              {profilePic && (
                <button 
                  type="button" 
                  onClick={() => {
                    setProfilePic('');
                    setPhotoFile(null);
                  }}
                  className="dk-button bg-white/[0.06] text-white text-xs font-bold px-4 py-2 h-auto"
                >
                  Remove
                </button>
              )}
            </div>
            <input 
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden" 
              onChange={handlePhotoUpload}
            />
          </div>
        </div>
        
        {/* Display Name */}
        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Stage / Display Name</span>
          <input 
            className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 text-sm font-bold outline-none focus:border-[#DFE104] transition-colors" 
            placeholder="e.g. DJ Horizon / Maya Beats"
            value={name} 
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        {/* Username */}
        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Username</span>
          <div className="relative">
            <input 
              className={`w-full rounded-2xl border bg-white/[0.02] p-4 font-bold text-zinc-100 outline-none transition-colors ${
                usernameStatus === 'checking' ? 'border-zinc-500' :
                usernameStatus === 'available' ? 'border-green-500/50' :
                usernameStatus === 'taken' ? 'border-red-500/50' :
                'border-white/[0.04] focus:border-[#DFE104]'
              }`}
              value={username} 
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, '_'))}
              minLength={3}
              required
            />
            {usernameStatus === 'checking' && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <span className="animate-spin h-4 w-4 border-2 border-zinc-500 border-t-transparent rounded-full block" />
              </div>
            )}
            {usernameStatus === 'available' && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 text-xs font-bold">
                ✓ AVAILABLE
              </div>
            )}
          </div>
          {usernameStatus === 'taken' && (
            <div className="mt-2 text-xs font-bold text-red-500">
              Username taken. Try: {suggestions.join(', ')}
            </div>
          )}
        </label>

        {/* City & Genre */}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">City / Scene</span>
            <input 
              className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 text-sm outline-none focus:border-[#DFE104] transition-colors" 
              placeholder="e.g. Mumbai, Berlin, London"
              value={city} 
              onChange={(e) => setCity(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Primary Genre</span>
            <select
              className="h-12 w-full rounded-2xl border border-white/[0.08] bg-[#18181B] px-4 text-sm text-white outline-none focus:border-[#DFE104] transition-colors"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
            >
              <option value="">Select Genre</option>
              {GENRES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </label>
        </div>

        {/* Bio */}
        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Bio</span>
          <textarea 
            className="w-full h-32 resize-none rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 text-sm outline-none focus:border-[#DFE104] transition-colors" 
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Write a bio telling people about your sets, sound frequency, and style..."
          />
        </label>

        {/* Action Buttons */}
        <div className="grid gap-3 sm:grid-cols-2 pt-2">
          <button 
            type="submit" 
            disabled={isLoading || isUploadingPhoto || usernameStatus === 'checking' || usernameStatus === 'taken'}
            className="dk-button bg-[#DFE104] text-black font-black uppercase tracking-wider h-12 flex items-center justify-center gap-2"
          >
            {isUploadingPhoto && <span className="animate-spin h-4 w-4 border-2 border-black/30 border-t-black rounded-full" />}
            {isLoading ? 'Saving Changes...' : 'Save Changes'}
          </button>
          <Link 
            to="/profile/me" 
            className="dk-button bg-white/[0.06] text-white font-black uppercase tracking-wider h-12 flex items-center justify-center"
          >
            Cancel
          </Link>
        </div>
      </form>
    </MotionPage>
  );
}
