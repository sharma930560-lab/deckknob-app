/**
 * Badge — UI primitive (small pill)
 * Variants:
 *   live       → neon-lime bg, black text, "LIVE NOW"
 *   today      → neon-pink bg, black text
 *   performing → gradient bg (#f472b6 → #bef264), black text
 *   default    → zinc-800 bg, white text
 * Requirements: 1.4, 3.12, 9.2, 10.6
 */

const variantStyles = {
  live: {
    className: 'bg-neon-lime text-black',
    defaultLabel: 'LIVE NOW',
  },
  today: {
    className: 'bg-neon-pink text-black',
    defaultLabel: 'TODAY',
  },
  performing: {
    className: 'text-black',
    style: { background: 'linear-gradient(135deg, #f472b6, #bef264)' },
    defaultLabel: 'Performing Tonight',
  },
  default: {
    className: 'bg-zinc-800 text-zinc-200',
    defaultLabel: '',
  },
};

export default function Badge({
  variant = 'default',
  children,
  className = '',
}) {
  const config = variantStyles[variant] ?? variantStyles.default;
  const label = children ?? config.defaultLabel;

  return (
    <span
      className={[
        'inline-flex items-center justify-center',
        'px-2 py-0.5 rounded-full',
        'text-[10px] font-heading font-bold leading-none tracking-wide uppercase',
        config.className,
        className,
      ].join(' ')}
      style={config.style}
    >
      {label}
    </span>
  );
}
