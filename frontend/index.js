import { backend } from "declarations/backend";

// Game constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PLAYER_WIDTH = 60;
const PLAYER_HEIGHT = 100;
const ROAD_SPEED = 5;
const OPPONENT_COUNT = 3;
const MONKEY_SIZE = 30;
const FIRE_RATE = 500;
const SWIPE_THRESHOLD = 30;
const TAP_THRESHOLD = 200; // Maximum ms for a touch to be considered a tap

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
let gameState = 'menu';
let touchState = {
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    startTime: 0,
    isMoving: false,
    moved: false
};

// Initialize game
function init() {
    canvas = document.getElementById('gameCanvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    ctx = canvas.getContext('2d');
    
    // Initialize opponents
    resetOpponents();
    
    // Event listeners for keyboard
    document.addEventListener('keydown', e => keys[e.key] = true);
    document.addEventListener('keyup', e => keys[e.key] = false);
    
    // Touch event listeners
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    
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

function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    touchState.startX = touch.clientX;
    touchState.startY = touch.clientY;
    touchState.lastX = touch.clientX;
    touchState.lastY = touch.clientY;
    touchState.startTime = Date.now();
    touchState.isMoving = true;
    touchState.moved = false;
}

function handleTouchMove(e) {
    e.preventDefault();
    if (!touchState.isMoving) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchState.lastX;
    const deltaY = touchState.lastY - touch.clientY;

    // If moved more than threshold, mark as moved
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        touchState.moved = true;
    }

    // Update player position based on horizontal swipe
    playerX = Math.max(0, Math.min(CANVAS_WIDTH - PLAYER_WIDTH, playerX + deltaX));

    // Update speed based on vertical swipe
    if (Math.abs(deltaY) > SWIPE_THRESHOLD) {
        speed = Math.max(0, Math.min(200, speed + deltaY * 0.1));
    }

    touchState.lastX = touch.clientX;
    touchState.lastY = touch.clientY;
}

function handleTouchEnd(e) {
    e.preventDefault();
    const touchDuration = Date.now() - touchState.startTime;
    
    // If touch was short and didn't move much, consider it a tap
    if (touchDuration < TAP_THRESHOLD && !touchState.moved && gameState === 'playing') {
        shootMonkey();
    }
    
    touchState.isMoving = false;
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
        
        // Add visual feedback for shooting
        ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.beginPath();
        ctx.arc(playerX + PLAYER_WIDTH / 2, playerY, 30, 0, Math.PI * 2);
        ctx.fill();
    }
}

function update() {
    if (gameState !== 'playing') return;

    // Handle keyboard controls
    if (keys[' ']) {
        shootMonkey();
    }
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
                opponent.y = -200;
                opponent.x = Math.random() * (CANVAS_WIDTH - PLAYER_WIDTH);
                score += 200;
            }
        });
        
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

        if (checkCollision(
            playerX, playerY, PLAYER_WIDTH, PLAYER_HEIGHT,
            opponent.x, opponent.y, PLAYER_WIDTH, PLAYER_HEIGHT
        )) {
            gameOver();
            return;
        }
    });

    draw();

    document.getElementById('score').textContent = score;
    document.getElementById('speed').textContent = Math.floor(speed);

    gameLoop = requestAnimationFrame(update);
}

function draw() {
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = '#666';
    ctx.fillRect(100, 0, CANVAS_WIDTH - 200, CANVAS_HEIGHT);

    ctx.strokeStyle = '#fff';
    ctx.setLineDash([20, 30]);
    for (let i = -50 + roadOffset; i < CANVAS_HEIGHT; i += 50) {
        ctx.beginPath();
        ctx.moveTo(CANVAS_WIDTH/2, i);
        ctx.lineTo(CANVAS_WIDTH/2, i + 30);
        ctx.stroke();
    }

    ctx.fillStyle = '#8B4513';
    monkeys.forEach(monkey => {
        ctx.fillRect(monkey.x, monkey.y, MONKEY_SIZE, MONKEY_SIZE);
    });

    ctx.fillStyle = '#f00';
    ctx.fillRect(playerX, playerY, PLAYER_WIDTH, PLAYER_HEIGHT);

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

window.addEventListener('load', init);
