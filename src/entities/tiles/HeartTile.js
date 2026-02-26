import { Tile } from './Tile.js';
import { ArcadeRenderer } from '../../rendering/ArcadeRenderer.js';

export class HeartTile extends Tile {
    constructor(x, y, size) {
        super(x, y, size, 'heart');
        this.canPickup = false; // Heart passes through tongue
        this.collected = false;
        this.pulseTime = 0;
        
        // Color definitions for heart tile
        this.defaultColor = ArcadeRenderer.COLORS.PINK;
        this.heldColor = ArcadeRenderer.COLORS.PINK;
        this.projectileColor = ArcadeRenderer.COLORS.RED;
    }
    
    update(deltaSeconds) {
        super.update(deltaSeconds);
        this.pulseTime += deltaSeconds;
    }
    
    // Called when heart reaches player at bottom
    onPlayerContact(player) {
        if (!this.collected && player.health < player.maxHealth) {
            player.health++;
            this.collected = true;
            this.type = 'empty';
            return true; // Successfully healed
        }
        return false;
    }
    
    draw(ctx) {
        if (this.type === 'empty') return;
        
        ctx.save();
        
        const x = this.x + this.gapSize;
        const y = this.y + this.gapSize;
        const size = this.size - this.gapSize * 2;
        
        // Draw rounded rectangle with outline
        ArcadeRenderer.drawRoundedTile(ctx, x, y, size, size, this.defaultColor, 4, 1);
        
        // Draw heart emoji with pulse
        const pulse = Math.sin(this.pulseTime * 3) * 0.1 + 1;
        ctx.translate(x + size / 2, y + size / 2);
        ctx.scale(pulse, pulse);
        ctx.translate(-(x + size / 2), -(y + size / 2));
        
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${size * 0.8}px Arial`;
        ctx.fillText('\u2764\ufe0f', x + size / 2, y + size / 2);
        
        ctx.restore();
    }
}
