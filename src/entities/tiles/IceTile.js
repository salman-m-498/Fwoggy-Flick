import { Tile } from './Tile.js';

export class IceTile extends Tile {
    constructor(x, y, size) {
        super(x, y, size, 'ice');
        this.canPickup = true;
        
        // Color definitions for ice tile
        this.defaultColor = '#0993e2';      // Light blue
        this.heldColor = '#4182e5';         // Lighter blue when held
        this.projectileColor = '#d32f2f';   // Bright red when thrown
    }
    onHit(tileGrid) {
        tileGrid.freeze(5);
    }
}
    
    
