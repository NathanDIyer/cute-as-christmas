# Cute As Christmas - Documentation

## Version: 1.0

A cozy holiday arcade game where you guide Santa, fire ornaments, and save the forest from falling trees!

---

## Versioning Policy

- **Major updates** (new features, big changes): bump full version (v1.0 → v2.0)
- **Minor updates** (bug fixes, small tweaks): bump by .1 (v1.0 → v1.1)

Version is displayed in-game (top-left) for tracking.

---

## How to Play

### Controls
- **Move**: Joystick (touch) or WASD/Arrow keys
- **Fire**: Fire button (touch) or Space/Enter

### Objective
Stop the falling trees before they reach the ground by hitting them with ornaments.

### Scoring
- **Base**: 1 point per tree
- **5x Combo**: 2 points per tree
- **10x Combo**: 3 points per tree

Combos build when you hit trees consecutively. Missing a shot (ornament leaves screen) resets your combo!

### Power-ups & Hazards
- **Stocking**: Grants 5 seconds of rapid fire
- **Coal**: Avoid it! Costs 5 points if touched
- **Reindeer**: Appears at levels 3, 6, 9... and helps fire ornaments

### Difficulty
- Trees spawn faster over time
- Trees fall faster as difficulty increases

---

## Changelog

### v1.0 - December 2025
- Initial release with combo system
- Added combo tracking (5x = 2pts, 10x = 3pts)
- Combo indicator displays in top-right during gameplay
- Added comprehensive "How to Play" guide on start screen
- Power-ups: Stockings (rapid fire)
- Hazards: Coal (-5 points)
- Reindeer helper spawns at milestone levels
- High score persistence via localStorage
- Level progression system
- Mobile-friendly controls with virtual joystick
- Background music with toggle
