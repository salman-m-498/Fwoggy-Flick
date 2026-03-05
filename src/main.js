import { PLAYERSTATES } from './constants/States.js';
import { Frog, Tongue } from './entities/Player.js';
import { TileGrid } from './entities/tiles/index.js';
import { HeartDisplay } from './entities/HeartDisplay.js';
import { CollisionUtils } from './Collision.js';
import { GameManager, GAMESTATES } from './GameManager.js';
import { ParticleSystem } from './ParticleSystem.js';
import {
    addScore,
    addComboHit,
    updateCombo,
    resetCombo,
    getComboState,
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

// ── Fullscreen toggle + canvas scaling ───────────────────────────────────────────
(function () {
    const btn = document.getElementById('fullscreenBtn');
    const container = canvas.parentElement; // .canvas-container
    const CANVAS_W = canvas.width;  // 800 — intrinsic, never changes
    const CANVAS_H = canvas.height; // 400
    const ASPECT   = CANVAS_W / CANVAS_H;

    function scaleToFit() {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        let w = vw, h = vw / ASPECT;
        if (h > vh) { h = vh; w = vh * ASPECT; }
        canvas.style.width  = Math.floor(w) + 'px';
        canvas.style.height = Math.floor(h) + 'px';
    }

    function resetScale() {
        canvas.style.width  = '';
        canvas.style.height = '';
    }

    function enterFS() {
        if (container.requestFullscreen)           container.requestFullscreen();
        else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
    }
    function exitFS() {
        if (document.exitFullscreen)           document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }

    btn.addEventListener('click', () => {
        const isFS = !!(document.fullscreenElement || document.webkitFullscreenElement);
        if (isFS) exitFS(); else enterFS();
        canvas.focus();
    });

    function onFSChange() {
        const isFS = !!(document.fullscreenElement || document.webkitFullscreenElement);
        container.classList.toggle('is-fullscreen', isFS);
        if (isFS) {
            scaleToFit();
            window.addEventListener('resize', scaleToFit);
        } else {
            window.removeEventListener('resize', scaleToFit);
            resetScale();
        }
        canvas.focus();
    }
    document.addEventListener('fullscreenchange',       onFSChange);
    document.addEventListener('webkitfullscreenchange', onFSChange);
})();

const GAME_CONFIG = {
    playWidth: 500, // The width of the actual game area
    get leftBound() { return (canvas.width - this.playWidth) / 2; },
    get rightBound() { return (canvas.width + this.playWidth) / 2; },
};

// ── Arcade HUD palette ───────────────────────────────────────────────────────
const HUD = {
    bg:           '#0c0c0c',
    border:       '#1e3a1e',
    divider:      '#252525',
    textPrimary:  '#d4ffd4',
    textMuted:    '#667766',
    textDim:      '#445544',
    neonGreen:    '#44ff88',
    neonGreenGlow:'#00ff44',
    arcadeYellow: '#ffee00',
    arcadeYellowGlow: '#ffcc00',
    // Tile swatch colours
    tileHeart:    '#ff6699',
    tileShield:   '#ffee00',
    tileMulti:    '#00ffff',
    tileIce:      '#44aaff',
    tileSlow:     '#5566ff',
    tileBomb:     '#ff4422',
    tileSpike:    '#ff9944',
    tilePoison:   '#bb44ff',
    tileHard:     '#aa8855',
    tileNormal:   '#44cc44',
    // Status pill colours
    pillShield:   '#ffdd00',
    pillMulti:    '#ff44ff',
    pillFreeze:   '#44ffff',
    pillSlow:     '#4488ff',
    PIXEL_FONT:   '"Press Start 2P", monospace',
};

// Reset game state
function resetGameState() {
    player.health = player.maxHealth;
    player.state = PLAYERSTATES.IDLE;
    player.canRotate = true;
    player.rotation = 0;
    player.squashTime = 0;
    player.squashAmount = 0;
    player.deathRotation = 0;
    player.deathAlpha = 1;
    player.lastVelocityY = 0;
    player.lastMoveDir = 0;
    player.hasShield = false;
    player.shieldTime = 0;
    player.multishotCount = 0;
    player.hasMultishot = false;
    player.damageFlashTime = 0;
    player.storedPowerUp = null;
    deathTransitionTimer = 0;
    screenShake.intensity = 0;
    screenShake.duration  = 0;
    scorePopups = [];
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

// Give frog and tongue the play-area bounds
player.leftBound  = GAME_CONFIG.leftBound;
player.rightBound = GAME_CONFIG.rightBound;
tongue.setBounds(GAME_CONFIG.leftBound, GAME_CONFIG.rightBound, 0);

const heartDisplay = new HeartDisplay(20, 30, 3); // x, y, maxHearts

const images = {};

async function preloadAssets() {
    const loadImage = (src) => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });

    try {
        const [frogSprite, normalTile, bombTile, hardenedTile, hardenedCrackedTile, 
               heartTile, iceTile, multishotTile, poisonTile, shieldTile, slowTile, spikeTile] = await Promise.all([
            loadImage('./Sprites/fwoggie.png'),
            loadImage('./Sprites/tiles/normal.png'),
            loadImage('./Sprites/tiles/bomb.png'),
            loadImage('./Sprites/tiles/hardened.png'),
            loadImage('./Sprites/tiles/hardenedcracked.png'),
            loadImage('./Sprites/tiles/heart.png'),
            loadImage('./Sprites/tiles/ice.png'),
            loadImage('./Sprites/tiles/multishot.png'),
            loadImage('./Sprites/tiles/poison.png'),
            loadImage('./Sprites/tiles/shield.png'),
            loadImage('./Sprites/tiles/slow.png'),
            loadImage('./Sprites/tiles/spike.png')
        ]);

        images.frogSprite = frogSprite;
        images.normalTile = normalTile;
        images.bombTile = bombTile;
        images.hardenedTile = hardenedTile;
        images.hardenedCrackedTile = hardenedCrackedTile;
        images.heartTile = heartTile;
        images.iceTile = iceTile;
        images.multishotTile = multishotTile;
        images.poisonTile = poisonTile;
        images.shieldTile = shieldTile;
        images.slowTile = slowTile;
        images.spikeTile = spikeTile;
        
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
    if (e.code === 'Space' || e.code === 'Escape' || e.code === 'KeyP' ||
        e.code === 'KeyQ' ||
        e.code === 'ArrowLeft' || e.code === 'ArrowRight' ||
        e.code === 'ArrowUp'   || e.code === 'ArrowDown') {
        e.preventDefault();
    }
    if (!keys[e.code]) keysJustPressed[e.code] = true;
    keys[e.code] = true;
});
window.addEventListener('keyup', e => {
    // Prevent default browser behavior for game controls
    if (e.code === 'Space' || e.code === 'Escape' || e.code === 'KeyP' ||
        e.code === 'KeyQ' ||
        e.code === 'ArrowLeft' || e.code === 'ArrowRight' ||
        e.code === 'ArrowUp'   || e.code === 'ArrowDown') {
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
    ctx.fillText("Fwoggy Flick", canvas.width/2, canvas.height/2 - 80);

    // Draw Controls
    ctx.fillStyle = 'white';
    ctx.textAlign = "center";
    ctx.font = '16px Arial';
    ctx.fillText("\u2190 \u2192  Move    \u2191 \u2193  Aim    SPACE  Fire", canvas.width/2, canvas.height/2 - 20);

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

const particles = new ParticleSystem(500);

// ── Death transition state ────────────────────────────────────────────────────
let deathTransitionTimer = 0;

// ── Screen shake ─────────────────────────────────────────────────────────────
let screenShake = { intensity: 0, duration: 0 };
function addShake(intensity, duration) {
    if (intensity > screenShake.intensity) {
        screenShake.intensity = intensity;
        screenShake.duration  = duration;
    }
}

// ── Floating score popups ─────────────────────────────────────────────────────
let scorePopups = [];
function spawnPopup(x, y, text, color = '#FFD700', large = false) {
    scorePopups.push({ x, y, text, color, alpha: 1, vy: -55, time: 0, large });
}
/** Calls addComboHit() and fires a tier-up popup at (x,y) when a new tier is reached */
function comboHit(x, y) {
    const newMult = addComboHit();
    if (newMult) spawnPopup(x, y, `COMBO x${newMult}!`, '#ff8844', true);
}

const TILE_COLORS = {
    NormalTile:     '#44cc44',
    BombTile:       '#ff4422',
    IceTile:        '#44aaff',
    SlowTile:       '#5566ff',
    PoisonTile:     '#bb44ff',
    SpikeTile:      '#ff9944',
    HardenedTile:   '#aa8855',
    ShieldTile:     '#ffee00',
    MultishotTile:  '#00ffff',
    HeartTile:      '#ff6699',
    PowerUpTile:    '#ffffff',
};
function tileColor(tile) { return TILE_COLORS[tile.constructor.name] || '#aaffaa'; }
function tileCenter(tile) { return { x: tile.x + tile.size / 2, y: tile.y + tile.size / 2 }; }

function drawGameWorld() {
    // ── Screen shake ──
    const shakeX = screenShake.intensity > 0 ? (Math.random() - 0.5) * screenShake.intensity : 0;
    const shakeY = screenShake.intensity > 0 ? (Math.random() - 0.5) * screenShake.intensity : 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);

    ctx.fillStyle = 'lightblue';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ── Danger zone: tiles near the offscreen threshold glow red ──
    const DANGER_Y = 450;
    const DANGER_BAND = 50;
    const dangerPulse = 0.2 + Math.abs(Math.sin(performance.now() * 0.004)) * 0.25;
    tileGrid.tiles.forEach(tile => {
        if (tile.type === 'empty' || tile.type === 'projectile') return;
        const depth = (tile.y - (DANGER_Y - DANGER_BAND)) / DANGER_BAND;
        if (depth > 0) {
            const alpha = Math.min(depth, 1) * dangerPulse;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#ff2200';
            ctx.fillRect(tile.x + tile.gapSize, tile.y + tile.gapSize,
                         tile.size - tile.gapSize * 2, tile.size - tile.gapSize * 2);
            ctx.restore();
        }
    });

    tileGrid.draw(ctx, images);
    particles.draw(ctx);

    // ── Floating score popups ──
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    scorePopups.forEach(p => {
        ctx.globalAlpha = p.alpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur  = p.large ? 10 : 5;
        ctx.fillStyle   = p.color;
        ctx.font        = p.large ? `bold 13px ${HUD.PIXEL_FONT}` : `bold 8px ${HUD.PIXEL_FONT}`;
        ctx.fillText(p.text, p.x, p.y);
    });
    ctx.globalAlpha  = 1;
    ctx.shadowBlur   = 0;
    ctx.textBaseline = 'alphabetic';

    // Draw attached tile on top if it exists
    if (tongue.attachedTile) {
        tongue.attachedTile.draw(ctx, images);
    }

    player.draw(ctx, images);
    tongue.draw(ctx);

    // ── Low-HP vignette ──
    if (player.health === 1 && player.state !== PLAYERSTATES.DEATH) {
        const vigAlpha = 0.3 + Math.sin(performance.now() / 250) * 0.15;
        const grad = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, canvas.height * 0.2,
            canvas.width / 2, canvas.height / 2, canvas.height * 0.85
        );
        grad.addColorStop(0, 'rgba(200,0,0,0)');
        grad.addColorStop(1, `rgba(200,0,0,${vigAlpha})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // ── End screen shake transform ──
    ctx.restore();
}

// ── HUD helper drawing functions ─────────────────────────────────────────────

/** Dotted pixel divider line */
function hudDivider(y, x0, x1) {
    ctx.fillStyle = HUD.divider;
    for (let x = x0 + 4; x < x1 - 4; x += 5) {
        ctx.fillRect(x, y, 3, 1);
    }
}

/** Small section label with 2px left accent bar */
function hudLabel(x, y, text, color = HUD.textMuted) {
    ctx.fillStyle = HUD.neonGreen;
    ctx.fillRect(x, y - 7, 2, 9);
    ctx.fillStyle = color;
    ctx.font = `6px ${HUD.PIXEL_FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(text, x + 6, y);
}

/** Active-status pill: coloured left bar + glowing text */
function hudPill(x, y, color, text) {
    const w = 130, h = 15;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 3, h);
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.globalAlpha = 1;
    ctx.shadowColor = color;
    ctx.shadowBlur = 5;
    ctx.fillStyle = HUD.textPrimary;
    ctx.font = `6px ${HUD.PIXEL_FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(text, x + 7, y + 10);
    ctx.shadowBlur = 0;
}

/** Keyboard key chip */
function hudKey(x, y, label) {
    const fontSize = 6;
    ctx.font = `${fontSize}px ${HUD.PIXEL_FONT}`;
    const tw = ctx.measureText(label).width;
    const kw = tw + 10, kh = 13;
    ctx.fillStyle = '#1e2e1e';
    ctx.fillRect(x, y, kw, kh);
    ctx.fillStyle = '#2e462e';
    ctx.fillRect(x, y, kw, kh - 2);
    ctx.strokeStyle = '#3a5a3a';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, kw - 1, kh - 1);
    ctx.fillStyle = HUD.neonGreen;
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 5, y + 10);
    return kw;
}

/** Control row: key chip + action text */
function hudControl(x, y, keyLabel, actionText) {
    const kw = hudKey(x, y, keyLabel);
    ctx.fillStyle = HUD.textPrimary;
    ctx.font = `6px ${HUD.PIXEL_FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(actionText, x + kw + 5, y + 10);
}

/** Tile sprite entry for the right bar — uses actual game sprite with glow */
function hudTileEntry(x, y, img, glowColor, name, desc) {
    const S = 14; // sprite size
    if (img) {
        // Glow halo behind sprite
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 7;
        ctx.drawImage(img, x, y, S, S);
        ctx.shadowBlur = 0;
    } else {
        // Fallback: solid colour square
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 5;
        ctx.fillStyle = glowColor;
        ctx.fillRect(x, y, S, S);
        ctx.shadowBlur = 0;
    }
    // Name
    ctx.fillStyle = HUD.textPrimary;
    ctx.font = `6px ${HUD.PIXEL_FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(name, x + S + 4, y + 7);
    // Desc (smaller, muted)
    ctx.fillStyle = HUD.textMuted;
    ctx.font = `5px ${HUD.PIXEL_FONT}`;
    ctx.fillText(desc, x + S + 4, y + 15);
}

/** Scanline CRT pass over a rect */
function hudScanlines(x, y, w, h) {
    ctx.fillStyle = 'rgba(0,0,0,0.13)';
    for (let sy = y; sy < y + h; sy += 3) {
        ctx.fillRect(x, sy, w, 1);
    }
}

/** Arcade glow text (centred in a given x range) */
function hudGlowText(text, cx, y, size, color, glowColor, glowStrength = 10) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = glowStrength;
    ctx.fillStyle = color;
    ctx.font = `bold ${size}px ${HUD.PIXEL_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(text, cx, y);
    ctx.shadowBlur = 0;
}

// ── Left bar ──────────────────────────────────────────────────────────────────
function drawHUD_left() {
    const LX = 0, LW = GAME_CONFIG.leftBound; // 0–150
    const cx = LX + LW / 2;  // centre x = 75
    const now = performance.now() * 0.001;

    // Background
    ctx.fillStyle = HUD.bg;
    ctx.fillRect(LX, 0, LW, canvas.height);

    // Right border glow
    ctx.strokeStyle = HUD.border;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(LW - 1, 0);
    ctx.lineTo(LW - 1, canvas.height);
    ctx.stroke();

    // ── TITLE ──
    hudGlowText('FWOGGY', cx, 18, 8, HUD.neonGreen, HUD.neonGreenGlow, 14);
    hudGlowText('FLICK',  cx, 31, 8, HUD.neonGreen, HUD.neonGreenGlow, 14);

    hudDivider(39, LX, LW);

    // ── HEALTH ──
    hudLabel(10, 52, 'HEALTH');
    const shake = (heartDisplay && heartDisplay.shakeIntensity > 0 && heartDisplay.shakeDuration > 0)
        ? (Math.random() - 0.5) * heartDisplay.shakeIntensity : 0;
    const heartSpacing = 22;
    const hxBase = cx - (player.maxHealth * heartSpacing) / 2 + heartSpacing / 2;
    for (let i = 0; i < player.maxHealth; i++) {
        const hx = hxBase + i * heartSpacing + shake;
        const hy = 60 + shake;
        const filled = i < player.health;
        if (filled) { ctx.shadowColor = HUD.tileHeart; ctx.shadowBlur = 8; }
        const s = 13;
        ctx.save();
        ctx.translate(hx, hy + s / 2);
        ctx.font = `${s}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = filled ? HUD.tileHeart : '#2a1a1a';
        ctx.fillText(filled ? '♥' : '♡', 0, 0);
        ctx.restore();
        ctx.shadowBlur = 0;
    }
    ctx.textBaseline = 'alphabetic';

    hudDivider(80, LX, LW);

    // ── SCORE ──
    hudLabel(10, 92, 'SCORE');
    const pulseMul = 0.7 + 0.3 * Math.sin(now * 3);
    const score = getPlayerScore();
    ctx.shadowColor = HUD.arcadeYellowGlow;
    ctx.shadowBlur = 8 * pulseMul;
    ctx.fillStyle = HUD.arcadeYellow;
    ctx.font = `10px ${HUD.PIXEL_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(String(score).padStart(6, '0'), cx, 108);
    ctx.shadowBlur = 0;

    hudDivider(116, LX, LW);

    // ── COMBO BAR ──
    const combo = getComboState();
    hudLabel(10, 128, 'COMBO');
    const barX = 10, barY = 133, barW = LW - 20, barH = 8;
    // Background track
    ctx.fillStyle = '#1a2a1a';
    ctx.fillRect(barX, barY, barW, barH);
    if (combo.count > 0) {
        // Fill colour based on multiplier tier
        const barColor = combo.multiplier >= 8 ? '#ff2244'
                       : combo.multiplier >= 5 ? '#ff8800'
                       : combo.multiplier >= 3 ? '#ffdd00'
                       : '#44ff88';
        const fillW = Math.round(barW * combo.barFill);
        ctx.shadowColor = barColor;
        ctx.shadowBlur = 6;
        ctx.fillStyle = barColor;
        ctx.fillRect(barX, barY, fillW, barH);
        ctx.shadowBlur = 0;
        // Multiplier text
        ctx.fillStyle = barColor;
        ctx.font = `bold 7px ${HUD.PIXEL_FONT}`;
        ctx.textAlign = 'center';
        ctx.shadowColor = barColor;
        ctx.shadowBlur = 8;
        ctx.fillText(`x${combo.multiplier}`, cx, barY + barH + 10);
        ctx.shadowBlur = 0;
    } else {
        ctx.fillStyle = HUD.textDim;
        ctx.font = `6px ${HUD.PIXEL_FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('x1', cx, barY + barH + 10);
    }
    // Tick marks at multiplier thresholds (5, 10, 20, 35 hits out of 35 max)
    [5, 10, 20, 35].forEach(threshold => {
        ctx.fillStyle = '#445544';
        ctx.fillRect(barX + Math.round(barW * threshold / 35), barY - 1, 1, barH + 2);
    });

    hudDivider(157, LX, LW);

    // ── CONTROLS ──
    hudLabel(10, 168, 'CONTROLS');
    hudControl(10, 173, 'SPC', 'FIRE');
    hudControl(10, 190, '←→',  'MOVE');
    hudControl(10, 207, '↑↓',  'AIM');
    hudControl(10, 224, 'P',   'PAUSE');
    hudControl(10, 241, 'Q',   'POWER');

    hudDivider(258, LX, LW);

    // ── STATUS (active effects only) ──
    const statusItems = [];
    if (player.hasShield)
        statusItems.push([HUD.pillShield,  `SHIELD ${player.shieldTime.toFixed(1)}s`]);
    if (player.multishotCount > 0)
        statusItems.push([HUD.pillMulti,   `MULTI  x${player.multishotCount}`]);
    if (tileGrid.freezeTimeRemaining > 0)
        statusItems.push([HUD.pillFreeze,  `FROZEN ${tileGrid.freezeTimeRemaining.toFixed(1)}s`]);
    if (tileGrid.slowTimeRemaining > 0)
        statusItems.push([HUD.pillSlow,    `SLOWED ${tileGrid.slowTimeRemaining.toFixed(1)}s`]);

    if (statusItems.length > 0) {
        hudLabel(10, 268, 'STATUS');
        statusItems.forEach(([col, txt], i) => {
            hudPill(10, 272 + i * 19, col, txt);
        });
    } else {
        ctx.fillStyle = HUD.textDim;
        ctx.font = `6px ${HUD.PIXEL_FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('-- no effects --', cx, 273);
    }

    // CRT scanlines
    hudScanlines(LX, 0, LW, canvas.height);
}

// ── Right bar ─────────────────────────────────────────────────────────────────
function drawHUD_right() {
    const RX = GAME_CONFIG.rightBound, RW = canvas.width - RX; // 650–800
    const cx = RX + RW / 2; // centre = 725
    const lx = RX + 8;      // left margin inside bar

    // Background
    ctx.fillStyle = HUD.bg;
    ctx.fillRect(RX, 0, RW, canvas.height);

    // Left border glow
    ctx.strokeStyle = HUD.border;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(RX + 1, 0);
    ctx.lineTo(RX + 1, canvas.height);
    ctx.stroke();

    // ── TITLE ──
    hudGlowText('TILE',  cx, 18, 8, HUD.neonGreen, HUD.neonGreenGlow, 14);
    hudGlowText('GUIDE', cx, 31, 8, HUD.neonGreen, HUD.neonGreenGlow, 14);

    hudDivider(39, RX, RX + RW);

    // ── POWERUPS ──
    ctx.fillStyle = HUD.neonGreen;
    ctx.fillRect(lx, 44, 2, 8);
    ctx.fillStyle = '#aaffbb';
    ctx.font = `6px ${HUD.PIXEL_FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText('POWERUPS', lx + 6, 51);

    // Each entry: sprite(14×14) + name(6px) + desc(5px), row height 21px
    hudTileEntry(lx, 56,  images.heartTile,    HUD.tileHeart,  'HEART',  'grab to heal');
    hudTileEntry(lx, 77,  images.shieldTile,   HUD.tileShield, 'SHIELD', '3s safe');
    hudTileEntry(lx, 98,  images.multishotTile, HUD.tileMulti, 'MULTI',  '3x fire');
    hudTileEntry(lx, 119, images.iceTile,       HUD.tileIce,   'ICE',    'freeze 5s');
    hudTileEntry(lx, 140, images.slowTile,      HUD.tileSlow,  'SLOW',   'frz+slow');
    hudTileEntry(lx, 161, images.bombTile,      HUD.tileBomb,  'BOMB',   'explodes!');

    hudDivider(182, RX, RX + RW);

    // ── HAZARDS ──
    ctx.fillStyle = '#ff6666';
    ctx.fillRect(lx, 187, 2, 8);
    ctx.fillStyle = '#ffaaaa';
    ctx.font = `6px ${HUD.PIXEL_FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText('HAZARDS', lx + 6, 194);

    hudTileEntry(lx, 199, images.spikeTile,    HUD.tileSpike,  'SPIKE',  'deflects!');
    hudTileEntry(lx, 220, images.poisonTile,   HUD.tilePoison, 'POISON', 'tongue burn');
    hudTileEntry(lx, 241, images.hardenedTile, HUD.tileHard,   'HARD',   '2 hits');
    hudTileEntry(lx, 262, images.normalTile,   HUD.tileNormal, 'NORMAL', 'standard');

    hudDivider(283, RX, RX + RW);

    // ── STORED POWER-UP SLOT ──
    hudLabel(lx, 295, 'POWER-UP');
    const slotX = lx, slotY = 300, slotW = RW - 16, slotH = 28;
    ctx.fillStyle = '#111111';
    ctx.fillRect(slotX, slotY, slotW, slotH);
    ctx.strokeStyle = player.storedPowerUp ? '#ffffff' : '#333333';
    ctx.lineWidth = 1;
    ctx.strokeRect(slotX + 0.5, slotY + 0.5, slotW - 1, slotH - 1);

    if (player.storedPowerUp) {
        const hue = ((performance.now() * 0.06) % 360);
        const slotCol = `hsl(${hue}, 100%, 65%)`;
        ctx.shadowColor = slotCol;
        ctx.shadowBlur  = 8;
        ctx.fillStyle   = slotCol;
        ctx.font = `bold 7px ${HUD.PIXEL_FONT}`;
        ctx.textAlign = 'center';
        const icon = player.storedPowerUp === 'LINE_H' ? '← →'
                   : player.storedPowerUp === 'LINE_V' ? '↑ ↓'
                   : '✦ NUKE';
        ctx.fillText(icon, RX + RW / 2, slotY + 12);
        ctx.shadowBlur = 0;
        ctx.fillStyle  = HUD.textMuted;
        ctx.font = `5px ${HUD.PIXEL_FONT}`;
        ctx.fillText('[Q] to use', RX + RW / 2, slotY + 22);
    } else {
        ctx.fillStyle = HUD.textDim;
        ctx.font = `5px ${HUD.PIXEL_FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('EMPTY  [Q]', RX + RW / 2, slotY + 16);
    }

    hudDivider(333, RX, RX + RW);

    // ── BEST SCORE ──
    hudLabel(lx, 345, 'BEST SCORE');
    const best = getBestScore();
    ctx.shadowColor = HUD.arcadeYellowGlow;
    ctx.shadowBlur = 7;
    ctx.fillStyle = HUD.arcadeYellow;
    ctx.font = `10px ${HUD.PIXEL_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(String(best).padStart(6, '0'), cx, 363);
    ctx.shadowBlur = 0;

    // CRT scanlines
    hudScanlines(RX, 0, RW, canvas.height);
}

function drawHUD() {
    drawHUD_left();
    drawHUD_right();
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
    updateCombo(deltaSeconds);

    // Tick screen shake
    if (screenShake.duration > 0) {
        screenShake.duration -= deltaSeconds;
        if (screenShake.duration <= 0) {
            screenShake.intensity = 0;
            screenShake.duration  = 0;
        }
    }

    // Advance floating score popups
    scorePopups = scorePopups.filter(p => {
        p.time += deltaSeconds;
        p.y    += p.vy * deltaSeconds;
        p.alpha = Math.max(0, 1 - p.time / 0.8);
        return p.alpha > 0;
    });
    
    player.update(deltaSeconds, tongue, keys);
    tongue.update(deltaSeconds, keysJustPressed['Space'], tileGrid);
    
    // Pass current score to grid for difficulty scaling
    tileGrid.setScore(getPlayerScore());
    
    // Add dynamic scroll speed scaling (gradual increase)
    const baseSpeed = 1;
    const speedIncrease = Math.min(getPlayerScore() / 100, 20) * 0.1; // Max 2x at score 2000
    const targetSpeed = baseSpeed + speedIncrease;
    
    // Only update speed if not frozen AND not in a slow phase
    if (tileGrid.freezeTimeRemaining <= 0 && tileGrid.slowTimeRemaining <= 0) {
        tileGrid.originalScrollSpeed = targetSpeed;
        tileGrid.scrollSpeed = targetSpeed;
    }
    
    tileGrid.update(deltaSeconds);
    particles.update(deltaSeconds);

    // Heart tile grabbed by tongue: heal immediately when retracted instead of shooting
    if (tongue.state === PLAYERSTATES.LOADED &&
        tongue.attachedTile &&
        tongue.attachedTile.constructor.name === 'HeartTile') {
        const hc = tileCenter(tongue.attachedTile);
        particles.powerup(hc.x, hc.y, '#ff6699');
        particles.powerup(player.x, player.y, '#ff6699', 8);
        player.health = Math.min(player.health + 1, player.maxHealth);
        tongue.attachedTile.type = 'empty';
        tongue.attachedTile = null;
        tongue.state = PLAYERSTATES.IDLE;
        tongue.length = 0;
    }

    // PowerUpTile grabbed by tongue: store the power-up type instead of shooting
    if (tongue.state === PLAYERSTATES.LOADED &&
        tongue.attachedTile &&
        tongue.attachedTile.constructor.name === 'PowerUpTile') {
        const pc = tileCenter(tongue.attachedTile);
        const hue = ((tongue.attachedTile.hueTime * 60) % 360);
        const col = `hsl(${hue}, 100%, 65%)`;
        particles.powerup(pc.x, pc.y, col);
        particles.powerup(player.x, player.y, col, 8);
        player.storedPowerUp = tongue.attachedTile.powerType;
        tongue.attachedTile.type = 'empty';
        tongue.attachedTile = null;
        tongue.state = PLAYERSTATES.IDLE;
        tongue.length = 0;
    }

    // Q key: activate stored power-up
    if (keysJustPressed['KeyQ'] && player.storedPowerUp) {
        const combo = getComboState();
        if (player.storedPowerUp === 'LINE_H') {
            const rowY = tileGrid.getBottomRowY();
            const cleared = tileGrid.clearRow(rowY);
            if (cleared > 0) {
                // Particle strip across the row
                for (let i = 0; i < 8; i++) {
                    const px = GAME_CONFIG.leftBound + (i / 7) * GAME_CONFIG.playWidth;
                    particles.bombExplosion(px, rowY);
                }
                const ptsLH = Math.round(cleared * 150 * combo.multiplier);
                addScore(ptsLH);
                spawnPopup(GAME_CONFIG.leftBound + GAME_CONFIG.playWidth / 2, rowY - 20, `+${ptsLH}`, '#FFD700', true);
                addShake(10, 0.35);
                comboHit(GAME_CONFIG.leftBound + GAME_CONFIG.playWidth / 2, rowY - 30);
            }
        } else if (player.storedPowerUp === 'LINE_V') {
            const colX = player.x;
            const cleared = tileGrid.clearColumn(colX);
            if (cleared > 0) {
                for (let i = 0; i < 5; i++) {
                    const py = 30 + i * 80;
                    particles.bombExplosion(colX, py);
                }
                const ptsLV = Math.round(cleared * 150 * combo.multiplier);
                addScore(ptsLV);
                spawnPopup(colX, 180, `+${ptsLV}`, '#FFD700', true);
                addShake(10, 0.35);
                comboHit(colX, 170);
            }
        } else if (player.storedPowerUp === 'NUKE') {
            // Clear bottom 3 rows
            let totalCleared = 0;
            const rowY1 = tileGrid.getBottomRowY();
            totalCleared += tileGrid.clearRow(rowY1);
            totalCleared += tileGrid.clearRow(rowY1 - tileGrid.tileSize);
            totalCleared += tileGrid.clearRow(rowY1 - tileGrid.tileSize * 2);
            particles.bombExplosion(player.x, 200);
            particles.bombExplosion(GAME_CONFIG.leftBound + 80,  200);
            particles.bombExplosion(GAME_CONFIG.rightBound - 80, 200);
            if (totalCleared > 0) {
                const ptsNuke = Math.round(totalCleared * 200 * combo.multiplier);
                addScore(ptsNuke);
                spawnPopup(canvas.width / 2, 160, `NUKE! +${ptsNuke}`, '#ff4422', true);
                addShake(16, 0.55);
                comboHit(canvas.width / 2, 150);
            }
        }
        player.storedPowerUp = null;
    }

    // Check for tiles that scrolled past player (triggers damage)
    tileGrid.removeOffscreenTiles(player, (tile) => {
        particles.playerHurt(player.x, player.y, 10);
        addShake(8, 0.3);
        resetCombo();
    });
    
    // Update heart display
    heartDisplay.update(deltaSeconds);
    
    // Check if player is dead — begin transition instead of hard-cutting
    if (player.state === PLAYERSTATES.DEATH &&
        gameManager.getState() === GAMESTATES.PLAYING) {
        deathTransitionTimer = 0;
        tileGrid.scrollSpeed = 0;
        gameManager.setState(GAMESTATES.DEATH_TRANSITION);
    }
    
    // Update all tiles (for projectiles)
    tileGrid.tiles.forEach(t => t.update(deltaSeconds));

    // Reset one-frame inputs
    keysJustPressed = {};
}

function checkCollisions() {
    // Tongue boundary is now handled internally by the Tongue (wall ricochet).

    tileGrid.tiles.filter(t => t.type === 'projectile').forEach(flyingTile => {
        
        // 1. Check Canvas Boundaries
        const wall = CollisionUtils.checkBoundaries(flyingTile, canvas);
        if (wall) {
            if (wall === 'left' || wall === 'right') flyingTile.velocity.x *= -1;
            if (wall === 'top' || wall === 'bottom') flyingTile.velocity.y *= -1;

            flyingTile.registerBounce();
        }

        // 2. Check Other Tiles (exclude empty, projectile, held, and heart tiles)
        const targets = tileGrid.tiles.filter(t => 
            t !== flyingTile &&
            t.type !== 'empty' && 
            t.type !== 'projectile' && 
            t.type !== 'held' &&
            t.constructor.name !== 'HeartTile'
        );
        targets.forEach(otherTile => {
            if (flyingTile === otherTile) return;

            if (CollisionUtils.checkAABB(flyingTile, otherTile)) {
                const tileName = otherTile.constructor.name;
                
                // Handle BombTile projectile
                if (flyingTile.constructor.name === 'BombTile' && typeof flyingTile.onDestroy === 'function') {
                    const bc = tileCenter(flyingTile);
                    particles.bombExplosion(bc.x, bc.y);
                    flyingTile.onDestroy(tileGrid);
                    const pts75 = Math.round(75 * getComboState().multiplier);
                    addScore(pts75);
                    spawnPopup(bc.x, bc.y - 10, `+${pts75}`, '#ff4422');
                    addShake(12, 0.4);
                    comboHit(bc.x, bc.y - 20);
                    flyingTile.isMoving = false;
                    return;
                }
                
                // Handle IceTile/SlowTile projectile
                if ((flyingTile.constructor.name === 'IceTile' || flyingTile.constructor.name === 'SlowTile') 
                    && typeof flyingTile.onHit === 'function') {
                    const fc = tileCenter(flyingTile);
                    particles.tileDestroy(fc.x, fc.y, tileColor(flyingTile));
                    flyingTile.onHit(tileGrid);
                    const pts80a = Math.round(80 * getComboState().multiplier);
                    addScore(pts80a);
                    spawnPopup(fc.x, fc.y - 10, `+${pts80a}`, '#44aaff');
                    comboHit(fc.x, fc.y - 20);
                    flyingTile.type = 'empty';
                    flyingTile.isMoving = false;
                    return;
                }
                
                // Handle hitting different tile types
                if (tileName === 'SpikeTile') {
                    // SpikeTile reflects projectile; player is NOT damaged by hitting it
                    const sc = tileCenter(otherTile);
                    if (otherTile.onHit) {
                        otherTile.onHit(flyingTile);
                    }
                    if (otherTile.health <= 0) {
                        particles.tileDestroy(sc.x, sc.y, tileColor(otherTile), 14);
                        otherTile.type = 'empty';
                        const pts200 = Math.round(200 * getComboState().multiplier);
                        addScore(pts200);
                        spawnPopup(sc.x, sc.y - 10, `+${pts200}`, '#ff9944');
                        addShake(6, 0.2);
                        comboHit(sc.x, sc.y - 20);
                    } else {
                        particles.tileHit(sc.x, sc.y, tileColor(otherTile));
                        flyingTile.registerBounce();
                        const pts30 = Math.round(30 * getComboState().multiplier);
                        addScore(pts30);
                        spawnPopup(sc.x, sc.y - 10, `+${pts30}`, '#ff9944');
                        addShake(4, 0.15);
                        comboHit(sc.x, sc.y - 20);
                    }
                    const fc2 = tileCenter(flyingTile);
                    particles.tileDestroy(fc2.x, fc2.y, tileColor(flyingTile), 6);
                    flyingTile.type = 'empty';
                    flyingTile.isMoving = false;
                    return;
                }
                
                if (tileName === 'HardenedTile') {
                    if (typeof otherTile.onHit === 'function') {
                        const hc = tileCenter(otherTile);
                        otherTile.onHit(flyingTile);
                        if (otherTile.hp <= 0) {
                            particles.tileDestroy(hc.x, hc.y, tileColor(otherTile), 12);
                            const pts150 = Math.round(150 * getComboState().multiplier);
                            addScore(pts150);
                            spawnPopup(hc.x, hc.y - 10, `+${pts150}`, '#aa8855');
                            addShake(5, 0.2);
                            comboHit(hc.x, hc.y - 20);
                        } else {
                            particles.tileHit(hc.x, hc.y, tileColor(otherTile));
                            const pts50 = Math.round(50 * getComboState().multiplier);
                            addScore(pts50);
                            spawnPopup(hc.x, hc.y - 10, `+${pts50}`, '#aa8855');
                            addShake(4, 0.15);
                            comboHit(hc.x, hc.y - 20);
                            flyingTile.registerBounce();
                        }
                    }
                    return;
                }
                
                if (tileName === 'BombTile' && typeof otherTile.onDestroy === 'function') {
                    const bc = tileCenter(otherTile);
                    particles.bombExplosion(bc.x, bc.y);
                    otherTile.onDestroy(tileGrid);
                    const pts75b = Math.round(75 * getComboState().multiplier);
                    addScore(pts75b);
                    spawnPopup(bc.x, bc.y - 10, `+${pts75b}`, '#ff4422');
                    addShake(12, 0.4);
                    comboHit(bc.x, bc.y - 20);
                    flyingTile.registerBounce();
                    return;
                }
                
                if ((tileName === 'IceTile' || tileName === 'SlowTile') && typeof otherTile.onHit === 'function') {
                    const ic = tileCenter(otherTile);
                    particles.tileDestroy(ic.x, ic.y, tileColor(otherTile));
                    otherTile.onHit(tileGrid);
                    const pts80b = Math.round(80 * getComboState().multiplier);
                    addScore(pts80b);
                    spawnPopup(ic.x, ic.y - 10, `+${pts80b}`, '#44aaff');
                    comboHit(ic.x, ic.y - 20);
                    flyingTile.registerBounce();
                    return;
                }
                
                if (tileName === 'ShieldTile' && typeof otherTile.onDestroy === 'function') {
                    const cx = otherTile.x + otherTile.size / 2;
                    const cy = otherTile.y + otherTile.size / 2;
                    particles.powerup(cx, cy, tileColor(otherTile));
                    otherTile.onDestroy(player);
                    otherTile.type = 'empty';
                    const pts100s = Math.round(100 * getComboState().multiplier);
                    addScore(pts100s);
                    spawnPopup(cx, cy - 10, `+${pts100s}`, '#ffee00');
                    comboHit(cx, cy - 20);
                    flyingTile.type = 'empty';
                    flyingTile.isMoving = false;
                    return;
                }

                // ShieldTile or MultishotTile thrown as projectile — still grant effect
                if (flyingTile.constructor.name === 'ShieldTile' && typeof flyingTile.onDestroy === 'function') {
                    const cx = flyingTile.x + flyingTile.size / 2;
                    const cy = flyingTile.y + flyingTile.size / 2;
                    particles.powerup(cx, cy, tileColor(flyingTile));
                    flyingTile.onDestroy(player);
                    flyingTile.type = 'empty';
                    flyingTile.isMoving = false;
                    otherTile.type = 'empty';
                    const pts100sf = Math.round(100 * getComboState().multiplier);
                    addScore(pts100sf);
                    spawnPopup(cx, cy - 10, `+${pts100sf}`, '#ffee00');
                    comboHit(cx, cy - 20);
                    return;
                }
                
                if (tileName === 'MultishotTile' && typeof otherTile.onDestroy === 'function') {
                    const cx = otherTile.x + otherTile.size / 2;
                    const cy = otherTile.y + otherTile.size / 2;
                    particles.powerup(cx, cy, tileColor(otherTile));
                    otherTile.onDestroy(player);
                    otherTile.type = 'empty';
                    const pts100m = Math.round(100 * getComboState().multiplier);
                    addScore(pts100m);
                    spawnPopup(cx, cy - 10, `+${pts100m}`, '#00ffff');
                    comboHit(cx, cy - 20);
                    flyingTile.type = 'empty';
                    flyingTile.isMoving = false;
                    return;
                }

                if (flyingTile.constructor.name === 'MultishotTile' && typeof flyingTile.onDestroy === 'function') {
                    const cx = flyingTile.x + flyingTile.size / 2;
                    const cy = flyingTile.y + flyingTile.size / 2;
                    particles.powerup(cx, cy, tileColor(flyingTile));
                    flyingTile.onDestroy(player);
                    flyingTile.type = 'empty';
                    flyingTile.isMoving = false;
                    otherTile.type = 'empty';
                    const pts100mf = Math.round(100 * getComboState().multiplier);
                    addScore(pts100mf);
                    spawnPopup(cx, cy - 10, `+${pts100mf}`, '#00ffff');
                    comboHit(cx, cy - 20);
                    return;
                }
                
                // Standard destruction (normal, poison, etc.)
                const fc = tileCenter(flyingTile);
                const oc = tileCenter(otherTile);
                particles.tileDestroy(fc.x, fc.y, tileColor(flyingTile));
                particles.tileDestroy(oc.x, oc.y, tileColor(otherTile));
                flyingTile.type = 'empty';
                flyingTile.isMoving = false;
                otherTile.type = 'empty';
                const pts100n = Math.round(100 * getComboState().multiplier);
                addScore(pts100n);
                spawnPopup(oc.x, oc.y - 10, `+${pts100n}`, '#44cc44');
                comboHit(oc.x, oc.y - 20);
                flyingTile.registerBounce();
            }
        });
    });

    const candidates = tileGrid.tiles.filter(t => 
        t.type !== 'empty' && 
        t.type !== 'held' && 
        t.type !== 'projectile'
    );

    if(tongue.state === PLAYERSTATES.EXTENDING && tongue.length > 0) {
        const tongueTip = tongue.getTipPosition();
        const tipRadius = tongue.width; // hit-box radius around tip

        // Tip-in-tile bounds check — correct after ricochets
        // (checkAABB uses tongue.getVertices() which only covers the first segment)
        let closestTile = null;
        let closestDist = Infinity;
        
        for (let tile of candidates) {
            const inBounds = tongueTip.x >= tile.x - tipRadius &&
                             tongueTip.x <= tile.x + tile.size + tipRadius &&
                             tongueTip.y >= tile.y - tipRadius &&
                             tongueTip.y <= tile.y + tile.size + tipRadius;
            if (inBounds) {
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
            // Check if tile is grabbable using canPickup property
            if (closestTile.canPickup) {
                // Check for poison tile - only damages when touched by tongue
                if (closestTile.constructor.name === 'PoisonTile') {
                    player.damage(1);
                    resetCombo();
                    particles.playerHurt(player.x, player.y);
                    addShake(8, 0.3);
                }
                // Grab the tile
                const gc = tileCenter(closestTile);
                particles.tongueGrab(gc.x, gc.y, tileColor(closestTile));
                tongue.onCollision(closestTile);
            } else {
                // Not grabbable: bounce off — emit impact chips for feedback
                const bc = tileCenter(closestTile);
                particles.tileHit(bc.x, bc.y, tileColor(closestTile));
                tongue.state = PLAYERSTATES.RETRACTING;
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

        case GAMESTATES.DEATH_TRANSITION: {
            deathTransitionTimer += deltaSeconds;
            drawGameWorld();
            drawHUD();
            // Phase 1 (0–1.2s): red vignette grows in
            if (deathTransitionTimer < 1.2) {
                const vigAlpha = (deathTransitionTimer / 1.2) * 0.65;
                const grad = ctx.createRadialGradient(
                    canvas.width / 2, canvas.height / 2, canvas.height * 0.1,
                    canvas.width / 2, canvas.height / 2, canvas.height * 0.85
                );
                grad.addColorStop(0, 'rgba(180,0,0,0)');
                grad.addColorStop(1, `rgba(180,0,0,${vigAlpha})`);
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            // Phase 2 (1.2–1.8s): fade to black
            if (deathTransitionTimer >= 1.2) {
                const blackAlpha = Math.min((deathTransitionTimer - 1.2) / 0.6, 1);
                ctx.fillStyle = `rgba(0,0,0,${blackAlpha})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            // Phase 3 (1.8s+): switch to game over
            if (deathTransitionTimer >= 1.8) {
                saveScoreToLeaderboard(getPlayerScore());
                gameManager.toGameOver();
            }
            break;
        }

        case GAMESTATES.GAMEOVER:
            drawGameOverScreen();
            break;
    }

    requestAnimationFrame(gameLoop);
}

// Initialize best score from past sessions
initBestScoreFromLeaderboard();

gameLoop();