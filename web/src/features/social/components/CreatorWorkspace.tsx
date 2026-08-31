'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image, Video, Music, Text, Filter, Happyemoji, Magicpen, CloseCircle, Send2 } from 'iconsax-react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { storageService } from '../api/storageService';
import { postService } from '../api/postService';
import { storyService } from '../api/storyService';
import { reelService } from '../api/reelService';
import { eventService } from '@/features/events/api/eventService';
import { BASIC_FILTERS, NIGHTLIFE_FILTERS } from '../utils/editorConfig';

type UploadType = 'story' | 'post' | 'reel' | 'event';

export default function CreatorWorkspace() {
  const { user } = useAuthStore();
  const [uploadType, setUploadType] = useState<UploadType>('post');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [caption, setCaption] = useState('');
  
  // Editor State
  const [activeFilter, setActiveFilter] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      setMediaType(file.type.startsWith('video/') ? 'video' : 'image');
      const url = URL.createObjectURL(file);
      setMediaUrl(url);
    }
  };

  const handlePublish = async () => {
    if (!user || !mediaFile || !mediaUrl || !mediaType) return;
    setIsUploading(true);
    setProgress(0);
    try {
      let downloadUrl = '';
      if (uploadType === 'post') {
        downloadUrl = await storageService.uploadPostMedia(user.uid, mediaFile, setProgress);
        await postService.createPost(user.uid, user.username || 'user', user.profilePic || '', user.role || 'user', downloadUrl, mediaType, caption);
      } else if (uploadType === 'story') {
        downloadUrl = await storageService.uploadStoryMedia(user.uid, mediaFile, setProgress);
        await storyService.createStory(user.uid, user.username || 'user', user.profilePic || '', downloadUrl, mediaType, { filter: activeFilter, caption });
      } else if (uploadType === 'reel') {
        if (mediaType !== 'video') throw new Error('Reels must be video');
        downloadUrl = await storageService.uploadReelVideo(user.uid, mediaFile, setProgress);
        await reelService.createReel(user.uid, user.username || 'user', user.profilePic || '', user.role || 'user', downloadUrl, caption);
      } else if (uploadType === 'event') {
        downloadUrl = await storageService.uploadEventBanner(user.uid, mediaFile, setProgress);
        await eventService.createEvent(user.uid, caption || 'New Event', 'TBD', new Date().toISOString(), '', 'Event Description', downloadUrl);
      }
      // Reset
      setMediaFile(null);
      setMediaUrl(null);
      setCaption('');
      alert(`${uploadType.toUpperCase()} published successfully!`);
    } catch (e) {
      console.error('Publish failed:', e);
      alert('Failed to publish');
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  if (!mediaUrl) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8"
        >
          <div className="flex justify-center gap-4 mb-8">
            <button onClick={() => setUploadType('post')} className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${uploadType === 'post' ? 'bg-dk-primary text-black' : 'bg-white/5 text-zinc-400 hover:text-white'}`}>Post</button>
            <button onClick={() => setUploadType('story')} className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${uploadType === 'story' ? 'bg-dk-primary text-black' : 'bg-white/5 text-zinc-400 hover:text-white'}`}>Story</button>
            <button onClick={() => setUploadType('reel')} className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${uploadType === 'reel' ? 'bg-dk-primary text-black' : 'bg-white/5 text-zinc-400 hover:text-white'}`}>Reel</button>
            <button onClick={() => setUploadType('event')} className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${uploadType === 'event' ? 'bg-dk-primary text-black' : 'bg-white/5 text-zinc-400 hover:text-white'}`}>Event</button>
          </div>
          
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-white/20 hover:border-dk-primary/50 transition-colors rounded-2xl p-12 cursor-pointer flex flex-col items-center"
          >
            <div className="h-16 w-16 bg-white/5 rounded-full flex items-center justify-center mb-4 text-dk-primary">
               {uploadType === 'reel' ? <Video size="32" variant="Bold" /> : <Image size="32" variant="Bold" />}
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Select {uploadType} Media</h3>
            <p className="text-zinc-500 text-sm">Click to browse or drag and drop</p>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            accept={uploadType === 'reel' ? "video/*" : "image/*,video/*"} 
            className="hidden" 
          />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden">
      {/* Editor Main Area */}
      <div className="flex-1 bg-black relative flex items-center justify-center p-4">
        <button onClick={() => setMediaUrl(null)} className="absolute top-4 left-4 z-50 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white backdrop-blur-md">
          <CloseCircle size="24" />
        </button>
        
        <div className="relative w-full max-w-lg aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl bg-zinc-900 border border-white/10">
          {mediaType === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" style={{ filter: activeFilter }} />
          ) : (
            <video src={mediaUrl} className="w-full h-full object-cover" autoPlay loop muted style={{ filter: activeFilter }} />
          )}
        </div>
      </div>

      {/* Editor Sidebar */}
      <div className="w-full lg:w-96 bg-zinc-900 border-l border-white/10 flex flex-col h-full overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-6">Create {uploadType}</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-zinc-400 mb-2">Caption</label>
              <textarea 
                value={caption} 
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption..."
                className="dk-input w-full resize-none"
                rows={4}
              />
            </div>

            {(uploadType === 'story' || uploadType === 'post') && mediaType === 'image' && (
              <div>
                <label className="block text-sm font-bold text-zinc-400 mb-2 flex items-center gap-2">
                  <Filter size="16" /> Filters
                </label>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {[...BASIC_FILTERS, ...NIGHTLIFE_FILTERS].map((f) => (
                    <button
                      key={f.name}
                      onClick={() => setActiveFilter(f.filter)}
                      className={`flex-shrink-0 w-20 h-24 rounded-xl overflow-hidden relative border-2 ${activeFilter === f.filter ? 'border-dk-primary' : 'border-transparent'}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={mediaUrl} alt={f.name} className="w-full h-full object-cover" style={{ filter: f.filter }} />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 text-[10px] font-bold text-white text-center">
                        {f.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-auto p-6 border-t border-white/10 bg-zinc-900">
          <button 
            onClick={handlePublish}
            disabled={isUploading}
            className="w-full dk-btn-primary flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <span>Uploading {Math.round(progress)}%...</span>
            ) : (
              <>
                <Send2 variant="Bold" size="20" /> Publish {uploadType}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
