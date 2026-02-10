import { Tile } from './Tile.js';

export class NormalTile extends Tile {
    constructor(x, y, size) {
        super(x, y, size, 'normal');
        this.canPickup = true;
    }
}