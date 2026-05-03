// ==========================================
// 🐉 LOGIK FIREBASE BOSS BATTLE + BONUS & AUDIO
// ==========================================

let selectedBossAvatar = "";
let bossTimerInterval;
let bossTimeLeft = 10;
let MAX_TIME = 15; 
let bossPlayerHP = 100;

let bossListenerUnsubscribe = null; 
let liveRankingUnsubscribe = null;
let currentBossData = null; 

// --- PEMBOLEHUBAH BONUS ---
let currentStreak = 0;
let maxStreak = 0;
let isDeadRecorded = false; // Elak hantar rekod mati berkali-kali

// --- SISTEM AUDIO ---
// Cikgu boleh letak fail mp3 dalam folder aset cikgu. Tukar laluan (path) di bawah jika berbeza.
const audioBGM = new Audio('assets/audio/boss-bgm.mp3'); 
audioBGM.loop = true;
const audioSlash = new Audio('assets/audio/slash.mp3');
const audioOof = new Audio('assets/audio/hit.mp3');
const audioWin = new Audio('assets/audio/win.mp3');

// ==========================================
// ⚙️ AUTO-LOAD KATEGORI
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const dropdown = document.getElementById('setup-boss-category');
    if (dropdown && typeof gameData !== 'undefined') {
        const categories = Object.keys(gameData);
        categories.forEach(cat => {
            let option = document.createElement('option');
            option.value = cat; option.text = "📚 " + cat.toUpperCase();
            dropdown.appendChild(option);
        });
    }
});

// ==========================================
// 🛠️ SETUP ADMIN
// ==========================================
function selectBossImage(fileName, element) {
    selectedBossAvatar = fileName;
    document.querySelectorAll('.boss-thumbnail').forEach(thumb => {
        thumb.classList.remove('border-red-500', 'shadow-[0_0_15px_rgba(239,68,68,0.6)]');
        thumb.classList.add('border-transparent');
    });
    element.classList.remove('border-transparent');
    element.classList.add('border-red-500', 'shadow-[0_0_15px_rgba(239,68,68,0.6)]');
}

async function activateBossEvent() {
    const bossName = document.getElementById('setup-boss-name').value;
    const bossHp = parseInt(document.getElementById('setup-boss-hp').value);
    const timeLimit = parseInt(document.getElementById('setup-boss-time').value);
    const bossStatus = document.getElementById('setup-boss-status').value;
    const bossCategory = document.getElementById('setup-boss-category').value; 

    if (!bossName || !bossHp || !timeLimit || selectedBossAvatar === "") return Swal.fire('Ralat', 'Sila lengkapkan borang & pilih gambar.', 'warning');

    Swal.fire({ title: 'Menyiapkan Arena...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        const bossDocRef = db.collection("ActiveBoss").doc("current_boss");

        // --- KOD BAHARU: SAPU BERSIH REKOD LAMA SEBELUM MULA ---
        const oldAttackers = await bossDocRef.collection("AttackerList").get();
        const batch = db.batch();
        oldAttackers.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        // -------------------------------------------------------

        // Reset dokumen boss
        await bossDocRef.set({
            name: bossName, maxHp: bossHp, currentHp: bossHp, timeLimit: timeLimit, status: bossStatus,
            avatar: selectedBossAvatar, category: bossCategory, 
            firstDiePlayer: "", lastHitSlayer: "",
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        Swal.fire('Boss Diaktifkan! 🐉', 'Data & Radar berjaya di-reset.', 'success');
    } catch (err) { Swal.fire('Ralat', err.message, 'error'); }
}

// ==========================================
// ⚔️ CCTV BOSS UTAMA
// ==========================================
function listenToActiveBoss() {
    bossListenerUnsubscribe = db.collection("ActiveBoss").doc("current_boss").onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            currentBossData = data;
            MAX_TIME = data.timeLimit || 15; 
            const bossBtn = document.getElementById('boss-challenge-btn');

            if (data.status === "ACTIVE" && data.currentHp > 0) {
                if (bossBtn) bossBtn.classList.remove('hidden');
                const hpBar = document.getElementById('boss-hp-bar');
                const hpText = document.getElementById('boss-hp-text');
                if (hpBar) hpBar.style.width = Math.max(0, (data.currentHp / data.maxHp) * 100) + "%";
                if (hpText) hpText.innerText = `HP: ${Math.max(0, data.currentHp)} / ${data.maxHp}`;
            } 
            else if (data.status === "INACTIVE" || data.currentHp <= 0) {
                if (bossBtn) bossBtn.classList.add('hidden');
                const arenaOverlay = document.getElementById('boss-arena');
                if (arenaOverlay && !arenaOverlay.classList.contains('hidden') && data.currentHp <= 0) {
                    endBossBattle("🔥 BOSS TELAH TEWAS! 🔥");
                }
            }
        }
    });
}

// ==========================================
// 🚀 MAIN GAMEPLAY
// ==========================================
function startBossFight() {
    if (!currentBossData) return alert("Tiada data boss.");
    
    // Reset Data Murid
    bossPlayerHP = 100;
    currentStreak = 0; maxStreak = 0; isDeadRecorded = false;
    updatebossPlayerHPUI();

    // Main Muzik!
    audioBGM.currentTime = 0;
    audioBGM.play().catch(e => console.log("Muzik perlukan klik pengguna", e));

    document.getElementById('battle-boss-avatar').src = `assets/boss/${currentBossData.avatar}`; 
    generateBossQuestion();
    startLiveRankingRadar(); // Hidupkan radar sidebar
}

function leaveBossFight() {
    audioBGM.pause(); // Hentikan muzik
    if (liveRankingUnsubscribe) liveRankingUnsubscribe(); // Tutup radar
    if (typeof showScreen === 'function') showScreen('menu-screen');
}

function generateBossQuestion() {
    clearInterval(bossTimerInterval); 
    const zone = document.getElementById('boss-answer-zone');
    const questionText = document.getElementById('boss-question-text');
    
    let selectedCat = currentBossData.category;
    const allCats = Object.keys(gameData);
    if (!selectedCat || selectedCat === "RANDOM") selectedCat = allCats[Math.floor(Math.random() * allCats.length)];

    const questions = gameData[selectedCat];
    const randomQ = questions[Math.floor(Math.random() * questions.length)];
    
    // KOD DIBAIKI: Cari kunci soalan & jawapan tak kira apa ejaannya dalam data.js
    const soalan = randomQ.q || randomQ.question || randomQ.soalan;
    const jawapanBetul = randomQ.a || randomQ.answer || randomQ.jawapan || randomQ.correct;
    
    questionText.innerText = soalan;
    zone.innerHTML = '';
    const choices = randomQ.options || randomQ.choices || randomQ.pilihan || [];

    if (choices.length > 0) {
        zone.className = "grid grid-cols-2 gap-3 w-full";
        choices.forEach(alt => {
            const btn = document.createElement('button');
            btn.className = "bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-2 rounded-xl shadow-md";
            btn.innerText = alt;
            btn.onclick = () => checkBossAnswer(alt, jawapanBetul); // Guna jawapanBetul
            zone.appendChild(btn);
        });
    } else {
        zone.className = "w-full flex flex-col gap-2";
        zone.innerHTML = `
            <input type="text" id="boss-text-input" class="border-2 p-3 rounded-xl text-center font-bold text-lg uppercase" autocomplete="off">
            <button id="boss-submit-btn" class="bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl shadow-md">Serang! ⚔️</button>
        `;
        const inputField = document.getElementById('boss-text-input');
        inputField.focus(); 
        document.getElementById('boss-submit-btn').onclick = () => checkBossAnswer(inputField.value.trim(), jawapanBetul); // Guna jawapanBetul
    }
    startBossTimer();
}

async function checkBossAnswer(chosen, correct) {
    clearInterval(bossTimerInterval); 

    if (String(chosen).toLowerCase() === String(correct).toLowerCase()) {
        // ✅ BETUL
        audioSlash.currentTime = 0; audioSlash.play(); // Bunyi serang
        
        // Kira Streak
        currentStreak++;
        if (currentStreak > maxStreak) maxStreak = currentStreak;

        // Kira Damage & Syiling Serta-Merta
        let baseDamage = bossTimeLeft < 1 ? 1 : bossTimeLeft; 
        let playerLevel = localPlayerData.level || 1;         
        let multiplier = 1.0 + (playerLevel * 0.1); 
        let finalDamage = Math.round(baseDamage * multiplier); 
        
        localPlayerData.coins = parseInt(localPlayerData.coins || 0) + finalDamage;
        localStorage.setItem('currentPlayer', JSON.stringify(localPlayerData));
	syncCoinsToFirebase();
        if (typeof updateUI === 'function') updateUI(); 
        if (typeof savePlayerData === 'function') savePlayerData(); 

        showDamageIndicator("-" + finalDamage); 
        const submitBtn = document.getElementById('boss-submit-btn');
        if(submitBtn) submitBtn.innerText = "💥 BAM!";

        await dealDamageToBoss(finalDamage); 
        if (currentBossData.currentHp > 0) setTimeout(generateBossQuestion, 500);

    } else {
        // ❌ SALAH
        audioOof.currentTime = 0; audioOof.play();
        currentStreak = 0; // Reset streak
        bossPlayerHP -= 10;
        updatebossPlayerHPUI();
        alert(`❌ Tersasar! Kena serangan balas! (-10 HP)`);
        
        if(checkPlayerAlive()) setTimeout(generateBossQuestion, 500);
    }
}

function handleTimeout() {
    audioOof.currentTime = 0; audioOof.play();
    currentStreak = 0;
    bossPlayerHP -= 20;
    updatebossPlayerHPUI();
    alert("⏳ Masa Tamat! Boss gigit awak! (-20 HP)");
    if(checkPlayerAlive()) setTimeout(generateBossQuestion, 500);
}

function startBossTimer() {
    bossTimeLeft = MAX_TIME;
    const timerBar = document.getElementById('boss-timer-bar');
    const timerText = document.getElementById('timer-text');
    timerBar.style.width = '100%'; timerBar.className = "bg-blue-500 h-full transition-all duration-1000 ease-linear";
    timerText.innerText = bossTimeLeft;

    bossTimerInterval = setInterval(() => {
        bossTimeLeft--;
        timerText.innerText = bossTimeLeft;
        timerBar.style.width = ((bossTimeLeft / MAX_TIME) * 100) + "%";
        if(bossTimeLeft <= 3) timerBar.className = "bg-red-500 h-full transition-all duration-1000 ease-linear";

        if (bossTimeLeft <= 0) { clearInterval(bossTimerInterval); handleTimeout(); }
    }, 1000);
}

// ==========================================
// 📡 DATABASE & LOGIK BONUS
// ==========================================
async function dealDamageToBoss(damageAmt) {
    const playerName = localPlayerData.name;
    const bossRef = db.collection("ActiveBoss").doc("current_boss");
    
    // Semak Last Hit
    if (currentBossData.currentHp > 0 && (currentBossData.currentHp - damageAmt) <= 0) {
        await bossRef.update({ lastHitSlayer: playerName });
    }

    // Kemaskini Damage & Rekod Streak
    await bossRef.collection("AttackerList").doc(playerName).set({
        name: playerName,
        damage: firebase.firestore.FieldValue.increment(damageAmt),
        maxStreak: maxStreak,
        lastHitTime: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // Tolak nyawa boss
    await bossRef.update({ currentHp: firebase.firestore.FieldValue.increment(-damageAmt) });
}

async function checkFirstDieLogic() {
    if (!isDeadRecorded) {
        isDeadRecorded = true;
        const bossRef = db.collection("ActiveBoss").doc("current_boss");
        const doc = await bossRef.get();
        if (doc.exists && !doc.data().firstDiePlayer) {
            await bossRef.update({ firstDiePlayer: localPlayerData.name }); // Sahkan dia yg pertama mati
        }
    }
}

function checkPlayerAlive() {
    if (bossPlayerHP <= 0) {
        checkFirstDieLogic();
        audioBGM.pause();
        Swal.fire('💀 Misi Gagal', 'Anda telah tewas... Rehat dan cuba lagi!', 'error').then(() => { leaveBossFight(); });
        return false;
    }
    return true;
}

// --- CCTV RADAR (LIVE TOP 10) ---
function startLiveRankingRadar() {
    if (liveRankingUnsubscribe) liveRankingUnsubscribe();
    liveRankingUnsubscribe = db.collection("ActiveBoss").doc("current_boss")
        .collection("AttackerList").orderBy("damage", "desc").limit(10)
        .onSnapshot(snapshot => {
            const listDiv = document.getElementById('live-ranking-list');
            if (!listDiv) return;
            listDiv.innerHTML = '';
            let rank = 1;
            snapshot.forEach(doc => {
                const data = doc.data();
                let isMe = data.name === localPlayerData.name ? 'border-2 border-green-500 bg-green-50' : 'bg-white';
                listDiv.innerHTML += `
                    <div class="flex justify-between items-center p-3 rounded-xl shadow-sm mb-2 ${isMe}">
                        <div class="font-bold text-gray-800 text-sm truncate w-2/3">
                            <span class="text-orange-500 mr-1">#${rank}</span> ${data.name}
                        </div>
                        <div class="text-red-600 font-black text-sm">${data.damage} 💥</div>
                    </div>
                `;
                rank++;
            });
        });
}

// ==========================================
// 🏆 PENAMAT: KIRAAN BONUS REWARD
// ==========================================
function updatebossPlayerHPUI() { document.getElementById('player-hp-text').innerText = bossPlayerHP; }
function showDamageIndicator(val) {
    const indicator = document.getElementById('damage-indicator');
    indicator.innerText = val; indicator.classList.remove('hidden'); indicator.classList.add('animate-bounce'); 
    setTimeout(() => { indicator.classList.add('hidden'); indicator.classList.remove('animate-bounce'); }, 1000);
}

function endBossBattle(titleText) {
    clearInterval(bossTimerInterval);
    audioBGM.pause(); 
    audioWin.currentTime = 0; audioWin.play(); // Pasang lagu menang!
    if (liveRankingUnsubscribe) liveRankingUnsubscribe();

    Swal.fire({
        icon: 'success', title: titleText, text: 'Mengira Markah & Habuan Bonus...',
        confirmButtonText: 'Lihat Keputusan 🏆', allowOutsideClick: false
    }).then((res) => { if (res.isConfirmed) calculateRewards(); });
}

async function calculateRewards() {
    Swal.fire({ title: 'Menyemak Rekod...', didOpen: () => Swal.showLoading() });
    try {
        const bossDoc = await db.collection("ActiveBoss").doc("current_boss").get();
        const bossData = bossDoc.data();
        const slayer = bossData.lastHitSlayer || "-";
        const firstBlood = bossData.firstDiePlayer || "-";

        // Ambil semua untuk cari max streak
        const snapshot = await db.collection("ActiveBoss").doc("current_boss").collection("AttackerList").orderBy("damage", "desc").get();
        
        let rankings = [];
        let highestStreak = 0;
        let streakMaster = "-";

        snapshot.forEach(doc => {
            const data = doc.data();
            rankings.push(data);
            if (data.maxStreak > highestStreak) { highestStreak = data.maxStreak; streakMaster = data.name; }
        });

        // KIRA BONUS UNTUK DIRI SENDIRI SAHAJA
        let myBonus = 0;
        let myRank = rankings.findIndex(p => p.name === localPlayerData.name) + 1;
        
        // 1. Placement Bonus
        if (myRank === 1) myBonus += 1000;
        else if (myRank === 2) myBonus += 750;
        else if (myRank === 3) myBonus += 500;
        else if (myRank > 3) myBonus += 200;

        // 2. Bonus Gelaran
        if (slayer === localPlayerData.name) myBonus += 1000;
        if (firstBlood === localPlayerData.name) myBonus += 50;
        if (streakMaster === localPlayerData.name && highestStreak > 0) myBonus += 100;

        // MASUKKAN BONUS KE DALAM AKAUN
        if (myBonus > 0 && myRank > 0) {
            localPlayerData.coins = parseInt(localPlayerData.coins || 0) + myBonus;
            localStorage.setItem('currentPlayer', JSON.stringify(localPlayerData));
            syncCoinsToFirebase(); // <--- TAMBAH BARIS INI
            if (typeof updateUI === 'function') updateUI(); 
        }

        showBossResultsModal(rankings.slice(0, 10), slayer, firstBlood, streakMaster, highestStreak, myBonus);

    } catch (err) { Swal.fire('Ralat', 'Gagal memuatkan rekod.', 'error'); }
}

function showBossResultsModal(top10, slayer, firstBlood, streakMaster, highestStreak, myBonus) {
    let tableHTML = `
        <div class="bg-blue-50 p-3 rounded-lg border border-blue-200 text-sm text-left mb-4 shadow-inner">
            <div class="font-bold text-blue-800 mb-1">Gelaran Kehormat:</div>
            <div>🗡️ <b>Last Hit Boss:</b> <span class="text-red-600">${slayer}</span></div>
            <div>🔥 <b>Longest Streak:</b> <span class="text-orange-600">${streakMaster} (${highestStreak} Combo)</span></div>
            <div>💀 <b>First Die:</b> <span class="text-gray-500">${firstBlood}</span></div>
            <div class="mt-2 text-green-700 font-black text-center text-lg animate-pulse">
                🎁 Anda menerima +${myBonus} Syiling Bonus!
            </div>
        </div>
        <table class="w-full text-sm text-left text-gray-500 border border-gray-200">
            <thead class="text-xs text-gray-700 uppercase bg-gray-100">
                <tr><th>#</th><th>Wira</th><th>Damage</th></tr>
            </thead>
            <tbody>
    `;

    top10.forEach((p, index) => {
        let medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : (index + 1);
        let color = p.name === localPlayerData.name ? 'bg-yellow-100 font-bold text-gray-900' : 'bg-white';
        tableHTML += `
            <tr class="border-b ${color}">
                <td class="px-2 py-2">${medal}</td>
                <td class="px-2 py-2">${p.name}</td>
                <td class="px-2 py-2 text-red-600 font-bold">${p.damage} 💥</td>
            </tr>
        `;
    });

    tableHTML += `</tbody></table>`;
    Swal.fire({ title: '🏆 KEPUTUSAN PEPERANGAN 🏆', html: tableHTML, confirmButtonText: 'Tutup & Rehat', allowOutsideClick: false }).then(() => {
        if (typeof showScreen === 'function') showScreen('menu-screen'); 
    });
}

// ==========================================
// 💰 FUNGSI SYNC SYILING KE FIREBASE (VERSI 3.0 - CARIAN NAMA)
// ==========================================
async function syncCoinsToFirebase() {
    try {
        // 1. Pastikan kita ada nama pemain untuk dicari
        if (!localPlayerData || !localPlayerData.name) {
            console.error("RALAT: Tiada rekod nama pemain dijumpai.");
            if (typeof savePlayerData === 'function') savePlayerData(); // Guna fungsi lama cikgu sebagai backup
            return;
        }

        console.log("Sedang mencari akaun Firebase untuk:", localPlayerData.name);

        // 2. Arahkan Firebase cari dokumen yang ada nama ini
        const snapshot = await db.collection("players").where("name", "==", localPlayerData.name).get();

        if (snapshot.empty) {
            console.error("❌ Gagal jumpa pemain bernama", localPlayerData.name, "di dalam Firebase.");
            return;
        }

        // 3. Kita berjaya jumpa! Ambil ID dokumen yang sebenar (contoh: SK_ABANG_GESA...)
        const documentId = snapshot.docs[0].id;

        // 4. Update syiling ke dalam dokumen tersebut
        await db.collection("players").doc(documentId).set({
            coins: localPlayerData.coins
        }, { merge: true }); 
        
        console.log("✅ Berjaya! Syiling (" + localPlayerData.coins + ") selamat dikunci pada ID:", documentId);
    } catch (error) {
        console.error("❌ Gagal simpan syiling ke Firebase:", error);
    }
}