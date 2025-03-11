# Changelog

All notable changes to the Gravity Cube game will be documented in this file.

## [Unreleased]

## [1.1.0] - 2023-06-18

### Added
- New scoreboard UI showing both high score and current score
- Text-based "TRY AGAIN" button with animations replacing the previous symbol
- Breathing animation effect on the restart button
- Visual feedback for collisions
- Grouped spike obstacles (2-3 spikes) for increased challenge

### Changed
- Increased spike size by 1.4x (from scale 0.5 to 0.8)
- Improved restart button appearance:
  - Now appears 0.4 seconds after game over
  - Features a smooth entrance animation with bounce effect
  - Continuous pulsing animation to draw player attention
- Reduced collision hitboxes for more accurate gameplay feel

### Fixed
- Improved collision detection to prevent unfair deaths
- Fixed high score persistence using localStorage

## [1.0.0] - 2023-06-01

### Added
- Initial game release
- Basic gravity-flipping gameplay mechanics
- Obstacle avoidance
- Score tracking
- Progressive difficulty increase
- Phase system with speed boosts 