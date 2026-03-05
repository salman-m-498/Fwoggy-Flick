import { GameObject } from './GameObject.js';
import { PLAYERSTATES } from '../constants/States.js';

export class Frog extends GameObject {
    constructor(x, y) {
        super(x, y);
        this.health = 3;
        this.maxHealth = 3;
        this.size = 32;
        this.width = this.size + 10;
        this.height = this.size;
        this.minRot = (Math.PI / 180) * -70;
        this.maxRot = (Math.PI / 180) * 70;
        this.rotDirection = 1;
        this.canRotate = true;
        this.speed = 2.5;
        this.moveSpeed = 300;       // pixels/sec lateral movement
        this.aimSpeed = 2.5;        // radians/sec manual aim
        this.lastMoveDir = 0;       // -1 left, 0 still, 1 right
        this.leftBound = 0;
        this.rightBound = 800;
        
        // Procedural animation properties
        this.squashTime = 0;           // Timer for breathing animation
        this.squashAmount = 0;         // Current squash amount (0 to 1)
        this.breathSpeed = 2;          // Breathing frequency (Hz)
        this.deathRotation = 0;        // Rotation during death
        this.deathAlpha = 1;           // Alpha during death
        this.lastVelocityY = 0;        // Track landing for squash effect
        
        this.state = PLAYERSTATES.IDLE;
        
        // Powerup states
        this.hasShield = false;
        this.shieldTime = 0;
        this.multishotCount = 0;
        this.hasMultishot = false;
        this.damageFlashTime = 0;
        this.shootFreezeTime = 0;  // Briefly freeze movement after shooting
        this.storedPowerUp   = null; // 'LINE_H' | 'LINE_V' | 'NUKE' | null
    }

    getVertices() {
        const half = this.size / 2;
        const localVerts = [
            { x: -half, y: -half }, { x: half, y: -half },
            { x: half, y: half }, { x: -half, y: half }
        ];
        return localVerts.map(v => this.rotatePoint(v.x, v.y));
    }

    update(deltaSeconds, tongue, keys) {
        // Procedural animation updates
        this.squashTime += deltaSeconds;
        
        if (this.state === PLAYERSTATES.DEATH) {
            this.deathRotation += deltaSeconds * 4;
            this.deathAlpha -= deltaSeconds * 0.8;
            if (this.deathAlpha < 0) this.deathAlpha = 0;
        } else {
            // Breathing animation
            this.squashAmount = Math.sin(this.squashTime * this.breathSpeed * Math.PI) * 0.05;
            if (tongue && tongue.state === PLAYERSTATES.EXTENDING) {
                const extensionProgress = tongue.length / tongue.maxLength;
                this.squashAmount += extensionProgress * 0.15;
            }
        }
        
        this.lastVelocityY = this.y;
        
        // --- Lateral movement (arrow keys) ---
        if (this.shootFreezeTime > 0) this.shootFreezeTime -= deltaSeconds;
        const tongueActive = tongue &&
            (tongue.state === PLAYERSTATES.EXTENDING ||
             tongue.state === PLAYERSTATES.RETRACTING);
        if (keys && this.state !== PLAYERSTATES.DEATH && this.shootFreezeTime <= 0 && !tongueActive) {
            const movingLeft  = keys['ArrowLeft'];
            const movingRight = keys['ArrowRight'];
            // Squash sprite on direction reversal for juice
            if (movingLeft  && this.lastMoveDir === 1)  this.squashAmount = 0.18;
            if (movingRight && this.lastMoveDir === -1) this.squashAmount = 0.18;
            if (movingLeft)  this.x -= this.moveSpeed * deltaSeconds;
            if (movingRight) this.x += this.moveSpeed * deltaSeconds;
            this.lastMoveDir = movingLeft ? -1 : (movingRight ? 1 : 0);
            // Clamp to play area
            this.x = Math.max(this.leftBound + this.size / 2,
                     Math.min(this.rightBound - this.size / 2, this.x));
        }
        
        // Update shield timer
        if (this.hasShield && this.shieldTime > 0) {
            this.shieldTime -= deltaSeconds;
            if (this.shieldTime <= 0) {
                this.hasShield = false;
                this.shieldTime = 0;
            }
        }
        
        // Update damage flash
        if (this.damageFlashTime > 0) {
            this.damageFlashTime -= deltaSeconds;
        }
        
        if (!this.canRotate) return;
        if (this.shootFreezeTime > 0 || tongueActive) return;   // freeze rotation during tongue + brief post-shoot

        // Manual aim override (Up/Down arrows pause auto-pendulum while held)
        if (keys) {
            if (keys['ArrowUp']) {
                this.rotation -= this.aimSpeed * deltaSeconds;
                this.rotation = Math.max(this.minRot, this.rotation);
                return;
            }
            if (keys['ArrowDown']) {
                this.rotation += this.aimSpeed * deltaSeconds;
                this.rotation = Math.min(this.maxRot, this.rotation);
                return;
            }
        }

        // Auto-pendulum
        this.rotation += this.rotDirection * this.speed * deltaSeconds;
        if (this.rotation >= this.maxRot) {
            this.rotation = this.maxRot;
            this.rotDirection = -1;
        } else if (this.rotation <= this.minRot) {
            this.rotation = this.minRot;
            this.rotDirection = 1;
        }
    }

    damage(amount) {
        // Ignore damage if shielded
        if (this.hasShield) {
            return;
        }
        
        this.health -= amount;
        this.damageFlashTime = 0.3; // Flash for 300ms
        
        if (this.health <= 0) {
            this.health = 0;
            this.state = PLAYERSTATES.DEATH;
            this.canRotate = false;
        }
    }

    heal(amount) {
        this.health += amount;
        if (this.health > this.maxHealth) {
            this.health = this.maxHealth;
        }
    }

    draw(ctx, images) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Draw shield effect
        if (this.hasShield) {
            const pulse = Math.sin(Date.now() / 100) * 0.1 + 0.9;
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 3;
            ctx.globalAlpha = pulse;
            ctx.beginPath();
            ctx.arc(0, 0, this.size * 0.7, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
        
        // Flash red when damaged
        if (this.damageFlashTime > 0) {
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = 'red';
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
            ctx.globalAlpha = 1;
        }

        // Apply procedural animation transforms
        if (this.state === PLAYERSTATES.DEATH) {
            ctx.rotate(this.deathRotation);
            ctx.globalAlpha = this.deathAlpha;
        }
        
        // Apply squash and stretch
        const scaleX = 1 - this.squashAmount;
        const scaleY = 1 + this.squashAmount;
        ctx.scale(scaleX, scaleY);
        
        // Draw single sprite
        if (images.frogSprite) {
            ctx.drawImage(
                images.frogSprite,
                -this.size / 2, -this.size / 2,
                this.size, this.size
            );
        }
        ctx.restore();
    }
}

export class Tongue extends GameObject {
    constructor(frog) {
        super(frog.x, frog.y);
        this.frog = frog;
        this.width = 8;
        this.length = 0;
        this.extendSpeed = 400;
        this.retractSpeed = 600;
        this.maxLength = 350;
        this.attachedTile = null;
        this.state = PLAYERSTATES.IDLE;
        // Ricochet / segment tracking
        this.bounceCount = 0;
        this.maxBounces = 2;
        this.segments = [];     // [{x, y, rotation}] one entry per segment start
        this.segLengths = [];   // current length of each segment
        this.bounceFlashes = []; // [{x, y, time}] visual ring at bounce points
        this.leftBound = 0;
        this.rightBound = 800;
        this.topBound = 0;
    }

    setBounds(leftBound, rightBound, topBound) {
        this.leftBound = leftBound;
        this.rightBound = rightBound;
        this.topBound = topBound;
    }

    getVertices() {
        if (this.length <= 0) return [];
        const half = this.width / 2;
        // The tongue extends "up" from the frog's mouth (negative Y)
        const localVerts = [
            { x: -half, y: 0 },
            { x: half, y: 0 },
            { x: half, y: -this.length },
            { x: -half, y: -this.length }
        ];
        return localVerts.map(v => this.rotatePoint(v.x, v.y));
    }

    // Override to cover the full extension range
    getBroadBounds() {
        // Since the tongue rotates around (x,y) and extends by 'length',
        // we need a box that covers the full potential reach radius.
        const radius = this.length + this.width; // Add width for safety
        return {
            left: this.x - radius,
            right: this.x + radius,
            top: this.y - radius,
            bottom: this.y + radius
        };
    }

    // World-space tip – accounts for bounced segments
    getTipPosition() {
        if (this.segments && this.segments.length > 0) {
            const last = this.segments[this.segments.length - 1];
            const lastLen = this.segLengths[this.segLengths.length - 1];
            return {
                x: last.x + Math.sin(last.rotation) * lastLen,
                y: last.y - Math.cos(last.rotation) * lastLen
            };
        }
        return this.rotatePoint(0, -this.length);
    }

    update(deltaSeconds, spacePressed, tileGrid = null) {
        // Tick bounce flash timers
        this.bounceFlashes = this.bounceFlashes.filter(f => { f.time -= deltaSeconds; return f.time > 0; });

        this.x = this.frog.x;
        this.y = this.frog.y;
        this.rotation = this.frog.rotation;

        if (spacePressed) {
            if (this.state === PLAYERSTATES.IDLE) {
                this.state = PLAYERSTATES.EXTENDING;
                // Initialise segment tracking for this extension
                this.segments  = [{ x: this.frog.x, y: this.frog.y, rotation: this.frog.rotation }];
                this.segLengths = [0];
                this.bounceCount = 0;
                this.bounceFlashes = [];
            } else if (this.state === PLAYERSTATES.LOADED) {
                this.shootTile(tileGrid);
                if (this.frog.multishotCount > 0) {
                    this.frog.multishotCount--;
                    if (this.frog.multishotCount <= 0) this.frog.hasMultishot = false;
                }
                return;
            }
        }

        switch (this.state) {
            case PLAYERSTATES.LOADED:
                if (this.attachedTile) {
                    const mouthPos = this.rotatePoint(0, -20);
                    this.attachedTile.x = mouthPos.x - this.attachedTile.size / 2;
                    this.attachedTile.y = mouthPos.y - this.attachedTile.size / 2;
                } else {
                    this.state = PLAYERSTATES.IDLE;
                }
                break;

            case PLAYERSTATES.EXTENDING: {
                this.frog.canRotate = false;
                this.segLengths[this.segLengths.length - 1] += this.extendSpeed * deltaSeconds;

                // --- Wall ricochet ---
                if (this.bounceCount < this.maxBounces) {
                    const lastSeg = this.segments[this.segments.length - 1];
                    const lastLen = this.segLengths[this.segLengths.length - 1];
                    const dx = Math.sin(lastSeg.rotation);
                    const dy = -Math.cos(lastSeg.rotation);
                    const tipX = lastSeg.x + dx * lastLen;
                    const tipY = lastSeg.y + dy * lastLen;

                    let t = null, wallX = 0, wallY = 0, newRot = 0;

                    if (tipX < this.leftBound && dx < 0) {
                        t = (this.leftBound - lastSeg.x) / dx;
                        wallX = this.leftBound;  wallY = lastSeg.y + dy * t;
                        newRot = -lastSeg.rotation;
                    } else if (tipX > this.rightBound && dx > 0) {
                        t = (this.rightBound - lastSeg.x) / dx;
                        wallX = this.rightBound; wallY = lastSeg.y + dy * t;
                        newRot = -lastSeg.rotation;
                    } else if (tipY < this.topBound && dy < 0) {
                        t = (this.topBound - lastSeg.y) / dy;
                        wallX = lastSeg.x + dx * t; wallY = this.topBound;
                        newRot = Math.PI - lastSeg.rotation;
                    }

                    if (t !== null && t > 0 && t < lastLen) {
                        const overshoot = lastLen - t;
                        this.segLengths[this.segLengths.length - 1] = t;
                        this.bounceFlashes.push({ x: wallX, y: wallY, time: 0.25 });
                        this.segments.push({ x: wallX, y: wallY, rotation: newRot });
                        this.segLengths.push(Math.max(0, overshoot));
                        this.bounceCount++;
                    }
                }

                this.length = this.segLengths.reduce((a, b) => a + b, 0);
                this.height = this.length;

                if (this.length >= this.maxLength) {
                    const excess = this.length - this.maxLength;
                    this.segLengths[this.segLengths.length - 1] = Math.max(0,
                        this.segLengths[this.segLengths.length - 1] - excess);
                    this.length = this.maxLength;
                    this.height = this.maxLength;
                    this.state = PLAYERSTATES.RETRACTING;
                }
                break;
            }

            case PLAYERSTATES.RETRACTING:
                this.segLengths[this.segLengths.length - 1] -= this.retractSpeed * deltaSeconds;

                // Unwind through bounce segments as we retract
                while (this.segments.length > 1 && this.segLengths[this.segLengths.length - 1] <= 0) {
                    const overflow = -this.segLengths.pop();
                    this.segments.pop();
                    this.segLengths[this.segLengths.length - 1] -= overflow;
                }

                this.length = Math.max(0, this.segLengths.reduce((a, b) => a + b, 0));
                this.height = this.length;

                if (this.attachedTile) {
                    const tipPos = this.getTipPosition();
                    this.attachedTile.x = tipPos.x - this.attachedTile.size / 2;
                    this.attachedTile.y = tipPos.y - this.attachedTile.size / 2;
                }

                if (this.length <= 0) {
                    this.length = 0;
                    this.height = 0;
                    this.segments = [];
                    this.segLengths = [];
                    this.state = this.attachedTile ? PLAYERSTATES.LOADED : PLAYERSTATES.IDLE;
                    this.frog.canRotate = true;
                }
                break;
        }
    }

    shootTile(tileGrid = null) {
        if (!this.attachedTile) return;
        
        const shootSpeed = 600;
        // The tongue extends "up" from the frog (negative Y local space)
        // We use the same direction for shooting
        const dir = this.rotatePoint(0, -1);
        const dx = dir.x - this.x;
        const dy = dir.y - this.y;
        const len = Math.hypot(dx, dy);
        
        this.attachedTile.velocity.x = (dx / len) * shootSpeed;
        this.attachedTile.velocity.y = (dy / len) * shootSpeed;
        this.attachedTile.isMoving = true;
        this.attachedTile.type = 'projectile';
        
        // Handle multishot - create additional projectiles at different angles
        if (this.frog.multishotCount > 0 && tileGrid) {
            const TileClass = this.attachedTile.constructor;
            const angles = [-0.3, 0.3]; // Left and right spread (radians)
            
            angles.forEach(angleOffset => {
                // Create a clone of the tile
                const clone = new TileClass(this.x, this.y, this.attachedTile.size);
                clone.type = 'projectile';
                clone.isMoving = true;
                
                // Calculate direction with angle offset
                const offsetAngle = this.rotation + angleOffset;
                const offsetDir = { 
                    x: this.x + Math.sin(offsetAngle), 
                    y: this.y - Math.cos(offsetAngle) 
                };
                const odx = offsetDir.x - this.x;
                const ody = offsetDir.y - this.y;
                const olen = Math.hypot(odx, ody);
                
                clone.velocity.x = (odx / olen) * shootSpeed;
                clone.velocity.y = (ody / olen) * shootSpeed;
                
                // Add to grid
                tileGrid.tiles.push(clone);
            });
        }
        
        // Freeze lateral movement briefly so shots register cleanly
        this.frog.shootFreezeTime = 0.2;

        // Store reference for multishot
        const shotTile = this.attachedTile;
        this.attachedTile = null;
        this.state = PLAYERSTATES.IDLE;
        
        // Return the shot tile for multishot handling
        return shotTile;
    }

    draw(ctx) {
        if (this.length <= 0) return;

        ctx.save();

        if (this.segments && this.segments.length > 1) {
            // Multi-segment (bounced) tongue — draw as world-space polyline
            const points = this.segments.map(s => ({ x: s.x, y: s.y }));
            points.push(this.getTipPosition());

            ctx.strokeStyle = '#ff80ab';
            ctx.lineWidth = this.width;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
            ctx.stroke();

            // Tip circle
            const tip = points[points.length - 1];
            ctx.fillStyle = '#ff4081';
            ctx.beginPath();
            ctx.arc(tip.x, tip.y, this.width, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Single straight segment — original local-space draw
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.fillStyle = '#ff80ab';
            ctx.fillRect(-this.width / 2, -this.length, this.width, this.length);
            ctx.fillStyle = '#ff4081';
            ctx.fillRect(-this.width, -this.length - 5, this.width * 2, 10);
        }

        // Expanding ring at each bounce point
        this.bounceFlashes.forEach(f => {
            const alpha  = f.time / 0.25;
            const radius = 8 + (1 - alpha) * 10;
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(f.x, f.y, radius, 0, Math.PI * 2);
            ctx.stroke();
        });
        ctx.globalAlpha = 1;

        ctx.restore();
    }

    onCollision(tile) {
        console.log("Tongue collided with tile at:", tile.x, tile.y);
        console.log("Tile type:", tile.type);
        console.log("Tile canPickup:", tile.canPickup);
        console.log("Tile class:", tile.constructor.name);
        
        if (tile.canPickup) {
            console.log("Picked up tile!");
            this.attachedTile = tile;
            tile.type = 'held';
        } else {
            console.log("Cannot pick up this tile");
        }
        this.state = PLAYERSTATES.RETRACTING;
    }
}
