import { create } from 'zustand';
import { storyService } from '../services/storyService';
import { auth } from '../config/firebase';

const useStoryStore = create((set, get) => ({
  groups: [],
  isLoading: false,

  fetchStories: async () => {
    set({ isLoading: true });
    try {
      const currentUid = auth.currentUser?.uid || null;
      const groups = await storyService.getActiveStories(currentUid);
      set({ groups, isLoading: false });
    } catch (err) {
      console.error('[storyStore] fetchStories error:', err);
      set({ isLoading: false });
    }
  },

  markSeen: async (storyId) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return;

    // Optimistically update seen state and has_unseen for the group containing this story
    set((state) => ({
      groups: state.groups.map((group) => {
        const hasStory = group.stories.some((s) => s.id === storyId);
        if (!hasStory) return group;
        
        const allSeen = group.stories.every(
          (s) => s.id === storyId || s.is_seen
        );
        return {
          ...group,
          stories: group.stories.map((s) =>
            s.id === storyId ? { ...s, is_seen: true } : s
          ),
          has_unseen: !allSeen,
        };
      }),
    }));

    try {
      await storyService.markStorySeen(storyId, currentUid);
    } catch (err) {
      console.error('[storyStore] markSeen error:', err);
    }
  },
}));

export default useStoryStore;
