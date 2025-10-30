# Tic-Tac-Toe Game

A modern, interactive tic-tac-toe game built with vanilla HTML, CSS, and JavaScript. Features persistent high score tracking and a clean, responsive user interface.

## Features

- **Interactive 3x3 Game Board**: Click cells to place your mark (X or O)
- **Multiple Game Modes**:
  - **Two-Player Mode**: Alternating turns between Player X and Player O
  - **Single-Player Mode**: Play against an AI opponent with three difficulty levels
- **AI Opponent**:
  - **Easy**: Random moves, perfect for beginners
  - **Medium**: Strategic play with some randomness - tries to win and block
  - **Hard**: Unbeatable AI using minimax algorithm with alpha-beta pruning
- **Player Choice**: Choose to play as X (first) or O (second) against the AI
- **Intelligent Win Detection**: Automatically detects wins across all rows, columns, and diagonals
- **Draw Detection**: Recognizes when the game ends in a draw
- **Score Tracking**: Keeps track of wins for both players and draws across multiple games
- **Persistent High Scores**: Scores are saved to localStorage and persist across browser sessions
- **Game Controls**:
  - **New Game**: Start a fresh game while preserving scores
  - **Reset Scores**: Clear all scores with confirmation dialog
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Modern UI**: Beautiful gradient background, smooth animations, and hover effects

## How to Run

1. Clone or download this project to your local machine
2. Navigate to the project directory: `D:\projects\ccdemo`
3. Open `index.html` in any modern web browser (Chrome, Firefox, Safari, Edge)
4. Start playing!

No build process or dependencies required - just pure vanilla JavaScript!

## How to Play

### Starting a Game

1. **Choose Game Mode**: When you open the game, select either:
   - **2 Players**: Play against another person on the same device
   - **vs AI**: Play against the computer

### Playing Against AI

2. **Configure AI Game**:
   - **Select Difficulty**:
     - **Easy**: AI makes random moves (great for practice)
     - **Medium**: AI uses strategy 60% of the time, will try to win and block you
     - **Hard**: Unbeatable AI that plays perfectly using minimax algorithm
   - **Choose Your Symbol**:
     - **X (First)**: You go first
     - **O (Second)**: AI goes first
   - Click **Start Game** to begin

### Playing the Game

3. **Making a Move**: Click any empty cell on the 3x3 grid to place your mark
4. **Winning**: Get three of your marks in a row (horizontally, vertically, or diagonally)
5. **Draw**: If all cells are filled and no player has won, the game ends in a draw
6. **New Game**: Click the "New Game" button to choose a new mode and start another round (scores are preserved)
7. **Reset Scores**: Click "Reset Scores" to clear all win/draw statistics

## Game Rules

- Players alternate turns, with X going first
- Once a cell is clicked, it cannot be changed
- A player wins by getting three of their marks in a row:
  - Horizontal: Top, middle, or bottom row
  - Vertical: Left, middle, or right column
  - Diagonal: Top-left to bottom-right, or top-right to bottom-left
- If all 9 cells are filled with no winner, the game is a draw

## Technical Details

### Project Structure

```
D:\projects\ccdemo\
├── index.html      # Main HTML structure
├── styles.css      # All styling and responsive design
├── game.js         # Game logic and state management
└── README.md       # This file
```

### Technologies Used

- **HTML5**: Semantic markup and structure
- **CSS3**: Grid layout, flexbox, animations, and responsive design
- **JavaScript (ES6+)**: Game logic, DOM manipulation, and localStorage API

### Board Indexing

The game board uses a simple index system (0-8):

```
0 | 1 | 2
---------
3 | 4 | 5
---------
6 | 7 | 8
```

### Win Conditions

The game checks 8 possible winning combinations:

```javascript
const winConditions = [
    [0, 1, 2], // Top row
    [3, 4, 5], // Middle row
    [6, 7, 8], // Bottom row
    [0, 3, 6], // Left column
    [1, 4, 7], // Middle column
    [2, 5, 8], // Right column
    [0, 4, 8], // Diagonal (top-left to bottom-right)
    [2, 4, 6]  // Diagonal (top-right to bottom-left)
];
```

### localStorage

- **Storage Key**: `ticTacToeScores`
- **Data Format**: JSON object with keys: `X`, `O`, `draws`
- **Error Handling**: Gracefully handles localStorage errors and quota exceeded issues

### Browser Compatibility

This game works on all modern browsers that support:
- CSS Grid
- ES6 JavaScript features
- localStorage API

Tested on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Code Structure

### Game State

```javascript
const gameState = {
    board: Array(9).fill(''),  // 9 empty cells
    currentPlayer: 'X',         // Current player
    gameActive: true,           // Game status
    scores: {
        X: 0,
        O: 0,
        draws: 0
    }
};
```

### Key Functions

- **Game Logic**:
  - `handleCellClick()`: Processes player moves
  - `checkWin()`: Validates winning conditions
  - `checkDraw()`: Checks for draw state
  - `switchPlayer()`: Alternates between X and O

- **Storage**:
  - `loadScores()`: Retrieves scores from localStorage
  - `saveScores()`: Persists scores to localStorage
  - `resetScores()`: Clears stored scores

- **Rendering**:
  - `renderBoard()`: Updates cell displays
  - `renderStatus()`: Shows game messages
  - `renderScores()`: Updates score display

- **Controls**:
  - `resetGame()`: Starts new game (preserves scores)
  - `resetAllScores()`: Clears all scores

## AI Implementation Details

### Difficulty Levels

**Easy AI:**
- Makes completely random moves
- Great for beginners and young players
- Provides a low-pressure learning environment

**Medium AI:**
- Uses a hybrid strategy approach
- 60% of the time uses strategic thinking:
  1. First, tries to win if possible
  2. Then, tries to block opponent's winning move
  3. Prefers center position
  4. Prefers corner positions
- 40% of the time makes random moves
- Challenging but beatable

**Hard AI:**
- Implements the minimax algorithm with alpha-beta pruning
- Evaluates all possible game outcomes
- Always makes the optimal move
- Virtually unbeatable (best case: draw)
- Uses depth-based scoring to prefer faster wins

### Minimax Algorithm

The Hard AI uses a classic game theory algorithm:
- Recursively explores all possible game states
- Assigns scores: +10 for AI win, -10 for human win, 0 for draw
- Depth factor encourages faster wins
- Alpha-beta pruning optimizes performance by eliminating unnecessary branches

## Future Enhancements

Potential features for future versions:
- Animations for winning combinations
- Sound effects
- Dark mode toggle
- Game history/replay
- Online multiplayer
- Custom player names
- Tournament mode
- Adjustable AI thinking time

## License

This project is free to use and modify for personal and educational purposes.

## Author

Created as a demonstration of vanilla JavaScript game development with persistent storage.

---

Enjoy playing Tic-Tac-Toe!
