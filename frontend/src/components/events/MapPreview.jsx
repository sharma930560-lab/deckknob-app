import IconsaxAnimated from '../icons/IconsaxAnimated';

export default function MapPreview({ locationName }) {
  return (
    <div className="rounded-3xl bg-[#27272A] p-4">
      <div className="flex h-28 items-center justify-center rounded-2xl bg-black/30 text-[#DFE104]">
        <IconsaxAnimated name="location" size={32} />
      </div>
      {locationName && <p className="mt-2 text-xs text-zinc-400">{locationName}</p>}
    </div>
  );
}
