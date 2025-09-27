'use client';

import { useEffect, useState } from 'react';
import Confetti from 'react-confetti';
import { Trophy, Star, Sparkles, CheckCircle } from 'lucide-react';

export default function EnhancedPhaseCompletionCelebration({ show, onComplete }) {
  const [windowDimensions, setWindowDimensions] = useState({ width: 0, height: 0 });
  const [showMessage, setShowMessage] = useState(false);
  const [particleCount, setParticleCount] = useState(500);

  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (show) {
      setParticleCount(500);
      // Show message after initial burst
      setTimeout(() => setShowMessage(true), 500);

      // Reduce particles gradually for performance
      setTimeout(() => setParticleCount(300), 1000);
      setTimeout(() => setParticleCount(200), 2000);
      setTimeout(() => setParticleCount(100), 3000);

      // Complete celebration after 5 seconds
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 5000);
    } else {
      setShowMessage(false);
      setParticleCount(0);
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <>
      {/* Multiple confetti layers for extra impact */}
      <Confetti
        width={windowDimensions.width}
        height={windowDimensions.height}
        numberOfPieces={particleCount}
        recycle={false}
        colors={['#FFD700', '#FFA500', '#FF69B4', '#87CEEB', '#98FB98', '#DDA0DD']}
        gravity={0.1}
        wind={0.01}
      />

      {/* Second layer with different physics */}
      <Confetti
        width={windowDimensions.width}
        height={windowDimensions.height}
        numberOfPieces={Math.floor(particleCount * 0.5)}
        recycle={false}
        colors={['#FF6347', '#4169E1', '#32CD32', '#FFB6C1', '#20B2AA']}
        gravity={0.05}
        wind={-0.01}
        opacity={0.8}
      />

      {/* Celebration message overlay */}
      <div className={`fixed inset-0 flex items-center justify-center z-[100] pointer-events-none transition-opacity duration-1000 ${showMessage ? 'opacity-100' : 'opacity-0'}`}>
        <div className="bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-500 text-white p-8 rounded-3xl shadow-2xl transform scale-110 animate-bounce-slow">
          <div className="flex flex-col items-center space-y-4">
            {/* Trophy icon with animation */}
            <div className="relative">
              <Trophy className="h-24 w-24 text-yellow-300 animate-pulse" />
              <Sparkles className="h-8 w-8 text-yellow-200 absolute -top-2 -right-2 animate-spin-slow" />
              <Sparkles className="h-6 w-6 text-yellow-200 absolute -bottom-1 -left-1 animate-spin-slow-reverse" />
            </div>

            {/* Success message */}
            <div className="text-center">
              <h2 className="text-4xl font-bold mb-2">🎉 PHASE COMPLETE! 🎉</h2>
              <p className="text-xl">Outstanding work! This milestone has been achieved!</p>
            </div>

            {/* Stars decoration */}
            <div className="flex space-x-2">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="h-8 w-8 text-yellow-300 fill-current animate-pulse"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>

            {/* Achievement badge */}
            <div className="flex items-center space-x-2 bg-white/20 px-4 py-2 rounded-full">
              <CheckCircle className="h-6 w-6" />
              <span className="font-semibold">Major Milestone Achieved</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fireworks-like animated elements */}
      <div className="fixed inset-0 z-[99] pointer-events-none overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-firework"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          >
            <div className="relative">
              <Sparkles className={`h-${4 + Math.floor(Math.random() * 4)} w-${4 + Math.floor(Math.random() * 4)} text-yellow-400`} />
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-10px) scale(1.05); }
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes spin-slow-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }

        @keyframes firework {
          0% {
            transform: scale(0) rotate(0deg);
            opacity: 1;
          }
          50% {
            transform: scale(1.5) rotate(180deg);
            opacity: 0.8;
          }
          100% {
            transform: scale(0.5) rotate(360deg) translateY(-100px);
            opacity: 0;
          }
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }

        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }

        .animate-spin-slow-reverse {
          animation: spin-slow-reverse 4s linear infinite;
        }

        .animate-firework {
          animation: firework 3s ease-out infinite;
        }
      `}</style>
    </>
  );
}