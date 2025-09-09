import React, { useState } from 'react';
import Editor, { MapData } from './components/Editor';
import Game from './components/Game';
import TrainingChart from './components/TrainingChart';
import { TrainingStats } from './ai/agent';

type Mode = 'editor' | 'game';
type GameMode = 'manual' | 'ai';

function App() {
  const [mode, setMode] = useState<Mode>('editor');
  const [gameMode, setGameMode] = useState<GameMode>('manual');
  const [isTraining, setIsTraining] = useState(false);
  const [trainingStats, setTrainingStats] = useState<TrainingStats[]>([]);
  const [mapData, setMapData] = useState<MapData>({
    grid: Array(30).fill(null).map(() => Array(40).fill(0)),
    start: null,
    finish: null
  });

  const handleMapChange = (newMapData: MapData) => {
    setMapData(newMapData);
  };

  const handleTrainingStats = (stats: TrainingStats) => {
    setTrainingStats(prev => {
      const newStats = [...prev, stats];
      // Keep only the last 100 episodes for performance
      return newStats.slice(-100);
    });
  };

  const startTraining = () => {
    setGameMode('ai');
    setMode('game');
    setIsTraining(true);
    setTrainingStats([]);
  };

  const stopTraining = () => {
    setIsTraining(false);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation Header */}
      <header className="bg-white shadow-md border-b-2 border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">Race AI 🏎️</h1>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setMode('editor')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  mode === 'editor'
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                📝 Editor
              </button>
              <button
                onClick={() => { setMode('game'); setGameMode('manual'); }}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  mode === 'game' && gameMode === 'manual'
                    ? 'bg-green-500 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                🏎️ Manual
              </button>
              <button
                onClick={() => { setMode('game'); setGameMode('ai'); setIsTraining(false); }}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  mode === 'game' && gameMode === 'ai' && !isTraining
                    ? 'bg-purple-500 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                🤖 AI Play
              </button>
              <button
                onClick={isTraining ? stopTraining : startTraining}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  isTraining
                    ? 'bg-red-500 text-white shadow-lg'
                    : 'bg-orange-500 text-white hover:bg-orange-600'
                }`}
              >
                {isTraining ? '⏹️ Stop' : '🎯 Train AI'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {mode === 'editor' ? (
          <Editor onMapChange={handleMapChange} />
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 p-6">
            <div className="flex-1">
              <Game 
                mapData={mapData} 
                mode={gameMode}
                isTraining={isTraining}
                onTrainingStats={handleTrainingStats}
              />
            </div>
            {(gameMode === 'ai' || trainingStats.length > 0) && (
              <div className="lg:w-96">
                <TrainingChart stats={trainingStats} isTraining={isTraining} />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white text-center py-4 mt-8">
        <p className="text-sm">
          Race AI - Stage 2: AI Driver with Reinforcement Learning | Built with React, TypeScript & TensorFlow.js
        </p>
      </footer>
    </div>
  );
}

export default App;
