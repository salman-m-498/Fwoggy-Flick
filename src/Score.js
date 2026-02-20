const LEADERBOARD_KEY = 'fwoggy-flick-leaderboard';

let playerScore = 0;
let bestScore = 0;
let gameTimer = 0;

// Load leaderboard from localStorage
function loadLeaderboard() {
    try {
        const data = localStorage.getItem(LEADERBOARD_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Error loading leaderboard:', e);
        return [];
    }
}

// Save score to leaderboard
function saveScoreToLeaderboard(score) {
    try {
        const leaderboard = loadLeaderboard();
        leaderboard.push({
            score: score,
            date: new Date().toLocaleDateString(),
            timestamp: Date.now()
        });
        // Sort by score descending
        leaderboard.sort((a, b) => b.score - a.score);
        localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
    } catch (e) {
        console.error('Error saving score:', e);
    }
}

function resetScore() {
    playerScore = 0;
    gameTimer = 0;
}

function updateScore(deltaSeconds) {
    gameTimer += deltaSeconds;

    // Award 1 point per 100ms survived
    const newScore = Math.floor(gameTimer * 10); // 10 points per second = 1 point per 100ms
    if (newScore > playerScore) {
        playerScore = newScore;
    }
}

function addScore(points) {
    playerScore += points;
}

function getPlayerScore() {
    return playerScore;
}

function getBestScore() {
    return bestScore;
}

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
    getBestScore,
    getPlayerScore,
    initBestScoreFromLeaderboard,
    loadLeaderboard,
    resetScore,
    saveScoreToLeaderboard,
    updateBestScore,
    updateScore
};
