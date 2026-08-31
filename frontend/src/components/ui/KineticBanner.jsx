import Marquee from 'react-fast-marquee';

export default function KineticBanner({ eyebrow = 'LIVE NOW', title = 'DECKKNOB', items = [] }) {
  const marqueeItems = items.length ? items : ['DJ CULTURE', 'EVENTS', 'REELS', 'NIGHTLIFE', 'COMMUNITY'];

  return (
    <section className="kinetic-banner overflow-hidden rounded-none border-y border-white/10 bg-[#DFE104] text-[#09090B]">
      <div className="px-4 py-3 text-[11px] font-black uppercase tracking-[0.28em]">{eyebrow}</div>
      <Marquee speed={70} gradient={false} autoFill>
        {marqueeItems.map((item) => (
          <span key={item} className="mr-8 font-black uppercase leading-none text-[clamp(3rem,12vw,14rem)] tracking-tight">
            {title} {item}
          </span>
        ))}
      </Marquee>
    </section>
  );
}
