import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

const RECENT_KEY = 'dk_recent_emojis';
function getRecent() { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; } }
function saveRecent(emoji) {
  const r = getRecent();
  localStorage.setItem(RECENT_KEY, JSON.stringify([emoji, ...r.filter(e => e !== emoji)].slice(0, 30)));
}

const CATS = [
  { id: 'recent', label: 'Recent', icon: '🕐', e: [] },
  {
    id: 'smileys', label: 'Smileys & People', icon: '😀',
    e: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','💩','🤡','👻','👽','🤖','👋','✋','👌','✌️','🤞','👍','👎','👏','🙌','🙏','💪','❤️','🔥','💯','⚡','🎉','🎧','🎵','🎶','🎸','🎤']
  },
  {
    id: 'animals', label: 'Animals & Nature', icon: '🐶',
    e: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🐢','🐍','🦎','🐙','🦑','🦐','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐘','🦛','🦏','🐪','🦒','🌵','🌲','🌳','🌴','🌱','🌿','🍀','🍃','🍂','🍁','🍄','💐','🌷','🌹','🌺','🌸','🌼','🌻','🌞','🌕','⭐','🌟','✨','🌈']
  },
  {
    id: 'food', label: 'Food & Drink', icon: '🍕',
    e: ['🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🧄','🧅','🥔','🍠','🌽','🥗','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🍤','🍙','🍚','🍘','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🥚','🍳','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🥪','🌮','🌯','🍞','🧀','🍷','🍸','🍹','🍺','🍻','🥂','🥃','🧃','🍵','☕','🧋','🥛','🍼']
  },
  {
    id: 'activity', label: 'Activity', icon: '🏀',
    e: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🏓','🏸','🎿','🛷','🎯','🎣','🤿','🎽','🛹','🏋️','🤸','🏄','🏊','🤽','🚣','🧗','🚵','🚴','🏆','🥇','🥈','🥉','🏅','🎖️','🎫','🎟️','🎪','🎭','🎨','🎬','🎤','🎧','🎼','🎹','🎸','🎷','🎺','🎻','🥁','🎲','🎮','🕹️','🎰','🧸']
  },
  {
    id: 'travel', label: 'Travel & Places', icon: '✈️',
    e: ['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🛵','🚲','🛴','🚁','🛸','🚀','✈️','🛩️','💺','🚂','🚆','🚇','🚊','⛵','🚤','🛥️','🛳️','🚢','⚓','🗺️','🧭','🗻','🏔️','⛰️','🌋','🏕️','🏖️','🏜️','🏝️','🏟️','🏛️','🏠','🏡','🏢','🏥','🏦','🏨','🏪','🏫','🏬','🏭','🗼','🗽','⛪','🕌','⛩️','🌃','🌄','🌅','🌆','🌇','🌉','🌍','🌎','🌏']
  },
  {
    id: 'objects', label: 'Objects', icon: '💡',
    e: ['⌚','📱','📲','💻','⌨️','🖥️','🖨️','🖱️','🕹️','💾','💿','📀','📷','📸','📹','🎥','📽️','📞','☎️','📺','📻','🧭','⏱️','⏲️','⏰','📡','🔋','🔌','💡','🔦','🕯️','💸','💵','💰','💳','💎','⚖️','🧲','🔧','🔩','⚙️','🗜️','🔑','🗝️','🔨','⚒️','🛠️','🔫','🏹','🛡️','🔪','💉','🩺','🩹','🧰','📦','📫','📬','📭','📮','📝','✏️','✒️','📏','📐','✂️','🔐','🔒','🔓']
  },
  {
    id: 'symbols', label: 'Symbols', icon: '❤️',
    e: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','⭐','🌟','✨','💫','🔥','💥','❗','❓','‼️','⁉️','🔱','⚜️','🔰','✅','❎','🆗','🆕','🆙','🆒','🆓','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🟤','🔶','🔷','🔸','🔹','🔺','🔻','💠','🔘','🔲','🔳','🟥','🟧','🟨','🟩','🟦','🟪','⬛','⬜','🔈','🔉','🔊','📢','📣','🔔','🔕','🎵','🎶','💬','💭','💤','🛑','⛔','🚫','✔️','❌','⭕']
  }
];

export default function EmojiPicker({ onSelect, onClose, className = '' }) {
  const [activeCat, setActiveCat] = useState('smileys');
  const [search, setSearch] = useState('');
  const [recent, setRecent] = useState(getRecent);
  const ref = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => { searchRef.current?.focus(); }, []);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose?.(); };
    const t = setTimeout(() => document.addEventListener('mousedown', h), 100);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', h); };
  }, [onClose]);

  const pick = useCallback((emoji) => {
    saveRecent(emoji);
    setRecent(getRecent());
    onSelect(emoji);
  }, [onSelect]);

  const allE = CATS.flatMap(c => c.id === 'recent' ? [] : c.e);
  const searched = search.trim() ? allE.filter(e => e.includes(search)) : null;
  const show = searched ?? (activeCat === 'recent' ? recent : CATS.find(c => c.id === activeCat)?.e ?? []);
  const cats = CATS.map(c => ({ ...c, e: c.id === 'recent' ? recent : c.e }));

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.92, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 8 }}
      transition={{ duration: 0.15 }}
      className={`w-72 rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl shadow-black/60 overflow-hidden ${className}`}
      style={{ zIndex: 9999 }}
      onClick={e => e.stopPropagation()}
    >
      {/* Search */}
      <div className="p-3 border-b border-white/[0.06]">
        <input
          ref={searchRef}
          type="text"
          placeholder="Search emoji..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-xl bg-white/[0.06] px-3 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:ring-1 focus:ring-[#DFE104]/40"
        />
      </div>

      {/* Category tabs */}
      {!search && (
        <div
          className="flex items-center gap-0.5 overflow-x-auto px-2 py-1.5 border-b border-white/[0.06]"
          style={{ scrollbarWidth: 'none' }}
        >
          {cats.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCat(cat.id)}
              title={cat.label}
              className={`flex-shrink-0 w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all ${activeCat === cat.id ? 'bg-[#DFE104]/20 text-[#DFE104]' : 'text-zinc-400 hover:bg-white/[0.06] hover:text-white'}`}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div
        className="h-52 overflow-y-auto p-2"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
      >
        {show.length === 0 ? (
          <div className="flex h-full items-center justify-center text-zinc-500 text-sm">
            {search ? 'No results' : 'No recent emojis'}
          </div>
        ) : (
          <div className="grid grid-cols-8 gap-0.5">
            {show.map((emoji, i) => (
              <button
                key={`${emoji}-${i}`}
                onClick={() => pick(emoji)}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-xl hover:bg-white/[0.08] transition-colors active:scale-90"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {!search && (
        <div className="px-3 py-1.5 border-t border-white/[0.06] bg-zinc-900/80">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            {cats.find(c => c.id === activeCat)?.label || 'Emojis'}
          </p>
        </div>
      )}
    </motion.div>
  );
}
