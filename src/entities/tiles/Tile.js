import { GameObject } from '../GameObject.js';

export class Tile extends GameObject {
    constructor(x, y, size, type = 'solid') {
        super(x, y);
        this.size = size;
        this.width = size;
        this.height = size;
        this.gapSize = 2;
        this.velocity = { x: 0, y: 0 }; 
        this.type = type;
        this.canPickup = false; // By default, tiles cannot be picked up
        this.isMoving = false;
        this.bounceCount = 0;
        this.maxBounces = 5;
        
        // Color definitions
        this.defaultColor = '#2e7d32';      // Default green
        this.heldColor = '#66bb6a';         // Lighter green when held
        this.projectileColor = '#c62828';   // Red for projectiles
    }
    
    getColor() {
        if (this.type === 'held') return this.heldColor;
        if (this.type === 'projectile') return this.projectileColor;
        return this.defaultColor;
    }

    update(deltaSeconds) {
        if (!this.isMoving) return;
        this.x += this.velocity.x * deltaSeconds;
        this.y += this.velocity.y * deltaSeconds;
    }

    getVertices() {
        const half = this.size / 2;
        // Tiles are usually static, but we'll support rotation just in case
        const localVerts = [
            { x: -half, y: -half },
            { x: half, y: -half },
            { x: half, y: half },
            { x: -half, y: half }
        ];
        // Note: Tile x,y is usually top-left, so we adjust to center for rotation
        const centerX = this.x + half;
        const centerY = this.y + half;
        
        return localVerts.map(v => {
            const cos = Math.cos(this.rotation);
            const sin = Math.sin(this.rotation);
            return {
                x: centerX + v.x * cos - v.y * sin,
                y: centerY + v.x * sin + v.y * cos
            };
        });
    }
    // Call this whenever the tile hits a wall or another tile
    registerBounce() {
        this.bounceCount++;
        
        if (this.bounceCount >= this.maxBounces) {
            this.destroy();
        }
    }

    destroy() {
        this.isMoving = false;
        this.velocity = { x: 0, y: 0 };
        this.type = 'empty'; // Or trigger a particle effect/animation
        console.log("Tile shattered from too many bounces!");
    }

    draw(ctx) {
        if (this.type === 'empty') return;
        
        ctx.save();
        
        const x = this.x + this.gapSize;
        const y = this.y + this.gapSize;
        const size = this.size - this.gapSize * 2;
        
        // Draw rounded rectangle with 1px outline
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.fillStyle = this.getColor();
        
        ctx.roundRect(x, y, size, size, 4);
        ctx.fill();
        ctx.stroke();
        
        ctx.restore();
    }
}
