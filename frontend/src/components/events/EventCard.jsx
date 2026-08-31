import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import IconsaxAnimated from '../icons/IconsaxAnimated';

export default function EventCard({ event, compact = false }) {
  const bannerImage = event.image || event.media_url || event.mediaUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600';
  const lineupDisplay = Array.isArray(event.lineup) && event.lineup.length > 0
    ? event.lineup.join(' / ')
    : (event.username || 'Underground Selectors');

  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25, ease: [0.175, 0.885, 0.32, 1.275] }}
      className="dk-panel overflow-hidden rounded-[1.75rem]"
    >
      <Link to={`/events/${event.id}`} className="block">
        <div className={`relative overflow-hidden ${compact ? 'aspect-[16/10]' : 'aspect-[16/11]'}`}>
          <img
            src={bannerImage}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
            onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
          <div className="absolute left-4 top-4 rounded-full bg-[#DFE104] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-black">
            {event.date || 'TONIGHT'}
          </div>
          <div className="absolute inset-x-4 bottom-4">
            <h3 className="text-2xl sm:text-3xl font-black uppercase leading-none tracking-[-0.06em]">{event.title}</h3>
            <p className="mt-1 text-sm text-zinc-300">{event.venue} {event.city ? `/ ${event.city}` : ''}</p>
          </div>
        </div>
      </Link>

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Info icon="clock" label={event.time || '10:00 PM'} />
          <Info icon="location" label={event.city || event.venue || 'Local Scene'} />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Lineup</p>
          <p className="mt-1 text-sm text-zinc-200 truncate">{lineupDisplay}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/events/${event.id}`}
            className="dk-button flex-1 bg-[#DFE104] px-4 text-xs font-black uppercase tracking-[0.12em] text-black text-center"
          >
            Details & RSVP
          </Link>
          {(event.url || event.ticketUrl) && (
            <a
              href={event.url || event.ticketUrl}
              target="_blank"
              rel="noreferrer"
              className="dk-button flex-1 bg-white/[0.06] hover:bg-white/[0.1] px-4 text-xs font-bold text-white text-center flex items-center justify-center gap-1.5"
            >
              <IconsaxAnimated name="link" size={15} />
              Venue Link
            </a>
          )}
        </div>
      </div>
    </motion.article>
  );
}

function Info({ icon, label }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-white/[0.04] px-3 py-2 text-zinc-300">
      <IconsaxAnimated name={icon} size={16} className="text-[#DFE104] shrink-0" />
      <span className="truncate text-xs">{label}</span>
    </div>
  );
}
