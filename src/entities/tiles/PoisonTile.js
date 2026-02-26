import { Tile } from './Tile.js';
import { ArcadeRenderer } from '../../rendering/ArcadeRenderer.js';

export class PoisonTile extends Tile {
    constructor(x, y, size) {
        super(x, y, size, 'poison');
        this.canPickup = true; // Can grab but damages player
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
    
    // Returns true if this tile should damage player when grabbed
    isDangerous() {
        return true;
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
        ctx.fillStyle = this.defaultColor;
        ctx.roundRect(x, y, size, size, 4);
        ctx.fill();
        ctx.stroke();
        
        // Draw skull emoji (warning)
        ctx.fillStyle = '#FFFF44';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${size * 0.6}px Arial`;
        ctx.fillText('☠️', x + size / 2, y + size / 2);
        
        ctx.restore();
    }
}
