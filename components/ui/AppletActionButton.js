'use client';

import { Play, Clock, CheckCircle, Lock, Edit } from 'lucide-react';

const BUTTON_CONFIG = {
  'not-started': {
    className: 'bg-purple-600 hover:bg-purple-700 text-white',
    icon: Play,
    label: 'Start',
    disabled: false
  },
  'in-progress': {
    className: 'bg-yellow-500 hover:bg-yellow-600 text-white',
    icon: Clock,
    label: 'Continue',
    disabled: false
  },
  'in-progress-editing': {
    className: 'bg-yellow-500 hover:bg-yellow-600 text-white',
    icon: Edit,
    label: 'Continue Editing',
    disabled: false
  },
  'completed': {
    className: 'bg-green-600 hover:bg-green-700 text-white',
    icon: CheckCircle,
    label: 'View',
    disabled: false
  },
  'completed-locked': {
    className: 'bg-gray-400 text-white cursor-not-allowed',
    icon: Lock,
    label: 'Locked',
    disabled: true
  },
  'user-complete-editable': {
    className: 'bg-blue-600 hover:bg-blue-700 text-white',
    icon: Edit,
    label: 'Edit',
    disabled: false
  }
};

export default function AppletActionButton({
  state = 'not-started',
  onClick,
  className = '',
  showIcon = true,
  showLabel = true,
  size = 'default'
}) {
  const config = BUTTON_CONFIG[state] || BUTTON_CONFIG['not-started'];
  const Icon = config.icon;

  const sizeClasses = {
    small: 'px-3 py-1.5 text-sm',
    default: 'px-4 py-2',
    large: 'px-6 py-3 text-lg'
  };

  return (
    <button
      onClick={onClick}
      disabled={config.disabled}
      className={`
        ${sizeClasses[size]}
        rounded-lg
        flex items-center justify-center
        space-x-2
        transition-colors
        font-medium
        ${config.className}
        ${className}
      `}
    >
      {showIcon && <Icon className={size === 'small' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />}
      {showLabel && <span>{config.label}</span>}
    </button>
  );
}