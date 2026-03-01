import { Tile } from './Tile.js';
import { ArcadeRenderer } from '../../rendering/ArcadeRenderer.js';

export class SlowTile extends Tile {
    constructor(x, y, size) {
        super(x, y, size, 'slow');
        this.canPickup = true;
        this.freezeDuration = 8; // 8 seconds freeze
        this.slowDuration = 5; // 5 seconds slow after freeze
        this.slowMultiplier = 0.5; // 50% speed
        this.sparkleTime = 0;
        
        // Color definitions for slow tile
        this.defaultColor = ArcadeRenderer.COLORS.BLUE;
        this.heldColor = '#6688FF';
        this.projectileColor = ArcadeRenderer.COLORS.CYAN;
    }
    
    update(deltaSeconds) {
        super.update(deltaSeconds);
        this.sparkleTime += deltaSeconds;
    }
    
    // Called when tile hits another tile
    onHit(tileGrid) {
        if (tileGrid) {
            // Freeze the grid
            tileGrid.freeze(this.freezeDuration);
            tileGrid.slowDown(this.slowDuration, this.slowMultiplier);
        }
    }
    
    draw(ctx, images) {
        if (this.type === 'empty') return;
        
        ctx.save();
        
        const x = this.x + this.gapSize;
        const y = this.y + this.gapSize;
        const size = this.size - this.gapSize * 2;
        
        // Draw sprite
        if (images && images.slowTile) {
            ctx.drawImage(images.slowTile, x, y, size, size);
        }
        
        ctx.restore();
    }
}
