import React, { useRef, useEffect, useState, useCallback } from 'react';
import { MapData } from './Editor';
import { DQNAgent, GameState, Action, TrainingStats } from '../ai/agent';
import { useTheme } from '../contexts/ThemeContext';
import audioEngine from '../utils/sounds';

interface GameProps {
  mapData: MapData;
  mode: 'manual' | 'ai' | 'human-vs-ai';
  isTraining: boolean;
  fastMode: boolean;
  onTrainingStats: (stats: TrainingStats) => void;
  onUpdateStats: (
    episode: number,
    reward: number,
    attempts: number,
    successes: number,
    elapsed: number,
    epsilon: number,
    action: string
  ) => void;
  showGhostTrail?: boolean;
  onCollisionMessage?: (message: string) => void;
  selectedCarSkin?: string;
  soundEnabled?: boolean;
}

interface Car {
  x: number;
  y: number;
  angle: number;
  speed: number;
  width: number;
  height: number;
  lastSafeX?: number;
  lastSafeY?: number;
  collisionOpacity?: number;
  isAnimating?: boolean;
  currentLap: number;
  checkpointsPassed: number[];
  skin: string;
  trail: {x: number, y: number, opacity: number}[];
}

const CANVAS_WIDTH = 1200; // Match Editor canvas size
const CANVAS_HEIGHT = 900; // Match Editor canvas size
const CELL_SIZE = 20;
const CAR_SIZE = 12;
const MAX_SPEED = 3;
const ACCELERATION = 0.2;
const DECELERATION = 0.1;
const TURN_SPEED = 0.04; // Reduced turning radius for better control

// Cell types
const WALL = 0;
const ROAD = 1;
const START = 2;
const FINISH = 3;

// Car skin colors
const CAR_SKINS = {
  cyan: { color: '#00ffff', glow: '#00ffff' },
  magenta: { color: '#ff00ff', glow: '#ff00ff' },
  lime: { color: '#39ff14', glow: '#39ff14' },
  orange: { color: '#ff8c00', glow: '#ff8c00' },
  purple: { color: '#8a2be2', glow: '#8a2be2' },
  pink: { color: '#ff1493', glow: '#ff1493' }
};

const Game: React.FC<GameProps> = ({ mapData, mode, isTraining, fastMode, onTrainingStats, onUpdateStats, showGhostTrail = false, onCollisionMessage, selectedCarSkin = 'cyan', soundEnabled = true }) => {
  const { isDark } = useTheme();
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
    height: CAR_SIZE,
    lastSafeX: 0,
    lastSafeY: 0,
    collisionOpacity: 1,
    isAnimating: false,
    currentLap: 0,
    checkpointsPassed: [],
    skin: selectedCarSkin,
    trail: []
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
  const [trainingStartTime, setTrainingStartTime] = useState<number>(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [successfulRuns, setSuccessfulRuns] = useState(0);
  const [trainingElapsed, setTrainingElapsed] = useState(0);
  const [engineStarted, setEngineStarted] = useState(false);
  // Collision message is now handled through parent component
  const [bestRunPath, setBestRunPath] = useState<{x: number, y: number}[]>([]);
  const [currentRunPath, setCurrentRunPath] = useState<{x: number, y: number}[]>([]);
  const [bestRunReward, setBestRunReward] = useState(-Infinity);
  // Reserved for future features
  // const [crashHeatmap, setCrashHeatmap] = useState<{x: number, y: number, intensity: number}[]>([]);
  // const [showHeatmap, setShowHeatmap] = useState(false);
  // const [rewardHistory, setRewardHistory] = useState<number[]>([]);
  // const [isReplaying, setIsReplaying] = useState(false);
  // const [humanCar, setHumanCar] = useState<Car | null>(null);

  // Initialize AI agent and training timer
  useEffect(() => {
    if (mode === 'ai' && !agentRef.current) {
      agentRef.current = new DQNAgent();
      agentRef.current.load();
    }
    
    if (isTraining && trainingStartTime === 0) {
      setTrainingStartTime(Date.now());
      setTotalAttempts(0);
      setSuccessfulRuns(0);
    } else if (!isTraining) {
      setTrainingStartTime(0);
    }
  }, [mode, isTraining, trainingStartTime]);

  // Update training timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTraining && trainingStartTime > 0) {
      interval = setInterval(() => {
        setTrainingElapsed(Date.now() - trainingStartTime);
      }, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTraining, trainingStartTime]);

  // Update car skin when selectedCarSkin changes
  useEffect(() => {
    setCar(prev => ({
      ...prev,
      skin: selectedCarSkin
    }));
  }, [selectedCarSkin]);

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
      
      // Start engine sound for manual mode only
      if (mode === 'manual' && soundEnabled && !engineStarted) {
        audioEngine.startEngine();
        setEngineStarted(true);
      }
    }
  }, [mapData.start, currentEpisode, mode, soundEnabled, engineStarted]);

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

  // Raycast to find distance to nearest wall
  const getWallDistance = useCallback((x: number, y: number, angle: number): number => {
    const rayLength = 100;
    const stepSize = 2;
    
    for (let distance = 0; distance < rayLength; distance += stepSize) {
      const testX = x + Math.cos(angle) * distance;
      const testY = y + Math.sin(angle) * distance;
      
      // Check bounds
      if (testX < 0 || testX >= CANVAS_WIDTH || testY < 0 || testY >= CANVAS_HEIGHT) {
        return distance;
      }
      
      // Check wall collision
      const gridX = Math.floor(testX / CELL_SIZE);
      const gridY = Math.floor(testY / CELL_SIZE);
      
      if (gridX >= 0 && gridX < mapData.grid[0]?.length && 
          gridY >= 0 && gridY < mapData.grid.length && 
          mapData.grid[gridY][gridX] === WALL) {
        return distance;
      }
    }
    
    return rayLength;
  }, [mapData.grid]);

  const getGameState = useCallback((car: Car): GameState => {
    const distanceToFinish = mapData.finish ? 
      Math.sqrt(
        Math.pow(car.x - (mapData.finish.x * CELL_SIZE + CELL_SIZE/2), 2) +
        Math.pow(car.y - (mapData.finish.y * CELL_SIZE + CELL_SIZE/2), 2)
      ) : 1000;

    // Get wall distances in multiple directions for better state representation
    const frontWallDistance = getWallDistance(car.x, car.y, car.angle);
    const leftWallDistance = getWallDistance(car.x, car.y, car.angle - Math.PI/2);
    const rightWallDistance = getWallDistance(car.x, car.y, car.angle + Math.PI/2);
    const nearestWallDistance = Math.min(frontWallDistance, leftWallDistance, rightWallDistance);
    
    // Calculate progress through track
    const startDistance = mapData.start ? 
      Math.sqrt(
        Math.pow(car.x - (mapData.start.x * CELL_SIZE + CELL_SIZE/2), 2) +
        Math.pow(car.y - (mapData.start.y * CELL_SIZE + CELL_SIZE/2), 2)
      ) : 0;
    
    const totalTrackDistance = mapData.start && mapData.finish ?
      Math.sqrt(
        Math.pow((mapData.finish.x - mapData.start.x) * CELL_SIZE, 2) +
        Math.pow((mapData.finish.y - mapData.start.y) * CELL_SIZE, 2)
      ) : 1000;
    
    const progress = Math.min(1, startDistance / totalTrackDistance);

    return {
      carX: car.x,
      carY: car.y,
      carAngle: car.angle,
      carSpeed: car.speed,
      carVelocityX: Math.cos(car.angle) * car.speed,
      carVelocityY: Math.sin(car.angle) * car.speed,
      finishX: mapData.finish?.x || 0,
      finishY: mapData.finish?.y || 0,
      distanceToFinish,
      distanceToNearestWall: nearestWallDistance,
      distanceToNearestCar: 1000, // No other cars in single mode
      angleToNearestCar: 0,
      progressThroughTrack: progress,
      crashed: gameState === 'crashed',
      finished: gameState === 'finished'
    };
  }, [mapData.finish, mapData.start, gameState, getWallDistance]);

  // Smooth collision handler
  const handleSmoothCollision = useCallback(() => {
    if (mode === 'ai' && isTraining) {
      const message = 'AI collision detected, retrying...';
      onCollisionMessage?.(message);
      setTimeout(() => {
        onCollisionMessage?.('');
      }, 2000);
      
      // Smoothly fade car back to safe position for AI training
      setCar(prevCar => ({
        ...prevCar,
        collisionOpacity: 0.3,
        isAnimating: true
      }));
      
      // Reset to safe position after brief animation
      setTimeout(() => {
        if (mapData.start) {
          setCar(prev => ({
            ...prev,
            x: mapData.start!.x * CELL_SIZE + CELL_SIZE / 2,
            y: mapData.start!.y * CELL_SIZE + CELL_SIZE / 2,
            speed: 0,
            angle: 0,
            collisionOpacity: 1,
            isAnimating: false
          }));
          setGameState('playing');
          episodeRewardRef.current = 0;
          episodeStepsRef.current = 0;
        }
      }, 300);
    } else {
      // For manual mode, keep traditional crash state
      setGameState('crashed');
    }
  }, [mode, isTraining, mapData.start, onCollisionMessage]);

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
        // Handle AI training with smooth collision
        if (mode === 'ai' && agentRef.current && isTraining) {
          const newState = getGameState({ ...prevCar, x: newX, y: newY });
          newState.crashed = true;
          
          if (prevStateRef.current) {
            const reward = agentRef.current.calculateReward(prevStateRef.current, newState, currentAction);
            agentRef.current.remember(prevStateRef.current, currentAction, reward, newState, true);
            episodeRewardRef.current += reward;
            agentRef.current.replay();
          }
          
          // Update episode stats
          episodeCountRef.current++;
          setCurrentEpisode(episodeCountRef.current);
          setTotalAttempts(prev => prev + 1);
          onTrainingStats({
            episode: episodeCountRef.current,
            totalReward: episodeRewardRef.current,
            episodeLength: episodeStepsRef.current,
            averageReward: episodeRewardRef.current / Math.max(episodeStepsRef.current, 1)
          });
        }
        
        // Play crash sound
        if (soundEnabled && mode === 'manual') {
          audioEngine.playBriefCrash();
        }
        
        // Use smooth collision handler
        handleSmoothCollision();
        
        // Reset current run path
        setCurrentRunPath([]);
        
        return { ...prevCar, speed: 0 };
      }

      // Check if reached finish
      if (checkFinish(newX, newY)) {
        setGameState('finished');
        
        // Play finish sound
        if (soundEnabled && mode === 'manual') {
          audioEngine.playFinish();
        }
        
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
          
          // Save best run for ghost trail
          if (episodeRewardRef.current > bestRunReward) {
            setBestRunReward(episodeRewardRef.current);
            setBestRunPath([...currentRunPath, { x: newX, y: newY }]);
          }
          
          // Reset for next episode
          setTimeout(() => {
            episodeCountRef.current++;
            setCurrentEpisode(episodeCountRef.current);
            setTotalAttempts(prev => prev + 1);
            setSuccessfulRuns(prev => prev + 1);
            setCurrentRunPath([]); // Reset current path
            onTrainingStats({
              episode: episodeCountRef.current,
              totalReward: episodeRewardRef.current,
              episodeLength: episodeStepsRef.current,
              averageReward: episodeRewardRef.current / Math.max(episodeStepsRef.current, 1)
            });
            agentRef.current?.save();
          }, 100);
        }
        
        // Clear trail when game finishes
        return { ...prevCar, x: newX, y: newY, speed: 0, trail: [] };
      }

      // Create trail for manual mode when showGhostTrail is enabled
      let newTrail = prevCar.trail || [];
      if (showGhostTrail && mode === 'manual' && Math.abs(newSpeed) > 0.1) {
        // Add current position to trail
        newTrail = [...newTrail, { x: newX, y: newY, opacity: 0.6 }];
        
        // Limit trail length and fade out older points
        if (newTrail.length > 50) {
          newTrail = newTrail.slice(-50);
        }
        
        // Fade out trail points over time
        newTrail = newTrail.map((point, index) => ({
          ...point,
          opacity: Math.max(0, (index / newTrail.length) * 0.6)
        }));
      }

      // Update engine sound based on speed and acceleration (manual mode only)
      if (mode === 'manual' && soundEnabled && engineStarted) {
        const isAccelerating = keys.up;
        audioEngine.updateEngine(newSpeed, isAccelerating);
      }
      
      const newState = {
        ...prevCar,
        x: newX,
        y: newY,
        angle: newAngle,
        speed: newSpeed,
        lastSafeX: newX,
        lastSafeY: newY,
        trail: newTrail
      };
      
      // Track path for ghost trail
      if (mode === 'ai' && isTraining) {
        setCurrentRunPath(prev => [...prev, { x: newX, y: newY }]);
      }
      
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
  }, [keys, gameState, checkCollision, checkFinish, mode, isTraining, currentAction, getGameState, applyAction, handleSmoothCollision, currentRunPath, bestRunReward, onTrainingStats, showGhostTrail]);

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
            ctx.fillStyle = isDark ? '#374151' : '#4b5563';
            break;
          case ROAD:
            ctx.fillStyle = isDark ? '#1f2937' : '#f3f4f6';
            break;
          case START:
            ctx.fillStyle = isDark ? '#059669' : '#10b981';
            break;
          case FINISH:
            ctx.fillStyle = isDark ? '#dc2626' : '#ef4444';
            break;
          default:
            ctx.fillStyle = isDark ? '#374151' : '#4b5563';
        }

        ctx.fillRect(pixelX, pixelY, CELL_SIZE, CELL_SIZE);
        
        // Grid lines with dark mode support
        ctx.strokeStyle = isDark ? '#4b5563' : '#6b7280';
        ctx.lineWidth = 0.3;
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

    // Draw ghost trail if enabled - with car skin color support
    if (showGhostTrail && bestRunPath.length > 1) {
      let trailColor = 'rgba(59, 130, 246, 0.3)'; // Default blue
      
      // Use car skin color for trail if available
      if (mode === 'manual' && car.skin && CAR_SKINS[car.skin as keyof typeof CAR_SKINS]) {
        const skinData = CAR_SKINS[car.skin as keyof typeof CAR_SKINS];
        // Extract RGB from hex and add alpha
        const hex = skinData.color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        trailColor = `rgba(${r}, ${g}, ${b}, 0.4)`;
      }
      
      ctx.strokeStyle = trailColor;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bestRunPath[0].x, bestRunPath[0].y);
      for (let i = 1; i < bestRunPath.length; i++) {
        ctx.lineTo(bestRunPath[i].x, bestRunPath[i].y);
      }
      ctx.stroke();
    }

    // Draw real-time car trail if showGhostTrail is enabled
    if (showGhostTrail && car.trail && car.trail.length > 1) {
      let trailColor = 'rgba(59, 130, 246, 0.2)'; // Default blue
      
      // Use car skin color for real-time trail if available
      if (mode === 'manual' && car.skin && CAR_SKINS[car.skin as keyof typeof CAR_SKINS]) {
        const skinData = CAR_SKINS[car.skin as keyof typeof CAR_SKINS];
        const hex = skinData.color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        trailColor = `rgba(${r}, ${g}, ${b}, 0.3)`;
      }
      
      for (let i = 0; i < car.trail.length - 1; i++) {
        const point = car.trail[i];
        ctx.strokeStyle = `rgba(${trailColor.match(/\d+/g)![0]}, ${trailColor.match(/\d+/g)![1]}, ${trailColor.match(/\d+/g)![2]}, ${point.opacity})`;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 1, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Draw car with enhanced visuals
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    
    // Apply collision opacity for smooth feedback
    ctx.globalAlpha = car.collisionOpacity || 1;
    
    // Add AI glow effect
    if (mode === 'ai' && gameState === 'playing') {
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 15;
    }
    
    // Add shake animation for collisions
    if (car.isAnimating && mode !== 'ai') {
      const shakeIntensity = 2;
      ctx.translate(
        (Math.random() - 0.5) * shakeIntensity,
        (Math.random() - 0.5) * shakeIntensity
      );
    }

    // Car body (triangle pointing forward) with skin support
    let carColor = '#3b82f6'; // Default blue fallback
    let glowColor = '#3b82f6';
    
    if (gameState === 'crashed' && mode !== 'ai') {
      carColor = '#ef4444'; // Red for crashed (manual mode only)
      glowColor = '#ef4444';
    } else if (mode === 'ai') {
      carColor = '#10b981'; // Green for AI
      glowColor = '#10b981';
    } else if (mode === 'manual' && car.skin && CAR_SKINS[car.skin as keyof typeof CAR_SKINS]) {
      // Use selected skin for manual mode
      const skinData = CAR_SKINS[car.skin as keyof typeof CAR_SKINS];
      carColor = skinData.color;
      glowColor = skinData.glow;
      
      // Add neon glow effect for manual mode
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 10;
    }
    
    ctx.fillStyle = carColor;
    ctx.beginPath();
    ctx.moveTo(CAR_SIZE/2, 0); // Front point
    ctx.lineTo(-CAR_SIZE/2, -CAR_SIZE/3); // Back left
    ctx.lineTo(-CAR_SIZE/2, CAR_SIZE/3); // Back right
    ctx.closePath();
    ctx.fill();

    // Car outline with skin-matching color
    if (mode === 'manual' && car.skin && CAR_SKINS[car.skin as keyof typeof CAR_SKINS]) {
      // Use a darker version of the skin color for outline
      ctx.strokeStyle = glowColor + '80'; // Add some transparency
      ctx.lineWidth = 2;
    } else {
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 2;
    }
    ctx.stroke();
    
    // Reset shadow
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    ctx.restore();
  }, [mapData, car, gameState, mode, showGhostTrail, bestRunPath, isDark]);

  // Update stats continuously during training
  useEffect(() => {
    if (isTraining && mode === 'ai' && agentRef.current) {
      const interval = setInterval(() => {
        onUpdateStats(
          currentEpisode,
          currentReward,
          totalAttempts,
          successfulRuns,
          trainingElapsed,
          agentRef.current?.getEpsilon() || 0,
          Action[currentAction] || 'NO_ACTION'
        );
      }, 500); // Update every 500ms
      
      return () => clearInterval(interval);
    }
  }, [isTraining, mode, currentEpisode, currentReward, totalAttempts, successfulRuns, trainingElapsed, currentAction, onUpdateStats]);

  // Game loop with fast mode support
  useEffect(() => {
    const gameLoop = () => {
      updateCar();
      
      // Skip visual rendering in fast mode to speed up training
      if (!fastMode || !isTraining) {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            drawGame(ctx);
          }
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
  }, [updateCar, drawGame, fastMode, isTraining]);

  const resetCar = () => {
    if (mapData.start) {
      setCar(prev => ({
        ...prev,
        x: mapData.start!.x * CELL_SIZE + CELL_SIZE / 2,
        y: mapData.start!.y * CELL_SIZE + CELL_SIZE / 2,
        speed: 0,
        angle: 0,
        trail: [] // Clear trail when resetting
      }));
      setGameState('playing');
      
      // Restart engine sound if manual mode
      if (mode === 'manual' && soundEnabled) {
        if (engineStarted) {
          audioEngine.stopEngine();
        }
        setTimeout(() => {
          audioEngine.startEngine();
          setEngineStarted(true);
        }, 100);
      }
    }
  };
  
  // Cleanup sounds on component unmount
  useEffect(() => {
    return () => {
      audioEngine.stopEngine();
    };
  }, []);
  
  // Handle sound enable/disable based on prop changes
  useEffect(() => {
    if (mode === 'manual') {
      if (soundEnabled && !engineStarted) {
        audioEngine.startEngine();
        setEngineStarted(true);
      } else if (!soundEnabled && engineStarted) {
        audioEngine.stopEngine();
        setEngineStarted(false);
      }
    }
  }, [soundEnabled, mode, engineStarted]);

  // Removed unused formatTrainingTime function

  return (
    <div className="flex flex-col items-center p-8 transition-colors duration-300">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-4xl transition-colors duration-300">
        <div className="text-center mb-6">
          <h1 className={`text-4xl font-bold mb-2 transition-colors duration-300 ${
            mode === 'ai' 
              ? 'text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-emerald-600 dark:from-green-400 dark:to-emerald-400' 
              : 'text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-400 dark:to-purple-400'
          }`}>
            {mode === 'ai' ? '🤖 AI Racing' : '🏎️ Manual Racing'}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 transition-colors duration-300">
            {mode === 'ai' ? 'Watch the AI learn to navigate the track!' : 'Control the car with arrow keys'}
          </p>
        </div>
      
        {/* Game status - fixed height to prevent layout shift */}
        <div className="mb-4 text-center h-16 flex items-center justify-center">
        {gameState === 'finished' && (
          <div className="text-green-600 dark:text-green-400 text-xl font-bold transition-colors duration-300">
            🏁 FINISHED! 🏁
          </div>
        )}
        {gameState === 'crashed' && mode === 'manual' && (
          <div className="text-red-600 dark:text-red-400 text-xl font-bold transition-colors duration-300">
            💥 CRASHED! 💥
          </div>
        )}
        {gameState === 'playing' && mapData.start && (
          <div className={`text-lg font-medium transition-colors duration-300 ${
            mode === 'ai' ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'
          }`}>
            {mode === 'ai' ? '🤖 AI Racing...' : '🏎️ Racing...'}
          </div>
        )}
        {!mapData.start && (
          <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-xl p-4 text-center transition-colors duration-300">
            <div className="text-yellow-700 dark:text-yellow-400 font-semibold">
              ⚠️ No start position set in editor
            </div>
            <div className="text-yellow-600 dark:text-yellow-500 text-sm mt-1">
              Please set a start position in the track editor first
            </div>
          </div>
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

        {/* Game canvas with overlay */}
        <div className="relative">
          <div className="rounded-2xl shadow-2xl border-2 border-gray-300 dark:border-gray-600 max-w-4xl max-h-96 overflow-auto bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
            <div className="p-4">
              <div className="text-center mb-2">
                <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                  🎮 EXPANDED RACING AREA • Scroll to navigate
                </div>
              </div>
              <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="block focus:outline-none border border-gray-300 dark:border-gray-600 rounded-lg"
                tabIndex={0}
              />
            </div>
          </div>
          
          {/* Subtle visual feedback - no sudden overlays */}
          
          {/* Fast Mode Indicator */}
          {fastMode && isTraining && (
            <div className="absolute top-4 right-4 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium animate-pulse">
              🚀 FAST MODE
            </div>
          )}
        </div>

        {/* Speed and Control Info with dark mode */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 text-center transition-colors duration-300">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 transition-colors duration-300">
              {Math.abs(car.speed).toFixed(1)}
            </div>
            <div className="text-sm text-blue-700 dark:text-blue-300 transition-colors duration-300">Speed</div>
            <div className="w-full h-2 bg-blue-200 dark:bg-blue-800/30 rounded-full mt-2 transition-colors duration-300">
              <div 
                className="h-full bg-gradient-to-r from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((Math.abs(car.speed) / MAX_SPEED) * 100, 100)}%` }}
              />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4 text-center transition-colors duration-300">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 transition-colors duration-300">
              {(car.angle * 180 / Math.PI).toFixed(0)}°
            </div>
            <div className="text-sm text-purple-700 dark:text-purple-300 transition-colors duration-300">Angle</div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4 text-center transition-colors duration-300">
            <div className="text-sm text-green-700 dark:text-green-300 mb-1 transition-colors duration-300">Controls</div>
            <div className="text-xs text-green-600 dark:text-green-400 transition-colors duration-300">
              {mode === 'manual' ? 'Arrow Keys' : 'AI Controlled'}
            </div>
          </div>
        </div>
        
        {/* Reset button with dark mode styling */}
        {(gameState === 'crashed' || gameState === 'finished') && (
          <div className="mt-6 text-center">
            <button
              onClick={resetCar}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800 transform hover:scale-105 transition-all duration-300 shadow-lg"
            >
              🔄 Reset Car
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Game;
