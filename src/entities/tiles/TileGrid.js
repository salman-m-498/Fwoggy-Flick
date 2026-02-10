import { Tile } from './Tile.js';
import { NormalTile } from './NormalTile.js';
import { HardenedTile } from './HardenedTile.js';
import { BombTile } from './BombTile.js';

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
        const rand = Math.random();
        let tile;
        
        if (rand > 0.8) {
            tile = new HardenedTile(
                this.startX + col * this.tileSize,
                this.startY + row * this.tileSize,
                this.tileSize
            );
        } else if (rand > 0.6) {
            tile = new BombTile(
                this.startX + col * this.tileSize,
                this.startY + row * this.tileSize,
                this.tileSize
            );
        } else {
            tile = new NormalTile(
                this.startX + col * this.tileSize,
                this.startY + row * this.tileSize,
                this.tileSize
            );
        }
        
        this.tiles.push(tile);
    }
    
    update(deltaSeconds) {
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
        
        // Remove tiles that scrolled off the bottom
        // TODO: Add logic for player damage/game over if tiles reach a certain point
        this.removeOffscreenTiles();
    }
    
    spawnNewRow() {
        // Add a new row at the top (above visible area)
        for (let col = 0; col < this.cols; col++) {
            this.addTile(col, -1); // Row -1 (above screen)
        }
        this.rows++;
    }
    
    removeOffscreenTiles() {
        const bottomThreshold = 450; // Canvas height + buffer
        this.tiles = this.tiles.filter(tile => {
            if (tile.y > bottomThreshold && tile.type !== 'projectile') {
                // Optional: Trigger damage to player here
                return false; // Remove tile
            }
            return true;
        });
    }
    
    draw(ctx) {
        this.tiles.forEach(tile => tile.draw(ctx));
    }
    
    getLowestTileY() {
        // Helper to check if tiles reached the danger zone
        return Math.max(...this.tiles.map(t => t.y));
    }
}
