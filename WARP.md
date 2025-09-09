# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Race AI is a TypeScript React application featuring a grid-based race track editor and manual driving game. This is Stage 1 of a larger project that will eventually include AI car training with reinforcement learning.

## Key Commands

### Development
```bash
npm start          # Start development server (http://localhost:3000)
npm run build      # Build for production
npm test           # Run tests with Jest/React Testing Library
```

### Testing
```bash
npm test -- --watchAll=false    # Run tests once without watch mode
npm test -- --coverage          # Run tests with coverage report
```

## Architecture Overview

### Core Components Structure
- **App.tsx**: Main application with mode switching (Editor/Game) and shared state management
- **Editor.tsx**: Canvas-based track editor with grid drawing system
- **Game.tsx**: Real-time racing game with physics simulation and collision detection

### State Management Pattern
The app uses a centralized state approach where `App.tsx` manages:
- `MapData` interface containing grid, start, and finish positions
- Mode switching between 'editor' and 'game' 
- Seamless data flow from Editor to Game via props

### Canvas Architecture
Both Editor and Game components use HTML Canvas with:
- **Grid system**: 800x600 canvas with 20px cells (40x30 grid)
- **Cell types**: WALL (0), ROAD (1), START (2), FINISH (3)
- **Real-time rendering**: Game loop with requestAnimationFrame for smooth animation

### Physics System (Game Component)
- **Car object**: Position (x,y), angle, speed, dimensions
- **Movement**: Acceleration/deceleration with realistic physics
- **Collision detection**: Corner-based collision checking against walls
- **Controls**: Arrow keys with turn-only-when-moving logic

## Important Implementation Details

### Canvas Coordinate System
- Canvas uses pixel coordinates (0-800, 0-600)
- Grid uses cell coordinates (0-39, 0-29) 
- Conversion: `pixelPos = cellPos * CELL_SIZE`

### Game State Management
Game component manages three states: 'playing', 'crashed', 'finished'
- State changes trigger UI updates and car behavior modifications
- Reset functionality reinitializes car at START position

### Data Flow
1. Editor creates/modifies MapData
2. MapData passed up to App via onMapChange callback
3. App passes MapData to Game component
4. Game initializes car position based on MapData.start

### File Export Feature
Editor includes JSON export functionality that saves complete track data (grid + start/finish positions) as downloadable file.

## Development Patterns

### TypeScript Interfaces
Key interfaces are exported from components:
- `MapData` interface in Editor.tsx defines the track data structure
- Components use proper TypeScript typing for props and state

### React Hooks Usage
- Heavy use of `useCallback` for performance optimization in rendering functions
- `useRef` for Canvas DOM manipulation and animation frame management
- `useEffect` for keyboard event listeners and game loop initialization

### Event Handling
- Mouse events for drawing (mousedown/mousemove/mouseup pattern)
- Keyboard events with proper cleanup in useEffect
- Context menu prevention for right-click drawing

## Testing Setup

Uses Create React App's default testing setup with:
- Jest as test runner
- React Testing Library for component testing
- Current test suite is minimal and should be expanded for track editor and game logic
