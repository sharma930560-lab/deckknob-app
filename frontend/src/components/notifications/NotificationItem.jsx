import IconsaxAnimated from '../icons/IconsaxAnimated';

export default function NotificationItem({ notification }) {
  return (
    <div className="flex gap-3 px-4 py-3">
      <IconsaxAnimated name={notification.type || 'bell'} size={18} className="mt-0.5 text-[#DFE104]" />
      <div>
        <p className="text-sm text-zinc-200">{notification.text || notification.verb}</p>
        <p className="text-xs text-zinc-600">{notification.time || notification.relative_time}</p>
      </div>
    </div>
  );
}
