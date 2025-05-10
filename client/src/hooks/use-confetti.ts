import { useCallback } from 'react';
import confetti from 'canvas-confetti';

export function useConfetti() {
  const fireConfetti = useCallback((options: any = {}) => {
    const defaults = {
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FF5555', '#FFAA00', '#00AAFF', '#55FF55', '#AA00FF'],
      zIndex: 9999,
    };

    confetti({
      ...defaults,
      ...options,
    });
  }, []);

  // Various celebration animations
  const celebrateCompletion = useCallback(() => {
    fireConfetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.7 },
    });
  }, [fireConfetti]);

  // Shoots confetti from sides of screen (like party poppers)
  const partyPopper = useCallback(() => {
    const duration = 1500;
    const animationEnd = Date.now() + duration;
    const defaults = { 
      startVelocity: 30, 
      spread: 360, 
      ticks: 60, 
      zIndex: 9999 
    };

    const interval: any = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      // Left and right sides
      confetti({
        ...defaults,
        particleCount,
        origin: { x: 0.1, y: 0.5 }
      });
      
      confetti({
        ...defaults,
        particleCount,
        origin: { x: 0.9, y: 0.5 }
      });
    }, 250);
  }, []);

  // Small, subtle celebration for less distracting feedback
  const subtleCelebration = useCallback(() => {
    fireConfetti({
      particleCount: 30,
      spread: 50,
      origin: { y: 0.8 },
      gravity: 1.2,
    });
  }, [fireConfetti]);

  return {
    fireConfetti,
    celebrateCompletion,
    partyPopper,
    subtleCelebration,
  };
}