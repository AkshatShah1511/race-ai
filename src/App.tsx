import React, { useState } from 'react';
import Editor, { MapData } from './components/Editor';
import Game from './components/Game';
import MultiCarGame from './components/MultiCarGame';
import TrainingChart from './components/TrainingChart';
import Leaderboard from './components/Leaderboard';
import { TrainingStats } from './ai/agent';
import { RaceMode, CarCount, RaceStats } from './types/racing';

type Mode = 'editor' | 'single-car' | 'multi-car' | 'leaderboard';
type GameMode = 'manual' | 'ai';

function App() {
  const [mode, setMode] = useState<Mode>('editor');
  const [gameMode, setGameMode] = useState<GameMode>('manual');
  const [raceMode, setRaceMode] = useState<RaceMode>('user-vs-ai');
  const [carCount, setCarCount] = useState<CarCount>(2);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingStats, setTrainingStats] = useState<TrainingStats[]>([]);
  const [raceStats, setRaceStats] = useState<RaceStats[]>([]);
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
    setMode('single-car');
    setIsTraining(true);
    setTrainingStats([]);
  };

  const stopTraining = () => {
    setIsTraining(false);
  };

  const handleRaceComplete = (stats: RaceStats[]) => {
    setRaceStats(prev => [...prev, ...stats]);
  };

  const clearLeaderboard = () => {
    setRaceStats([]);
  };

  const startMultiCarRace = (mode: RaceMode, cars: CarCount) => {
    setRaceMode(mode);
    setCarCount(cars);
    setMode('multi-car');
    setIsTraining(false);
  };

  const startMultiCarTraining = (mode: RaceMode, cars: CarCount) => {
    setRaceMode(mode);
    setCarCount(cars);
    setMode('multi-car');
    setIsTraining(true);
    setTrainingStats([]);
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
                onClick={() => { setMode('single-car'); setGameMode('manual'); setIsTraining(false); }}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  mode === 'single-car' && gameMode === 'manual'
                    ? 'bg-green-500 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                🏎️ Manual (1 Car)
              </button>
              <button
                onClick={() => { setMode('single-car'); setGameMode('ai'); setIsTraining(false); }}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  mode === 'single-car' && gameMode === 'ai' && !isTraining
                    ? 'bg-purple-500 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                🤖 AI Play (1 Car)
              </button>
              <div className="w-px h-8 bg-gray-300 mx-1" />
              <button
                onClick={() => startMultiCarRace('user-vs-ai', 2)}
                className="px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-indigo-500 text-white hover:bg-indigo-600"
              >
                🧑‍🤝‍🧑 User vs AI (2 cars)
              </button>
              <button
                onClick={() => startMultiCarRace('ai-vs-ai', 3)}
                className="px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-indigo-500 text-white hover:bg-indigo-600"
              >
                🤖 vs 🤖 (3 cars)
              </button>
              <button
                onClick={() => startMultiCarRace('ai-vs-ai', 4)}
                className="px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-indigo-500 text-white hover:bg-indigo-600"
              >
                🤖 vs 🤖 (4 cars)
              </button>
              <button
                onClick={() => startMultiCarTraining('ai-vs-ai', 3)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  isTraining ? 'bg-red-500 text-white' : 'bg-orange-500 text-white hover:bg-orange-600'
                }`}
              >
                {isTraining ? '⏹️ Stop Training' : '🎯 Train (AI vs AI)'}
              </button>
              <div className="w-px h-8 bg-gray-300 mx-1" />
              <button
                onClick={() => setMode('leaderboard')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  mode === 'leaderboard' ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                🏆 Leaderboard
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {mode === 'editor' && (
          <Editor onMapChange={handleMapChange} />
        )}
        
        {mode === 'single-car' && (
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
        
        {mode === 'multi-car' && (
          <div className="flex flex-col xl:flex-row gap-6 p-6">
            <div className="flex-1">
              <MultiCarGame
                mapData={mapData}
                raceMode={raceMode}
                carCount={carCount}
                isTraining={isTraining}
                onTrainingStats={handleTrainingStats}
                onRaceComplete={handleRaceComplete}
              />
            </div>
            {(isTraining || trainingStats.length > 0) && (
              <div className="xl:w-96">
                <TrainingChart stats={trainingStats} isTraining={isTraining} />
              </div>
            )}
          </div>
        )}
        
        {mode === 'leaderboard' && (
          <div className="flex justify-center p-6">
            <Leaderboard 
              raceStats={raceStats}
              onClearLeaderboard={clearLeaderboard}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white text-center py-4 mt-8">
        <p className="text-sm">
          Race AI - Stage 3: Multi-Car Racing, Advanced AI & Leaderboards | Built with React, TypeScript & TensorFlow.js
        </p>
      </footer>
    </div>
  );
}

export default App;
