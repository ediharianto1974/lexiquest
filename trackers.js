// ==========================================
// TRACKERS.JS - FUNGSI PAPARAN & PENGUMPUL DATA
// ==========================================

window.Trackers = window.Trackers || {};

// ==========================================
// 1. FUNGSI PAPARAN (UI) - UNTUK PAPAR LENCANA
// ==========================================
function showAchievementsScreen() {
    const screensToHide = ['menu-screen', 'game-screen', 'leaderboard-screen', 'shop-screen'];
    screensToHide.forEach(id => {
        const screen = document.getElementById(id);
        if (screen) screen.classList.add('hidden');
    });

    const achScreen = document.getElementById('achievements-screen');
    if (achScreen) achScreen.classList.remove('hidden');

    if (typeof checkAndUnlockAchievements === 'function') checkAndUnlockAchievements();
    renderAchievements();
}

function closeAchievementsScreen() {
    const achScreen = document.getElementById('achievements-screen');
    if (achScreen) achScreen.classList.add('hidden');
    const mainMenu = document.getElementById('menu-screen');
    if (mainMenu) mainMenu.classList.remove('hidden');
}

function renderAchievements() {
    const listContainer = document.getElementById('achievements-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    if (typeof localPlayerData === 'undefined' || !localPlayerData) return;
    const unlockedList = localPlayerData.achievements || [];
    const allMedals = (typeof achievementsData !== 'undefined') ? achievementsData : [];

    allMedals.forEach(ach => {
        const isUnlocked = unlockedList.includes(ach.id);
        const card = document.createElement('div');
        card.className = `p-4 rounded-xl border-2 flex flex-col items-center text-center transition-all ${
            isUnlocked ? 'bg-white border-yellow-400 shadow-lg scale-105' : 'bg-gray-100 border-gray-300 opacity-60'
        }`;

        card.innerHTML = `
            <div class="text-4xl mb-2 ${isUnlocked ? '' : 'grayscale'}">${ach.icon || '🏆'}</div>
            <h3 class="font-bold text-sm ${isUnlocked ? 'text-gray-800' : 'text-gray-500'}">${ach.name}</h3>
            <p class="text-[10px] text-gray-500 mt-1">${ach.description}</p>
            ${isUnlocked ? '<span class="mt-2 text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold">DIBUKA</span>' : ''}
        `;
        listContainer.appendChild(card);
    });
}

// ==========================================
// 2. PENYAMBUNG ASAL (UNTUK ELAK RALAT SHOP/AUTH/GAME)
// ==========================================
window.Trackers.rekodLogin = function() { trackLoginStreak(); };
window.Trackers.rekodBukaKedai = function() { trackShopVisit(); };
window.Trackers.rekodKoinBelanja = function(amount) { trackCoinsSpent(amount); };
window.Trackers.rekodKoinDapat = function(amount) { trackCoinsEarned(amount); };
window.Trackers.rekodDataAvatar = function() { 
    if (typeof checkAndUnlockAchievements === 'function') checkAndUnlockAchievements(); 
};

// 🔥 INI PENYAMBUNG BARU UNTUK MENYELESAIKAN RALAT BUTANG CHECK ANSWER 🔥
window.Trackers.rekodTamatGame = function(gameType, score) { 
    trackGamePlay(gameType, score); 
};

// ==========================================
// 3. TRACKER KEDUDUKAN LEADERBOARD
// ==========================================
window.Trackers.rekodKedudukanLeaderboard = function(currentRank) {
    if (typeof localPlayerData === 'undefined' || !localPlayerData) return;
    let bestRank = localPlayerData.bestRank || 9999;
    let isNewBest = false;

    localPlayerData.currentRank = currentRank;
    if (currentRank < bestRank) {
        localPlayerData.bestRank = currentRank;
        isNewBest = true;
    }

    if (typeof saveDataToFirestore === 'function') {
        saveDataToFirestore();
    } else if (typeof saveCloudPlayerData === 'function') {
        saveCloudPlayerData();
    }

    if (isNewBest && typeof checkAndUnlockAchievements === 'function') {
        checkAndUnlockAchievements(); 
    }
};

// ==========================================
// 4. SEMUA TRACKER LAIN (GAMEPLAY, KOIN, LOG)
// ==========================================
function trackGamePlay(gameType, score) {
    if (!localPlayerData) return;
    if (!localPlayerData.games) localPlayerData.games = {};
    if (!localPlayerData.games[gameType]) localPlayerData.games[gameType] = { count: 0, highScore: 0 };
    localPlayerData.games[gameType].count++;
    if (score > localPlayerData.games[gameType].highScore) localPlayerData.games[gameType].highScore = score;

    localPlayerData.gamesPlayedToday = (Number(localPlayerData.gamesPlayedToday) || 0) + 1;
    localPlayerData.totalScore = (Number(localPlayerData.totalScore) || 0) + score;
    if (score >= 50) localPlayerData.perfectScores = (Number(localPlayerData.perfectScores) || 0) + 1;

    if (typeof checkAndUnlockAchievements === 'function') checkAndUnlockAchievements();
    if (typeof saveDataToFirestore === 'function') saveDataToFirestore();
    else if (typeof saveCloudPlayerData === 'function') saveCloudPlayerData();
}

function trackCoinsEarned(amount) {
    if (!localPlayerData) return;
    localPlayerData.totalCoinsEarned = (Number(localPlayerData.totalCoinsEarned) || 0) + amount;
}

function trackCoinsSpent(amount) {
    if (!localPlayerData) return;
    localPlayerData.totalSpent = (Number(localPlayerData.totalSpent) || 0) + amount;
}

function trackShopVisit() {
    if (!localPlayerData) return;
    localPlayerData.shopVisits = (Number(localPlayerData.shopVisits) || 0) + 1;
}

function trackLoginStreak() {
    if (!localPlayerData) return;
    const today = new Date().toDateString();
    if (localPlayerData.lastLoginDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (localPlayerData.lastLoginDate === yesterday.toDateString()) {
            localPlayerData.loginStreak = (Number(localPlayerData.loginStreak) || 0) + 1; 
        } else {
            localPlayerData.loginStreak = 1; 
        }
        localPlayerData.lastLoginDate = today;
        localPlayerData.loginCount = (Number(localPlayerData.loginCount) || 0) + 1;
    }
}