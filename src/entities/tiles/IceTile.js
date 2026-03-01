import { Tile } from './Tile.js';

export class IceTile extends Tile {
    constructor(x, y, size) {
        super(x, y, size, 'ice');
        this.canPickup = true;
        
        // Color definitions for ice tile
        this.defaultColor = '#0993e2';      // Light blue
        this.heldColor = '#4182e5';         // Lighter blue when held
        this.projectileColor = '#d32f2f';   // Bright red when thrown
    }
    
    draw(ctx, images) {
        if (this.type === 'empty') return;
        
        ctx.save();
        
        const x = this.x + this.gapSize;
        const y = this.y + this.gapSize;
        const size = this.size - this.gapSize * 2;
        
        // Draw sprite
        if (images && images.iceTile) {
            ctx.drawImage(images.iceTile, x, y, size, size);
        }
        
        ctx.restore();
    }
    
    onHit(tileGrid) {
        tileGrid.freeze(5);
    }
}
    
    
