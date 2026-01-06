# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Cute As Christmas" is a vanilla JavaScript Progressive Web App (PWA) holiday arcade game. The game has no build process, no dependencies, and runs entirely in the browser.

## Running the Project

```bash
# Recommended: Use the provided Python development server
python3 server.py [port]  # Default port is 8000, auto-opens browser

# Alternative: Any static HTTP server
python3 -m http.server 8000
npx serve
npx http-server
```

## Architecture

This is a frontend-only application with the following structure:

- **app.js**: Main game logic (2,300+ lines) containing:
  - Game state management and game loop
  - Character system with unlockable characters (Santa, Kasie, Ms. Claus, Frosty)
  - Collision detection and physics
  - Power-up system (Stocking, Snowflake, Hot Cocoa)
  - Touch/keyboard input handling
  - Canvas rendering
  - LocalStorage for persistence

- **sw.js**: Service worker for PWA offline functionality
  - Caches all game assets
  - Enables offline play

- **index.html**: Single page with canvas and touch controls
- **style.css**: Responsive styling with mobile-first design

## Key Game Systems

1. **Character System**: Characters have unique abilities and costs
   - Santa: Default, balanced
   - Kasie: Dual joystick controls, fastest movement
   - Characters stored in `CHARACTERS` object in app.js

2. **Scoring System**:
   - 1 point per tree hit
   - Combo system tracks consecutive hits
   - Total points unlock new characters
   - High score persistence via localStorage

3. **Input System**:
   - Mobile: Virtual joystick(s) + fire button
   - Desktop: WASD/Arrow keys + Space/Enter
   - Kasie character uses dual joystick system

## Development Guidelines

1. **Image Assets**: 
   - Must match exact filenames (case-sensitive on web)
   - All images in root directory
   - Character images: Santa.png, kasie.png, etc.

2. **Testing**: 
   - No automated tests exist
   - Test manually in browser
   - Check both desktop and mobile controls
   - Verify PWA features (offline, install)

3. **Deployment**:
   - Hosted on GitHub Pages
   - Push to main branch auto-deploys
   - HTTPS required for service worker

4. **Version Management**:
   - Update `VERSION` constant in app.js
   - Update version in CHANGELOG.md
   - Follow semantic versioning in CHANGELOG.md

## Common Tasks

### Adding a New Character
1. Add character definition to `CHARACTERS` object in app.js
2. Add character image (PNG) to root directory
3. Update image loading in `loadImages()` function
4. Set appropriate scale in `SCALE` object

### Modifying Game Balance
- Tree spawn rates: `updateDifficulty()` function
- Power-up spawn rates: `spawnPowerUp()` function
- Character stats: `CHARACTERS` object
- Scoring: `checkCollisions()` function

### Updating Visuals
- All rendering in `draw()` function
- Character selection UI in `renderCharacters()` function
- HUD elements drawn directly on canvas
- Combo display styling around line 894-934

## Important Notes

- Game state persists in localStorage (score, unlocked characters)
- Service worker caches all assets - update sw.js cache version when adding files
- Mobile performance is critical - test on actual devices
- Case sensitivity matters for image filenames on web servers