'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

/**
 * CommentMarker - Visual numbered marker for comments
 *
 * A circular marker that appears on the prototype at comment positions.
 * Features:
 * - Numbered display (1, 2, 3, etc.)
 * - Different colors for open vs resolved
 * - Hover effects and active state
 * - Smooth animations
 */

export default function CommentMarker({ comment, isActive, onClick }) {
  const isResolved = comment.status === 'resolved';

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: isActive ? 1.1 : 1,
        opacity: 1
      }}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.95 }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`
        relative w-10 h-10 rounded-full flex items-center justify-center
        font-bold text-white shadow-lg cursor-pointer
        transition-all duration-200
        ${isResolved
          ? 'bg-green-500 hover:bg-green-600'
          : 'bg-blue-500 hover:bg-blue-600'
        }
        ${isActive
          ? 'ring-4 ring-white ring-opacity-100 z-10'
          : 'ring-2 ring-white ring-opacity-50'
        }
      `}
      title={isResolved ? 'Resolved comment' : 'Open comment'}
    >
      {isResolved ? (
        <Check className="w-5 h-5" />
      ) : (
        <span className="text-sm">{comment.number}</span>
      )}

      {/* Pulse animation for active marker */}
      {isActive && !isResolved && (
        <motion.span
          className="absolute inset-0 rounded-full bg-blue-400"
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeOut'
          }}
        />
      )}
    </motion.button>
  );
}
