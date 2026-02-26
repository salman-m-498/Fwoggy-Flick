import { PLAYERSTATES } from './constants/States.js';
import { Frog, Tongue } from './entities/Player.js';
import { TileGrid } from './entities/tiles/index.js';
import { HeartDisplay } from './entities/HeartDisplay.js';
import { CollisionUtils } from './Collision.js';
import { GameManager, GAMESTATES } from './GameManager.js';
import {
    addScore,
    getBestScore,
    getPlayerScore,
    initBestScoreFromLeaderboard,
    loadLeaderboard,
    resetScore,
    saveScoreToLeaderboard,
    updateBestScore,
    updateScore
} from './Score.js';

// Polyfill for roundRect if not supported
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
        if (typeof radius === 'undefined') {
            radius = 5;
        }
        if (typeof radius === 'number') {
            radius = {tl: radius, tr: radius, br: radius, bl: radius};
        } else {
            const defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
            for (let side in defaultRadius) {
                radius[side] = radius[side] || defaultRadius[side];
            }
        }
        
        this.beginPath();
        this.moveTo(x + radius.tl, y);
        this.lineTo(x + width - radius.tr, y);
        this.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
        this.lineTo(x + width, y + height - radius.br);
        this.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
        this.lineTo(x + radius.bl, y + height);
        this.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
        this.lineTo(x, y + radius.tl);
        this.quadraticCurveTo(x, y, x + radius.tl, y);
        this.closePath();
        return this;
    };
}

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Auto-focus canvas for immediate keyboard input
canvas.focus();

const GAME_CONFIG = {
    playWidth: 500, // The width of the actual game area
    get leftBound() { return (canvas.width - this.playWidth) / 2; },
    get rightBound() { return (canvas.width + this.playWidth) / 2; },
};

// Reset game state
function resetGameState() {
    player.health = player.maxHealth;
    player.state = PLAYERSTATES.IDLE;
    player.canRotate = true;
    player.rotation = 0;
    player.frameIndex = 0;
    player.animTimer = 0;
    player.hasShield = false;
    player.shieldTime = 0;
    player.multishotCount = 0;
    player.damageFlashTime = 0;
    resetScore();
    
    // Clear tiles and reset grid
    tileGrid.tiles = [];
    tileGrid.startY = 0;
    tileGrid.rows = Math.floor(canvas.height / 2 / tileSize);
    tileGrid.scrollSpeed = 1;
    tileGrid.originalScrollSpeed = 1;
    tileGrid.initializeGrid();
    
    // Reset tongue
    tongue.state = PLAYERSTATES.IDLE;
    tongue.length = 0;
    tongue.attachedTile = null;
}

const player = new Frog(400, 350);

const tongue = new Tongue(player);

const heartDisplay = new HeartDisplay(20, 30, 3); // x, y, maxHearts

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

const gameManager = new GameManager({
    onReset: resetGameState
});

let keys = {};
let keysJustPressed = {};

let lastTime = 0;

// Listen for keyboard input
window.addEventListener('keydown', e => {
    // Prevent default browser behavior for game controls
    if (e.code === 'Space' || e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
    }
    if (!keys[e.code]) keysJustPressed[e.code] = true;
    keys[e.code] = true;
});
window.addEventListener('keyup', e => {
    // Prevent default browser behavior for game controls
    if (e.code === 'Space' || e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
    }
    keys[e.code] = false;
});

function update() {
    // Placeholder for future updates
}

function drawPauseOverlay() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.font = '36px Arial';
    ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2 - 10);

    ctx.font = '16px Arial';
    ctx.fillText('Press P or ESC to resume', canvas.width / 2, canvas.height / 2 + 24);
}

function handlePauseInput() {
    const pausePressed = keysJustPressed['Escape'] || keysJustPressed['KeyP'];
    if (!pausePressed) {
        return;
    }

    if (gameManager.getState() === GAMESTATES.PLAYING) {
        gameManager.pause();
    } else if (gameManager.getState() === GAMESTATES.PAUSED) {
        gameManager.resume();
    }

    keysJustPressed = {};
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
        gameManager.startGame();
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
    
    // Draw hearts using HeartDisplay
    heartDisplay.draw(ctx, player.health);
    
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = "left";
    ctx.fillText(`Score: ${getPlayerScore()}`, 20, 100);
    
    // Right Bar: From the end of the play zone to the canvas edge
    ctx.fillStyle = 'black';
    ctx.fillRect(GAME_CONFIG.rightBound, 0, canvas.width - GAME_CONFIG.rightBound, canvas.height);
    
    // Display best score on right bar
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.textAlign = "right";
    ctx.fillText(`Best: ${getBestScore()}`, canvas.width - 20, 30);
    
    // Display powerup status
    if (player.hasShield) {
        ctx.fillStyle = '#FFD700';
        ctx.fillText(`Shield: ${player.shieldTime.toFixed(1)}s`, canvas.width - 20, 60);
    }
    if (player.multishotCount > 0) {
        ctx.fillStyle = '#FF44FF';
        ctx.fillText(`Multishot: ${player.multishotCount}`, canvas.width - 20, 90);
    }
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
    ctx.fillText(`Score: ${getPlayerScore()}`, canvas.width/2, canvas.height/2 - 30);
    updateBestScore(getPlayerScore());
    
    // Draw Best Score
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText(`Best: ${getBestScore()}`, canvas.width/2, canvas.height/2 + 10);

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
        gameManager.toMenu();
    }
}

function updatePhysics(deltaSeconds) {
    updateScore(deltaSeconds);
    
    player.update(deltaSeconds);
    tongue.update(deltaSeconds, keysJustPressed['Space']);
    
    // Pass current score to grid for difficulty scaling
    tileGrid.setScore(getPlayerScore());
    
    // Add dynamic scroll speed scaling (gradual increase)
    const baseSpeed = 1;
    const speedIncrease = Math.min(getPlayerScore() / 100, 20) * 0.1; // Max 2x at score 2000
    const targetSpeed = baseSpeed + speedIncrease;
    
    // Only update if not frozen
    if (tileGrid.freezeTimeRemaining <= 0 && tileGrid.scrollSpeed !== 0) {
        tileGrid.originalScrollSpeed = targetSpeed;
        tileGrid.scrollSpeed = targetSpeed;
    }
    
    tileGrid.update(deltaSeconds);
    
    // Check for HeartTiles that reached player zone (bottom)
    const playerZoneY = 420; // Where player can collect hearts
    tileGrid.tiles.forEach(tile => {
        if (tile.constructor.name === 'HeartTile' && tile.y >= playerZoneY && !tile.collected) {
            if (tile.onPlayerContact && tile.onPlayerContact(player)) {
                console.log('Player collected heart!');
            }
        }
    });
    
    // Check for tiles that scrolled past player (triggers damage)
    tileGrid.removeOffscreenTiles(player);
    
    // Update heart display
    heartDisplay.update(deltaSeconds);
    
    // Check if player is dead
    if (player.state === PLAYERSTATES.DEATH) {
        saveScoreToLeaderboard(getPlayerScore());
        gameManager.toGameOver();
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
            t.type === 'ice' ||
            t.type === 'spike' ||
            t.type === 'poison' ||
            t.type === 'shield' ||
            t.type === 'multishot' ||
            t.type === 'slow'
        );
        targets.forEach(otherTile => {
            if (flyingTile === otherTile) return;

            if (CollisionUtils.checkAABB(flyingTile, otherTile)) {
                const tileName = otherTile.constructor.name;
                
                // Handle BombTile projectile
                if (flyingTile.constructor.name === 'BombTile' && typeof flyingTile.onDestroy === 'function') {
                    flyingTile.onDestroy(tileGrid);
                    addScore(10);
                    flyingTile.type = 'empty';
                    flyingTile.isMoving = false;
                    return;
                }
                
                // Handle IceTile/SlowTile projectile
                if ((flyingTile.constructor.name === 'IceTile' || flyingTile.constructor.name === 'SlowTile') 
                    && typeof flyingTile.onHit === 'function') {
                    flyingTile.onHit(tileGrid);
                    addScore(10);
                    flyingTile.type = 'empty';
                    flyingTile.isMoving = false;
                    return;
                }
                
                // Handle hitting different tile types
                if (tileName === 'SpikeTile') {
                    // SpikeTile is very tough and damages player when hit
                    if (otherTile.onHit) {
                        otherTile.onHit(flyingTile);
                    }
                    // Check if spike is destroyed
                    if (otherTile.health <= 0) {
                        otherTile.type = 'empty';
                        addScore(30); // Bonus for destroying spike
                    }
                    // Damage player
                    player.damage(1);
                    flyingTile.type = 'empty';
                    flyingTile.isMoving = false;
                    return;
                }
                
                if (tileName === 'HardenedTile') {
                    if (typeof otherTile.onHit === 'function') {
                        otherTile.onHit(flyingTile);
                        flyingTile.registerBounce();
                    }
                    return;
                }
                
                if (tileName === 'BombTile' && typeof otherTile.onDestroy === 'function') {
                    otherTile.onDestroy(tileGrid);
                    addScore(10);
                    flyingTile.registerBounce();
                    return;
                }
                
                if ((tileName === 'IceTile' || tileName === 'SlowTile') && typeof otherTile.onHit === 'function') {
                    otherTile.onHit(tileGrid);
                    addScore(10);
                    flyingTile.registerBounce();
                    return;
                }
                
                if (tileName === 'ShieldTile' && typeof otherTile.onDestroy === 'function') {
                    otherTile.onDestroy(player);
                    otherTile.type = 'empty';
                    addScore(15);
                    flyingTile.type = 'empty';
                    flyingTile.isMoving = false;
                    return;
                }
                
                if (tileName === 'MultishotTile' && typeof otherTile.onDestroy === 'function') {
                    otherTile.onDestroy(player);
                    otherTile.type = 'empty';
                    addScore(15);
                    flyingTile.type = 'empty';
                    flyingTile.isMoving = false;
                    return;
                }
                
                // Standard destruction (normal, poison, etc.)
                flyingTile.type = 'empty';
                flyingTile.isMoving = false;
                otherTile.type = 'empty';
                addScore(10);
                flyingTile.registerBounce();
            }
        });
    });

    const candidates = tileGrid.tiles.filter(t => 
        t.type !== 'empty' && 
        t.type !== 'held' && 
        t.type !== 'projectile' &&
        t.type !== 'heart' // Hearts don't interact with tongue
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
            // Check if tile is grabbable
            if (closestTile.canPickup !== undefined && closestTile.canPickup) {
                // Check for PoisonTile danger
                if (closestTile.constructor.name === 'PoisonTile' && closestTile.isDangerous) {
                    player.damage(1);
                    console.log('Grabbed poison tile! Took damage.');
                }
                // Grab the tile
                tongue.onCollision(closestTile);
            } else if (closestTile.type === 'hardened' || closestTile.type === 'spike') {
                // Not grabbable: bounce off
                tongue.state = PLAYERSTATES.RETRACTING;
            } else {
                // Default: try to grab if it's a known grabbable type
                switch (closestTile.type) {
                    case 'solid':
                    case 'normal':
                    case 'bomb':
                    case 'ice':
                    case 'slow':
                    case 'poison':
                    case 'shield':
                    case 'multishot':
                        tongue.onCollision(closestTile);
                        break;
                    
                    default:
                        tongue.state = PLAYERSTATES.RETRACTING;
                        break;
                }
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

    handlePauseInput();

    switch (gameManager.getState()) {
        case GAMESTATES.MENU:
            drawMenu();
            break;
            
        case GAMESTATES.PLAYING:
            drawGameWorld();
            drawHUD();
            checkCollisions();
            updatePhysics(deltaSeconds);
            break;

        case GAMESTATES.PAUSED:
            drawGameWorld();
            drawPauseOverlay();
            break;

        case GAMESTATES.GAMEOVER:
            drawGameOverScreen();
            break;
    }

    requestAnimationFrame(gameLoop);
}

// Initialize best score from past sessions
initBestScoreFromLeaderboard();

gameLoop();