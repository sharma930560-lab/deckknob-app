import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import useStoryStore from '../../stores/storyStore';
import StoryViewer from './StoryViewer';

export default function StoriesStrip() {
  const [activeGroupIndex, setActiveGroupIndex] = useState(null);
  const { groups, fetchStories, markSeen } = useStoryStore();

  useEffect(() => {
    if (groups.length === 0) fetchStories().catch(() => {});
  }, []);

  const openStoryGroup = (idx) => {
    if (idx < 0 || idx >= groups.length) return;
    setActiveGroupIndex(idx);
  };

  const handleNextUser = () => {
    if (activeGroupIndex !== null && activeGroupIndex < groups.length - 1) {
      setActiveGroupIndex(activeGroupIndex + 1);
    } else {
      setActiveGroupIndex(null);
    }
  };

  const handlePrevUser = () => {
    if (activeGroupIndex !== null && activeGroupIndex > 0) {
      setActiveGroupIndex(activeGroupIndex - 1);
    } else {
      setActiveGroupIndex(null);
    }
  };

  const activeGroup = activeGroupIndex !== null ? groups[activeGroupIndex] : null;

  return (
    <>
      <div className="no-scrollbar flex gap-4 overflow-x-auto border-b border-white/[0.08] px-4 py-4 sm:px-0" aria-label="Stories">
        {/* User's add story shortcut indicator */}
        <div className="flex gap-4">
          {groups.map((group, idx) => (
            <button
              key={group.user?.id || group.user?.username}
              onClick={() => openStoryGroup(idx)}
              className="w-20 shrink-0 text-center"
            >
              <span className={`mx-auto block w-fit rounded-full p-1 ${group.has_unseen ? 'bg-gradient-to-tr from-[#DFE104] to-[#ff3366]' : 'bg-white/[0.08]'}`}>
                <img
                  src={group.user?.profile_pic || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                  alt={group.user?.username}
                  className="h-16 w-16 rounded-full border-2 border-[#09090B] object-cover"
                />
              </span>
              <span className="mt-2 block truncate text-[10px] font-black uppercase tracking-wider text-zinc-400">
                {group.user?.username}
              </span>
            </button>
          ))}
          {groups.length === 0 && (
            <p className="text-xs text-zinc-500 font-bold uppercase my-auto ml-2">No active stories</p>
          )}
        </div>
      </div>

      <AnimatePresence>
        {activeGroup && (
          <StoryViewer
            activeGroup={activeGroup}
            onNextUser={handleNextUser}
            onPrevUser={handlePrevUser}
            onClose={() => setActiveGroupIndex(null)}
            onStorySeen={markSeen}
          />
        )}
      </AnimatePresence>
    </>
  );
}
