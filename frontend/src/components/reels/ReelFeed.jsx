import { useEffect } from 'react';
import ReelCard from './ReelCard';
import useReelStore from '../../stores/reelStore';

export default function ReelFeed() {
  const { reels, fetchReels, isLoading } = useReelStore();

  useEffect(() => {
    if (reels.length === 0) fetchReels().catch(() => {});
  }, []);

  if (reels.length === 0 && !isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center lg:h-screen">
        <p className="text-sm text-zinc-500">No reels available.</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] snap-y snap-mandatory overflow-y-auto no-scrollbar lg:h-screen relative">
      {reels.map((reel) => (
        <div key={reel.id} className="snap-start">
          <ReelCard reel={reel} />
        </div>
      ))}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
          <p className="text-zinc-500 animate-pulse text-xs">Loading reels...</p>
        </div>
      )}
    </div>
  );
}
