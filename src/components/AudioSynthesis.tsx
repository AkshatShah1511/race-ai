import React, { useEffect, useRef } from 'react';

interface AudioSynthesisProps {
  enabled: boolean;
  meanReward: number; // map to tempo/timbre
  tdError: number; // map to dissonance/stutter
}

// Thin controller that delegates to audioEngine but adds mappings and throttling
const AudioSynthesis: React.FC<AudioSynthesisProps> = ({ enabled, meanReward, tdError }) => {
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;
    const now = performance.now();
    if (now - lastUpdateRef.current < 100) return; // throttle 10Hz
    lastUpdateRef.current = now;

    // Map meanReward to music track selection and volume via sounds.ts
    // Note: audioEngine is imported lazily to avoid SSR/initialization issues
    import('../utils/sounds').then(({ default: audioEngine }) => {
      if (meanReward > 0.5) {
        // happier timbre
        audioEngine.startMusic();
      } else if (meanReward < -0.5) {
        // darker tone: lower base frequency slightly
        // we can simulate by whoosh/zap occasionally
        audioEngine.playNeonZap();
      }

      // TD-error spike → small whoosh/glitch
      if (Math.abs(tdError) > 0.8) {
        audioEngine.playWhoosh();
      }
    });
  }, [enabled, meanReward, tdError]);

  useEffect(() => {
    return () => {
      import('../utils/sounds').then(({ default: audioEngine }) => {
        audioEngine.stopMusic();
      });
    };
  }, []);

  return null;
};

export default AudioSynthesis;

