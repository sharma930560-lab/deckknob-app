import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageSquare, Share2 } from 'lucide-react';

export default function Feed() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    // TODO: Fetch posts from API
    setPosts([
      {
        id: 1,
        username: 'DJ_Neon',
        profile_pic: null,
        media_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7',
        media_type: 'image',
        caption: 'Last night was insane! 💥 #techno',
        created_at: new Date().toISOString(),
        likes: 124,
        comments: 12,
      },
      {
        id: 2,
        username: 'SynthMaster',
        profile_pic: null,
        media_url: 'https://images.unsplash.com/photo-1598387993441-a364f854c3e1',
        media_type: 'image',
        caption: 'New tracks coming soon. Stay tuned.',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        likes: 89,
        comments: 5,
      }
    ]);
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {posts.map(post => (
        <article key={post.id} className="neo-container glass-panel overflow-hidden">
          {/* Post Header */}
          <div className="p-4 border-b-2 border-black flex items-center justify-between bg-black/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-neon-lime text-black rounded-full border-2 border-black flex items-center justify-center font-black italic shadow-[2px_2px_0_black]">
                {post.profile_pic ? (
                  <img src={post.profile_pic} alt="" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <span>{post.username[0]}</span>
                )}
              </div>
              <Link to={`/profile/${post.username}`} className="font-heading font-black italic tracking-tighter hover:text-neon-pink transition-colors">
                {post.username.toUpperCase()}
              </Link>
            </div>
            <span className="text-[10px] font-mono text-neon-lime bg-black px-2 py-1 border border-neon-lime/30">
              {new Date(post.created_at).toLocaleDateString()}
            </span>
          </div>

          {/* Post Media */}
          <div className="border-b-2 border-black bg-black aspect-video flex items-center justify-center relative overflow-hidden group">
            {post.media_type === 'image' ? (
              <img src={post.media_url} alt="Post" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            ) : (
              <video src={post.media_url} controls className="w-full h-full object-contain" />
            )}
            <div className="absolute top-2 right-2 bg-neon-pink text-black text-[10px] font-black px-2 py-1 rotate-3 border-2 border-black">
              LIVE_NOW
            </div>
          </div>

          {/* Post Actions & Caption */}
          <div className="p-4 bg-black/40">
            <div className="flex gap-4 mb-4">
              <button className="hover:text-neon-pink transition-all flex items-center gap-1 group">
                <Heart size={24} className="group-hover:fill-neon-pink" /> <span className="font-mono text-xs">{post.likes}</span>
              </button>
              <button className="hover:text-neon-lime transition-all flex items-center gap-1 group">
                <MessageSquare size={24} className="group-hover:fill-neon-lime" /> <span className="font-mono text-xs">{post.comments}</span>
              </button>
              <button className="hover:text-neon-lime transition-colors ml-auto">
                <Share2 size={24} />
              </button>
            </div>
            
            <div className="text-sm">
              <span className="font-heading font-black italic text-neon-pink mr-2">@{post.username.toLowerCase()}</span>
              <span className="text-gray-200">{post.caption}</span>
            </div>
          </div>
        </article>
      ))}
      
      {posts.length === 0 && (
        <div className="text-center p-8 text-gray-400">
          No posts yet. Be the first to share something!
        </div>
      )}
    </div>
  );
}
