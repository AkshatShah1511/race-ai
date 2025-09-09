import React, { useRef, useEffect, useState, useCallback } from 'react';
import { MapData } from './Editor';
import { DQNAgent, GameState, Action, TrainingStats } from '../ai/agent';

interface GameProps {
  mapData: MapData;
  mode: 'manual' | 'ai';
  isTraining: boolean;
  onTrainingStats: (stats: TrainingStats) => void;
}

interface Car {
  x: number;
  y: number;
  angle: number;
  speed: number;
  width: number;
  height: number;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const CELL_SIZE = 20;
const CAR_SIZE = 12;
const MAX_SPEED = 3;
const ACCELERATION = 0.2;
const DECELERATION = 0.1;
const TURN_SPEED = 0.08;

// Cell types
const WALL = 0;
const ROAD = 1;
const START = 2;
const FINISH = 3;

const Game: React.FC<GameProps> = ({ mapData, mode, isTraining, onTrainingStats }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const agentRef = useRef<DQNAgent | null>(null);
  const prevStateRef = useRef<GameState | null>(null);
  const episodeRewardRef = useRef<number>(0);
  const episodeStepsRef = useRef<number>(0);
  const episodeCountRef = useRef<number>(0);
  
  const [car, setCar] = useState<Car>({
    x: 0,
    y: 0,
    angle: 0,
    speed: 0,
    width: CAR_SIZE,
    height: CAR_SIZE
  });
  
  const [gameState, setGameState] = useState<'playing' | 'crashed' | 'finished'>('playing');
  const [keys, setKeys] = useState({
    up: false,
    down: false,
    left: false,
    right: false
  });
  
  const [currentAction, setCurrentAction] = useState<Action>(Action.NO_ACTION);
  const [currentEpisode, setCurrentEpisode] = useState(0);
  const [currentReward, setCurrentReward] = useState(0);

  // Initialize AI agent
  useEffect(() => {
    if (mode === 'ai' && !agentRef.current) {
      agentRef.current = new DQNAgent();
      agentRef.current.load();
    }
  }, [mode]);

  // Initialize car position at start
  useEffect(() => {
    if (mapData.start) {
      setCar(prev => ({
        ...prev,
        x: mapData.start!.x * CELL_SIZE + CELL_SIZE / 2,
        y: mapData.start!.y * CELL_SIZE + CELL_SIZE / 2,
        speed: 0,
        angle: 0
      }));
      setGameState('playing');
      episodeRewardRef.current = 0;
      episodeStepsRef.current = 0;
    }
  }, [mapData.start, currentEpisode]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          setKeys(prev => ({ ...prev, up: true }));
          e.preventDefault();
          break;
        case 'ArrowDown':
          setKeys(prev => ({ ...prev, down: true }));
          e.preventDefault();
          break;
        case 'ArrowLeft':
          setKeys(prev => ({ ...prev, left: true }));
          e.preventDefault();
          break;
        case 'ArrowRight':
          setKeys(prev => ({ ...prev, right: true }));
          e.preventDefault();
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          setKeys(prev => ({ ...prev, up: false }));
          break;
        case 'ArrowDown':
          setKeys(prev => ({ ...prev, down: false }));
          break;
        case 'ArrowLeft':
          setKeys(prev => ({ ...prev, left: false }));
          break;
        case 'ArrowRight':
          setKeys(prev => ({ ...prev, right: false }));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const checkCollision = useCallback((x: number, y: number): boolean => {
    const gridX = Math.floor(x / CELL_SIZE);
    const gridY = Math.floor(y / CELL_SIZE);

    // Check bounds
    if (gridX < 0 || gridX >= mapData.grid[0].length || 
        gridY < 0 || gridY >= mapData.grid.length) {
      return true;
    }

    // Check if hitting wall
    return mapData.grid[gridY][gridX] === WALL;
  }, [mapData.grid]);

  const checkFinish = useCallback((x: number, y: number): boolean => {
    if (!mapData.finish) return false;
    
    const gridX = Math.floor(x / CELL_SIZE);
    const gridY = Math.floor(y / CELL_SIZE);

    return gridX === mapData.finish.x && gridY === mapData.finish.y;
  }, [mapData.finish]);

  const getGameState = useCallback((car: Car): GameState => {
    const distanceToFinish = mapData.finish ? 
      Math.sqrt(
        Math.pow(car.x - (mapData.finish.x * CELL_SIZE + CELL_SIZE/2), 2) +
        Math.pow(car.y - (mapData.finish.y * CELL_SIZE + CELL_SIZE/2), 2)
      ) : 1000;

    return {
      carX: car.x,
      carY: car.y,
      carAngle: car.angle,
      finishX: mapData.finish?.x || 0,
      finishY: mapData.finish?.y || 0,
      distanceToFinish,
      crashed: gameState === 'crashed',
      finished: gameState === 'finished'
    };
  }, [car, mapData.finish, gameState]);

  const applyAction = useCallback((action: Action) => {
    switch (action) {
      case Action.ACCELERATE:
        setKeys(prev => ({ ...prev, up: true, down: false }));
        break;
      case Action.BRAKE:
        setKeys(prev => ({ ...prev, down: true, up: false }));
        break;
      case Action.TURN_LEFT:
        setKeys(prev => ({ ...prev, left: true, right: false }));
        break;
      case Action.TURN_RIGHT:
        setKeys(prev => ({ ...prev, right: true, left: false }));
        break;
      case Action.NO_ACTION:
        setKeys({ up: false, down: false, left: false, right: false });
        break;
    }
  }, []);

  const updateCar = useCallback(() => {
    if (gameState !== 'playing') return;

    setCar(prevCar => {
      // AI decision making
      if (mode === 'ai' && agentRef.current) {
        const currentState = getGameState(prevCar);
        const action = agentRef.current.selectAction(currentState);
        setCurrentAction(action);
        applyAction(action);
      }
      let newSpeed = prevCar.speed;
      let newAngle = prevCar.angle;

      // Handle acceleration/deceleration
      if (keys.up) {
        newSpeed = Math.min(newSpeed + ACCELERATION, MAX_SPEED);
      } else if (keys.down) {
        newSpeed = Math.max(newSpeed - ACCELERATION, -MAX_SPEED * 0.5);
      } else {
        // Natural deceleration
        if (newSpeed > 0) {
          newSpeed = Math.max(newSpeed - DECELERATION, 0);
        } else if (newSpeed < 0) {
          newSpeed = Math.min(newSpeed + DECELERATION, 0);
        }
      }

      // Handle turning (only when moving)
      if (Math.abs(newSpeed) > 0.1) {
        if (keys.left) {
          newAngle -= TURN_SPEED;
        }
        if (keys.right) {
          newAngle += TURN_SPEED;
        }
      }

      // Calculate new position
      const newX = prevCar.x + Math.cos(newAngle) * newSpeed;
      const newY = prevCar.y + Math.sin(newAngle) * newSpeed;

      // Check collision with car corners
      const carCorners = [
        { x: newX - CAR_SIZE/2, y: newY - CAR_SIZE/2 },
        { x: newX + CAR_SIZE/2, y: newY - CAR_SIZE/2 },
        { x: newX - CAR_SIZE/2, y: newY + CAR_SIZE/2 },
        { x: newX + CAR_SIZE/2, y: newY + CAR_SIZE/2 }
      ];

      const hasCollision = carCorners.some(corner => 
        checkCollision(corner.x, corner.y)
      );

      if (hasCollision) {
        setGameState('crashed');
        
        // Handle AI training
        if (mode === 'ai' && agentRef.current && isTraining) {
          const newState = getGameState({ ...prevCar, x: newX, y: newY });
          newState.crashed = true;
          
          if (prevStateRef.current) {
            const reward = agentRef.current.calculateReward(prevStateRef.current, newState, currentAction);
            agentRef.current.remember(prevStateRef.current, currentAction, reward, newState, true);
            episodeRewardRef.current += reward;
            // Only trigger replay on episode end, not every step
            agentRef.current.replay();
          }
          
          // Reset for next episode
          setTimeout(() => {
            episodeCountRef.current++;
            setCurrentEpisode(episodeCountRef.current);
            onTrainingStats({
              episode: episodeCountRef.current,
              totalReward: episodeRewardRef.current,
              episodeLength: episodeStepsRef.current,
              averageReward: episodeRewardRef.current / Math.max(episodeStepsRef.current, 1)
            });
          }, 100);
        }
        
        return { ...prevCar, speed: 0 };
      }

      // Check if reached finish
      if (checkFinish(newX, newY)) {
        setGameState('finished');
        
        // Handle AI training
        if (mode === 'ai' && agentRef.current && isTraining) {
          const newState = getGameState({ ...prevCar, x: newX, y: newY });
          newState.finished = true;
          
          if (prevStateRef.current) {
            const reward = agentRef.current.calculateReward(prevStateRef.current, newState, currentAction);
            agentRef.current.remember(prevStateRef.current, currentAction, reward, newState, true);
            agentRef.current.replay();
            episodeRewardRef.current += reward;
          }
          
          // Reset for next episode
          setTimeout(() => {
            episodeCountRef.current++;
            setCurrentEpisode(episodeCountRef.current);
            onTrainingStats({
              episode: episodeCountRef.current,
              totalReward: episodeRewardRef.current,
              episodeLength: episodeStepsRef.current,
              averageReward: episodeRewardRef.current / Math.max(episodeStepsRef.current, 1)
            });
            agentRef.current?.save();
          }, 100);
        }
        
        return { ...prevCar, x: newX, y: newY, speed: 0 };
      }

      const newState = {
        ...prevCar,
        x: newX,
        y: newY,
        angle: newAngle,
        speed: newSpeed
      };
      
      // Handle continuous AI training
      if (mode === 'ai' && agentRef.current && isTraining) {
        const currentState = getGameState(newState);
        
        if (prevStateRef.current) {
          const reward = agentRef.current.calculateReward(prevStateRef.current, currentState, currentAction);
          agentRef.current.remember(prevStateRef.current, currentAction, reward, currentState, false);
          episodeRewardRef.current += reward;
          setCurrentReward(episodeRewardRef.current);
          
          // Only replay occasionally during continuous play (every 10 steps)
          if (episodeStepsRef.current % 10 === 0) {
            agentRef.current.replay();
          }
        }
        
        prevStateRef.current = currentState;
        episodeStepsRef.current++;
      }
      
      return newState;
    });
  }, [keys, gameState, checkCollision, checkFinish, mode, isTraining, currentAction, getGameState, applyAction]);

  const drawGame = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw map
    for (let y = 0; y < mapData.grid.length; y++) {
      for (let x = 0; x < mapData.grid[y].length; x++) {
        const cellType = mapData.grid[y][x];
        const pixelX = x * CELL_SIZE;
        const pixelY = y * CELL_SIZE;

        switch (cellType) {
          case WALL:
            ctx.fillStyle = '#374151';
            break;
          case ROAD:
            ctx.fillStyle = '#f3f4f6';
            break;
          case START:
            ctx.fillStyle = '#10b981';
            break;
          case FINISH:
            ctx.fillStyle = '#ef4444';
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

    // Draw start/finish markers
    if (mapData.start) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('S', mapData.start.x * CELL_SIZE + CELL_SIZE/2, mapData.start.y * CELL_SIZE + CELL_SIZE/2 + 4);
    }

    if (mapData.finish) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('F', mapData.finish.x * CELL_SIZE + CELL_SIZE/2, mapData.finish.y * CELL_SIZE + CELL_SIZE/2 + 4);
    }

    // Draw car
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);

    // Car body (triangle pointing forward)
    let carColor = '#3b82f6'; // Default blue
    if (gameState === 'crashed') {
      carColor = '#ef4444'; // Red for crashed
    } else if (mode === 'ai') {
      carColor = '#10b981'; // Green for AI
    }
    ctx.fillStyle = carColor;
    ctx.beginPath();
    ctx.moveTo(CAR_SIZE/2, 0); // Front point
    ctx.lineTo(-CAR_SIZE/2, -CAR_SIZE/3); // Back left
    ctx.lineTo(-CAR_SIZE/2, CAR_SIZE/3); // Back right
    ctx.closePath();
    ctx.fill();

    // Car outline
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }, [mapData, car, gameState]);

  // Game loop
  useEffect(() => {
    const gameLoop = () => {
      updateCar();
      
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawGame(ctx);
        }
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [updateCar, drawGame]);

  const resetCar = () => {
    if (mapData.start) {
      setCar(prev => ({
        ...prev,
        x: mapData.start!.x * CELL_SIZE + CELL_SIZE / 2,
        y: mapData.start!.y * CELL_SIZE + CELL_SIZE / 2,
        speed: 0,
        angle: 0
      }));
      setGameState('playing');
    }
  };

  return (
    <div className="flex flex-col items-center p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Race Game</h1>
      
      {/* Game status */}
      <div className="mb-4 text-center">
        {gameState === 'crashed' && (
          <div className="text-red-600 text-xl font-bold mb-2">
            💥 CRASHED! 💥
          </div>
        )}
        {gameState === 'finished' && (
          <div className="text-green-600 text-xl font-bold mb-2">
            🏁 FINISHED! 🏁
          </div>
        )}
        {gameState === 'playing' && mapData.start && (
          <div className={`text-lg font-medium mb-2 ${
            mode === 'ai' ? 'text-green-600' : 'text-blue-600'
          }`}>
            {mode === 'ai' ? '🤖 AI Racing...' : '🏎️ Racing...'}
          </div>
        )}
        {!mapData.start && (
          <div className="text-yellow-600 text-lg font-medium mb-2">
            ⚠️ No start position set in editor
          </div>
        )}
        
        {/* AI Training Status */}
        {mode === 'ai' && isTraining && (
          <div className="bg-green-100 border border-green-300 rounded-lg p-3 mb-4 max-w-md mx-auto">
            <div className="text-sm text-green-800">
              <div className="flex justify-between mb-1">
                <span>Episode: {currentEpisode}</span>
                <span>Reward: {currentReward.toFixed(1)}</span>
              </div>
              <div className="text-xs text-green-600">
                Action: {Action[currentAction]} | Epsilon: {agentRef.current?.getEpsilon().toFixed(3)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls info */}
      <div className="mb-4 text-sm text-gray-600 text-center">
        {mode === 'manual' ? (
          <>
            <p>Use arrow keys to control the car</p>
            <p>↑ Accelerate • ↓ Brake/Reverse • ← → Turn</p>
          </>
        ) : (
          <>
            <p>🤖 AI is controlling the car</p>
            <p>Watch as it learns to navigate the track!</p>
          </>
        )}
      </div>

      {/* Reset button */}
      {(gameState === 'crashed' || gameState === 'finished') && (
        <button
          onClick={resetCar}
          className="mb-4 px-6 py-2 bg-blue-500 text-white rounded font-medium hover:bg-blue-600"
        >
          Reset Car
        </button>
      )}

      {/* Game canvas */}
      <div className="border-2 border-gray-300 rounded-lg overflow-hidden shadow-lg">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="block focus:outline-none"
          tabIndex={0}
        />
      </div>

      {/* Speed indicator */}
      <div className="mt-4 text-center">
        <div className="text-sm text-gray-600">
          Speed: {Math.abs(car.speed).toFixed(1)}
        </div>
        <div className="w-32 h-2 bg-gray-200 rounded-full mt-1">
          <div 
            className="h-full bg-blue-500 rounded-full transition-all duration-100"
            style={{ width: `${Math.min((Math.abs(car.speed) / MAX_SPEED) * 100, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default Game;
