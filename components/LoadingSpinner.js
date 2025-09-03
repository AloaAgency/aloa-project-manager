'use client';

import { motion } from 'framer-motion';

export default function LoadingSpinner({ message = 'Loading...', size = 'default' }) {
  const sizes = {
    small: 'w-8 h-8',
    default: 'w-16 h-16',
    large: 'w-24 h-24'
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="relative"
      >
        <div className={`${sizes[size]} relative`}>
          <div className="absolute inset-0 bg-aloa-black rounded-full animate-ping opacity-20" />
          <div className={`${sizes[size]} bg-aloa-black rounded-full animate-pulse`} />
        </div>
      </motion.div>
      {message && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-4 text-sm font-display uppercase tracking-wider text-aloa-gray"
        >
          {message}
        </motion.p>
      )}
    </div>
  );
}