import { create } from 'zustand';
import { postService } from '../services/postService';
import { auth } from '../config/firebase';

const useFeedStore = create((set, get) => ({
  // State
  posts: [],
  lastDocSnapshot: null,
  hasMore: true,
  isLoading: false,
  scrollY: 0,

  // Actions
  fetchPosts: async () => {
    const { lastDocSnapshot, isLoading, hasMore } = get();

    // Guard: don't fetch if already loading or no more pages
    if (isLoading || !hasMore) return;

    set({ isLoading: true });

    try {
      const currentUid = auth.currentUser?.uid || null;
      const results = await postService.getFeedPosts(currentUid, lastDocSnapshot, 6);
      
      const newLastDoc = results.length > 0 ? results[results.length - 1].docSnapshot : null;

      set((state) => ({
        posts: [...state.posts, ...results],
        lastDocSnapshot: newLastDoc,
        hasMore: results.length === 6,
        isLoading: false,
      }));
    } catch (err) {
      console.error('[feedStore] fetchPosts error:', err);
      set({ isLoading: false });
      throw err;
    }
  },

  refreshPosts: async () => {
    set({ posts: [], lastDocSnapshot: null, hasMore: true, isLoading: false });
    await get().fetchPosts();
  },

  likePost: async (postId) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return;

    // Optimistic UI update
    set((state) => ({
      posts: state.posts.map((post) =>
        post.id === postId
          ? {
              ...post,
              is_liked: true,
              likes_count: (post.likes_count ?? 0) + 1,
            }
          : post,
      ),
    }));

    try {
      await postService.likePost(postId, currentUid);
    } catch (err) {
      console.error('[feedStore] likePost error:', err);
      // Revert optimistic update
      set((state) => ({
        posts: state.posts.map((post) =>
          post.id === postId
            ? {
                ...post,
                is_liked: false,
                likes_count: Math.max(0, (post.likes_count ?? 1) - 1),
              }
            : post,
        ),
      }));
    }
  },

  unlikePost: async (postId) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return;

    // Optimistic UI update
    set((state) => ({
      posts: state.posts.map((post) =>
        post.id === postId
          ? {
              ...post,
              is_liked: false,
              likes_count: Math.max(0, (post.likes_count ?? 1) - 1),
            }
          : post,
      ),
    }));

    try {
      await postService.unlikePost(postId, currentUid);
    } catch (err) {
      console.error('[feedStore] unlikePost error:', err);
      // Revert optimistic update
      set((state) => ({
        posts: state.posts.map((post) =>
          post.id === postId
            ? {
                ...post,
                is_liked: true,
                likes_count: (post.likes_count ?? 0) + 1,
              }
            : post,
        ),
      }));
    }
  },

  bookmarkPost: async (postId) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return;

    let targetState = false;
    set((state) => ({
      posts: state.posts.map((post) => {
        if (post.id === postId) {
          targetState = !post.is_bookmarked;
          return { ...post, is_bookmarked: targetState };
        }
        return post;
      }),
    }));

    try {
      await postService.bookmarkPost(postId, currentUid, targetState);
    } catch (err) {
      console.error('[feedStore] bookmarkPost error:', err);
      // Revert optimistic update
      set((state) => ({
        posts: state.posts.map((post) =>
          post.id === postId ? { ...post, is_bookmarked: !targetState } : post
        ),
      }));
    }
  },

  setScrollY: (y) => {
    set({ scrollY: y });
  },
}));

export default useFeedStore;
