// =====================================
// GAME CONSTANTS AND STATE
// =====================================

// Game mode constants
const GAME_MODES = {
    TWO_PLAYER: 'TWO_PLAYER',
    SINGLE_PLAYER: 'SINGLE_PLAYER'
};

// AI difficulty levels
const DIFFICULTY = {
    EASY: 'EASY',
    MEDIUM: 'MEDIUM',
    HARD: 'HARD'
};

// Win conditions: all possible winning combinations (rows, columns, diagonals)
const winConditions = [
    [0, 1, 2], // Top row
    [3, 4, 5], // Middle row
    [6, 7, 8], // Bottom row
    [0, 3, 6], // Left column
    [1, 4, 7], // Middle column
    [2, 5, 8], // Right column
    [0, 4, 8], // Diagonal top-left to bottom-right
    [2, 4, 6]  // Diagonal top-right to bottom-left
];

// Game state object
const gameState = {
    board: ['', '', '', '', '', '', '', '', ''], // 9 empty cells
    currentPlayer: 'X',                           // X always starts
    gameActive: true,                             // Game is in progress
    gameMode: GAME_MODES.TWO_PLAYER,             // Current game mode
    difficulty: DIFFICULTY.MEDIUM,                // AI difficulty level
    humanPlayer: 'X',                             // Human player's symbol in AI mode
    aiPlayer: 'O',                                // AI player's symbol
    isAiTurn: false,                              // Flag to prevent moves during AI turn
    scores: {
        X: 0,
        O: 0,
        draws: 0
    }
};

// =====================================
// DOM ELEMENT REFERENCES
// =====================================

const cells = document.querySelectorAll('.cell');
const gameStatus = document.getElementById('gameStatus');
const gameInfo = document.getElementById('gameInfo');
const scoreXElement = document.getElementById('scoreX');
const scoreOElement = document.getElementById('scoreO');
const scoreDrawsElement = document.getElementById('scoreDraws');
const scoreLabelX = document.getElementById('scoreLabelX');
const scoreLabelO = document.getElementById('scoreLabelO');
const newGameBtn = document.getElementById('newGameBtn');
const resetScoresBtn = document.getElementById('resetScoresBtn');

// Modal references
const modeSelectionModal = document.getElementById('modeSelectionModal');
const aiConfigModal = document.getElementById('aiConfigModal');
const twoPlayerBtn = document.getElementById('twoPlayerBtn');
const aiPlayerBtn = document.getElementById('aiPlayerBtn');
const difficultyBtns = document.querySelectorAll('.difficulty-btn');
const playerBtns = document.querySelectorAll('.player-btn');
const startGameBtn = document.getElementById('startGameBtn');

// =====================================
// STORAGE FUNCTIONS
// =====================================

/**
 * Load scores from localStorage
 * Returns default scores if localStorage is empty or has errors
 */
function loadScores() {
    try {
        const savedScores = localStorage.getItem('ticTacToeScores');
        if (savedScores) {
            const scores = JSON.parse(savedScores);
            // Validate that scores object has expected properties
            if (scores && typeof scores.X === 'number' &&
                typeof scores.O === 'number' &&
                typeof scores.draws === 'number') {
                return scores;
            }
        }
    } catch (error) {
        console.error('Error loading scores from localStorage:', error);
    }
    // Return default scores if loading fails
    return { X: 0, O: 0, draws: 0 };
}

/**
 * Save current scores to localStorage
 */
function saveScores() {
    try {
        localStorage.setItem('ticTacToeScores', JSON.stringify(gameState.scores));
    } catch (error) {
        console.error('Error saving scores to localStorage:', error);
    }
}

/**
 * Reset all scores to zero and clear localStorage
 */
function resetScores() {
    gameState.scores = { X: 0, O: 0, draws: 0 };
    try {
        localStorage.removeItem('ticTacToeScores');
    } catch (error) {
        console.error('Error clearing scores from localStorage:', error);
    }
    renderScores();
}

// =====================================
// MODAL FUNCTIONS
// =====================================

/**
 * Show the mode selection modal
 */
function showModeSelection() {
    modeSelectionModal.classList.remove('hidden');
    aiConfigModal.classList.add('hidden');
}

/**
 * Show the AI configuration modal
 */
function showAiConfig() {
    modeSelectionModal.classList.add('hidden');
    aiConfigModal.classList.remove('hidden');
}

/**
 * Hide all modals
 */
function hideModals() {
    modeSelectionModal.classList.add('hidden');
    aiConfigModal.classList.add('hidden');
}

/**
 * Handle mode selection (2 players or vs AI)
 * @param {string} mode - Game mode (TWO_PLAYER or SINGLE_PLAYER)
 */
function selectGameMode(mode) {
    gameState.gameMode = mode;

    if (mode === GAME_MODES.TWO_PLAYER) {
        hideModals();
        startNewGame();
    } else if (mode === GAME_MODES.SINGLE_PLAYER) {
        showAiConfig();
    }
}

/**
 * Handle difficulty selection
 * @param {string} difficulty - Difficulty level (EASY, MEDIUM, or HARD)
 */
function selectDifficulty(difficulty) {
    gameState.difficulty = difficulty;

    // Update active state on buttons
    difficultyBtns.forEach(btn => {
        if (btn.getAttribute('data-difficulty') === difficulty) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

/**
 * Handle player selection (X or O)
 * @param {string} player - Player symbol ('X' or 'O')
 */
function selectPlayer(player) {
    gameState.humanPlayer = player;
    gameState.aiPlayer = player === 'X' ? 'O' : 'X';

    // Update active state on buttons
    playerBtns.forEach(btn => {
        if (btn.getAttribute('data-player') === player) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

/**
 * Start game with selected configuration
 */
function startGameWithConfig() {
    hideModals();
    startNewGame();
}

// =====================================
// AI HELPER FUNCTIONS
// =====================================

/**
 * Get all available empty cell indices
 * @returns {number[]} - Array of available cell indices
 */
function getAvailableMoves() {
    const moves = [];
    for (let i = 0; i < 9; i++) {
        if (gameState.board[i] === '') {
            moves.push(i);
        }
    }
    return moves;
}

/**
 * Get a random element from an array
 * @param {Array} array - Input array
 * @returns {*} - Random element from array
 */
function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * Make an easy AI move (random)
 * @returns {number} - Index of selected cell
 */
function makeEasyAIMove() {
    const availableMoves = getAvailableMoves();
    return getRandomElement(availableMoves);
}

/**
 * Check if player can win in the next move
 * @param {string} player - Player symbol ('X' or 'O')
 * @returns {number|null} - Index of winning move or null
 */
function checkWinningMove(player) {
    const availableMoves = getAvailableMoves();

    for (let i = 0; i < availableMoves.length; i++) {
        const moveIndex = availableMoves[i];
        // Try the move
        gameState.board[moveIndex] = player;

        // Check if it creates a win
        const isWin = winConditions.some(condition => {
            return condition.every(index => {
                return gameState.board[index] === player;
            });
        });

        // Undo the move
        gameState.board[moveIndex] = '';

        if (isWin) {
            return moveIndex;
        }
    }

    return null;
}

/**
 * Make a medium AI move (strategic with some randomness)
 * @returns {number} - Index of selected cell
 */
function makeMediumAIMove() {
    const availableMoves = getAvailableMoves();

    // 60% chance to use strategy, 40% random
    const useStrategy = Math.random() < 0.6;

    if (useStrategy) {
        // Try to win
        const winMove = checkWinningMove(gameState.aiPlayer);
        if (winMove !== null) {
            return winMove;
        }

        // Try to block opponent's win
        const blockMove = checkWinningMove(gameState.humanPlayer);
        if (blockMove !== null) {
            return blockMove;
        }

        // Prefer center if available
        if (availableMoves.includes(4)) {
            return 4;
        }

        // Prefer corners
        const corners = [0, 2, 6, 8].filter(i => availableMoves.includes(i));
        if (corners.length > 0) {
            return getRandomElement(corners);
        }
    }

    // Random move (or fallback if no strategic move found)
    return getRandomElement(availableMoves);
}

/**
 * Check winner on a given board state
 * @param {string[]} board - Board array
 * @returns {string|null} - 'X', 'O', 'draw', or null
 */
function checkWinner(board) {
    // Check for X win
    for (let condition of winConditions) {
        if (condition.every(index => board[index] === 'X')) {
            return 'X';
        }
    }

    // Check for O win
    for (let condition of winConditions) {
        if (condition.every(index => board[index] === 'O')) {
            return 'O';
        }
    }

    // Check for draw
    if (board.every(cell => cell !== '')) {
        return 'draw';
    }

    // Game still in progress
    return null;
}

/**
 * Minimax algorithm with alpha-beta pruning
 * @param {string[]} board - Current board state
 * @param {number} depth - Current depth in game tree
 * @param {boolean} isMaximizing - True if maximizing player's turn
 * @param {number} alpha - Alpha value for pruning
 * @param {number} beta - Beta value for pruning
 * @returns {number} - Score for this board state
 */
function minimax(board, depth, isMaximizing, alpha, beta) {
    const winner = checkWinner(board);

    // Terminal states
    if (winner === gameState.aiPlayer) {
        return 10 - depth;
    }
    if (winner === gameState.humanPlayer) {
        return depth - 10;
    }
    if (winner === 'draw') {
        return 0;
    }

    if (isMaximizing) {
        let maxScore = -Infinity;

        for (let i = 0; i < 9; i++) {
            if (board[i] === '') {
                board[i] = gameState.aiPlayer;
                const score = minimax(board, depth + 1, false, alpha, beta);
                board[i] = '';

                maxScore = Math.max(score, maxScore);
                alpha = Math.max(alpha, score);

                if (beta <= alpha) {
                    break; // Alpha-beta pruning
                }
            }
        }

        return maxScore;
    } else {
        let minScore = Infinity;

        for (let i = 0; i < 9; i++) {
            if (board[i] === '') {
                board[i] = gameState.humanPlayer;
                const score = minimax(board, depth + 1, true, alpha, beta);
                board[i] = '';

                minScore = Math.min(score, minScore);
                beta = Math.min(beta, score);

                if (beta <= alpha) {
                    break; // Alpha-beta pruning
                }
            }
        }

        return minScore;
    }
}

/**
 * Make a hard AI move using minimax algorithm
 * @returns {number} - Index of selected cell
 */
function makeHardAIMove() {
    let bestScore = -Infinity;
    let bestMove = 0;

    // Try all available moves
    for (let i = 0; i < 9; i++) {
        if (gameState.board[i] === '') {
            // Make the move
            gameState.board[i] = gameState.aiPlayer;

            // Calculate score using minimax
            const score = minimax(gameState.board, 0, false, -Infinity, Infinity);

            // Undo the move
            gameState.board[i] = '';

            // Update best move
            if (score > bestScore) {
                bestScore = score;
                bestMove = i;
            }
        }
    }

    return bestMove;
}

/**
 * Execute AI move with delay for better UX
 */
function executeAIMove() {
    gameState.isAiTurn = true;

    // Update status
    renderStatus('AI is thinking...');

    // Add ai-thinking class to all cells
    cells.forEach(cell => {
        if (!cell.classList.contains('disabled')) {
            cell.classList.add('ai-thinking');
        }
    });

    // Delay AI move for better user experience
    setTimeout(() => {
        try {
            let moveIndex;

            // Select AI move based on difficulty
            switch (gameState.difficulty) {
                case DIFFICULTY.EASY:
                    moveIndex = makeEasyAIMove();
                    break;
                case DIFFICULTY.MEDIUM:
                    moveIndex = makeMediumAIMove();
                    break;
                case DIFFICULTY.HARD:
                    moveIndex = makeHardAIMove();
                    break;
                default:
                    moveIndex = makeEasyAIMove();
            }

            // Execute the move
            makeMove(moveIndex);
        } catch (error) {
            console.error('Error during AI move:', error);
        } finally {
            // Remove ai-thinking class from all cells
            cells.forEach(cell => {
                cell.classList.remove('ai-thinking');
            });

            gameState.isAiTurn = false;
        }
    }, 400);
}

// =====================================
// GAME LOGIC FUNCTIONS
// =====================================

/**
 * Handle cell click event
 * @param {Event} event - Click event object
 */
function handleCellClick(event) {
    // Prevent clicks during AI turn
    if (gameState.isAiTurn) {
        return;
    }

    const cell = event.target;
    const cellIndex = parseInt(cell.getAttribute('data-cell-index'));

    // Validate move: check if game is active and cell is empty
    if (!gameState.gameActive || gameState.board[cellIndex] !== '') {
        return;
    }

    // In single player mode, only allow human player moves
    if (gameState.gameMode === GAME_MODES.SINGLE_PLAYER &&
        gameState.currentPlayer !== gameState.humanPlayer) {
        return;
    }

    // Execute the move
    makeMove(cellIndex);

    // If single player and game still active, let AI move
    if (gameState.gameMode === GAME_MODES.SINGLE_PLAYER &&
        gameState.gameActive) {
        executeAIMove();
    }
}

/**
 * Make a move at the specified cell index
 * @param {number} cellIndex - Index of the cell to play
 */
function makeMove(cellIndex) {
    // Update board state
    gameState.board[cellIndex] = gameState.currentPlayer;

    // Update cell display
    const cell = document.querySelector(`[data-cell-index="${cellIndex}"]`);
    cell.textContent = gameState.currentPlayer;
    cell.classList.add(gameState.currentPlayer.toLowerCase());
    cell.classList.add('disabled');

    // Check for win
    if (checkWin()) {
        handleGameEnd('win');
        return;
    }

    // Check for draw
    if (checkDraw()) {
        handleGameEnd('draw');
        return;
    }

    // Switch to next player
    switchPlayer();
    renderStatus();
}

/**
 * Check if current player has won
 * @returns {boolean} - True if current player won, false otherwise
 */
function checkWin() {
    return winConditions.some(condition => {
        return condition.every(index => {
            return gameState.board[index] === gameState.currentPlayer;
        });
    });
}

/**
 * Check if game is a draw (all cells filled, no winner)
 * @returns {boolean} - True if game is a draw, false otherwise
 */
function checkDraw() {
    return gameState.board.every(cell => cell !== '');
}

/**
 * Handle game end (win or draw)
 * @param {string} result - 'win' or 'draw'
 */
function handleGameEnd(result) {
    gameState.gameActive = false;

    // Update scores
    if (result === 'win') {
        gameState.scores[gameState.currentPlayer]++;

        // Mode-aware win messages
        if (gameState.gameMode === GAME_MODES.TWO_PLAYER) {
            renderStatus(`Player ${gameState.currentPlayer} Wins!`);
        } else {
            // Single player mode
            if (gameState.currentPlayer === gameState.humanPlayer) {
                renderStatus('You Win!');
            } else {
                renderStatus('AI Wins!');
            }
        }
    } else {
        gameState.scores.draws++;
        renderStatus("It's a Draw!");
    }

    // Save scores to localStorage
    saveScores();
    renderScores();

    // Disable all cells
    cells.forEach(cell => {
        cell.classList.add('disabled');
    });
}

/**
 * Switch to the other player
 */
function switchPlayer() {
    gameState.currentPlayer = gameState.currentPlayer === 'X' ? 'O' : 'X';
}

// =====================================
// RENDERING FUNCTIONS
// =====================================

/**
 * Render the game board from current state
 */
function renderBoard() {
    cells.forEach((cell, index) => {
        const value = gameState.board[index];
        cell.textContent = value;
        cell.className = 'cell'; // Reset classes

        if (value) {
            cell.classList.add(value.toLowerCase());
            cell.classList.add('disabled');
        }
    });
}

/**
 * Render game status message
 * @param {string} message - Optional custom message
 */
function renderStatus(message) {
    if (message) {
        gameStatus.textContent = message;
    } else {
        // Mode-aware status messages
        if (gameState.gameMode === GAME_MODES.TWO_PLAYER) {
            gameStatus.textContent = `Player ${gameState.currentPlayer}'s Turn`;
        } else {
            // Single player mode
            if (gameState.currentPlayer === gameState.humanPlayer) {
                gameStatus.textContent = 'Your Turn';
            } else {
                gameStatus.textContent = "AI's Turn";
            }
        }
    }
}

/**
 * Render current scores to the DOM
 */
function renderScores() {
    scoreXElement.textContent = gameState.scores.X;
    scoreOElement.textContent = gameState.scores.O;
    scoreDrawsElement.textContent = gameState.scores.draws;
}

/**
 * Update score labels based on game mode
 */
function updateScoreLabels() {
    if (gameState.gameMode === GAME_MODES.TWO_PLAYER) {
        scoreLabelX.textContent = 'Player X:';
        scoreLabelO.textContent = 'Player O:';
    } else {
        // Single player mode
        if (gameState.humanPlayer === 'X') {
            scoreLabelX.textContent = 'You (X):';
            scoreLabelO.textContent = 'AI (O):';
        } else {
            scoreLabelX.textContent = 'AI (X):';
            scoreLabelO.textContent = 'You (O):';
        }
    }
}

/**
 * Update game info display
 */
function updateGameInfo() {
    if (gameState.gameMode === GAME_MODES.TWO_PLAYER) {
        gameInfo.textContent = 'Mode: 2 Players';
    } else {
        const difficultyText = gameState.difficulty.charAt(0).toUpperCase() +
                              gameState.difficulty.slice(1).toLowerCase();
        gameInfo.textContent = `Mode: vs AI (${difficultyText})`;
    }
}

// =====================================
// GAME CONTROL FUNCTIONS
// =====================================

/**
 * Reset the game board for a new game
 * Preserves scores
 */
function resetGame() {
    showModeSelection();
}

/**
 * Start a new game with current configuration
 */
function startNewGame() {
    gameState.board = ['', '', '', '', '', '', '', '', ''];
    gameState.currentPlayer = 'X';
    gameState.gameActive = true;
    gameState.isAiTurn = false;

    renderBoard();
    updateScoreLabels();
    updateGameInfo();
    renderStatus();

    // If AI plays first (AI is X), trigger AI move
    if (gameState.gameMode === GAME_MODES.SINGLE_PLAYER &&
        gameState.aiPlayer === 'X') {
        executeAIMove();
    }
}

/**
 * Reset all scores and start a fresh game
 */
function resetAllScores() {
    if (confirm('Are you sure you want to reset all scores? This cannot be undone.')) {
        resetScores();
        resetGame();
    }
}

// =====================================
// EVENT LISTENERS
// =====================================

// Attach click listeners to all cells
cells.forEach(cell => {
    cell.addEventListener('click', handleCellClick);
});

// Attach button event listeners
newGameBtn.addEventListener('click', resetGame);
resetScoresBtn.addEventListener('click', resetAllScores);

// Modal event listeners
twoPlayerBtn.addEventListener('click', () => selectGameMode(GAME_MODES.TWO_PLAYER));
aiPlayerBtn.addEventListener('click', () => selectGameMode(GAME_MODES.SINGLE_PLAYER));

// Difficulty selection
difficultyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        selectDifficulty(btn.getAttribute('data-difficulty'));
    });
});

// Player selection
playerBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        selectPlayer(btn.getAttribute('data-player'));
    });
});

// Start game button
startGameBtn.addEventListener('click', startGameWithConfig);

// =====================================
// GAME INITIALIZATION
// =====================================

/**
 * Initialize the game when page loads
 */
function initGame() {
    // Load saved scores from localStorage
    gameState.scores = loadScores();

    // Render initial game state
    renderScores();

    // Show mode selection on startup
    showModeSelection();
}

// Start the game when DOM is ready
initGame();
