export interface Car {
  id: string;
  name: string;
  x: number;
  y: number;
  angle: number;
  speed: number;
  velocity: { x: number; y: number };
  acceleration: number;
  width: number;
  height: number;
  color: string;
  isAI: boolean;
  isPlayer: boolean;
  lapTimes: number[];
  currentLapStartTime: number;
  position: number; // Race position (1st, 2nd, etc.)
  checkpoints: boolean[]; // Track progress through checkpoints
  finished: boolean;
  crashed: boolean;
}

export interface RaceStats {
  carId: string;
  carName: string;
  lapTime: number;
  position: number;
  timestamp: number;
}

export interface LeaderboardEntry {
  carName: string;
  bestLapTime: number;
  totalRaces: number;
  wins: number;
  averageLapTime: number;
  lastRaceDate: string;
}

export interface RaceState {
  cars: Car[];
  raceStartTime: number;
  raceFinished: boolean;
  winner: Car | null;
  leaderboard: LeaderboardEntry[];
}

export interface CollisionInfo {
  hasCollision: boolean;
  collisionType: 'wall' | 'car' | null;
  collidedWith?: Car;
}

export type RaceMode = 'user-vs-ai' | 'ai-vs-ai' | 'time-trial';
export type CarCount = 2 | 3 | 4;

export const CAR_COLORS = [
  '#3b82f6', // Blue - Player
  '#ef4444', // Red - AI 1
  '#10b981', // Green - AI 2
  '#f59e0b', // Orange - AI 3
];

export const CAR_NAMES = [
  'Player',
  'AI Racer',
  'Speed Demon',
  'Track Master',
];
