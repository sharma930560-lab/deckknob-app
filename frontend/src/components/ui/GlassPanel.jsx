/**
 * GlassPanel — UI primitive
 * backdrop-blur-xl, bg-white/[0.06], border border-white/[0.12], rounded-xl
 * Used for modals, drawers, notification hub, and other overlay surfaces
 * Requirements: 1.9
 */

export default function GlassPanel({ children, className = '', ...rest }) {
  return (
    <div
      className={[
        'bg-white/[0.06]',
        'backdrop-blur-xl',
        'border border-white/[0.12]',
        'rounded-xl',
        className,
      ].join(' ')}
      style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}
      {...rest}
    >
      {children}
    </div>
  );
}
