/**
 * ParticleSystem.js
 * Pool-based 2D particle system — zero heap allocations per frame after init.
 *
 * API:
 *   ps.tileDestroy(cx, cy, color)    – satisfying pop burst on tile death
 *   ps.tileHit(cx, cy, color)        – small chips on hit without death
 *   ps.playerHurt(x, y)              – red burst on the frog
 *   ps.bombExplosion(cx, cy)         – large multi-ring explosion
 *   ps.powerup(cx, cy, color)        – sparkle on pickup
 *   ps.tongueGrab(cx, cy, color)     – dust puff on grab
 *   ps.update(dt)                    – call every frame
 *   ps.draw(ctx)                     – call every frame, after tileGrid.draw
 */

export class ParticleSystem {
    constructor(maxParticles = 400) {
        this._pool = new Array(maxParticles);
        for (let i = 0; i < maxParticles; i++) {
            this._pool[i] = {
                active: false,
                x: 0, y: 0, vx: 0, vy: 0,
                size: 4, color: '#fff',
                alpha: 1, life: 0, maxLife: 1,
                gravity: 0, drag: 0.92,
                // 'square' | 'spark' | 'ring'
                type: 'square',
                shrink: true,
                ringRadius: 0, ringGrow: 0,
            };
        }
    }

    // ── internals ─────────────────────────────────────────────────────────────

    /** Deactivate all particles immediately (e.g. on game reset). */
    clear() {
        for (let i = 0, l = this._pool.length; i < l; i++) {
            this._pool[i].active = false;
        }
    }

    _acquire() {
        const pool = this._pool;
        for (let i = 0, l = pool.length; i < l; i++) {
            if (!pool[i].active) return pool[i];
        }
        return null; // pool full – drop particle rather than alloc
    }

    _emit(x, y, vx, vy, size, color, maxLife, gravity = 0, drag = 0.92, shrink = true, type = 'square') {
        const p = this._acquire();
        if (!p) return;
        p.active = true;
        p.x = x;  p.y = y;
        p.vx = vx; p.vy = vy;
        p.size = size; p.color = color;
        p.alpha = 1; p.life = 0; p.maxLife = maxLife;
        p.gravity = gravity; p.drag = drag;
        p.shrink = shrink; p.type = type;
        p.ringRadius = 0; p.ringGrow = 0;
    }

    _ring(x, y, color, growSpeed, life) {
        const p = this._acquire();
        if (!p) return;
        p.active = true;
        p.x = x; p.y = y;
        p.vx = 0; p.vy = 0;
        p.size = 1.5; p.color = color;
        p.alpha = 1; p.life = 0; p.maxLife = life;
        p.gravity = 0; p.drag = 1;
        p.shrink = false; p.type = 'ring';
        p.ringRadius = 1; p.ringGrow = growSpeed;
    }

    // ── emitters ──────────────────────────────────────────────────────────────

    /** Satisfying pop burst when a tile is fully destroyed. */
    tileDestroy(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = 60 + Math.random() * 130;
            this._emit(x, y, Math.cos(a) * s, Math.sin(a) * s,
                2 + Math.random() * 4, color,
                0.45 + Math.random() * 0.4, 90, 0.91, true, 'square');
        }
        // Bright white sparks
        for (let i = 0; i < 4; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = 100 + Math.random() * 160;
            this._emit(x, y, Math.cos(a) * s, Math.sin(a) * s,
                1.5, '#ffffff', 0.35, 80, 0.89, true, 'spark');
        }
        this._ring(x, y, color, 50, 0.35);
    }

    /** Small chip burst for a tile hit that does not destroy it. */
    tileHit(x, y, color, count = 6) {
        for (let i = 0; i < count; i++) {
            const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
            const s = 35 + Math.random() * 70;
            this._emit(x, y, Math.cos(a) * s, Math.sin(a) * s,
                1.5 + Math.random() * 2, color,
                0.3 + Math.random() * 0.2, 120, 0.89, true, 'square');
        }
    }

    /** Red/orange burst on the frog when the player takes damage. */
    playerHurt(x, y, count = 16) {
        const COLS = ['#ff2222', '#ff6644', '#ffaa22', '#ffffff'];
        for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = 45 + Math.random() * 95;
            this._emit(x, y, Math.cos(a) * s, Math.sin(a) * s,
                2 + Math.random() * 3,
                COLS[Math.floor(Math.random() * COLS.length)],
                0.45 + Math.random() * 0.3, 60, 0.91, true, 'square');
        }
        this._ring(x, y, '#ff4444', 55, 0.4);
    }

    /** Large multi-ring explosion for a BombTile detonation. */
    bombExplosion(x, y, count = 40) {
        const COLS = ['#ff4422', '#ff8833', '#ffcc00', '#ffffff', '#ff2200'];
        for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = 60 + Math.random() * 250;
            const col = COLS[Math.floor(Math.random() * COLS.length)];
            this._emit(x, y, Math.cos(a) * s, Math.sin(a) * s,
                2 + Math.random() * 7, col,
                0.35 + Math.random() * 0.65, 130, 0.88, true, 'square');
        }
        this._ring(x, y, '#ff8833', 90, 0.45);
        this._ring(x, y, '#ffcc00', 60, 0.65);
    }

    /** Sparkle burst for powerup pickups (heart, shield, multishot). */
    powerup(x, y, color, count = 16) {
        for (let i = 0; i < count; i++) {
            const a = (i / count) * Math.PI * 2 + Math.random() * 0.5;
            const s = 45 + Math.random() * 90;
            this._emit(x, y, Math.cos(a) * s, Math.sin(a) * s,
                1.5 + Math.random() * 2, color,
                0.55 + Math.random() * 0.3, 0, 0.92, true, 'spark');
        }
        for (let i = 0; i < 5; i++) {
            const a = Math.random() * Math.PI * 2;
            this._emit(x, y, Math.cos(a) * 80, Math.sin(a) * 80,
                1.5, '#ffffff', 0.4, 0, 0.90, true, 'spark');
        }
        this._ring(x, y, color, 45, 0.4);
    }

    /** Tiny dust puff when the tongue successfully grabs a tile. */
    tongueGrab(x, y, color, count = 5) {
        for (let i = 0; i < count; i++) {
            const a = Math.PI / 2 + (Math.random() - 0.5) * 1.5;
            const s = 18 + Math.random() * 40;
            this._emit(x, y, Math.cos(a) * s, Math.sin(a) * s,
                1.5, color, 0.25, 30, 0.86, true, 'square');
        }
    }

    /** Massive rainbow fireworks burst for a full grid-clear celebration. */
    gridClear(cx, cy, gridW, gridH) {
        const RAINBOW = ['#ff2244', '#ff8833', '#ffdd00', '#44ff88', '#44aaff', '#cc44ff', '#ff44cc', '#ffffff'];
        // 20 scattered explosion clusters across the grid
        for (let i = 0; i < 20; i++) {
            const px  = cx + (Math.random() - 0.5) * gridW * 0.9;
            const py  = cy + (Math.random() - 0.5) * gridH * 0.85;
            const col = RAINBOW[i % RAINBOW.length];
            for (let j = 0; j < 12; j++) {
                const a = Math.random() * Math.PI * 2;
                const s = 55 + Math.random() * 200;
                this._emit(px, py, Math.cos(a) * s, Math.sin(a) * s,
                    2 + Math.random() * 6, col,
                    0.55 + Math.random() * 0.85, 110, 0.88, true, 'square');
            }
            this._ring(px, py, col, 85, 0.55);
        }
        // Two massive full-canvas sweep rings
        this._ring(cx, cy, '#ffffff', 260, 0.7);
        this._ring(cx, cy, '#ffdd44', 190, 0.8);
        // Upward star shower across the full grid width
        for (let i = 0; i < 45; i++) {
            const px  = cx + (Math.random() - 0.5) * gridW;
            const col = RAINBOW[Math.floor(Math.random() * RAINBOW.length)];
            const a   = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.7;
            const s   = 160 + Math.random() * 300;
            this._emit(px, cy + gridH * 0.3, Math.cos(a) * s, Math.sin(a) * s,
                2 + Math.random() * 3, col, 0.65 + Math.random() * 0.55, 50, 0.93, true, 'spark');
        }
    }

    // ── core loop ─────────────────────────────────────────────────────────────

    update(dt) {
        const pool = this._pool;
        for (let i = 0, l = pool.length; i < l; i++) {
            const p = pool[i];
            if (!p.active) continue;
            p.life += dt;
            if (p.life >= p.maxLife) { p.active = false; continue; }
            p.alpha = 1 - p.life / p.maxLife;
            if (p.type === 'ring') { p.ringRadius += p.ringGrow * dt; continue; }
            p.vy += p.gravity * dt;
            p.vx *= p.drag;
            p.vy *= p.drag;
            p.x  += p.vx * dt;
            p.y  += p.vy * dt;
        }
    }

    draw(ctx) {
        const pool = this._pool;
        ctx.save();

        // Pass 1 – rings (need stroke, not fill)
        ctx.lineWidth = 1.5;
        for (let i = 0, l = pool.length; i < l; i++) {
            const p = pool[i];
            if (!p.active || p.type !== 'ring') continue;
            ctx.globalAlpha = p.alpha;
            ctx.strokeStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.ringRadius, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Pass 2 – squares & sparks (fillRect)
        for (let i = 0, l = pool.length; i < l; i++) {
            const p = pool[i];
            if (!p.active || p.type === 'ring') continue;
            const t  = p.life / p.maxLife;
            const sz = p.shrink ? p.size * (1 - t * 0.65) : p.size;
            if (sz < 0.5) continue;
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle   = p.color;
            ctx.fillRect(
                Math.round(p.x - sz * 0.5),
                Math.round(p.y - sz * 0.5),
                Math.round(sz),
                Math.round(sz)
            );
        }

        ctx.globalAlpha = 1;
        ctx.restore();
    }
}
