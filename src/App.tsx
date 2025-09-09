import React, { useState } from 'react';
import Editor, { MapData } from './components/Editor';
import Game from './components/Game';

type Mode = 'editor' | 'game';

function App() {
  const [mode, setMode] = useState<Mode>('editor');
  const [mapData, setMapData] = useState<MapData>({
    grid: Array(30).fill(null).map(() => Array(40).fill(0)),
    start: null,
    finish: null
  });

  const handleMapChange = (newMapData: MapData) => {
    setMapData(newMapData);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation Header */}
      <header className="bg-white shadow-md border-b-2 border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">Race AI 🏎️</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('editor')}
                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                  mode === 'editor'
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                📝 Editor Mode
              </button>
              <button
                onClick={() => setMode('game')}
                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                  mode === 'game'
                    ? 'bg-green-500 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                🏎️ Play Mode
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {mode === 'editor' ? (
          <Editor onMapChange={handleMapChange} />
        ) : (
          <Game mapData={mapData} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white text-center py-4 mt-8">
        <p className="text-sm">
          Race AI - Stage 1: Track Editor + Manual Driving | Built with React & TypeScript
        </p>
      </footer>
    </div>
  );
}

export default App;
