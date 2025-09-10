import React, { useRef, useEffect } from 'react';

interface RewardChartProps {
  rewardHistory: number[];
  width?: number;
  height?: number;
}

const RewardChart: React.FC<RewardChartProps> = ({ 
  rewardHistory, 
  width = 360, 
  height = 200 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || rewardHistory.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Set canvas background
    ctx.fillStyle = 'rgba(10, 10, 10, 0.8)';
    ctx.fillRect(0, 0, width, height);

    // Draw neon grid
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 10; i++) {
      const y = (height / 10) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Vertical grid lines
    for (let i = 0; i <= 10; i++) {
      const x = (width / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    if (rewardHistory.length < 2) return;

    // Calculate bounds
    const maxReward = Math.max(...rewardHistory);
    const minReward = Math.min(...rewardHistory);
    const range = maxReward - minReward || 1;

    // Draw reward line
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 10;

    ctx.beginPath();
    for (let i = 0; i < rewardHistory.length; i++) {
      const x = (i / (rewardHistory.length - 1)) * width;
      const y = height - ((rewardHistory[i] - minReward) / range) * height;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Add glow points
    ctx.fillStyle = '#00ffff';
    ctx.shadowBlur = 15;
    
    for (let i = 0; i < rewardHistory.length; i++) {
      const x = (i / (rewardHistory.length - 1)) * width;
      const y = height - ((rewardHistory[i] - minReward) / range) * height;
      
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Reset shadow
    ctx.shadowBlur = 0;

    // Draw labels
    ctx.fillStyle = '#8a2be2';
    ctx.font = '12px Orbitron';
    ctx.textAlign = 'left';
    ctx.fillText(`Max: ${maxReward.toFixed(2)}`, 10, 20);
    ctx.fillText(`Min: ${minReward.toFixed(2)}`, 10, height - 10);
    
    ctx.textAlign = 'right';
    ctx.fillText(`Episodes: ${rewardHistory.length}`, width - 10, 20);

  }, [rewardHistory, width, height]);

  return (
    <div className="cyber-panel rounded-lg p-4">
      <h3 className="text-lg font-[Orbitron] neon-text-cyan mb-3 text-center">
        REWARD EVOLUTION
      </h3>
      <div className="neon-border-cyan rounded-lg p-2">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="block w-full"
        />
      </div>
    </div>
  );
};

export default RewardChart;
