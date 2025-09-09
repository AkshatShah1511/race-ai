import React, { useRef, useEffect, useState, useCallback } from 'react';
import { MapData } from './Editor';
import { DQNAgent, GameState, Action, TrainingStats } from '../ai/agent';
import { Car, RaceMode, CarCount, CAR_COLORS, CAR_NAMES, RaceStats, RaceState } from '../types/racing';
import { 
  updateCarPhysics, 
  checkWallCollision, 
  checkCarCollision, 
  checkFinishLine,
  getDistanceToNearestCar,
  getAngleToNearestCar,
  getDistanceToNearestWall,
  calculateTrackProgress,
  resolveCarCollision,
  PHYSICS_CONSTANTS,
  CANVAS_CONSTANTS,
  CELL_TYPES,
  CarInput
} from '../utils/physics';

interface MultiCarGameProps {
  mapData: MapData;
  raceMode: RaceMode;
  carCount: CarCount;
  isTraining: boolean;
  onTrainingStats: (stats: TrainingStats) => void;
  onRaceComplete: (stats: RaceStats[]) => void;
}

const MultiCarGame: React.FC<MultiCarGameProps> = ({ 
  mapData, 
  raceMode, 
  carCount,
  isTraining, 
  onTrainingStats,
  onRaceComplete 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const agentsRef = useRef<Map<string, DQNAgent>>(new Map());
  const prevStatesRef = useRef<Map<string, GameState>>(new Map());
  const episodeRewardsRef = useRef<Map<string, number>>(new Map());
  const episodeStepsRef = useRef<number>(0);
  const episodeCountRef = useRef<number>(0);

  const [raceState, setRaceState] = useState<RaceState>({
    cars: [],
    raceStartTime: 0,
    raceFinished: false,
    winner: null,
    leaderboard: [],
  });

  const [playerInput, setPlayerInput] = useState<CarInput>({
    up: false,
    down: false,
    left: false,
    right: false,
  });

  const [currentEpisode, setCurrentEpisode] = useState(0);
  const [raceTime, setRaceTime] = useState(0);

  // Initialize cars and AI agents
  useEffect(() => {
    if (!mapData.start) return;

    const cars: Car[] = [];
    const startX = mapData.start.x * CANVAS_CONSTANTS.CELL_SIZE + CANVAS_CONSTANTS.CELL_SIZE / 2;
    const startY = mapData.start.y * CANVAS_CONSTANTS.CELL_SIZE + CANVAS_CONSTANTS.CELL_SIZE / 2;

    for (let i = 0; i < carCount; i++) {
      const isPlayer = raceMode === 'user-vs-ai' && i === 0;
      const car: Car = {
        id: `car-${i}`,
        name: CAR_NAMES[i] || `Car ${i + 1}`,
        x: startX + (i * 25), // Offset cars slightly
        y: startY + (i * 10),
        angle: 0,
        speed: 0,
        velocity: { x: 0, y: 0 },
        acceleration: 0,
        width: PHYSICS_CONSTANTS.CAR_SIZE,
        height: PHYSICS_CONSTANTS.CAR_SIZE,
        color: CAR_COLORS[i] || '#666666',
        isAI: !isPlayer,
        isPlayer: isPlayer,
        lapTimes: [],
        currentLapStartTime: Date.now(),
        position: i + 1,
        checkpoints: [],
        finished: false,
        crashed: false,
      };
      cars.push(car);

      // Initialize AI agent for AI cars
      if (car.isAI) {
        const agent = new DQNAgent();
        agent.load();
        agentsRef.current.set(car.id, agent);
        episodeRewardsRef.current.set(car.id, 0);
      }
    }

    setRaceState(prev => ({
      ...prev,
      cars,
      raceStartTime: Date.now(),
      raceFinished: false,
      winner: null,
    }));

    episodeStepsRef.current = 0;
  }, [mapData.start, raceMode, carCount]);

  // Handle keyboard input for player car
  useEffect(() => {
    if (raceMode !== 'user-vs-ai') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          setPlayerInput(prev => ({ ...prev, up: true }));
          e.preventDefault();
          break;
        case 'ArrowDown':
          setPlayerInput(prev => ({ ...prev, down: true }));
          e.preventDefault();
          break;
        case 'ArrowLeft':
          setPlayerInput(prev => ({ ...prev, left: true }));
          e.preventDefault();
          break;
        case 'ArrowRight':
          setPlayerInput(prev => ({ ...prev, right: true }));
          e.preventDefault();
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          setPlayerInput(prev => ({ ...prev, up: false }));
          break;
        case 'ArrowDown':
          setPlayerInput(prev => ({ ...prev, down: false }));
          break;
        case 'ArrowLeft':
          setPlayerInput(prev => ({ ...prev, left: false }));
          break;
        case 'ArrowRight':
          setPlayerInput(prev => ({ ...prev, right: false }));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [raceMode]);

  // Convert car to game state for AI
  const getGameStateForCar = useCallback((car: Car, allCars: Car[]): GameState => {
    const otherCars = allCars.filter(c => c.id !== car.id);
    const distanceToFinish = mapData.finish ? 
      Math.sqrt(
        Math.pow(car.x - (mapData.finish.x * CANVAS_CONSTANTS.CELL_SIZE + CANVAS_CONSTANTS.CELL_SIZE/2), 2) +
        Math.pow(car.y - (mapData.finish.y * CANVAS_CONSTANTS.CELL_SIZE + CANVAS_CONSTANTS.CELL_SIZE/2), 2)
      ) : 1000;

    return {
      carX: car.x,
      carY: car.y,
      carAngle: car.angle,
      carSpeed: car.speed,
      carVelocityX: car.velocity.x,
      carVelocityY: car.velocity.y,
      finishX: mapData.finish?.x || 0,
      finishY: mapData.finish?.y || 0,
      distanceToFinish,
      distanceToNearestWall: getDistanceToNearestWall(car, mapData),
      distanceToNearestCar: getDistanceToNearestCar(car, otherCars),
      angleToNearestCar: getAngleToNearestCar(car, otherCars),
      progressThroughTrack: calculateTrackProgress(car, mapData),
      crashed: car.crashed,
      finished: car.finished
    };
  }, [mapData]);

  // Convert AI action to car input
  const actionToInput = useCallback((action: Action): CarInput => {
    const input: CarInput = { up: false, down: false, left: false, right: false };
    
    switch (action) {
      case Action.ACCELERATE:
        input.up = true;
        break;
      case Action.BRAKE:
        input.down = true;
        break;
      case Action.TURN_LEFT:
        input.left = true;
        break;
      case Action.TURN_RIGHT:
        input.right = true;
        break;
      default:
        break;
    }
    
    return input;
  }, []);

  // Update race timer
  useEffect(() => {
    const timer = setInterval(() => {
      if (!raceState.raceFinished) {
        setRaceTime((Date.now() - raceState.raceStartTime) / 1000);
      }
    }, 100);

    return () => clearInterval(timer);
  }, [raceState.raceStartTime, raceState.raceFinished]);

  // Main game update loop
  const updateGame = useCallback(() => {
    if (raceState.raceFinished || raceState.cars.length === 0) return;

    setRaceState(prevState => {
      const updatedCars = [...prevState.cars];
      let raceFinished = false;
      let winner: Car | null = null;
      const finishedCars: Car[] = [];

      // Process each car
      updatedCars.forEach((car, index) => {
        if (car.finished || car.crashed) return;

        let input: CarInput;

        // Get input for this car
        if (car.isPlayer) {
          input = playerInput;
        } else {
          // AI car - get action from agent
          const agent = agentsRef.current.get(car.id);
          if (agent) {
            const gameState = getGameStateForCar(car, updatedCars);
            const action = agent.selectAction(gameState);
            input = actionToInput(action);

            // Store previous state for training
            prevStatesRef.current.set(car.id, gameState);
          } else {
            input = { up: false, down: false, left: false, right: false };
          }
        }

        // Update car physics
        const updatedCar = updateCarPhysics(car, input);

        // Check wall collision
        if (checkWallCollision(updatedCar, mapData)) {
          updatedCar.crashed = true;
          updatedCar.speed = 0;

          // AI training for crash
          if (updatedCar.isAI && isTraining) {
            const agent = agentsRef.current.get(updatedCar.id);
            const prevState = prevStatesRef.current.get(updatedCar.id);
            if (agent && prevState) {
              const currentState = getGameStateForCar(updatedCar, updatedCars);
              currentState.crashed = true;
              const reward = agent.calculateReward(prevState, currentState, Action.NO_ACTION);
              agent.remember(prevState, Action.NO_ACTION, reward, currentState, true);
              agent.replay();
              
              const currentReward = episodeRewardsRef.current.get(updatedCar.id) || 0;
              episodeRewardsRef.current.set(updatedCar.id, currentReward + reward);
            }
          }
        }

        // Check car-to-car collisions
        updatedCars.forEach((otherCar, otherIndex) => {
          if (index !== otherIndex && !otherCar.crashed && !otherCar.finished) {
            if (checkCarCollision(updatedCar, otherCar)) {
              const resolved = resolveCarCollision(updatedCar, otherCar);
              Object.assign(updatedCar, resolved.car1);
              Object.assign(updatedCars[otherIndex], resolved.car2);
            }
          }
        });

        // Check finish line
        if (checkFinishLine(updatedCar, mapData)) {
          updatedCar.finished = true;
          updatedCar.speed = 0;
          const lapTime = (Date.now() - updatedCar.currentLapStartTime) / 1000;
          updatedCar.lapTimes.push(lapTime);
          
          finishedCars.push(updatedCar);

          if (!winner) {
            winner = updatedCar;
            raceFinished = true;
          }

          // AI training for finish
          if (updatedCar.isAI && isTraining) {
            const agent = agentsRef.current.get(updatedCar.id);
            const prevState = prevStatesRef.current.get(updatedCar.id);
            if (agent && prevState) {
              const currentState = getGameStateForCar(updatedCar, updatedCars);
              currentState.finished = true;
              const reward = agent.calculateReward(prevState, currentState, Action.NO_ACTION);
              agent.remember(prevState, Action.NO_ACTION, reward, currentState, true);
              agent.replay();
              agent.save();
              
              const currentReward = episodeRewardsRef.current.get(updatedCar.id) || 0;
              episodeRewardsRef.current.set(updatedCar.id, currentReward + reward);
            }
          }
        }

        // Continuous AI training
        if (updatedCar.isAI && isTraining && !updatedCar.crashed && !updatedCar.finished) {
          const agent = agentsRef.current.get(updatedCar.id);
          const prevState = prevStatesRef.current.get(updatedCar.id);
          if (agent && prevState) {
            const currentState = getGameStateForCar(updatedCar, updatedCars);
            const reward = agent.calculateReward(prevState, currentState, Action.NO_ACTION);
            agent.remember(prevState, Action.NO_ACTION, reward, currentState, false);
            
            const currentReward = episodeRewardsRef.current.get(updatedCar.id) || 0;
            episodeRewardsRef.current.set(updatedCar.id, currentReward + reward);
            
            // Occasional replay during continuous play
            if (episodeStepsRef.current % 20 === 0) {
              agent.replay();
            }
          }
        }

        updatedCars[index] = updatedCar;
      });

      // Update race positions
      const sortedCars = [...updatedCars].sort((a, b) => {
        if (a.finished && !b.finished) return -1;
        if (!a.finished && b.finished) return 1;
        if (a.finished && b.finished) return a.lapTimes[0] - b.lapTimes[0];
        
        const aProgress = calculateTrackProgress(a, mapData);
        const bProgress = calculateTrackProgress(b, mapData);
        return bProgress - aProgress;
      });

      sortedCars.forEach((car, index) => {
        const carIndex = updatedCars.findIndex(c => c.id === car.id);
        if (carIndex !== -1) {
          updatedCars[carIndex].position = index + 1;
        }
      });

      episodeStepsRef.current++;

      // Handle race completion
      if (raceFinished) {
        const raceStats: RaceStats[] = finishedCars.map((car, index) => ({
          carId: car.id,
          carName: car.name,
          lapTime: car.lapTimes[car.lapTimes.length - 1],
          position: index + 1,
          timestamp: Date.now(),
        }));

        onRaceComplete(raceStats);

        // Training stats for AI
        if (isTraining) {
          agentsRef.current.forEach((agent, carId) => {
            const reward = episodeRewardsRef.current.get(carId) || 0;
            episodeCountRef.current++;
            setCurrentEpisode(episodeCountRef.current);
            onTrainingStats({
              episode: episodeCountRef.current,
              totalReward: reward,
              episodeLength: episodeStepsRef.current,
              averageReward: reward / Math.max(episodeStepsRef.current, 1)
            });
          });

          // Reset for next episode
          setTimeout(() => {
            episodeRewardsRef.current.clear();
            episodeStepsRef.current = 0;
            prevStatesRef.current.clear();
          }, 1000);
        }
      }

      return {
        ...prevState,
        cars: updatedCars,
        raceFinished,
        winner,
      };
    });
  }, [mapData, playerInput, isTraining, onRaceComplete, onTrainingStats, getGameStateForCar, actionToInput]);

  // Render game
  const drawGame = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, CANVAS_CONSTANTS.WIDTH, CANVAS_CONSTANTS.HEIGHT);

    // Draw map
    for (let y = 0; y < mapData.grid.length; y++) {
      for (let x = 0; x < mapData.grid[y].length; x++) {
        const cellType = mapData.grid[y][x];
        const pixelX = x * CANVAS_CONSTANTS.CELL_SIZE;
        const pixelY = y * CANVAS_CONSTANTS.CELL_SIZE;

        switch (cellType) {
          case CELL_TYPES.WALL:
            ctx.fillStyle = '#374151';
            break;
          case CELL_TYPES.ROAD:
            ctx.fillStyle = '#f3f4f6';
            break;
          case CELL_TYPES.START:
            ctx.fillStyle = '#10b981';
            break;
          case CELL_TYPES.FINISH:
            ctx.fillStyle = '#ef4444';
            break;
          default:
            ctx.fillStyle = '#374151';
        }

        ctx.fillRect(pixelX, pixelY, CANVAS_CONSTANTS.CELL_SIZE, CANVAS_CONSTANTS.CELL_SIZE);
        
        // Grid lines
        ctx.strokeStyle = '#6b7280';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(pixelX, pixelY, CANVAS_CONSTANTS.CELL_SIZE, CANVAS_CONSTANTS.CELL_SIZE);
      }
    }

    // Draw start/finish markers
    if (mapData.start) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('S', mapData.start.x * CANVAS_CONSTANTS.CELL_SIZE + CANVAS_CONSTANTS.CELL_SIZE/2, mapData.start.y * CANVAS_CONSTANTS.CELL_SIZE + CANVAS_CONSTANTS.CELL_SIZE/2 + 4);
    }

    if (mapData.finish) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('F', mapData.finish.x * CANVAS_CONSTANTS.CELL_SIZE + CANVAS_CONSTANTS.CELL_SIZE/2, mapData.finish.y * CANVAS_CONSTANTS.CELL_SIZE + CANVAS_CONSTANTS.CELL_SIZE/2 + 4);
    }

    // Draw cars
    raceState.cars.forEach((car, index) => {
      ctx.save();
      ctx.translate(car.x, car.y);
      ctx.rotate(car.angle);

      // Car body (triangle pointing forward)
      let carColor = car.color;
      if (car.crashed) {
        carColor = '#ef4444';
      } else if (car.finished) {
        carColor = '#10b981';
      }
      
      ctx.fillStyle = carColor;
      ctx.beginPath();
      ctx.moveTo(PHYSICS_CONSTANTS.CAR_SIZE/2, 0); // Front point
      ctx.lineTo(-PHYSICS_CONSTANTS.CAR_SIZE/2, -PHYSICS_CONSTANTS.CAR_SIZE/3); // Back left
      ctx.lineTo(-PHYSICS_CONSTANTS.CAR_SIZE/2, PHYSICS_CONSTANTS.CAR_SIZE/3); // Back right
      ctx.closePath();
      ctx.fill();

      // Car outline
      ctx.strokeStyle = car.isPlayer ? '#ffffff' : '#1f2937';
      ctx.lineWidth = car.isPlayer ? 3 : 2;
      ctx.stroke();

      // Position indicator
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(car.position.toString(), 0, 3);

      ctx.restore();

      // Car name label
      ctx.fillStyle = car.color;
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(car.name, car.x, car.y - 25);
    });
  }, [mapData, raceState.cars]);

  // Game loop
  useEffect(() => {
    const gameLoop = () => {
      updateGame();
      
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
  }, [updateGame, drawGame]);

  const resetRace = () => {
    if (!mapData.start) return;

    const cars: Car[] = [];
    const startX = mapData.start.x * CANVAS_CONSTANTS.CELL_SIZE + CANVAS_CONSTANTS.CELL_SIZE / 2;
    const startY = mapData.start.y * CANVAS_CONSTANTS.CELL_SIZE + CANVAS_CONSTANTS.CELL_SIZE / 2;

    for (let i = 0; i < carCount; i++) {
      const isPlayer = raceMode === 'user-vs-ai' && i === 0;
      const car: Car = {
        id: `car-${i}`,
        name: CAR_NAMES[i] || `Car ${i + 1}`,
        x: startX + (i * 25),
        y: startY + (i * 10),
        angle: 0,
        speed: 0,
        velocity: { x: 0, y: 0 },
        acceleration: 0,
        width: PHYSICS_CONSTANTS.CAR_SIZE,
        height: PHYSICS_CONSTANTS.CAR_SIZE,
        color: CAR_COLORS[i] || '#666666',
        isAI: !isPlayer,
        isPlayer: isPlayer,
        lapTimes: [],
        currentLapStartTime: Date.now(),
        position: i + 1,
        checkpoints: [],
        finished: false,
        crashed: false,
      };
      cars.push(car);
    }

    setRaceState({
      cars,
      raceStartTime: Date.now(),
      raceFinished: false,
      winner: null,
      leaderboard: [],
    });

    episodeRewardsRef.current.clear();
    episodeStepsRef.current = 0;
    prevStatesRef.current.clear();
  };

  const formatTime = (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = (timeInSeconds % 60).toFixed(2);
    return `${minutes}:${seconds.padStart(5, '0')}`;
  };

  return (
    <div className="flex flex-col items-center p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Multi-Car Race</h1>
      
      {/* Race status */}
      <div className="mb-4 text-center">
        {raceState.raceFinished && raceState.winner ? (
          <div className="text-green-600 text-xl font-bold mb-2">
            🏆 {raceState.winner.name} Wins! 🏆
            <div className="text-sm text-gray-600">
              Time: {formatTime(raceState.winner.lapTimes[0])}
            </div>
          </div>
        ) : (
          <div className="text-blue-600 text-lg font-medium mb-2">
            🏁 Race in Progress - {formatTime(raceTime)}
          </div>
        )}
        
        {!mapData.start && (
          <div className="text-yellow-600 text-lg font-medium mb-2">
            ⚠️ No start position set in editor
          </div>
        )}
        
        {/* Training Status */}
        {isTraining && (
          <div className="bg-green-100 border border-green-300 rounded-lg p-3 mb-4 max-w-md mx-auto">
            <div className="text-sm text-green-800">
              <div className="flex justify-between mb-1">
                <span>Training Episode: {currentEpisode}</span>
                <span>Steps: {episodeStepsRef.current}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Car positions */}
      <div className="mb-4 bg-white rounded-lg shadow p-4 min-w-80">
        <h3 className="font-bold text-gray-800 mb-2">Race Positions</h3>
        <div className="space-y-2">
          {raceState.cars
            .sort((a, b) => a.position - b.position)
            .map((car, index) => (
            <div key={car.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-4 h-4 rounded" 
                  style={{ backgroundColor: car.color }}
                ></div>
                <span className={`font-medium ${car.isPlayer ? 'text-blue-600' : 'text-gray-700'}`}>
                  {index + 1}. {car.name}
                  {car.isPlayer && ' 👤'}
                  {car.isAI && ' 🤖'}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                {car.finished ? `${formatTime(car.lapTimes[0])}` :
                 car.crashed ? 'CRASHED' : 
                 `${Math.round(calculateTrackProgress(car, mapData) * 100)}%`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls info */}
      <div className="mb-4 text-sm text-gray-600 text-center">
        {raceMode === 'user-vs-ai' ? (
          <>
            <p>Use arrow keys to control your car (Blue)</p>
            <p>↑ Accelerate • ↓ Brake/Reverse • ← → Turn</p>
          </>
        ) : (
          <p>🤖 All cars are AI controlled - watch them race!</p>
        )}
      </div>

      {/* Reset button */}
      {(raceState.raceFinished || raceState.cars.some(c => c.crashed)) && (
        <button
          onClick={resetRace}
          className="mb-4 px-6 py-2 bg-blue-500 text-white rounded font-medium hover:bg-blue-600"
        >
          Reset Race
        </button>
      )}

      {/* Game canvas */}
      <div className="border-2 border-gray-300 rounded-lg overflow-hidden shadow-lg">
        <canvas
          ref={canvasRef}
          width={CANVAS_CONSTANTS.WIDTH}
          height={CANVAS_CONSTANTS.HEIGHT}
          className="block focus:outline-none"
          tabIndex={0}
        />
      </div>
    </div>
  );
};

export default MultiCarGame;
