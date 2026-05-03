// ==========================================
// FUNGSI PAPARAN BILIK TROFI (ACHIEVEMENTS)
// ==========================================

function showAchievementsScreen() {
    const screensToHide = ['menu-screen', 'game-screen', 'leaderboard-screen', 'shop-screen'];
    screensToHide.forEach(id => {
        const screen = document.getElementById(id);
        if (screen) screen.classList.add('hidden');
    });

    const achScreen = document.getElementById('achievements-screen');
    if (achScreen) {
        achScreen.classList.remove('hidden');
    }

    // Semak pencapaian baharu sebelum melukis skrin
    checkAndUnlockAchievements();
    renderAchievements();
}

function closeAchievementsScreen() {
    const achScreen = document.getElementById('achievements-screen');
    if (achScreen) achScreen.classList.add('hidden');
    
    const mainMenu = document.getElementById('menu-screen') || document.getElementById('main-menu');
    if (mainMenu) mainMenu.classList.remove('hidden');
}

/**
 * SISTEM PENGADIL (REFEREE LOGIC)
 * Menyemak data pemain berbanding syarat dalam achievementsData
 */
function checkAndUnlockAchievements() {
    if (typeof localPlayerData === 'undefined' || !localPlayerData) return;
    if (!localPlayerData.achievements) localPlayerData.achievements = [];

    // Gunakan data daripada data.js jika ada, jika tidak guna config.js
    const listToCheck = (typeof achievementsData !== 'undefined') ? achievementsData : [];
    
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12

    let newlyUnlocked = false;

    listToCheck.forEach(ach => {
        // Jangan semak jika sudah dibuka
        if (localPlayerData.achievements.includes(ach.id)) return;

        let conditionMet = false;
        const target = ach.reqValue;

        switch (ach.reqType) {
            case "total_score":
                if ((Number(localPlayerData.totalScore) || 0) >= target) conditionMet = true;
                break;
            case "perfect_scores":
                if ((Number(localPlayerData.perfectScores) || 0) >= target) conditionMet = true;
                break;
            case "send_challenge":
                if ((Number(localPlayerData.challengesSent) || 0) >= target) conditionMet = true;
                break;
            case "win_challenge":
                if ((Number(localPlayerData.challengesWon) || 0) >= target) conditionMet = true;
                break;
            case "total_challenges":
                if ((Number(localPlayerData.totalChallenges) || 0) >= target) conditionMet = true;
                break;
            case "lose_challenge":
                if ((Number(localPlayerData.challengesLost) || 0) >= target) conditionMet = true;
                break;
            case "total_coins": 
                if ((Number(localPlayerData.coins) || 0) >= target) conditionMet = true;
                break;
            case "total_earned": 
                if ((Number(localPlayerData.totalCoinsEarned) || 0) >= target) conditionMet = true;
                break;
            case "total_spent":
                if ((Number(localPlayerData.totalSpent) || 0) >= target) conditionMet = true;
                break;
            case "avatar_count":
                if ((Number(localPlayerData.unlockedAvatarsCount) || 0) >= target) conditionMet = true;
                break;
            case "avatar_level": 
                if ((Number(localPlayerData.maxAvatarLevel) || 0) >= target) conditionMet = true;
                break;
            case "avatars_at_level": 
                if ((Number(localPlayerData.avatarsAtLevel5) || 0) >= target) conditionMet = true; 
                break;
            case "login_streak":
                if ((Number(localPlayerData.loginStreak) || 0) >= target) conditionMet = true;
                break;
            case "daily_games":
                if ((Number(localPlayerData.dailyGamesCount) || 0) >= target) conditionMet = true;
                break;
            case "unique_games": 
                const uniqueGames = (localPlayerData.playedGamesList || []).length;
                if (uniqueGames >= target) conditionMet = true;
                break;
            case "score_threshold": 
                if ((Number(localPlayerData.gamesWithScore50Plus) || 0) >= target) conditionMet = true;
                break;
            case "play_time_late": 
                if (localPlayerData.hasPlayedLate) conditionMet = true;
                break;
            case "play_time_early": 
                if (localPlayerData.hasPlayedEarly) conditionMet = true;
                break;
            case "weekend_play":
                if (localPlayerData.hasPlayedWeekend) conditionMet = true;
                break;
            case "merdeka_day":
                if (localPlayerData.hasPlayedMerdeka) conditionMet = true;
                break;
            case "play_month":
                if (localPlayerData.hasPlayedDecember && target === 12) conditionMet = true;
                else if (currentMonth === target) conditionMet = true;
                break;
            case "shop_visits":
                if ((Number(localPlayerData.shopVisits) || 0) >= target) conditionMet = true;
                break;
            case "first_login":
                if ((Number(localPlayerData.loginCount) || 0) >= 1) conditionMet = true;
                break;
case "rank":
            case "leaderboard_rank": 
                const cRank = Number(localPlayerData.currentRank) || 999;
                const bRank = Number(localPlayerData.bestRank) || 999;
                const actualRank = Math.min(cRank, bRank);
                
                if (actualRank > 0 && actualRank <= target) {
                    conditionMet = true;
                }
                break;
            case "tie_challenge":
                if (localPlayerData.lastGameResult === 'tie') conditionMet = true;
                break;
            case "comeback_win": // 🔥 KEMASKINI: Ikut trackers.js
                if (localPlayerData.hasDoneComeback) conditionMet = true;
                break;
            case "narrow_win": // 🔥 KEMASKINI: Ikut trackers.js
                if (localPlayerData.hasDoneNarrowWin) conditionMet = true;
                break;
            case "revenge_win": // 🔥 KEMASKINI: Ikut trackers.js
                if (localPlayerData.hasDoneRevenge) conditionMet = true;
                break;
            case "hidden_secret":
                if (localPlayerData.foundSecret) conditionMet = true;
                break;
            case "all_standard_avatars":
                if ((Number(localPlayerData.unlockedAvatarsCount) || 0) >= 10) conditionMet = true;
                break;
        }

        if (conditionMet) {
            localPlayerData.achievements.push(ach.id);
            localPlayerData.coins = (Number(localPlayerData.coins) || 0) + (ach.coinReward || 0);
            localPlayerData.totalCoinsEarned = (Number(localPlayerData.totalCoinsEarned) || 0) + (ach.coinReward || 0);
            newlyUnlocked = true;
            
            // Paparkan notifikasi
            if (typeof showAchievementToast === 'function') {
                showAchievementToast(ach.name);
            }
        }
    });

    if (newlyUnlocked && typeof saveDataToFirestore === 'function') {
        saveDataToFirestore();
    }
}

// ==========================================
// FUNGSI MELUKIS SENARAI LENCANA DI SKRIN (DIKEMASKINI)
// ==========================================
function renderAchievements() {
    const listContainer = document.getElementById('achievements-list');
    const statsContainer = document.getElementById('achievements-stats'); // Ambil elemen 0/0
    
    if (!listContainer) return;
    
    listContainer.innerHTML = ''; 

    const allAchievements = (typeof achievementsData !== 'undefined') ? achievementsData : [];
    const playerAchievements = localPlayerData.achievements || [];
    const playerInventory = localPlayerData.inventory || [];

    let unlockedCount = 0; // Pembolehubah untuk kira jumlah unlock

    // 1. PAPARKAN PENCAPAIAN (ACHIEVEMENTS)
    allAchievements.forEach(ach => {
        // Semak sama ada dalam achievements ATAU dalam inventory (sebab ada yang dibeli di kedai)
        const isUnlocked = playerAchievements.includes(ach.id) || playerInventory.includes(ach.id);
        
        if (isUnlocked) {
            unlockedCount++; // Tambah +1 jika dijumpai
        }

        const card = document.createElement('div');
        card.className = `p-4 rounded-xl border-2 flex flex-col items-center text-center transition-all ${
            isUnlocked ? 'bg-white border-yellow-400 shadow-md scale-105' : 'bg-gray-100 border-gray-300 opacity-60'
        }`;

        card.innerHTML = `
            <div class="text-4xl mb-2">${isUnlocked ? '🏆' : '🔒'}</div>
            <h3 class="font-bold text-sm ${isUnlocked ? 'text-gray-800' : 'text-gray-500'}">${ach.name}</h3>
            <p class="text-xs text-gray-500 mt-1">${ach.description}</p>
            ${isUnlocked ? `<span class="mt-2 text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold">UNLOCKED</span>` : ''}
        `;
        listContainer.appendChild(card);
    });

    // 2. PAPARKAN LENCANA KEDAI (SHOP BADGES)
    // Mencari item jenis 'game' dalam inventory (ID bermula 'gb_')
    const shopBadges = playerInventory.filter(id => id.startsWith('gb_'));
    if (shopBadges.length > 0) {
        shopBadges.forEach(badgeId => {
            // Cari data lencana daripada SHOP_DATA (dalam data.js)
            let badgeData = null;
            if (typeof SHOP_DATA !== 'undefined' && SHOP_DATA.badges) {
                badgeData = SHOP_DATA.badges.find(b => b.id === badgeId);
            }

            if (badgeData) {
                unlockedCount++; // Tambah +1 untuk lencana Collector Item yang dibeli

                const card = document.createElement('div');
                card.className = "p-4 rounded-xl border-2 bg-gradient-to-br from-indigo-50 to-white border-indigo-400 shadow-md flex flex-col items-center text-center";
                card.innerHTML = `
                    <div class="text-4xl mb-2 text-indigo-600"><i class="${badgeData.icon}"></i></div>
                    <h3 class="font-bold text-sm text-indigo-900">${badgeData.name}</h3>
                    <p class="text-[10px] text-indigo-500 mt-1 uppercase font-bold">Collector Item</p>
                `;
                listContainer.appendChild(card);
            }
        });
    }

    // 3. KEMASKINI TEKS STATISTIK (0/0 KEPADA JUMLAH SEBENAR)
    if (statsContainer) {
        const totalCount = allAchievements.length + (typeof SHOP_DATA !== 'undefined' && SHOP_DATA.badges ? SHOP_DATA.badges.length : 0);
        statsContainer.innerText = `${unlockedCount} / ${totalCount}`;
    }
}

// ==========================================
// FUNGSI TRACKING (PENGUMPUL DATA)
// ==========================================

function trackGamePlay(gameType, score) {
    if (!localPlayerData) return;
    if (!localPlayerData.games) localPlayerData.games = {};
    
    // Kemaskini data permainan spesifik
    if (!localPlayerData.games[gameType]) {
        localPlayerData.games[gameType] = { count: 0, highScore: 0 };
    }
    localPlayerData.games[gameType].count++;
    if (score > localPlayerData.games[gameType].highScore) {
        localPlayerData.games[gameType].highScore = score;
    }

    // Kemaskini data global
    localPlayerData.gamesPlayedToday = (Number(localPlayerData.gamesPlayedToday) || 0) + 1;
    localPlayerData.totalScore = (Number(localPlayerData.totalScore) || 0) + score;
    
    if (score >= 50) { // Andaian 50 adalah perfect score
        localPlayerData.perfectScores = (Number(localPlayerData.perfectScores) || 0) + 1;
    }

function trackGamePlay(gameType, score) {
    // ... (kod bahagian atas yang sedia ada) ...

    // REKOD MURID MAIN HUJUNG MINGGU
    const todayDay = new Date().getDay();
    if (todayDay === 0 || todayDay === 6) {
        localPlayerData.hasPlayedWeekend = true; 
    }

    // 1. Semak lencana (Logik Tempatan)
    checkAndUnlockAchievements();

    // 2. 🔥 TAMBAH INI: SIMPAN KE FIRESTORE 🔥
    // Kita panggil fungsi simpanan supaya field 'hasPlayedWeekend' muncul di Firestore
    if (typeof saveCloudPlayerData === 'function') {
        saveCloudPlayerData();
    } else if (typeof syncDataToFirestore === 'function') {
        syncDataToFirestore();
    }
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
}