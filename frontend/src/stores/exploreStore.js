import { create } from 'zustand';
import { exploreService } from '../services/exploreService';
import { auth } from '../config/firebase';

const useExploreStore = create((set) => ({
  trending: { posts: [], reels: [] },
  suggested: [],
  searchResults: { users: [], hashtags: [] },
  isLoading: false,

  fetchTrending: async () => {
    set({ isLoading: true });
    try {
      const data = await exploreService.getTrending();
      set({ trending: data });
    } catch (e) {
      console.error('[exploreStore] fetchTrending error:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchSuggested: async () => {
    try {
      const currentUid = auth.currentUser?.uid || null;
      const data = await exploreService.getSuggestedUsers(currentUid);
      set({ suggested: data });
    } catch (e) {
      console.error('[exploreStore] fetchSuggested error:', e);
    }
  },

  search: async (queryText) => {
    if (!queryText || queryText.length < 2) {
      set({ searchResults: { users: [], hashtags: [] } });
      return;
    }
    try {
      const data = await exploreService.search(queryText);
      set({ searchResults: data });
    } catch (e) {
      console.error('[exploreStore] search error:', e);
    }
  },
}));

export default useExploreStore;
