'use client';

import { motion } from 'framer-motion';
import { Eye, MessageSquare } from 'lucide-react';

/**
 * ModeToggle - Toggle between Browsing and Commenting modes
 *
 * Features:
 * - Smooth animated toggle
 * - Visual feedback for current mode
 * - Icons for both states
 * - Professional styling matching Aloa aesthetic
 */

export default function ModeToggle({ mode, onToggle }) {
  const isBrowsing = mode === 'browsing';

  return (
    <div className="relative inline-flex items-center bg-gray-100 rounded-lg p-1 shadow-inner">
      {/* Sliding background */}
      <motion.div
        className="absolute top-1 bottom-1 bg-white rounded-md shadow-sm"
        initial={false}
        animate={{
          left: isBrowsing ? '4px' : '50%',
          right: isBrowsing ? '50%' : '4px'
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      />

      {/* Browsing Mode Button */}
      <button
        onClick={() => mode !== 'browsing' && onToggle()}
        className={`
          relative z-10 px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium
          transition-colors duration-200
          ${isBrowsing
            ? 'text-gray-900'
            : 'text-gray-500 hover:text-gray-700'
          }
        `}
        title="Browse mode - Just view the prototype"
      >
        <Eye className="w-4 h-4" />
        <span>Browsing</span>
      </button>

      {/* Commenting Mode Button */}
      <button
        onClick={() => mode !== 'commenting' && onToggle()}
        className={`
          relative z-10 px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium
          transition-colors duration-200
          ${!isBrowsing
            ? 'text-blue-600'
            : 'text-gray-500 hover:text-gray-700'
          }
        `}
        title="Commenting mode - Click to add comments"
      >
        <MessageSquare className="w-4 h-4" />
        <span>Commenting</span>
      </button>
    </div>
  );
}
