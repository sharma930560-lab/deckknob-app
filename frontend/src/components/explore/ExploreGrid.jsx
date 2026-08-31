import IconsaxAnimated from '../icons/IconsaxAnimated';

export default function ExploreGrid({ items = [] }) {
  return (
    <div className="grid grid-cols-3 gap-1">
      {items.map((item) => (
        <div key={item.id} className="relative">
          <img src={item.image || item.media_url} alt="" className="aspect-square w-full object-cover" />
          {item.isReel && <IconsaxAnimated name="reel" className="absolute right-2 top-2 text-white" />}
        </div>
      ))}
    </div>
  );
}
