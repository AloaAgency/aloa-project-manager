'use client';

import Image from 'next/image';

export default function UserAvatar({ user, size = 'sm', showName = false, className = '' }) {
  // Size mappings with pixel values for Image component
  const sizeConfig = {
    xs: { className: 'w-6 h-6 text-xs', pixels: 24 },
    sm: { className: 'w-8 h-8 text-sm', pixels: 32 },
    md: { className: 'w-10 h-10 text-base', pixels: 40 },
    lg: { className: 'w-12 h-12 text-lg', pixels: 48 },
    xl: { className: 'w-16 h-16 text-xl', pixels: 64 }
  };

  const currentSize = sizeConfig[size] || sizeConfig.sm;
  const sizeClass = currentSize.className;
  const imageSize = currentSize.pixels;

  // Get initials from name or email
  const getInitials = () => {
    if (user?.full_name) {
      const names = user.full_name.trim().split(' ');
      if (names.length >= 2) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return names[0].substring(0, 2).toUpperCase();
    }
    if (user?.name) {
      const names = user.name.trim().split(' ');
      if (names.length >= 2) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return names[0].substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return '??';
  };

  // Generate a consistent color based on user ID or email
  const getBackgroundColor = () => {
    const str = user?.id || user?.email || 'default';
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 50%)`;
  };

  const displayName = user?.full_name || user?.name || user?.email || 'Unknown User';

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {user?.avatar_url ? (
        <div className={`relative ${sizeClass} rounded-full overflow-hidden border-2 border-white shadow-sm`}>
          <Image
            src={user.avatar_url}
            alt={displayName}
            width={imageSize}
            height={imageSize}
            className="object-cover"
            loading="lazy"
            unoptimized
          />
        </div>
      ) : (
        <div
          className={`${sizeClass} rounded-full flex items-center justify-center text-white font-medium border-2 border-white shadow-sm`}
          style={{ backgroundColor: getBackgroundColor() }}
          title={displayName}
        >
          {getInitials()}
        </div>
      )}
      {showName && (
        <span className="text-sm font-medium text-gray-700">{displayName}</span>
      )}
    </div>
  );
}