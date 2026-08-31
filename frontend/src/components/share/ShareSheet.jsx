import IconsaxAnimated from '../icons/IconsaxAnimated';

export default function ShareSheet({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/60 backdrop-blur-sm sm:place-items-center">
      <div className="dk-panel w-full rounded-t-[2rem] p-5 sm:max-w-sm sm:rounded-[2rem]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black uppercase tracking-[-0.04em]">Share</h2>
          <button onClick={onClose} className="dk-button h-10 w-10 bg-white/[0.06]" aria-label="Close share sheet">
            <IconsaxAnimated name="close" size={20} />
          </button>
        </div>
        {['Copy link', 'Send to follower', 'Share to story'].map((label, index) => (
          <button key={label} className="mb-2 flex w-full items-center gap-3 rounded-3xl bg-white/[0.04] p-4 text-left">
            <IconsaxAnimated name={index === 0 ? 'copy' : index === 1 ? 'send' : 'user'} className="text-[#DFE104]" />
            <span className="font-bold">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
