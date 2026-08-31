/**
 * Card — UI primitive
 * rounded-xl, soft drop shadow (0 4px 24px rgba(0,0,0,0.4))
 * translateY(-2px) hover lift with 200ms ease transition
 * Requirements: 1.2, 1.3, 1.7
 */

export default function Card({ children, className = '', ...rest }) {
  return (
    <div
      className={[
        'rounded-xl bg-zinc-900/60 border border-white/10',
        'transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-white/20',
        className,
      ].join(' ')}
      style={{
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        // Hover lift uses 200ms ease as specified in Requirement 1.7
        transitionProperty: 'transform, box-shadow, border-color',
        transitionDuration: '200ms',
        transitionTimingFunction: 'ease',
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
