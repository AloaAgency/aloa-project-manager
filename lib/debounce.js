// Simple debounce utility for performance optimization
// This reduces the frequency of expensive operations like auto-saves
export function debounce(func, delay) {
  let timeoutId;
  let lastArgs;

  const debounced = function(...args) {
    lastArgs = args;
    clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      func.apply(this, lastArgs);
    }, delay);
  };

  // Cancel pending execution
  debounced.cancel = function() {
    clearTimeout(timeoutId);
    timeoutId = null;
  };

  // Flush pending execution immediately
  debounced.flush = function() {
    if (timeoutId) {
      clearTimeout(timeoutId);
      func.apply(this, lastArgs);
      timeoutId = null;
    }
  };

  return debounced;
}

// Hook for React components
import { useCallback, useEffect, useRef } from 'react';

export function useDebounce(callback, delay, dependencies = []) {
  const callbackRef = useRef(callback);
  const debounceRef = useRef();

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  });

  // Create debounced function
  useEffect(() => {
    debounceRef.current = debounce((...args) => {
      callbackRef.current(...args);
    }, delay);

    // Cleanup on unmount
    return () => {
      if (debounceRef.current) {
        debounceRef.current.cancel();
      }
    };
  }, [delay]);

  return useCallback((...args) => {
    if (debounceRef.current) {
      debounceRef.current(...args);
    }
  }, dependencies);
}