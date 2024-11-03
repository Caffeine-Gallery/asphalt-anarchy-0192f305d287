import { backend } from "declarations/backend";

// Game constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PLAYER_WIDTH = 60;
const PLAYER_HEIGHT = 100;
const ROAD_SPEED = 5;
const OPPONENT_COUNT = 3;
const MONKEY_SIZE = 30;
const FIRE_RATE = 500; // Milliseconds between shots

// Game state
let canvas, ctx;
let gameLoop;
let score = 0;
let speed = 0;
let playerX = CANVAS_WIDTH / 2;
let playerY = CANVAS_HEIGHT - 150;
let roadOffset = 0;
let opponents = [];
let monkeys = [];
let lastShotTime = 0;
let keys = {};
let gameState = 'menu'; // menu, playing, gameOver

// Initialize game
function init() {
    canvas = document.getElementById('gameCanvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    ctx = canvas.getContext('2d');
    
    // Initialize opponents
    resetOpponents();
    
    // Event listeners
    document.addEventListener('keydown', e => keys[e.key] = true);
    document.addEventListener('keyup', e => keys[e.key] = false);
    
    document.getElementById('startGame').addEventListener('click', startGame);
    document.getElementById('showScores').addEventListener('click', showHighScores);
    document.getElementById('submitScore').addEventListener('click', submitScore);
    document.getElementById('playAgain').addEventListener('click', () => {
        hideAllMenus();
        startGame();
    });
    document.getElementById('backToMenu').addEventListener('click', () => {
        hideAllMenus();
        document.getElementById('menu').classList.remove('hidden');
    });

    // Initialize Feather icons
    feather.replace();
}

function resetOpponents() {
    opponents = [];
    for (let i = 0; i < OPPONENT_COUNT; i++) {
        opponents.push({
            x: Math.random() * (CANVAS_WIDTH - PLAYER_WIDTH),
            y: -((i + 1) * 200),
            speed: 2 + Math.random() * 2
        });
    }
    monkeys = [];
}

function startGame() {
    gameState = 'playing';
    score = 0;
    speed = 0;
    playerX = CANVAS_WIDTH / 2;
    resetOpponents();
    hideAllMenus();
    if (gameLoop) cancelAnimationFrame(gameLoop);
    gameLoop = requestAnimationFrame(update);
}

function hideAllMenus() {
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('gameOver').classList.add('hidden');
    document.getElementById('highScores').classList.add('hidden');
}

function shootMonkey() {
    const currentTime = Date.now();
    if (currentTime - lastShotTime >= FIRE_RATE) {
        monkeys.push({
            x: playerX + PLAYER_WIDTH / 2 - MONKEY_SIZE / 2,
            y: playerY,
            speed: 10
        });
        lastShotTime = currentTime;
    }
}

function update() {
    if (gameState !== 'playing') return;

    // Handle shooting
    if (keys[' ']) {
        shootMonkey();
    }

    // Update player position
    if (keys['ArrowLeft']) playerX = Math.max(0, playerX - 5);
    if (keys['ArrowRight']) playerX = Math.min(CANVAS_WIDTH - PLAYER_WIDTH, playerX + 5);
    if (keys['ArrowUp']) speed = Math.min(200, speed + 1);
    if (keys['ArrowDown']) speed = Math.max(0, speed - 1);

    // Update road
    roadOffset = (roadOffset + ROAD_SPEED + speed/20) % 50;

    // Update monkeys
    monkeys = monkeys.filter(monkey => {
        monkey.y -= monkey.speed;
        
        // Check collision with opponents
        let hit = false;
        opponents.forEach((opponent, index) => {
            if (checkCollision(
                monkey.x, monkey.y, MONKEY_SIZE, MONKEY_SIZE,
                opponent.x, opponent.y, PLAYER_WIDTH, PLAYER_HEIGHT
            )) {
                hit = true;
                // Reset opponent
                opponent.y = -200;
                opponent.x = Math.random() * (CANVAS_WIDTH - PLAYER_WIDTH);
                score += 200;
            }
        });
        
        // Remove monkey if it's off screen or hit something
        return monkey.y > -MONKEY_SIZE && !hit;
    });

    // Update opponents
    opponents.forEach(opponent => {
        opponent.y += opponent.speed + speed/30;
        if (opponent.y > CANVAS_HEIGHT) {
            opponent.y = -200;
            opponent.x = Math.random() * (CANVAS_WIDTH - PLAYER_WIDTH);
            score += 100;
        }

        // Collision detection with player
        if (checkCollision(
            playerX, playerY, PLAYER_WIDTH, PLAYER_HEIGHT,
            opponent.x, opponent.y, PLAYER_WIDTH, PLAYER_HEIGHT
        )) {
            gameOver();
            return;
        }
    });

    // Draw everything
    draw();

    // Update score
    document.getElementById('score').textContent = score;
    document.getElementById('speed').textContent = Math.floor(speed);

    gameLoop = requestAnimationFrame(update);
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw road
    ctx.fillStyle = '#666';
    ctx.fillRect(100, 0, CANVAS_WIDTH - 200, CANVAS_HEIGHT);

    // Draw road lines
    ctx.strokeStyle = '#fff';
    ctx.setLineDash([20, 30]);
    for (let i = -50 + roadOffset; i < CANVAS_HEIGHT; i += 50) {
        ctx.beginPath();
        ctx.moveTo(CANVAS_WIDTH/2, i);
        ctx.lineTo(CANVAS_WIDTH/2, i + 30);
        ctx.stroke();
    }

    // Draw monkeys
    ctx.fillStyle = '#8B4513';
    monkeys.forEach(monkey => {
        ctx.fillRect(monkey.x, monkey.y, MONKEY_SIZE, MONKEY_SIZE);
    });

    // Draw player
    ctx.fillStyle = '#f00';
    ctx.fillRect(playerX, playerY, PLAYER_WIDTH, PLAYER_HEIGHT);

    // Draw opponents
    ctx.fillStyle = '#00f';
    opponents.forEach(opponent => {
        ctx.fillRect(opponent.x, opponent.y, PLAYER_WIDTH, PLAYER_HEIGHT);
    });
}

function checkCollision(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 &&
           x1 + w1 > x2 &&
           y1 < y2 + h2 &&
           y1 + h1 > y2;
}

function gameOver() {
    gameState = 'gameOver';
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOver').classList.remove('hidden');
    cancelAnimationFrame(gameLoop);
}

async function submitScore() {
    const name = document.getElementById('playerName').value.trim();
    if (!name) return;

    const loading = document.createElement('div');
    loading.className = 'loading';
    document.getElementById('gameOver').appendChild(loading);

    try {
        await backend.addScore(name, score);
        hideAllMenus();
        await showHighScores();
    } catch (error) {
        console.error('Error submitting score:', error);
    } finally {
        loading.remove();
    }
}

async function showHighScores() {
    hideAllMenus();
    document.getElementById('highScores').classList.remove('hidden');
    
    const loading = document.createElement('div');
    loading.className = 'loading';
    document.getElementById('highScores').appendChild(loading);

    try {
        const scores = await backend.getHighScores();
        const scoresList = document.getElementById('scoresList');
        scoresList.innerHTML = '';
        
        scores.forEach(([name, score], index) => {
            const scoreItem = document.createElement('div');
            scoreItem.className = 'score-item';
            scoreItem.innerHTML = `
                <span>${index + 1}. ${name}</span>
                <span>${score}</span>
            `;
            scoresList.appendChild(scoreItem);
        });
    } catch (error) {
        console.error('Error fetching scores:', error);
    } finally {
        loading.remove();
    }
}

// Start the game
window.addEventListener('load', init);
