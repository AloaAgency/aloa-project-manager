'use client';

import { Brain } from 'lucide-react';
import UserAvatar from '@/components/UserAvatar';

export default function AppletCompletionAvatars({
  completions = [],
  showAI = false,
  onAvatarClick,
  maxVisible = 4
}) {
  const getInitials = (user) => {
    if (!user) return '?';
    if (user.full_name) {
      return user.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    return '?';
  };

  const getAvatarColor = (userId) => {
    // Generate consistent color based on user ID
    const colors = [
      'bg-purple-600',
      'bg-blue-600',
      'bg-green-600',
      'bg-yellow-600',
      'bg-pink-600',
      'bg-indigo-600'
    ];
    const hash = userId ? userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
    return colors[hash % colors.length];
  };

  if (completions.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center space-x-2">
      <div className="flex -space-x-2">
        {/* AI Brain Avatar (if applicable) */}
        {showAI && completions.length > 1 && (
          <div className="relative group">
            <div
              onClick={() => onAvatarClick && onAvatarClick('ai', completions)}
              className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center ring-2 ring-white cursor-pointer hover:scale-110 transition-transform"
            >
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 hidden group-hover:block z-10">
              <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                AI Amalgamated View
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                  <div className="border-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Avatars */}
        {completions.slice(0, maxVisible).map((completion) => {
          const user = completion.user || {};
          const isInProgress = completion.status === 'in_progress';

          return (
            <div key={completion.user_id || completion.id} className="relative group">
              <div
                onClick={() => onAvatarClick && onAvatarClick(completion.user_id, completion)}
                className={`inline-block ring-2 ${
                  isInProgress ? 'ring-gray-400 ring-dashed opacity-80' : 'ring-white'
                } cursor-pointer hover:scale-110 transition-transform rounded-full`}
              >
                <UserAvatar
                  user={{
                    id: completion.user_id,
                    full_name: user.full_name,
                    email: user.email,
                    avatar_url: user.avatar_url
                  }}
                  size="xs"
                  className="pointer-events-none"
                />
              </div>
              <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 hidden group-hover:block z-10">
                <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                  {user.full_name || user.email || 'User'}
                  {isInProgress && <div className="text-yellow-400 text-xs mt-1">In Progress</div>}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                    <div className="border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Overflow Counter */}
        {completions.length > maxVisible && (
          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 ring-2 ring-white">
            +{completions.length - maxVisible}
          </div>
        )}
      </div>
    </div>
  );
}