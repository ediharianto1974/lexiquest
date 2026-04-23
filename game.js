// ==========================================
// GAME LOGIC, LEVEL ACCESS & XP (NEW PROGRESSIVE MODE)
// ==========================================
const categoryDifficulty = {
    easy: ['missing', 'spelling', 'plural', 'genderNouns', 'occupations'],
    medium: ['puzzle', 'guessing', 'pastTense', 'superlatives', 'synonym', 'antonym'],
    hard: ['grammar', 'architect', 'idioms', 'listening', 'speaking']
};

// ==========================================
// KAWALAN BUTANG ENGLISH & SUBJEK
// ==========================================
function showEnglishCategories() {
    const subjectGrid = document.getElementById('subject-grid');
    const englishCat = document.getElementById('english-categories');
    
    // Sembunyikan senarai subjek, tunjuk kategori English
    if (subjectGrid) subjectGrid.classList.add('hidden');
    if (englishCat) englishCat.classList.remove('hidden');
    
    // Jika anda ada fungsi render butang, ia akan dipanggil di sini
    if (typeof renderCategoryButtons === 'function') {
        renderCategoryButtons();
    }
}

function backToSubjects() {
    const subjectGrid = document.getElementById('subject-grid');
    const englishCat = document.getElementById('english-categories');
    
    // Kembali ke paparan subjek
    if (subjectGrid) subjectGrid.classList.remove('hidden');
    if (englishCat) englishCat.classList.add('hidden');
}

function closeSubjectModal() {
    const modal = document.getElementById('subject-modal');
    if (modal) modal.classList.add('hidden');
    backToSubjects(); // Reset semula ke paparan subjek
}

function renderCategoryButtons() {
    const userScores = localPlayerData.games || {};
    const PERFECT_SCORE = 50; // Kunci Perfect Score kepada 50
    
    // 1. Fungsi Bantuan untuk kira markah
    function getRealScore(cat) {
        let rawScore = userScores[cat];
        if (typeof rawScore === 'object' && rawScore !== null) {
            return parseInt(rawScore.score || rawScore.best || rawScore.mark || 0);
        }
        return parseInt(rawScore) || 0;
    }

    // 2. Kira Mastered (Jika markah 50 ke atas)
    let easyMastered = 0;
    categoryDifficulty.easy.forEach(cat => {
        if (getRealScore(cat) >= PERFECT_SCORE) easyMastered++;
    });

    let mediumMastered = 0;
    categoryDifficulty.medium.forEach(cat => {
        if (getRealScore(cat) >= PERFECT_SCORE) mediumMastered++;
    });

    // 3. Fungsi jana butang kategori
    const createBtn = (cat, diff, isLocked) => {
        const score = getRealScore(cat);
        const isMastered = score >= PERFECT_SCORE;
        
        // FIX: Tambah showScreen('game-arena') supaya skrin bertukar ke tempat soalan!
        const actionOnClick = isLocked 
            ? `lockedAlert('${diff}')` 
            : `closeSubjectModal(); showScreen('game-arena'); initGame('${cat}');`;

        return `
            <button onclick="${actionOnClick}" 
                class="p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${isLocked ? 'bg-gray-100 border-gray-200 opacity-60' : 'bg-white border-indigo-100 hover:border-indigo-500 shadow-sm'}">
                <span class="text-sm font-black uppercase tracking-wider ${isLocked ? 'text-gray-400' : 'text-indigo-600'}">${cat}</span>
                <span class="text-3xl">${isLocked ? '🔒' : (isMastered ? '⭐' : '📖')}</span>
                <span class="text-[10px] font-bold bg-gray-100 px-2 py-1 rounded-full text-gray-600">${isLocked ? 'LOCKED' : `Score: ${score}/${PERFECT_SCORE}`}</span>
            </button>
        `;
    };

    // 4. Masukkan butang ke dalam modal HTML
    document.getElementById('list-easy').innerHTML = categoryDifficulty.easy.map(c => createBtn(c, 'easy', false)).join('');
    
    // Perlukan 3 Easy Mastered untuk buka Medium
    document.getElementById('list-medium').innerHTML = categoryDifficulty.medium.map(c => createBtn(c, 'medium', easyMastered < 3)).join('');
    
    // Perlukan 3 Medium Mastered untuk buka Hard
    document.getElementById('list-hard').innerHTML = categoryDifficulty.hard.map(c => createBtn(c, 'hard', mediumMastered < 3)).join('');
}

function lockedAlert(diff) {
    let msg = diff === 'medium' ? "Selesaikan 3 kategori EASY dengan markah penuh (50/50) untuk buka tahap ini!" : "Selesaikan 3 kategori MEDIUM dengan markah penuh (50/50) untuk buka tahap ini!";
    Swal.fire({
        icon: 'warning',
        title: 'Tahap Terkunci 🔒',
        text: msg,
        confirmButtonColor: '#4f46e5'
    });
}

// ------------------------------------------
// FUNGSI KIRA XP (PANGGIL INI BILA GAME TAMAT)
// ------------------------------------------
function giveXP(category, correctCount) {
    let multiplier = 1;
    if (categoryDifficulty.medium.includes(category)) multiplier = 2;
    if (categoryDifficulty.hard.includes(category)) multiplier = 3;

    let earnedXP = correctCount * multiplier;
    localPlayerData.totalScore = (Number(localPlayerData.totalScore) || 0) + earnedXP;
    
    // Simpan ke cloud
    saveCloudPlayerData();
    checkLevelRewardsOnLogin(); // Cek jika pemain naik level
    return earnedXP;
}

// ==========================================
// 1. SISTEM KUIZ & MEMORI PERMAINAN
// ==========================================
function initGame(type) {
    if (!type) return; 
    const safeType = type.toUpperCase(); 

    const playerName = localPlayerData.passcode || localPlayerData.name || "guest";
    const userKey = "memoriPemain_" + playerName;

    // Pemulihan Memori
    let currentMem = localPlayerData.lastPlayed || [];
    if (typeof currentMem === 'string') currentMem = currentMem.replace(/[\[\]"'\\]/g, '').split(',').map(s => s.trim()).filter(s => s !== "");
    
    let localMem = [];
    try {
        const savedMem = localStorage.getItem(userKey);
        if (savedMem) localMem = savedMem.replace(/[\[\]"'\\]/g, '').split(',').map(s => s.trim()).filter(s => s !== "");
    } catch (e) {}

    let combinedMem = localMem.length > currentMem.length ? localMem : currentMem;
    const HAD_MEMORI = 2;
    if (combinedMem.length > HAD_MEMORI) combinedMem = combinedMem.slice(-HAD_MEMORI);
    
    localPlayerData.lastPlayed = combinedMem.map(s => s.toUpperCase());

    // Sistem Anti-Grinding
    if (localPlayerData.lastPlayed.includes(safeType) && !window.currentActiveChallenge) {
        alert(`⛔ THIS CATEGORY IS RESTING! ⛔\n\nYou have played category "${safeType}" recently.\nPlease choose another category to play.\n\nRecent Memory:\n[ ${localPlayerData.lastPlayed.join(' ➔ ')} ]`);
        return; 
    }

    localPlayerData.lastPlayed.push(safeType);
    if (localPlayerData.lastPlayed.length > HAD_MEMORI) localPlayerData.lastPlayed = localPlayerData.lastPlayed.slice(-HAD_MEMORI);
    localStorage.setItem(userKey, localPlayerData.lastPlayed.join(','));

    if (typeof saveCloudPlayerData === 'function') saveCloudPlayerData(); 

    // Mula UI Permainan
    currentGameType = type;
    document.getElementById('menu-screen')?.classList.add('hidden');
    document.getElementById('game-arena')?.classList.remove('hidden');
    document.getElementById('check-btn')?.classList.remove('hidden'); 
    document.getElementById('final-score')?.classList.add('hidden');

    const checkBtn = document.getElementById('check-btn');
    if (checkBtn) {
        checkBtn.disabled = false;
        checkBtn.innerHTML = 'CHECK ANSWERS & SEE SCORE'; 
        checkBtn.classList.remove('bg-gray-400', 'cursor-not-allowed'); 
        checkBtn.classList.add('bg-green-500', 'hover:bg-green-600'); 
    }
    
    const container = document.getElementById('question-container');
    if (!container) return; // Mengelakkan ralat null
    container.innerHTML = "";
    
    let title = type.toUpperCase();
    if(type === 'guessing') title = "Guess the Word";
    if(type === 'puzzle') title = "Word Scramble";
    if(type === 'synonym') title = "Synonyms";
    if(type === 'antonym') title = "Antonyms";
    if(type === 'missing') title = "Missing Letters";
    if(type === 'pastTense') title = "Past Tense Challenge";
    if(type === 'plural') title = "Singular to Plural";
    if(type === 'spelling') title = "Correct the Spelling";
    
    const titleEl = document.getElementById('game-title');
    if (titleEl) titleEl.innerText = title;

    let allQuestions = [...(typeof gameData !== 'undefined' && gameData[type] ? gameData[type] : [])];
    if(allQuestions.length === 0) {
        container.innerHTML = "<p class='text-center text-red-500 font-bold'>Question data empty!</p>";
        return; 
    }
    allQuestions.sort(() => Math.random() - 0.5);

    allQuestions.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = "bg-white p-5 rounded-2xl border-l-4 border-indigo-400 shadow-sm";
        
        if (type === 'speaking' || type === 'pronunciation') {
            div.classList.add('text-center');
            div.innerHTML = `
                <p class="font-bold text-gray-500 mb-2">Sebut ayat di bawah:</p>
                <h1 class="text-2xl font-extrabold text-indigo-700 mb-4 target-word">${item.q}</h1>
                <button type="button" onclick="startMic(this)" class="bg-red-500 hover:bg-red-600 text-white py-3 px-6 rounded-full font-bold shadow-md">
                    🎤 Tekan & Cakap
                </button>
                <p class="status-text text-sm text-gray-500 mt-3 italic"></p>
                <input type="hidden" class="game-input" data-answer="${item.a}" value="">
            `;
        } else {
            div.innerHTML = `
                <p class="font-bold text-gray-700 mb-3">${index + 1}. ${item.q}</p>
                <input type="text" class="game-input w-full p-3 rounded-lg bg-gray-50 border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-400" placeholder="Type your answer here..." data-answer="${item.a}">
            `;
        }
        container.appendChild(div);
    });

// ==========================================
    // TAMBAHKAN KOD MASA INI DI SINI
    // ==========================================
    let timeLimit = 180; // Default: Easy = 3 minit (180 saat)
    
    if (typeof categoryDifficulty !== 'undefined') {
        // Semak tahap kesukaran untuk set masa
        const checkType = type.toLowerCase();
        if (categoryDifficulty.medium && categoryDifficulty.medium.includes(checkType)) timeLimit = 300;
        if (categoryDifficulty.hard && categoryDifficulty.hard.includes(checkType)) timeLimit = 420;
    }

    startTimer(timeLimit); // INI YANG AKAN MENGGERAKKAN JAM!

}

// ==========================================
// 2. KAWALAN MASA & MARKAH
// ==========================================

function startTimer(seconds) {
    console.log("🕒 Sistem cuba mulakan jam: " + seconds + " saat"); // Pengesan 1
    
    timeLeft = seconds;
    if(currentTimer) clearInterval(currentTimer);
    
    currentTimer = setInterval(() => {
        const mins = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;
        
        // Cari ID 'timer-text' dalam HTML
        const timerBox = document.getElementById('timer-text'); 
        
        if (timerBox) {
            timerBox.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            if (timeLeft <= 10) {
                timerBox.classList.add('animate-pulse', 'text-red-800'); 
            } else {
                timerBox.classList.remove('animate-pulse', 'text-red-800');
            }
        } else {
            console.log("❌ Ralat: Sistem tak jumpa ID 'timer-text' di dalam index.html!"); // Pengesan 2
        }

        if (timeLeft <= 0) {
            clearInterval(currentTimer);
            if (typeof timeUp === 'function') timeUp();
        }
        timeLeft--;
    }, 1000);
}

function timeUp() {
    const timerBox = document.getElementById('timer-text'); // Ditukar kepada 'timer-text'
    if (timerBox) timerBox.innerText = "TIME UP!";
    
    // Kunci semua input supaya murid tak boleh menaip lagi
    document.querySelectorAll('.game-input').forEach(input => input.disabled = true);
    
    // Tunjuk popup yang lebih kemas berbanding 'alert' biasa, dan terus semak jawapan
    Swal.fire({
        icon: 'warning',
        title: "TIME'S UP! ⏳",
        text: "Masa telah tamat. Jom semak markah anda!",
        confirmButtonText: "Semak Markah",
        confirmButtonColor: "#ef4444",
        allowOutsideClick: false
    }).then(() => {
        endGame(); // Terus kira markah tanpa murid perlu tekan butang
    });
}


function updateCategoryProgress() {
    const userScores = localPlayerData.games || {};
    let totalMastered = Object.keys(userScores).filter(cat => {
        let sc = typeof userScores[cat] === 'object' ? userScores[cat].score : parseInt(userScores[cat]) || 0;
        let tq = typeof gameData !== 'undefined' && gameData[cat] ? gameData[cat].length : -1;
        return sc > 0 && sc === tq;
    }).length;
    
    const masteryElement = document.getElementById('mastery-count');
    if (masteryElement) masteryElement.innerText = totalMastered;
}

// ==========================================
// 3. LEADERBOARD
// ==========================================
async function showLeaderboard() {
    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('game-arena').classList.add('hidden');
    document.getElementById('leaderboard-screen').classList.remove('hidden');
    
    const body = document.getElementById('leaderboard-body');
    body.innerHTML = "<tr><td colspan='6' class='p-8 text-center text-indigo-500 font-bold animate-pulse'><i class='fas fa-spinner fa-spin mr-2'></i> Fetching live scores...</td></tr>";

    try {
        const response = await fetch(SCRIPT_URL);
        const scores = await response.json();
        
        if(scores.length === 0) {
            body.innerHTML = "<tr><td colspan='6' class='p-8 text-center text-gray-400'>No records yet. Be the first to play!</td></tr>";
            return;
        }

        const studentData = {};
        
        scores.forEach(s => {
            if (!s || !s.name) return; 

            const safeName = String(s.name).toUpperCase();
            const safeCls = s.cls ? String(s.cls).toUpperCase() : "TIADA KELAS";
            const key = safeName + "_" + safeCls;
            
            if (!studentData[key]) {
                studentData[key] = {
                    name: safeName,
                    cls: s.cls || "-",
                    activeAvatar: s.activeAvatar, 
                    claimedLevel: s.claimedLevel, // <--- DIKEMASKINI: Simpan data lajur K
                    activeTitle: s.activeTitle || "Novice", 
                    games: {}
                };
            }
            
            if (s.type && s.score !== undefined) {
                let numericScore = Number(s.score) || 0;
                let numericTotal = Number(s.total) || 0;
                let currentBestScore = studentData[key].games[s.type] ? studentData[key].games[s.type].score : -1;
                if (numericScore > currentBestScore) {
                    studentData[key].games[s.type] = { score: numericScore, total: numericTotal };
                }
            } else {
                studentData[key].directTotal = Number(s.total) || 0;
            }
        });

        const leaderboard = Object.values(studentData).map(student => {
            let grandScore = 0;
            let grandMax = 0;
            const gameList = [];
            for (const [gameName, gameData] of Object.entries(student.games)) {
                grandScore += Number(gameData.score);
                grandMax += Number(gameData.total);
                gameList.push({ name: gameName, score: Number(gameData.score), total: Number(gameData.total) });
            }
            if (student.directTotal !== undefined && student.directTotal > 0) {
                grandScore = Number(student.directTotal);
                grandMax = Number(student.directTotal);
            }
            return { ...student, gameList, grandScore, grandMax };
        });

        leaderboard.sort((a, b) => b.grandScore - a.grandScore);

        body.innerHTML = "";
        let allRowsHTML = "";
        const currentPlayerName = (typeof localPlayerData !== 'undefined' && localPlayerData && localPlayerData.name) 
                                  ? String(localPlayerData.name).toUpperCase() 
                                  : "";

        leaderboard.slice(0, 50).forEach((student, index) => {
            let currentRank = index + 1;
            let rankIcon = `#${index+1}`;
            if(index === 0) rankIcon = `🥇`;
            if(index === 1) rankIcon = `🥈`;
            if(index === 2) rankIcon = `🥉`;
            
            if (currentPlayerName !== "" && student.name === currentPlayerName) {
                if (typeof checkLeaderboardAchievements === 'function') {
                    checkLeaderboardAchievements(currentRank);
                }
            }

            // 1. LUKIS AVATAR (DIKEMASKINI DENGAN JSON.PARSE)
            let avatarHtml = '';
            if (student.activeAvatar) {
                // <--- DIKEMASKINI: Tukar teks JSON kepada Object
                let active = typeof student.activeAvatar === 'string' ? JSON.parse(student.activeAvatar) : student.activeAvatar;
                
                let avatarKey = active.key || active.id || active.avatarKey;
                let visualContent = '';
                let isLegendaryImage = false;
                const rawData = (typeof avatars !== 'undefined') ? avatars : (typeof avatarsData !== 'undefined' ? avatarsData : null);

                if (rawData && rawData[avatarKey] && rawData[avatarKey].levels) {
                    let safeLevel = active.level || 1; 
                    const levelInfo = rawData[avatarKey].levels.slice().reverse().find(l => safeLevel >= l.level);

                    if (levelInfo && levelInfo.img) {
                        visualContent = `<img src="${levelInfo.img}" class="w-14 h-14 md:w-16 md:h-16 object-contain drop-shadow-[0_0_8px_rgba(255,140,0,0.8)] legendary-avatar mx-auto">`;
                        isLegendaryImage = true;
                    } else {
                        let iconToUse = (levelInfo && levelInfo.icon) ? levelInfo.icon : active.icon;
                        visualContent = `<i class="${iconToUse} text-xl md:text-2xl text-yellow-600"></i>`;
                    }
                } else {
                    visualContent = active.img 
                        ? `<img src="${active.img}" class="w-14 h-14 md:w-16 md:h-16 object-contain drop-shadow-md legendary-avatar mx-auto">` 
                        : `<i class="${active.icon} text-xl md:text-2xl text-yellow-600"></i>`;
                    if (active.img) isLegendaryImage = true;
                }
                
                let containerClass = isLegendaryImage 
                    ? "w-12 h-12 md:w-14 md:h-14 flex items-center justify-center mb-1 relative" 
                    : "avatar-3d-glow bg-indigo-50 border-2 border-indigo-200 rounded-full w-12 h-12 md:w-14 md:h-14 flex items-center justify-center mb-1 relative"; 

                avatarHtml = `
                    <div class="flex flex-col items-center justify-center p-2">
                        <div class="${containerClass}">
                            ${visualContent}
                            <div class="absolute -bottom-1 -right-1 z-10 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-white shadow-sm">Lvl ${active.level || 1}</div>
                        </div>
                        <div class="text-[9px] font-bold text-yellow-700 text-center uppercase bg-yellow-100 px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap w-max mx-auto mt-1">${active.name}</div>
                    </div>`;
            } else {
                avatarHtml = `<div class="text-[10px] text-gray-400 italic text-center py-4">No Guardian</div>`;
            }

            // 2. GELARAN KARAKTER
            const titleName = String(student.activeTitle || "Novice");
            const rawAchievements = (typeof achievementsData !== 'undefined') ? achievementsData : [];
            const titleData = rawAchievements.find(ach => ach.name === titleName);
            const tier = titleData ? titleData.tier : 'common';
            const achId = titleData ? titleData.id : ''; 
            
            let titleHTML = "";
            const upperTitle = titleName.toUpperCase();

            if (achId === 'ach_16') titleHTML = `<div class="title-king inline-block mt-1">👑 ${upperTitle}</div>`;
            else if (achId === 'ach_15') titleHTML = `<div class="title-legendary-beast inline-block mt-1">👾 ${upperTitle}</div>`;
            else if (achId === 'ach_08') titleHTML = `<div class="title-master inline-block mt-1">🔥 ${upperTitle}</div>`;
            else if (tier === 'legendary') titleHTML = `<div class="title-legendary inline-block mt-1">🏆 ${upperTitle}</div>`;
            else if (tier === 'epic') titleHTML = `<div class="title-epic text-[10px] md:text-xs inline-block mt-1">✨ ${upperTitle}</div>`;
            else if (tier === 'rare') titleHTML = `<div class="title-rare text-[10px] md:text-xs inline-block mt-1">⭐ ${upperTitle}</div>`;
            else titleHTML = `<div class="title-common text-[10px] md:text-xs inline-block mt-1">${upperTitle}</div>`;

            // 3. PENGIRAAN LEVEL (DIKEMASKINI: Baca Lajur K jika ada)
            let studentLevel = Math.floor(student.grandScore / 100) + 1;
            
            // <--- DIKEMASKINI: Jika lajur K ada data, ambil nilai maks
            if (student.claimedLevel) {
                try {
                    let lvlData = typeof student.claimedLevel === 'string' ? JSON.parse(student.claimedLevel) : student.claimedLevel;
                    if (Array.isArray(lvlData) && lvlData.length > 0) {
                        studentLevel = Math.max(...lvlData);
                    }
                } catch(e) {}
            }

            let studentLevelTitle = "Novice";
            if (studentLevel >= 151) studentLevelTitle = "Transcendent";
            else if (studentLevel >= 101) studentLevelTitle = "Omniscient";
            else if (studentLevel >= 51) studentLevelTitle = "Adept";

            let newLevelBadgeHTML = `<div class="mt-1 flex items-center gap-1 text-[11px] md:text-sm font-semibold text-pink-600"><i class="fas fa-certificate"></i> Lv.${studentLevel} ${studentLevelTitle}</div>`;

            // 4. LENCANA PERMAINAN
            let gamesBadgesHtml = student.gameList.map(game => {
                return `<span class="inline-block bg-indigo-50 border border-indigo-200 text-indigo-700 text-[9px] md:text-xs px-2 py-1 rounded-md m-0.5 font-semibold">${game.name}: <span class="text-green-600">${game.score}/${game.total}</span></span>`;
            }).join('');

            // 5. MARKAH KESELURUHAN
            const totalHtmlRes = `<span class="bg-indigo-600 text-white px-2 py-1 md:px-3 md:py-1 rounded-full font-bold shadow-md text-xs md:text-base whitespace-nowrap">${student.grandScore} XP</span>`;

            // 6. BINA BARIS JADUAL
            const row = `
                <tr class="border-b-2 border-indigo-100 hover:bg-gray-50 transition">
                    <td class="p-2 md:p-4 font-bold text-indigo-600 text-sm md:text-xl text-center align-middle">${rankIcon}</td>
                    <td class="p-1 md:p-2 w-12 md:w-24 align-middle">${avatarHtml}</td>
                    <td class="p-2 md:p-4 align-middle">
                        <div class="font-black uppercase text-gray-800 text-xs md:text-lg">${student.name}</div>
                        ${titleHTML}
                        <br> ${newLevelBadgeHTML}
                    </td>
                    <td class="p-2 md:p-4 text-[10px] md:text-sm text-gray-500 text-center align-middle">${student.cls || "-"}</td>
                    <td class="p-2 md:p-4 align-middle">
                        <div class="flex flex-wrap gap-1 justify-start">
                            ${gamesBadgesHtml}
                        </div>
                    </td>
                    <td class="p-2 md:p-4 text-center align-middle">${totalHtmlRes}</td>
                </tr>
            `;
            allRowsHTML += row; 
        });

        body.innerHTML = allRowsHTML;

    } catch (error) {
        console.error("Leaderboard Error:", error);
        body.innerHTML = `<tr><td colspan='6' class='p-8 text-center text-red-500 font-bold'><i class='fas fa-exclamation-triangle'></i> Ralat: ${error.message} <br> <span class='text-xs'>Sila refresh halaman.</span></td></tr>`;
    }
}

// ==========================================
// 4. SISTEM CABARAN (MULTIPLAYER)
// ==========================================
function generateChallengeCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return '#C-' + result;
}

async function generateChallenge() {
    const code = generateChallengeCode();
    const scoreText = document.getElementById('score-val')?.innerText || "0/0";
    
    const payload = {
        action: "createChallenge", challengeCode: code, challengerName: localPlayerData.name,
        challengerClass: localPlayerData.class || "-", gameType: currentGameType, challengerScore: parseInt(scoreText.split('/')[0]) || 0
    };
    try {
        await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) });
        alert("Challenge Code generated: " + code + "\nShare this code to your friend!");
    } catch (e) {}
}

async function joinChallenge() {
    const codeInput = document.getElementById('challenge-input-code')?.value.trim().toUpperCase();
    if (!codeInput) return;
    
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getChallenge&code=${encodeURIComponent(codeInput)}`);
        const data = await response.json();
        if (data.error) { alert("Invalid code!"); return; }
        
        isChallengeMode = true; activeChallengeCode = codeInput;
        targetScoreToBeat = data.challengerScore; activeChallengerName = data.challengerName;
        
        alert(`⚔️ CHALLENGE FOUND!\nOpponent: ${activeChallengerName}\nCategory: ${data.gameType.toUpperCase()}`);
        initGame(data.gameType); 
    } catch (e) {}
}

function checkChallengeReward(myScore) {
    if (!isChallengeMode) return 0; 
    let reward = 0;
    if (myScore > targetScoreToBeat) { reward = 50; alert(`🏆 YOU'VE WON! Opponent: ${activeChallengerName}`); } 
    else if (myScore === targetScoreToBeat) { reward = 20; alert(`🤝 SERI!`); } 
    else alert(`💔 YOU'VE LOST!`);
    
    fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify({ action: "completeChallenge", challengeCode: activeChallengeCode }) });
    isChallengeMode = false; activeChallengeCode = null;
    return reward;
}

// ==========================================
// FUNGSI SERTAI CABARAN RAKAN
// ==========================================
async function promptJoinChallenge() {
    const code = prompt("Please enter the Challenge Code:\n(Example: CHL-1234)");
    
    if (!code || code.trim() === "") return; 

    const cleanCode = code.trim().toUpperCase();
    console.log("Menyemak kod cabaran: " + cleanCode);

    try {
        // Hantar maklumat ke Google Sheets secara POST
        const payload = {
            action: "getChallenge",
            challengeCode: cleanCode
        };

        // Pastikan SCRIPT_URL anda telah didefinasikan di bahagian atas fail JS
        const response = await fetch(SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        // Semak respon
        if (data.error) {
            alert("❌ GAGAL: " + data.error);
        } else {
            alert(`🔥 CHALLENGE FOUND!\n\nOpponet: ${data.challengerName} (${data.challengerClass})\nCategory: ${data.gameType}\nScore to beat: ${data.challengerScore}\n\nGood Luck!`);

            // Simpan data cabaran dalam memori untuk dibandingkan lepas habis game
            window.currentActiveChallenge = {
                code: cleanCode,
                challengerName: data.challengerName,
                gameType: data.gameType,
                targetScore: data.challengerScore
            };

            // MULA PERMAINAN MENGGUNAKAN initGame
            if (typeof initGame === 'function') {
                // Sembunyikan menu utama (jika perlu) sebelum mula game
                const menuScreen = document.getElementById('menu-screen');
                if (menuScreen) menuScreen.classList.add('hidden');
                
                // Mula game mengikut kategori cabaran
                initGame(data.gameType);
            } else {
                alert("Ralat: Fungsi initGame tidak dijumpai dalam sistem.");
            }
        }

    } catch (error) {
        console.error("Ralat Rangkaian:", error);
        alert("Connection error. Please make sure your internet is stable and try again.");
    }
}

// ==========================================
// FUNGSI SEMAK RESULT CABARAN (GAME OVER)
// ==========================================
function checkAndCompleteChallenge(playerFinalScore) {
    // 1. Semak adakah pemain sedang bermain dalam mod cabaran
    if (!window.currentActiveChallenge) return;

    const challenge = window.currentActiveChallenge;
    const target = parseInt(challenge.targetScore);
    const score = parseInt(playerFinalScore);

    console.log(`Checking challenge: Your score ${score} vs Target score ${target}`);

    if (score > target) {
        // --- MENANG CABARAN ---
        const rewardCoins = 50; // Jumlah syiling menang cabaran
        
        // Kemaskini data profil
        localPlayerData.coins = (Number(localPlayerData.coins) || 0) + rewardCoins;
        localPlayerData.challengesWon = (Number(localPlayerData.challengesWon) || 0) + 1;
        
        // Papar Notifikasi Menang
        alert(`🎉 CONGRATULATION CHALLENGE COMPLETED!\n\nYou have beaten ${challenge.challengerName}!\nYour Score: ${score}\nTarget Score: ${target}\n\nReward: +${rewardCoins} Coins!`);

        // Arahkan Google Sheets untuk "Tutup" (Completed) cabaran ini
        try {
            const payload = {
                action: "completeChallenge",
                challengeCode: challenge.code
            };
            fetch(SCRIPT_URL, {
                method: "POST",
                body: JSON.stringify(payload)
            });
        } catch (e) {
            console.error("Gagal menutup cabaran di database", e);
        }

    } else if (score === target) {
        // --- SERI ---
        localPlayerData.challengesTied = (Number(localPlayerData.challengesTied) || 0) + 1;
        alert(`🤝 CHALLENGE TIED!\n\nYour score is the same with ${challenge.challengerName} (${score}).\nPlease try again to beat the record!`);
        
    } else {
        // --- KALAH ---
        localPlayerData.challengesLost = (Number(localPlayerData.challengesLost) || 0) + 1;
        alert(`💔 CHALLENGE FAILED!\n\nYou have not beaten ${challenge.challengerName}.\nYour Score: ${score}\nTarget Score: ${target}\n\nDon't give up, try again!`);
    }

    // 2. Padam memori cabaran supaya ia tak berulang kali dipanggil
    window.currentActiveChallenge = null;
    
    // 3. Simpan perubahan (Coins & Stats) ke Cloud Database
    if (typeof saveCloudPlayerData === 'function') {
        saveCloudPlayerData();
    }
}

/* ==========================================
   FUNGSI AUDIO UNTUK LISTENING GAME (WEB SPEECH API)
   ========================================== */
window.playAudio = function(wordToSay) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); 
        var msg = new SpeechSynthesisUtterance();
        msg.text = wordToSay;
        msg.lang = 'en-US'; 
        msg.rate = 0.85; // Diperlahankan sedikit supaya murid dengar dengan jelas
        window.speechSynthesis.speak(msg);
    } else {
        alert("Maaf, pelayar (browser) peranti ini tidak menyokong fungsi audio.");
    }
};

/* ==========================================
   FUNGSI AI SUARA (SPEECH RECOGNITION) - VERSI KEBAL
   ========================================== */
window.startMic = function(btnElement) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Sila gunakan Google Chrome untuk ciri Mikrofon.");
        return;
    }

    // CARA BAHARU: Suruh sistem cari kotak utama (kad putih) berbanding kotak sebelah
    const parentDiv = btnElement.closest('.bg-white') || btnElement.parentElement;
    
    // Cari elemen perkataan (AI akan cari class .target-word ATAU tag <h1> sebagai sandaran)
    const wordElement = parentDiv.querySelector('.target-word') || parentDiv.querySelector('h1');
    
    if (!wordElement) {
        alert("Ralat Sistem: Tidak dapat mengesan teks soalan di skrin.");
        return;
    }

    const targetWord = wordElement.innerText.toLowerCase();
    const statusText = parentDiv.querySelector('.status-text');
    const hiddenInput = parentDiv.querySelector('.game-input');

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = function() {
        btnElement.innerHTML = "🎙️ Mendengar...";
        btnElement.classList.replace('bg-red-500', 'bg-red-800');
        if(statusText) statusText.innerText = "Sila sebut sekarang...";
    };

    recognition.onresult = function(event) {
        // Ambil suara murid
        let transcript = event.results[0][0].transcript.toLowerCase().trim();
        
        // Buang tanda baca supaya AI tak keliru
        let cleanTranscript = transcript.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
        let cleanTarget = targetWord.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");

        if (cleanTranscript === cleanTarget) {
            if(statusText) {
                statusText.innerText = "✅ TEPAT! (" + transcript + ")";
                statusText.classList.replace('text-gray-500', 'text-green-600');
            }
            // Masukkan jawapan betul ke dalam input ghaib
            if(hiddenInput) hiddenInput.value = targetWord; 
            
            btnElement.innerHTML = "✅ Selesai";
            btnElement.disabled = true;
            btnElement.classList.replace('bg-red-800', 'bg-green-500');
        } else {
            if(statusText) {
                statusText.innerText = "❌ Anda sebut: '" + transcript + "'. Cuba lagi!";
                statusText.classList.replace('text-gray-500', 'text-red-500');
            }
            btnElement.innerHTML = "🎤 Cuba Lagi";
            btnElement.classList.replace('bg-red-800', 'bg-red-500');
        }
    };

    recognition.onerror = function(event) {
        if(statusText) statusText.innerText = "Gagal mengecam suara. Sila tekan sekali lagi.";
        btnElement.innerHTML = "🎤 Tekan & Cakap";
        btnElement.classList.replace('bg-red-800', 'bg-red-500');
    };

    recognition.onend = function() {
        if(btnElement.innerHTML !== "✅ Selesai") {
            btnElement.innerHTML = "🎤 Tekan & Cakap";
            btnElement.classList.replace('bg-red-800', 'bg-red-500');
        }
    };

    recognition.start();
  };

// ==========================================
// 3. PENGIRAAN MARKAH (END GAME)
// ==========================================
function endGame() {
    // 1. Hentikan masa (jika ia masih berjalan)
    if (typeof currentTimer !== 'undefined') clearInterval(currentTimer);

    let score = 0;
    const inputs = document.querySelectorAll('.game-input');
    const totalQuestions = inputs.length;

    // Jika tiada soalan, elakkan ralat
    if (totalQuestions === 0) return;

    // Sembunyikan butang semak supaya tak ditekan 2 kali
    const checkBtn = document.getElementById('check-btn');
    if (checkBtn) checkBtn.classList.add('hidden');

    // 2. Semak setiap jawapan murid
    inputs.forEach(input => {
        input.disabled = true; // Kunci kotak supaya tak boleh diubah lagi
        
        // Ambil jawapan murid dan jawapan sebenar (huruf kecil supaya tidak sensitif huruf besar)
        const userAnswer = input.value.trim().toLowerCase();
        const correctAnswer = input.getAttribute('data-answer').trim().toLowerCase();

        if (userAnswer === correctAnswer && userAnswer !== "") {
            // Jika BETUL: Warna hijau
            score++;
            input.classList.remove('bg-gray-50', 'border-gray-200');
            input.classList.add('bg-green-100', 'border-green-500', 'text-green-800', 'font-bold');
        } else {
            // Jika SALAH / KOSONG: Warna merah dan tunjuk jawapan sebenar
            input.classList.remove('bg-gray-50', 'border-gray-200');
            input.classList.add('bg-red-100', 'border-red-500', 'text-red-800');
            
            if (userAnswer === "") {
                input.value = `(Jawapan: ${input.getAttribute('data-answer')})`;
            } else {
                input.value = `${input.value} ❌ (Betul: ${input.getAttribute('data-answer')})`;
            }
        }
    });

// 3. Kira peratus markah
    const percentage = Math.round((score / totalQuestions) * 100);

// ==========================================
    // LOGIK SIMPAN MARKAH, XP & KOIN 💰
    // ==========================================
    
    // 1. Tentukan pengganda (multiplier) berdasarkan tahap kesukaran
    let multiplier = 1; // Default: Easy (1 betul = 1 mata)
    
    if (typeof categoryDifficulty !== 'undefined' && currentGameType) {
        const typeCheck = currentGameType.toLowerCase();
        
        if (categoryDifficulty.medium && categoryDifficulty.medium.includes(typeCheck)) {
            multiplier = 2; // Medium
        } else if (categoryDifficulty.hard && categoryDifficulty.hard.includes(typeCheck)) {
            multiplier = 3; // Hard
        }
    }

// 2. Kira jumlah XP dan Koin yang dimenangi
    let pointsEarned = score * multiplier; 
    let coinsEarned = score * 2 * multiplier; // Formula koin cikgu sebelum ini (boleh ubah jika mahu)
    
    if (typeof localPlayerData !== 'undefined') {
        // Tambah mata ke totalScore (XP)
        localPlayerData.totalScore = (parseInt(localPlayerData.totalScore) || 0) + pointsEarned;
        
        // 💰 TAMBAH KOIN KE DALAM PANGKALAN DATA!
        localPlayerData.coins = (parseInt(localPlayerData.coins) || 0) + coinsEarned;
        
        // ==========================================
        // 🏆 TAMBAHAN BAHARU: SIMPAN MARKAH TERTINGGI KATEGORI
        // ==========================================
        if (!localPlayerData.games) {
            localPlayerData.games = {}; // Cipta rekod 'games' jika murid baru dan belum ada
        }
        
        // Kenal pasti game apa yang sedang dimainkan (contoh: 'missing', 'spelling')
        let catName = (typeof currentGameType !== 'undefined' && currentGameType !== "") ? currentGameType : "missing";
        
        // Ambil rekod markah lama
        let currentBest = localPlayerData.games[catName] || 0;
        
        // Pastikan format nombor dibaca dengan betul 
        if (typeof currentBest === 'object') {
            currentBest = parseInt(currentBest.score || currentBest.best || currentBest.mark || 0);
        } else {
            currentBest = parseInt(currentBest) || 0;
        }

        // Hanya kemaskini memori JIKA markah baru LEBIH TINGGI daripada markah lama
        if (score > currentBest) {
            localPlayerData.games[catName] = score;
            console.log(`⭐ Markah tertinggi baru untuk ${catName}: ${score}`);
        }
        // ==========================================
        
        // Simpan semua kemaskini ke LocalStorage peranti
        localStorage.setItem('currentPlayer', JSON.stringify(localPlayerData));
        
        // Hantar data terbaru ke Firestore (Cloud)
        if (typeof saveCloudPlayerData === 'function') {
            saveCloudPlayerData();
        }

        // Kemaskini paparan XP bar, Syiling, dan lain-lain UI
        if (typeof updateUI === 'function') updateUI();
    }
    // ==========================================

// ==========================================
    // 🎯 TUGASAN BARU: SIMPAN REKOD BUKU LOG KE FIREBASE
    // ==========================================
    try {
        // Tentukan nama tahap kesukaran (Easy, Medium, Hard) berdasarkan multiplier cikgu
        let currentDifficulty = "Easy";
        if (multiplier === 2) currentDifficulty = "Medium";
        if (multiplier === 3) currentDifficulty = "Hard";
        
        // Kenal pasti nama kategori game (contoh: Missing, Spelling)
        let gameCategoryName = (typeof currentGameType !== 'undefined') ? currentGameType : "Latihan";
        
        // Panggil fungsi simpan rekod!
        if (typeof saveGameRecord === 'function') {
            saveGameRecord(gameCategoryName, currentDifficulty, score, totalQuestions);

	// 🔥 TAMBAH INI: Selepas simpan, terus semak untuk buka level!
            checkAndUnlockLevels();
        }
    } catch (error) {
        console.error("Ralat memanggil saveGameRecord:", error);
    }
    // ==========================================

// ==========================================
    // 🚚 POSMEN MENGHANTAR MARKAH KE GOOGLE SHEETS (VERSI FIX)
    // ==========================================
    try {
        let currentPlayerName = localPlayerData.name || localStorage.getItem("playerName") || "Guest";
        let currentPlayerClass = localPlayerData.class || localStorage.getItem("playerClass") || "-";

        const scorePayload = {
            action: "submitScore",
            name: currentPlayerName, 
            cls: currentPlayerClass, 
            type: typeof currentGameType !== 'undefined' ? currentGameType : "Latihan",             
            score: score, // Markah yang murid dapat
            total: (typeof totalQuestions !== 'undefined') ? totalQuestions : (typeof total !== 'undefined' ? total : 0) 
            // ^ Baris di atas akan cuba guna 'totalQuestions', kalau tak jumpa dia guna 'total'
        };

        const targetURL = (typeof SCRIPT_URL !== "undefined") ? SCRIPT_URL : "https://script.google.com/macros/s/AKfycbwG1uiPv8Z0LCpHxmmcs5H3ZT_aPh0uOTfTCqmb5lyGF4C224BXObkeGJgq8pnj8W6C/exec";

        fetch(targetURL, {
            method: "POST",
            body: JSON.stringify(scorePayload)
        })
        .then(res => res.json())
        .then(data => console.log("✅ Markah berjaya dihantar ke Google Sheets:", data))
        .catch(err => console.error("❌ Ralat hantar markah:", err));
    } catch (error) {
        console.error("Gagal menjana payload markah:", error);
    }
    // ==========================================

    // 4. Paparkan keputusan menggunakan tetingkap pop-up
    Swal.fire({
        icon: percentage >= 50 ? 'success' : 'error',
        title: 'Permainan Tamat! 🏁',
        html: `Anda berjaya menjawab <b>${score}</b> daripada <b>${totalQuestions}</b> soalan dengan betul.<br><br>Markah Keseluruhan: <span class="text-2xl font-bold text-indigo-600">${percentage}%</span><br><br><span class="text-sm text-green-600 font-bold">+ ${pointsEarned} XP Earned!</span>`,
        confirmButtonText: 'Kembali ke Menu',
        confirmButtonColor: '#4f46e5',
        allowOutsideClick: false
    }).then(() => {
        // 5. Kembali ke paparan asal selepas murid menekan butang "Kembali"
        const gameArena = document.getElementById('game-arena');
        const menuScreen = document.getElementById('menu-screen');
        const finalScoreScreen = document.getElementById('final-score');
        
        if (gameArena) gameArena.classList.add('hidden');
        if (finalScoreScreen) finalScoreScreen.classList.add('hidden');
        if (menuScreen) menuScreen.classList.remove('hidden');
        
        // Jika ada fungsi untuk kembalikan paparan kategori subjek
        if (typeof backToSubjects === 'function') backToSubjects();
    });
}

function updateUI() {
    // 1. Pastikan data pemain wujud
    if (typeof localPlayerData === 'undefined' || !localPlayerData) return;

    // 2. Ambil nilai totalScore
    const currentScore = localPlayerData.totalScore || 0;

    // 3. Kemaskini Paparan Syiling & Mata
    const scoreElements = ['total-points']; 
    scoreElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = currentScore;
    });

    const elCoins = document.getElementById('display-coins');
    const elUserCoins = document.getElementById('user-coins');
    
    if (elCoins) elCoins.innerText = localPlayerData.coins || 0;
    if (elUserCoins) elUserCoins.innerText = localPlayerData.coins || 0;

    // 4. Kemaskini Nama & Kelas
    const nameEl = document.getElementById('menu-player-name');
    const classEl = document.getElementById('menu-player-class');
    const playerName = localPlayerData.name || "Adventurer";
    
    if (nameEl) nameEl.innerText = playerName;
    if (classEl) classEl.innerText = localPlayerData.class || "6 CEMERLANG";

    // 5. LOGIK XP BAR (Penuh Progresif!)
    const xpText = document.getElementById('xp-text');
    const xpBarFill = document.getElementById('xp-bar-fill');
    const nextLevelText = document.getElementById('next-level-text');
    
    let tempScore = Number(currentScore) || 0;
    let calculatedLevel = 1;
    let requiredXpForNextLevel = 100; 

    while (tempScore >= requiredXpForNextLevel) {
        tempScore -= requiredXpForNextLevel;
        calculatedLevel++;
        requiredXpForNextLevel += 50;
    }

    const xpInCurrentLevel = tempScore;
    const progressPercent = (xpInCurrentLevel / requiredXpForNextLevel) * 100;

    localPlayerData.level = calculatedLevel;
    localStorage.setItem('currentPlayer', JSON.stringify(localPlayerData));

    if (xpText) xpText.innerText = `XP: ${xpInCurrentLevel} / ${requiredXpForNextLevel}`;
    if (xpBarFill) xpBarFill.style.width = `${progressPercent}%`;
    if (nextLevelText) nextLevelText.innerText = `LEVEL ${calculatedLevel + 1}`; 

    const levelDisplay = document.querySelector('#menu-player-class'); 
    if (levelDisplay && localPlayerData.class) {
        levelDisplay.innerText = `${localPlayerData.class} • LEVEL ${calculatedLevel}`;
    }

// ==========================================
    // ⭐ 6. KEMASKINI AVATAR (VERSI BACA DATA DATABASE)
    // ==========================================
    const avatarContainer = document.getElementById('dashboard-avatar-container');
    const currentLiveName = (localPlayerData && localPlayerData.name) ? localPlayerData.name : "";
    
    if (avatarContainer) {
        // Kosongkan container dahulu
        avatarContainer.innerHTML = ""; 

        // AMBIL DATA AVATAR DARI MEMORI (Guna activeAvatar berdasarkan Firestore cikgu)
        const savedAvatar = (localPlayerData && localPlayerData.activeAvatar) ? localPlayerData.activeAvatar : "fas fa-user";

        if (currentLiveName.trim().toUpperCase() === "GAME MASTER") {
            // --- LOGIK KHAS GAME MASTER ---
            const img = document.createElement('img');
            
            // Semak adakah data bermula dengan "img|"
            if (savedAvatar.startsWith("img|")) {
                img.src = savedAvatar.replace("img|", ""); // Buang perkataan "img|" untuk dapat link sebenar
            } else {
                // Fallback jika tiada gambar diset
                img.src = "https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png"; 
            }
            
            img.className = "w-full h-full object-contain rounded-full"; 
            img.style.display = "block";
            avatarContainer.appendChild(img);
            
            // Efek Glow Emas
            avatarContainer.style.border = "3px solid gold";
            avatarContainer.style.boxShadow = "0 0 20px gold";
            
        } else {
            // --- LOGIK MURID BIASA ---
            if (savedAvatar.startsWith("img|")) {
                // JIKA IA ADALAH GAMBAR (contoh: img|assets/avatars/avatar.gif)
                const img = document.createElement('img');
                img.src = savedAvatar.replace("img|", "");
                img.className = "w-full h-full object-cover rounded-full";
                avatarContainer.appendChild(img);
            } else {
                // JIKA IA ADALAH IKON BUKAN GAMBAR (contoh: fas fa-user)
                avatarContainer.innerHTML = `<i class="${savedAvatar} text-indigo-500 text-3xl"></i>`;
            }
            
            avatarContainer.style.border = "2px solid #6366f1";
            avatarContainer.style.boxShadow = "none";
        }
    }

    // 🛍️ KEMASKINI KEDAI AVATAR
    if (typeof loadAvatarShop === 'function') {
        loadAvatarShop();
    } else if (typeof updateShopUI === 'function') {
        updateShopUI();
    }
}

// ==========================================
// 📊 FUNGSI REKOD PRESTASI PERMAINAN (LOG BUKU REKOD)
// ==========================================
async function saveGameRecord(category, difficulty, score, maxScore) {
    try {
        // 1. Pastikan data pemain wujud
        if (!localPlayerData || !localPlayerData.name) {
            console.error("Gagal simpan rekod: Tiada nama pemain dijumpai.");
            return;
        }

        // 2. Semak adakah markah ini Perfect Score (Markah Penuh)?
        const isPerfect = (score === maxScore);

        // 3. Susun data untuk dihantar ke Firebase
        const newRecord = {
            playerName: localPlayerData.name, // Nama murid
            category: category,               // Contoh: "Missing"
            difficulty: difficulty,           // Contoh: "Easy"
            score: parseInt(score),
            maxScore: parseInt(maxScore),
            isPerfectScore: isPerfect,
            timestamp: new Date().toISOString() // Tarikh & masa direkod
        };

        // 4. Hantar ke koleksi baharu: 'game_records'
        // Kita guna .add() supaya ia cipta dokumen baru setiap kali main, bukan tindih yang lama
        await db.collection("game_records").add(newRecord);
        
        console.log(`✅ Rekod permainan disimpan: ${category} (${difficulty}) - Skor: ${score}/${maxScore}`);
        
    } catch (error) {
        console.error("❌ Gagal simpan rekod permainan:", error);
    }
}

// ==========================================
// 🔓 FUNGSI SEMAK & BUKA TAHAP (MEDIUM/HARD)
// ==========================================
async function checkAndUnlockLevels() {
    try {
        if (!localPlayerData || !localPlayerData.name) return;

        console.log("🔍 Menyemak kelayakan pembukaan tahap...");

        // 1. Ambil semua rekod "Perfect Score" untuk tahap "Easy" bagi murid ini
        const snapshot = await db.collection("game_records")
            .where("playerName", "==", localPlayerData.name)
            .where("difficulty", "==", "Easy")
            .where("isPerfectScore", "==", true)
            .get();

        // 2. Kita guna 'Set' untuk simpan kategori UNIK (supaya murid tak boleh main 1 kategori sama 3 kali)
        const perfectCategories = new Set();
        snapshot.forEach(doc => {
            perfectCategories.add(doc.data().category);
        });

        const totalPerfectEasy = perfectCategories.size;
        console.log(`⭐ Murid ada Perfect Score dalam ${totalPerfectEasy} kategori Easy.`);

        // 3. LOGIK PEMBUKAAN BUTANG
        const mediumBtn = document.getElementById('difficulty-medium-btn'); // Pastikan ID butang betul
        const hardBtn = document.getElementById('difficulty-hard-btn');

        // Syarat Buka Medium: Perlu 3 kategori Easy yang Perfect
        if (totalPerfectEasy >= 3) {
            if (mediumBtn) {
                mediumBtn.disabled = false;
                mediumBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                mediumBtn.innerHTML = 'MEDIUM <i class="fas fa-unlock ml-2 text-green-400"></i>';
            }
            console.log("🔓 TAHAP MEDIUM DIBUKA!");
        } else {
            // Jika belum cukup 3, kunci butang tersebut
            if (mediumBtn) {
                mediumBtn.disabled = true;
                mediumBtn.classList.add('opacity-50', 'cursor-not-allowed');
                mediumBtn.innerHTML = `MEDIUM <i class="fas fa-lock ml-2 text-red-400"></i> <br><span class="text-[10px] text-yellow-300">(${totalPerfectEasy}/3 Easy Perfect)</span>`;
            }
        }

        // Tips: Cikgu boleh tambah logik yang sama untuk tahap HARD di sini nanti.

    } catch (error) {
        console.error("❌ Ralat semasa menyemak tahap:", error);
    }
}

// ==========================================
// 📈 FUNGSI PAPARAN ANALISIS ADMIN
// ==========================================
// 1. Wajib ada pembolehubah global ini di bahagian atas
let allGameRecords = [];

// 2. GANTIKAN loadGameRecords LAMA DENGAN INI
async function loadGameRecords() {
    const tableBody = document.getElementById('analysis-table-body');
    try {
        if (!tableBody) return;
        tableBody.innerHTML = "<tr><td class='p-6 text-center font-bold text-indigo-500'>⏳ Sedang menjana rumusan murid...</td></tr>";

        // Ambil data dari Firebase
        let q = db.collection("game_records").orderBy("timestamp", "asc");
        
        // Penapis: Jika Admin Sekolah, ambil data sekolah dia sahaja
        if(localPlayerData.role === 'SCHOOL_ADMIN') {
            q = q.where("schoolName", "==", localPlayerData.schoolName);
        }

        const snapshot = await q.get();
        allGameRecords = []; // Reset data
        const studentsSet = new Set(); 

        snapshot.forEach(doc => {
            const data = doc.data();
            allGameRecords.push(data);
            studentsSet.add(data.playerName); // Simpan nama unik sahaja
        });

        // Paparkan Jadual Master (Nama Murid Sahaja)
        let html = "";
        const sortedStudents = Array.from(studentsSet).sort(); // Susun ikut abjad A-Z

        sortedStudents.forEach(name => {
            html += `
                <tr class="border-b border-gray-100 hover:bg-indigo-50 transition-colors">
                    <td class="p-4 flex items-center justify-between">
                        <div>
                            <span class="text-xs text-gray-400 block font-bold">NAMA MURID</span>
                            <span class="font-black text-indigo-900 text-lg">${name}</span>
                        </div>
                        <button onclick="showStudentDetail('${name}')" class="bg-indigo-600 text-white px-6 py-2 rounded-xl text-xs font-black hover:bg-indigo-700 shadow-md transition-all active:scale-95">
                            ANALISIS PRESTASI 🔍
                        </button>
                    </td>
                </tr>
            `;
        });

        tableBody.innerHTML = html || "<tr><td class='p-4 text-center'>Tiada rekod murid dijumpai.</td></tr>";

    } catch (error) {
        console.error("Ralat:", error);
        tableBody.innerHTML = "<tr><td class='p-4 text-red-500 text-center'>Gagal memuatkan data. Sila semak sambungan internet.</td></tr>";
    }
}

// 3. TAMBAH FUNGSI UNTUK PAPAR DETAIL (MODAL)
function showStudentDetail(studentName) {
    const modal = document.getElementById('student-detail-modal');
    const detailTable = document.getElementById('detail-table-body');
    
    if(!modal || !detailTable) return;
    
    document.getElementById('detail-student-name').innerText = studentName;

    // Tapis rekod murid ini sahaja
    const studentData = allGameRecords.filter(r => r.playerName === studentName);

    // Kumpulkan rekod ikut kategori
    const categories = {};
    studentData.forEach(r => {
        if (!categories[r.category]) categories[r.category] = [];
        categories[r.category].push(r.score);
    });

    let html = "";
    for (const cat in categories) {
        const scores = categories[cat];
        const sum = scores.reduce((a, b) => a + b, 0);
        // Kira purata (Andaian setiap game max score 50. Jika cikgu guna nilai lain, tukar angka 50 ini)
        const avg = ((sum / (scores.length * 50)) * 100).toFixed(1); 

        // Logik Ulasan Automatik
        let ulasan = "";
        if (avg >= 80) ulasan = "🌟 Sangat Cemerlang! Menguasai topik.";
        else if (avg >= 50) ulasan = "📈 Baik. Menunjukkan perkembangan positif.";
        else ulasan = "⚠️ Perlu bimbingan dan latihan tambahan.";

        html += `
            <tr class="border-b border-gray-50 hover:bg-gray-50">
                <td class="p-4 font-black text-indigo-700 uppercase text-sm">${cat}</td>
                <td class="p-4">
                    <div class="flex flex-wrap gap-1">
                        ${scores.map(s => `<span class="bg-gray-100 px-2 py-1 rounded font-bold text-xs">${s}</span>`).join("")}
                    </div>
                </td>
                <td class="p-4 text-center">
                    <span class="font-black ${avg >= 80 ? 'text-green-600' : 'text-orange-600'}">${avg}%</span>
                </td>
                <td class="p-4 text-xs italic text-gray-500 leading-tight">${ulasan}</td>
            </tr>
        `;
    }

    detailTable.innerHTML = html;
    modal.classList.remove('hidden'); // Paparkan modal
}

// 4. TAMBAH FUNGSI TUTUP MODAL
function closeStudentDetail() {
    const modal = document.getElementById('student-detail-modal');
    if(modal) modal.classList.add('hidden');
}

// Letakkan di dalam fail .js (bukan .html)
function applyAnalysisFilters() {
    const userRole = localPlayerData.role; 

    const cardSchools = document.getElementById('stat-card-schools');
    const sectionBreakdown = document.getElementById('stat-section-breakdown');
    const titleAnalysis = document.querySelector('#sa-analysis-screen h2');

    if (userRole === 'SCHOOL_ADMIN') {
        if (cardSchools) cardSchools.classList.add('hidden');
        if (sectionBreakdown) sectionBreakdown.classList.add('hidden');
        if (titleAnalysis) titleAnalysis.innerText = "📊 Analisis Prestasi Murid Sekolah";
        
        const statsGrid = document.querySelector('#sa-analysis-screen .grid');
        if (statsGrid) {
            statsGrid.classList.remove('grid-cols-2');
            statsGrid.classList.add('grid-cols-1');
        }
    } else {
        if (cardSchools) cardSchools.classList.remove('hidden');
        if (sectionBreakdown) sectionBreakdown.classList.remove('hidden');
        if (titleAnalysis) titleAnalysis.innerText = "📊 Analisis Sistem Keseluruhan";
    }
}

// 1. Fungsi Semak Kelayakan (Mangga Kunci)
function checkChallengeEligibility() {
    const requiredLevel = 15;
    
    if (localPlayerData.level < requiredLevel) {
        // Jika belum Level 15, tunjuk amaran
        alert(`🔒 AKSES DITOLAK!\n\nAnda baru Level ${localPlayerData.level}. Teruskan berjuang di mod solo sehingga mencapai Level ${requiredLevel} untuk membuka Arena Cabaran PvP.`);
        return; 
    }
    
    // Jika layak, buka skrin Lobi Cabaran dan muatkan pemain
    showScreen('challenge-lobby-screen');
    loadAvailableOpponents();
}

// 2. Fungsi Tarik Senarai Pemain Level 15+ dari Firebase
async function loadAvailableOpponents() {
    const listContainer = document.getElementById('available-players-list');
    listContainer.innerHTML = "<li class='text-center italic text-indigo-400 py-4'>⏳ Sedang mengimbas arena...</li>";

    try {
        // Cari pemain yang Level 15 dan ke atas SAHAJA
        const snapshot = await db.collection("players")
                                 .where("level", ">=", 15)
                                 .get();

        let html = "";
        
        // DALAM FUNGSI loadAvailableOpponents()
snapshot.forEach(doc => {
    const opponent = doc.data();

    // TUKAR opponent.playerName KEPADA opponent.name
    if (opponent.name !== studentInfo.name) {
        html += `
            <li class="flex justify-between items-center bg-gray-50 p-4 rounded-xl border hover:border-red-300 hover:shadow-md transition-all">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center font-black text-red-500 text-xl shadow-inner">
                        L${opponent.level}
                    </div>
                    <div>
                        <p class="font-black text-gray-800 text-lg">${opponent.name}</p> <p class="text-xs text-gray-500 font-bold">${opponent.school || 'Pemain Bebas'}</p> </div>
                </div>
                <button onclick="sendChallengeInvite('${opponent.name}')" class="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-bold shadow-sm transition-colors">
                    ⚔️ CABAR
                </button>
            </li>
        `;
    }
});

        if (html === "") {
            listContainer.innerHTML = "<li class='text-center font-bold text-gray-500 py-8'>Belum ada pemain lain yang mencapai Level 15. Jadilah yang pertama!</li>";
        } else {
            listContainer.innerHTML = html;
        }

    } catch (error) {
        console.error("Ralat memuatkan lawan:", error);
        listContainer.innerHTML = "<li class='text-center text-red-500 py-4'>Ralat menyambung ke pelayan arena.</li>";
    }
}

// 3. Fungsi Sementara untuk Butang Cabar
function sendChallengeInvite(opponentName) {
    alert(`Sistem sedang menjana bilik perlawanan untuk anda dan ${opponentName}. (Logik Firebase akan dimasukkan di sini seterusnya!)`);
}

// ==========================================
// A. PENGHANTAR: Fungsi Hantar Jemputan
// ==========================================
async function sendChallengeInvite(opponentName) {
    // 1. Bina senarai pilihan (dropdown) secara automatik dari data.js
    let dynamicCategoryOptions = {};
    
    // Kita pusing (loop) semua kunci yang ada dalam gameData (missing, anagram, etc.)
    for (let key in gameData) {
        // Cantikkan paparan: Huruf besar di depan (cth: "missing" -> "Missing")
        let displayName = key.charAt(0).toUpperCase() + key.slice(1);
        dynamicCategoryOptions[key] = displayName; 
    }

    // 2. Minta pengesahan kategori menggunakan senarai dinamik
    const { value: category } = await Swal.fire({
        title: `Cabar ${opponentName}`,
        text: "Pilih kategori untuk perlawanan ini:",
        input: 'select',
        inputOptions: dynamicCategoryOptions, // <--- Senarai 16 kategori masuk sini automatik
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'HANTAR CABARAN ⚔️',
        cancelButtonText: 'BATAL'
    });

    if (!category) return; // Keluar jika batal

    try {
        // 3. Cipta rekod cabaran di Firebase
        const challengeRef = db.collection("challenges").doc();
        const myName = studentInfo.name;

        await challengeRef.set({
            challengerName: myName,
            opponentName: opponentName,
            category: category, // Kategori yang dipilih (cth: "animals")
            status: "pending",
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        Swal.fire({
            title: 'Berjaya!',
            text: `Menunggu ${opponentName} menerima cabaran anda...`,
            icon: 'success',
            showConfirmButton: false,
            allowOutsideClick: false
        });

        // 4. Pasang "telinga" untuk status TERIMA atau TOLAK
        const unsubscribe = challengeRef.onSnapshot(doc => {
            if (!doc.exists) return;
            const data = doc.data();
            
            if (data.status === "accepted") {
                unsubscribe(); // Berhenti dengar
                Swal.fire({
                    title: 'Diterima!',
                    text: `${opponentName} menyahut cabaran! Sedia?`,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
                
                // Masuk ke Arena selepas 2 saat
                setTimeout(() => startPvPMatch(doc.id, data), 2000);

            } else if (data.status === "declined") {
                unsubscribe();
                Swal.fire('Ditolak', `${opponentName} tidak dapat menyertai cabaran sekarang.`, 'error');
            }
        });

    } catch (error) {
        console.error("Ralat cabaran:", error);
        Swal.fire('Ralat', 'Gagal menghantar jemputan.', 'error');
    }
}

// ==========================================
// B. PENERIMA: Pendengar Jemputan Masuk (Versi Mantap)
// ==========================================
function startChallengeListener(myName) {
    if (!myName) {
        console.error("Ralat: Nama pemain kosong, tidak boleh mulakan pendengar!");
        return;
    }

    console.log("📡 Sistem Pendengar Cabaran Aktif untuk: " + myName);
    
    db.collection("challenges")
      .where("opponentName", "==", myName)
      .where("status", "==", "pending")
      .onSnapshot(snapshot => {
          snapshot.docChanges().forEach(change => {
              if (change.type === "added") {
                  const data = change.doc.data();
                  const challengeId = change.doc.id;

                  // 1. SEMAKAN ANTI-ZOMBIE (Masa Luput 2 Minit)
                  if (data.timestamp) {
                      const challengeTime = data.timestamp.toDate().getTime();
                      const currentTime = new Date().getTime();
                      const diffInMinutes = (currentTime - challengeTime) / (1000 * 60);

                      if (diffInMinutes > 2) {
                          console.log("Cabaran lama dikesan & diabaikan:", challengeId);
                          db.collection("challenges").doc(challengeId).update({ status: "expired" });
                          return; // Keluar, jangan tunjuk popup
                      }
                  }

                  // 2. LOGIK JANGAN GANGGU (DND)
                  // Kita anggap pemain sibuk jika 'menu-screen' sedang tersembunyi (sedang main game)
                  const menuScreen = document.getElementById('menu-screen');
                  const isBusy = menuScreen ? menuScreen.classList.contains('hidden') : false;

                  if (isBusy) {
                      console.log("Pemain sedang bertarung. Cabaran ditolak automatik.");
                      db.collection("challenges").doc(challengeId).update({ status: "busy" });
                      return; // Keluar, jangan kacau konsentrasi pemain
                  }

                  // 3. PAPARKAN NOTIFIKASI JIKA PEMAIN SEDIA (IDLE)
                  Swal.fire({
                      title: '⚔️ CABARAN BARU!',
                      html: `<b class="text-red-600">${data.challengerName}</b> mahu bertarung dengan anda dalam kategori <b>${data.category}</b>!`,
                      icon: 'warning',
                      showCancelButton: true,
                      confirmButtonColor: '#22c55e',
                      cancelButtonColor: '#d33',
                      confirmButtonText: 'SAHUT! ✅',
                      cancelButtonText: 'TOLAK ❌',
                      allowOutsideClick: false
                  }).then((result) => {
                      if (result.isConfirmed) {
                          // Jika setuju: Kemas kini status ke 'accepted'
                          db.collection("challenges").doc(challengeId).update({ 
                              status: "accepted",
                              acceptedAt: firebase.firestore.FieldValue.serverTimestamp()
                          });
                          
                          // Panggil fungsi Arena
                          if (typeof startPvPMatch === 'function') {
                              startPvPMatch(challengeId, data);
                          } else {
                              console.log("Fungsi startPvPMatch akan dibina sebentar lagi!");
                          }
                      } else {
                          // Jika tolak: Kemas kini status ke 'declined'
                          db.collection("challenges").doc(challengeId).update({ status: "declined" });
                      }
                  });
              }
          });
      }, error => {
          console.error("Ralat Pendengar Cabaran: ", error);
      });
}

// ==========================================
// C. MULA PERLAWANAN PVP (COUNTDOWN & ARENA)
// ==========================================
function startPvPMatch(challengeId, challengeData) {
    console.log("⚔️ Mempersiapkan Arena PvP untuk cabaran:", challengeId);
    
    // 1. Kenal pasti pemain dan kemas kini UI Papan Markah
    document.getElementById('pvp-p1-name').innerText = challengeData.challengerName;
    document.getElementById('pvp-p2-name').innerText = challengeData.opponentName;
    document.getElementById('pvp-category-title').innerText = challengeData.category;

    // Reset markah dan soalan
    document.getElementById('pvp-p1-score').innerText = "0";
    document.getElementById('pvp-p2-score').innerText = "0";
    document.getElementById('pvp-question-display').innerText = "BERSEDIA...";
    
    // 2. Paparkan Kiraan Detik 5 Saat menggunakan SweetAlert
    let timerInterval;
    Swal.fire({
        title: '🔥 PERTEMPURAN BERMULA! 🔥',
        html: `Menuju ke arena dalam <b>5</b> saat...<br><br><small class="text-gray-500">Sila sedia di papan kekunci anda!</small>`,
        icon: 'info',
        timer: 5000,
        timerProgressBar: true,
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
            const b = Swal.getHtmlContainer().querySelector('b');
            timerInterval = setInterval(() => {
                b.textContent = Math.ceil(Swal.getTimerLeft() / 1000);
            }, 100);
        },
        willClose: () => {
            clearInterval(timerInterval);
        }
    }).then(() => {
        // 3. Masuk ke Skrin Arena selepas masa tamat
        showScreen('pvp-arena');
        
        // 4. Aktifkan kotak teks untuk menaip
        const answerInput = document.getElementById('pvp-answer-input');
        if (answerInput) {
            answerInput.disabled = false;
            answerInput.value = "";
            answerInput.focus();
        }
	setupPvPLogic(challengeId, challengeData);

        console.log("🚀 Skrin Arena dipaparkan. Menunggu soalan dari Game Master...");
        // Fasa seterusnya: Kita akan panggil fungsi jana soalan di sini!
    });
}

// ==========================================
// D. LOGIK PERLAWANAN & MARKAH (REAL-TIME)
// ==========================================
function setupPvPLogic(challengeId, data) {
    console.log("⚙️ Memulakan enjin setupPvPLogic (Versi SYNC & DINAMIK)...");

    try {
        currentPvPChallengeId = challengeId;
        isPlayer1 = (data.challengerName === studentInfo.name); 
        
        let pvpEndTime = null; 
        const timerDisplay = document.getElementById('pvp-timer');

        // 1. Pemain 1 tarik soalan pertama & TETAPKAN MASA TAMAT
        if (isPlayer1 && !data.currentQ) {
            console.log("Pemain 1 menetapkan soalan pertama & Masa Tamat...");
            
            let catKey = "missing"; // Lalai
            let chosenCategory = data.category ? data.category.toLowerCase() : "";
            
            // TEKNIK PINTAR: Cari padanan kategori secara automatik dari data.js
            for (let key in gameData) {
                if (chosenCategory.includes(key.toLowerCase())) {
                    catKey = key;
                    break;
                }
            }
            
            console.log("Kategori yang dipadankan:", catKey);
            currentPvPCategoryKey = catKey;

            const questions = gameData[currentPvPCategoryKey] || gameData.missing; 
            const firstQ = questions[Math.floor(Math.random() * questions.length)];
            
            db.collection("challenges").doc(challengeId).update({
                p1Score: 0,
                p2Score: 0,
                currentQ: firstQ.q,
                currentA: firstQ.a,
                categoryKey: currentPvPCategoryKey, // Simpan kunci ke Firebase
                endTime: Date.now() + 60000 
            });
        }

        // 2. Telinga Khas: Dengar markah, soalan, WAKTU TAMAT & KATEGORI
        db.collection("challenges").doc(challengeId).onSnapshot(doc => {
            if (!doc.exists) return;
            const matchData = doc.data();

            const p1Display = document.getElementById('pvp-p1-score');
            const p2Display = document.getElementById('pvp-p2-score');
            const qDisplay = document.getElementById('pvp-question-display');

            if (p1Display) p1Display.innerText = matchData.p1Score || 0;
            if (p2Display) p2Display.innerText = matchData.p2Score || 0;

            if (matchData.currentQ && qDisplay) {
                qDisplay.innerText = matchData.currentQ;
                currentPvPAnswer = matchData.currentA; 
            }

            if (matchData.endTime) {
                pvpEndTime = matchData.endTime;
            }
            if (matchData.categoryKey) {
                currentPvPCategoryKey = matchData.categoryKey; 
            }
        });

        // 3. PEMASA TERSINKRONISASI (SYNCED TIMER)
        if (!timerDisplay) {
            console.error("❌ RALAT: Elemen HTML 'pvp-timer' tidak dijumpai!");
            return; 
        }

        if (window.pvpTimerInterval) {
            clearInterval(window.pvpTimerInterval);
        }
        
        window.pvpTimerInterval = setInterval(() => {
            if (!pvpEndTime) {
                timerDisplay.innerText = "60";
                return;
            }
            
            let timeLeft = Math.floor((pvpEndTime - Date.now()) / 1000);
            if (timeLeft < 0) timeLeft = 0;
            
            timerDisplay.innerText = timeLeft;
            
            if (timeLeft <= 0) {
                clearInterval(window.pvpTimerInterval);
                console.log("Masa tamat! Memanggil endPvPMatch()...");
                endPvPMatch(); 
            }
        }, 1000);

        console.log("✅ Enjin setupPvPLogic berjaya dihidupkan!");

    } catch (error) {
        console.error("❌ RALAT BESAR dalam setupPvPLogic:", error);
    }
}

// ========================================================
// GANTIKAN KESELURUHAN FUNGSI endPvPMatch DENGAN INI:
// ========================================================
function endPvPMatch() {
    // 1. Kunci kotak input supaya pemain tak boleh menaip lagi
    document.getElementById('pvp-answer-input').disabled = true; 
    
    // 2. Ambil markah dari skrin
    const score1 = parseInt(document.getElementById('pvp-p1-score').innerText);
    const score2 = parseInt(document.getElementById('pvp-p2-score').innerText);
    
    // 3. Tentukan Keputusan & Ganjaran
    let resultMsg = "";
    let coinsWon = 0;
    let xpWon = 0;
    let isWinner = false;
    let isDraw = false;

    // Logik menentukan pemenang
    if (isPlayer1) {
        if (score1 > score2) isWinner = true;
        else if (score1 === score2) isDraw = true;
    } else {
        if (score2 > score1) isWinner = true;
        else if (score2 === score1) isDraw = true;
    }

    // Tetapkan nilai ganjaran mengikut status
    if (isWinner) {
        resultMsg = "MENANG! 🎉";
        coinsWon = 200;  // 💰 Ganjaran Syiling Menang
        xpWon = 100;    // 🌟 Ganjaran XP Menang
    } else if (isDraw) {
        resultMsg = "SERI! 🤝";
        coinsWon = 100;  // 💰 Ganjaran Syiling Seri
        xpWon = 50;     // 🌟 Ganjaran XP Seri
    } else {
        resultMsg = "KALAH! 💀";
        coinsWon = 50;  // 💰 Ganjaran Syiling Kalah
        xpWon = 25;     // 🌟 Ganjaran XP Kalah
    }

    // 4. Masukkan Ganjaran ke dalam Data Pemain (localPlayerData)
    localPlayerData.coins = (localPlayerData.coins || 0) + coinsWon;
    localPlayerData.totalScore = (localPlayerData.totalScore || 0) + xpWon;

    // 5. Simpan Data ke Firebase (Firestore) - VERSI SELAMAT (MERGE)
    db.collection("players").doc(studentInfo.name).set({
        coins: localPlayerData.coins,
        totalScore: localPlayerData.totalScore
    }, { merge: true })
    .then(() => {
        console.log("💰 Ganjaran PvP telah diselamatkan ke pangkalan data!");
    }).catch(error => {
        console.error("Ralat menyimpan ganjaran:", error);
    });

    // 6. Paparkan Pop-up Keputusan & Ganjaran
    Swal.fire({
        title: "MASA TAMAT!",
        html: `
            <div class="mb-4">
                <h2>Keputusan Anda:</h2>
                <h1 class="text-4xl font-black mt-2 ${isWinner ? 'text-green-600' : (isDraw ? 'text-blue-600' : 'text-red-600')}">${resultMsg}</h1>
            </div>
            <div class="bg-gray-100 p-4 rounded-xl border-2 border-gray-200 text-left w-3/4 mx-auto shadow-inner">
                <p class="text-lg font-bold text-gray-700 flex justify-between">
                    <span>🌟 Markah (XP):</span> 
                    <span class="text-indigo-600">+${xpWon}</span>
                </p>
                <p class="text-lg font-bold text-gray-700 flex justify-between mt-2">
                    <span>💰 Syiling:</span> 
                    <span class="text-yellow-600">+${coinsWon}</span>
                </p>
            </div>
        `,
        icon: isDraw ? "info" : (isWinner ? "success" : "error"),
        confirmButtonColor: '#4f46e5',
        confirmButtonText: "KEMBALI KE LOBI",
        allowOutsideClick: false
    }).then(() => {
        // Kembalikan pemain ke lobi (atau refresh UI atas untuk kemas kini paparan syiling)
        if(typeof updateUI === 'function') updateUI(); // Panggil fungsi cikgu untuk kemas kini paparan syiling di bucu atas (jika ada)
        showScreen('challenge-lobby-screen'); 
    });
}

// ==========================================
// E. PENGESAN INPUT JAWAPAN PVP (AUTO-SUBMIT)
// ==========================================
document.getElementById('pvp-answer-input').addEventListener('input', function(e) {
    if (!currentPvPChallengeId || !currentPvPAnswer) return;
    
    const userInput = this.value.toUpperCase().trim();
    
    // Jika tekaan TEPAT SAMA dengan jawapan!
    if (userInput === currentPvPAnswer.toUpperCase()) {
        this.value = ""; // 1. Kosongkan kotak serta-merta
        
        // 2. Cabut soalan baharu secara rawak dari kategori yang aktif
        const questions = gameData[currentPvPCategoryKey] || gameData.missing; 
        const newQ = questions[Math.floor(Math.random() * questions.length)];
        
        // 3. Kenal pasti kotak markah siapa nak dinaikkan
        const scoreField = isPlayer1 ? "p1Score" : "p2Score";
        
        // 4. Hantar ke Firebase (Markah naik 1, soalan bertukar)
        db.collection("challenges").doc(currentPvPChallengeId).update({
            [scoreField]: firebase.firestore.FieldValue.increment(1),
            currentQ: newQ.q,
            currentA: newQ.a
        });
    }
});