# Minimal Endless Runner

A minimalist, high-quality endless runner game built with Electron.

![Game Screenshot](screenshot.png)

## Features

- **Minimalist Design**: Black/white/grayscale aesthetic
- **Smooth Physics**: Easing functions for fluid motion
- **Visual Effects**: 
  - Motion trails at high speed
  - Particle system (dust on jump, impact burst)
  - Screen shake on collision
- **Gameplay**:
  - Single jump + Double jump
  - Sliding mechanic (reduced hitbox)
  - Two obstacle types (low/high)
  - Speed ramps up over time
- **Scoring System** with ratings:
  - < 200: "Needs Improvement"
  - 200-500: "Decent"
  - 500-1000: "Strong"
  - 1000+: "Elite"

## Controls

| Key | Action |
|-----|--------|
| `Space` | Jump (Double tap for double jump) |
| `↓` or `S` | Slide (hold) |
| `Mouse Click` | Jump |

## Build Instructions

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)

### Setup

```bash
# Install dependencies
npm install
```

### Run Development

```bash
npm start
```

### Build Executable

```bash
# Build both installer and portable version
npm run build

# Build portable version only
npm run build:portable
```

Build outputs will be in the `dist` folder:
- `Minimal Endless Runner.exe` - Portable executable
- `Minimal Endless Runner Setup.exe` - Installer

## Project Structure

```
minimal-endless-runner/
├── package.json    # Electron configuration
├── main.js         # Electron main process
├── index.html      # Game UI
├── game.js         # Game logic
└── README.md       # This file
```

## Performance

- Uses `requestAnimationFrame` for smooth rendering
- Object pooling for particles to minimize garbage collection
- Optimized collision detection

## License

MIT
