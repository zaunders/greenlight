interface NotificationBadgeProps {
  count: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function NotificationBadge({ count, size = 'md' }: NotificationBadgeProps) {
  if (count === 0) return null;

  const sizeClasses = {
    sm: 'w-2 h-2 text-xs',
    md: 'w-3 h-3 text-xs',
    lg: 'w-4 h-4 text-xs'
  };

  const positionClasses = {
    sm: '-top-1 -right-1',
    md: '-top-1 -right-1',
    lg: '-top-1 -right-1'
  };

  return (
    <div className={`absolute ${positionClasses[size]} flex items-center justify-center`}>
      {count <= 3 ? (
        // Red dot for 1-3 notifications
        <div className={`${sizeClasses[size]} bg-red-500 rounded-full`} />
      ) : (
        // Number badge for 4+ notifications
        <div className={`${sizeClasses[size]} bg-red-500 text-white rounded-full flex items-center justify-center font-bold min-w-[1rem]`}>
          {count > 99 ? '99+' : count}
        </div>
      )}
    </div>
  );
} 