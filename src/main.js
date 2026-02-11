import { PLAYERSTATES } from './constants/States.js';
import { Frog, Tongue } from './entities/Player.js';
import { TileGrid } from './entities/tiles/index.js';
import { CollisionUtils } from './Collision.js';
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const GAME_CONFIG = {
    playWidth: 500, // The width of the actual game area
    get leftBound() { return (canvas.width - this.playWidth) / 2; },
    get rightBound() { return (canvas.width + this.playWidth) / 2; },
};

const GAMEESTATES = {
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAMEOVER: 'GAMEOVER'
};

// ============================================
// SCORING & LEADERBOARD SYSTEM
// ============================================

let playerScore = 0;
let bestScore = 0;
let gameTimer = 0;
const LEADERBOARD_KEY = 'fwoggy-flick-leaderboard';

// Load leaderboard from localStorage
function loadLeaderboard() {
    try {
        const data = localStorage.getItem(LEADERBOARD_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Error loading leaderboard:', e);
        return [];
    }
}

// Save score to leaderboard
function saveScoreToLeaderboard(score) {
    try {
        const leaderboard = loadLeaderboard();
        leaderboard.push({
            score: score,
            date: new Date().toLocaleDateString(),
            timestamp: Date.now()
        });
        // Sort by score descending
        leaderboard.sort((a, b) => b.score - a.score);
        localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
    } catch (e) {
        console.error('Error saving score:', e);
    }
}

// Reset game state
function resetGameState() {
    player.health = player.maxHealth;
    player.state = PLAYERSTATES.IDLE;
    player.canRotate = true;
    player.rotation = 0;
    player.frameIndex = 0;
    player.animTimer = 0;
    playerScore = 0;
    gameTimer = 0;
    
    // Clear tiles and reset grid
    tileGrid.tiles = [];
    tileGrid.startY = 0;
    tileGrid.rows = Math.floor(canvas.height / 2 / tileSize);
    tileGrid.initializeGrid();
    
    // Reset tongue
    tongue.state = PLAYERSTATES.IDLE;
    tongue.length = 0;
    tongue.attachedTile = null;
}

const player = new Frog(400, 350);

const tongue = new Tongue(player);

const images = {};
let frogAtlas = null;

async function preloadAssets() {
    const loadImage = (src) => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });

    try {
        const [funcSheet, atlas] = await Promise.all([
            loadImage('./Sprites/fwoggie-ss.png'),
            fetch('./Sprites/fwoggie-ss.json').then(r => r.json())
        ]);

        images.frogSpritesheet = funcSheet;
        frogAtlas = atlas;
        
        console.log('Assets loaded!');
        // Game loop is already running
    } catch (e) {
        console.error('Error loading assets:', e);
    }
}

let currentState = GAMEESTATES.MENU;

let keys = {};
let keysJustPressed = {};

let lastTime = 0;

// Listen for keyboard input
window.addEventListener('keydown', e => {
    if (!keys[e.code]) keysJustPressed[e.code] = true;
    keys[e.code] = true;
});
window.addEventListener('keyup', e => keys[e.code] = false);

function update() {
    // Placeholder for future updates
}

function drawMenu() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Title
    ctx.fillStyle = 'white';
    ctx.textAlign = "center";
    ctx.font = '48px Arial';
    ctx.fillText("Tongue Punch", canvas.width/2, canvas.height/2 - 80);

    // Draw Instructions
    ctx.fillStyle = 'white';
    ctx.textAlign = "center";
    ctx.font = '20px Arial';
    ctx.fillText("Press SPACE to Start", canvas.width/2, canvas.height/2 + 20);

    // Draw Leaderboard
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = "center";
    ctx.fillText("TOP SCORES", canvas.width/2, canvas.height/2 + 60);
    
    const leaderboard = loadLeaderboard().slice(0, 5);
    ctx.fillStyle = 'white';
    ctx.font = '14px Arial';
    ctx.textAlign = "center";
    
    if (leaderboard.length === 0) {
        ctx.fillText("No scores yet", canvas.width/2, canvas.height/2 + 90);
    } else {
        leaderboard.forEach((entry, idx) => {
            ctx.fillText(`${idx + 1}. ${entry.score} — ${entry.date}`, canvas.width/2, canvas.height/2 + 85 + (idx * 20));
        });
    }

    if (keys['Space']) {
        keysJustPressed['Space'] = false; // Consume the key
        resetGameState();
        currentState = GAMEESTATES.PLAYING;
    }
}

const tileSize = 30;
const cols = Math.floor(GAME_CONFIG.playWidth / tileSize);
const rows = Math.floor(canvas.height / 2 / tileSize);
const gridWidth = cols * tileSize;
const startX = GAME_CONFIG.leftBound + (GAME_CONFIG.playWidth - gridWidth) / 2;

const tileGrid = new TileGrid(
    startX,
    0,     // startY
    cols,
    rows,
    tileSize
);

function drawGameWorld() {
    ctx.fillStyle = 'lightblue';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    tileGrid.draw(ctx);
    
    // Draw attached tile on top if it exists
    if (tongue.attachedTile) {
        tongue.attachedTile.draw(ctx);
    }

    player.draw(ctx, images, frogAtlas);
    tongue.draw(ctx);
}

function drawHUD() {
    ctx.fillStyle = 'black';
    // Left Bar: From 0 to the start of the play zone
    ctx.fillRect(0, 0, GAME_CONFIG.leftBound, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = "left";
    ctx.fillText(`Health: ${player.health}/${player.maxHealth}`, 20, 30);
    ctx.fillText(`Score: ${playerScore}`, 20, 60);
    
    // Right Bar: From the end of the play zone to the canvas edge
    ctx.fillStyle = 'black';
    ctx.fillRect(GAME_CONFIG.rightBound, 0, canvas.width - GAME_CONFIG.rightBound, canvas.height);
    
    // Display best score on right bar
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.textAlign = "right";
    ctx.fillText(`Best: ${bestScore}`, canvas.width - 20, 30);
}

function drawGameOverScreen() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Game Over Text
    ctx.fillStyle = 'white';
    ctx.textAlign = "center";
    ctx.font = '48px Arial';
    ctx.fillText("GAME OVER!", canvas.width/2, canvas.height/2 - 100);

    // Draw Final Score
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 36px Arial';
    ctx.fillText(`Score: ${playerScore}`, canvas.width/2, canvas.height/2 - 30);
    
    // Update best score
    if (playerScore > bestScore) {
        bestScore = playerScore;
    }
    
    // Draw Best Score
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText(`Best: ${bestScore}`, canvas.width/2, canvas.height/2 + 10);

    // Draw Top 10 Leaderboard
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 16px Arial';
    ctx.fillText("TOP 10 ALL-TIME", canvas.width/2, canvas.height/2 + 50);
    
    const leaderboard = loadLeaderboard().slice(0, 10);
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.textAlign = "center";
    
    leaderboard.forEach((entry, idx) => {
        const text = `${idx + 1}. ${entry.score} — ${entry.date}`;
        ctx.fillText(text, canvas.width/2, canvas.height/2 + 65 + (idx * 14));
    });

    // Draw Instructions
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText("Press SPACE to return to Menu", canvas.width/2, canvas.height - 40);

    if (keys['Space']) {
        keysJustPressed['Space'] = false; // Consume the key
        currentState = GAMEESTATES.MENU;
    }
}

function updatePhysics(deltaSeconds) {
    // Track game time for scoring
    gameTimer += deltaSeconds;
    
    // Award 1 point per 100ms survived
    const newScore = Math.floor(gameTimer * 10); // 10 points per second = 1 point per 100ms
    if (newScore > playerScore) {
        playerScore = newScore;
    }
    
    player.update(deltaSeconds);
    tongue.update(deltaSeconds, keysJustPressed['Space']);
    tileGrid.update(deltaSeconds);
    
    // Check for tiles that scrolled past player (triggers damage)
    tileGrid.removeOffscreenTiles(player);
    
    // Check if player is dead
    if (player.state === PLAYERSTATES.DEATH) {
        saveScoreToLeaderboard(playerScore);
        currentState = GAMEESTATES.GAMEOVER;
    }
    
    // Update all tiles (for projectiles)
    tileGrid.tiles.forEach(t => t.update(deltaSeconds));

    // Reset one-frame inputs
    keysJustPressed = {};
}

function checkCollisions() {

    // 0. Tongue Boundary Check
    if (tongue.state === PLAYERSTATES.EXTENDING && tongue.length > 0) {
        const tongueTip = tongue.rotatePoint(0, -tongue.length);
        // Create a temporary object with size for the check
        const tipObj = { x: tongueTip.x, y: tongueTip.y, size: 10 }; 
        
        if (CollisionUtils.checkBoundaries(tipObj, canvas) != null) {
            tongue.state = PLAYERSTATES.RETRACTING;
        }
    }

    tileGrid.tiles.filter(t => t.type === 'projectile').forEach(flyingTile => {
        
        // 1. Check Canvas Boundaries
        const wall = CollisionUtils.checkBoundaries(flyingTile, canvas);
        if (wall) {
            if (wall === 'left' || wall === 'right') flyingTile.velocity.x *= -1;
            if (wall === 'top' || wall === 'bottom') flyingTile.velocity.y *= -1;

            flyingTile.registerBounce();
        }

        // 2. Check Other Tiles
        const targets = tileGrid.tiles.filter(t => 
            t.type === 'solid' || 
            t.type === 'normal' || 
            t.type === 'bomb' ||
            t.type === 'hardened'||
            t.type === 'ice'
        );
        targets.forEach(otherTile => {
            if (flyingTile === otherTile) return;

            if (CollisionUtils.checkAABB(flyingTile, otherTile)) {
                // Trigger bomb explosion on tile hit
                if (flyingTile.constructor.name === 'BombTile' && typeof flyingTile.onDestroy === 'function') {
                    flyingTile.onDestroy(tileGrid);
                    playerScore += 10; // Award points for bomb destruction
                    flyingTile.type = 'empty';
                    flyingTile.isMoving = false;
                    return; // Exit early since bomb exploded
                }
                // Trigger ice freeze on tile hit
                if (flyingTile.constructor.name === 'IceTile' && typeof flyingTile.onHit === 'function') {
                    flyingTile.onHit(tileGrid);
                    playerScore += 10; // Award points for ice destruction
                    flyingTile.type = 'empty';
                    flyingTile.isMoving = false;
                    return; // Exit early since bomb exploded
                }
                if (otherTile.type === 'hardened') {
                    // Logic: Damage the wall, bounce the projectile
                    // This assumes otherTile is an instance of HardenedTile class
                    if (typeof otherTile.onHit === 'function') {
                        otherTile.onHit(flyingTile);
                        flyingTile.registerBounce();
                    }
                if (otherTile.type === 'bomb') {
                    // Logic: trigger other collided bombs
                    if (otherTile.constructor.name === 'BombTile' && typeof otherTile.onDestroy === 'function') {
                        otherTile.onDestroy(tileGrid);
                        playerScore += 10; // Award points for bomb destruction
                        flyingTile.registerBounce();
                    }
                }
                if (otherTile.type === 'ice') {
                    // Logic: trigger collided ice tile
                    if (otherTile.constructor.name === 'IceTile' && typeof otherTile.onHit === 'function') {
                        otherTile.onHit(tileGrid);
                        playerScore += 10; // Award points for ice destruction
                        flyingTile.registerBounce();
                    }
                }
                } else {
                    // Logic: Standard 'Solid' tile - destroy both
                    flyingTile.type = 'empty';
                    flyingTile.isMoving = false;
                    otherTile.type = 'empty';
                    playerScore += 10; // Award points for tile destruction
                    flyingTile.registerBounce();
                }
            }
        });
    });

    const candidates = tileGrid.tiles.filter(t => 
        t.type !== 'empty' && 
        t.type !== 'held' && 
        t.type !== 'projectile'
    );

    if(tongue.state === PLAYERSTATES.EXTENDING && tongue.length > 0) {
        const tongueTip = tongue.rotatePoint(0, -tongue.length);

        // Find the closest colliding tile regardless of type
        let closestTile = null;
        let closestDist = Infinity;
        
        for (let tile of candidates) {
            if (CollisionUtils.checkAABB(tongue, tile)) {
                
                // Refinement: Check distance to center to ensure we pick the first one hit
                const tileCenterX = tile.x + tile.size / 2;
                const tileCenterY = tile.y + tile.size / 2;
                const dist = Math.hypot(tongueTip.x - tileCenterX, tongueTip.y - tileCenterY);
                
                if (dist < closestDist) {
                    closestDist = dist;
                    closestTile = tile;
                }
            }
        }
        
        if (closestTile) {
            // CENTRALIZED INTERACTION LOGIC
            switch (closestTile.type) {
                case 'solid':
                case 'normal':
                case 'bomb':
                case 'ice':
                    // Grabbable: Latch onto it
                    tongue.onCollision(closestTile);
                    break;
                
                case 'hardened':
                    // Not Grabbable: "Clink" off and return
                    tongue.state = PLAYERSTATES.RETRACTING;
                    break;

                default:
                    // Safety fallback
                    tongue.state = PLAYERSTATES.RETRACTING;
                    break;
            }
        }
    }
}

preloadAssets();

function gameLoop(timestamp) {
    if (!lastTime) {
        lastTime = timestamp;
    }

    const deltaSeconds = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    //ctx.clearRect(0, 0, canvas.width, canvas.height);

    switch (currentState) {
        case GAMEESTATES.MENU:
            drawMenu();
            break;
            
        case GAMEESTATES.PLAYING:
            drawGameWorld();
            drawHUD();
            checkCollisions();
            updatePhysics(deltaSeconds);
            break;

        case GAMEESTATES.PAUSED:
            drawGameWorld();
            drawPauseOverlay();
            break;

        case GAMEESTATES.GAMEOVER:
            drawGameOverScreen();
            break;
    }

    requestAnimationFrame(gameLoop);
}

// Initialize best score from past sessions
bestScore = Math.max(...loadLeaderboard().map(entry => entry.score || 0), 0);

gameLoop();