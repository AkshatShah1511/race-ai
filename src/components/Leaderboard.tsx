import React, { useState, useEffect } from 'react';
import { LeaderboardEntry, RaceStats } from '../types/racing';

interface LeaderboardProps {
  raceStats: RaceStats[];
  onClearLeaderboard: () => void;
}

const LEADERBOARD_STORAGE_KEY = 'race-ai-leaderboard';

const Leaderboard: React.FC<LeaderboardProps> = ({ raceStats, onClearLeaderboard }) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  useEffect(() => {
    if (raceStats.length > 0) {
      updateLeaderboard(raceStats);
    }
  }, [raceStats]);

  const loadLeaderboard = () => {
    try {
      const stored = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as LeaderboardEntry[];
        setLeaderboard(data);
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    }
  };

  const saveLeaderboard = (data: LeaderboardEntry[]) => {
    try {
      localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save leaderboard:', error);
    }
  };

  const updateLeaderboard = (newStats: RaceStats[]) => {
    const updatedLeaderboard = [...leaderboard];

    newStats.forEach(stat => {
      const existingEntry = updatedLeaderboard.find(entry => entry.carName === stat.carName);

      if (existingEntry) {
        // Update existing entry
        existingEntry.totalRaces += 1;
        if (stat.lapTime < existingEntry.bestLapTime) {
          existingEntry.bestLapTime = stat.lapTime;
        }
        if (stat.position === 1) {
          existingEntry.wins += 1;
        }
        // Update average lap time
        existingEntry.averageLapTime = (existingEntry.averageLapTime * (existingEntry.totalRaces - 1) + stat.lapTime) / existingEntry.totalRaces;
        existingEntry.lastRaceDate = new Date().toLocaleDateString();
      } else {
        // Create new entry
        const newEntry: LeaderboardEntry = {
          carName: stat.carName,
          bestLapTime: stat.lapTime,
          totalRaces: 1,
          wins: stat.position === 1 ? 1 : 0,
          averageLapTime: stat.lapTime,
          lastRaceDate: new Date().toLocaleDateString(),
        };
        updatedLeaderboard.push(newEntry);
      }
    });

    // Sort by best lap time
    updatedLeaderboard.sort((a, b) => a.bestLapTime - b.bestLapTime);

    setLeaderboard(updatedLeaderboard);
    saveLeaderboard(updatedLeaderboard);
  };

  const handleClearLeaderboard = () => {
    setLeaderboard([]);
    localStorage.removeItem(LEADERBOARD_STORAGE_KEY);
    onClearLeaderboard();
  };

  const formatTime = (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = (timeInSeconds % 60).toFixed(2);
    return `${minutes}:${seconds.padStart(5, '0')}`;
  };

  const getRankEmoji = (index: number): string => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `${index + 1}.`;
    }
  };

  const displayedLeaderboard = showAll ? leaderboard : leaderboard.slice(0, 10);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-2xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          🏆 Leaderboard
        </h2>
        <div className="flex gap-2">
          {leaderboard.length > 10 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {showAll ? 'Show Top 10' : 'Show All'}
            </button>
          )}
          <button
            onClick={handleClearLeaderboard}
            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
          >
            Clear
          </button>
        </div>
      </div>

      {leaderboard.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <div className="text-4xl mb-2">🏁</div>
          <p>No race records yet!</p>
          <p className="text-sm mt-1">Complete some races to see the leaderboard.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedLeaderboard.map((entry, index) => (
            <div
              key={entry.carName}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                index < 3
                  ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center space-x-4">
                <div className="text-2xl font-bold">
                  {getRankEmoji(index)}
                </div>
                <div>
                  <div className="font-semibold text-gray-800">{entry.carName}</div>
                  <div className="text-sm text-gray-600">
                    {entry.totalRaces} races • {entry.wins} wins • Last: {entry.lastRaceDate}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg text-blue-600">
                  {formatTime(entry.bestLapTime)}
                </div>
                <div className="text-sm text-gray-500">
                  Avg: {formatTime(entry.averageLapTime)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {leaderboard.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-600">{leaderboard.length}</div>
              <div className="text-sm text-gray-600">Total Racers</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-600">
                {leaderboard.reduce((sum, entry) => sum + entry.totalRaces, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Races</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-purple-600">
                {formatTime(Math.min(...leaderboard.map(e => e.bestLapTime)))}
              </div>
              <div className="text-sm text-gray-600">Best Time</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-orange-600">
                {formatTime(leaderboard.reduce((sum, entry) => sum + entry.averageLapTime, 0) / leaderboard.length)}
              </div>
              <div className="text-sm text-gray-600">Avg Time</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
