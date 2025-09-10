import React, { useRef, useEffect, useCallback } from 'react';

interface QValueHeatmap {
  x: number;
  y: number;
  qValue: number;
}

interface TDErrorEvent {
  x: number;
  y: number;
  error: number;
  timestamp: number;
}

interface NeuralSynesthesiaProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  qHeatmap: QValueHeatmap[];
  tdErrors: TDErrorEvent[];
  visualIntensity: number; // 0-100
  enabled: boolean;
  cellSize: number;
}

const NeuralSynesthesia: React.FC<NeuralSynesthesiaProps> = ({
  canvasRef,
  qHeatmap,
  tdErrors,
  visualIntensity,
  enabled,
  cellSize
}) => {
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const blooms = useRef<Array<{ x: number; y: number; radius: number; opacity: number; timestamp: number }>>([]);

  // Create TD-error bloom effects
  useEffect(() => {
    if (!enabled || visualIntensity < 20) return;

    tdErrors.forEach(error => {
      if (Math.abs(error.error) > 0.5) { // Only significant errors
        blooms.current.push({
          x: error.x,
          y: error.y,
          radius: 0,
          opacity: Math.min(Math.abs(error.error), 1),
          timestamp: performance.now()
        });
      }
    });
  }, [tdErrors, enabled, visualIntensity]);

  const drawNeuralOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!canvas || !overlayCanvas || !enabled) return;

    const ctx = overlayCanvas.getContext('2d');
    if (!ctx) return;

    // Match main canvas size
    if (overlayCanvas.width !== canvas.width || overlayCanvas.height !== canvas.height) {
      overlayCanvas.width = canvas.width;
      overlayCanvas.height = canvas.height;
    }

    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    const now = performance.now();
    const intensityScale = visualIntensity / 100;

    // Draw Q-value heat filaments (breathing neon lines)
    if (visualIntensity > 30) {
      qHeatmap.forEach(cell => {
        const pixelX = cell.x * cellSize + cellSize / 2;
        const pixelY = cell.y * cellSize + cellSize / 2;
        const qIntensity = Math.abs(cell.qValue) * intensityScale;
        
        if (qIntensity > 0.1) {
          // Breathing effect based on time
          const breathe = 0.5 + 0.5 * Math.sin(now * 0.003 + cell.x + cell.y);
          const alpha = qIntensity * breathe * 0.6;
          
          // Color based on Q-value sign
          const color = cell.qValue > 0 
            ? `rgba(0, 255, 255, ${alpha})` // Cyan for positive
            : `rgba(255, 0, 255, ${alpha})`; // Magenta for negative
          
          // Draw glowing filament
          ctx.strokeStyle = color;
          ctx.lineWidth = Math.max(1, qIntensity * 3);
          ctx.shadowColor = cell.qValue > 0 ? '#00ffff' : '#ff00ff';
          ctx.shadowBlur = qIntensity * 8;
          
          // Vertical filament
          ctx.beginPath();
          ctx.moveTo(pixelX, pixelY - cellSize * 0.3);
          ctx.lineTo(pixelX, pixelY + cellSize * 0.3);
          ctx.stroke();
          
          // Horizontal filament
          ctx.beginPath();
          ctx.moveTo(pixelX - cellSize * 0.3, pixelY);
          ctx.lineTo(pixelX + cellSize * 0.3, pixelY);
          ctx.stroke();
          
          ctx.shadowBlur = 0;
        }
      });
    }

    // Draw TD-error bloom ripples
    if (visualIntensity > 40) {
      blooms.current = blooms.current.filter(bloom => {
        const age = now - bloom.timestamp;
        const maxAge = 2000; // 2 seconds
        
        if (age > maxAge) return false;
        
        const progress = age / maxAge;
        bloom.radius = progress * 50; // Expand to 50px
        bloom.opacity = (1 - progress) * intensityScale;
        
        if (bloom.opacity > 0.05) {
          const pixelX = bloom.x * cellSize + cellSize / 2;
          const pixelY = bloom.y * cellSize + cellSize / 2;
          
          // Soft expanding ring
          ctx.strokeStyle = `rgba(255, 100, 255, ${bloom.opacity * 0.8})`;
          ctx.lineWidth = 2;
          ctx.shadowColor = '#ff64ff';
          ctx.shadowBlur = 10;
          
          ctx.beginPath();
          ctx.arc(pixelX, pixelY, bloom.radius, 0, Math.PI * 2);
          ctx.stroke();
          
          // Inner glow
          ctx.strokeStyle = `rgba(255, 200, 255, ${bloom.opacity * 0.4})`;
          ctx.lineWidth = 1;
          ctx.shadowBlur = 5;
          ctx.stroke();
          
          ctx.shadowBlur = 0;
        }
        
        return true;
      });
    }
  }, [canvasRef, qHeatmap, visualIntensity, enabled, cellSize]);

  // Animation loop for breathing effects and blooms
  useEffect(() => {
    if (!enabled || visualIntensity < 20) return;

    const animate = () => {
      drawNeuralOverlay();
      requestAnimationFrame(animate);
    };

    const frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [drawNeuralOverlay, enabled, visualIntensity]);

  // Position overlay canvas on top of main canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!canvas || !overlayCanvas) return;

    const rect = canvas.getBoundingClientRect();
    overlayCanvas.style.position = 'absolute';
    overlayCanvas.style.left = '0';
    overlayCanvas.style.top = '0';
    overlayCanvas.style.pointerEvents = 'none';
    overlayCanvas.style.zIndex = '10';
  }, [canvasRef]);

  if (!enabled || visualIntensity < 20) {
    return null;
  }

  return (
    <canvas
      ref={overlayCanvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 10 }}
    />
  );
};

export default NeuralSynesthesia;
