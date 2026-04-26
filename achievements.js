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
    } else {
        console.warn("ID 'achievements-screen' tidak dijumpai dalam HTML.");
        return;
    }

    renderAchievements();
}

function closeAchievementsScreen() {
    const achScreen = document.getElementById('achievements-screen');
    if (achScreen) achScreen.classList.add('hidden');
    
    const mainMenu = document.getElementById('menu-screen') || document.getElementById('main-menu');
    if (mainMenu) mainMenu.classList.remove('hidden');
}

function renderAchievements() {
    const listContainer = document.getElementById('achievements-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = ''; 

    // KINI MEMBACA DARI INVENTORY (Sebab lencana dibeli di kedai)
    let playerInventory = [];
    if (typeof localPlayerData !== 'undefined' && localPlayerData) {
        if (!Array.isArray(localPlayerData.inventory)) localPlayerData.inventory = []; 
        playerInventory = localPlayerData.inventory;
    }

    let ownedCount = 0;
    const achievementsToLoop = typeof achievementsData !== 'undefined' ? achievementsData : [];

    if (achievementsToLoop.length === 0) return;

    achievementsToLoop.forEach(ach => {
        // Semak adakah lencana ini ada dalam inventory pemain
        const isOwned = playerInventory.includes(ach.id);
        if (isOwned) ownedCount++;

        const bgClass = isOwned ? 'bg-white border-l-4 border-blue-500' : 'bg-gray-50 border-l-4 border-gray-300 opacity-80 grayscale';
        const iconClass = isOwned ? 'fas fa-medal text-blue-500' : 'fas fa-lock text-gray-400';
        const titleClass = isOwned ? 'text-gray-800' : 'text-gray-500';
        
        // Teks untuk status
        const rewardText = isOwned 
            ? `<span class="text-blue-600 font-bold text-xs"><i class="fas fa-check-circle"></i> Dimiliki</span>` 
            : `<span class="text-gray-500 font-bold text-[10px]">Syarat: ${ach.description}</span>`;

        const card = `
            <div class="${bgClass} rounded-xl shadow-sm p-4 flex items-start transition hover:shadow-md mb-3">
                <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mr-3 shrink-0 relative overflow-hidden">
                    <img src="${ach.image || 'assets/badges/default.png'}" alt="${ach.name}" class="w-7 h-7 object-contain ${isOwned ? '' : 'grayscale opacity-30'}">
                    ${!isOwned ? '<div class="absolute inset-0 flex items-center justify-center text-gray-700 text-lg"><i class="fas fa-lock"></i></div>' : ''}
                </div>
                <div class="flex-1">
                    <h3 class="${titleClass} font-bold text-sm md:text-base">${ach.name}</h3>
                    <p class="text-xs text-gray-500 mt-1 mb-2 leading-tight">${isOwned ? 'Tahniah! Anda telah memiliki lencana ini.' : 'Lencana belum dibeli.'}</p>
                    <div class="flex items-center justify-between mt-auto">
                        ${rewardText}
                    </div>
                </div>
            </div>
        `;
        listContainer.innerHTML += card;
    });

    const statsEl = document.getElementById('achievements-stats');
    if (statsEl) {
        statsEl.innerText = `Dimiliki: ${ownedCount} / ${achievementsToLoop.length}`;
    }
}

// ==========================================
// FUNGSI PENJEJAK (TRACKERS) AKTIVITI MURID
// (Hanya mengemas kini statistik, tidak lagi memberi koin percuma)
// ==========================================

function trackGamePlayed() {
    if (!localPlayerData) return;
    localPlayerData.gamesPlayedToday = (Number(localPlayerData.gamesPlayedToday) || 0) + 1;
}

function trackCoinsEarned(amount) {
    if (!localPlayerData) return;
    localPlayerData.totalCoinsEarned = (Number(localPlayerData.totalCoinsEarned) || 0) + amount;
}

function trackCoinsSpent(amount) {
    if (!localPlayerData) return;
    localPlayerData.coinsSpent = (Number(localPlayerData.coinsSpent) || 0) + amount;
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
            localPlayerData.avatarStreak = (Number(localPlayerData.avatarStreak) || 0) + 1; 
        } else {
            localPlayerData.loginStreak = 1; 
            localPlayerData.avatarStreak = 1;
        }
        
        localPlayerData.lastLoginDate = today;
        localPlayerData.gamesPlayedToday = 0; 
        
        if (typeof saveCloudPlayerData === "function") saveCloudPlayerData();
        else if (typeof syncDataToFirestore === "function") syncDataToFirestore();
    }
}