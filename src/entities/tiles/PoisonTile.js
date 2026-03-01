import { Tile } from './Tile.js';
import { ArcadeRenderer } from '../../rendering/ArcadeRenderer.js';

export class PoisonTile extends Tile {
    constructor(x, y, size) {
        super(x, y, size, 'poison');
        this.canPickup = true;
        this.warningTime = 0;
        
        // Color definitions for poison tile
        this.defaultColor = ArcadeRenderer.COLORS.PURPLE;
        this.heldColor = '#9944DD';
        this.projectileColor = '#8844BB';
    }
    
    update(deltaSeconds) {
        super.update(deltaSeconds);
        this.warningTime += deltaSeconds;
    }
    
    draw(ctx, images) {
        if (this.type === 'empty') return;
        
        ctx.save();
        
        const x = this.x + this.gapSize;
        const y = this.y + this.gapSize;
        const size = this.size - this.gapSize * 2;
        
        // Draw sprite
        if (images && images.poisonTile) {
            ctx.drawImage(images.poisonTile, x, y, size, size);
        }
        
        ctx.restore();
    }
}
