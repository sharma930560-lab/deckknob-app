'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageText, Send2, Bookmark, More } from 'iconsax-react';

export default function PostCard({ post }: { post: any }) {
  const [liked, setLiked] = useState(false);

  return (
    <motion.article 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900 border border-white/10 sm:rounded-[2rem] overflow-hidden mb-6 shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={post.userAvatar || `https://ui-avatars.com/api/?name=${post.username}&background=DFE104&color=000`} 
            alt={post.username}
            className="w-10 h-10 rounded-full object-cover border border-white/10"
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-sm">@{post.username}</h3>
              {post.userRole === 'dj' && (
                <span className="text-[10px] font-black uppercase text-dk-primary bg-dk-primary/10 px-2 rounded-full">
                  DJ
                </span>
              )}
            </div>
            {/* Mock time since it's just a Date or Timestamp in Firestore */}
            <p className="text-xs text-zinc-500">2 hours ago</p>
          </div>
        </div>
        <button className="text-white/50 hover:text-white transition-colors p-2">
          <More size="20" />
        </button>
      </div>

      {/* Media */}
      <div className="relative aspect-square sm:aspect-[4/5] bg-black">
        {post.mediaType === 'video' ? (
          <video 
            src={post.mediaUrl} 
            className="w-full h-full object-cover"
            controls
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img 
            src={post.mediaUrl} 
            alt="Post media" 
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Actions */}
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setLiked(!liked)} 
              className={`transition-colors ${liked ? 'text-rose-500' : 'text-white hover:text-white/70'}`}
            >
              <Heart size="26" variant={liked ? "Bold" : "Outline"} />
            </button>
            <button className="text-white hover:text-white/70 transition-colors">
              <MessageText size="26" />
            </button>
            <button className="text-white hover:text-white/70 transition-colors">
              <Send2 size="26" />
            </button>
          </div>
          <button className="text-white hover:text-white/70 transition-colors">
            <Bookmark size="26" />
          </button>
        </div>

        <p className="font-bold text-sm text-white mb-2">
          {liked ? (post.likesCount || 0) + 1 : (post.likesCount || 0)} likes
        </p>

        {post.caption && (
          <div className="text-sm text-zinc-300">
            <span className="font-bold text-white mr-2">@{post.username}</span>
            {post.caption}
          </div>
        )}
        
        {post.commentsCount > 0 && (
          <button className="text-sm text-zinc-500 mt-2 hover:text-white transition-colors">
            View all {post.commentsCount} comments
          </button>
        )}
      </div>
    </motion.article>
  );
}
