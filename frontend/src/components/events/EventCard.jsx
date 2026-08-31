import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import IconsaxAnimated from '../icons/IconsaxAnimated';

export default function EventCard({ event, compact = false }) {
  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25, ease: [0.175, 0.885, 0.32, 1.275] }}
      className="dk-panel overflow-hidden rounded-[1.75rem]"
    >
      <Link to={`/events/${event.id}`} className="block">
        <div className={`relative overflow-hidden ${compact ? 'aspect-[16/10]' : 'aspect-[16/11]'}`}>
          <img src={event.image} alt={event.title} className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
          <div className="absolute left-4 top-4 rounded-full bg-[#DFE104] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-black">
            {event.date}
          </div>
          <div className="absolute inset-x-4 bottom-4">
            <h3 className="text-3xl font-black uppercase leading-none tracking-[-0.06em]">{event.title}</h3>
            <p className="mt-1 text-sm text-zinc-300">{event.venue} / {event.city}</p>
          </div>
        </div>
      </Link>

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Info icon="clock" label={event.time} />
          <Info icon="location" label={event.map} />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Lineup</p>
          <p className="mt-1 text-sm text-zinc-200">{event.lineup.join(' / ')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="dk-button flex-1 bg-[#DFE104] px-4 text-sm font-black uppercase tracking-[0.12em] text-black">
            RSVP
          </button>
          <a href={event.url} target="_blank" rel="noreferrer" className="dk-button flex-1 bg-white/[0.06] px-4 text-sm font-bold text-white">
            <IconsaxAnimated name="link" size={17} />
            Visit Venue
          </a>
        </div>
      </div>
    </motion.article>
  );
}

function Info({ icon, label }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-white/[0.04] px-3 py-2 text-zinc-300">
      <IconsaxAnimated name={icon} size={16} className="text-[#DFE104]" />
      <span className="truncate">{label}</span>
    </div>
  );
}
