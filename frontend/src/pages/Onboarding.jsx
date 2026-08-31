import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authStore from '../stores/authStore';
import { storageService } from '../services/storageService';

const genres = [
  'Techno', 'House', 'Afro House', 'Electro', 'Drum & Bass',
  'Jungle', 'Breaks', 'Hard Groove', 'Ambient', 'Experimental',
  'Hip-Hop', 'Trap', 'Bass Music', 'Other',
];

const STEPS = [
  { id: 'avatar', title: 'Set your avatar', subtitle: 'Paste an image URL to give your profile a face.' },
  { id: 'location', title: 'Where do you play?', subtitle: 'Let the scene know your city.' },
  { id: 'genre', title: 'Your sound', subtitle: 'Pick your primary genre.' },
  { id: 'bio', title: 'Write your bio', subtitle: 'A line or two about yourself. Keep it underground.' },
];

export default function Onboarding() {
  const { user, updateProfile, isLoading } = authStore();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [profilePic, setProfilePic] = useState('');
  const [city, setCity] = useState('');
  const [genre, setGenre] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);

  const startCamera = async () => {
    try {
      setError('');
      setIsCameraActive(true);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 400, height: 400, facingMode: 'user' }
      });
      setCameraStream(mediaStream);
      setTimeout(() => {
        const video = document.getElementById('camera-video');
        if (video) video.srcObject = mediaStream;
      }, 100);
    } catch (err) {
      setError('Could not access camera. Make sure permissions are granted.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  // Compress image to a small thumbnail before saving to Firestore (max 200x200, 60% quality)
  const compressImage = (src) =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 200;
        let { width, height } = img;
        if (width > height) {
          if (width > MAX) { height = Math.round((height * MAX) / width); width = MAX; }
        } else {
          if (height > MAX) { width = Math.round((width * MAX) / height); height = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.onerror = () => resolve(src);
      img.src = src;
    });

  const capturePhoto = async () => {
    const video = document.getElementById('camera-video');
    if (video) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 300;
      canvas.height = video.videoHeight || 300;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg');
      const compressed = await compressImage(base64);
      setProfilePic(compressed);
      stopCamera();
    }
  };

  const handleFileChange = async (e) => {
    setError('');
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Image must be less than 10MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result);
        setProfilePic(compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleNext = () => {
    setError('');
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    }
  };

  const handleSkip = () => {
    setError('');
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      finishOnboarding();
    }
  };

  const finishOnboarding = async () => {
    try {
      // profilePic is already compressed to ~200x200 (≤ 15KB base64),
      // safe to store directly in Firestore without hitting the 1MB limit.
      await updateProfile({
        profilePic: profilePic || '',
        profile_pic: profilePic || '',
        bio,
        city,
        genre,
      });
      navigate('/feed');
    } catch (err) {
      setError(err.message || 'Failed to save profile. You can update it later.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLast) {
      await finishOnboarding();
    } else {
      handleNext();
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#09090B] text-white px-4 sm:px-5 py-8 sm:py-12">
      {/* Progress dots */}
      <div className="mb-10 flex gap-2">
        {STEPS.map((s, i) => (
          <span
            key={s.id}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === step ? 'w-8 bg-[#DFE104]' : i < step ? 'w-2 bg-[#DFE104]/40' : 'w-2 bg-white/10'
            }`}
          />
        ))}
      </div>

      <div className="w-full max-w-md">
        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.24em] text-[#DFE104]">
          Step {step + 1} of {STEPS.length}
        </p>
        <h1 className="mt-2 sm:mt-3 text-3xl sm:text-5xl font-black uppercase leading-[0.88] tracking-[-0.06em]">
          {current.title}
        </h1>
        <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-zinc-500">{current.subtitle}</p>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8">
          {/* Step 1: Avatar */}
          {step === 0 && (
            <div className="space-y-6">
              {/* Preview or Camera View */}
              <div className="flex flex-col items-center justify-center">
                {isCameraActive ? (
                  <div className="relative overflow-hidden rounded-full border-4 border-[#DFE104] h-32 w-32 sm:h-40 sm:w-40 bg-black flex items-center justify-center">
                    <video
                      id="camera-video"
                      autoPlay
                      playsInline
                      muted
                      className="h-full w-full object-cover scale-x-[-1]"
                    />
                  </div>
                ) : (
                  <div className="relative">
                    <img
                      src={profilePic || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=85'}
                      alt="avatar preview"
                      className="h-24 w-24 sm:h-32 sm:w-32 rounded-full object-cover border-4 border-[#DFE104]/30"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=85';
                      }}
                    />
                    {profilePic && (
                      <button
                        type="button"
                        onClick={() => setProfilePic('')}
                        className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-black text-white hover:bg-red-600 transition-colors"
                        title="Remove image"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Upload & Camera Buttons */}
              <div className="flex flex-col gap-3">
                {isCameraActive ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="flex-1 h-11 rounded-2xl bg-[#DFE104] text-[10px] sm:text-xs font-black uppercase tracking-[0.12em] text-black"
                    >
                      📸 Capture Photo
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-4 h-11 rounded-2xl border border-white/10 text-xs font-bold uppercase tracking-[0.12em] text-zinc-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex h-11 cursor-pointer items-center justify-center gap-1.5 sm:gap-2 rounded-2xl border border-white/10 bg-white/[0.04] text-[10px] sm:text-xs font-bold uppercase tracking-[0.08em] sm:tracking-[0.12em] text-zinc-300 hover:border-[#DFE104]/50 hover:text-white active:bg-white/[0.08] transition-colors">
                      📁 Device Upload
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="flex h-11 items-center justify-center gap-1.5 sm:gap-2 rounded-2xl border border-white/10 bg-white/[0.04] text-[10px] sm:text-xs font-bold uppercase tracking-[0.08em] sm:tracking-[0.12em] text-zinc-300 hover:border-[#DFE104]/50 hover:text-white active:bg-white/[0.08] transition-colors"
                    >
                      📷 Use Camera
                    </button>
                  </div>
                )}
              </div>

              <div className="relative flex py-3 items-center">
                <div className="flex-grow border-t border-white/5"></div>
                <span className="flex-shrink mx-4 text-xs font-bold uppercase tracking-[0.18em] text-zinc-600">Or use URL</span>
                <div className="flex-grow border-t border-white/5"></div>
              </div>

              <div>
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
                  Image URL
                </span>
                <input
                  className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 text-sm outline-none transition-colors focus:border-[#DFE104]"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={profilePic.startsWith('data:image/') ? '' : profilePic}
                  onChange={(e) => setProfilePic(e.target.value)}
                />
                <p className="mt-2 text-xs text-zinc-600">Paste any publicly accessible image URL</p>
              </div>
            </div>
          )}

          {/* Step 2: City */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">City</span>
                <input
                  className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 text-sm outline-none transition-colors focus:border-[#DFE104]"
                  placeholder="Mumbai, Berlin, Tokyo..."
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  autoFocus
                />
              </div>
              {/* Quick picks */}
              <div className="flex flex-wrap gap-2">
                {['Mumbai', 'Delhi', 'Bengaluru', 'Berlin', 'London', 'Amsterdam', 'Tokyo', 'New York'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCity(c)}
                    className={`rounded-full border px-4 py-2 text-xs font-bold transition-colors ${
                      city === c
                        ? 'border-[#DFE104] bg-[#DFE104] text-black'
                        : 'border-white/[0.08] bg-white/[0.04] text-zinc-400 hover:border-[#DFE104]/40 hover:text-white'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Genre */}
          {step === 2 && (
            <div className="flex flex-wrap gap-2">
              {genres.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGenre(g)}
                  className={`rounded-full border px-4 py-2 text-xs font-bold transition-colors ${
                    genre === g
                      ? 'border-[#DFE104] bg-[#DFE104] text-black'
                      : 'border-white/[0.08] bg-white/[0.04] text-zinc-400 hover:border-[#DFE104]/40 hover:text-white'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          )}

          {/* Step 4: Bio */}
          {step === 3 && (
            <div className="space-y-3">
              <textarea
                className="h-40 w-full resize-none rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 text-sm outline-none transition-colors focus:border-[#DFE104]"
                placeholder="Warehouse selector. Acid pressure, fast blends, late exits..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={200}
                autoFocus
              />
              <p className="text-right text-xs text-zinc-600">{bio.length}/200</p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 sm:mt-8 flex gap-2 sm:gap-3">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 h-11 sm:h-12 rounded-2xl bg-[#DFE104] text-sm sm:text-base font-black uppercase tracking-[0.10em] sm:tracking-[0.14em] text-black disabled:opacity-50 transition-opacity"
            >
              {isLoading ? 'Saving...' : isLast ? 'Finish →' : 'Continue →'}
            </button>
            <button
              type="button"
              onClick={handleSkip}
              className="h-11 sm:h-12 px-4 sm:px-5 rounded-2xl border border-white/[0.08] text-xs font-bold uppercase tracking-[0.12em] text-zinc-500 hover:text-white active:text-white transition-colors"
            >
              Skip
            </button>
          </div>
        </form>

        {/* Welcome message */}
        <p className="mt-6 text-center text-xs text-zinc-600">
          Welcome to Deckknob,{' '}
          <span className="font-bold text-zinc-400">{user?.username}</span>. You can always update these later.
        </p>
      </div>
    </div>
  );
}
