/**
 * Avatar — UI primitive
 * Props: src, size (sm|md|lg|xl), ring (gradient|grey|live|none), alt
 * ring="gradient" → Story_Ring gradient border (#f472b6 → #bef264)
 * ring="live"     → "LIVE" badge overlay (neon-lime pill, bottom-right)
 * ring="grey"     → grey border
 * ring="none"     → no border
 * Fallback to initials when no src is provided
 * Requirements: 1.8, 3.2, 3.3, 9.2
 */

const sizeMap = {
  sm: { outer: 'w-8 h-8',   text: 'text-xs',  badge: 'text-[8px] px-1 py-px' },
  md: { outer: 'w-10 h-10', text: 'text-sm',  badge: 'text-[9px] px-1.5 py-px' },
  lg: { outer: 'w-14 h-14', text: 'text-base', badge: 'text-[10px] px-1.5 py-0.5' },
  xl: { outer: 'w-20 h-20', text: 'text-xl',  badge: 'text-xs px-2 py-0.5' },
};

/** Derive initials from an alt string (up to 2 characters). */
function getInitials(alt = '') {
  const parts = alt.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return alt.slice(0, 2).toUpperCase() || '?';
}

export default function Avatar({
  src,
  size = 'md',
  ring = 'none',
  alt = '',
}) {
  const { outer, text, badge } = sizeMap[size] ?? sizeMap.md;

  // ── Ring wrapper styles ──────────────────────────────────────────────────
  let ringWrapperStyle = {};
  let ringWrapperClass = 'rounded-full inline-flex items-center justify-center flex-shrink-0';

  if (ring === 'gradient') {
    // Story_Ring: gradient border #f472b6 → #bef264 (pink → lime)
    ringWrapperStyle = {
      background: 'linear-gradient(135deg, #f472b6, #bef264)',
      padding: '2px',
    };
  } else if (ring === 'grey') {
    ringWrapperStyle = {
      background: '#52525b', // zinc-600
      padding: '2px',
    };
  }
  // ring="live" and ring="none" need no wrapper padding/gradient

  // ── Inner image / initials ───────────────────────────────────────────────
  const inner = (
    <div className={`${outer} rounded-full overflow-hidden relative flex-shrink-0`}>
      {src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      ) : (
        <div
          className={`w-full h-full flex items-center justify-center bg-zinc-700 text-zinc-200 font-heading font-semibold ${text}`}
        >
          {getInitials(alt)}
        </div>
      )}

      {/* LIVE badge overlay — bottom-right pill */}
      {ring === 'live' && (
        <span
          className={`absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/3 bg-neon-lime text-black font-heading font-bold rounded-full leading-none ${badge}`}
          aria-label="Live now"
        >
          LIVE
        </span>
      )}
    </div>
  );

  // Wrap with gradient/grey ring when needed
  if (ring === 'gradient' || ring === 'grey') {
    return (
      <div className={ringWrapperClass} style={ringWrapperStyle}>
        {inner}
      </div>
    );
  }

  return inner;
}
