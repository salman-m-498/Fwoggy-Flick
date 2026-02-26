// Utility class for procedural arcade-style rendering
// Provides methods for retro visuals without manual sprite creation

export class ArcadeRenderer {
    // Arcade color palette
    static COLORS = {
        RED: '#FF4444',
        BLUE: '#4444FF',
        YELLOW: '#FFFF44',
        GREEN: '#44FF44',
        MAGENTA: '#FF44FF',
        CYAN: '#44FFFF',
        ORANGE: '#FF8844',
        PURPLE: '#8844FF',
        WHITE: '#FFFFFF',
        BLACK: '#000000',
        DARK_BLUE: '#001133',
        PINK: '#FF4488'
    };

    // Draw rounded rectangle with outline
    static drawRoundedTile(ctx, x, y, width, height, color, radius = 4, outlineWidth = 1) {
        // Draw outline
        ctx.strokeStyle = this.COLORS.BLACK;
        ctx.lineWidth = outlineWidth;
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, radius);
        ctx.stroke();
        
        // Fill
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, radius);
        ctx.fill();
    }
    
    // Draw icon/emoji on tile
    static drawIcon(ctx, icon, x, y, size, fontSize = null) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${fontSize || size * 0.6}px Arial`;
        ctx.fillText(icon, x + size / 2, y + size / 2);
    }

    // Draw dotted background pattern
    static drawDottedBackground(ctx, width, height, dotSize = 2, spacing = 8, color = this.COLORS.BLUE) {
        ctx.fillStyle = color;
        for (let x = 0; x < width; x += spacing) {
            for (let y = 0; y < height; y += spacing) {
                ctx.fillRect(x, y, dotSize, dotSize);
            }
        }
    }

    // Draw retro blocky pixel text
    static drawRetroText(ctx, text, x, y, size = 16, color = this.COLORS.WHITE) {
        ctx.fillStyle = color;
        ctx.font = `bold ${size}px monospace`;
        ctx.fillText(text, x, y);
    }

    // Draw pulsing effect
    static drawPulse(ctx, x, y, width, height, color, time, pulseSpeed = 2) {
        const pulse = Math.sin(time * pulseSpeed) * 0.15 + 0.85;
        const w = width * pulse;
        const h = height * pulse;
        const offsetX = (width - w) / 2;
        const offsetY = (height - h) / 2;
        
        ctx.fillStyle = color;
        ctx.fillRect(x + offsetX, y + offsetY, w, h);
    }

    // Draw a heart shape using pixels
    static drawPixelHeart(ctx, x, y, size, color, outlineColor = this.COLORS.BLACK) {
        const pixels = [
            [0,1,1,0,1,1,0],
            [1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1],
            [0,1,1,1,1,1,0],
            [0,0,1,1,1,0,0],
            [0,0,0,1,0,0,0]
        ];
        
        const pixelSize = size / 7;
        
        pixels.forEach((row, rowIdx) => {
            row.forEach((filled, colIdx) => {
                if (filled) {
                    const px = x + colIdx * pixelSize;
                    const py = y + rowIdx * pixelSize;
                    
                    // Outline
                    ctx.fillStyle = outlineColor;
                    ctx.fillRect(px - 1, py - 1, pixelSize + 2, pixelSize + 2);
                    
                    // Fill
                    ctx.fillStyle = color;
                    ctx.fillRect(px, py, pixelSize, pixelSize);
                }
            });
        });
    }

    // Draw a snowflake pattern
    static drawSnowflake(ctx, x, y, size, color) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        
        const centerX = x + size / 2;
        const centerY = y + size / 2;
        const radius = size / 3;
        
        // Draw 6 spokes
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const endX = centerX + Math.cos(angle) * radius;
            const endY = centerY + Math.sin(angle) * radius;
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            
            // Add small branches
            const branchLen = radius / 3;
            const branch1X = endX - Math.cos(angle + Math.PI / 4) * branchLen;
            const branch1Y = endY - Math.sin(angle + Math.PI / 4) * branchLen;
            const branch2X = endX - Math.cos(angle - Math.PI / 4) * branchLen;
            const branch2Y = endY - Math.sin(angle - Math.PI / 4) * branchLen;
            
            ctx.beginPath();
            ctx.moveTo(endX, endY);
            ctx.lineTo(branch1X, branch1Y);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(endX, endY);
            ctx.lineTo(branch2X, branch2Y);
            ctx.stroke();
        }
    }

    // Draw a shield icon
    static drawShield(ctx, x, y, size, color) {
        ctx.fillStyle = this.COLORS.BLACK;
        ctx.strokeStyle = this.COLORS.BLACK;
        ctx.lineWidth = 2;
        
        const centerX = x + size / 2;
        const centerY = y + size / 2;
        const width = size * 0.6;
        const height = size * 0.7;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - height / 2);
        ctx.lineTo(centerX + width / 2, centerY - height / 4);
        ctx.lineTo(centerX + width / 2, centerY + height / 4);
        ctx.lineTo(centerX, centerY + height / 2);
        ctx.lineTo(centerX - width / 2, centerY + height / 4);
        ctx.lineTo(centerX - width / 2, centerY - height / 4);
        ctx.closePath();
        ctx.stroke();
        
        ctx.fillStyle = color;
        ctx.fill();
    }

    // Draw spikes pattern
    static drawSpikes(ctx, x, y, size, color) {
        ctx.fillStyle = color;
        const spikeCount = 5;
        const spikeWidth = size / spikeCount;
        
        for (let i = 0; i < spikeCount; i++) {
            ctx.beginPath();
            ctx.moveTo(x + i * spikeWidth, y + size);
            ctx.lineTo(x + i * spikeWidth + spikeWidth / 2, y + size / 3);
            ctx.lineTo(x + (i + 1) * spikeWidth, y + size);
            ctx.closePath();
            ctx.fill();
        }
    }

    // Draw warning symbol (!)
    static drawWarning(ctx, x, y, size, color) {
        ctx.fillStyle = color;
        const centerX = x + size / 2;
        const centerY = y + size / 2;
        
        // Exclamation mark
        ctx.fillRect(centerX - 2, centerY - size / 3, 4, size / 2);
        ctx.fillRect(centerX - 2, centerY + size / 4, 4, 4);
    }

    // Draw multi-arrow pattern
    static drawMultiArrow(ctx, x, y, size, color) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        
        const centerX = x + size / 2;
        const centerY = y + size / 2;
        const arrowSize = size / 4;
        
        // Draw 3 arrows pointing up
        for (let i = -1; i <= 1; i++) {
            const offsetX = i * (size / 4);
            ctx.beginPath();
            ctx.moveTo(centerX + offsetX, centerY + arrowSize);
            ctx.lineTo(centerX + offsetX, centerY - arrowSize);
            ctx.lineTo(centerX + offsetX - arrowSize / 2, centerY);
            ctx.moveTo(centerX + offsetX, centerY - arrowSize);
            ctx.lineTo(centerX + offsetX + arrowSize / 2, centerY);
            ctx.stroke();
        }
    }
}
