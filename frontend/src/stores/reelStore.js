import { create } from 'zustand';
import { reelService } from '../services/reelService';
import { auth } from '../config/firebase';

const useReelStore = create((set, get) => ({
  // State
  reels: [],
  lastDocSnapshot: null,
  hasMore: true,
  isLoading: false,

  // Actions
  fetchReels: async () => {
    const { lastDocSnapshot, hasMore, isLoading } = get();
    if (!hasMore || isLoading) return;

    set({ isLoading: true });

    try {
      const currentUid = auth.currentUser?.uid || null;
      const results = await reelService.getReels(currentUid, lastDocSnapshot, 6);
      
      const newLastDoc = results.length > 0 ? results[results.length - 1].docSnapshot : null;

      set((state) => ({
        reels: [...state.reels, ...results],
        lastDocSnapshot: newLastDoc,
        hasMore: results.length === 6,
        isLoading: false,
      }));
    } catch (err) {
      console.error('[reelStore] fetchReels error:', err);
      set({ isLoading: false });
      throw err;
    }
  },

  refreshReels: async () => {
    set({ reels: [], lastDocSnapshot: null, hasMore: true, isLoading: false });
    await get().fetchReels();
  },

  likeReel: async (reelId) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return;

    // Optimistic UI update
    set((state) => ({
      reels: state.reels.map((reel) =>
        reel.id === reelId
          ? { ...reel, is_liked: true, likes_count: (reel.likes_count ?? 0) + 1 }
          : reel,
      ),
    }));

    try {
      await reelService.likeReel(reelId, currentUid);
    } catch (err) {
      console.error('[reelStore] likeReel error:', err);
      // Revert optimistic update
      set((state) => ({
        reels: state.reels.map((reel) =>
          reel.id === reelId
            ? { ...reel, is_liked: false, likes_count: Math.max(0, (reel.likes_count ?? 1) - 1) }
            : reel,
        ),
      }));
    }
  },

  unlikeReel: async (reelId) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return;

    // Optimistic UI update
    set((state) => ({
      reels: state.reels.map((reel) =>
        reel.id === reelId
          ? { ...reel, is_liked: false, likes_count: Math.max(0, (reel.likes_count ?? 1) - 1) }
          : reel,
      ),
    }));

    try {
      await reelService.unlikeReel(reelId, currentUid);
    } catch (err) {
      console.error('[reelStore] unlikeReel error:', err);
      // Revert optimistic update
      set((state) => ({
        reels: state.reels.map((reel) =>
          reel.id === reelId
            ? { ...reel, is_liked: true, likes_count: (reel.likes_count ?? 0) + 1 }
            : reel,
        ),
      }));
    }
  },

  bookmarkReel: async (reelId) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return;

    let targetState = false;
    set((state) => ({
      reels: state.reels.map((reel) => {
        if (reel.id === reelId) {
          targetState = !reel.is_bookmarked;
          return { ...reel, is_bookmarked: targetState };
        }
        return reel;
      }),
    }));

    try {
      await reelService.bookmarkReel(reelId, currentUid, targetState);
    } catch (err) {
      console.error('[reelStore] bookmarkReel error:', err);
      // Revert optimistic update
      set((state) => ({
        reels: state.reels.map((reel) =>
          reel.id === reelId ? { ...reel, is_bookmarked: !targetState } : reel
        ),
      }));
    }
  },
}));

export default useReelStore;
