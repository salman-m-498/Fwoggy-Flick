import { Tile } from './Tile.js';

export class NormalTile extends Tile {
    constructor(x, y, size) {
        super(x, y, size, 'normal');
        this.canPickup = true;
    }
    
    draw(ctx, images) {
        if (this.type === 'empty') return;
        
        ctx.save();
        
        const x = this.x + this.gapSize;
        const y = this.y + this.gapSize;
        const size = this.size - this.gapSize * 2;
        
        // Draw sprite
        if (images && images.normalTile) {
            ctx.drawImage(images.normalTile, x, y, size, size);
        }
        
        ctx.restore();
    }
}