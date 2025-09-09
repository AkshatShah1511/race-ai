import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrainingStats } from '../ai/agent';

interface TrainingChartProps {
  stats: TrainingStats[];
  isTraining: boolean;
}

const TrainingChart: React.FC<TrainingChartProps> = ({ stats, isTraining }) => {
  if (stats.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Training Progress</h3>
        <div className="text-gray-500 text-center py-8">
          No training data yet
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 w-full max-w-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Training Progress</h3>
        {isTraining && (
          <div className="flex items-center text-sm text-blue-600">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse mr-2"></div>
            Training...
          </div>
        )}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
        <div className="bg-gray-50 rounded p-2">
          <div className="text-gray-600">Episodes</div>
          <div className="font-semibold text-lg">{stats.length}</div>
        </div>
        <div className="bg-gray-50 rounded p-2">
          <div className="text-gray-600">Avg Reward</div>
          <div className="font-semibold text-lg">
            {stats.length > 0 ? stats[stats.length - 1].averageReward.toFixed(1) : 0}
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={stats}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="episode" 
            type="number"
            scale="linear"
            domain={['dataMin', 'dataMax']}
          />
          <YAxis />
          <Tooltip 
            formatter={(value, name) => [
              typeof value === 'number' ? value.toFixed(1) : value, 
              name === 'averageReward' ? 'Avg Reward' : 'Total Reward'
            ]}
          />
          <Line 
            type="monotone" 
            dataKey="averageReward" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={false}
            name="averageReward"
          />
          <Line 
            type="monotone" 
            dataKey="totalReward" 
            stroke="#ef4444" 
            strokeWidth={1}
            dot={false}
            opacity={0.6}
            name="totalReward"
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="text-xs text-gray-500 mt-2">
        Blue: Average Reward | Red: Episode Reward
      </div>
    </div>
  );
};

export default TrainingChart;
