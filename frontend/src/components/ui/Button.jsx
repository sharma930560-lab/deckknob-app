/**
 * Button — UI primitive
 * Variants: primary (neon-lime fill, black text), secondary (ghost/zinc-800), danger (red)
 * All variants include scale(0.95) press animation via cubic-bezier(0.175, 0.885, 0.32, 1.275)
 * Requirements: 1.7, 1.8
 */

const variantStyles = {
  primary:
    'bg-neon-lime text-black hover:brightness-110 focus-visible:ring-neon-lime/50',
  secondary:
    'bg-zinc-800 text-white border border-white/10 hover:bg-zinc-700 focus-visible:ring-white/20',
  danger:
    'bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-500/50',
};

export default function Button({
  variant = 'primary',
  children,
  onClick,
  type = 'button',
  disabled = false,
  className = '',
  ...rest
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[
        // Base layout & typography
        'inline-flex items-center justify-center gap-2',
        'px-6 py-2.5 rounded-full',
        'font-heading font-semibold text-sm',
        // Transition — covers colour, shadow, and the press scale
        'transition-all duration-200',
        // Press animation: scale(0.95) with the specified cubic-bezier
        'active:scale-95',
        // Focus ring
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
        // Disabled state
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
        // Variant-specific styles
        variantStyles[variant] ?? variantStyles.primary,
        className,
      ].join(' ')}
      style={{
        // Ensure the cubic-bezier is applied to the active:scale transform
        transitionTimingFunction: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
