import React, { useRef, useEffect, useState, useCallback } from 'react';

export interface MapData {
  grid: number[][];
  start: { x: number; y: number } | null;
  finish: { x: number; y: number } | null;
  checkpoints: { x: number; y: number; order: number }[];
  lapsRequired: number;
}

interface EditorProps {
  onMapChange: (map: MapData) => void;
}

const CANVAS_WIDTH = 1200; // Increased canvas width
const CANVAS_HEIGHT = 900; // Increased canvas height
const CELL_SIZE = 20;

// Cell types
const WALL = 0;
const ROAD = 1;
const START = 2;
const FINISH = 3;

const Editor: React.FC<EditorProps> = ({ onMapChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState<'road' | 'wall' | 'start' | 'finish'>('road');
  const [showGrid, setShowGrid] = useState(true);
  const [mapData, setMapData] = useState<MapData>({
    grid: Array(CANVAS_HEIGHT / CELL_SIZE).fill(null).map(() => 
      Array(CANVAS_WIDTH / CELL_SIZE).fill(WALL)
    ),
    start: null,
    finish: null,
    checkpoints: [],
    lapsRequired: 3
  });

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw cells
    for (let y = 0; y < mapData.grid.length; y++) {
      for (let x = 0; x < mapData.grid[y].length; x++) {
        const cellType = mapData.grid[y][x];
        const pixelX = x * CELL_SIZE;
        const pixelY = y * CELL_SIZE;

        switch (cellType) {
          case WALL:
            ctx.fillStyle = '#1f2937'; // Dark wall
            ctx.fillRect(pixelX, pixelY, CELL_SIZE, CELL_SIZE);
            // Add subtle glow effect for walls
            ctx.fillStyle = '#374151';
            ctx.fillRect(pixelX + 2, pixelY + 2, CELL_SIZE - 4, CELL_SIZE - 4);
            break;
          case ROAD:
            ctx.fillStyle = '#111827'; // Dark road
            ctx.fillRect(pixelX, pixelY, CELL_SIZE, CELL_SIZE);
            // Add road texture
            ctx.fillStyle = '#1f2937';
            ctx.fillRect(pixelX + 1, pixelY + 1, CELL_SIZE - 2, CELL_SIZE - 2);
            break;
          case START:
            // Neon green start with glow
            ctx.fillStyle = '#059669';
            ctx.fillRect(pixelX, pixelY, CELL_SIZE, CELL_SIZE);
            ctx.shadowColor = '#10b981';
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#10b981';
            ctx.fillRect(pixelX + 2, pixelY + 2, CELL_SIZE - 4, CELL_SIZE - 4);
            ctx.shadowBlur = 0;
            break;
          case FINISH:
            // Neon red finish with glow
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(pixelX, pixelY, CELL_SIZE, CELL_SIZE);
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(pixelX + 2, pixelY + 2, CELL_SIZE - 4, CELL_SIZE - 4);
            ctx.shadowBlur = 0;
            break;
          default:
            ctx.fillStyle = '#1f2937';
            ctx.fillRect(pixelX, pixelY, CELL_SIZE, CELL_SIZE);
        }
        
        // Grid lines (optional)
        if (showGrid) {
          ctx.strokeStyle = cellType === WALL ? '#4b5563' : '#00ffff40';
          ctx.lineWidth = 0.3;
          ctx.strokeRect(pixelX, pixelY, CELL_SIZE, CELL_SIZE);
        }
      }
    }

    // Draw start position marker
    if (mapData.start) {
      const x = mapData.start.x * CELL_SIZE + CELL_SIZE/2;
      const y = mapData.start.y * CELL_SIZE + CELL_SIZE/2;
      
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px Orbitron';
      ctx.textAlign = 'center';
      ctx.fillText('START', x, y + 2);
      ctx.shadowBlur = 0;
    }

    // Draw finish position marker
    if (mapData.finish) {
      const x = mapData.finish.x * CELL_SIZE + CELL_SIZE/2;
      const y = mapData.finish.y * CELL_SIZE + CELL_SIZE/2;
      
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px Orbitron';
      ctx.textAlign = 'center';
      ctx.fillText('FINISH', x, y + 2);
      ctx.shadowBlur = 0;
    }
    
    // Draw checkpoints
    mapData.checkpoints.forEach((checkpoint, index) => {
      const x = checkpoint.x * CELL_SIZE + CELL_SIZE/2;
      const y = checkpoint.y * CELL_SIZE + CELL_SIZE/2;
      
      ctx.shadowColor = '#8a2be2';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Orbitron';
      ctx.textAlign = 'center';
      ctx.fillText(`${checkpoint.order}`, x, y + 2);
      ctx.shadowBlur = 0;
    });
  }, [mapData, showGrid]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawGrid(ctx);
  }, [drawGrid]);

  const getGridPosition = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((clientX - rect.left) / CELL_SIZE);
    const y = Math.floor((clientY - rect.top) / CELL_SIZE);

    if (x >= 0 && x < mapData.grid[0].length && y >= 0 && y < mapData.grid.length) {
      return { x, y };
    }
    return null;
  };

  const updateCell = (x: number, y: number, leftClick: boolean = true) => {
    const newGrid = [...mapData.grid];
    let newStart = mapData.start;
    let newFinish = mapData.finish;

    if (leftClick) {
      if (drawMode === 'road') {
        newGrid[y][x] = ROAD;
      } else if (drawMode === 'start') {
        // Clear previous start
        if (newStart) {
          newGrid[newStart.y][newStart.x] = ROAD;
        }
        newGrid[y][x] = START;
        newStart = { x, y };
      } else if (drawMode === 'finish') {
        // Clear previous finish
        if (newFinish) {
          newGrid[newFinish.y][newFinish.x] = ROAD;
        }
        newGrid[y][x] = FINISH;
        newFinish = { x, y };
      }
    } else {
      // Right click - erase to wall
      if (newStart && newStart.x === x && newStart.y === y) {
        newStart = null;
      }
      if (newFinish && newFinish.x === x && newFinish.y === y) {
        newFinish = null;
      }
      newGrid[y][x] = WALL;
    }

    const newMapData = {
      grid: newGrid,
      start: newStart,
      finish: newFinish,
      checkpoints: mapData.checkpoints,
      lapsRequired: mapData.lapsRequired
    };

    setMapData(newMapData);
    onMapChange(newMapData);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDrawing(true);
    const pos = getGridPosition(e.clientX, e.clientY);
    if (pos) {
      updateCell(pos.x, pos.y, e.button === 0);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || drawMode === 'start' || drawMode === 'finish') return;
    
    const pos = getGridPosition(e.clientX, e.clientY);
    if (pos) {
      updateCell(pos.x, pos.y, e.buttons === 1);
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const clearMap = () => {
    const newMapData = {
      grid: Array(CANVAS_HEIGHT / CELL_SIZE).fill(null).map(() => 
        Array(CANVAS_WIDTH / CELL_SIZE).fill(WALL)
      ),
      start: null,
      finish: null,
      checkpoints: [],
      lapsRequired: 3
    };
    setMapData(newMapData);
    onMapChange(newMapData);
  };

  const saveMap = () => {
    const dataStr = JSON.stringify(mapData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'race-track.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col items-center p-6 bg-gradient-to-br from-gray-900 via-black to-gray-900 min-h-screen">
      {/* Enhanced control panel */}
      <div className="w-full max-w-6xl mb-6">
        {/* Tool Selection */}
        <div className="cyber-panel rounded-2xl p-6 mb-4">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <button
              onClick={() => setDrawMode('wall')}
              className={`cyber-button px-4 py-3 rounded-lg font-[Orbitron] font-bold transition-all duration-300 ${
                drawMode === 'wall' 
                  ? 'neon-glow-cyan scale-105 neon-text-cyan border-cyan-400' 
                  : 'hover:neon-glow-cyan hover:border-cyan-400'
              }`}
            >
              🧱 WALLS
            </button>
            
            <button
              onClick={() => setDrawMode('road')}
              className={`cyber-button px-4 py-3 rounded-lg font-[Orbitron] font-bold transition-all duration-300 ${
                drawMode === 'road' 
                  ? 'neon-glow-purple scale-105 neon-text-purple border-purple-400' 
                  : 'hover:neon-glow-purple hover:border-purple-400'
              }`}
            >
              🛣️ ROADS
            </button>
            
            <button
              onClick={() => setDrawMode('start')}
              className={`cyber-button px-4 py-3 rounded-lg font-[Orbitron] font-bold transition-all duration-300 ${
                drawMode === 'start' 
                  ? 'neon-glow-green scale-105 border-green-400 text-green-400' 
                  : 'hover:neon-glow-green hover:border-green-400 hover:text-green-400'
              }`}
            >
              🚦 START
            </button>
            
            <button
              onClick={() => setDrawMode('finish')}
              className={`cyber-button px-4 py-3 rounded-lg font-[Orbitron] font-bold transition-all duration-300 ${
                drawMode === 'finish' 
                  ? 'neon-glow-red scale-105 border-red-400 text-red-400' 
                  : 'hover:neon-glow-red hover:border-red-400 hover:text-red-400'
              }`}
            >
              🏁 FINISH
            </button>
            
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`cyber-button px-4 py-3 rounded-lg font-[Orbitron] font-bold transition-all duration-300 ${
                showGrid 
                  ? 'neon-glow-magenta scale-105 border-magenta-400 text-magenta-400' 
                  : 'hover:neon-glow-magenta hover:border-magenta-400 hover:text-magenta-400'
              }`}
            >
              📐 GRID
            </button>
          </div>
          
          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={clearMap}
              className="cyber-button px-6 py-2 rounded-lg font-[Orbitron] font-bold neon-glow-red border-red-500 text-red-400 hover:scale-105"
            >
              🗑️ CLEAR ALL
            </button>
            <button
              onClick={saveMap}
              className="cyber-button px-6 py-2 rounded-lg font-[Orbitron] font-bold neon-glow-green border-green-500 text-green-400 hover:scale-105"
            >
              💾 EXPORT TRACK
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="cyber-panel rounded-xl p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="neon-text-cyan font-[Orbitron] font-bold mb-2">🖱️ CONTROLS:</div>
              <div className="neon-text-purple">• LEFT CLICK: Paint selected tool</div>
              <div className="neon-text-purple">• RIGHT CLICK: Erase to walls</div>
              <div className="neon-text-purple">• DRAG: Paint continuously</div>
            </div>
            <div className="space-y-2">
              <div className="neon-text-cyan font-[Orbitron] font-bold mb-2">💡 TIPS:</div>
              <div className="neon-text-purple">• Create enclosed tracks for AI training</div>
              <div className="neon-text-purple">• START and FINISH are unique positions</div>
              <div className="neon-text-purple">• Use GRID toggle for precise placement</div>
            </div>
          </div>
        </div>
        
        {/* Track stats */}
        <div className="flex justify-center space-x-4 text-sm">
          <div className="cyber-panel rounded-lg px-4 py-2">
            <span className="neon-text-cyan font-[Orbitron]">START:</span>
            <span className="neon-text-magenta ml-2">{mapData.start ? '✓' : '✗'}</span>
          </div>
          <div className="cyber-panel rounded-lg px-4 py-2">
            <span className="neon-text-cyan font-[Orbitron]">FINISH:</span>
            <span className="neon-text-magenta ml-2">{mapData.finish ? '✓' : '✗'}</span>
          </div>
          <div className="cyber-panel rounded-lg px-4 py-2">
            <span className="neon-text-cyan font-[Orbitron]">CHECKPOINTS:</span>
            <span className="neon-text-magenta ml-2">{mapData.checkpoints.length}</span>
          </div>
        </div>
      </div>

      {/* Enhanced Canvas with Scrollable Container */}
      <div className="neon-border-cyan rounded-2xl shadow-2xl max-w-4xl max-h-96 overflow-auto">
        <div className="p-4 bg-gradient-to-br from-gray-900 via-black to-gray-900">
          <div className="text-center mb-4">
            <div className="text-sm neon-text-purple font-[Orbitron]">
              📏 EXPANDED CANVAS: {CANVAS_WIDTH}x{CANVAS_HEIGHT} pixels • Scroll to explore unlimited area
            </div>
          </div>
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="block cursor-crosshair transition-all duration-300 hover:brightness-110 border border-gray-700"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => setIsDrawing(false)}
            onContextMenu={handleContextMenu}
          />
        </div>
      </div>
      
      {/* Status bar */}
      <div className="mt-4 text-center">
        <div className="cyber-panel rounded-lg px-6 py-2 inline-block">
          <span className="neon-text-cyan font-[Orbitron] text-sm">
            MODE: <span className="neon-text-magenta font-bold">{drawMode.toUpperCase()}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default Editor;
