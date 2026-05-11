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
// FUNGSI KIRA XP (VERSI KEMASKINI LOCAL DATA)
// ------------------------------------------
function giveXP(category, correctCount) {
    let multiplier = 1;
    if (categoryDifficulty.medium.includes(category)) multiplier = 2;
    if (categoryDifficulty.hard.includes(category)) multiplier = 3;

    let earnedXP = correctCount * multiplier;
    localPlayerData.totalScore = (Number(localPlayerData.totalScore) || 0) + earnedXP;
    
    // ==========================================
    // 🟢 SELITKAN NAMA GAME KE DALAM DATA PEMAIN
    // ==========================================
    // 1. Jika memori playedGamesList belum wujud, kita cipta baru
    if (!localPlayerData.playedGamesList) {
        localPlayerData.playedGamesList = [];
    }
    
    // 2. Jika nama game ini belum ada dalam memori, kita masukkan
    if (!localPlayerData.playedGamesList.includes(category)) {
        localPlayerData.playedGamesList.push(category);
    }
    // ==========================================

    // Simpan semua data terkini (termasuk array di atas) ke Firebase
    saveCloudPlayerData();
    
    checkLevelRewardsOnLogin(); // Cek jika pemain naik level
    return earnedXP;
}

// ==========================================
// 1. SISTEM KUIZ & MEMORI PERMAINAN
// ==========================================
function initGame(type) {
if (typeof pauseBgMusic === 'function') pauseBgMusic();
    if (!type) return; 
    const safeType = type.toUpperCase(); 

    const playerName = localPlayerData.passcode || localPlayerData.name || "guest";
    const userKey = "memoriPemain_" + playerName;

    // ==========================================
    // 🟢 KEMAS KINI STATUS FIREBASE KE "IN-GAME" (VERSI SELAMAT)
    // ==========================================
    let player = null;
    if (typeof studentInfo !== 'undefined' && studentInfo && studentInfo.name) {
        player = studentInfo;
    } else if (typeof localPlayerData !== 'undefined' && localPlayerData && localPlayerData.name) {
        player = localPlayerData;
    }

    if (player && typeof db !== 'undefined') {
        const docId = `${player.school}_${player.class}_${player.name}`.replace(/\s+/g, '_');
        db.collection("players").doc(docId).set({
            isOnline: true,
            currentStatus: "in-game",
            lastActive: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).catch(e => console.log("Gagal kemaskini status in-game:", e));
    }
    // ==========================================

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
    // KOD MASA INI MESTI BERADA DI DALAM FUNGSI initGame
    // ==========================================
    let timeLimit = 180; // Default: Easy = 3 minit (180 saat)
    
    if (typeof categoryDifficulty !== 'undefined') {
        // Semak tahap kesukaran untuk set masa
        const checkType = type.toLowerCase();
        if (categoryDifficulty.medium && categoryDifficulty.medium.includes(checkType)) timeLimit = 300;
        if (categoryDifficulty.hard && categoryDifficulty.hard.includes(checkType)) timeLimit = 420;
    }

    startTimer(timeLimit); // INI YANG AKAN MENGGERAKKAN JAM!

} // <--- INI SAHAJA PENUTUP UNTUK FUNGSI initGame()

// ==========================================
// 2. KAWALAN MASA & MARKAH
// ==========================================
let currentTimer; 
let timeLeft;

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
        text: "Times Up. Let's check your score!",
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
// 3. LEADERBOARD (VERSI KHAS SEKOLAH & AVATAR LENGKAP)
// ==========================================
async function loadLeaderboard() {
    // Navigasi Skrin
    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('game-arena').classList.add('hidden');
    document.getElementById('leaderboard-screen').classList.remove('hidden');
    
    const listContainer = document.getElementById('leaderboard-list');
    const lbSchoolName = document.getElementById('lb-school-name');
    
    // Kenalpasti pemain semasa dan sekolah
    const infoPemain = (typeof studentInfo !== 'undefined') ? studentInfo : (typeof localPlayerData !== 'undefined' ? localPlayerData : null);
    const mySchool = infoPemain ? infoPemain.school : "";

    if (lbSchoolName) lbSchoolName.innerText = `School: ${mySchool || 'Global'}`;
    
    if (listContainer) {
        listContainer.innerHTML = `
            <div class='p-12 text-center text-indigo-500 font-bold animate-pulse'>
                <i class='fas fa-shield-alt fa-spin text-4xl mb-4 block'></i>
                Menyusun Kedudukan Sekolah...
            </div>`;
    }

    try {
        // --- TAPISAN SEKOLAH (PENTING) ---
        let query = db.collection("players");
        if (mySchool) {
            query = query.where("school", "==", mySchool);
        }

        const snapshot = await query.get();
        
        if(snapshot.empty) {
            listContainer.innerHTML = "<div class='p-8 text-center text-gray-400 font-bold'>Tiada rekod untuk sekolah ini.</div>";
            return;
        }

        // --- MASUKKAN DALAM ARRAY & BUANG ADMIN ---
        let players = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.class !== "ADMIN") { 
                players.push(data);
            }
        });

        // --- SUSUN MENGIKUT MARKAH (SORT) ---
        players.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));

        let allRowsHTML = "";
        let index = 0;
        const currentPlayerName = infoPemain ? String(infoPemain.name).toUpperCase() : "";

        // Loop untuk Top 50 Sahaja
        players.slice(0, 50).forEach(student => {
            index++;
            
            // --- 1. DATA ASAS ---
            const safeName = student.name ? String(student.name).toUpperCase() : "GUEST";
            const safeCls = student.class || "-";
            const grandScore = student.totalScore || 0;
            const studentLevel = student.level || 1; 
            
            let currentRank = index;
            let rankIcon = `#${index}`;
            if(index === 1) rankIcon = `🥇`;
            else if(index === 2) rankIcon = `🥈`;
            else if(index === 3) rankIcon = `🥉`;

            const isMe = (currentPlayerName !== "" && safeName === currentPlayerName);

            // 🔥 TRACKER
            if (isMe) {
                if (window.Trackers && typeof window.Trackers.rekodKedudukanLeaderboard === 'function') {
                    window.Trackers.rekodKedudukanLeaderboard(currentRank);
                }
            }

            // --- 2. LOGIK AVATAR ---
            let visualContent = `<span class="text-xl md:text-3xl text-gray-400">👤</span>`;
            let avatarData = student.activeAvatar || student.avatar;

            if (avatarData && typeof avatarData === 'string') {
                if (avatarData.startsWith('img|')) {
                    const cleanPath = avatarData.replace('img|', '').trim();
                    visualContent = `<img src="${cleanPath}" class="w-[85%] h-[85%] object-contain drop-shadow-md" onerror="this.parentElement.innerHTML='<span class=\\'text-xl md:text-3xl\\'>👤</span>'">`;
                } else if (avatarData.startsWith('icon|')) {
                    const iconName = avatarData.replace('icon|', '').trim();
                    visualContent = `<i class="${iconName} text-2xl text-indigo-500"></i>`;
                } else {
                    visualContent = `<span class="text-xl md:text-3xl">${avatarData}</span>`;
                }
            }

            const avatarHtml = `
                <div class="relative flex items-center justify-center w-12 h-12 md:w-16 md:h-16 bg-gradient-to-b from-white to-indigo-50 rounded-xl border-2 ${isMe ? 'border-yellow-400' : 'border-indigo-100'} shadow-sm shrink-0">
                    ${visualContent}
                    <div class="absolute -bottom-2 -right-2 bg-gradient-to-r from-green-500 to-green-600 text-white text-[9px] md:text-[10px] font-black px-1.5 py-0.5 rounded-md border-2 border-white shadow-sm z-10">
                        LVL ${studentLevel}
                    </div>
                </div>`;

            // --- 3. LOGIK TITLE ---
            const titleName = String(student.activeTitle || "Novice");
            const upperTitle = titleName.toUpperCase();
            let titleHTML = "";

            const rawAchievements = (typeof achievementsData !== 'undefined') ? achievementsData : [];
            const tData = rawAchievements.find(ach => ach.name === titleName);
            const tier = tData ? tData.tier : 'common';
            const achId = tData ? tData.id : '';

            if (achId === 'ach_16' || upperTitle.includes('MASTER')) {
                titleHTML = `<span class="bg-yellow-100 text-yellow-800 border border-yellow-300 text-[9px] md:text-[10px] px-2 py-0.5 rounded-full font-bold">👑 ${upperTitle}</span>`;
            } else if (tier === 'legendary') {
                titleHTML = `<span class="bg-orange-100 text-orange-800 border border-orange-300 text-[9px] md:text-[10px] px-2 py-0.5 rounded-full font-bold">🏆 ${upperTitle}</span>`;
            } else if (tier === 'epic') {
                titleHTML = `<span class="bg-purple-100 text-purple-800 border border-purple-300 text-[9px] md:text-[10px] px-2 py-0.5 rounded-full font-bold">✨ ${upperTitle}</span>`;
            } else if (tier === 'rare') {
                titleHTML = `<span class="bg-blue-100 text-blue-800 border border-blue-300 text-[9px] md:text-[10px] px-2 py-0.5 rounded-full font-bold">⭐ ${upperTitle}</span>`;
            } else {
                titleHTML = `<span class="bg-slate-100 text-slate-600 border border-slate-200 text-[9px] md:text-[10px] px-2 py-0.5 rounded-full font-bold">${upperTitle}</span>`;
            }

            // --- 4. LENCANA SKOR PERMAINAN ---
            let gamesBadgesHtml = "";
            if (student.games && typeof student.games === 'object') {
                gamesBadgesHtml = Object.entries(student.games)
                    .filter(([_, score]) => score > 0)
                    .map(([gName, gScore]) => {
                        return `<span class="inline-block bg-indigo-50 border border-indigo-100 text-indigo-600 text-[9px] px-1.5 py-0.5 rounded font-bold mr-1 mb-1 uppercase">${gName}: ${gScore}</span>`;
                    }).join('');
            }

            // --- 5. PEMBINAAN BARIS ---
            const row = `
                <div class="flex items-center justify-between p-3 md:p-4 rounded-2xl border-2 transition-all duration-200 mb-3 
                    ${isMe ? 'bg-yellow-50 border-yellow-200 shadow-md scale-[1.02]' : 'bg-white border-indigo-50 shadow-sm hover:border-indigo-200'}">
                    
                    <div class="flex items-center gap-3 md:gap-4">
                        <div class="font-black ${isMe ? 'text-yellow-600' : 'text-indigo-300'} text-lg md:text-2xl w-6 md:w-8 text-center">
                            ${rankIcon}
                        </div>
                        
                        ${avatarHtml}
                        
                        <div class="flex flex-col">
                            <div class="font-black uppercase text-slate-800 text-sm md:text-base leading-tight tracking-tight">
                                ${safeName} ${isMe ? '<span class="text-[10px] text-yellow-600">(ANDA)</span>' : ''}
                            </div>
                            <div class="flex items-center gap-2 mt-1">
                                ${titleHTML}
                                <span class="text-[10px] font-bold text-slate-400 uppercase">• ${safeCls}</span>
                            </div>
                            <div class="flex flex-wrap mt-2 max-w-[200px] md:max-w-xs">
                                ${gamesBadgesHtml || '<span class="text-[9px] text-slate-300 italic">Tiada data permainan</span>'}
                            </div>
                        </div>
                    </div>
                    
                    <div class="text-right">
                        <div class="bg-indigo-600 text-white px-3 py-1.5 rounded-xl font-black shadow-sm text-sm md:text-base whitespace-nowrap">
                            ${grandScore.toLocaleString()} <span class="text-[10px] font-normal opacity-80">XP</span>
                        </div>
                    </div>
                </div>
            `;
            allRowsHTML += row;
        });

        listContainer.innerHTML = allRowsHTML;

    } catch (error) {
        console.error("Leaderboard Error:", error);
        listContainer.innerHTML = `
            <div class='p-8 text-center text-red-500 font-bold'>
                <i class='fas fa-exclamation-circle text-2xl mb-2'></i><br>
                Ralat memuat turun data. Sila pastikan anda mempunyai sambungan internet.
            </div>`;
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
        alert("Sorry, this browser (device) did not support audio function.");
    }
};

/* ==========================================
   FUNGSI AI SUARA (SPEECH RECOGNITION) - VERSI KEBAL
   ========================================== */
window.startMic = function(btnElement) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Please use Google Chrome for microphone function.");
        return;
    }

    // CARA BAHARU: Suruh sistem cari kotak utama (kad putih) berbanding kotak sebelah
    const parentDiv = btnElement.closest('.bg-white') || btnElement.parentElement;
    
    // Cari elemen perkataan (AI akan cari class .target-word ATAU tag <h1> sebagai sandaran)
    const wordElement = parentDiv.querySelector('.target-word') || parentDiv.querySelector('h1');
    
    if (!wordElement) {
        alert("System Error: Can't detect question text on the screen.");
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

    // ==========================================
    // 🟢 (TAMBAHAN KOD STATUS PVP) KEMAS KINI STATUS FIREBASE KE "IDLE"
    // ==========================================
    if (typeof studentInfo !== 'undefined' && studentInfo.name) {
        // Guna docId yang betul: Sekolah_Kelas_Nama
        const docId = `${studentInfo.school}_${studentInfo.class}_${studentInfo.name}`.replace(/\s+/g, '_');
        db.collection("players").doc(docId).set({
            isOnline: true,
            currentStatus: "idle"
        }, { merge: true }).catch(e => console.log("Gagal kemaskini status idle:", e));
    }
    // ==========================================

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
        
        // Ambil jawapan murid dan jawapan sebenar
        const userAnswer = input.value.trim().toLowerCase();
        
        // POTONG JAWAPAN MENGGUNAKAN "|" UNTUK MENJADI SENARAI
        const correctAnswersList = input.getAttribute('data-answer').trim().toLowerCase().split("|");

        // SEMAK JIKA JAWAPAN MURID ADA DALAM SENARAI
        if (correctAnswersList.includes(userAnswer) && userAnswer !== "") {
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

// 🔥 TAMBAH KOD INI DI SINI (SEBELUM SAVE) 🔥
    const todayDay = new Date().getDay();
    if (todayDay === 0 || todayDay === 6) { // 0 = Ahad, 6 = Sabtu
        localPlayerData.hasPlayedWeekend = true;
        console.log("Hujung minggu dikesan! hasPlayedWeekend ditetapkan ke true.");
    }
        
        // ==========================================
        // 🎥 CCTV TRACKER: REKOD TAMAT GAME & KOIN
        // ==========================================
        if (window.Trackers) {
            // Semak adakah markah penuh?
            let isPerfect = (score === totalQuestions && totalQuestions > 0); 
            // Kenal pasti game apa yang dimainkan
            let catNameForTracker = (typeof currentGameType !== 'undefined' && currentGameType !== "") ? currentGameType : "unknown_game";
            
            // Lapor kepada Trackers
            Trackers.rekodTamatGame(catNameForTracker, score, isPerfect);
            Trackers.rekodKoinDapat(coinsEarned); // Rekod sejarah jumlah koin keseluruhan
        }
        // ==========================================

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

	// 🎵 TAMBAH BARIS INI: Mainkan semula muzik apabila kembali ke menu 🎵
        if (typeof playBgMusic === 'function') playBgMusic();
        
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
// ⭐ 6. KEMASKINI AVATAR (VERSI TANPA KOTAK & TERAPUNG)
// ==========================================
const avatarContainer = document.getElementById('dashboard-avatar-container');
const currentLiveName = (localPlayerData && localPlayerData.name) ? localPlayerData.name : "";

if (avatarContainer) {
    // 1. Kosongkan container dahulu
    avatarContainer.innerHTML = ""; 

    // 2. Setkan gaya container utama (Sangat penting: buang border/bg di sini)
    // Kita guna 'overflow-visible' supaya glow atau bayang tidak terpotong
    avatarContainer.className = "w-16 h-16 flex items-center justify-center relative overflow-visible cursor-pointer hover:scale-110 transition-transform";
    
    // Reset sebarang style manual yang mungkin tertinggal
    avatarContainer.style.border = "none";
    avatarContainer.style.boxShadow = "none";
    avatarContainer.style.background = "transparent";

    // 3. AMBIL DATA AVATAR DARI MEMORI
    const savedAvatar = (localPlayerData && localPlayerData.activeAvatar) ? localPlayerData.activeAvatar : "fas fa-user";

    if (currentLiveName.trim().toUpperCase() === "GAME MASTER") {
        // --- LOGIK KHAS GAME MASTER ---
        let avatarUrl = savedAvatar.startsWith("img|") 
            ? savedAvatar.replace("img|", "") 
            : "https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png";

        const img = document.createElement('img');
        img.src = avatarUrl;
        
        // object-contain + drop-shadow (Efek terapung tanpa kotak)
        img.className = "w-14 h-14 object-contain drop-shadow-[0_0_15px_rgba(255,215,0,0.9)]";
        img.style.display = "block";
        
        avatarContainer.appendChild(img);

        // Tambah semula border emas HANYA jika cikgu mahu bulatan emas tersebut
        // Jika tak mahu langsung bulatan emas, boleh padam 3 baris di bawah:
        avatarContainer.style.border = "3px solid gold";
        avatarContainer.style.boxShadow = "0 0 20px gold";
        avatarContainer.style.borderRadius = "50%";

    } else {
        // --- LOGIK MURID BIASA ---
        if (savedAvatar.startsWith("img|")) {
            const img = document.createElement('img');
            img.src = savedAvatar.replace("img|", "");
            
            // Guna object-contain dan buang rounded-full supaya ninja tak terpotong
            img.className = "w-full h-full object-contain drop-shadow-lg"; 
            avatarContainer.appendChild(img);
        } else {
            // Jika ia ikon FontAwesome (Buang warna text-indigo-500 jika mahu warna neutral)
            avatarContainer.innerHTML = `<i class="${savedAvatar} text-3xl drop-shadow-md"></i>`;
        }
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

// ==========================================
// FUNGSI KELAYAKAN CABARAN (ARENA PVP)
// ==========================================

// 1. Fungsi Semak Kelayakan Level
window.checkChallengeEligibility = function() {
    const requiredLevel = 15;
    
    // Pastikan data pemain telah dimuatkan
    if (typeof localPlayerData === 'undefined' || !localPlayerData) {
        alert("Sila tunggu sebentar, sedang memuat turun profil anda...");
        return;
    }
    
    // Semak tahap pemain
    if (localPlayerData.level < requiredLevel) {
        // Jika belum Level 15, tunjuk amaran
        alert(`🔒 ACCESS DENIED!\n\nYou just level ${localPlayerData.level}. Keep playing in Solo Mode until you reach Level ${requiredLevel} to open Challenge Arena PVP.`);
        return; 
    }
    
    // Jika layak, buka skrin Lobi Cabaran dan muatkan pemain
    if (typeof showScreen === 'function') {
        showScreen('challenge-lobby-screen');
    } else {
        console.warn("Fungsi showScreen tiada, menggunakan logik lalai...");
        // Logik penyorok skrin manual jika showScreen tiada
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        const lobby = document.getElementById('challenge-lobby-screen');
        if (lobby) lobby.classList.remove('hidden');
    }

    // Panggil fungsi memuatkan pemain
    window.loadAvailableOpponents();
};

// 2. Fungsi Tarik Senarai Pemain Level 15+ dari Firebase
window.loadAvailableOpponents = async function() {
    const listContainer = document.getElementById('available-players-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = "<li class='text-center italic text-indigo-400 py-4'>⏳ Sedang mengimbas arena...</li>";

    try {
        // Semak jika db (Firestore) sedia ada
        if (typeof db === 'undefined') {
            listContainer.innerHTML = "<li class='text-center text-red-500 py-4'>Pangkalan data terputus. Sila muat semula.</li>";
            return;
        }

        // Cari pemain yang Level 15 dan ke atas SAHAJA
        const snapshot = await db.collection("players")
                                 .where("level", ">=", 15)
                                 .get();

        let html = "";
        
        // Elakkan ReferenceError dengan studentInfo
        let myName = "";
        if (typeof studentInfo !== 'undefined' && studentInfo && studentInfo.name) {
            myName = studentInfo.name;
        } else if (typeof localPlayerData !== 'undefined' && localPlayerData && localPlayerData.name) {
            myName = localPlayerData.name;
        }
        
        snapshot.forEach(doc => {
            const opponent = doc.data();

            // Jangan tunjukkan diri sendiri dalam senarai cabaran
            if (opponent.name !== myName) {
                // --- BACA isOnline DARI SISTEM SEDIA ADA CIKGU ---
                let isPlayerOnline = opponent.isOnline === true; 
                let specificStatus = opponent.currentStatus || 'idle'; 

                let dotColor = 'bg-gray-400'; // Lalai: Offline (Kelabu)
                let statusLabel = 'Offline';
                let btnDisabled = 'disabled';
                let btnClass = 'bg-gray-300 text-gray-500 cursor-not-allowed'; // Butang dikunci

                // Jika pemain online, barulah kita semak apa dia sedang buat
                if (isPlayerOnline) {
                    if (specificStatus === 'idle') {
                        dotColor = 'bg-green-500';
                        statusLabel = 'Ready (Idle)';
                        btnDisabled = ''; // Buka kunci butang
                        btnClass = 'bg-red-500 hover:bg-red-600 text-white shadow-sm';
                    } else if (specificStatus === 'in-game') {
                        dotColor = 'bg-yellow-400';
                        statusLabel = 'Busy (In-Game)';
                    } else if (specificStatus === 'in-pvp') {
                        dotColor = 'bg-red-600';
                        statusLabel = 'In Battle (PvP)';
                    }
                }

                html += `
                    <li class="flex justify-between items-center bg-gray-50 p-4 rounded-xl border hover:border-red-300 hover:shadow-md transition-all">
                        <div class="flex items-center gap-4">
                            <div class="relative w-12 h-12 bg-red-100 rounded-full flex items-center justify-center font-black text-red-500 text-xl shadow-inner">
                                L${opponent.level || 15}
                                <span class="absolute bottom-0 right-0 w-3.5 h-3.5 ${dotColor} border-2 border-white rounded-full"></span>
                            </div>
                            <div>
                                <p class="font-black text-gray-800 text-lg">${opponent.name}</p> 
                                <p class="text-xs text-gray-500 font-bold">${opponent.school || 'Pemain Bebas'} • <span class="${dotColor.replace('bg-', 'text-')}">${statusLabel}</span></p> 
                            </div>
                        </div>
                        <button onclick="sendChallengeInvite('${opponent.name}')" ${btnDisabled} class="${btnClass} px-6 py-2 rounded-lg font-bold transition-colors">
                            ⚔️ CHALLENGE
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
};

// 3. Fungsi Sementara untuk Butang Cabar
// (Nota: Boleh dibuang jika fungsi async di bawah sudah digunakan, tapi saya kekalkan agar kod tak berubah)
function sendChallengeInvite_old(opponentName) {
    alert(`System is generating the Lobby Room for you and ${opponentName}. (Logik Firebase akan dimasukkan di sini seterusnya!)`);
}

// ==========================================
// A. PENGHANTAR: Fungsi Hantar Jemputan & Had Harian & SYARAT KELAYAKAN (ENGLISH ALERTS)
// ==========================================
window.sendChallengeInvite = async function(opponentName) {
    // ---------------------------------------------------------
    // 🛑 1. SARINGAN KELAYAKAN (LEVEL 15 & KATEGORI EASY/MED/HARD)
    // ---------------------------------------------------------
    
    // Semak Level
    const currentLevel = Number(localPlayerData.level) || 1;
    if (currentLevel < 15) {
        Swal.fire({
            icon: 'error',
            title: 'Access Denied!',
            text: 'You must reach at least Level 15 to challenge other players in the PvP Arena.'
        });
        return;
    }

    // Semak Penguasaan Kategori
    let playedGames = localPlayerData.playedGamesList || [];
    let hasEasy = false, hasMed = false, hasHard = false;

    // Gunakan categoryDifficulty yang sedia ada di atas fail game.js
    playedGames.forEach(gameKey => {
        const cat = gameKey.toLowerCase();
        if (categoryDifficulty.easy.includes(cat)) hasEasy = true;
        if (categoryDifficulty.medium.includes(cat)) hasMed = true;
        if (categoryDifficulty.hard.includes(cat)) hasHard = true;
    });

    if (!hasEasy || !hasMed || !hasHard) {
        Swal.fire({
            icon: 'warning',
            title: 'Requirements Not Met!',
            html: `To enter the PvP Arena, you must have played at least 1 game from each difficulty tier (Easy, Medium & Hard).<br><br>
                   Your Current Progress:<br>
                   ✅ Easy: ${hasEasy ? 'Completed' : '<b>Incomplete</b>'}<br>
                   ✅ Medium: ${hasMed ? 'Completed' : '<b>Incomplete</b>'}<br>
                   ✅ Hard: ${hasHard ? 'Completed' : '<b>Incomplete</b>'}`
        });
        return; // Halang terus
    }

    // ---------------------------------------------------------
    // JIKA LULUS SARINGAN, TERUSKAN LOGIK SEPERTI BIASA
    // ---------------------------------------------------------

    const today = new Date().toISOString().split('T')[0];
    const docId = `${studentInfo.school}_${studentInfo.class}_${studentInfo.name}`.replace(/\s+/g, '_');

    try {
        // 2. SEMAK HAD HARIAN (Maksimum 5 kali sehari)
        const playerDoc = await db.collection("players").doc(docId).get();
        if (playerDoc.exists) {
            const data = playerDoc.data();
            if (data.lastPvPDate === today && data.pvpCountToday >= 5) {
                Swal.fire('Daily Limit Reached 🛑', 'You have reached the maximum limit of 5 PvP matches today. Please come back tomorrow!', 'warning');
                return; // Halang dari mencabar
            }
        }

        // 3. BINA SENARAI KATEGORI (Dari data.js)
        let dynamicCategoryOptions = {};
        for (let key in gameData) {
            let displayName = key.charAt(0).toUpperCase() + key.slice(1);
            dynamicCategoryOptions[key] = displayName; 
        }

        const { value: category } = await Swal.fire({
            title: `Challenge ${opponentName}`,
            text: "Select a category for this match:",
            input: 'select',
            inputOptions: dynamicCategoryOptions,
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonText: 'Cancel',
            confirmButtonText: 'SEND CHALLENGE ⚔️'
        });

        if (!category) return;

// 4. HANTAR CABARAN KE REALTIME DATABASE (RTDB)
const challengeRef = rtdb.ref("challenges").push();
await challengeRef.set({
    challengerName: studentInfo.name,
    opponentName: opponentName,
    category: category,
    status: "pending",
    timestamp: firebase.database.ServerValue.TIMESTAMP
});

// ==========================================
        // 🎥 CCTV TRACKER: REKOD HANTAR CABARAN
        // ==========================================
        // if (window.Trackers) {
        //    Trackers.rekodHantarCabaran();
        // }

        Swal.fire({ title: 'Success!', text: `Waiting for ${opponentName} to accept...`, icon: 'success', showConfirmButton: false });

        // 🟢 GUNA RTDB (.on 'value') UNTUK DENGAR STATUS CABARAN
        const listener = challengeRef.on('value', snapshot => {
            if (!snapshot.exists()) return;
            const data = snapshot.val();
            
            if (data.status === "accepted") {
                challengeRef.off('value', listener); // Berhenti mendengar
                Swal.fire({ title: 'Accepted!', text: `Get ready for battle!`, icon: 'success', timer: 2000, showConfirmButton: false });
                setTimeout(() => startPvPMatch(snapshot.key, data), 2000);
            } else if (data.status === "declined") {
                challengeRef.off('value', listener); // Berhenti mendengar
                Swal.fire('Declined', `${opponentName} is currently busy or declined the challenge.`, 'error');
            }
        });
    } catch (error) {
        console.error("Error sending invite:", error);
    }
};

// ==========================================
// B. PENERIMA: Pendengar Jemputan Masuk (Versi RTDB Mantap)
// ==========================================
function startChallengeListener(myName) {
    if (!myName) {
        console.error("Ralat: Nama pemain kosong, tidak boleh mulakan pendengar!");
        return;
    }

    console.log("📡 Sistem Pendengar Cabaran RTDB Aktif untuk: " + myName);
    
    // 🟢 GUNA RTDB ('child_added') UNTUK TANGKAP CABARAN BARU
    rtdb.ref("challenges").orderByChild("opponentName").equalTo(myName).on('child_added', snapshot => {
        const data = snapshot.val();
        const challengeId = snapshot.key;

        // Hanya layan cabaran yang berstatus 'pending'
        if (data.status === "pending") {
            
            // 1. SEMAKAN ANTI-ZOMBIE (Masa Luput 2 Minit)
            if (data.timestamp) {
                const currentTime = new Date().getTime();
                const diffInMinutes = (currentTime - data.timestamp) / (1000 * 60);

                if (diffInMinutes > 2) {
                    console.log("Cabaran lama dikesan & diabaikan:", challengeId);
                    rtdb.ref("challenges/" + challengeId).update({ status: "expired" });
                    return; // Keluar, jangan tunjuk popup
                }
            }

            // 2. LOGIK JANGAN GANGGU (DND)
            const menuScreen = document.getElementById('menu-screen');
            const isBusy = menuScreen ? menuScreen.classList.contains('hidden') : false;

            if (isBusy) {
                console.log("Pemain sedang bertarung. Cabaran ditolak automatik.");
                rtdb.ref("challenges/" + challengeId).update({ status: "busy" });
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
                    // Jika setuju: Kemas kini status ke 'accepted' (GUNA RTDB)
                    rtdb.ref("challenges/" + challengeId).update({ 
                        status: "accepted",
                        acceptedAt: firebase.database.ServerValue.TIMESTAMP 
                    });
                    
                    // Panggil fungsi Arena
                    if (typeof startPvPMatch === 'function') {
                        startPvPMatch(challengeId, data);
                    } else {
                        console.log("Fungsi startPvPMatch tiada!");
                    }
                } else {
                    // Jika tolak: Kemas kini status ke 'declined' (GUNA RTDB)
                    rtdb.ref("challenges/" + challengeId).update({ status: "declined" });
                }
            });
            
        } // <--- PENUTUP 1: Penutup untuk if (data.status === "pending")
        
    }, error => {
        console.error("Ralat Pendengar Cabaran: ", error);
    }); // <--- PENUTUP 2: Penutup untuk rtdb.ref(...).on(...)
    
} // <--- PENUTUP 3: Penutup untuk function startChallengeListener(...)

// ==========================================
// C. MULA PERLAWANAN PVP (COUNTDOWN & ARENA)
// ==========================================
function startPvPMatch(challengeId, challengeData) {
    if (typeof playBgMusic === 'function') playBgMusic('pvp');
    console.log("⚔️ Mempersiapkan Arena PvP untuk cabaran:", challengeId);
    
    // 1. Kenal pasti pemain dan kemas kini UI Papan Markah
    document.getElementById('pvp-p1-name').innerText = challengeData.challengerName;
    document.getElementById('pvp-p2-name').innerText = challengeData.opponentName;
    document.getElementById('pvp-category-title').innerText = challengeData.category;

    // Reset markah dan soalan
    document.getElementById('pvp-p1-score').innerText = "0";
    document.getElementById('pvp-p2-score').innerText = "0";
    document.getElementById('pvp-question-display').innerText = "READY...";
    
    // 2. Paparkan Kiraan Detik 5 Saat menggunakan SweetAlert
    let timerInterval;
    Swal.fire({
        title: '🔥 PERTEMPURAN BERMULA! 🔥',
        html: `Menuju ke arena dalam <b>5</b> saat...<br><br><small class="text-gray-500">Get ready on you keyboard!</small>`,
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
        if (typeof showScreen === "function") {
            showScreen('pvp-arena');
        } else {
            const pvpArenaScreen = document.getElementById('pvp-arena-screen');
            if (pvpArenaScreen) pvpArenaScreen.classList.remove('hidden');
            document.getElementById('challenge-lobby-screen').classList.add('hidden');
        }
        
        // 4. Aktifkan kotak teks untuk menaip
        const answerInput = document.getElementById('pvp-answer-input');
        if (answerInput) {
            answerInput.disabled = false;
            answerInput.value = "";
            answerInput.focus();
        }
        setupPvPLogic(challengeId, challengeData);

        console.log("🚀 Skrin Arena dipaparkan. Menunggu soalan dari Game Master...");

        // 🔴 TAMBAH INI: Kemaskini status ke in-pvp DENGAN ID YANG BETUL
        const docId = `${studentInfo.school}_${studentInfo.class}_${studentInfo.name}`.replace(/\s+/g, '_');
        db.collection("players").doc(docId).update({
            currentStatus: "in-pvp"
        }).catch(e => console.log("Ralat update status:", e));
    });
}

// ==========================================
// D. LOGIK PERLAWANAN & MARKAH (90 SAAT + JEDA UX) - VERSI RTDB
// ==========================================
function setupPvPLogic(challengeId, data) {
    currentPvPChallengeId = challengeId;
    isPlayer1 = (data.challengerName === studentInfo.name); 
    
    let pvpEndTime = null; 
    const timerDisplay = document.getElementById('pvp-timer');

    // 1. Pemain 1 tarik soalan pertama (GUNA RTDB)
    if (isPlayer1 && !data.currentQ) {
        let catKey = "missing"; 
        let chosenCategory = data.category ? data.category.toLowerCase() : "";
        for (let key in gameData) {
            if (chosenCategory.includes(key.toLowerCase())) { catKey = key; break; }
        }
        currentPvPCategoryKey = catKey;

        const questions = gameData[currentPvPCategoryKey] || gameData.missing; 
        const firstQ = questions[Math.floor(Math.random() * questions.length)];
        
        // 🟢 HANTAR SOALAN PERTAMA KE RTDB
        rtdb.ref("challenges/" + challengeId).update({
            p1Score: 0, p2Score: 0,
            currentQ: firstQ.q, currentA: firstQ.a,
            categoryKey: currentPvPCategoryKey,
            isTransitioning: false, // Tanda untuk pause UX
            endTime: Date.now() + 90000 // 90 SAAT
        });
    }

    // 2. Telinga Khas: Dengar perubahan (GUNA RTDB .on 'value')
    rtdb.ref("challenges/" + challengeId).on('value', snapshot => {
        if (!snapshot.exists()) return;
        const matchData = snapshot.val(); // Guna .val() untuk RTDB

        document.getElementById('pvp-p1-score').innerText = matchData.p1Score || 0;
        document.getElementById('pvp-p2-score').innerText = matchData.p2Score || 0;

        if (matchData.endTime) pvpEndTime = matchData.endTime;
        if (matchData.categoryKey) currentPvPCategoryKey = matchData.categoryKey;

        const inputBox = document.getElementById('pvp-answer-input');

        // 🔴 SISTEM UX: "SIAPA CEPAT" & JEDA (PAUSE)
        if (matchData.isTransitioning) {
            if (inputBox) {
                inputBox.disabled = true; // Kunci kotak input supaya murid tak keliru
                inputBox.value = "";      // Kosongkan kotak automatik
            }
            
            // Tunjuk siapa yang dapat markah
            Swal.fire({
                toast: true, position: 'top', icon: 'success',
                title: `⚡ ${matchData.lastScorer} mendapat markah!`,
                showConfirmButton: false, timer: 1500
            });

            // Pemain 1 bertugas lepaskan soalan baharu selepas 1.5 saat
            if (isPlayer1) {
                setTimeout(() => {
                    // 🟢 UPDATE SOALAN SETERUSNYA KE RTDB
                    rtdb.ref("challenges/" + challengeId).update({
                        currentQ: matchData.nextQ,
                        currentA: matchData.nextA,
                        isTransitioning: false // Buka balik game
                    });
                }, 1500);
            }
        } else {
            // Sambung main macam biasa
            if (inputBox) {
                inputBox.disabled = false;
                inputBox.focus();
            }
            if (matchData.currentQ) {
                document.getElementById('pvp-question-display').innerText = matchData.currentQ;
                currentPvPAnswer = matchData.currentA; 
                window.currentPvPQuestionText = matchData.currentQ; // Simpan untuk disemak oleh transaksi
            }
        }
    });

    // 3. PEMASA TERSINKRONISASI LOKAL (90 SAAT)
    if (window.pvpTimerInterval) clearInterval(window.pvpTimerInterval);
    
    window.pvpTimerInterval = setInterval(() => {
        if (!pvpEndTime) return;
        let timeLeft = Math.floor((pvpEndTime - Date.now()) / 1000);
        if (timeLeft < 0) timeLeft = 0;
        timerDisplay.innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(window.pvpTimerInterval);
            endPvPMatch(); 
        }
    }, 1000);
}

// ==========================================
// F. TAMAT PERLAWANAN & GANJARAN (TIERS)
// ==========================================
function endPvPMatch() {
    // Hentikan pemasa jika masih berjalan
    if (window.pvpTimerInterval) clearInterval(window.pvpTimerInterval);

    // Ambil markah dari skrin
    const p1Score = parseInt(document.getElementById('pvp-p1-score').innerText) || 0;
    const p2Score = parseInt(document.getElementById('pvp-p2-score').innerText) || 0;

    let myScore = isPlayer1 ? p1Score : p2Score;
    let oppScore = isPlayer1 ? p2Score : p1Score;
    let result = (myScore > oppScore) ? "menang" : (myScore < oppScore ? "kalah" : "seri");

    // 1. TENTUKAN TIER (KUMPULAN KESUKARAN)
    const easyCats = ['missing', 'spelling', 'plural', 'gendernouns', 'occupation'];
    const medCats = ['puzzle', 'guessing', 'pasttense', 'superlatives', 'synonym', 'antonym'];
    const hardCats = ['grammar', 'architect', 'idioms', 'listening', 'speaking'];

    let tier = "easy"; // Lalai
    let currentCat = (currentPvPCategoryKey || "").toLowerCase();
    
    if (medCats.includes(currentCat)) tier = "medium";
    if (hardCats.includes(currentCat)) tier = "hard";

    // 2. KIRA XP & COINS BERDASARKAN TIER
    let xpReward = 0; let coinReward = 0;
    
    if (tier === "easy") {
        if (result === "menang") { xpReward = 100; coinReward = 200; }
        else if (result === "kalah") { xpReward = 25; coinReward = 50; }
        else { xpReward = 50; coinReward = 100; }
    } else if (tier === "medium") {
        if (result === "menang") { xpReward = 150; coinReward = 300; }
        else if (result === "kalah") { xpReward = 50; coinReward = 100; }
        else { xpReward = 100; coinReward = 150; }
    } else if (tier === "hard") {
        if (result === "menang") { xpReward = 250; coinReward = 400; }
        else if (result === "kalah") { xpReward = 100; coinReward = 100; }
        else { xpReward = 150; coinReward = 200; }
    }

    // 3. Masukkan ganjaran ke data tempatan pemain
    localPlayerData.coins = (localPlayerData.coins || 0) + coinReward;
    localPlayerData.totalScore = (localPlayerData.totalScore || 0) + xpReward;

    // ==========================================
    // 🎥 CCTV TRACKER: REKOD KEPUTUSAN CABARAN
    // ==========================================
    //if (window.Trackers) {
    //    let trackerStatus = 'tie';
    //    if (result === "menang") trackerStatus = 'win';
    //    if (result === "kalah") trackerStatus = 'lose';
        
    //    let isNarrowWin = false;
        // Jika menang dan beza markah cuma 1, ia adalah Menang Tipis (Narrow Win)!
    //    if (result === "menang" && (myScore - oppScore === 1)) {
    //        isNarrowWin = true;
    //   }

    //    Trackers.rekodKeputusanCabaran(trackerStatus, isNarrowWin, false, false);
    //    Trackers.rekodKoinDapat(coinReward); // Rekod jumlah keseluruhan syiling
    //}

    // 🔴 4. SIMPAN TERUS KE FIREBASE DENGAN ID YANG BETUL
    const today = new Date().toISOString().split('T')[0];
    const docId = `${studentInfo.school}_${studentInfo.class}_${studentInfo.name}`.replace(/\s+/g, '_');
    
    db.collection("players").doc(docId).get().then(doc => {
        let data = doc.exists ? doc.data() : {};
        let newCount = (data.lastPvPDate === today) ? (data.pvpCountToday || 0) + 1 : 1;

        db.collection("players").doc(docId).set({
            coins: localPlayerData.coins,
            totalScore: localPlayerData.totalScore,
            lastPvPDate: today,
            pvpCountToday: newCount
        }, { merge: true })
        .then(() => {
            console.log("💰 Ganjaran PvP dan rekod harian telah diselamatkan ke pangkalan data!");
            if (typeof updateUI === "function") updateUI(); // Kemaskini UI di penjuru atas terus
        }).catch(error => {
            console.error("❌ Ralat menyimpan ganjaran:", error);
        });
    });

    // 5. PAPARKAN KEPUTUSAN KEPADA MURID
    let titleText = result === "menang" ? "Tahniah, Anda Menang! 🏆" : (result === "kalah" ? "Anda Tewas! 💔" : "Seri! 🤝");
    let iconType = result === "menang" ? "success" : (result === "kalah" ? "error" : "info");

    Swal.fire({
        title: titleText,
        html: `Kategori: <b>${tier.toUpperCase()}</b><br><br>
               Markah Anda: <b>${myScore}</b><br>
               Markah Lawan: <b>${oppScore}</b><br><br>
               <b>Ganjaran Diterima:</b><br>
               +${xpReward} XP ⭐<br>
               +${coinReward} Syiling 💰`,
        icon: iconType,
        confirmButtonText: "Kembali ke Lobi",
        allowOutsideClick: false
    }).then(() => {
        // Tutup arena, buka balik lobi
        if (typeof showScreen === "function") {
            showScreen('challenge-lobby-screen');
        } else {
            const pvpArenaScreen = document.getElementById('pvp-arena-screen');
            if (pvpArenaScreen) pvpArenaScreen.classList.add('hidden');
            document.getElementById('challenge-lobby-screen').classList.remove('hidden');
        }

	// 🎵 TAMBAH BARIS INI: Mainkan semula muzik apabila kembali ke Lobi PvP 🎵
        if (typeof playBgMusic === 'function') playBgMusic();

        // 🟢 KEMBALIKAN STATUS KE IDLE DENGAN ID YANG BETUL
        db.collection("players").doc(docId).update({
            currentStatus: "idle"
        }).catch(e => console.log("Ralat update status:", e));
    });
}

// ==========================================
// E. PENGESAN JAWAPAN (TRANSAKSI SIAPA CEPAT) - TEKNIK DELEGATION
// ==========================================
document.addEventListener('input', function(e) {
    // Hanya bertindak jika elemen yang ditaip itu adalah kotak jawapan PvP
    if (e.target && e.target.id === 'pvp-answer-input') {
        
        // Pastikan pembolehubah global PvP wujud dan sedia
        if (typeof currentPvPChallengeId === 'undefined' || !currentPvPChallengeId || typeof currentPvPAnswer === 'undefined' || currentPvPAnswer === null) return;
        
        const inputBox = e.target;
        
        // 1. Ambil tekaan murid (jadikan huruf besar & buang ruang kosong)
        const userInput = String(inputBox.value).toUpperCase().trim();
        
        // 2. Ambil jawapan sebenar
        const correctA_raw = String(currentPvPAnswer).toUpperCase().trim();
        
        // 3. TEKNIK PECAHAN: Asingkan jawapan jika ada simbol '|'
        const possibleAnswers = correctA_raw.split('|');
        
        // 4. Semak jika tekaan murid ADA dalam senarai jawapan yang sah
        if (possibleAnswers.includes(userInput)) {
            
            inputBox.value = ""; 
            inputBox.disabled = true; // Kunci segera selepas jawapan betul

            // 🟢 REALTIME DATABASE (RTDB) TRANSACTION
            const rtdbChallengeRef = rtdb.ref("challenges/" + currentPvPChallengeId);
            
            rtdbChallengeRef.transaction((data) => {
                // Pastikan data wujud sebelum buat apa-apa
                if (data) {
                    // Semak jika lawan dah curi mata atau game sedang pause
                    if (data.currentQ !== window.currentPvPQuestionText || data.isTransitioning) {
                        return; // Batalkan transaksi (Lawan jawab dulu!)
                    }

                    // Dapatkan soalan baru
                    const questions = gameData[currentPvPCategoryKey] || gameData.missing; 
                    const newQ = questions[Math.floor(Math.random() * questions.length)];
                    const scoreField = isPlayer1 ? "p1Score" : "p2Score";

                    // Update markah, rekod siapa jawab dulu, dan trigger "pause"
                    data[scoreField] = (data[scoreField] || 0) + 1; 
                    data.lastScorer = studentInfo.name; 
                    data.nextQ = newQ.q;
                    data.nextA = newQ.a;
                    data.isTransitioning = true; 
                    
                    return data; 
                }
                return data; 
                
            }, (error, committed, snapshot) => {
                if (error) {
                    console.log("Transaksi RTDB dibatalkan (Error):", error);
                    inputBox.disabled = false;
                    inputBox.focus();
                } else if (!committed) {
                    console.log("Transaksi dibatalkan: Lawan jawab dulu!");
                    inputBox.disabled = false;
                    inputBox.focus();
                } else {
                    console.log("Berjaya curi mata!");
                }
            });
        }
    }
});

// ==========================================
// LANGKAH 1: SENARAI LOBI & BINA LOBI BAHARU (VERSI RTDB)
// ==========================================

// Variabel penting untuk simpan ID lobi yang sedang kita main
let currentLobbyId = ""; 
let pantauLobiRef = null; // Tukar dari Unsubscribe ke Ref
let pantauLobiListener = null;

// Fungsi butang Mod 3v3 dari Menu Utama
async function check3v3Access() {
    console.log("Data Murid Sekarang:", studentInfo);
    
    // 1. Semak log masuk
    if (typeof studentInfo === 'undefined' || !studentInfo.name) {
        Swal.fire('Oops!', 'Please log in or register your name first.', 'warning');
        return;
    }

    // 🛑 2. SARINGAN KELAYAKAN (LEVEL 35+)
    const currentLevel = Number(localPlayerData.level) || 1;
    if (currentLevel < 35) {
        Swal.fire({
            title: 'Access Denied!',
            text: 'The 3v3 Arena is an Elite Zone. You need to reach at least Level 35 to enter!',
            icon: 'error'
        });
        return;
    }

// 🛑 3. SARINGAN PERFECT SCORES (KATEGORI EASY/MED/HARD)
    const userScores = localPlayerData.games || {};
    const PERFECT_SCORE = 50; // Selaraskan markah lulus kepada 50
    
    let countEasy = 0, countMed = 0, countHard = 0;

    // Fungsi kecil untuk tarik markah sebenar
    function getRealScore(cat) {
        let rawScore = userScores[cat];
        if (typeof rawScore === 'object' && rawScore !== null) {
            return parseInt(rawScore.score || rawScore.best || rawScore.mark || 0);
        }
        return parseInt(rawScore) || 0;
    }

    // Semak semua markah yang murid ada dalam memori 'games'
    Object.keys(userScores).forEach(gameKey => {
        const cat = gameKey.toLowerCase();
        const score = getRealScore(gameKey);

        // Jika markah lebih atau sama dengan 50, barulah dikira lulus!
        if (score >= PERFECT_SCORE) {
            if (categoryDifficulty.easy.includes(cat)) countEasy++;
            if (categoryDifficulty.medium.includes(cat)) countMed++;
            if (categoryDifficulty.hard.includes(cat)) countHard++;
        }
    });

    if (countEasy < 3 || countMed < 2 || countHard < 1) {
        Swal.fire({
            icon: 'warning',
            title: 'Not Elite Enough!',
            html: `To enter the 3v3 Arena, you must prove your mastery by achieving a <b>Perfect Score (${PERFECT_SCORE})</b> in specific categories.<br><br>
                   Your Perfect Score Progress:<br>
                   🟢 Easy Categories: ${countEasy}/3<br>
                   🟡 Medium Categories: ${countMed}/2<br>
                   🔴 Hard Categories: ${countHard}/1<br><br>
                   <small class="text-gray-500">Keep practicing in the main syllabus to unlock the Arena!</small>`,
            confirmButtonText: "I'll Practice More"
        });
        return; // Halang terus
    }

    // 🛑 4. SEMAK HAD HARIAN (MAKSIMUM 2 KALI SEHARI - KEKAL DI FIRESTORE)
    const today = new Date().toISOString().split('T')[0];
    const docId = `${studentInfo.school}_${studentInfo.class}_${studentInfo.name}`.replace(/\s+/g, '_');
    
    try {
        const playerDoc = await db.collection("players").doc(docId).get();
        if (playerDoc.exists) {
            const data = playerDoc.data();
            if (data.lastArena3v3Date === today && (data.arena3v3CountToday || 0) >= 20) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Daily Limit Reached 🛑',
                    text: 'You have played the maximum limit of 20 Arena matches today. Your warriors are tired. Please come back tomorrow!'
                });
                return; // Halang masuk
            }
        }
    } catch (error) {
        console.error("Error checking daily limits:", error);
    }

    // 5. Sembunyikan skrin menu
    const menuScreen = document.getElementById('menu-screen');
    const challengeLobby = document.getElementById('challenge-lobby-screen');
    if (menuScreen) menuScreen.classList.add('hidden');
    if (challengeLobby) challengeLobby.classList.add('hidden');

    // 6. Buka skrin Senarai Lobi baharu
    const roomListScreen = document.getElementById('arena-3v3-room-list');
    if (roomListScreen) roomListScreen.classList.remove('hidden');

    // 7. Mula baca pangkalan data untuk cari lobi kawan-kawan (RTDB)
    pantauSenaraiLobi();
}

// 🟢 LIVE LOBBY LIST MONITORING (ENGLISH & SPECTATOR SUPPORT)
function pantauSenaraiLobi() {
    const container = document.getElementById('room-list-container');
    
    // Clear old listeners
    if (pantauLobiRef && pantauLobiListener) {
        pantauLobiRef.off('value', pantauLobiListener);
    }

    // MONITOR ALL ARENAS (Remove the 'waiting' filter to allow Spectators)
    pantauLobiRef = rtdb.ref("arenas");
    pantauLobiListener = pantauLobiRef.on('value', (snapshot) => {
        container.innerHTML = ""; 
        
        if (!snapshot.exists()) {
            container.innerHTML = `<p class="text-slate-500 italic col-span-full text-center py-10 text-xl">No active lobbies right now. Please create a new lobby!</p>`;
            return;
        }

        snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            const roomId = childSnapshot.key;
            
            // Skip lobbies that are already finished
            if (data.status === "finished") return;

            const totalPlayers = data.slots ? Object.keys(data.slots).length : 0;
            const roomCard = document.createElement('div');
            roomCard.className = "bg-slate-800 border-2 border-slate-600 rounded-xl p-4 flex flex-col justify-between hover:border-blue-500 transition shadow-lg";
            
            // LOGIC: Determine Button Type
            let buttonHTML = "";
            let statusLabel = "";

            if (data.status === "waiting" && totalPlayers < 6) {
                // LOBBY IS JOINABLE
                statusLabel = `<span class="text-sm text-green-400 font-bold bg-slate-900 px-3 py-1 rounded-full border border-green-800">${totalPlayers}/6 Players</span>`;
                buttonHTML = `<button onclick="sertaiLobi('${roomId}')" class="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2 rounded-lg shadow-md transition">JOIN</button>`;
            } else {
                // LOBBY IS FULL OR IN BATTLE
                statusLabel = `<span class="text-sm text-yellow-500 font-bold bg-slate-900 px-3 py-1 rounded-full border border-yellow-800">MATCH IN PROGRESS</span>`;
                buttonHTML = `<button onclick="window.bukaLiveStream('${roomId}')" class="bg-slate-900 hover:bg-slate-700 text-yellow-400 font-bold px-4 py-2 rounded-lg border border-yellow-500 shadow-md transition flex items-center gap-2">
                                <i class="fas fa-tv"></i> WATCH
                              </button>`;
            }
            
            roomCard.innerHTML = `
                <div class="mb-4">
                    <div class="flex justify-between items-start">
                        <h4 class="text-xl font-bold text-white mb-1">🎮 ${data.roomName || "3v3 Battle"}</h4>
                    </div>
                    <p class="text-sm text-slate-300">Host: <span class="text-yellow-400 font-semibold">${data.host}</span></p>
                </div>
                <div class="flex justify-between items-center mt-auto">
                    ${statusLabel}
                    ${buttonHTML}
                </div>
            `;
            container.appendChild(roomCard);
        });
    }, (error) => {
        console.error("Failed to fetch lobby list:", error);
        container.innerHTML = `<p class="text-red-500 italic col-span-full text-center py-10">Error connecting to the database.</p>`;
    });
}

// Fungsi bila Host tekan Butang Kuning "BINA LOBI BAHARU" (RTDB VERSION)
async function binaLobiBaru() {
    currentLobbyId = "room_" + Date.now(); 
    
    const safeGameData = typeof gameData !== 'undefined' ? gameData : {};
    const allCategories = Object.keys(safeGameData).filter(cat => cat.toLowerCase() !== 'missing'); 
    
    // Gaulkan kategori secara rawak
    const shuffled = allCategories.sort(() => 0.5 - Math.random());
    
    // 🔥 UBAH DI SINI: Kita ambil TEPAT 9 kategori untuk dimasukkan ke draftPool
    const poolKategori = shuffled.slice(0, 9);

    // 🟢 GUNA RTDB
    const lobbyRef = rtdb.ref("arenas/" + currentLobbyId);

    try {
        await lobbyRef.set({
            roomName: studentInfo.name + "'s Lobby",
            host: studentInfo.name,
            status: "waiting", 
            draftPool: poolKategori, // 🔥 TUKAR KE 'draftPool' SUPAYA SEPADAN DENGAN FASA BAN
            slots: {},         
            selections: {},     
            scoreA: 0,
            scoreB: 0
        });

        // Hentikan pendengar senarai lobi
        if (pantauLobiRef && pantauLobiListener) {
            pantauLobiRef.off('value', pantauLobiListener);
        }
        
        // 1. Sembunyikan senarai bilik
        document.getElementById('arena-3v3-room-list').classList.add('hidden');
        
        // 2. PAPARKAN SKRIN LOBI (Bilik Menunggu)
        const lobbyScreen = document.getElementById('arena-3v3-lobby');
        if (lobbyScreen) lobbyScreen.classList.remove('hidden');
        
        listenTo3v3Lobby(currentLobbyId); 

        Swal.fire({
            title: 'Lobby Created Successfully!',
            text: 'Waiting for other players to join...',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
        });

    } catch (error) {
        console.error("Error creating lobby:", error);
        Swal.fire('Error', 'Failed to create lobby. Please try again.', 'error');
    }
}

// FUNGSI SERTAI LOBI (RTDB VERSION)
function sertaiLobi(roomId) {
    currentLobbyId = roomId; 
    
    // Hentikan pendengar senarai lobi
    if (pantauLobiRef && pantauLobiListener) {
        pantauLobiRef.off('value', pantauLobiListener);
    }
    
    document.getElementById('arena-3v3-room-list').classList.add('hidden');
    
    const lobbyScreen = document.getElementById('arena-3v3-lobby');
    if (lobbyScreen) lobbyScreen.classList.remove('hidden');
    
    listenTo3v3Lobby(currentLobbyId); 
}

// Fungsi Butang Kembali ke Menu Utama dari Senarai Lobi
function kembaliKeMenuDariRoomList() {
    if (pantauLobiRef && pantauLobiListener) {
        pantauLobiRef.off('value', pantauLobiListener);
    }
    document.getElementById('arena-3v3-room-list').classList.add('hidden');
    document.getElementById('challenge-lobby-screen').classList.remove('hidden'); 
}

// Fungsi untuk keluar dari lobi perlawanan (bila dah masuk bilik)
function backToMenuFrom3v3() {
    if (unsubscribe3v3) {
        const targetRef = rtdb.ref("arenas/" + currentLobbyId);
        targetRef.off('value', unsubscribe3v3);
        unsubscribe3v3 = null;
    }

    const arena3v3 = document.getElementById('arena-3v3-lobby');
    if (arena3v3) arena3v3.classList.add('hidden');
    
    const challengeLobby = document.getElementById('challenge-lobby-screen');
    if (challengeLobby) challengeLobby.classList.remove('hidden');

    leaveAll3v3Slots();

    const statusEl = document.getElementById('lobby-3v3-status');
    if (statusEl) statusEl.innerText = "WAITING FOR PLAYERS (0/6)..."; 
    
    currentLobbyId = ""; 
}

// ==========================================
// LANGKAH 2: PENGURUSAN LOBI (KICK & AUTO-START) - VERSI RTDB
// ==========================================

let unsubscribe3v3 = null; // Di RTDB ini akan jadi fungsi listener (callback)
let is3v3Host = false; 

// 1. MENDENGAR DATA LOBI & BERTINDAK (RTDB)
function listenTo3v3Lobby(roomId) {
    if (!roomId && !currentLobbyId) return;
    const targetRoom = roomId || currentLobbyId;

    const lobbyRef = rtdb.ref("arenas/" + targetRoom);

    // Hentikan pendengar lama jika ada
    if (unsubscribe3v3) {
        lobbyRef.off('value', unsubscribe3v3);
    }

    // 🟢 GUNA RTDB .on('value')
    unsubscribe3v3 = lobbyRef.on('value', (snapshot) => {
        if (!snapshot.exists()) {
            // Lobi dah ditutup/dipadam
            backToMenuFrom3v3();
            return;
        }
        
        const data = snapshot.val();
        const slots = data.slots || {};
        
        is3v3Host = (data.host === studentInfo.name);

        if (battle3v3_isActive) return; 

        if (data.status === "banning" || data.status === "drafting") {
            masukFasaDraft(data); 
            return;
        }

        update3v3UI(slots, data);

        if (data.status === "waiting") {
            const jumlahPemain = Object.keys(slots).length;
            
            // TUKAR KE 6 BILA NAK MAIN FULL, KINI 1 UNTUK UJIAN
            if (jumlahPemain >= 6 && !window.kiraanMula) {
                window.kiraanMula = true;
                mulaKiraanKeDraft(lobbyRef, is3v3Host); 
            } else if (jumlahPemain < 6) {
                window.kiraanMula = false; 
            }
        }
    });
}

// 2. KEMASKINI UI LOBI & TAMBAH BUTANG KICK UNTUK HOST (Kekal Sama)
function update3v3UI(slots, data) {
    let count = 0;
    const teams = ['A', 'B'];
    
    teams.forEach(t => {
        for (let i = 1; i <= 3; i++) {
            const slotId = `slot-${t}${i}`;
            const slotEl = document.getElementById(slotId);
            const occupant = slots[`${t}${i}`];

            if (slotEl) {
                if (occupant) {
                    count++;
                    let html = `<i class="fas fa-user-circle mr-2"></i> ${occupant}`;
                    
                    if (is3v3Host && occupant !== studentInfo.name) {
                        html += ` <button onclick="event.stopPropagation(); kickPlayer3v3('${t}${i}')" class="ml-3 bg-white text-red-600 hover:bg-red-100 hover:text-red-800 px-2 py-0.5 rounded-full text-xs shadow-md" title="Tendang Pemain"><i class="fas fa-times"></i></button>`;
                    }
                    
                    slotEl.innerHTML = html;
                    slotEl.className = `p-4 border-2 rounded-2xl text-center text-white font-bold transition shadow-lg ${t==='A' ? 'bg-red-500 border-red-700' : 'bg-blue-500 border-blue-700'}`;
                    
                } else {
                    slotEl.innerHTML = `Join Slot ${t}${i}`;
                    slotEl.className = `p-4 border-2 border-dashed rounded-2xl text-center cursor-pointer transition font-bold hover:scale-105 ${t==='A' ? 'border-red-300 text-gray-400 hover:bg-red-50 hover:border-red-500' : 'border-blue-300 text-gray-400 hover:bg-blue-50 hover:border-blue-500'}`;
                }
            }
        }
    });

const statusEl = document.getElementById('lobby-3v3-status');
    if (statusEl) {
        if (count >= 6) {
            // 1. Tukar paparan di skrin
            statusEl.innerText = "LOBBY FULL! GET READY...";
            statusEl.classList.remove('text-purple-700', 'animate-pulse');
            statusEl.classList.add('text-green-600');

            // ==========================================
            // 2. TAMBAH KOD INI: Beritahu Firebase untuk masuk fasa Banning
            // ==========================================
            if (data.status === "waiting") {
                setTimeout(() => {
                    rtdb.ref("arenas/" + currentLobbyId).update({ status: "banning" });
                }, 2000); // Tunggu 2 saat supaya murid sempat baca "GET READY"
            }
            // ==========================================

        } else {
            statusEl.innerText = `WAITING FOR PLAYERS (${count}/6)...`;
            statusEl.classList.remove('text-green-600');
            statusEl.classList.add('text-purple-700', 'animate-pulse');
        }
    }
}

// 3. FUNGSI MENENDANG PEMAIN (RTDB VERSION)
async function kickPlayer3v3(slotKey) {
    if (!currentLobbyId) return;

    // 🟢 GUNA RTDB TRANSACTION
    const lobbyRef = rtdb.ref("arenas/" + currentLobbyId); 

    try {
        lobbyRef.transaction((data) => {
            if (data && data.slots && data.slots[slotKey]) {
                delete data.slots[slotKey];
            }
            return data;
        });
    } catch (err) {
        console.error("Gagal menendang pemain:", err);
    }
}

// 4. KIRAAN DETIK AUTO-START (Hanya Dijalankan Oleh Host) - RTDB VERSION
function mulaKiraanKeDraft(lobbyRef, isHost) {
    let masa = 5;
    const statusEl = document.getElementById('lobby-3v3-status');
    
    const interval = setInterval(() => {
        if (!window.kiraanMula) {
            clearInterval(interval);
            return;
        }

        if (statusEl) {
            statusEl.innerText = `PERLAWANAN BERMULA DALAM ${masa}...`;
            statusEl.classList.remove('text-purple-700', 'animate-pulse');
            statusEl.classList.add('text-red-600', 'animate-bounce');
        }
        
        masa--;

        if (masa < 0) {
            clearInterval(interval);
            
            if (isHost) {
                const allCategories = Object.keys(typeof gameData !== 'undefined' ? gameData : {});
                const shuffled = allCategories.sort(() => 0.5 - Math.random());
                const pool9 = shuffled.slice(0, 9);

                // 🟢 UPDATE RTDB
                lobbyRef.update({ 
                    status: "banning", 
                    draftPool: pool9,
                    bannedCategories: [],
                    banCount: { A: 0, B: 0 }
                });
            }
        }
    }, 1000);
}

// ==========================================
// LANGKAH 3: FASA DRAFT (BAN & PICK ALA MOBILE LEGENDS) - VERSI AUTOMATIK SISTEM
// ==========================================

function masukFasaDraft(data) {
    const lobbyScreen = document.getElementById('arena-3v3-lobby');
    const draftScreen = document.getElementById('arena-3v3-draft');
    
    if (lobbyScreen) lobbyScreen.classList.add('hidden');
    if (draftScreen) draftScreen.classList.remove('hidden');

    let mySlotKey = null;
    let myTeam = null;
    for (let key in data.slots) {
        if (data.slots[key] === studentInfo.name) {
            mySlotKey = key;
            myTeam = key.charAt(0); 
            break;
        }
    }

    paparkanNamaDraft(data);

    const container = document.getElementById('draft-category-buttons');
    const titleEl = document.getElementById('draft-title'); 
    
    // --------------------------------------------------------
    // FASA BANNING
    // --------------------------------------------------------
    if (data.status === "banning") {
        if (titleEl) titleEl.innerText = "FASA BAN: BUANG 3 KATEGORI!";
        renderBanPhase(data, container, myTeam);
        
// 🤖 KUASA SISTEM: Jika 6 ban sudah dibuat, sistem terus tukar ke fasa picking
        const totalBans = data.bannedCategories ? data.bannedCategories.length : 0;
        
        if (totalBans >= 6 && data.status === "banning") { 
            rtdb.ref("arenas/" + currentLobbyId).update({ 
                status: "drafting",
                giliranSekarang: "A1" // 🔥 KITA TETAPKAN A1 MULA DAHULU
            });
        }
        
    } 
// --------------------------------------------------------
    // FASA DRAFTING (PICKING)
    // --------------------------------------------------------
    else if (data.status === "drafting") {
        if (titleEl) titleEl.innerText = "FASA DRAFT: PILIH KATEGORI ANDA!";
        
        // 🔥 INI BAHAGIAN YANG PALING PENTING: Tambah data.giliranSekarang
        renderPickPhase(data, container, mySlotKey, data.giliranSekarang);
        
        const totalSelected = data.selections ? Object.keys(data.selections).length : 0;
        
        // 🤖 KUASA SISTEM: Jika 6 kategori sudah dipilih, sistem terus mula perlawanan
        if (totalSelected >= 6) { 
            // Update status ke playing di Firebase
            rtdb.ref("arenas/" + currentLobbyId).update({ status: "playing" });
            
            // Bawa pemain masuk ke perlawanan
            masukBattle(data, mySlotKey); 
        }
    }
}

// ---------------------------------------------------------
// FASA 1: BANNING (BUANG KATEGORI)
// ---------------------------------------------------------
function renderBanPhase(data, container, myTeam) {
    if (!container || !data.draftPool) return;
    container.innerHTML = ''; 
    
    const bans = data.bannedCategories || [];
    const banCountA = data.banCount && data.banCount.A ? data.banCount.A : 0;
    const banCountB = data.banCount && data.banCount.B ? data.banCount.B : 0;
    
    let myTeamBanCount = myTeam === 'A' ? banCountA : banCountB;
    let bolehBanLagi = (myTeamBanCount < 3);

    data.draftPool.forEach((catKey) => {
        const displayName = catKey.replace(/([A-Z])/g, ' $1').toUpperCase();
        const isBanned = bans.includes(catKey);
        
        const btn = document.createElement('button');
        btn.id = `btn-ban-${catKey}`;
        btn.className = "group relative border-2 p-6 rounded-2xl transition-all flex flex-col items-center justify-center min-w-[200px] ";
        
        if (isBanned) {
            btn.className += "bg-red-950 border-red-700 opacity-50 cursor-not-allowed";
            btn.innerHTML = `<div class="text-red-500 line-through font-black text-xl mb-2">${displayName}</div>
                             <div class="text-sm text-red-500 font-bold">Telah Dibuang</div>`;
        } else {
            btn.className += "bg-slate-800 border-slate-700 hover:scale-105 hover:border-red-500";
            btn.innerHTML = `<div class="text-white font-black text-xl mb-2">${displayName}</div>
                             <div class="text-sm text-slate-400 italic">Klik untuk BAN</div>`;
            
            if (bolehBanLagi && myTeam) {
                btn.onclick = () => banKategori(catKey, myTeam);
            } else {
                btn.classList.add('opacity-70', 'cursor-not-allowed');
                btn.onclick = () => Swal.fire('Nanti Dulu!', 'Pasukan anda sudah membuang 3 kategori.', 'warning');
            }
        }
        container.appendChild(btn);
    });
}

// 🟢 GUNA RTDB TRANSACTION UNTUK BAN KATEGORI
async function banKategori(catKey, myTeam) {
    if (!currentLobbyId) return;
    const lobbyRef = rtdb.ref("arenas/" + currentLobbyId);
    
    try {
        lobbyRef.transaction((data) => {
            if (data) {
                let bans = data.bannedCategories || [];
                let counts = data.banCount || { A: 0, B: 0 };
                
                if (!bans.includes(catKey) && counts[myTeam] < 3) {
                    if (!data.bannedCategories) data.bannedCategories = [];
                    data.bannedCategories.push(catKey);
                    
                    if (!data.banCount) data.banCount = { A: 0, B: 0 };
                    data.banCount[myTeam] = (data.banCount[myTeam] || 0) + 1;
                }
            }
            return data;
        });
    } catch (err) {
        console.error("Gagal membuang kategori:", err);
    }
}

// ---------------------------------------------------------
// FASA 2: PICKING (PILIH KATEGORI YANG TINGGAL) - BERGILIR ZIG-ZAG
// ---------------------------------------------------------
function renderPickPhase(data, container, mySlotKey, giliranSekarang) {
    if (!container || !data.draftPool) return;
    container.innerHTML = ''; 
    
    const bans = data.bannedCategories || [];
    const availablePool = data.draftPool.filter(cat => !bans.includes(cat));

    let currentTurn = giliranSekarang || data.giliranSekarang;
    let isMyTurn = (mySlotKey && currentTurn && mySlotKey === currentTurn);
    
    // 1. Kenalpasti Pasukan Saya (A atau B)
    const myTeam = mySlotKey ? mySlotKey.charAt(0) : null;

    // 2. Cari semua kategori yang TELAH DIAMBIL oleh pasukan saya
    let kategoriSudahDiambilPasukan = [];
    if (data.selections) {
        for (let slot in data.selections) {
            // Jika slot bermula dengan huruf yang sama (pasukan sama)
            if (slot.charAt(0) === myTeam) {
                kategoriSudahDiambilPasukan.push(data.selections[slot]);
            }
        }
    }

    let sayaSudahPilih = data.selections && data.selections[mySlotKey];

    availablePool.forEach((catKey) => {
        const displayName = catKey.replace(/([A-Z])/g, ' $1').toUpperCase();
        const btn = document.createElement('button');
        
        // Semak jika kategori spesifik ini sudah diambil oleh rakan sepasukan
        const sudahDiambilRakan = kategoriSudahDiambilPasukan.includes(catKey);
        
        // Cari siapa yang ambil (untuk paparan teks)
        let siapaPilih = [];
        if (data.selections) {
            for (let slot in data.selections) {
                if (data.selections[slot] === catKey) siapaPilih.push(slot);
            }
        }
        let textSiapaPilih = siapaPilih.length > 0 ? `Dipilih oleh: ${siapaPilih.join(', ')}` : "Belum dipilih";

        // LOGIK DISABLE / ENABLE
        if (sayaSudahPilih) {
            // Jika saya sudah pilih, semua butang mati
            btn.className = "group relative border-2 p-6 rounded-2xl transition-all flex flex-col items-center justify-center min-w-[200px] bg-slate-900 opacity-40 cursor-not-allowed";
            if (data.selections[mySlotKey] === catKey) {
                btn.classList.replace("opacity-40", "opacity-90");
                btn.classList.add("border-yellow-500");
                btn.innerHTML = `<div>${displayName}</div><div class="text-yellow-500">PILIHAN ANDA</div>`;
            } else {
                btn.innerHTML = `<div>${displayName}</div><div class="text-xs text-slate-500">${textSiapaPilih}</div>`;
            }
        } 
        else if (sudahDiambilRakan) {
            // 🔥 LOGIK BARU: Jika rakan sepasukan sudah ambil, SEKAT butang ini walaupun giliran saya
            btn.className = "group relative border-2 p-6 rounded-2xl flex flex-col items-center justify-center min-w-[200px] bg-red-900/20 border-red-900/50 opacity-60 cursor-not-allowed";
            btn.innerHTML = `
                <div class="text-slate-400 font-black text-xl mb-2">${displayName}</div>
                <div class="text-xs text-red-400 font-bold uppercase">TELAH DIAMBIL PASUKAN</div>
                <div class="text-xs text-slate-500 mt-2">${textSiapaPilih}</div>
            `;
            btn.onclick = () => Swal.fire('Maaf!', 'Kategori ini telah diambil oleh rakan sepasukan anda.', 'error');
        }
        else if (isMyTurn) {
            // Giliran saya DAN kategori belum diambil
            btn.className = "group relative border-2 p-6 rounded-2xl transition-all flex flex-col items-center justify-center min-w-[200px] bg-slate-800 border-slate-700 hover:border-yellow-500 cursor-pointer shadow-lg";
            btn.innerHTML = `
                <div class="text-white font-black text-xl mb-2">${displayName}</div>
                <div class="text-sm text-yellow-400 font-bold animate-pulse">Klik untuk PILIH</div>
            `;
            btn.onclick = () => pilihKategoriDraft(catKey, mySlotKey);
        } 
        else {
            // Bukan giliran saya
            btn.className = "group relative border-2 p-6 rounded-2xl flex flex-col items-center justify-center min-w-[200px] bg-slate-900 border-slate-800 opacity-50 cursor-not-allowed";
            btn.innerHTML = `
                <div class="text-slate-400 font-black text-xl mb-2">${displayName}</div>
                <div class="text-sm text-slate-500 italic">Giliran ${currentTurn}</div>
            `;
        }

        container.appendChild(btn);
    });
}

// 🟢 GUNA RTDB UPDATE UNTUK PILIH KATEGORI (DIKEMASKINI)
async function pilihKategoriDraft(catKey, mySlotKey) {
    if (!mySlotKey || !currentLobbyId) return;

    const lobbyRef = rtdb.ref("arenas/" + currentLobbyId); 
    
    // 🔥 SUSUNAN GILIRAN MEMILIH KATEGORI (ZIG-ZAG)
    const susunanGiliran = ['A1', 'B1', 'A2', 'B2', 'A3', 'B3'];
    let indeksSekarang = susunanGiliran.indexOf(mySlotKey);
    let giliranSeterusnya = susunanGiliran[indeksSekarang + 1] || "SELESAI"; 
    // Jika B3 dah pilih, ia jadi "SELESAI"

    try {
        await lobbyRef.update({
            [`selections/${mySlotKey}`]: catKey,
            giliranSekarang: giliranSeterusnya // 🔥 HANTAR GILIRAN KEPADA PEMAIN SETERUSNYA
        });
        
        // Hentikan pemasa jika cikgu ada buat sistem pemasa (Timer)
        if (typeof pickTimerInterval !== 'undefined' && pickTimerInterval) {
            clearInterval(pickTimerInterval);
        }
        
    } catch (err) {
        console.error("Gagal memilih kategori:", err);
    }
}

// ---------------------------------------------------------
// FUNGSI SOKONGAN UI & LOBI
// ---------------------------------------------------------
function paparkanNamaDraft(data) {
    for (let i = 1; i <= 3; i++) {
        ['A', 'B'].forEach(team => {
            const slotKey = `${team}${i}`;
            const nameEl = document.getElementById(`draft-name-${slotKey}`);
            if (nameEl) {
                const playerName = data.slots && data.slots[slotKey] ? data.slots[slotKey] : "Kosong";
                nameEl.innerText = `${slotKey}: ${playerName}`;
            }
        });
    }
}

function kemaskiniPilihanDraftUI(selections, mySlotKey) {
    for (let slotKey in selections) {
        const catChosen = selections[slotKey];
        const displayEl = document.getElementById(`draft-pick-${slotKey}`);

        if (displayEl) {
            displayEl.innerText = catChosen.toUpperCase();
            displayEl.className = slotKey.startsWith('A') 
                ? "text-red-400 font-black bg-red-950 px-3 py-1 rounded-lg border border-red-800"
                : "text-blue-400 font-black bg-blue-950 px-3 py-1 rounded-lg border border-blue-800";
        }
    }
}

// 🟢 GUNA RTDB TRANSACTION UNTUK MASUK SLOT (VERSI MUKTAMAD DENGAN FIX AVATAR)
async function join3v3Team(team, slotNum) {
    if (!currentLobbyId) return;
    const slotKey = `${team}${slotNum}`;
    const lobbyRef = rtdb.ref("arenas/" + currentLobbyId); 

    try {
        lobbyRef.transaction((data) => {
            if (data) {
                if (!data.slots) data.slots = {};
                if (!data.playerStats) data.playerStats = {};
                
                // Semak kalau slot dah kena rembat
                if (data.slots[slotKey]) {
                    return; // Batalkan transaksi
                }

                // Buang nama saya kalau saya dah ada kat slot lain (lompat team)
                for (let key in data.slots) {
                    if (data.slots[key] === studentInfo.name) {
                        delete data.slots[key];
                        if (data.playerStats[key]) delete data.playerStats[key];
                    }
                }

                // Masukkan nama ke slot baru
                data.slots[slotKey] = studentInfo.name;

                // ==========================================
                // 🟢 DAFTAR AVATAR & STATISTIK AWAL PEMAIN
                // ==========================================
                // 1. Ambil data mentah dari studentInfo
                let rawAvatar = studentInfo.activeAvatar || '';
                
                // 2. "Cuci" data: Buang 'img|' supaya jadi path fail yang betul
                let cleanAvatar = rawAvatar.replace('img|', '');
                
                // 3. Jika masih kosong, guna gambar profil standard dari internet
                if (!cleanAvatar) {
                    cleanAvatar = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png';
                }

                data.playerStats[slotKey] = {
                    name: studentInfo.name,
                    avatar: cleanAvatar, // <-- Menghantar path fail yang sudah bersih ke RTDB
                    score: 0,
                    submitCount: 0,
                    longestStreak: 0
                };
            }
            return data;
        }, (error, committed, snapshot) => {
            if (error) {
                Swal.fire('Gagal', 'Sistem sibuk, cuba lagi.', 'error');
            } else if (!committed) {
                Swal.fire('Gagal', 'Slot ini sudah diambil oleh orang lain!', 'error');
            }
        });
    } catch (err) {
        console.error(err);
    }
}

// 🟢 GUNA RTDB UNTUK TINGGALKAN SLOT (Bila Keluar)
function leaveAll3v3Slots() {
    if (!currentLobbyId) return;
    const lobbyRef = rtdb.ref("arenas/" + currentLobbyId); 
    
    lobbyRef.once('value').then(snapshot => {
        if(snapshot.exists()) {
            let data = snapshot.val();
            let slots = data.slots || {};
            let changed = false;
            
            for (let key in slots) {
                if (slots[key] === studentInfo.name) {
                    delete slots[key];
                    changed = true;
                }
            }
            if(changed) lobbyRef.update({ slots: slots });
        }
    });
}

// 🟢 FUNGSI POPUP UNTUK TUKAR NAMA PASUKAN (FIX UNDEFINED + AUTO UPPERCASE)
window.tukarNamaPasukan = async function(teamKey) {
    if (!currentLobbyId) return;

    // 1. Ambil nama lama dari database
    const snap = await rtdb.ref("arenas/" + currentLobbyId + "/teamNames/" + teamKey).once('value');
    const oldName = snap.val() || (teamKey === 'A' ? 'TEAM RED' : 'TEAM BLUE');

    // 2. Paparkan kotak input
    const { value: newName } = await Swal.fire({
        title: 'Tukar Nama Pasukan',
        input: 'text',
        inputValue: oldName,
        inputLabel: `Masukkan nama baru untuk Pasukan ${teamKey === 'A' ? 'RED' : 'BLUE'}`,
        inputPlaceholder: 'Cth: GARUDA MERAH',
        showCancelButton: true,
        confirmButtonText: 'Simpan',
        cancelButtonText: 'Batal',
        // 🔥 PENAMBAHAN: Memaksa teks jadi huruf besar semasa menaip!
        customClass: {
            input: 'uppercase font-bold text-center'
        },
        inputValidator: (value) => {
            if (!value) return 'Nama pasukan tidak boleh kosong!';
            if (value.length > 20) return 'Maksimum 20 huruf sahaja.';
        }
    });

    // 3. Simpan nama ke database
    if (newName) {
        try {
            // Double-check: Pastikan data yang dihantar confirm huruf besar
            const namaHurufBesar = newName.toUpperCase();
            
            await rtdb.ref("arenas/" + currentLobbyId + "/teamNames/" + teamKey).set(namaHurufBesar);
            
            Swal.fire({
                icon: 'success',
                title: 'Berjaya!',
                text: `Pasukan ${teamKey} kini dikenali sebagai ${namaHurufBesar}`,
                timer: 1500,
                showConfirmButton: false
            });
        } catch (err) {
            Swal.fire('Ralat', 'Gagal menukar nama pasukan.', 'error');
            console.error(err);
        }
    }
};

// 🟢 FUNGSI KEMASKINI UI LOBI (UPDATE SLOTS & LETAK BUTANG EDIT)
window.update3v3UI = function(slots, data) {
    let count = 0;
    const teams = ['A', 'B'];
    let mySlotKey = null;
    
    // Cari di kerusi mana pemain (cikgu/murid) ini sedang duduk
    const myName = (typeof studentInfo !== 'undefined') ? studentInfo.name : null;
    if (myName && slots) {
        for (let s in slots) {
            if (slots[s] === myName) {
                mySlotKey = s;
                break;
            }
        }
    }

    // 🛑 KUNCI PENYELESAIAN 1: Ambil data nama, jika tiada sediakan objek kosong
    const teamNames = data.teamNames || {};
    
    teams.forEach(t => {
        // 1. KEMASKINI NAMA PASUKAN DAN LETAK BUTANG EDIT
        const teamNameEl = document.getElementById(`team-name-${t}`);
        if (teamNameEl) {
            // 🛑 KUNCI PENYELESAIAN 2: Jika nama spesifik A/B tiada, panggil nama default!
            let defaultName = (t === 'A') ? "TEAM RED (A)" : "TEAM BLUE (B)";
            let tName = teamNames[t] || defaultName; 
            
            let headerHtml = `<span>${tName}</span>`;
            
            // JIKA SAYA DUDUK DI SLOT 1 (A1 atau B1), KELUARKAN BUTANG EDIT
            if (mySlotKey === `${t}1`) {
                headerHtml += ` <button onclick="window.tukarNamaPasukan('${t}')" class="ml-3 text-xs bg-yellow-400 text-yellow-900 px-2 py-1 rounded-lg hover:bg-yellow-300 transition shadow-md cursor-pointer" title="Tukar Nama Pasukan"><i class="fas fa-edit"></i> Edit</button>`;
            }
            teamNameEl.innerHTML = headerHtml;
        }

        // 2. KEMASKINI KOTAK SLOT PEMAIN (A1, A2, B3, dll)
        for (let i = 1; i <= 3; i++) {
            const slotId = `slot-${t}${i}`;
            const slotEl = document.getElementById(slotId);
            const occupant = slots ? slots[`${t}${i}`] : null;

            if (slotEl) {
                if (occupant) {
                    count++; // Kira jumlah pemain yang dah masuk
                    slotEl.innerHTML = `<i class="fas fa-user-circle mr-2"></i> ${occupant}`;
                    slotEl.className = `p-4 border-2 rounded-2xl text-center text-white font-bold transition shadow-lg ${t==='A' ? 'bg-red-500 border-red-700' : 'bg-blue-500 border-blue-700'}`;
                } else {
                    slotEl.innerHTML = `Join Slot ${t}${i}`;
                    slotEl.className = `p-4 border-2 border-dashed rounded-2xl text-center cursor-pointer transition font-bold hover:scale-105 ${t==='A' ? 'border-red-300 text-gray-400 hover:bg-red-50 hover:border-red-500' : 'border-blue-300 text-gray-400 hover:bg-blue-50 hover:border-blue-500'}`;
                }
            }
        }
    });

    // 3. KEMASKINI STATUS LOBI (MENUNGGU / PENUH)
    const statusEl = document.getElementById('lobby-3v3-status');
    if (statusEl) {
        if (count >= 6) {
            statusEl.innerText = "LOBBY FULL! GET READY...";
            statusEl.className = 'text-green-600 font-black text-xl text-center w-full md:w-auto mt-4';
        } else {
            statusEl.innerText = `WAITING FOR PLAYERS (${count}/6)...`;
            statusEl.className = 'text-purple-700 font-black text-xl animate-pulse text-center w-full md:w-auto mt-4';
        }
    }
};

// ==========================================
// LANGKAH 4: ARENA BATTLE & PENGURUSAN MARKAH (VERSI RTDB)
// ==========================================

// Variabel Global Khas untuk 3v3 Battle
let battle3v3_senaraiSoalan = [];
let battle3v3_indeksSoalan = 0;
let battle3v3_masaSoalan = 20;
let battle3v3_intervalSoalan = null;
let battle3v3_masaMaster = 600; // 10 Minit = 600 Saat
let battle3v3_intervalMaster = null;
let battle3v3_isActive = false;
let my3v3IndividualScore = 0;
let my3v3SubmitCount = 0;
let my3v3CurrentStreak = 0;
let my3v3LongestStreak = 0;
let battle3v3_isMemproses = false;

// === TAMBAHAN BOOSTER STATE ===
let playerStreak = 0;
let pointMultiplier = 1; // Nilai asal ialah 1. Kalau x2 aktif, ia jadi 2.

// 🔥 TAMBAH BARIS INI: Untuk simpan maklumat pasukan dan slot pemain
let battle3v3_myTeam = "";
let battle3v3_mySlotKey = "";

function masukBattle(data, mySlotKey) {
    if (typeof playBgMusic === 'function') playBgMusic('arena');
    if (!currentLobbyId) return; // Langkah keselamatan

    const draftScreen = document.getElementById('arena-3v3-draft');
    const battleScreen = document.getElementById('arena-3v3-battle');
    
    if (draftScreen) draftScreen.classList.add('hidden');
    if (battleScreen) battleScreen.classList.remove('hidden');

    battle3v3_isActive = true;

// 🔥 TAMBAH 2 BARIS INI: Simpan team apa dan slot apa supaya fungsi booster boleh guna
    battle3v3_mySlotKey = mySlotKey;
    battle3v3_myTeam = mySlotKey ? mySlotKey.charAt(0) : ""; // Dapat 'A' atau 'B'

// 🟢 1. Dengar Markah dari RTDB Secara Real-time (GUNA ID DINAMIK)
    const lobbyRef = rtdb.ref("arenas/" + currentLobbyId);
    lobbyRef.on('value', (snapshot) => {
        if (!snapshot.exists()) return;
        const bData = snapshot.val(); // Guna .val() untuk RTDB
        
        const elScoreA = document.getElementById('score-team-A');
        const elScoreB = document.getElementById('score-team-B');
        
        // 🔥 TAMBAH BARIS INI: Ambil markah dari Firebase dan simpan dalam pembolehubah
        const currentScoreA = bData.scoreA || 0;
        const currentScoreB = bData.scoreB || 0;
        
        // RTDB akan beri markah terus, kemas kini papan markah guna pembolehubah tadi
        if (elScoreA) elScoreA.innerText = currentScoreA;
        if (elScoreB) elScoreB.innerText = currentScoreB;

        // 🛑 LOGIK BAHARU: RACE TO 300 POINTS! 🛑
        if ((currentScoreA >= 300 || currentScoreB >= 300) && battle3v3_isActive) {
            console.log("🏁 Salah satu pasukan mencapai 300 mata! Menamatkan perlawanan...");
            
            // 1. Hentikan jam utama supaya tak panggil fungsi tamat dua kali
            clearInterval(battle3v3_intervalMaster);
            
            // 2. Tutup pendengar (listener) ini
            lobbyRef.off('value');
            
            // 3. Panggil fungsi tamat perlawanan serta-merta
            tamatkanBattle3v3(mySlotKey);
        }
    });

    // 🔥 TAMBAH DI SINI: Hidupkan radar/pendengar serangan musuh!
    pantauSeranganMusuh(mySlotKey);

    // 2. Mulakan Master Timer (3 Minit)
    mulakanMasterTimer3v3(mySlotKey);

    // 3. Muatkan Soalan Berdasarkan Kategori Murid
    if (data.selections && mySlotKey && data.selections[mySlotKey]) {
        const kategoriSaya = data.selections[mySlotKey];
        mulakanSoalan3v3(kategoriSaya, mySlotKey);
    } else {
        // JIKA SKRIN INI TIDAK MASUK SLOT / TAK PILIH KATEGORI (JADI PENONTON)
        const qBox = document.getElementById('battle-question-box');
        if (qBox) {
            qBox.innerHTML = `
                <h3 class="text-3xl text-slate-500 font-bold mb-4">Match in Progress!</h3>
                <p class="text-xl text-slate-400">You are a spectator. Keep an eye on the scores above.</p>
            `;
        }
    }
}

function mulakanMasterTimer3v3(mySlotKey) { 
    battle3v3_masaMaster = 600; 
    const elTimer = document.getElementById('battle-timer');
    
    battle3v3_intervalMaster = setInterval(() => {
        if (!battle3v3_isActive) {
            clearInterval(battle3v3_intervalMaster);
            return;
        }

        battle3v3_masaMaster--;
        
        // Format paparan MM:SS
        let minit = Math.floor(battle3v3_masaMaster / 60);
        let saat = battle3v3_masaMaster % 60;
        minit = minit < 10 ? "0" + minit : minit;
        saat = saat < 10 ? "0" + saat : saat;
        
        if (elTimer) elTimer.innerText = `${minit}:${saat}`;

        // Tukar warna jadi merah bila masa kurang 10 saat!
        if (battle3v3_masaMaster <= 10 && elTimer) {
            elTimer.classList.add('text-red-500', 'animate-ping');
        }

        if (battle3v3_masaMaster <= 0) {
            clearInterval(battle3v3_intervalMaster);
            
            // ===============================================
            // PANGGIL FUNGSI TAMAT PERLAWANAN
            // ===============================================
            tamatkanBattle3v3(mySlotKey); 
        }
    }, 1000);
}


function mulakanSoalan3v3(kategori, mySlotKey) {
    // Pastikan kategori wujud
    if (typeof gameData !== 'undefined' && gameData[kategori]) {
        // Salin array soalan supaya tak kacau data asal, dan susun rawak (shuffle)
        battle3v3_senaraiSoalan = [...gameData[kategori]].sort(() => Math.random() - 0.5);
        battle3v3_indeksSoalan = 0;
        
        // 1. Paparkan soalan pertama
        paparSoalanSeterusnya3v3(mySlotKey);
    } else {
        document.getElementById('battle-question-box').innerHTML = `<p class="text-red-500 font-bold">Error: Questions not found!</p>`;
    }
}

function paparSoalanSeterusnya3v3(mySlotKey) {
    if (!battle3v3_isActive) return;

    // Buka semula kunci untuk membolehkan murid menaip dan hantar
    battle3v3_isMemproses = false; 

    // Jika soalan dah habis, kocak semula (Infinite Loop)
    if (battle3v3_indeksSoalan >= battle3v3_senaraiSoalan.length) {
        battle3v3_senaraiSoalan = battle3v3_senaraiSoalan.sort(() => Math.random() - 0.5);
        battle3v3_indeksSoalan = 0;
    }

    const soalanKini = battle3v3_senaraiSoalan[battle3v3_indeksSoalan];
    const qBox = document.getElementById('battle-question-box');
    
    // Reset masa 20 saat
    battle3v3_masaSoalan = 20;
    clearInterval(battle3v3_intervalSoalan);

    // Bina UI Soalan
    qBox.innerHTML = `
        <div class="w-full flex justify-between items-center mb-6">
            <span class="bg-slate-100 border-2 border-slate-300 text-slate-700 px-4 py-1 rounded-full text-sm font-bold">Question ${battle3v3_indeksSoalan + 1}</span>
            <span class="bg-red-100 border-2 border-red-300 text-red-600 px-4 py-1 rounded-full text-sm font-black flex items-center gap-2">
                ⏳ <span id="soalan-timer" class="text-xl">20</span>s
            </span>
        </div>
        
        <h3 class="text-3xl md:text-4xl text-slate-800 font-black mb-8 text-center leading-relaxed w-full">
            ${soalanKini.q}
        </h3>
        
        <input type="text" id="jawapan-input" class="w-full md:w-3/4 border-4 border-slate-300 rounded-2xl p-4 text-3xl text-center font-bold text-slate-800 focus:outline-none focus:border-blue-500 mb-6 bg-slate-50" placeholder="Type your answer..." autocomplete="off">
        
        <button id="btn-submit-jawapan" class="bg-blue-600 hover:bg-blue-500 text-white font-black text-2xl px-10 py-4 rounded-2xl shadow-[0_10px_0_rgba(37,99,235,0.8)] active:shadow-[0_0px_0_rgba(37,99,235,0.8)] active:translate-y-2 transition-all w-full md:w-3/4">
            SUBMIT
        </button>
    `;

    // Auto-focus kotak input supaya murid boleh terus menaip
    const inputEl = document.getElementById('jawapan-input');
    if (inputEl) inputEl.focus();

    // Mulakan timer turun 20 saat
    battle3v3_intervalSoalan = setInterval(() => {
        if (!battle3v3_isActive) {
            clearInterval(battle3v3_intervalSoalan);
            return;
        }

        battle3v3_masaSoalan--;
        const sTimer = document.getElementById('soalan-timer');
        if (sTimer) sTimer.innerText = battle3v3_masaSoalan;

        if (battle3v3_masaSoalan <= 0) {
            // MASA TAMAT: Hantar arahan kena denda (-2)
            hantarJawapan3v3(mySlotKey, soalanKini.a, true);
        }
    }, 1000);

    // Dengar klik butang Submit
    document.getElementById('btn-submit-jawapan').onclick = () => hantarJawapan3v3(mySlotKey, soalanKini.a, false);
    
    // Dengar jika murid tekan 'Enter' di keyboard
    inputEl.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            hantarJawapan3v3(mySlotKey, soalanKini.a, false);
        }
    });
}

async function hantarJawapan3v3(mySlotKey, jawapanSebenar, isTimeout) {
    if (!battle3v3_isActive || !currentLobbyId) return; // Langkah Keselamatan
    
    // SISTEM KUNCI: Jika sedang memproses jawapan, abaikan klik/enter yang bertindih
    if (battle3v3_isMemproses) return;
    battle3v3_isMemproses = true; // Kunci sistem!
    
    // Hentikan timer serta merta supaya markah tak tolak 2 kali
    clearInterval(battle3v3_intervalSoalan);
    
    const inputEl = document.getElementById('jawapan-input');
    const qBox = document.getElementById('battle-question-box');
    
    // Halang input supaya murid tak boleh taip apa-apa lagi semasa skrin beralih
    if (inputEl) {
        inputEl.disabled = true; 
        document.getElementById('btn-submit-jawapan').disabled = true;
    }
    
    // LOGIK SEMAKAN (Abaikan huruf besar/kecil & buang jarak)
    const jawapanMurid = inputEl ? inputEl.value.trim().toLowerCase() : "";
    
    // POTONG JAWAPAN SEBENAR MENGGUNAKAN "|"
    const senaraiJawapanBetul = jawapanSebenar.trim().toLowerCase().split("|");

    let perubahanMarkah = 0;
    let feedbackText = "";
    let colorClass = "";

    if (isTimeout || jawapanMurid === "") {
        perubahanMarkah = -2;
        feedbackText = "TIME'S UP! (-2)";
        colorClass = "text-red-600";
        
        // === TAMBAH DISINI: Reset Streak ===
        playerStreak = 0; 
        
    } else if (senaraiJawapanBetul.includes(jawapanMurid)) {
        // === KEMASKINI DISINI: Markah x Multiplier ===
        perubahanMarkah = 1 * pointMultiplier; 
        feedbackText = pointMultiplier > 1 ? `DOUBLE! (+${perubahanMarkah})` : "CORRECT! (+1)";
        colorClass = "text-green-500";
        
        // === TAMBAH DISINI: Tambah Streak ===
        playerStreak++;
        
    } else {
        perubahanMarkah = -1;
        feedbackText = "WRONG! (-1)";
        colorClass = "text-red-500";
        
        // === TAMBAH DISINI: Reset Streak ===
        playerStreak = 0;
    }

    updateBoosterUI();

    // Tunjuk kesan visual sekejap kepada murid (1 saat)
    if (qBox) {
        qBox.innerHTML = `
            <div class="flex flex-col items-center justify-center min-h-[250px]">
                <h2 class="text-5xl md:text-7xl font-black ${colorClass} mb-4 drop-shadow-md animate-bounce">${feedbackText}</h2>
                ${perubahanMarkah !== 1 ? `<p class="text-xl font-bold text-slate-500 mt-2">Correct answer: <span class="text-slate-800">${jawapanSebenar}</span></p>` : ''}
            </div>
        `;
    }

    // ==========================================
    // KEMASKINI TRACKER INDIVIDU (DI DALAM SISTEM)
    // ==========================================
    my3v3SubmitCount++; 

    if (perubahanMarkah === 1) { 
        my3v3IndividualScore += perubahanMarkah;
        my3v3CurrentStreak++;
        
        if (my3v3CurrentStreak > my3v3LongestStreak) {
            my3v3LongestStreak = my3v3CurrentStreak;
        }
    } else { 
        my3v3IndividualScore += perubahanMarkah;
        my3v3CurrentStreak = 0; 
    }

    // ==========================================
    // 🟢 KEMASKINI RTDB (MARKAH PASUKAN & STATISTIK INDIVIDU)
    // ==========================================
    const teamSaya = mySlotKey.charAt(0); // Kenal pasti 'A' atau 'B'
    const fieldMarkah = teamSaya === 'A' ? "scoreA" : "scoreB";
    const lobbyRef = rtdb.ref("arenas/" + currentLobbyId); // GUNA RTDB

    try {
        await lobbyRef.update({
            // Guna ServerValue.increment untuk tambah tolak markah tanpa ralat serentak
            [fieldMarkah]: firebase.database.ServerValue.increment(perubahanMarkah),
            
            // PERHATIAN: Di RTDB kita mesti guna '/' untuk lapisan objek, bukan '.' seperti Firestore
            [`playerStats/${mySlotKey}/name`]: studentInfo.name,
            [`playerStats/${mySlotKey}/score`]: my3v3IndividualScore,
            [`playerStats/${mySlotKey}/submitCount`]: my3v3SubmitCount,
            [`playerStats/${mySlotKey}/longestStreak`]: my3v3LongestStreak
        });
    } catch (err) {
        console.error("Gagal kemaskini markah RTDB:", err);
    }

    // Selepas tunggu 1.5 saat melihat jawapan, pergi soalan seterusnya
    setTimeout(() => {
        if (battle3v3_isActive) {
            battle3v3_indeksSoalan++;
            paparSoalanSeterusnya3v3(mySlotKey);
        }
    }, 1500); 
    
} // <=== INI ADALAH PENUTUP SEBENAR UNTUK hantarJawapan3v3 (Saya dah betulkan)


// ==========================================
// FUNGSI UPDATE BOOSTER (DI LUAR)
// ==========================================
function updateBoosterUI() {
    // Kemaskini nombor streak di skrin
    const streakEl = document.getElementById('player-streak-count');
    if (streakEl) streakEl.innerText = playerStreak;

    // Senarai syarat streak
    const boosters = [
        { id: 'btn-boost-x2', streak: 5 },
        { id: 'btn-boost-freeze', streak: 10 },
        { id: 'btn-boost-smoke', streak: 10 },
        { id: 'btn-boost-bat', streak: 30 },
        { id: 'btn-boost-thief', streak: 40 }
    ];

    boosters.forEach(b => {
        const btn = document.getElementById(b.id);
        if (btn) {
            if (playerStreak >= b.streak) {
                // Aktifkan butang (Buang kelabu, tambah warna)
                btn.classList.remove('grayscale', 'opacity-50', 'cursor-not-allowed');
                btn.classList.add('cursor-pointer', 'border-yellow-400', 'shadow-[0_0_15px_rgba(234,179,8,0.4)]');
                btn.disabled = false;
            } else {
                // Matikan butang (Jadikan kelabu semula)
                btn.classList.add('grayscale', 'opacity-50', 'cursor-not-allowed');
                btn.classList.remove('cursor-pointer', 'border-yellow-400', 'shadow-[0_0_15px_rgba(234,179,8,0.4)]');
                btn.disabled = true;
            }
        }
    });
}

// ==========================================
// FUNGSI GUNA BOOSTER (DENGAN HAD MASA 10 SAAT)
// ==========================================
async function gunaBooster(jenisBooster) {
    // 1. Guna variable global cikgu yang betul: battle3v3_mySlotKey
    if (!currentLobbyId || !battle3v3_mySlotKey) {
        console.warn("Booster gagal: Slot Key tidak dijumpai!");
        return;
    }

    const teamSaya = battle3v3_mySlotKey.charAt(0); // 'A' atau 'B'
    const teamLawan = teamSaya === 'A' ? 'B' : 'A';
    const lobbyRef = rtdb.ref("arenas/" + currentLobbyId);

    let kosStreak = 0;
    let namaBooster = "";

    switch (jenisBooster) {
        case 'x2': kosStreak = 5; namaBooster = "x2 Points"; break;
        case 'freeze': kosStreak = 10; namaBooster = "Freeze"; break;
        case 'smoke': kosStreak = 10; namaBooster = "Smoke Bomb"; break;
        case 'bat': kosStreak = 30; namaBooster = "Black Bat"; break;
        case 'thief': kosStreak = 40; namaBooster = "Point Thief"; break;
    }

    if (playerStreak < kosStreak) {
        Swal.fire({ toast: true, position: 'top', icon: 'error', title: 'Streak tidak mencukupi!', showConfirmButton: false, timer: 2000 });
        return;
    }

    playerStreak -= kosStreak;
    updateBoosterUI(); 

    try {
        if (jenisBooster === 'x2') {
            pointMultiplier = 2;
            Swal.fire({ toast: true, position: 'top', icon: 'success', title: '🧪 Markah x2 Aktif (10s)!', showConfirmButton: false, timer: 3000 });
            setTimeout(() => { pointMultiplier = 1; }, 10000); 
        } 
        else if (jenisBooster === 'thief') {
            const fieldMarkahSaya = teamSaya === 'A' ? "scoreA" : "scoreB";
            const fieldMarkahLawan = teamLawan === 'A' ? "scoreA" : "scoreB";
            await lobbyRef.update({
                [fieldMarkahSaya]: firebase.database.ServerValue.increment(2),
                [fieldMarkahLawan]: firebase.database.ServerValue.increment(-2)
            });
            Swal.fire({ toast: true, position: 'top', icon: 'success', title: '👺 2 markah dicuri!', showConfirmButton: false, timer: 3000 });
        } 
        else if (jenisBooster === 'freeze' || jenisBooster === 'smoke') {
            const updates = {};
            // Kita 'tembak' terus ke slot 1, 2, dan 3 pihak lawan
            ['1', '2', '3'].forEach(num => {
                updates[`players/${teamLawan}${num}/debuff`] = jenisBooster;
            });
            await lobbyRef.update(updates);
            Swal.fire({ toast: true, position: 'top', icon: 'success', title: `Peluru ${namaBooster} Aktif (10s)!`, showConfirmButton: false, timer: 3000 });

            setTimeout(() => {
                const clearUpdates = {};
                ['1', '2', '3'].forEach(num => {
                    clearUpdates[`players/${teamLawan}${num}/debuff`] = null;
                });
                lobbyRef.update(clearUpdates);
            }, 10000); 
        } 
        else if (jenisBooster === 'bat') {
            await lobbyRef.update({ [`teamDebuff/${teamLawan}`]: true });
            Swal.fire({ toast: true, position: 'top', icon: 'success', title: '🦇 Black Bat Aktif (10s)!', showConfirmButton: false, timer: 3000 });
            setTimeout(() => { lobbyRef.update({ [`teamDebuff/${teamLawan}`]: null }); }, 10000); 
        }
    } catch (err) {
        console.error("Gagal melancarkan booster:", err);
    }
}

// ==========================================
// LANGKAH 5A: KIRA KEPUTUSAN, GANJARAN & HAD HARIAN 3V3 (GABUNGAN)
// ==========================================
async function tamatkanBattle3v3(mySlotKey) {
    if (!currentLobbyId) return;

    battle3v3_isActive = false; // Matikan status perlawanan
    clearInterval(battle3v3_intervalSoalan); // Hentikan masa soalan
    clearInterval(battle3v3_intervalMaster); // Hentikan master timer

    const qBox = document.getElementById('battle-question-box');
    if (qBox) {
        qBox.innerHTML = `
            <div class="flex flex-col items-center justify-center mt-10">
                <h2 class="text-4xl font-black text-blue-600 animate-pulse text-center">MASA TAMAT!</h2>
                <p class="text-2xl text-slate-500 font-bold mt-2">Sistem sedang mengira keputusan perlawanan...</p>
            </div>
        `;
    }

    // --- BAHAGIAN A: KEMASKINI HAD HARIAN PEMAIN KE FIREBASE (MAX 2 KALI) ---
    if (typeof studentInfo !== 'undefined' && studentInfo.name) {
        const today = new Date().toISOString().split('T')[0];
        const docId = `${studentInfo.school}_${studentInfo.class}_${studentInfo.name}`.replace(/\s+/g, '_');
        const playerRef = db.collection("players").doc(docId);
        
        try {
            const playerDoc = await playerRef.get();
            if (playerDoc.exists) {
                const pData = playerDoc.data();
                if (pData.lastArena3v3Date === today) {
                    await playerRef.update({ arena3v3CountToday: firebase.firestore.FieldValue.increment(1) });
                } else {
                    await playerRef.update({ lastArena3v3Date: today, arena3v3CountToday: 1 });
                }
            } else {
                await playerRef.set({ lastArena3v3Date: today, arena3v3CountToday: 1 }, { merge: true });
            }
        } catch (err) {
            console.error("Failed to update daily 3v3 limits:", err);
        }
    }

    // --- BAHAGIAN B: KIRA KEPUTUSAN, AFK, DAN MVP ---
    // TUNGGU 2.5 SAAT: Beri masa kepada Firebase untuk selesaikan penerimaan markah terakhir
    setTimeout(async () => {
        try {
            const lobbyRef = rtdb.ref("arenas/" + currentLobbyId); 
            const snapshot = await lobbyRef.once('value');
            if (!snapshot.exists()) return;

            const data = snapshot.val();
            const scoreA = data.scoreA || 0;
            const scoreB = data.scoreB || 0;
            const playerStats = data.playerStats || {};

            // Kemaskini status arena kepada 'finished' jika belum
            if (data.status !== "finished") {
                await lobbyRef.update({ status: "finished" }); 
            }

            // 1. TENTUKAN STATUS PASUKAN (Menang / Kalah / Seri)
            const pasukanSaya = mySlotKey.charAt(0); // 'A' atau 'B'
            const markahPasukanSaya = (pasukanSaya === 'A') ? scoreA : scoreB;
            const markahPasukanLawan = (pasukanSaya === 'A') ? scoreB : scoreA;

            let statusKeputusan = "SERI";
            let baseXP = 100;
            let baseCoins = 250;

            if (markahPasukanSaya > markahPasukanLawan) {
                statusKeputusan = "MENANG";
                baseXP = 500; baseCoins = 1000;
            } else if (markahPasukanSaya < markahPasukanLawan) {
                statusKeputusan = "KALAH";
                baseXP = 250; baseCoins = 500;
            }

            // 2. SEMAK STATUS AFK (Kurang dari 3 jawapan dihantar)
            let isAFK = (typeof my3v3SubmitCount !== 'undefined') ? (my3v3SubmitCount < 3) : false;
            let finalXP = 0;
            let finalCoins = 0;
            let bonusXP = 0;
            let bonusCoins = 0;
            let senaraiPencapaian = []; 

            if (isAFK) {
                // Hukuman Berat Untuk AFK (Tolak syiling)
                finalCoins = -1000;
                finalXP = 0;
                senaraiPencapaian.push("⚠️ AFK DIKESAN (Penalti -1000 Syiling)");
            } else {
                // 3. KIRA RANKING & MVP (Hanya jika tidak AFK)
                let senaraiPemain = Object.keys(playerStats).map(key => ({
                    id: key,
                    ...playerStats[key]
                }));

                // Cari MVP (Berdasarkan Longest Streak Tertinggi)
                let susunanMVP = [...senaraiPemain].sort((a, b) => b.longestStreak - a.longestStreak);
                let mvpId = (susunanMVP.length > 0 && susunanMVP[0].longestStreak > 0) ? susunanMVP[0].id : null; 

                // Cari Ranking (Berdasarkan Skor Individu)
                let susunanRanking = [...senaraiPemain].sort((a, b) => b.score - a.score);
                let rankSaya = susunanRanking.findIndex(p => p.id === mySlotKey) + 1;

                // Bonus Berdasarkan Rank
                if (rankSaya === 1) { bonusXP = 500; bonusCoins = 1000; senaraiPencapaian.push("🏆 TOP 1"); }
                else if (rankSaya === 2) { bonusXP = 250; bonusCoins = 500; senaraiPencapaian.push("🥈 TOP 2"); }
                else if (rankSaya === 3) { bonusXP = 100; bonusCoins = 250; senaraiPencapaian.push("🥉 TOP 3"); }
                else { bonusXP = 50; bonusCoins = 100; senaraiPencapaian.push("🎖️ SAGUHATI"); }

                // Bonus MVP
                if (mySlotKey === mvpId) {
                    bonusXP += 500; bonusCoins += 1000;
                    senaraiPencapaian.push("⭐ MVP (STREAK TERPANJANG)");
                }

                finalXP = baseXP + bonusXP;
                finalCoins = baseCoins + bonusCoins;
            }

            // =======================================================
            // 🛑 TAMBAH KOD INI DI SINI (SIMPAN KE AKAUN MURID)
            // =======================================================
            if (typeof studentInfo !== 'undefined' && studentInfo.name) {
                const docId = `${studentInfo.school}_${studentInfo.class}_${studentInfo.name}`.replace(/\s+/g, '_');
                const playerRef = db.collection("players").doc(docId);
                
                try {
                    // DITUKAR: 'xp' menjadi 'totalScore'
                    await playerRef.update({
                        totalScore: firebase.firestore.FieldValue.increment(finalXP),
                        coins: firebase.firestore.FieldValue.increment(finalCoins)
                    });
                    console.log("Ganjaran berjaya disimpan ke totalScore Firestore!");
                } catch (err) {
                    console.error("Gagal menyimpan ganjaran ke Firestore:", err);
                }
            }

            // 4. PAPAR SKRIN KEPUTUSAN (Memanggil fungsi seterusnya)
            if (typeof paparSkrinKeputusan3v3 === 'function') {
                paparSkrinKeputusan3v3(statusKeputusan, finalXP, finalCoins, senaraiPencapaian, scoreA, scoreB);
            } else {
                console.warn("Fungsi paparSkrinKeputusan3v3 tiada. Memaparkan butang keluar lalai.");
                if (qBox) {
                    qBox.innerHTML = `
                        <h2 class="text-5xl md:text-6xl text-red-600 font-black mb-4 drop-shadow-md">TIME'S UP!</h2>
                        <p class="text-xl text-gray-600 font-bold mb-8">Please check your team's final score above.</p>
                        <button onclick="location.reload()" class="bg-slate-800 text-white font-black text-xl px-8 py-4 rounded-2xl shadow-lg hover:bg-slate-700 hover:scale-105 transition w-full md:w-auto">BACK TO MAIN MENU</button>
                    `;
                }
            }

        } catch (err) {
            console.error("Gagal mengira keputusan 3v3:", err);
        }
    }, 2500); 
}

// ==========================================
// LANGKAH 5B: UI SKRIN KEPUTUSAN 3V3
// ==========================================
function paparSkrinKeputusan3v3(status, totalXP, totalCoins, pencapaianList, scoreA, scoreB) {
    const qBox = document.getElementById('battle-question-box');
    if (!qBox) return;

    let warnaStatus = "text-yellow-500";
    let bgStatus = "bg-yellow-50";
    if (status === "MENANG") { warnaStatus = "text-green-600"; bgStatus = "bg-green-50"; }
    if (status === "KALAH") { warnaStatus = "text-red-600"; bgStatus = "bg-red-50"; }

    let htmlPencapaian = pencapaianList.map(item => `
        <span class="bg-blue-600 text-white px-4 py-1.5 rounded-full text-xs font-black m-1 shadow-sm uppercase tracking-wider">
            ${item}
        </span>
    `).join('');

    qBox.innerHTML = `
        <div class="flex flex-col items-center justify-center p-4 md:p-8 ${bgStatus} rounded-3xl border-4 border-white shadow-2xl animate__animated animate__zoomIn">
            <h1 class="text-7xl md:text-8xl font-black ${warnaStatus} drop-shadow-xl mb-2 italic">
                ${status}!
            </h1>
            
            <p class="text-lg md:text-xl font-bold text-slate-500 mb-6 uppercase tracking-widest">
                PASUKAN A <span class="text-slate-800 font-black mx-2">${scoreA} — ${scoreB}</span> PASUKAN B
            </p>
            
            <div class="flex flex-wrap justify-center mb-8 max-w-md">
                ${htmlPencapaian}
            </div>

            <div class="grid grid-cols-2 gap-4 w-full max-w-md mb-8">
                <div class="bg-white p-6 rounded-2xl shadow-sm border-2 border-slate-100 text-center">
                    <p class="text-xs font-black text-slate-400 uppercase mb-1">Ganjaran XP</p>
                    <p class="text-4xl font-black text-purple-600">${totalXP >= 0 ? '+' : ''}${totalXP}</p>
                </div>
                <div class="bg-white p-6 rounded-2xl shadow-sm border-2 border-slate-100 text-center">
                    <p class="text-xs font-black text-slate-400 uppercase mb-1">Syiling Emas</p>
                    <p class="text-4xl font-black text-amber-500">${totalCoins >= 0 ? '+' : ''}${totalCoins}</p>
                </div>
            </div>

            <button onclick="location.reload()" class="w-full md:w-auto px-12 py-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-xl rounded-2xl shadow-[0_8px_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-1 transition-all">
                KEMBALI KE MENU UTAMA
            </button>
        </div>
    `;
  }

// 🟢 LIVE STREAM FUNCTION (VERSI LENGKAP DENGAN AUTO-WINNER POPUP)
window.bukaLiveStream = async function(lobbyId) {
    if (!lobbyId) {
        Swal.fire('Error', 'Lobby ID is missing!', 'error');
        return;
    }

    const { value: password } = await Swal.fire({
        title: 'Admin Access',
        input: 'password',
        inputLabel: 'Enter the secret code to access Host View:',
        inputPlaceholder: 'Password...',
        showCancelButton: true,
        confirmButtonText: 'Open Stream',
        cancelButtonText: 'Cancel'
    });

    if (password !== "CIKGU123") {
        if (password) Swal.fire('Access Denied!', 'Please return to your seat! 😡', 'error');
        return; 
    }
    
    document.getElementById('arena-3v3-host').classList.remove('hidden');
    
    // Flag untuk pastikan popup hanya muncul sekali sahaja bila tamat
    let winnerPopupTriggered = false;

    hostStreamRef = rtdb.ref("arenas/" + lobbyId);
    hostStreamRef.on('value', (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.val();
        
        // 1. Update Team Names & Scores
        const teamNames = data.teamNames || { A: "TEAM RED", B: "TEAM BLUE" };
        document.getElementById('host-team-name-A').innerText = teamNames.A;
        document.getElementById('host-team-name-B').innerText = teamNames.B;
        document.getElementById('host-score-A').innerText = data.scoreA || 0;
        document.getElementById('host-score-B').innerText = data.scoreB || 0;
        
        // 2. Update Battle Status & Trigger Winner Popup
        const statusEl = document.getElementById('host-battle-status');
        
        if (data.status === 'playing') {
            statusEl.innerText = "MATCH IN PROGRESS...";
            statusEl.className = "text-xs text-yellow-400 mt-2 font-bold italic animate-pulse";
            winnerPopupTriggered = false; // Reset flag jika game bermula semula
        } 
        else if (data.status === 'finished') {
            statusEl.innerText = "MATCH FINISHED!";
            statusEl.className = "text-xs text-red-500 mt-2 font-black";

            // 🔥 LOGIK AUTO-POPUP: Jika tamat dan popup belum pernah keluar
            if (!winnerPopupTriggered) {
                winnerPopupTriggered = true; 
                setTimeout(() => {
                    if (typeof showWinnerPopup === "function") {
                        showWinnerPopup(lobbyId);
                    }
                }, 2500); // Tunggu 2.5 saat biar dramatik sikit
            }
        } 
        else {
            statusEl.innerText = "WAITING FOR START...";
            statusEl.className = "text-xs text-slate-400 mt-2 font-bold";
            winnerPopupTriggered = false;
        }
        
// 3. Update Individual Player Stats (Smart Avatar)
        const slots = data.slots || {};
        const stats = data.playerStats || {};
        let htmlA = ''; let htmlB = '';
        
        for (let i = 1; i <= 3; i++) {
            ['A', 'B'].forEach(team => {
                let slotKey = `${team}${i}`;
                let pName = slots[slotKey];
                
                if (pName) {
                    let s = stats[slotKey] || { score: 0, longestStreak: 0, avatar: '' };
                    let avatarHTML = '';

                    // JIKA AVATAR ADALAH IKON (Kekal Bulat)
                    if (s.avatar.includes('icon|')) {
                        let iconClass = s.avatar.replace('icon|', '');
                        avatarHTML = `<div class="w-12 h-12 rounded-full border-2 ${team === 'A' ? 'border-red-500' : 'border-blue-500'} bg-slate-900 flex items-center justify-center text-xl text-white"><i class="${iconClass}"></i></div>`;
                    } 
                    // JIKA AVATAR ADALAH GAMBAR (Buang bulat, paparan penuh bersaiz sederhana)
                    else {
                        let rawImg = s.avatar.replace('img|', '');
                        let imgPath = rawImg || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png';
                        // 🔥 PERUBAHAN DI SINI: Tukar w-12 h-12 rounded-full kepada h-14 w-auto rounded-md
                        avatarHTML = `<img src="${imgPath}" class="h-14 w-auto rounded-md border-2 ${team === 'A' ? 'border-red-500' : 'border-blue-500'} object-contain bg-slate-900">`;
                    }

                    let playerBlock = `
                    <div class="bg-slate-800 p-3 rounded-xl border border-slate-700 flex ${team === 'B' ? 'flex-row-reverse text-right' : ''} justify-between items-center shadow-md">
                        <div class="flex items-center gap-3 ${team === 'B' ? 'flex-row-reverse' : ''}">
                            ${avatarHTML}
                            <div class="text-white font-bold text-left">
                                <div class="text-sm">${pName}</div>
                                <span class="text-[10px] text-yellow-400 block"><i class="fas fa-fire"></i> Streak: ${s.longestStreak || 0}</span>
                            </div>
                        </div>
                        <div class="text-3xl font-black ${team === 'A' ? 'text-red-400' : 'text-blue-400'}">${s.score || 0}</div>
                    </div>`;

                    if (team === 'A') htmlA += playerBlock; else htmlB += playerBlock;
                }
            });
        }
        document.getElementById('host-players-A').innerHTML = htmlA || '<p class="text-slate-500 italic">Waiting...</p>';
        document.getElementById('host-players-B').innerHTML = htmlB || '<p class="text-slate-500 italic text-right">Waiting...</p>';
    });
};	

// 🟢 CLOSE STREAM FUNCTION (ENGLISH)
window.tutupLiveStream = function() {
    document.getElementById('arena-3v3-host').classList.add('hidden');
    if (hostStreamRef) hostStreamRef.off();
};

// 🟢 FUNGSI PAMER PEMENANG (WINNER POPUP)
window.showWinnerPopup = function(lobbyId) {
    if (!lobbyId) return;

    rtdb.ref("arenas/" + lobbyId).once('value', (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.val();
        const stats = data.playerStats || {};
        const slots = data.slots || {};
        const teamNames = data.teamNames || { A: "TEAM RED", B: "TEAM BLUE" };

        // 1. TENTUKAN PASUKAN PEMENANG
        const scoreA = data.scoreA || 0;
        const scoreB = data.scoreB || 0;
        const winner = scoreA > scoreB ? 'A' : (scoreB > scoreA ? 'B' : 'DRAW');

        // 2. CARI MVP, TOP SCORER, & STREAK KING
        let mvp = { name: '---', score: -1, avatar: '', slot: '' };
        let topScorer = { name: '---', score: -1, avatar: '' };
        let topStreak = { name: '---', streak: -1, avatar: '' };

        Object.keys(slots).forEach(slotId => {
            let pName = slots[slotId];
            let pStats = stats[slotId] || { score: 0, longestStreak: 0, avatar: '' };
            let team = slotId.startsWith('A') ? 'A' : 'B';

            // Logik MVP (Markah tertinggi dalam team yang MENANG sahaja)
            if (team === winner && pStats.score > mvp.score) {
                mvp = { name: pName, score: pStats.score, avatar: pStats.avatar, slot: slotId };
            }

            // Logik Top Scorer (Keseluruhan)
            if (pStats.score > topScorer.score) {
                topScorer = { name: pName, score: pStats.score, avatar: pStats.avatar };
            }

            // Logik Longest Streak (Keseluruhan)
            if (pStats.longestStreak > topStreak.streak) {
                topStreak = { name: pName, streak: pStats.longestStreak, avatar: pStats.avatar };
            }
        });

        // 3. FUNGSI PEMBANTU: GENERATE HTML AVATAR (SMART AVATAR)
        const getAvatarHTML = (avatarStr, sizeClass, borderCol) => {
            if (!avatarStr) return `<div class="${sizeClass} rounded-full bg-slate-800 flex items-center justify-center text-slate-500 border-2 ${borderCol}">?</div>`;
            if (avatarStr.includes('icon|')) {
                let icon = avatarStr.replace('icon|', '');
                return `<div class="${sizeClass} rounded-full bg-slate-900 flex items-center justify-center text-3xl text-white border-4 ${borderCol}"><i class="${icon}"></i></div>`;
            } else {
                let img = avatarStr.replace('img|', '');
                return `<img src="${img}" class="${sizeClass} rounded-full object-cover border-4 ${borderCol} bg-slate-900">`;
            }
        };

        // 4. KEMASKINI PAPARAN UI
        const popup = document.getElementById('winner-popup');
        const banner = document.getElementById('winner-banner');
        
        // Warna Banner & Tajuk
        if (winner === 'DRAW') {
            document.getElementById('winner-team-name').innerText = "IT'S A TIE!";
            banner.className = "py-6 text-center shadow-xl relative overflow-hidden bg-slate-700";
        } else {
            document.getElementById('winner-team-name').innerText = winner === 'A' ? `${teamNames.A} WINS` : `${teamNames.B} WINS`;
            banner.className = `py-6 text-center shadow-xl relative overflow-hidden ${winner === 'A' ? 'bg-victory-red' : 'bg-victory-blue'}`;
        }

        // Masukkan Data MVP
        document.getElementById('mvp-name').innerText = mvp.name;
        document.getElementById('mvp-score').innerText = mvp.score;
        document.getElementById('mvp-avatar-container').innerHTML = getAvatarHTML(mvp.avatar, 'w-full h-full', 'border-yellow-400');

        // Masukkan Data Badges
        document.getElementById('badge-top-scorer-name').innerText = topScorer.name;
        document.getElementById('badge-top-scorer-avatar').innerHTML = getAvatarHTML(topScorer.avatar, 'w-16 h-16', 'border-yellow-500');
        
        document.getElementById('badge-streak-name').innerText = topStreak.name;
        document.getElementById('badge-streak-avatar').innerHTML = getAvatarHTML(topStreak.avatar, 'w-16 h-16', 'border-orange-500');

        // Ringkasan Skor Bawah
        document.getElementById('summary-team-A-name').innerText = teamNames.A;
        document.getElementById('summary-team-A-score').innerText = scoreA;
        document.getElementById('summary-team-B-name').innerText = teamNames.B;
        document.getElementById('summary-team-B-score').innerText = scoreB;

        // Tunjukkan Popup!
        popup.classList.remove('hidden');
    });
};

// 🟢 FUNGSI TUTUP POPUP
window.closeWinnerPopup = function() {
    document.getElementById('winner-popup').classList.add('hidden');
};

// ==========================================
// FUNGSI SERANGAN & PENGGUNAAN BOOSTER 3V3
// ==========================================
async function gunaBooster(jenisBooster) {
    if (!currentLobbyId || !battle3v3_mySlotKey) {
        console.error("RALAT: ID Bilik atau Slot Key kosong!");
        return;
    }

    // Alamat lengkap: arenas/room_123...
    const lobbyRef = rtdb.ref("arenas/" + currentLobbyId); 
    
    const teamSaya = battle3v3_mySlotKey.charAt(0);
    const teamLawan = teamSaya === 'A' ? 'B' : 'A';

    let kosStreak = 0;
    let namaBooster = "";

    switch (jenisBooster) {
        case 'x2': kosStreak = 5; namaBooster = "x2 Points"; break;
        case 'freeze': kosStreak = 10; namaBooster = "Freeze"; break;
        case 'smoke': kosStreak = 10; namaBooster = "Smoke Bomb"; break;
        case 'bat': kosStreak = 30; namaBooster = "Black Bat"; break;
        case 'thief': kosStreak = 40; namaBooster = "Point Thief"; break;
    }

    if (playerStreak < kosStreak) {
        Swal.fire({ toast: true, position: 'top', icon: 'error', title: 'Streak tidak mencukupi!', showConfirmButton: false, timer: 2000 });
        return;
    }

    playerStreak -= kosStreak;
    // Panggil fungsi kemaskini UI (Fungsinya kena ada di luar blok ini)
    updateBoosterUI(); 

    try {
        if (jenisBooster === 'x2') {
            pointMultiplier = 2;
            Swal.fire({ toast: true, position: 'top', icon: 'success', title: '🧪 Markah x2 Aktif (10s)!', showConfirmButton: false, timer: 3000 });
            setTimeout(() => { pointMultiplier = 1; }, 10000); 
        } 
        else if (jenisBooster === 'thief') {
            await lobbyRef.update({
                [`score${teamSaya}`]: firebase.database.ServerValue.increment(2),
                [`score${teamLawan}`]: firebase.database.ServerValue.increment(-2)
            });
            Swal.fire({ toast: true, position: 'top', icon: 'success', title: '👺 2 markah dicuri!', showConfirmButton: false, timer: 3000 });
        } 
        else if (jenisBooster === 'freeze' || jenisBooster === 'smoke') {
            const updates = {};
            ['1', '2', '3'].forEach(num => {
                updates[`players/${teamLawan}${num}/debuff`] = jenisBooster;
            });
            await lobbyRef.update(updates);
            Swal.fire({ toast: true, position: 'top', icon: 'success', title: `Peluru ${namaBooster} Aktif!`, showConfirmButton: false, timer: 3000 });

            setTimeout(() => {
                const clearUpdates = {};
                ['1', '2', '3'].forEach(num => {
                    clearUpdates[`players/${teamLawan}${num}/debuff`] = null;
                });
                lobbyRef.update(clearUpdates);
            }, 10000); 
        } 
        else if (jenisBooster === 'bat') {
            await lobbyRef.update({ [`teamDebuff/${teamLawan}`]: true });
            Swal.fire({ toast: true, position: 'top', icon: 'success', title: '🦇 Black Bat Aktif!', showConfirmButton: false, timer: 3000 });
            setTimeout(() => { lobbyRef.update({ [`teamDebuff/${teamLawan}`]: null }); }, 10000); 
        }
    } catch (err) {
        console.error("Firebase Update Gagal:", err);
    }
}

// ==========================================
// RADAR PANTAU SERANGAN (VERSI UPDATE 10 SAAT)
// ==========================================
function pantauSeranganMusuh() {
    // 1. Guna variable global cikgu yang betul
    if (!currentLobbyId || !battle3v3_mySlotKey) return;
    
    const myTeam = battle3v3_mySlotKey.charAt(0); 
    
    // 2. Pantau Serangan Individu (Freeze & Smoke)
    rtdb.ref("arenas/" + currentLobbyId + "/players/" + battle3v3_mySlotKey + "/debuff").on('value', (snap) => {
        const debuff = snap.val();
        const inputEl = document.getElementById('jawapan-input');
        const qBox = document.getElementById('battle-question-box');
        
        // Reset kesan visual setiap kali data berubah
        if (inputEl) {
            inputEl.classList.remove('frozen-input-effect');
            inputEl.disabled = false;
        }
        if (qBox) qBox.classList.remove('smoke-blind-effect');
        
        if (debuff === 'freeze') {
            if (inputEl) {
                inputEl.classList.add('frozen-input-effect');
                inputEl.disabled = true;
                inputEl.placeholder = "🥶 DIBEKUKAN!";
            }
            Swal.fire({ toast: true, position: 'top', icon: 'info', title: '🥶 Anda dibekukan oleh musuh!', showConfirmButton: false, timer: 3000 });
        } 
        else if (debuff === 'smoke') {
            if (qBox) qBox.classList.add('smoke-blind-effect');
            if (inputEl) inputEl.placeholder = "💨 Skrin berkabus...";
            Swal.fire({ toast: true, position: 'top', icon: 'info', title: '💨 Asap tebal mengaburkan soalan!', showConfirmButton: false, timer: 3000 });
        }
        else {
            // Kembalikan keadaan asal jika debuff dipadam (null)
            if (inputEl && !inputEl.disabled) {
                inputEl.placeholder = "Type your answer here...";
            }
        }
    });

    // 3. Pantau Serangan Berpasukan (Black Bat)
    rtdb.ref("arenas/" + currentLobbyId + "/teamDebuff/" + myTeam).on('value', (snap) => {
        const batData = snap.val();
        const batOverlay = document.getElementById('black-bat-overlay');
        
        if (batData && batOverlay) {
            batOverlay.classList.remove('hidden');
        } else if (batOverlay) {
            batOverlay.classList.add('hidden');
        }
    });
}
