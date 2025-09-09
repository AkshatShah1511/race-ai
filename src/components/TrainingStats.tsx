import React from 'react';
import { TrainingStats as StatsType } from '../ai/agent';

interface TrainingStatsProps {
  stats: StatsType[];
  isTraining: boolean;
  currentEpisode: number;
  currentReward: number;
  totalAttempts: number;
  successfulRuns: number;
  trainingElapsed: number;
  epsilon: number;
  currentAction: string;
  fastMode: boolean;
  onToggleFastMode: () => void;
  showGhostTrail?: boolean;
  onToggleGhostTrail?: () => void;
  collisionMessage?: string;
}

const TrainingStats: React.FC<TrainingStatsProps> = ({
  stats,
  isTraining,
  currentEpisode,
  currentReward,
  totalAttempts,
  successfulRuns,
  trainingElapsed,
  epsilon,
  currentAction,
  fastMode,
  onToggleFastMode,
  showGhostTrail = false,
  onToggleGhostTrail,
  collisionMessage,
}) => {
  const formatTrainingTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const averageReward = stats.length > 0 
    ? stats.reduce((sum, stat) => sum + stat.totalReward, 0) / stats.length 
    : 0;

  const recentAverage = stats.length >= 10 
    ? stats.slice(-10).reduce((sum, stat) => sum + stat.totalReward, 0) / 10 
    : averageReward;

  const successRate = totalAttempts > 0 ? (successfulRuns / totalAttempts) * 100 : 0;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-800 flex items-center">
          🤖 AI Training
        </h3>
        {isTraining && (
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-600 font-medium">ACTIVE</span>
          </div>
        )}
      </div>

      {/* Timer */}
      {isTraining && (
        <div className="text-center mb-6">
          <div className="text-3xl font-mono font-bold text-blue-600 mb-1">
            {formatTrainingTime(trainingElapsed)}
          </div>
          <div className="text-sm text-gray-500">Training Duration</div>
        </div>
      )}

      {/* Key Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{currentEpisode}</div>
          <div className="text-xs text-blue-700">Episode</div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-600">{totalAttempts}</div>
          <div className="text-xs text-green-700">Attempts</div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-purple-600">{successfulRuns}</div>
          <div className="text-xs text-purple-700">Finished</div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-orange-600">{successRate.toFixed(1)}%</div>
          <div className="text-xs text-orange-700">Success</div>
        </div>
      </div>

      {/* Reward Information */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-medium text-gray-700">Current Reward</span>
          <span className="text-lg font-bold text-indigo-600">{currentReward.toFixed(1)}</span>
        </div>
        
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-medium text-gray-700">Average Reward</span>
          <span className="text-lg font-bold text-green-600">{averageReward.toFixed(1)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">Recent Average</span>
          <span className="text-lg font-bold text-blue-600">{recentAverage.toFixed(1)}</span>
        </div>
      </div>

      {/* Learning Progress */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Exploration Rate</span>
          <span className="text-sm text-gray-600">{(epsilon * 100).toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-red-400 to-green-400 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.max(5, epsilon * 100)}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Exploit</span>
          <span>Explore</span>
        </div>
      </div>

      {/* Collision Message */}
      {collisionMessage && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="text-center text-sm text-orange-700">
            {collisionMessage}
          </div>
        </div>
      )}

      {/* Current Action */}
      {isTraining && (
        <div className="mb-6 p-3 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">Current Action</div>
            <div className="text-lg font-semibold text-gray-800">{currentAction}</div>
          </div>
        </div>
      )}

      {/* Fast Mode Toggle */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">🚀 Fast Mode</span>
          <span className="text-xs text-gray-500">(Skip visuals)</span>
        </div>
        <button
          onClick={onToggleFastMode}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            fastMode ? 'bg-orange-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              fastMode ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Ghost Trail Toggle */}
      {onToggleGhostTrail && (
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">👻 Ghost Trail</span>
            <span className="text-xs text-gray-500">(Show best run)</span>
          </div>
          <button
            onClick={onToggleGhostTrail}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              showGhostTrail ? 'bg-purple-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                showGhostTrail ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      )}

      {/* Performance Chart Mini View */}
      {stats.length > 0 && (
        <div className="mt-6">
          <div className="text-sm font-medium text-gray-700 mb-2">Recent Performance</div>
          <div className="flex items-end space-x-1 h-16">
            {stats.slice(-20).map((stat, index) => {
              const height = Math.max(4, Math.min(64, (stat.totalReward + 50) * 0.4));
              return (
                <div
                  key={index}
                  className="bg-gradient-to-t from-blue-400 to-blue-600 rounded-sm flex-1 transition-all duration-200"
                  style={{ height: `${height}px` }}
                ></div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainingStats;
