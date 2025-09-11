'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const ReactConfetti = dynamic(() => import('react-confetti'), { ssr: false });

export default function ConfettiCelebration({ show, duration = 6000 }) {
  const [isVisible, setIsVisible] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const [numberOfPieces, setNumberOfPieces] = useState(200);
  
  useEffect(() => {
    if (show) {
      setIsVisible(true);
      setOpacity(1);
      setNumberOfPieces(200);
      
      // Start reducing pieces after 3 seconds
      const reduceTimeout = setTimeout(() => {
        setNumberOfPieces(50);
      }, 3000);
      
      // Start fading out after 4 seconds
      const fadeTimeout = setTimeout(() => {
        setOpacity(0);
      }, 4000);
      
      // Hide completely after animation
      const hideTimeout = setTimeout(() => {
        setIsVisible(false);
      }, duration);
      
      return () => {
        clearTimeout(reduceTimeout);
        clearTimeout(fadeTimeout);
        clearTimeout(hideTimeout);
      };
    }
  }, [show, duration]);
  
  if (!isVisible) return null;
  
  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 9999,
        opacity: opacity,
        transition: 'opacity 2s ease-out'
      }}
    >
      <ReactConfetti
        width={typeof window !== 'undefined' ? window.innerWidth : 0}
        height={typeof window !== 'undefined' ? window.innerHeight : 0}
        numberOfPieces={numberOfPieces}
        recycle={false}
        colors={['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722']}
        gravity={0.15}
        wind={0}
        friction={0.99}
        tweenDuration={5000}
      />
    </div>
  );
}