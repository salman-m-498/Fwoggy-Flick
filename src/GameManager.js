const GAMESTATES = {
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAMEOVER: 'GAMEOVER'
};

class GameManager {
    constructor({ onReset } = {}) {
        this.currentState = GAMESTATES.MENU;
        this.onReset = onReset || null;
    }

    getState() {
        return this.currentState;
    }

    setState(state) {
        this.currentState = state;
    }

    startGame() {
        if (this.onReset) {
            this.onReset();
        }
        this.currentState = GAMESTATES.PLAYING;
    }

    pause() {
        if (this.currentState === GAMESTATES.PLAYING) {
            this.currentState = GAMESTATES.PAUSED;
        }
    }

    resume() {
        if (this.currentState === GAMESTATES.PAUSED) {
            this.currentState = GAMESTATES.PLAYING;
        }
    }

    toMenu() {
        this.currentState = GAMESTATES.MENU;
    }

    toGameOver() {
        this.currentState = GAMESTATES.GAMEOVER;
    }
}

export { GAMESTATES, GameManager };
