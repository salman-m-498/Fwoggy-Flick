import { Tile } from './Tile.js';
import { ArcadeRenderer } from '../../rendering/ArcadeRenderer.js';

export class MultishotTile extends Tile {
    constructor(x, y, size) {
        super(x, y, size, 'multishot');
        this.canPickup = true;
        this.shots = 3; // Number of multishots
        
        // Color definitions for multishot tile
        this.defaultColor = ArcadeRenderer.COLORS.CYAN;
        this.heldColor = '#88FFFF';
        this.projectileColor = ArcadeRenderer.COLORS.CYAN;
    }
    
    // Called when destroyed by projectile
    onDestroy(player) {
        if (player) {
            player.multishotCount = this.shots;
            player.hasMultishot = true;
        }
    }
    
    draw(ctx, images) {
        if (this.type === 'empty') return;
        
        ctx.save();
        
        const x = this.x + this.gapSize;
        const y = this.y + this.gapSize;
        const size = this.size - this.gapSize * 2;
        
        // Draw sprite
        if (images && images.multishotTile) {
            ctx.drawImage(images.multishotTile, x, y, size, size);
        }
        
        ctx.restore();
    }
}
