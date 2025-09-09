# Race AI 🏎️

A TypeScript React application featuring a grid-based race track editor and manual driving game. Create custom tracks and race through them!

## Features

### Track Editor
- **Grid-based map editor** using HTML Canvas
- **Left click** to draw roads
- **Right click** to erase and create walls
- **START and FINISH** position placement buttons
- **Save maps as JSON** with grid, start, and finish data

### Racing Game
- **Car rendering** with small rectangle/triangle visualization
- **Arrow key controls**:
  - Up: Accelerate
  - Left/Right: Turn
  - Down: Brake
- **Collision detection** - "Crashed!" message when hitting walls
- **Finish line detection** - "Finished!" message when crossing the finish
- Car spawns at the START position

### Interface
- **Mode switching** between Editor and Play modes
- **Clean UI** styled with Tailwind CSS
- Map data seamlessly passed from Editor to Game

## Tech Stack

- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **HTML Canvas** for grid-based rendering
- **Create React App** for build tooling

## Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/AkshatShah1511/race-ai.git
   cd race-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```
   Opens [http://localhost:3000](http://localhost:3000) in your browser.

4. **Build for production**
   ```bash
   npm run build
   ```

## How to Play

1. **Editor Mode**: 
   - Click and drag to draw roads
   - Right-click to erase
   - Use START and FINISH buttons to place special positions
   - Save your track design

2. **Play Mode**:
   - Your car appears at the START position
   - Use arrow keys to navigate
   - Avoid walls to prevent crashing
   - Reach the FINISH line to win!

## Development Roadmap

This is **Stage 1** of the Race AI project, featuring:
- ✅ Track editor with manual drawing
- ✅ Manual car driving with physics
- 🔄 Future: AI car training with reinforcement learning
- 🔄 Future: Neural network visualization
- 🔄 Future: Multiple AI agents racing

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Akshat Shah** - [GitHub](https://github.com/AkshatShah1511)
