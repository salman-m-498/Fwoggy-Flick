const LEADERBOARD_KEY = 'fwoggy-flick-leaderboard';

let playerScore = 0;
let bestScore = 0;

// ── Combo state ──────────────────────────────────────────────────────────────
const COMBO_WINDOW   = 3.5;  // seconds to keep combo alive
const COMBO_TIERS    = [
    { hits: 35, multiplier: 8 },
    { hits: 20, multiplier: 5 },
    { hits: 10, multiplier: 3 },
    { hits:  5, multiplier: 2 },
];

let comboCount      = 0;
let comboTimer      = 0;
let comboMultiplier = 1;

function _calcMultiplier(count) {
    for (const tier of COMBO_TIERS) {
        if (count >= tier.hits) return tier.multiplier;
    }
    return 1;
}

function addComboHit() {
    comboCount++;
    comboTimer      = COMBO_WINDOW;
    comboMultiplier = _calcMultiplier(comboCount);
}

function updateCombo(deltaSeconds) {
    if (comboTimer <= 0) return;
    comboTimer -= deltaSeconds;
    if (comboTimer <= 0) resetCombo();
}

function resetCombo() {
    comboCount      = 0;
    comboTimer      = 0;
    comboMultiplier = 1;
}

function getComboState() {
    return {
        count:       comboCount,
        timer:       comboTimer,
        multiplier:  comboMultiplier,
        barFill:     COMBO_WINDOW > 0 ? Math.max(0, comboTimer / COMBO_WINDOW) : 0,
    };
}

// ── Load leaderboard from localStorage ──────────────────────────────────────
function loadLeaderboard() {
    try {
        const data = localStorage.getItem(LEADERBOARD_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Error loading leaderboard:', e);
        return [];
    }
}

function saveScoreToLeaderboard(score) {
    try {
        const leaderboard = loadLeaderboard();
        leaderboard.push({
            score: score,
            date: new Date().toLocaleDateString(),
            timestamp: Date.now()
        });
        leaderboard.sort((a, b) => b.score - a.score);
        localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
    } catch (e) {
        console.error('Error saving score:', e);
    }
}

function resetScore() {
    playerScore = 0;
    resetCombo();
}

/** No-op stub — kept so existing call-sites don't break. Scoring is now
 *  purely action-based via addScore() + addComboHit(). */
function updateScore(_deltaSeconds) {}

function addScore(points) {
    playerScore += points;
}

function getPlayerScore() { return playerScore; }
function getBestScore()    { return bestScore; }

function updateBestScore(score) {
    if (score > bestScore) {
        bestScore = score;
    }
    return bestScore;
}

function initBestScoreFromLeaderboard() {
    bestScore = Math.max(...loadLeaderboard().map(entry => entry.score || 0), 0);
    return bestScore;
}

export {
    addScore,
    addComboHit,
    updateCombo,
    resetCombo,
    getComboState,
    getBestScore,
    getPlayerScore,
    initBestScoreFromLeaderboard,
    loadLeaderboard,
    resetScore,
    saveScoreToLeaderboard,
    updateBestScore,
    updateScore
};
