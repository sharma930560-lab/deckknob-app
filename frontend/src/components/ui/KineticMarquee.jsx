export default function KineticMarquee({ children, className = '', speed = '28s' }) {
  return (
    <div className={`overflow-hidden whitespace-nowrap ${className}`}>
      <div className="dk-marquee-track" style={{ animationDuration: speed }}>
        <span className="dk-marquee-copy">{children}</span>
        <span className="dk-marquee-copy" aria-hidden="true">{children}</span>
      </div>
    </div>
  );
}
