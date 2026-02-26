import { Tile } from './Tile.js';
import { ArcadeRenderer } from '../../rendering/ArcadeRenderer.js';

export class SpikeTile extends Tile {
    constructor(x, y, size) {
        super(x, y, size, 'spike');
        this.canPickup = false; // Cannot grab spikes
        this.health = 3; // Very durable
        this.maxHealth = 3;
        
        // Color definitions for spike tile
        this.defaultColor = ArcadeRenderer.COLORS.ORANGE;
        this.heldColor = ArcadeRenderer.COLORS.ORANGE;
        this.projectileColor = ArcadeRenderer.COLORS.RED;
    }
    
    // When projectile hits spike, player takes damage
    onHit(projectile, player) {
        // Damage is applied through game manager
        // Projectile bounces but spike stays
        this.health--;
        if (this.health <= 0) {
            this.type = 'empty';
        }
        return { damagePlayer: false, bounce: true }; // Don't damage player on projectile hit
    }
    
    draw(ctx) {
        if (this.type === 'empty') return;
        
        ctx.save();
        
        const x = this.x + this.gapSize;
        const y = this.y + this.gapSize;
        const size = this.size - this.gapSize * 2;
        
        // Color changes as it takes damage
        const color = this.health === this.maxHealth ? 
            this.defaultColor : 
            ArcadeRenderer.COLORS.RED;
        
        // Draw rounded tile
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.fillStyle = color;
        ctx.roundRect(x, y, size, size, 4);
        ctx.fill();
        ctx.stroke();
        
        // Draw danger/spike emoji
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${size * 0.6}px Arial`;
        ctx.fillText('⚠️', x + size / 2, y + size / 2);
        
        ctx.restore();
    }
}
