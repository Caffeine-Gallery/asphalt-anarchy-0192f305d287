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
const TAP_THRESHOLD = 200;
const TIME_BONUS_RATE = 100;
const TIME_BONUS_INTERVAL = 1000;

// Game state
let canvas, ctx;
let gameLoop;
let score = 0;
let timeBonus = 0;
let speed = 0;
let playerX = CANVAS_WIDTH / 2;
let playerY = CANVAS_HEIGHT - 150;
let roadOffset = 0;
let opponents = [];
let monkeys = [];
let lastShotTime = 0;
let lastTimeBonusUpdate = 0;
let gameStartTime = 0;
let currentTime = 0;
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

function init() {
    canvas = document.getElementById('gameCanvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    ctx = canvas.getContext('2d');
    
    resetOpponents();
    
    document.addEventListener('keydown', e => keys[e.key] = true);
    document.addEventListener('keyup', e => keys[e.key] = false);
    
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

    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        touchState.moved = true;
    }

    playerX = Math.max(0, Math.min(CANVAS_WIDTH - PLAYER_WIDTH, playerX + deltaX));

    if (Math.abs(deltaY) > SWIPE_THRESHOLD) {
        speed = Math.max(0, Math.min(200, speed + deltaY * 0.1));
    }

    touchState.lastX = touch.clientX;
    touchState.lastY = touch.clientY;
}

function handleTouchEnd(e) {
    e.preventDefault();
    const touchDuration = Date.now() - touchState.startTime;
    
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
            speed: 2 + Math.random() * 2,
            type: 'bike'
        });
    }
}

function startGame() {
    gameState = 'playing';
    score = 0;
    timeBonus = 0;
    speed = 0;
    playerX = CANVAS_WIDTH / 2;
    gameStartTime = Date.now();
    lastTimeBonusUpdate = gameStartTime;
    monkeys = [];
    resetOpponents();
    hideAllMenus();
    if (gameLoop) cancelAnimationFrame(gameLoop);
    gameLoop = requestAnimationFrame(updateGame);
}

function hideAllMenus() {
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('gameOver').classList.add('hidden');
    document.getElementById('highScores').classList.add('hidden');
}

function showHitEffect(x, y, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 30, 0, Math.PI * 2);
    ctx.fill();
}

function shootMonkey() {
    const currentTime = Date.now();
    if (currentTime - lastShotTime >= FIRE_RATE && gameState === 'playing') {
        const newMonkey = {
            x: playerX + PLAYER_WIDTH / 2 - MONKEY_SIZE / 2,
            y: playerY,
            speed: 10
        };
        monkeys.push(newMonkey);
        lastShotTime = currentTime;
        showHitEffect(playerX + PLAYER_WIDTH / 2, playerY, 'rgba(255, 255, 0, 0.5)');
    }
}

function update() {
    if (gameState !== 'playing') return;

    if (keys[' ']) {
        shootMonkey();
    }
    if (keys['ArrowLeft']) playerX = Math.max(0, playerX - 5);
    if (keys['ArrowRight']) playerX = Math.min(CANVAS_WIDTH - PLAYER_WIDTH, playerX + 5);
    if (keys['ArrowUp']) speed = Math.min(200, speed + 1);
    if (keys['ArrowDown']) speed = Math.max(0, speed - 1);

    roadOffset = (roadOffset + ROAD_SPEED + speed/20) % 50;

    // Update monkeys
    for (let i = monkeys.length - 1; i >= 0; i--) {
        const monkey = monkeys[i];
        monkey.y -= monkey.speed;
        
        let hit = false;
        opponents.forEach((opponent, index) => {
            if (checkCollision(
                monkey.x, monkey.y, MONKEY_SIZE, MONKEY_SIZE,
                opponent.x, opponent.y, PLAYER_WIDTH, PLAYER_HEIGHT
            )) {
                hit = true;
                opponent.y = -200;
                opponent.x = Math.random() * (CANVAS_WIDTH - PLAYER_WIDTH);
                if (opponent.type === 'bike') {
                    score += 100;
                    showHitEffect(opponent.x + PLAYER_WIDTH/2, opponent.y + PLAYER_HEIGHT/2, 'rgba(255, 0, 0, 0.5)');
                }
            }
        });
        
        if (hit || monkey.y < -MONKEY_SIZE) {
            monkeys.splice(i, 1);
        }
    }

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
}

function updateGame(timestamp) {
    if (gameState !== 'playing') return;

    currentTime = Date.now();
    
    if (currentTime - lastTimeBonusUpdate >= TIME_BONUS_INTERVAL) {
        timeBonus += TIME_BONUS_RATE;
        lastTimeBonusUpdate = currentTime;
        
        document.getElementById('timeBonus').textContent = TIME_BONUS_RATE;
        setTimeout(() => {
            document.getElementById('timeBonus').textContent = '0';
        }, 500);
    }

    const survivalTime = Math.floor((currentTime - gameStartTime) / 1000);
    document.getElementById('time').textContent = survivalTime;

    update();
    
    document.getElementById('score').textContent = score + timeBonus;
    document.getElementById('speed').textContent = Math.floor(speed);
    
    gameLoop = requestAnimationFrame(updateGame);
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
    const finalScore = score + timeBonus;
    document.getElementById('finalScore').textContent = score;
    document.getElementById('finalTimeBonus').textContent = timeBonus;
    document.getElementById('totalScore').textContent = finalScore;
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
        const finalScore = score + timeBonus;
        await backend.addScore(name, finalScore);
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
