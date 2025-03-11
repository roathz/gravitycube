# Gravity Guy

A fast-paced endless runner game with a gravity-flipping mechanic, set in a neon-lit dystopian world.

![Gravity Guy Screenshot](screenshot.png)

## Game Overview

In Gravity Guy, you control a character that can flip between running on the floor and ceiling. The goal is to survive as long as possible, avoiding obstacles and achieving the highest distance score.

### Features

- **Gravity-Flipping Mechanic**: Tap or press space to flip gravity
- **Endless Procedural Generation**: The game continues with new obstacles as you progress
- **Score Tracking**: Keep track of your distance and compete for high scores
- **Neon Dystopian Aesthetics**: Visual style inspired by cyberpunk and synthwave

## How to Play

1. Open `index.html` in a web browser
2. Tap the screen or press SPACE to flip gravity
3. Avoid obstacles for as long as possible
4. Your distance score increases automatically as you survive
5. When you hit an obstacle, the game ends and your score is saved
6. Tap "Restart" to play again

## Setup Instructions

### Option 1: Simple Setup (No Server)

1. Clone or download this repository
2. Open `index.html` directly in a web browser

Note: High scores won't be saved without setting up Supabase (see Option 2)

### Option 2: Complete Setup (With High Score Saving)

1. Clone or download this repository
2. Sign up for a free account at [Supabase](https://supabase.com/)
3. Create a new Supabase project
4. In your project, create a new table called `highscores` with columns:
   - `id` (auto-incremented)
   - `score` (integer)
   - `created_at` (timestamp, default to now)
5. Get your Supabase URL and anon key from the Supabase dashboard (Settings > API)
6. Open `game.js` and replace the placeholder values:
   ```javascript
   const supabaseUrl = 'YOUR_SUPABASE_URL'; // Replace with your Supabase URL
   const supabaseKey = 'YOUR_SUPABASE_KEY'; // Replace with your Supabase anon key
   ```
7. Open `index.html` in a web browser

## Development and Customization

### Project Structure

- `index.html` - Main HTML file
- `styles.css` - CSS styling
- `game.js` - Game logic and mechanics
- `assets/` - Folder for audio files

### Customization Ideas

- Modify obstacle patterns
- Add power-ups
- Create new level designs
- Implement different characters
- Adjust game difficulty

## Technologies Used

- **Frontend**: Phaser.js, HTML, CSS, Vanilla JavaScript
- **Backend**: Supabase (API)
- **Database**: Supabase (PostgreSQL)

## Credits

- Game concept inspired by classic endless runners
- Built using [Phaser.js](https://phaser.io/) game framework

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

Enjoy playing Gravity Guy! Feel free to contribute or customize it to make it your own. 