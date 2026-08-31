/**
 * StoryRing — gradient or grey border wrapper for story avatars
 * Props:
 *   hasUnseen (bool)  — true → gradient border (#f472b6 → #bef264)
 *                       false → grey border
 *   children          — content to wrap (typically an avatar image)
 *   size (number)     — outer diameter in px (default 56)
 * Requirements: 3.2, 3.3
 */

export default function StoryRing({ hasUnseen = false, children, size = 56 }) {
  const wrapperStyle = {
    width: size + 4,   // 2px padding each side
    height: size + 4,
    borderRadius: '9999px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    padding: '2px',
    background: hasUnseen
      ? 'linear-gradient(135deg, #f472b6, #bef264)'
      : '#52525b', // zinc-600 grey
  };

  return (
    <div style={wrapperStyle} aria-hidden="true">
      {children}
    </div>
  );
}
