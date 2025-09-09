import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative inline-flex items-center justify-center
        w-12 h-6 rounded-full transition-all duration-300 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800
        ${isDark 
          ? 'bg-gradient-to-r from-blue-500 to-purple-600 focus:ring-blue-500' 
          : 'bg-gradient-to-r from-gray-200 to-gray-300 focus:ring-gray-400'
        }
        hover:scale-105 active:scale-95
        shadow-lg hover:shadow-xl
      `}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {/* Track */}
      <span className="sr-only">
        {isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      </span>
      
      {/* Switch Circle */}
      <span
        className={`
          inline-flex items-center justify-center
          w-5 h-5 rounded-full shadow-lg
          transform transition-all duration-300 ease-in-out
          ${isDark 
            ? 'translate-x-3 bg-white text-blue-600' 
            : 'translate-x-0 bg-white text-gray-600'
          }
        `}
      >
        {/* Icon */}
        <svg
          className={`w-3 h-3 transition-all duration-300 ${isDark ? 'rotate-0' : 'rotate-180'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          {isDark ? (
            // Moon icon for dark mode
            <path
              fillRule="evenodd"
              d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"
              clipRule="evenodd"
            />
          ) : (
            // Sun icon for light mode
            <path
              fillRule="evenodd"
              d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
              clipRule="evenodd"
            />
          )}
        </svg>
      </span>
      
      {/* Background gradient overlay for smooth transition */}
      <div
        className={`
          absolute inset-0 rounded-full transition-opacity duration-300
          ${isDark 
            ? 'bg-gradient-to-r from-blue-600 to-purple-700 opacity-20' 
            : 'bg-gradient-to-r from-yellow-300 to-orange-400 opacity-0'
          }
        `}
      />
    </button>
  );
};

export default ThemeToggle;
