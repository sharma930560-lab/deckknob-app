import { create } from 'zustand';
import { reelService } from '../api/reelService';

interface ReelState {
  reels: any[];
  isLoading: boolean;
  hasMore: boolean;
  fetchReels: () => Promise<void>;
  refreshReels: () => Promise<void>;
}

export const useReelStore = create<ReelState>((set, get) => ({
  reels: [],
  isLoading: false,
  hasMore: true,
  fetchReels: async () => {
    if (get().isLoading || !get().hasMore) return;
    set({ isLoading: true });
    try {
      const newReels = await reelService.getReels();
      set((state) => ({
        reels: [...state.reels, ...newReels],
        hasMore: newReels.length === 10,
        isLoading: false
      }));
    } catch (e) {
      set({ isLoading: false });
    }
  },
  refreshReels: async () => {
    set({ isLoading: true, reels: [], hasMore: true });
    try {
      const newReels = await reelService.getReels();
      set({
        reels: newReels,
        hasMore: newReels.length === 10,
        isLoading: false
      });
    } catch (e) {
      set({ isLoading: false });
    }
  }
}));
