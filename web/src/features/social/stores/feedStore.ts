import { create } from 'zustand';
import { postService } from '../api/postService';

interface FeedState {
  posts: any[];
  isLoading: boolean;
  hasMore: boolean;
  fetchPosts: () => Promise<void>;
  refreshPosts: () => Promise<void>;
}

export const useFeedStore = create<FeedState>((set, get) => ({
  posts: [],
  isLoading: false,
  hasMore: true,
  fetchPosts: async () => {
    if (get().isLoading || !get().hasMore) return;
    set({ isLoading: true });
    try {
      const newPosts = await postService.getFeed();
      set((state) => ({
        posts: [...state.posts, ...newPosts],
        hasMore: newPosts.length === 15, // limit used in postService
        isLoading: false
      }));
    } catch (e) {
      set({ isLoading: false });
    }
  },
  refreshPosts: async () => {
    set({ isLoading: true, posts: [], hasMore: true });
    try {
      const newPosts = await postService.getFeed();
      set({
        posts: newPosts,
        hasMore: newPosts.length === 15,
        isLoading: false
      });
    } catch (e) {
      set({ isLoading: false });
    }
  }
}));
