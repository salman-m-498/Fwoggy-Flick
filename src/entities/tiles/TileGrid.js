import { Tile } from './Tile.js';
import { NormalTile } from './NormalTile.js';
import { HardenedTile } from './HardenedTile.js';
import { BombTile } from './BombTile.js';
import { IceTile } from './IceTile.js';
import { HeartTile } from './HeartTile.js';
import { SpikeTile } from './SpikeTile.js';
import { PoisonTile } from './PoisonTile.js';
import { ShieldTile } from './ShieldTile.js';
import { MultishotTile } from './MultishotTile.js';
import { SlowTile } from './SlowTile.js';

// Difficulty-based tile spawn configurations
// Easy (Score 0-200): Mostly normal tiles with some powerups
const SPAWN_CONFIG_EASY = [
    { tileClass: NormalTile, weight: 50 },
    { tileClass: BombTile, weight: 15 },
    { tileClass: IceTile, weight: 10 },
    { tileClass: HardenedTile, weight: 20 },
    { tileClass: HeartTile, weight: 3 },
    { tileClass: ShieldTile, weight: 2 },
];

// Medium (Score 200-500): Introduce hazards
const SPAWN_CONFIG_MEDIUM = [
    { tileClass: NormalTile, weight: 40 },
    { tileClass: BombTile, weight: 15 },
    { tileClass: HardenedTile, weight: 20 },
    { tileClass: SpikeTile, weight: 8 },
    { tileClass: IceTile, weight: 5 },
    { tileClass: SlowTile, weight: 3 },
    { tileClass: HeartTile, weight: 3 },
    { tileClass: ShieldTile, weight: 3 },
    { tileClass: MultishotTile, weight: 3 },
];

// Hard (Score 500+): More hazards, fewer normal tiles
const SPAWN_CONFIG_HARD = [
    { tileClass: NormalTile, weight: 30 },
    { tileClass: BombTile, weight: 15 },
    { tileClass: HardenedTile, weight: 22 },
    { tileClass: SpikeTile, weight: 12 },
    { tileClass: PoisonTile, weight: 5 },
    { tileClass: IceTile, weight: 3 },
    { tileClass: SlowTile, weight: 4 },
    { tileClass: HeartTile, weight: 2 },
    { tileClass: ShieldTile, weight: 4 },
    { tileClass: MultishotTile, weight: 3 },
];

// Function to get spawn config based on score
function getSpawnConfig(score) {
    if (score < 200) return SPAWN_CONFIG_EASY;
    if (score < 500) return SPAWN_CONFIG_MEDIUM;
    return SPAWN_CONFIG_HARD;
}

// In TileGrid.js
export class TileGrid {
    constructor(startX, startY, cols, rows, tileSize) {
        this.startX = startX;
        this.startY = startY; // Track the grid's top position
        this.cols = cols;
        this.rows = rows;
        this.tileSize = tileSize;
        this.tiles = [];
        this.scrollSpeed = 1; // pixels per second
        this.originalScrollSpeed = 1; // Store original speed
        this.freezeTimeRemaining = 0; // Time remaining in seconds
        this.slowTimeRemaining = 0; // Time remaining for slow effect
        this.slowMultiplier = 1; // Speed multiplier during slow
        this.currentScore = 0; // Track score for difficulty
        
        this.initializeGrid();
    }
    
    initializeGrid() {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                this.addTile(col, row);
            }
        }
    }
    
    setScore(score) {
        this.currentScore = score;
    }
    
    addTile(col, row) {
        // Get difficulty-appropriate spawn config
        const spawnConfig = getSpawnConfig(this.currentScore);
        const totalWeight = spawnConfig.reduce((sum, config) => sum + config.weight, 0);
        
        // Use weighted random selection
        const rand = Math.random() * totalWeight;
        let cumulative = 0;
        let TileClass = NormalTile; // Fallback
        
        for (const config of spawnConfig) {
            cumulative += config.weight;
            if (rand < cumulative) {
                TileClass = config.tileClass;
                break;
            }
        }
        
        const tile = new TileClass(
            this.startX + col * this.tileSize,
            this.startY + row * this.tileSize,
            this.tileSize
        );
        
        this.tiles.push(tile);
    }
    
    update(deltaSeconds, player) {
        // Handle freeze timer
        if (this.freezeTimeRemaining > 0) {
            this.freezeTimeRemaining -= deltaSeconds;
            
            if (this.freezeTimeRemaining <= 0) {
                // Timer expired, restore speed or apply slow
                if (this.slowTimeRemaining > 0) {
                    this.scrollSpeed = this.originalScrollSpeed * this.slowMultiplier;
                } else {
                    this.scrollSpeed = this.originalScrollSpeed;
                }
                this.freezeTimeRemaining = 0;
            }
        } else if (this.slowTimeRemaining > 0) {
            // Handle slow timer (after freeze)
            this.slowTimeRemaining -= deltaSeconds;
            
            if (this.slowTimeRemaining <= 0) {
                // Slow expired, restore speed
                this.scrollSpeed = this.originalScrollSpeed;
                this.slowTimeRemaining = 0;
                this.slowMultiplier = 1;
            }
        }
        
        // Move all tiles down
        this.startY += this.scrollSpeed * deltaSeconds;
        
        this.tiles.forEach(tile => {
            tile.y += this.scrollSpeed * deltaSeconds;
        });
        
        // Check if we need a new row at the top
        if (this.startY > this.tileSize) {
            this.spawnNewRow();
            this.startY -= this.tileSize; // Reset offset
        }
    }
    
    spawnNewRow() {
        // Add a new row at the top (above visible area)
        for (let col = 0; col < this.cols; col++) {
            this.addTile(col, -1); // Row -1 (above screen)
        }
        this.rows++;
    }

    draw(ctx) {
        this.tiles.forEach(tile => tile.draw(ctx));
    }
    
    removeOffscreenTiles(player) {
        const bottomThreshold = 450; // Canvas height + buffer
        this.tiles = this.tiles.filter(tile => {
            if (tile.y > bottomThreshold && tile.type !== 'projectile') {
                if (player) {
                    player.damage(1); // Damage the player
                }
                return false; // Remove tile
            }
            return true;
        });
    }
    freeze(duration) {
        // Store original speed if not already frozen
        if (this.freezeTimeRemaining <= 0) {
            this.originalScrollSpeed = this.scrollSpeed;
        }
        
        this.scrollSpeed = 0;
        this.freezeTimeRemaining = duration; // Duration in seconds
    }
    
    slowDown(duration, multiplier) {
        // Apply slow effect after freeze
        this.slowTimeRemaining = duration;
        this.slowMultiplier = multiplier;
    }

}
