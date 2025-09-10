import { useState, useEffect, useCallback } from 'react';

interface PerformanceModeSettings {
  visualIntensity: number; // 0-100
  performanceMode: boolean;
  experimentalPlayground: boolean;
  audioEnabled: boolean;
  webGLEnabled: boolean;
  throttleRenderMs: number;
}

const DEFAULT_SETTINGS: PerformanceModeSettings = {
  visualIntensity: 50,
  performanceMode: false,
  experimentalPlayground: false,
  audioEnabled: true,
  webGLEnabled: false, // Default OFF for heavy features
  throttleRenderMs: 16, // ~60fps
};

export const usePerformanceMode = () => {
  const [settings, setSettings] = useState<PerformanceModeSettings>(() => {
    // Load from localStorage
    const saved = localStorage.getItem('race-ai-performance-settings');
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch (e) {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  // Save to localStorage whenever settings change
  useEffect(() => {
    localStorage.setItem('race-ai-performance-settings', JSON.stringify(settings));
  }, [settings]);

  const updateSetting = useCallback(<K extends keyof PerformanceModeSettings>(
    key: K, 
    value: PerformanceModeSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  // Derived values for easy consumption
  const shouldThrottleVisuals = settings.performanceMode || settings.visualIntensity < 30;
  const effectiveThrottleMs = settings.performanceMode ? 33 : settings.throttleRenderMs; // 30fps vs 60fps
  const enableParticles = settings.visualIntensity > 40 && !settings.performanceMode;
  const enableWebGL = settings.webGLEnabled && settings.experimentalPlayground && !settings.performanceMode;
  const enableAdvancedAudio = settings.audioEnabled && settings.visualIntensity > 60;

  return {
    settings,
    updateSetting,
    shouldThrottleVisuals,
    effectiveThrottleMs,
    enableParticles,
    enableWebGL,
    enableAdvancedAudio,
  };
};
