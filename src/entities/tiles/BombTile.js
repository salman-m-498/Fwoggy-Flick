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
        this.canPickup = true
        this.isMoving = false;
        this.bounceCount = 0;
        this.maxBounces = 5;
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
        if (this.type === 'solid') ctx.fillStyle = '#2e7d32';
        else if (this.type === 'hardened') ctx.fillStyle = '#5e501b';
        else if (this.type === 'held') ctx.fillStyle = '#66bb6a'; // Lighter green
        else ctx.fillStyle = '#c62828'; // Projectile or other

        // Drawing slightly smaller than the collision box for a "grid" look
        ctx.fillRect(this.x + this.gapSize, this.y + this.gapSize, 
                     this.size - this.gapSize * 2, this.size - this.gapSize * 2);
        ctx.restore();
    }
}
