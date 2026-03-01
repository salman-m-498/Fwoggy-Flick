import { Tile } from './Tile.js';
import { ArcadeRenderer } from '../../rendering/ArcadeRenderer.js';

export class ShieldTile extends Tile {
    constructor(x, y, size) {
        super(x, y, size, 'shield');
        this.canPickup = true;
        this.duration = 3; // 3 seconds of invincibility
        
        // Color definitions for shield tile
        this.defaultColor = ArcadeRenderer.COLORS.YELLOW;
        this.heldColor = '#FFFF88';
        this.projectileColor = ArcadeRenderer.COLORS.YELLOW;
    }
    
    // Called when destroyed by projectile
    onDestroy(player) {
        if (player) {
            player.shieldTime = this.duration;
            player.hasShield = true;
        }
    }
    
    draw(ctx, images) {
        if (this.type === 'empty') return;
        
        ctx.save();
        
        const x = this.x + this.gapSize;
        const y = this.y + this.gapSize;
        const size = this.size - this.gapSize * 2;
        
        // Draw sprite
        if (images && images.shieldTile) {
            ctx.drawImage(images.shieldTile, x, y, size, size);
        }
        
        ctx.restore();
    }
}
