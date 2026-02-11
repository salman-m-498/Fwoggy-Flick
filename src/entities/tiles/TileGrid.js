import { Tile } from './Tile.js';
import { NormalTile } from './NormalTile.js';
import { HardenedTile } from './HardenedTile.js';
import { BombTile } from './BombTile.js';
import { IceTile } from './IceTile.js';

// Tile spawn configuration - higher weight = more common
const TILE_SPAWN_CONFIG = [
    { tileClass: NormalTile, weight: 60 },
    { tileClass: BombTile, weight: 20 },
    { tileClass: HardenedTile, weight: 15 },
    { tileClass: IceTile, weight: 5 },
];

// Calculate total weight for normalization
const TOTAL_WEIGHT = TILE_SPAWN_CONFIG.reduce((sum, config) => sum + config.weight, 0);

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
        
        this.initializeGrid();
    }
    
    initializeGrid() {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                this.addTile(col, row);
            }
        }
    }
    
    addTile(col, row) {
        // Use weighted random selection
        const rand = Math.random() * TOTAL_WEIGHT;
        let cumulative = 0;
        let TileClass = NormalTile; // Fallback
        
        for (const config of TILE_SPAWN_CONFIG) {
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
                // Timer expired, restore speed
                this.scrollSpeed = this.originalScrollSpeed;
                this.freezeTimeRemaining = 0;
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

}
