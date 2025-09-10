import React, { useState } from 'react';
import Editor, { MapData } from './components/Editor';
import Game from './components/Game';
import TrainingStats from './components/TrainingStats';
import ThemeToggle from './components/ThemeToggle';
import { TrainingStats as StatsType } from './ai/agent';
import { ThemeProvider } from './contexts/ThemeContext';

type Mode = 'editor' | 'manual' | 'ai-training' | 'human-vs-ai';

function AppContent() {
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
  const [selectedCarSkin, setSelectedCarSkin] = useState('cyan');
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [rewardHistory] = useState<number[]>([]);
  const [isReplaying, setIsReplaying] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [mapData, setMapData] = useState<MapData>({
    grid: Array(30).fill(null).map(() => Array(40).fill(0)),
    start: null,
    finish: null,
    checkpoints: [],
    lapsRequired: 3
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 cyber-grid transition-colors duration-500">
      {/* Cyberpunk Navigation Header */}
      <header className="cyber-panel border-b neon-border-cyan backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-4xl font-bold neon-text-cyan font-[Audiowide] tracking-wider">
                NEON RACER 🏎️
              </div>
              <div className="text-sm neon-text-magenta font-[Orbitron] font-medium tracking-wide">
                AI • CYBERPUNK • RACING
              </div>
            </div>
            
            <nav className="flex items-center space-x-3">
              {/* Cyberpunk Theme Toggle */}
              <div className="mr-4">
                <ThemeToggle />
              </div>
              
              <button
                onClick={() => { setMode('editor'); setIsTraining(false); }}
                className={`cyber-button px-6 py-3 rounded-lg font-[Orbitron] font-bold transition-all duration-300 ${
                  mode === 'editor'
                    ? 'neon-glow-cyan scale-105 neon-text-cyan'
                    : 'hover:neon-glow-cyan'
                }`}
              >
                ⚙️ TRACK EDITOR
              </button>
              
              <button
                onClick={() => { setMode('manual'); setIsTraining(false); }}
                className={`cyber-button px-6 py-3 rounded-lg font-[Orbitron] font-bold transition-all duration-300 ${
                  mode === 'manual'
                    ? 'neon-glow-green scale-105 border-green-400 text-green-400'
                    : 'hover:neon-glow-green hover:border-green-400 hover:text-green-400'
                }`}
              >
                🏎️ MANUAL DRIVE
              </button>
              
              {!isTraining ? (
                <button
                  onClick={startTraining}
                  className="cyber-button px-6 py-3 rounded-lg font-[Orbitron] font-bold neon-glow-magenta border-pink-500 text-pink-400 hover:neon-glow-purple pulse-neon"
                >
                  🤖 AI NEURAL NET
                </button>
              ) : (
                <button
                  onClick={stopTraining}
                  className="cyber-button px-6 py-3 rounded-lg font-[Orbitron] font-bold neon-glow-red border-red-500 text-red-400 hover:scale-105"
                >
                  ⏹️ TERMINATE
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Cyberpunk Main Content */}
      <main className="flex-1 relative">
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-2 h-2 bg-cyan-400 rounded-full opacity-50 animate-pulse"></div>
          <div className="absolute top-32 right-20 w-1 h-1 bg-magenta-400 rounded-full opacity-60 animate-ping"></div>
          <div className="absolute bottom-20 left-1/4 w-1.5 h-1.5 bg-purple-400 rounded-full opacity-40 animate-bounce"></div>
        </div>
        
        {mode === 'editor' && (
          <div className="container mx-auto px-6 py-8 fade-in">
            <div className="cyber-panel rounded-2xl p-6 breathe">
              <h2 className="text-2xl font-[Audiowide] neon-text-cyan mb-6 text-center tracking-wide">
                ⚙️ NEURAL TRACK ARCHITECT
              </h2>
              <Editor onMapChange={handleMapChange} />
            </div>
          </div>
        )}
        
        {mode === 'manual' && (
          <div className="container mx-auto px-6 py-8 fade-in">
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-1">
                <Game 
                  mapData={mapData} 
                  mode="manual"
                  isTraining={false}
                  fastMode={false}
                  onTrainingStats={handleTrainingStats}
                  onUpdateStats={updateTrainingStats}
                  selectedCarSkin={selectedCarSkin}
                  showGhostTrail={showGhostTrail}
                  soundEnabled={soundEnabled}
                />
              </div>
              
              {/* Car Customization Panel */}
              <div className="w-full lg:w-80 space-y-6">
                <div className="cyber-panel rounded-2xl p-6 breathe">
                  <h3 className="text-xl font-[Audiowide] neon-text-cyan mb-4 text-center">
                    🎨 CAR CUSTOMIZATION
                  </h3>
                  
                  {/* Car Skin Selector */}
                  <div className="space-y-3">
                    <div className="text-sm font-[Orbitron] neon-text-purple mb-3 text-center">
                      SELECT NEON SKIN:
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: 'cyan', name: 'CYBER CYAN', color: '#00ffff' },
                        { key: 'magenta', name: 'NEON PINK', color: '#ff00ff' },
                        { key: 'lime', name: 'TOXIC GREEN', color: '#39ff14' },
                        { key: 'orange', name: 'FIRE ORANGE', color: '#ff8c00' },
                        { key: 'purple', name: 'VOID PURPLE', color: '#8a2be2' },
                        { key: 'pink', name: 'HOT PINK', color: '#ff1493' }
                      ].map(skin => (
                        <button
                          key={skin.key}
                          onClick={() => setSelectedCarSkin(skin.key)}
                          className={`cyber-button p-3 rounded-lg font-[Orbitron] font-bold text-xs transition-all duration-300 ${
                            selectedCarSkin === skin.key
                              ? 'scale-105 border-2'
                              : 'hover:scale-105'
                          }`}
                          style={{
                            borderColor: skin.color,
                            color: skin.color,
                            boxShadow: selectedCarSkin === skin.key 
                              ? `0 0 20px ${skin.color}40, 0 0 40px ${skin.color}20` 
                              : `0 0 10px ${skin.color}20`
                          }}
                        >
                          <div className="flex flex-col items-center space-y-1">
                            <div 
                              className="w-6 h-6 rounded-full" 
                              style={{ 
                                backgroundColor: skin.color,
                                boxShadow: `0 0 10px ${skin.color}80`
                              }}
                            ></div>
                            <div>{skin.name}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Visual Options Panel */}
                <div className="cyber-panel rounded-2xl p-6 breathe">
                  <h3 className="text-xl font-[Audiowide] neon-text-cyan mb-4 text-center">
                    👁️ VISUAL EFFECTS
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-[Orbitron] neon-text-purple">GHOST TRAIL</span>
                      <button
                        onClick={() => setShowGhostTrail(!showGhostTrail)}
                        className={`cyber-button px-4 py-2 rounded-lg font-[Orbitron] font-bold text-xs transition-all duration-300 ${
                          showGhostTrail
                            ? 'neon-glow-green border-green-400 text-green-400 scale-105'
                            : 'hover:neon-glow-green hover:border-green-400 hover:text-green-400'
                        }`}
                      >
                        {showGhostTrail ? 'ON' : 'OFF'}
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-[Orbitron] neon-text-purple">ENGINE SOUND</span>
                      <button
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className={`cyber-button px-4 py-2 rounded-lg font-[Orbitron] font-bold text-xs transition-all duration-300 ${
                          soundEnabled
                            ? 'neon-glow-cyan border-cyan-400 text-cyan-400 scale-105'
                            : 'hover:neon-glow-cyan hover:border-cyan-400 hover:text-cyan-400'
                        }`}
                      >
                        {soundEnabled ? '🔊 ON' : '🔇 OFF'}
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Controls Guide */}
                <div className="cyber-panel rounded-2xl p-6 breathe">
                  <h3 className="text-xl font-[Audiowide] neon-text-cyan mb-4 text-center">
                    🎮 CONTROLS
                  </h3>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="neon-text-purple">ACCELERATE</span>
                      <span className="neon-text-magenta">↑ ARROW</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="neon-text-purple">BRAKE</span>
                      <span className="neon-text-magenta">↓ ARROW</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="neon-text-purple">STEER LEFT</span>
                      <span className="neon-text-magenta">← ARROW</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="neon-text-purple">STEER RIGHT</span>
                      <span className="neon-text-magenta">→ ARROW</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {mode === 'ai-training' && (
          <div className="container mx-auto px-6 py-8 slide-up">
            <div className="mb-4 text-center">
              <h2 className="text-3xl font-[Audiowide] neon-text-magenta tracking-wider mb-2">
                🤖 NEURAL NETWORK TRAINING
              </h2>
              <div className="text-sm font-[Orbitron] neon-text-purple tracking-wide">
                DEEP Q-LEARNING • REINFORCEMENT AI • LIVE ADAPTATION
              </div>
            </div>
            {/* Fixed cyberpunk layout to prevent shifts */}
            <div className="grid xl:grid-cols-[1fr_400px] gap-8 items-start">
              <div className="min-h-0">
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
              {/* Cyberpunk stats panel */}
              <div className="w-full xl:w-[400px] xl:sticky xl:top-8">
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
                  rewardHistory={rewardHistory}
                  showHeatmap={showHeatmap}
                  onToggleHeatmap={() => setShowHeatmap(!showHeatmap)}
                  onReplayBest={() => setIsReplaying(!isReplaying)}
                  isReplaying={isReplaying}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Cyberpunk Footer */}
      <footer className="cyber-panel border-t neon-border-magenta mt-12">
        <div className="max-w-7xl mx-auto px-6 py-6 text-center">
          <div className="neon-text-cyan font-[Orbitron] text-sm tracking-wide mb-2">
            🏎️ NEON RACER - CYBERPUNK AI RACING SIMULATION
          </div>
          <div className="text-xs neon-text-purple opacity-80 font-[Orbitron] tracking-wider">
            NEURAL NETWORKS • TENSORFLOW.JS • DEEP Q-LEARNING • REACT + TYPESCRIPT
          </div>
          <div className="flex justify-center items-center mt-4 space-x-4">
            <div className="w-8 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
            <div className="text-xs neon-text-magenta font-[Audiowide]">
              2024 • AI REVOLUTION
            </div>
            <div className="w-8 h-px bg-gradient-to-r from-transparent via-magenta-400 to-transparent"></div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
