import { useState } from 'react';
import IconsaxAnimated from '../icons/IconsaxAnimated';

export default function ReelCard({ reel }) {
  const [liked, setLiked] = useState(reel.is_liked);
  const [saved, setSaved] = useState(reel.is_bookmarked);

  return (
    <section className="relative h-[calc(100vh-5rem)] min-h-[680px] overflow-hidden bg-black lg:h-screen">
      <img src={reel.poster} alt={reel.caption} className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/20" />
      <div className="absolute right-4 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-6">
        <Action icon="heart" active={liked} label={reel.likes_count + (liked ? 1 : 0)} onClick={() => setLiked((value) => !value)} />
        <Action icon="comment" label={reel.comments_count} />
        <Action icon="send" />
        <Action icon="save" active={saved} onClick={() => setSaved((value) => !value)} />
      </div>
      <div className="absolute inset-x-0 bottom-0 z-10 p-5 pb-10 lg:p-8">
        <div className="flex items-center gap-3">
          <img src={reel.user.avatar} alt={reel.user.username} className="h-11 w-11 rounded-full object-cover" />
          <p className="font-bold">@{reel.user.username}</p>
          <button className="dk-button h-9 bg-white px-4 text-xs font-black uppercase tracking-[0.12em] text-black">Follow</button>
        </div>
        <p className="mt-3 max-w-md text-sm text-zinc-200">{reel.caption}</p>
        <p className="mt-4 w-fit rounded-full bg-[#DFE104] px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-black">Swipe for next set</p>
      </div>
    </section>
  );
}

function Action({ icon, active = false, label, onClick }) {
  return (
    <button onClick={onClick} className={`grid place-items-center gap-1 text-white ${active ? 'text-[#DFE104]' : ''}`}>
      <span className="dk-button h-12 w-12 bg-black/35 backdrop-blur-md">
        <IconsaxAnimated name={icon} size={26} filled={active} />
      </span>
      {label != null && <span className="text-xs font-bold">{Number(label).toLocaleString()}</span>}
    </button>
  );
}
