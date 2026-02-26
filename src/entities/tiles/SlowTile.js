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
        
        // Draw snowflake emoji
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${size * 0.6}px Arial`;
        ctx.fillText('❄️', x + size / 2, y + size / 2);
        
        // Draw sparkles around it
        const sparkleCount = 3;
        ctx.font = `${size * 0.3}px Arial`;
        for (let i = 0; i < sparkleCount; i++) {
            const angle = (this.sparkleTime + i) * 2;
            const radius = size * 0.4;
            const sparkleX = x + size / 2 + Math.cos(angle) * radius;
            const sparkleY = y + size / 2 + Math.sin(angle) * radius;
            const flash = Math.sin(this.sparkleTime * 5 + i * 2) * 0.5 + 0.5;
            
            ctx.globalAlpha = flash;
            ctx.fillText('✨', sparkleX - 3, sparkleY);
        }
        
        ctx.restore();
    }
}
