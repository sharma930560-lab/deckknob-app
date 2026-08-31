/**
 * StoryAvatar — circular avatar wrapped in StoryRing
 * Props:
 *   user             ({ id, username, profile_pic })
 *   hasUnseen        (bool)
 *   performingTonight (bool) — shows "Performing Tonight" badge
 *   onClick          (function)
 *   size             (number) — avatar diameter in px (default 56)
 * Requirements: 3.2, 3.3, 3.12
 */
import StoryRing from './StoryRing';
import Badge from '../ui/Badge';

export default function StoryAvatar({
  user,
  hasUnseen = false,
  performingTonight = false,
  onClick,
  size = 56,
}) {
  const { username = '', profile_pic } = user ?? {};

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer group focus:outline-none"
      aria-label={`View ${username}'s story`}
    >
      {/* Ring + avatar */}
      <div className="relative">
        <StoryRing hasUnseen={hasUnseen} size={size}>
          {/* Inner white gap between ring and image */}
          <div
            style={{
              width: size,
              height: size,
              borderRadius: '9999px',
              overflow: 'hidden',
              background: '#18181b', // surface colour — gap between ring and image
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {profile_pic ? (
              <img
                src={profile_pic}
                alt={username}
                loading="lazy"
                className="w-full h-full object-cover transition-all group-hover:brightness-110"
                style={{ borderRadius: '9999px' }}
              />
            ) : (
              /* Fallback initials */
              <span
                className="text-zinc-200 font-heading font-semibold text-sm select-none"
                style={{ fontSize: Math.max(size * 0.3, 12) }}
              >
                {username.slice(0, 2).toUpperCase() || '?'}
              </span>
            )}
          </div>
        </StoryRing>

        {/* "Performing Tonight" badge — bottom-centre of the ring */}
        {performingTonight && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 z-10">
            <Badge variant="performing" />
          </div>
        )}
      </div>

      {/* Username label */}
      <span className="text-[11px] text-zinc-300 max-w-[64px] truncate leading-tight">
        {username}
      </span>
    </button>
  );
}
