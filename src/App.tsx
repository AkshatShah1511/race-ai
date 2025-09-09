import React, { useState } from 'react';
import Editor, { MapData } from './components/Editor';
import Game from './components/Game';
import TrainingStats from './components/TrainingStats';
import { TrainingStats as StatsType } from './ai/agent';

type Mode = 'editor' | 'manual' | 'ai-training';

function App() {
  const [mode, setMode] = useState<Mode>('editor');
  const [isTraining, setIsTraining] = useState(false);
  const [trainingStats, setTrainingStats] = useState<StatsType[]>([]);
  const [fastMode, setFastMode] = useState(false);
  const [currentEpisode, setCurrentEpisode] = useState(0);
  const [currentReward, setCurrentReward] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [successfulRuns, setSuccessfulRuns] = useState(0);
  const [trainingElapsed, setTrainingElapsed] = useState(0);
  const [epsilon, setEpsilon] = useState(1.0);
  const [currentAction, setCurrentAction] = useState('NO_ACTION');
  const [showGhostTrail, setShowGhostTrail] = useState(false);
  const [collisionMessage, setCollisionMessage] = useState('');
  const [mapData, setMapData] = useState<MapData>({
    grid: Array(30).fill(null).map(() => Array(40).fill(0)),
    start: null,
    finish: null
  });

  const handleMapChange = (newMapData: MapData) => {
    setMapData(newMapData);
  };

  const handleTrainingStats = (stats: StatsType) => {
    setTrainingStats(prev => {
      const newStats = [...prev, stats];
      return newStats.slice(-100); // Keep last 100 episodes
    });
    setCurrentEpisode(stats.episode);
    setCurrentReward(stats.totalReward);
  };

  const startTraining = () => {
    setMode('ai-training');
    setIsTraining(true);
    setTrainingStats([]);
    setCurrentEpisode(0);
    setCurrentReward(0);
    setTotalAttempts(0);
    setSuccessfulRuns(0);
  };

  const stopTraining = () => {
    setIsTraining(false);
    setMode('editor');
  };

  const updateTrainingStats = (
    episode: number,
    reward: number,
    attempts: number,
    successes: number,
    elapsed: number,
    epsilonValue: number,
    action: string
  ) => {
    setCurrentEpisode(episode);
    setCurrentReward(reward);
    setTotalAttempts(attempts);
    setSuccessfulRuns(successes);
    setTrainingElapsed(elapsed);
    setEpsilon(epsilonValue);
    setCurrentAction(action);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Modern Navigation Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Race AI 🏎️
              </div>
              <div className="text-sm text-gray-500 font-medium">
                Reinforcement Learning Racing
              </div>
            </div>
            
            <nav className="flex items-center space-x-2">
              <button
                onClick={() => { setMode('editor'); setIsTraining(false); }}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  mode === 'editor'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-105'
                    : 'bg-white/50 text-gray-700 hover:bg-white/80 hover:shadow-md'
                }`}
              >
                📝 Editor Mode
              </button>
              
              <button
                onClick={() => { setMode('manual'); setIsTraining(false); }}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  mode === 'manual'
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg transform scale-105'
                    : 'bg-white/50 text-gray-700 hover:bg-white/80 hover:shadow-md'
                }`}
              >
                🏎️ Manual Play
              </button>
              
              {!isTraining ? (
                <button
                  onClick={startTraining}
                  className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 shadow-lg transform hover:scale-105 transition-all duration-300"
                >
                  🤖 AI Training
                </button>
              ) : (
                <button
                  onClick={stopTraining}
                  className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-lg transform hover:scale-105 transition-all duration-300"
                >
                  ⏹️ Stop Training
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {mode === 'editor' && (
          <div className="container mx-auto px-6 py-8">
            <Editor onMapChange={handleMapChange} />
          </div>
        )}
        
        {mode === 'manual' && (
          <div className="container mx-auto px-6 py-8">
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-1">
                <Game 
                  mapData={mapData} 
                  mode="manual"
                  isTraining={false}
                  fastMode={false}
                  onTrainingStats={handleTrainingStats}
                  onUpdateStats={updateTrainingStats}
                />
              </div>
            </div>
          </div>
        )}
        
        {mode === 'ai-training' && (
          <div className="container mx-auto px-6 py-8">
            <div className="flex flex-col xl:flex-row gap-8">
              <div className="flex-1">
                <Game 
                  mapData={mapData} 
                  mode="ai"
                  isTraining={isTraining}
                  fastMode={fastMode}
                  onTrainingStats={handleTrainingStats}
                  onUpdateStats={updateTrainingStats}
                  showGhostTrail={showGhostTrail}
                  onCollisionMessage={setCollisionMessage}
                />
              </div>
              <div className="xl:w-96">
                <TrainingStats
                  stats={trainingStats}
                  isTraining={isTraining}
                  currentEpisode={currentEpisode}
                  currentReward={currentReward}
                  totalAttempts={totalAttempts}
                  successfulRuns={successfulRuns}
                  trainingElapsed={trainingElapsed}
                  epsilon={epsilon}
                  currentAction={currentAction}
                  fastMode={fastMode}
                  onToggleFastMode={() => setFastMode(!fastMode)}
                  showGhostTrail={showGhostTrail}
                  onToggleGhostTrail={() => setShowGhostTrail(!showGhostTrail)}
                  collisionMessage={collisionMessage}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modern Footer */}
      <footer className="bg-gradient-to-r from-gray-800 to-gray-900 text-white text-center py-6 mt-12">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-sm opacity-90">
            🏎️ Race AI - Enhanced UI & Advanced Reinforcement Learning | Built with React, TypeScript & TensorFlow.js
          </p>
          <p className="text-xs opacity-70 mt-2">
            Featuring modern UI, intelligent AI training, and real-time performance analytics
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
