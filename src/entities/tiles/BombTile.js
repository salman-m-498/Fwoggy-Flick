import { Tile } from './Tile.js';

export class BombTile extends Tile {
    constructor(x, y, size) {
        super(x, y, size, 'bomb');
        this.canPickup = true;
        this.explosionRadius = 1; // Affects neighboring tiles in a 3x3 area
        
        // Color definitions for bomb tile
        this.defaultColor = '#212121';      // Dark gray/black
        this.heldColor = '#424242';         // Lighter gray when held
        this.projectileColor = '#d32f2f';   // Bright red when thrown
    }
    
    draw(ctx) {
        if (this.type === 'empty') return;
        
        ctx.save();
        
        const x = this.x + this.gapSize;
        const y = this.y + this.gapSize;
        const size = this.size - this.gapSize * 2;
        
        // Draw rounded tile
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.fillStyle = this.getColor();
        ctx.roundRect(x, y, size, size, 4);
        ctx.fill();
        ctx.stroke();
        
        // Draw bomb emoji
        ctx.fillStyle = '#FF4444';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${size * 0.6}px Arial`;
        ctx.fillText('💣', x + size / 2, y + size / 2);
        
        ctx.restore();
    }
    
    onDestroy(tileGrid) {
    // Convert from world coordinates to grid coordinates
    const gridCol = Math.floor((this.x - tileGrid.startX) / tileGrid.tileSize);
    const gridRow = Math.floor((this.y - tileGrid.startY) / tileGrid.tileSize);
    
    // Iterate through all tiles and check if they're within explosion radius
    tileGrid.tiles.forEach(tile => {
        // Calculate the tile's grid position
        const tileCol = Math.floor((tile.x - tileGrid.startX) / tileGrid.tileSize);
        const tileRow = Math.floor((tile.y - tileGrid.startY) / tileGrid.tileSize);
        
        // Check if tile is within the explosion radius
        if (Math.abs(tileCol - gridCol) <= this.explosionRadius &&
            Math.abs(tileRow - gridRow) <= this.explosionRadius) {
            
            // Destroy the tile
            if (tile.type !== 'empty') {
                tile.type = 'empty';
            }
        }
    });
    }
}
