import { useEffect } from 'react';

/**
 * Custom hook to handle ESC key press for closing modals
 * @param {Function} onEscape - Callback function to execute when ESC is pressed
 * @param {boolean} isActive - Whether the hook should be active (typically when modal is open)
 */
export function useEscapeKey(onEscape, isActive = true) {
  useEffect(() => {
    if (!isActive) return;

    const handleEscape = (event) => {
      if (event.key === 'Escape' || event.keyCode === 27) {
        onEscape();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onEscape, isActive]);
}

export default useEscapeKey;