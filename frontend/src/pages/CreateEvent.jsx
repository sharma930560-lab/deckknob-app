import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import IconsaxAnimated from '../components/icons/IconsaxAnimated';
import authStore from '../stores/authStore';
import { eventService } from '../services/eventService';
import { storageService } from '../services/storageService';
import { useToast } from '../components/ui/Toast';

export default function CreateEvent() {
  const navigate = useNavigate();
  const { user } = authStore();
  const { showToast } = useToast();
  
  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !venue || !dateTime) {
      showToast('Please fill out all required fields.', 'warning');
      return;
    }
    if (!user) {
      showToast('You must be logged in to publish events.', 'error');
      return;
    }

    setIsPublishing(true);
    try {
      let bannerUrl = '';
      if (bannerFile) {
        bannerUrl = await storageService.uploadEventBanner(user.uid, bannerFile);
      }
      
      await eventService.createEvent(
        user.uid,
        user.username,
        title,
        venue,
        dateTime,
        website,
        description,
        bannerUrl
      );
      
      showToast('Event published successfully!', 'success');
      navigate('/events/today');
    } catch (err) {
      showToast(err.message || 'Failed to publish event.', 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#DFE104]">Promoter tools</p>
      <h1 className="mt-2 text-5xl font-black uppercase tracking-[-0.07em] lg:text-8xl">Create event</h1>
      
      <form onSubmit={handleSubmit} className="dk-panel mt-8 grid gap-4 rounded-[2rem] p-5 lg:grid-cols-2">
        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
            <IconsaxAnimated name="calendar" size={16} /> Event title *
          </span>
          <input 
            required
            className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 text-sm outline-none focus:border-[#DFE104]" 
            placeholder="Midnight Techno Session"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
            <IconsaxAnimated name="location" size={16} /> Venue *
          </span>
          <input 
            required
            className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 text-sm outline-none focus:border-[#DFE104]" 
            placeholder="Club Horizon"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
          />
        </label>

        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
            <IconsaxAnimated name="clock" size={16} /> Date and time *
          </span>
          <input 
            required
            type="datetime-local"
            className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 text-sm outline-none focus:border-[#DFE104] text-white" 
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
          />
        </label>

        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
            <IconsaxAnimated name="link" size={16} /> Venue website
          </span>
          <input 
            className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 text-sm outline-none focus:border-[#DFE104]" 
            placeholder="https://venue.com"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>

        {/* Event Banner Image Selection */}
        <div className="lg:col-span-2 space-y-2">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
            <IconsaxAnimated name="image" size={16} /> Event Banner Banner File
          </span>
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/[0.02] border border-white/[0.05] p-4 rounded-3xl">
            {bannerPreview && (
              <img src={bannerPreview} alt="Banner Preview" className="h-24 w-40 object-cover rounded-xl border border-white/10 shrink-0" />
            )}
            <label className="flex h-11 w-full sm:w-auto px-6 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] text-xs font-bold uppercase tracking-[0.08em] text-zinc-300 hover:border-[#DFE104]/50 hover:text-white transition-colors">
              📁 Choose Image Banner
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>
          </div>
        </div>

        <label className="block lg:col-span-2">
          <span className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
            <IconsaxAnimated name="info" size={16} /> Event details
          </span>
          <textarea 
            className="h-32 w-full resize-none rounded-3xl border border-white/[0.08] bg-white/[0.04] p-4 text-sm outline-none focus:border-[#DFE104]" 
            placeholder="Lineup, room energy, door policy..." 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        
        <button 
          type="submit"
          disabled={isPublishing}
          className="dk-button h-12 bg-[#DFE104] font-black uppercase tracking-[0.14em] text-black lg:col-span-2 flex items-center justify-center gap-2"
        >
          {isPublishing && <span className="animate-spin h-4 w-4 border-2 border-black/30 border-t-black rounded-full" />}
          {isPublishing ? 'Publishing Event...' : 'Publish Event'}
        </button>
      </form>
    </div>
  );
}
