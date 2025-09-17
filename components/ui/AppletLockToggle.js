'use client';

import { Lock, Unlock } from 'lucide-react';

export default function AppletLockToggle({ applet, onUpdate, label = 'Lock Applet' }) {
  const isLocked = applet.config?.locked === true;

  const handleToggle = async () => {
    if (onUpdate) {
      await onUpdate(applet.id, {
        ...applet.config,
        locked: !isLocked
      });
    }
  };

  return (
    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
      <span className="text-sm text-gray-600">{label}</span>
      <button
        onClick={handleToggle}
        className={`p-1.5 rounded transition-colors ${
          isLocked
            ? 'bg-red-100 text-red-600 hover:bg-red-200'
            : 'bg-green-100 text-green-600 hover:bg-green-200'
        }`}
        title={isLocked ? 'Unlock to allow edits' : 'Lock to prevent edits'}
      >
        {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
      </button>
    </div>
  );
}