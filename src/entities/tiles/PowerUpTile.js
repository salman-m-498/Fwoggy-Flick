import { Tile } from './Tile.js';

const POWER_TYPES = ['LINE_H', 'LINE_V', 'NUKE'];

export class PowerUpTile extends Tile {
    constructor(x, y, size) {
        super(x, y, size, 'powerup');
        this.canPickup = true;
        this.powerType = POWER_TYPES[Math.floor(Math.random() * POWER_TYPES.length)];
        this.hueTime   = Math.random() * Math.PI * 2; // Random phase so tiles don't sync

        this.defaultColor    = '#ffffff';
        this.heldColor       = '#ffffff';
        this.projectileColor = '#ffffff';
    }

    update(deltaSeconds) {
        super.update(deltaSeconds);
        this.hueTime += deltaSeconds * 2.5;
    }

    draw(ctx, images) {
        if (this.type === 'empty') return;
        ctx.save();

        const x    = this.x + this.gapSize;
        const y    = this.y + this.gapSize;
        const size = this.size - this.gapSize * 2;
        const cx   = x + size / 2;
        const cy   = y + size / 2;

        // Cycling hue glow
        const hue = ((this.hueTime * 60) % 360);
        const col = `hsl(${hue}, 100%, 65%)`;

        ctx.shadowColor = col;
        ctx.shadowBlur  = 10;

        // Star / gem body
        ctx.fillStyle = col;
        ctx.beginPath();
        const spikes = 6, outerR = size * 0.42, innerR = size * 0.20;
        for (let i = 0; i < spikes * 2; i++) {
            const angle  = (i * Math.PI / spikes) - Math.PI / 2;
            const r      = i % 2 === 0 ? outerR : innerR;
            const px     = cx + Math.cos(angle) * r;
            const py     = cy + Math.sin(angle) * r;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // Direction icon
        ctx.shadowBlur  = 0;
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.lineWidth   = 1.5;
        ctx.lineCap     = 'round';
        const hs = size * 0.18;

        if (this.powerType === 'LINE_H') {
            // Horizontal double-arrow ↔
            ctx.beginPath();
            ctx.moveTo(cx - hs, cy); ctx.lineTo(cx + hs, cy);
            ctx.moveTo(cx - hs, cy); ctx.lineTo(cx - hs + 4, cy - 3);
            ctx.moveTo(cx - hs, cy); ctx.lineTo(cx - hs + 4, cy + 3);
            ctx.moveTo(cx + hs, cy); ctx.lineTo(cx + hs - 4, cy - 3);
            ctx.moveTo(cx + hs, cy); ctx.lineTo(cx + hs - 4, cy + 3);
            ctx.stroke();
        } else if (this.powerType === 'LINE_V') {
            // Vertical double-arrow ↕
            ctx.beginPath();
            ctx.moveTo(cx, cy - hs); ctx.lineTo(cx, cy + hs);
            ctx.moveTo(cx, cy - hs); ctx.lineTo(cx - 3, cy - hs + 4);
            ctx.moveTo(cx, cy - hs); ctx.lineTo(cx + 3, cy - hs + 4);
            ctx.moveTo(cx, cy + hs); ctx.lineTo(cx - 3, cy + hs - 4);
            ctx.moveTo(cx, cy + hs); ctx.lineTo(cx + 3, cy + hs - 4);
            ctx.stroke();
        } else {
            // NUKE: small X burst
            ctx.beginPath();
            ctx.moveTo(cx - hs, cy - hs); ctx.lineTo(cx + hs, cy + hs);
            ctx.moveTo(cx + hs, cy - hs); ctx.lineTo(cx - hs, cy + hs);
            ctx.moveTo(cx, cy - hs); ctx.lineTo(cx, cy + hs);
            ctx.moveTo(cx - hs, cy); ctx.lineTo(cx + hs, cy);
            ctx.stroke();
        }

        ctx.restore();
    }
}
