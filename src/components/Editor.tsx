import React, { useRef, useEffect, useState, useCallback } from 'react';

export interface MapData {
  grid: number[][];
  start: { x: number; y: number } | null;
  finish: { x: number; y: number } | null;
}

interface EditorProps {
  onMapChange: (map: MapData) => void;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
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
  const [mapData, setMapData] = useState<MapData>({
    grid: Array(CANVAS_HEIGHT / CELL_SIZE).fill(null).map(() => 
      Array(CANVAS_WIDTH / CELL_SIZE).fill(WALL)
    ),
    start: null,
    finish: null
  });

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw cells
    for (let y = 0; y < mapData.grid.length; y++) {
      for (let x = 0; x < mapData.grid[y].length; x++) {
        const cellType = mapData.grid[y][x];
        const pixelX = x * CELL_SIZE;
        const pixelY = y * CELL_SIZE;

        switch (cellType) {
          case WALL:
            ctx.fillStyle = '#374151'; // Gray wall
            break;
          case ROAD:
            ctx.fillStyle = '#f3f4f6'; // Light gray road
            break;
          case START:
            ctx.fillStyle = '#10b981'; // Green start
            break;
          case FINISH:
            ctx.fillStyle = '#ef4444'; // Red finish
            break;
          default:
            ctx.fillStyle = '#374151';
        }

        ctx.fillRect(pixelX, pixelY, CELL_SIZE, CELL_SIZE);
        
        // Grid lines
        ctx.strokeStyle = '#6b7280';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(pixelX, pixelY, CELL_SIZE, CELL_SIZE);
      }
    }

    // Draw start position
    if (mapData.start) {
      ctx.fillStyle = '#10b981';
      ctx.fillRect(
        mapData.start.x * CELL_SIZE + 2,
        mapData.start.y * CELL_SIZE + 2,
        CELL_SIZE - 4,
        CELL_SIZE - 4
      );
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('S', mapData.start.x * CELL_SIZE + CELL_SIZE/2, mapData.start.y * CELL_SIZE + CELL_SIZE/2 + 4);
    }

    // Draw finish position
    if (mapData.finish) {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(
        mapData.finish.x * CELL_SIZE + 2,
        mapData.finish.y * CELL_SIZE + 2,
        CELL_SIZE - 4,
        CELL_SIZE - 4
      );
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('F', mapData.finish.x * CELL_SIZE + CELL_SIZE/2, mapData.finish.y * CELL_SIZE + CELL_SIZE/2 + 4);
    }
  }, [mapData]);

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
      finish: newFinish
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
      finish: null
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
    <div className="flex flex-col items-center p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Track Editor</h1>
      
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setDrawMode('road')}
          className={`px-4 py-2 rounded font-medium ${
            drawMode === 'road' 
              ? 'bg-blue-500 text-white' 
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Draw Road
        </button>
        <button
          onClick={() => setDrawMode('start')}
          className={`px-4 py-2 rounded font-medium ${
            drawMode === 'start' 
              ? 'bg-green-500 text-white' 
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Place START
        </button>
        <button
          onClick={() => setDrawMode('finish')}
          className={`px-4 py-2 rounded font-medium ${
            drawMode === 'finish' 
              ? 'bg-red-500 text-white' 
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Place FINISH
        </button>
        <button
          onClick={clearMap}
          className="px-4 py-2 bg-yellow-500 text-white rounded font-medium hover:bg-yellow-600"
        >
          Clear Map
        </button>
        <button
          onClick={saveMap}
          className="px-4 py-2 bg-purple-500 text-white rounded font-medium hover:bg-purple-600"
        >
          Save Map
        </button>
      </div>

      <div className="mb-4 text-sm text-gray-600">
        <p>Left click: Draw roads • Right click: Erase to walls</p>
        <p>Use buttons above to place START and FINISH positions</p>
      </div>

      <div className="border-2 border-gray-300 rounded-lg overflow-hidden shadow-lg">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="block cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => setIsDrawing(false)}
          onContextMenu={handleContextMenu}
        />
      </div>
    </div>
  );
};

export default Editor;
