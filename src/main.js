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
    ctx.fillText("Tongue Punch", canvas.width/2, canvas.height/2 - 50);

    // Draw Instructions
    ctx.fillStyle = 'white';
    ctx.textAlign = "center";
    ctx.font = '28px Arial';
    ctx.fillText("Press SPACE to Start", canvas.width/2, canvas.height/2+150);

    if (keys['Space']) {
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
    
    // Right Bar: From the end of the play zone to the canvas edge
    ctx.fillRect(GAME_CONFIG.rightBound, 0, canvas.width - GAME_CONFIG.rightBound, canvas.height);
}

function updatePhysics(deltaSeconds) {
    player.update(deltaSeconds);
    tongue.update(deltaSeconds, keysJustPressed['Space']);
    tileGrid.update(deltaSeconds);
    
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
            //Trigger bomb explosion on tile hit
            //if (flyingTile.constructor.name === 'BombTile' && typeof flyingTile.onDestroy === 'function') {
            //flyingTile.onDestroy(tileGrid);
            //}
        }

        // 2. Check Other Tiles
        const targets = tileGrid.tiles.filter(t => 
            t.type === 'solid' || 
            t.type === 'normal' || 
            t.type === 'bomb' ||
            t.type === 'hardened'
        );
        targets.forEach(otherTile => {
            if (flyingTile === otherTile) return;

            if (CollisionUtils.checkAABB(flyingTile, otherTile)) {
                // Trigger bomb explosion on tile hit
                if (flyingTile.constructor.name === 'BombTile' && typeof flyingTile.onDestroy === 'function') {
                    flyingTile.onDestroy(tileGrid);
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
                        flyingTile.registerBounce();
                    }
                }
                } else {
                    // Logic: Standard 'Solid' tile - destroy both
                    flyingTile.type = 'empty';
                    flyingTile.isMoving = false;
                    otherTile.type = 'empty';
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
                    // Grabbable: Latch onto it
                    tongue.onCollision(closestTile);
                    break;
                
                case 'hardened':
                    // Not Grabbable: "Clink" off and return
                    tongue.state = PLAYERSTATES.RETRACTING;
                    break;

                // Future Case Examples:
                // case 'sticky': tongue.stop(); break; 
                // case 'explosive': closestTile.explode(); break;

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

gameLoop();