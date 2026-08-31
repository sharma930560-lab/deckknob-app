import { useState } from 'react';
import IconsaxAnimated from '../icons/IconsaxAnimated';

export default function RSVPButtons({ event }) {
  const [active, setActive] = useState(event.user_rsvp_type || 'going');
  return (
    <div className="flex gap-2">
      {['going', 'interested'].map((type) => (
        <button
          key={type}
          onClick={() => setActive(type)}
          className={`dk-button flex-1 px-3 text-sm font-bold ${active === type ? 'bg-[#DFE104] text-black' : 'bg-white/[0.06] text-white'}`}
        >
          <IconsaxAnimated name="users" size={16} />
          {type === 'going' ? 'Going' : 'Interested'}
        </button>
      ))}
    </div>
  );
}
