import React from 'react';
import { TrainingStats as StatsType } from '../ai/agent';
import { useTheme } from '../contexts/ThemeContext';

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
  const { isDark } = useTheme();
  
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
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-md transition-colors duration-300 sticky top-0">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center transition-colors duration-300">
          🤖 AI Training
        </h3>
        {isTraining && (
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 dark:bg-green-400 rounded-full animate-pulse transition-colors duration-300"></div>
            <span className="text-sm text-green-600 dark:text-green-400 font-medium transition-colors duration-300">ACTIVE</span>
          </div>
        )}
      </div>

      {/* Timer with dark mode */}
      {isTraining && (
        <div className="text-center mb-6">
          <div className="text-3xl font-mono font-bold text-blue-600 dark:text-blue-400 mb-1 transition-colors duration-300">
            {formatTrainingTime(trainingElapsed)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300">Training Duration</div>
        </div>
      )}

      {/* Key Stats Grid with dark mode */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-3 text-center transition-colors duration-300">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 transition-colors duration-300">{currentEpisode}</div>
          <div className="text-xs text-blue-700 dark:text-blue-300 transition-colors duration-300">Episode</div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-3 text-center transition-colors duration-300">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400 transition-colors duration-300">{totalAttempts}</div>
          <div className="text-xs text-green-700 dark:text-green-300 transition-colors duration-300">Attempts</div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-3 text-center transition-colors duration-300">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 transition-colors duration-300">{successfulRuns}</div>
          <div className="text-xs text-purple-700 dark:text-purple-300 transition-colors duration-300">Finished</div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-3 text-center transition-colors duration-300">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 transition-colors duration-300">{successRate.toFixed(1)}%</div>
          <div className="text-xs text-orange-700 dark:text-orange-300 transition-colors duration-300">Success</div>
        </div>
      </div>

      {/* Reward Information with dark mode */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-300">Current Reward</span>
          <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400 transition-colors duration-300">{currentReward.toFixed(1)}</span>
        </div>
        
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-300">Average Reward</span>
          <span className="text-lg font-bold text-green-600 dark:text-green-400 transition-colors duration-300">{averageReward.toFixed(1)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-300">Recent Average</span>
          <span className="text-lg font-bold text-blue-600 dark:text-blue-400 transition-colors duration-300">{recentAverage.toFixed(1)}</span>
        </div>
      </div>

      {/* Learning Progress with dark mode */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-300">Exploration Rate</span>
          <span className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">{(epsilon * 100).toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 transition-colors duration-300">
          <div 
            className="bg-gradient-to-r from-red-400 to-green-400 dark:from-red-500 dark:to-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.max(5, epsilon * 100)}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1 transition-colors duration-300">
          <span>Exploit</span>
          <span>Explore</span>
        </div>
      </div>

      {/* Fixed height collision message area to prevent layout shift */}
      <div className="mb-4 h-12 flex items-center justify-center">
        {collisionMessage && (
          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg transition-colors duration-300">
            <div className="text-center text-sm text-orange-700 dark:text-orange-300 transition-colors duration-300">
              {collisionMessage}
            </div>
          </div>
        )}
      </div>

      {/* Current Action with dark mode */}
      {isTraining && (
        <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg transition-colors duration-300">
          <div className="text-center">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1 transition-colors duration-300">Current Action</div>
            <div className="text-lg font-semibold text-gray-800 dark:text-gray-200 transition-colors duration-300">{currentAction}</div>
          </div>
        </div>
      )}

      {/* Fast Mode Toggle with dark mode */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg mb-3 transition-colors duration-300">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-300">🚀 Fast Mode</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300">(Skip visuals)</span>
        </div>
        <button
          onClick={onToggleFastMode}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            fastMode ? 'bg-orange-600 dark:bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              fastMode ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Ghost Trail Toggle with dark mode */}
      {onToggleGhostTrail && (
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg transition-colors duration-300">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-300">👻 Ghost Trail</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300">(Show best run)</span>
          </div>
          <button
            onClick={onToggleGhostTrail}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              showGhostTrail ? 'bg-purple-600 dark:bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'
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

      {/* Performance Chart Mini View with dark mode */}
      {stats.length > 0 && (
        <div className="mt-6">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-300">Recent Performance</div>
          <div className="flex items-end space-x-1 h-16">
            {stats.slice(-20).map((stat, index) => {
              const height = Math.max(4, Math.min(64, (stat.totalReward + 50) * 0.4));
              return (
                <div
                  key={index}
                  className="bg-gradient-to-t from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700 rounded-sm flex-1 transition-all duration-300"
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
