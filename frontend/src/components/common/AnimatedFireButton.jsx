import { useState, useRef, useEffect, memo } from 'react';

/**
 * AnimatedFireButton
 *
 * Smooth, high-performance Fire Reaction component for DECKKNOB.
 * Features:
 * - 3 visual states: Unfired (cool/muted), Igniting (ember burst + warm pop), Burning (vibrant + organic subtle flicker)
 * - Cooldown transition: smoothly loses glow and desaturates on unfire
 * - Optimistic immediate UI response with debounced concurrency protection
 * - Lightweight floating ember sparks using pure CSS keyframes
 * - Full prefers-reduced-motion support
 * - Accessible button semantics with dynamic labels ('Add Fire' / 'Remove Fire')
 * - Responsive sizes: 'sm' (cards/overlays), 'md' (feed posts), 'lg' (reels)
 */

function AnimatedFireButton({
  isLiked = false,
  count = 0,
  onToggle,
  size = 'md',
  showCount = true,
  countDirection = 'right', // 'right' (post card) or 'bottom' (reels/mini cards)
  className = '',
  disabled = false,
  ariaLabel = null
}) {
  const [animating, setAnimating] = useState(false);
  const [showEmbers, setShowEmbers] = useState(false);
  const [prevLiked, setPrevLiked] = useState(isLiked);
  const lockRef = useRef(false);

  // Detect state transitions to trigger ignition embers
  useEffect(() => {
    if (isLiked && !prevLiked) {
      setAnimating(true);
      setShowEmbers(true);
      const timer = setTimeout(() => {
        setAnimating(false);
        setShowEmbers(false);
      }, 700);
      setPrevLiked(isLiked);
      return () => clearTimeout(timer);
    }
    setPrevLiked(isLiked);
  }, [isLiked, prevLiked]);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) return;
    if (lockRef.current) return;

    // Rapid double-tap throttle (250ms)
    lockRef.current = true;
    setTimeout(() => {
      lockRef.current = false;
    }, 260);

    if (onToggle) {
      onToggle(e);
    }
  };

  // Dimensions based on size prop
  const sizeConfig = {
    sm: { iconSize: 'text-xl', glowSize: 'w-7 h-7', countText: 'text-[10px]' },
    md: { iconSize: 'text-2xl', glowSize: 'w-9 h-9', countText: 'text-sm' },
    lg: { iconSize: 'text-3xl', glowSize: 'w-11 h-11', countText: 'text-xs' }
  }[size] || { iconSize: 'text-2xl', glowSize: 'w-9 h-9', countText: 'text-sm' };

  const formattedCount = count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-label={ariaLabel || (isLiked ? 'Remove Fire' : 'Add Fire')}
      title={ariaLabel || (isLiked ? 'Remove Fire' : 'Add Fire')}
      className={`group relative inline-flex items-center justify-center select-none outline-none focus-visible:ring-2 focus-visible:ring-[#DFE104] rounded-full transition-transform active:scale-90 ${
        countDirection === 'bottom' ? 'flex-col gap-1' : 'flex-row gap-2'
      } ${className}`}
    >
      {/* Container for the Flame + Glow + Embers */}
      <span className="relative inline-flex items-center justify-center">
        {/* Warm Ambient Glow behind flame */}
        <span
          className={`pointer-events-none absolute rounded-full blur-md transition-all duration-500 ${sizeConfig.glowSize} ${
            isLiked
              ? 'opacity-85 scale-125 bg-gradient-to-t from-orange-600 via-amber-500 to-yellow-400'
              : 'opacity-0 scale-75 bg-transparent'
          }`}
        />

        {/* Lightweight Ember Sparks on ignition */}
        {showEmbers && (
          <span className="pointer-events-none absolute inset-0 z-10">
            <span className="dk-spark dk-spark-1" />
            <span className="dk-spark dk-spark-2" />
            <span className="dk-spark dk-spark-3" />
            <span className="dk-spark dk-spark-4" />
          </span>
        )}

        {/* Flame SVG / Emoji with Smooth CSS Transition */}
        <span
          className={`relative z-1 inline-block transform-gpu transition-all duration-300 ${sizeConfig.iconSize} ${
            isLiked
              ? 'scale-110 filter drop-shadow-[0_0_10px_rgba(255,100,0,0.9)] dk-flame-active'
              : 'grayscale opacity-70 contrast-75 scale-95 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-100'
          } ${animating ? 'dk-flame-ignite' : ''}`}
        >
          🔥
        </span>
      </span>

      {/* Numerical count */}
      {showCount && (
        <span
          className={`font-bold transition-colors duration-200 tabular-nums ${sizeConfig.countText} ${
            isLiked ? 'text-[#DFE104]' : 'text-zinc-300'
          }`}
        >
          {formattedCount}
        </span>
      )}
    </button>
  );
}

export default memo(AnimatedFireButton);
