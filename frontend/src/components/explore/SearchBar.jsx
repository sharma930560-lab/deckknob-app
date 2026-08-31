import IconsaxAnimated from '../icons/IconsaxAnimated';

export default function SearchBar(props) {
  return (
    <div className="dk-panel flex items-center gap-3 rounded-full px-4 py-3">
      <IconsaxAnimated name="search" className="text-zinc-500" />
      <input className="flex-1 bg-transparent outline-none" {...props} />
    </div>
  );
}
