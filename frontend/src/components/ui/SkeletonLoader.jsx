/**
 * SkeletonLoader — UI primitive
 * Variants: post-card | story-circle | event-card | reel-card
 * Uses the `animate-shimmer` class defined in index.css
 * Requirements: 1.10, 4.10, 14.2
 */

/** Reusable shimmer block */
function Shimmer({ className = '' }) {
  return <div className={`animate-shimmer rounded ${className}`} />;
}

/** post-card: full-width card with avatar row + image block + action row */
function PostCardSkeleton({ className = '' }) {
  return (
    <div
      className={`rounded-xl overflow-hidden bg-zinc-900/60 border border-white/10 ${className}`}
      style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}
      aria-hidden="true"
    >
      {/* Avatar row */}
      <div className="flex items-center gap-3 p-3">
        <Shimmer className="w-9 h-9 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Shimmer className="h-3 w-28 rounded-full" />
          <Shimmer className="h-2.5 w-16 rounded-full" />
        </div>
      </div>

      {/* Image block */}
      <Shimmer className="w-full aspect-square rounded-none" />

      {/* Action row */}
      <div className="flex items-center gap-4 p-3">
        <Shimmer className="w-6 h-6 rounded-full" />
        <Shimmer className="w-6 h-6 rounded-full" />
        <Shimmer className="w-6 h-6 rounded-full" />
        <div className="ml-auto">
          <Shimmer className="w-6 h-6 rounded-full" />
        </div>
      </div>

      {/* Caption lines */}
      <div className="px-3 pb-3 space-y-1.5">
        <Shimmer className="h-2.5 w-full rounded-full" />
        <Shimmer className="h-2.5 w-3/4 rounded-full" />
      </div>
    </div>
  );
}

/** story-circle: circular avatar with label below */
function StoryCircleSkeleton({ className = '' }) {
  return (
    <div
      className={`flex flex-col items-center gap-1.5 flex-shrink-0 ${className}`}
      aria-hidden="true"
    >
      <Shimmer className="w-14 h-14 rounded-full" />
      <Shimmer className="h-2 w-10 rounded-full" />
    </div>
  );
}

/** event-card: card with image + text lines */
function EventCardSkeleton({ className = '' }) {
  return (
    <div
      className={`rounded-xl overflow-hidden bg-zinc-900/60 border border-white/10 ${className}`}
      style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}
      aria-hidden="true"
    >
      {/* Thumbnail */}
      <Shimmer className="w-full h-40 rounded-none" />

      <div className="p-3 space-y-2">
        {/* Title */}
        <Shimmer className="h-3.5 w-3/4 rounded-full" />
        {/* Date / location */}
        <Shimmer className="h-2.5 w-1/2 rounded-full" />
        <Shimmer className="h-2.5 w-2/5 rounded-full" />

        {/* Avatar + RSVP row */}
        <div className="flex items-center justify-between pt-1">
          <Shimmer className="w-7 h-7 rounded-full" />
          <div className="flex gap-2">
            <Shimmer className="h-7 w-16 rounded-full" />
            <Shimmer className="h-7 w-20 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** reel-card: full-screen vertical card */
function ReelCardSkeleton({ className = '' }) {
  return (
    <div
      className={`relative w-full h-full min-h-screen bg-zinc-900 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {/* Full-screen shimmer background */}
      <Shimmer className="absolute inset-0 rounded-none" />

      {/* Bottom-left author info overlay */}
      <div className="absolute bottom-20 left-4 space-y-2">
        <div className="flex items-center gap-2">
          <Shimmer className="w-9 h-9 rounded-full" />
          <Shimmer className="h-3 w-24 rounded-full" />
        </div>
        <Shimmer className="h-2.5 w-40 rounded-full" />
        <Shimmer className="h-2.5 w-32 rounded-full" />
      </div>

      {/* Right-side action buttons overlay */}
      <div className="absolute right-4 bottom-32 flex flex-col gap-5 items-center">
        {[...Array(4)].map((_, i) => (
          <Shimmer key={i} className="w-8 h-8 rounded-full" />
        ))}
      </div>
    </div>
  );
}

const variantMap = {
  'post-card': PostCardSkeleton,
  'story-circle': StoryCircleSkeleton,
  'event-card': EventCardSkeleton,
  'reel-card': ReelCardSkeleton,
};

export default function SkeletonLoader({ variant = 'post-card', className = '' }) {
  const Component = variantMap[variant] ?? PostCardSkeleton;
  return <Component className={className} />;
}
