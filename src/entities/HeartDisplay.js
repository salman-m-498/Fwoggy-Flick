export class HeartDisplay {
    constructor(x, y, maxHearts = 3) {
        this.x = x;
        this.y = y;
        this.maxHearts = maxHearts;
        this.heartSize = 24;
        this.spacing = 8;
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.fadeHearts = []; // Array of hearts that are fading out
        this.time = 0;
    }

    update(deltaSeconds) {
        this.time += deltaSeconds;
        
        // Update shake
        if (this.shakeDuration > 0) {
            this.shakeDuration -= deltaSeconds;
            if (this.shakeDuration <= 0) {
                this.shakeIntensity = 0;
            }
        }
        
        // Update fading hearts
        this.fadeHearts = this.fadeHearts.filter(heart => {
            heart.alpha -= deltaSeconds * 2; // Fade out over 0.5 seconds
            heart.y += deltaSeconds * 20; // Fall down slightly
            return heart.alpha > 0;
        });
    }

    onDamage() {
        // Trigger shake effect
        this.shakeIntensity = 5;
        this.shakeDuration = 0.3;
    }

    onHeal() {
        // Could add a sparkle effect here
    }

    draw(ctx, currentHealth) {
        const shakeX = this.shakeDuration > 0 ? 
            (Math.random() - 0.5) * this.shakeIntensity : 0;
        const shakeY = this.shakeDuration > 0 ? 
            (Math.random() - 0.5) * this.shakeIntensity : 0;

        // Draw fading hearts first (behind the main hearts)
        this.fadeHearts.forEach(heart => {
            ctx.save();
            ctx.globalAlpha = heart.alpha;
            ctx.fillStyle = '#FF4444';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = `${this.heartSize}px Arial`;
            ctx.fillText('\u2764\ufe0f', heart.x + this.heartSize / 2, heart.y + this.heartSize / 2);
            ctx.restore();
        });

        // Draw current hearts
        for (let i = 0; i < this.maxHearts; i++) {
            const heartX = this.x + shakeX + i * (this.heartSize + this.spacing);
            const heartY = this.y + shakeY;
            
            if (i < currentHealth) {
                // Full heart with pulse
                const pulse = Math.sin(this.time * 2 + i * 0.3) * 0.05 + 1;
                ctx.save();
                ctx.translate(heartX + this.heartSize / 2, heartY + this.heartSize / 2);
                ctx.scale(pulse, pulse);
                ctx.translate(-(heartX + this.heartSize / 2), -(heartY + this.heartSize / 2));
                
                ctx.fillStyle = '#FF4444';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = `${this.heartSize}px Arial`;
                ctx.fillText('\u2764\ufe0f', heartX + this.heartSize / 2, heartY + this.heartSize / 2);
                ctx.restore();
            } else {
                // Empty heart (just outline)
                ctx.save();
                ctx.globalAlpha = 0.3;
                ctx.fillStyle = '#666666';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = `${this.heartSize}px Arial`;
                ctx.fillText('\u2764\ufe0f', heartX + this.heartSize / 2, heartY + this.heartSize / 2);
                ctx.restore();
            }
        }
    }

    // Call this when health decreases to create fade effect
    loseHeart(heartIndex) {
        const heartX = this.x + heartIndex * (this.heartSize + this.spacing);
        const heartY = this.y;
        
        this.fadeHearts.push({
            x: heartX,
            y: heartY,
            alpha: 1.0
        });
        
        this.onDamage();
    }
}
