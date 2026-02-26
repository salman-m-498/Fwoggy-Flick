import { Tile } from './Tile.js';

export class NormalTile extends Tile {
    constructor(x, y, size) {
        super(x, y, size, 'normal');
        this.canPickup = true;
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
        
        // Draw circle/target emoji
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${size * 0.6}px Arial`;
        ctx.fillText('\u25cf', x + size / 2, y + size / 2);
        
        ctx.restore();
    }
}