import { Tile } from './Tile.js';

export class HardenedTile extends Tile {
    constructor(x, y, size) {
        super(x, y, size, 'hardened');
        this.hp = 2;
        this.canPickup = false; // Cannot be picked up
        
        // Color definitions for different HP levels
        this.fullHealthColor = '#5e501b';   // Dark brown at full health
        this.damagedColor = '#8d6e63';      // Lighter brown when damaged
    }
    
    getColor() {
        if (this.hp === 2) return this.fullHealthColor;
        if (this.hp === 1) return this.damagedColor;
        return this.defaultColor; // Fallback
    }

    onHit(projectile) {
        this.hp -= 1;
        this.reflectProjectile(projectile);
        if (this.hp <= 0) {
            this.type = 'empty';
        }
    }
    
    reflectProjectile(projectile) {
        const dx = (projectile.x + projectile.size / 2) - (this.x + this.size / 2);
        const dy = (projectile.y + projectile.size / 2) - (this.y + this.size / 2);

        if (Math.abs(dx) > Math.abs(dy)) {
            projectile.velocity.x *= -1;
        } else {
            projectile.velocity.y *= -1;
        }
    }
}
