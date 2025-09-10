import React, { useState, useEffect, useRef } from 'react';
import { usePerformanceMode } from '../hooks/usePerformanceMode';

interface AIInspectorProps {
  currentEpisode: number;
  epsilon: number;
  meanReward: number;
  replayBufferSize: number;
  trainingStep: number;
  qValues: { min: number; max: number; mean: number } | null;
  collisionRate: number;
  onCollisionMessage?: (message: string) => void;
}

// Simple persona engine based on AI state
const generatePersona = (meanReward: number, collisionRate: number): string => {
  if (collisionRate > 0.7) {
    return Math.random() > 0.5 ? "Am I lost? 🤔" : "404 Finish Line Not Found 🔍";
  }
  if (meanReward > 0.8) {
    return Math.random() > 0.5 ? "Neural networks firing! ⚡" : "Peak performance achieved! 🚀";
  }
  if (meanReward > 0.3) {
    return Math.random() > 0.5 ? "Learning patterns... 🧠" : "Optimizing pathways ⚙️";
  }
  if (meanReward > -0.2) {
    return Math.random() > 0.5 ? "Calculating possibilities 💭" : "Analyzing environment 🔬";
  }
  return Math.random() > 0.5 ? "Rebooting neural pathways... 🔄" : "Debugging decision trees 🐛";
};

const AIInspector: React.FC<AIInspectorProps> = ({
  currentEpisode,
  epsilon,
  meanReward,
  replayBufferSize,
  trainingStep,
  qValues,
  collisionRate,
  onCollisionMessage
}) => {
  const { settings, updateSetting } = usePerformanceMode();
  const [currentPersona, setCurrentPersona] = useState<string>("");
  const [qHistory, setQHistory] = useState<number[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPersonaUpdate = useRef<number>(0);

  // Update persona periodically (not every frame)
  useEffect(() => {
    const now = Date.now();
    if (now - lastPersonaUpdate.current > 5000) { // Every 5 seconds
      setCurrentPersona(generatePersona(meanReward, collisionRate));
      lastPersonaUpdate.current = now;
    }
  }, [meanReward, collisionRate]);

  // Track Q-value history for sparkline
  useEffect(() => {
    if (qValues) {
      setQHistory(prev => {
        const newHistory = [...prev, qValues.mean];
        return newHistory.slice(-50); // Keep last 50 values
      });
    }
  }, [qValues]);

  // Draw compact sparkline for Q-values
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || qHistory.length < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const minQ = Math.min(...qHistory);
    const maxQ = Math.max(...qHistory);
    const range = maxQ - minQ || 1;

    // Draw sparkline
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    qHistory.forEach((q, index) => {
      const x = (index / (qHistory.length - 1)) * width;
      const y = height - ((q - minQ) / range) * height;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Glow effect
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 3;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, [qHistory]);

  const formatNumber = (num: number): string => {
    if (Math.abs(num) >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toFixed(2);
  };

  return (
    <div className="cyber-panel rounded-lg p-4 space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-audiowide neon-text-cyan text-lg">AI INSPECTOR</h3>
        <div className="flex items-center gap-2">
          <label className="text-xs neon-text-purple">PLAYGROUND</label>
          <input
            type="checkbox"
            checked={settings.experimentalPlayground}
            onChange={(e) => updateSetting('experimentalPlayground', e.target.checked)}
            className="cyber-checkbox"
          />
        </div>
      </div>

      {/* AI Persona */}
      {currentPersona && (
        <div className="cyber-panel rounded p-2 border border-cyan-400">
          <div className="text-xs neon-text-cyan font-orbitron italic">
            {currentPersona}
          </div>
        </div>
      )}

      {/* Core Stats Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="cyber-panel rounded p-2">
          <div className="neon-text-purple">Episode</div>
          <div className="neon-text-cyan font-mono">{currentEpisode}</div>
        </div>
        <div className="cyber-panel rounded p-2">
          <div className="neon-text-purple">ε-greedy</div>
          <div className="neon-text-cyan font-mono">{epsilon.toFixed(3)}</div>
        </div>
        <div className="cyber-panel rounded p-2">
          <div className="neon-text-purple">Avg Reward</div>
          <div className="neon-text-cyan font-mono">{formatNumber(meanReward)}</div>
        </div>
        <div className="cyber-panel rounded p-2">
          <div className="neon-text-purple">Buffer Size</div>
          <div className="neon-text-cyan font-mono">{replayBufferSize}</div>
        </div>
      </div>

      {/* Q-Values Sparkline */}
      {qValues && (
        <div className="cyber-panel rounded p-2">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs neon-text-purple">Q-Values</div>
            <div className="text-xs neon-text-cyan font-mono">
              {formatNumber(qValues.min)} / {formatNumber(qValues.mean)} / {formatNumber(qValues.max)}
            </div>
          </div>
          <canvas 
            ref={canvasRef}
            width={200}
            height={30}
            className="w-full h-6 border border-cyan-400 rounded"
          />
        </div>
      )}

      {/* Performance Controls */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs neon-text-purple">Visual Intensity</label>
          <div className="text-xs neon-text-cyan">{settings.visualIntensity}%</div>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={settings.visualIntensity}
          onChange={(e) => updateSetting('visualIntensity', parseInt(e.target.value))}
          className="cyber-slider w-full"
        />

        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={settings.performanceMode}
              onChange={(e) => updateSetting('performanceMode', e.target.checked)}
              className="cyber-checkbox"
            />
            <span className="neon-text-purple">Performance Mode</span>
          </label>
          
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={settings.audioEnabled}
              onChange={(e) => updateSetting('audioEnabled', e.target.checked)}
              className="cyber-checkbox"
            />
            <span className="neon-text-purple">Audio</span>
          </label>
        </div>
      </div>

      {/* Collision message display */}
      {onCollisionMessage && (
        <div className="text-xs neon-text-orange text-center">
          Collision detected — retrying...
        </div>
      )}
    </div>
  );
};

export default AIInspector;
