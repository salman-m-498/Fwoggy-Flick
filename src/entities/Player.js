import { GameObject } from './GameObject.js';
import { PLAYERSTATES } from '../constants/States.js';

export class Frog extends GameObject {
    constructor(x, y) {
        super(x, y);
        this.health = 3;
        this.maxHealth = 3;
        this.size = 50;
        this.width = this.size + 10;
        this.height = this.size;
        this.minRot = (Math.PI / 180) * -70;
        this.maxRot = (Math.PI / 180) * 70;
        this.rotDirection = 1;
        this.canRotate = true;
        this.speed = 2.5;
        this.frameIndex = 0;
        this.animTimer = 0;
        this.animSpeed = 0.2;
        this.animations = {
            [PLAYERSTATES.IDLE]: { frames: ["fwoggie 1.png", "fwoggie 2.png", "fwoggie 3.png"], 
                loop: true },
            [PLAYERSTATES.DEATH]: { frames: ["fwoggie dead.png"], loop: false }
        };
        this.state = PLAYERSTATES.IDLE;
        
        // Powerup states
        this.hasShield = false;
        this.shieldTime = 0;
        this.multishotCount = 0;
        this.damageFlashTime = 0;
    }

    getVertices() {
        const half = this.size / 2;
        const localVerts = [
            { x: -half, y: -half }, { x: half, y: -half },
            { x: half, y: half }, { x: -half, y: half }
        ];
        return localVerts.map(v => this.rotatePoint(v.x, v.y));
    }

    update(deltaSeconds) {
        // TODO: Refactor Animation functions into separate Animator class
        // Animation
        this.animTimer += deltaSeconds;
        if (this.animTimer >= this.animSpeed) {
            this.animTimer = 0;
            const anim = this.animations[this.state];
            if (anim) {
                this.frameIndex++;
                if (this.frameIndex >= anim.frames.length) {
                    this.frameIndex = anim.loop ? 0 : anim.frames.length - 1;
                }
            }
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

    draw(ctx, images, atlas) {
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

        if (images.frogSpritesheet && atlas) {
        const anim = this.animations[this.state];
        const frameName = anim.frames[this.frameIndex];
        const frameData = atlas.frames[frameName].frame;

        ctx.drawImage(
            images.frogSpritesheet,
            frameData.x, frameData.y, // Source X, Y from JSON
            frameData.w, frameData.h, // Source W, H from JSON
            -this.size / 2, -this.size / 2, // Center on frog position
            this.size, this.size      // Scale to frog size
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

    // Helper to find the world-space tip of the tongue
    getTipPosition() {
        return this.rotatePoint(0, -this.length);
    }

    update(deltaSeconds, spacePressed) {
        this.x = this.frog.x;
        this.y = this.frog.y;
        this.rotation = this.frog.rotation;

        if (spacePressed) {
            if (this.state === PLAYERSTATES.IDLE) {
                this.state = PLAYERSTATES.EXTENDING;
            } else if (this.state === PLAYERSTATES.LOADED) {
                this.shootTile();
                return;
            }
        }

        switch (this.state) {
            case PLAYERSTATES.LOADED:
                if (this.attachedTile) {
                     // Keep tile at mouth
                     const mouthPos = this.rotatePoint(0, -20); // Slightly in front
                     this.attachedTile.x = mouthPos.x - this.attachedTile.size/2;
                     this.attachedTile.y = mouthPos.y - this.attachedTile.size/2;
                } else {
                     this.state = PLAYERSTATES.IDLE;
                }
                break;

            case PLAYERSTATES.EXTENDING:
                this.frog.canRotate = false; // Lock frog
                this.length += this.extendSpeed * deltaSeconds;
                this.height = this.length; // Update height for collision detection
                if (this.length >= this.maxLength) {
                    this.length = this.maxLength;
                    this.height = this.length;
                    this.state = PLAYERSTATES.RETRACTING;
                }
                break;
                
            case PLAYERSTATES.RETRACTING:
                this.length -= this.retractSpeed * deltaSeconds;

                // If we have a tile, make it follow the tip of the tongue
                if (this.attachedTile) {
                    const tipPos = this.getTipPosition(); // Helper to find the end of the tongue
                    this.attachedTile.x = tipPos.x - this.attachedTile.size / 2;
                    this.attachedTile.y = tipPos.y - this.attachedTile.size / 2;
                }

                this.height = this.length; // Update height for collision detection
                if (this.length <= 0) {
                    this.length = 0;
                    this.height = 0;
                    // If we brought a tile back, stay in IDLE but keep the tile at the Frog's mouth
                    if (this.attachedTile) {
                        this.state = PLAYERSTATES.LOADED; 
                    } else {
                        this.state = PLAYERSTATES.IDLE;
                    }
                    this.frog.canRotate = true; // Unlock frog
                }
                break;
        }
    }

    shootTile() {
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
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Tongue line
        ctx.fillStyle = '#ff80ab';
        ctx.fillRect(-this.width / 2, -this.length, this.width, this.length);
        
        // Tongue Tip
        ctx.fillStyle = '#ff4081';
        ctx.fillRect(-this.width, -this.length - 5, this.width * 2, 10);
        
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
