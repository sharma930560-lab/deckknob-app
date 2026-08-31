import React from 'react';

const stories = [
  { id: 1, username: 'Your Story', image: 'https://i.pravatar.cc/150?u=1', active: false, isUser: true },
  { id: 2, username: 'dj_neon', image: 'https://i.pravatar.cc/150?u=2', active: true },
  { id: 3, username: 'synth_master', image: 'https://i.pravatar.cc/150?u=3', active: true },
  { id: 4, username: 'berlin_beats', image: 'https://i.pravatar.cc/150?u=4', active: true },
  { id: 5, username: 'techno_queen', image: 'https://i.pravatar.cc/150?u=5', active: false },
  { id: 6, username: 'acid_house', image: 'https://i.pravatar.cc/150?u=6', active: true },
  { id: 7, username: 'bass_drop', image: 'https://i.pravatar.cc/150?u=7', active: false },
];

export default function Stories() {
  return (
    <div className="flex items-center gap-4 overflow-x-auto py-4 px-2 no-scrollbar scroll-smooth">
      {stories.map((story) => (
        <div key={story.id} className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group">
          <div className={`${story.active ? 'story-ring-active' : 'p-[2px] bg-zinc-800'} rounded-full transition-transform active:scale-90`}>
            <div className="p-[2px] bg-base-dark rounded-full">
              <img 
                src={story.image} 
                alt={story.username} 
                className="w-14 h-14 rounded-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all"
              />
            </div>
          </div>
          <span className={`text-[11px] max-w-[64px] truncate ${story.isUser ? 'text-zinc-500' : 'text-zinc-300'}`}>
            {story.username}
          </span>
        </div>
      ))}
    </div>
  );
}
