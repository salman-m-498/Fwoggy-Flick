import { Tile } from './Tile.js';
import { ArcadeRenderer } from '../../rendering/ArcadeRenderer.js';

export class HeartTile extends Tile {
    constructor(x, y, size) {
        super(x, y, size, 'heart');
        this.canPickup = true; // Heart is grabbed by tongue and consumed on retract
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
    
    draw(ctx, images) {
        if (this.type === 'empty') return;
        
        ctx.save();
        
        const x = this.x + this.gapSize;
        const y = this.y + this.gapSize;
        const size = this.size - this.gapSize * 2;
        
        // Apply pulse animation to sprite
        const pulse = Math.sin(this.pulseTime * 3) * 0.1 + 1;
        ctx.translate(x + size / 2, y + size / 2);
        ctx.scale(pulse, pulse);
        ctx.translate(-(x + size / 2), -(y + size / 2));
        
        // Draw sprite
        if (images && images.heartTile) {
            ctx.drawImage(images.heartTile, x, y, size, size);
        }
        
        ctx.restore();
    }
}
