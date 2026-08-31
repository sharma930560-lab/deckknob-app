import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import IconsaxAnimated from '../icons/IconsaxAnimated';

const createOptions = [
  { label: 'Post', description: 'Drop a photo, poster, or set clip', icon: 'image', path: '/upload' },
  { label: 'Klyp', description: 'Publish a vertical moment', icon: 'reel', path: '/upload?type=reel' },
  { label: 'Event', description: 'Promote a night or festival stage', icon: 'calendar', path: '/create-event' },
];

export default function CreateSheet({ open, onClose }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-label="Close create menu" />
      <motion.div
        initial={{ y: 80, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="dk-panel relative w-full rounded-t-[2rem] p-5 lg:max-w-md lg:rounded-[2rem]"
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#DFE104]">Create</p>
            <h2 className="text-2xl font-black tracking-[-0.04em]">Start the signal</h2>
          </div>
          <button onClick={onClose} className="dk-button h-10 w-10 bg-white/[0.06] text-zinc-300" aria-label="Close">
            <IconsaxAnimated name="close" size={20} />
          </button>
        </div>

        <div className="space-y-2">
          {createOptions.map((option) => (
            <button
              key={option.label}
              onClick={() => {
                onClose();
                navigate(option.path);
              }}
              className="group flex w-full items-center gap-4 rounded-3xl bg-white/[0.04] p-4 text-left transition-all hover:-translate-y-0.5 hover:bg-white/[0.08]"
            >
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#DFE104]/12 text-[#DFE104]">
                <IconsaxAnimated name={option.icon} size={23} />
              </span>
              <span>
                <span className="block font-bold uppercase tracking-[0.08em]">{option.label}</span>
                <span className="text-sm text-zinc-500">{option.description}</span>
              </span>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
