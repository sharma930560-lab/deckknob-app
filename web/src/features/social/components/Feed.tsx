'use client';

import { useEffect } from 'react';
import { useFeedStore } from '../stores/feedStore';
import { useReelStore } from '../stores/reelStore';
import PostCard from './PostCard';

export default function Feed() {
  const { posts, fetchPosts, isLoading: postsLoading } = useFeedStore();
  const { fetchReels } = useReelStore();

  useEffect(() => {
    fetchPosts();
    fetchReels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full max-w-xl mx-auto py-8 px-4 sm:px-0">
      {posts.length === 0 && postsLoading && (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-dk-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      
      {posts.length === 0 && !postsLoading && (
        <div className="text-center text-zinc-500 py-12">
          No posts in your feed. Follow some DJs!
        </div>
      )}
    </div>
  );
}
