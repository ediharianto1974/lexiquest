// ==========================================
// 1. FIREBASE CONFIGURATION
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyCLluidaGs2qUyReicPPz7BP67apT16d0Y",
    authDomain: "lexiquest-4c9f7.firebaseapp.com",
    projectId: "lexiquest-4c9f7",
    storageBucket: "lexiquest-4c9f7.firebasestorage.app",
    messagingSenderId: "17727028884",
    appId: "1:17727028884:web:1fd63f6a86db2e3ef4be81",
    measurementId: "G-1935EGF4ZQ"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const rtdb = firebase.database(); 

// ==========================================
// 3. INITIALIZATION & AUTO-LOGIN
// ==========================================
window.onload = async () => {
    await loadSchoolsDropdown();
    const savedName = localStorage.getItem('playerName');
    const savedClass = localStorage.getItem('playerClass');
    const savedSchool = localStorage.getItem('playerSchool');

    if (savedName && savedClass && savedSchool) {
        studentInfo = { 
            name: savedName.toUpperCase(), 
            class: savedClass.toUpperCase(), 
            school: savedSchool.toUpperCase() 
        };
        await fetchPlayerData();
        
        document.getElementById('auth-screen')?.classList.add('hidden');
        document.getElementById('login-screen')?.classList.add('hidden');
        document.getElementById('menu-screen')?.classList.remove('hidden');
        
        updateUI();
        showDashboardBasedOnRole(); 
        triggerGameHooks();

if (localPlayerData && localPlayerData.level >= 0) { // (Tukar ke 15 nanti)
            if (typeof startChallengeListener === 'function') {
                startChallengeListener(studentInfo.name);
            }
        } 
    } else {
        document.getElementById('auth-screen')?.classList.remove('hidden');
    }
};

function triggerGameHooks() {
    if (studentInfo.name === "SUPER ADMIN" || studentInfo.class === "ADMIN") return; 

    if (typeof applyTitleStyle === "function") applyTitleStyle(localPlayerData.activeTitle);
    if (typeof updatePlayerLevelUI === 'function') updatePlayerLevelUI();
    if (typeof updateCategoryProgress === "function") updateCategoryProgress();
    if (typeof checkLevelAccess === 'function') checkLevelAccess();
    if (typeof updateDashboardAvatars === "function") updateDashboardAvatars();
    if (typeof checkAchievements === "function") checkAchievements();
    if (typeof listenToActiveBoss === "function") listenToActiveBoss();
    
    if (typeof getCurrentEvent === "function") {
        const currentEvent = getCurrentEvent();
        const eventBanner = document.getElementById('event-banner');
        if (currentEvent && eventBanner) {
            eventBanner.classList.remove('hidden');
            document.getElementById('event-text').innerText = "ACTIVE EVENT: " + currentEvent.name;
        } else if (eventBanner) {
            eventBanner.classList.add('hidden');
        }
    }
    
    checkLevelRewardsOnLogin();
}

// ==========================================
// 4. STRICT LOGIN
// ==========================================
async function loginStudent() {
    const nameInput = document.getElementById('login-name').value.trim().toUpperCase();
    const classInput = document.getElementById('login-class').value.trim().toUpperCase();
    const schoolInput = document.getElementById('login-school').value;
    const pinInput = document.getElementById('login-pin').value.trim();

    if (!nameInput || !classInput || !schoolInput) {
        Swal.fire("Tidak Lengkap", "Sila isi Nama, Kelas, dan pilih Sekolah anda.", "warning");
        return;
    }

    if (schoolInput === "ADMIN" && nameInput === "SUPER ADMIN") {
        studentInfo = { name: "SUPER ADMIN", class: "ADMIN", school: "ADMIN" };
        localPlayerData.activeTitle = "Game Master";
        finalizeLogin();
        return;
    }

    const docId = `${schoolInput}_${classInput}_${nameInput}`.replace(/\s+/g, '_');

    try {
        const btn = event.target;
        btn.innerText = "Loading data...";
        btn.disabled = true;

        const docRef = db.collection("players").doc(docId);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            const data = docSnap.data();
            
            if (data.passcode && data.passcode !== pinInput) {
                Swal.fire("Akses Ditolak", "PIN yang anda masukkan salah.", "error");
                btn.innerText = "START ADVENTURE";
                btn.disabled = false;
                return;
            }
            
            localPlayerData = {
                ...data,
                totalScore: data.totalScore || data.Total || data.total || data.TOTAL || 0,
                claimedLevels: Array.isArray(data.claimedLevels) ? data.claimedLevels : [],
                games: typeof data.games === 'string' ? JSON.parse(data.games || "{}") : (data.games || {}),
                lastPlayed: Array.isArray(data.lastPlayed) ? data.lastPlayed : []
            }; 
            
            // ... (kod di atas kekal sama) ...
            
            studentInfo = { name: nameInput, class: classInput, school: schoolInput };
            
            Swal.fire({
                icon: 'success',
                title: 'Login Berjaya!',
                text: 'Selamat kembali, ' + nameInput,
                timer: 1500,
                showConfirmButton: false
            });

            finalizeLogin();
            
            // ==========================================
            // ---> TAMBAH KOD INI DI SINI <---
            // Mulakan pendengar cabaran HANYA jika pemain Level 15+
            // ==========================================
            if (localPlayerData.level >= 15) {
                startChallengeListener(studentInfo.name);
            }

        } else {
            Swal.fire({
                icon: 'error',
                title: 'Akaun Tidak Ditemui',
                text: 'Nama anda tiada dalam rekod. Sila hubungi Admin Sekolah anda untuk pendaftaran.'
            });
        }
        
        btn.innerText = "START ADVENTURE";
        btn.disabled = false;

    } catch (error) {
        console.error("Login Error:", error);
        Swal.fire("Ralat Sistem", "Gagal berhubung ke awan. Sila semak internet anda.", "error");
    }
}

function finalizeLogin() {
    localStorage.setItem('playerName', studentInfo.name);
    localStorage.setItem('playerClass', studentInfo.class);
    localStorage.setItem('playerSchool', studentInfo.school);
    
    document.getElementById('auth-screen')?.classList.add('hidden');
    document.getElementById('login-screen')?.classList.add('hidden');
    document.getElementById('menu-screen')?.classList.remove('hidden');
    
    updateUI();
    showDashboardBasedOnRole();
    triggerGameHooks();
}

// ==========================================
// 5. ROLE-BASED DASHBOARD LOGIC
// ==========================================
function showDashboardBasedOnRole() {
    document.getElementById('dashboard-super-admin')?.classList.add('hidden');
    document.getElementById('dashboard-school-admin')?.classList.add('hidden');
    document.getElementById('dashboard-student')?.classList.add('hidden');

    const displayClassEl = document.getElementById('menu-player-class'); 
    const playerNameEl = document.getElementById('menu-player-name');
    
    // 👇 1. TAMBAH CARI KOTAK LEVEL & TITLE
    const levelEl = document.getElementById('menu-player-level');
    const displayTitleEl = document.getElementById('display-title');

    // Kemaskini Nama
    if (playerNameEl && studentInfo.name) {
        playerNameEl.innerText = studentInfo.name;
    }

    // 👇 2. TAMBAH ARAHAN PAPAR LEVEL & TITLE 
if (typeof localPlayerData !== 'undefined') {
    // Kira level sebenar berdasarkan markah terkini!
    let realLevel = 1;
    if (typeof calculateLevel === "function") {
        realLevel = calculateLevel(Number(localPlayerData.totalScore) || 0);
    }
    
    if (levelEl) levelEl.innerText = "LVL " + realLevel;
    if (displayTitleEl) displayTitleEl.innerText = localPlayerData.activeTitle || "NOVICE";
}

    // Kemaskini Papan Pemuka & Kelas berdasarkan Peranan
    if (studentInfo.name === "SUPER ADMIN") {
        document.getElementById('dashboard-super-admin')?.classList.remove('hidden');
        if (displayClassEl) displayClassEl.innerText = "SYSTEM OWNER"; 
    } 
    else if (studentInfo.class === "ADMIN" || (typeof localPlayerData !== 'undefined' && localPlayerData.activeTitle === "School Admin")) {
        document.getElementById('dashboard-school-admin')?.classList.remove('hidden');
        if (displayClassEl) displayClassEl.innerText = "SCHOOL ADMIN"; 
    } 
    else {
        document.getElementById('dashboard-student')?.classList.remove('hidden');
        if (displayClassEl) displayClassEl.innerText = studentInfo.class; 
    }
}

// ==========================================
// 6. CLOUD SYNCING
// ==========================================
async function fetchPlayerData() {
    if (studentInfo.name === "SUPER ADMIN") return; 

    const docId = `${studentInfo.school}_${studentInfo.class}_${studentInfo.name}`.replace(/\s+/g, '_');
    try {
        const docSnap = await db.collection("players").doc(docId).get();
        if (docSnap.exists) {
            const data = docSnap.data();
            localPlayerData = {
                ...data,
                totalScore: data.totalScore || data.Total || data.total || data.TOTAL || 0,
            };
        }
    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

async function saveCloudPlayerData() {
    // 1. Dapatkan data dari studentInfo ATAU localPlayerData (sebagai pelan sandaran/backup)
    const pName = (typeof studentInfo !== 'undefined' && studentInfo.name) ? studentInfo.name : localPlayerData.name;
    const pClass = (typeof studentInfo !== 'undefined' && studentInfo.class) ? studentInfo.class : localPlayerData.class;
    const pSchool = (typeof studentInfo !== 'undefined' && studentInfo.school) ? studentInfo.school : (localPlayerData.school || "SK_DEFAULT"); // Sila tukar DEFAULT jika perlu

    // 2. Pengawal keselamatan baharu
    if (!pName || pName === "SUPER ADMIN") {
        console.log("Hentikan simpanan: Data pemain tidak lengkap atau admin.");
        return;
    }
    
    console.log("Memulakan proses simpan ke Firestore untuk:", pName); // Untuk rujukan kita di Console
    
    // 3. Hasilkan ID Dokumen
    const docId = `${pSchool}_${pClass}_${pName}`.replace(/\s+/g, '_');
    
    // ==========================================
    // 🕵️‍♂️ ALAT PENGESAN (TRACKER) DITAMBAH DI SINI
    // ==========================================
    console.log("SAYA SEDANG MENYIMPAN DATA KE DOKUMEN:", docId);
    console.log("JUMLAH KOIN YANG DISIMPAN:", localPlayerData.coins);
    // ==========================================
    
    try {
        await db.collection("players").doc(docId).set({
            ...localPlayerData, // Ini sudah merangkumi coins, inventory, dll
            name: pName,
            class: pClass,
            school: pSchool,
            // Pastikan dua baris bawah ini betul! (Ditambah parseInt untuk pastikan ia sentiasa nombor)
            totalScore: parseInt(localPlayerData.totalScore) || 0,
            coins: parseInt(localPlayerData.coins) || 0, 
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        console.log("✅ Berjaya simpan ke Firestore!");
        
        if (typeof updateCategoryProgress === 'function') {
            updateCategoryProgress();
        }
    } catch (e) {
        console.error("❌ Sync Error (Gagal Simpan):", e);
    }
}

// ==========================================
// 7. UI UPDATES & UTILITIES
// ==========================================
function updateUI() {
    const elName = document.getElementById('display-name');
    const elClass = document.getElementById('display-class');
    const elCoins = document.getElementById('display-coins');
    const elTitle = document.getElementById('display-title');
    const elAvatar = document.getElementById('menu-avatar-container');

    if(elName) elName.innerText = studentInfo.name;
    if(elClass && studentInfo.class !== "ADMIN") elClass.innerText = "Class: " + studentInfo.class;
    if(elCoins) elCoins.innerText = localPlayerData.coins || 0;
    if(elTitle) elTitle.innerText = localPlayerData.activeTitle || "Novice";
    
    if (elAvatar) {
        if (localPlayerData.activeAvatar && localPlayerData.activeAvatar.icon) {
            elAvatar.innerText = localPlayerData.activeAvatar.icon;
        } else {
            elAvatar.innerText = "👤";
        }
    }
}

function logout() {
    localStorage.clear();
    location.reload();
}

// ==========================================
// 8. LEVEL REWARDS (KEMASKINI: 100 Coins Per Level)
// ==========================================
function calculateLevel(xp) {
    if (!xp || xp < 100) return 1;
    // Formula kuadratik: Level = (-1 + sqrt(9 + 0.16 * xp)) / 2
    let lvl = (-1 + Math.sqrt(9 + 0.16 * xp)) / 2;
    return Math.floor(lvl) + 1;
}

function checkLevelRewardsOnLogin() {
    let currentTotalXP = Number(localPlayerData.totalScore) || 0;
    let currentLevel = calculateLevel(currentTotalXP);

    if (!localPlayerData.claimedLevels) localPlayerData.claimedLevels = [];
    let claimedArray = localPlayerData.claimedLevels.map(Number);
    let totalRewardToGive = 0;
    let newlyClaimed = [];

    // Semak level mana yang belum diberi hadiah
    for (let i = 2; i <= currentLevel; i++) {
        if (!claimedArray.includes(i)) {
            totalRewardToGive += 100; // Hadiah tetap 100 coins
            newlyClaimed.push(i);
            claimedArray.push(i);
        }
    }

    if (newlyClaimed.length > 0) {
        localPlayerData.claimedLevels = claimedArray;
        localPlayerData.coins = (Number(localPlayerData.coins) || 0) + totalRewardToGive;
        saveCloudPlayerData();
        
        setTimeout(() => {
            Swal.fire({
                title: '🎊 LEVEL UP!',
                html: `Tahniah! Anda mencapai <b>Level ${currentLevel}</b>.<br>Ganjaran: 💰 <b>${totalRewardToGive} Coins</b>`,
                icon: 'success'
            });
            updateUI();
            if (typeof updatePlayerLevelUI === 'function') updatePlayerLevelUI();
        }, 1500);
    }
}

// ==========================================
// 9. PENDAFTARAN PENGGUNA (ADMIN PANEL)
// ==========================================
function openAdminPanel() {
    showScreen('admin-screen');
    
    const superSection = document.getElementById('super-admin-section');
    const schoolSection = document.getElementById('school-admin-section');
    const schoolLabel = document.getElementById('admin-current-school');

    superSection.classList.add('hidden');
    schoolSection.classList.add('hidden');

    if (studentInfo.name === "SUPER ADMIN") {
        superSection.classList.remove('hidden');
    } 
    else if (studentInfo.class === "ADMIN" || localPlayerData.activeTitle === "School Admin") {
        schoolSection.classList.remove('hidden');
        schoolLabel.innerText = `Pangkalan Data: ${studentInfo.school}`;
    }
}

async function registerSchoolAdmin() {
    const schoolName = document.getElementById('reg-school-name').value.trim().toUpperCase();
    const adminName = document.getElementById('reg-admin-name').value.trim().toUpperCase();
    const pin = document.getElementById('reg-admin-pin').value.trim();

    if (!schoolName || !adminName || !pin) {
        Swal.fire("Tidak Lengkap", "Sila isi Nama Sekolah, Nama Admin, dan PIN.", "warning");
        return;
    }

    const docId = `${schoolName}_ADMIN_${adminName}`.replace(/\s+/g, '_');

    try {
        Swal.fire({ title: 'Mendaftarkan Sekolah...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        
        await db.collection("players").doc(docId).set({
            name: adminName,
            class: "ADMIN",
            school: schoolName,
            passcode: pin,
            activeTitle: "School Admin",
            coins: 0,
            totalScore: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        Swal.fire("Berjaya!", `Admin Sekolah ${schoolName} telah didaftarkan.`, "success");
        
        document.getElementById('reg-school-name').value = "";
        document.getElementById('reg-admin-name').value = "";
        document.getElementById('reg-admin-pin').value = "";
        
    } catch (e) {
        console.error(e);
        Swal.fire("Ralat", "Gagal mendaftar sekolah.", "error");
    }
}

async function registerStudent() {
    const stuName = document.getElementById('reg-student-name').value.trim().toUpperCase();
    const stuClass = document.getElementById('reg-student-class').value.trim().toUpperCase();
    const pin = document.getElementById('reg-student-pin').value.trim();
    const schoolName = studentInfo.school; 

    if (!stuName || !stuClass) {
        Swal.fire("Tidak Lengkap", "Sila isi Nama Murid dan Kelas.", "warning");
        return;
    }

    const docId = `${schoolName}_${stuClass}_${stuName}`.replace(/\s+/g, '_');

    try {
        Swal.fire({ title: 'Mendaftarkan Murid...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        const docSnap = await db.collection("players").doc(docId).get();
        if (docSnap.exists) {
            Swal.fire("Akaun Wujud", "Murid ini telah pun didaftarkan sebelum ini.", "info");
            return;
        }

        const initialData = {
            name: stuName,
            class: stuClass,
            school: schoolName,
            passcode: pin,
            coins: 0,
            inventory: [],
            avatars: {},
            activeAvatar: null,
            achievements: [],
            activeTitle: "Novice",
            totalScore: 0,
            claimedLevels: [],
            lastPlayed: [],
            games: {},
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection("players").doc(docId).set(initialData);

        Swal.fire("Berjaya!", `${stuName} berjaya didaftarkan ke kelas ${stuClass}.`, "success");

        document.getElementById('reg-student-name').value = "";
        document.getElementById('reg-student-class').value = "";
        document.getElementById('reg-student-pin').value = "";

    } catch (e) {
        console.error(e);
        Swal.fire("Ralat", "Gagal mendaftar murid.", "error");
    }
}

// ==========================================
// 10. LEADERBOARD & DINAMIK DROPDOWN
// ==========================================
async function loadLeaderboard() {
    const lbList = document.getElementById('leaderboard-list');
    const lbSchoolName = document.getElementById('lb-school-name');
    
    if (lbSchoolName) lbSchoolName.innerText = `School: ${studentInfo.school}`;
    if (lbList) lbList.innerHTML = "<p class='text-center py-10 animate-pulse text-indigo-500'>Mencari kedudukan terkini...</p>";

    try {
        const snapshot = await db.collection("players")
            .where("school", "==", studentInfo.school)
            .where("class", "!=", "ADMIN") 
            .get();

        let players = [];
        snapshot.forEach(doc => players.push(doc.data()));
        players.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));

        if (lbList) lbList.innerHTML = "";
        let rank = 1;

        if (players.length === 0) {
            if (lbList) lbList.innerHTML = "<p class='text-center text-gray-500 font-bold'>Belum ada rekod murid untuk sekolah ini.</p>";
            return;
        }

        players.slice(0, 50).forEach(p => {
            const isMe = p.name === studentInfo.name ? "border-2 border-indigo-500 bg-indigo-50" : "bg-white/50 border border-white/40";
            const avatarIcon = (p.activeAvatar && p.activeAvatar.icon) ? p.activeAvatar.icon : "👤";
            
            const item = document.createElement('div');
            item.className = `flex justify-between items-center p-4 rounded-2xl mb-2 shadow-sm ${isMe}`;
            item.innerHTML = `
                <div class="flex items-center gap-4">
                    <span class="text-lg font-black ${rank <= 3 ? 'text-yellow-500' : 'text-gray-400'} w-6 text-center">#${rank++}</span>
                    <div class="w-10 h-10 rounded-full bg-white flex items-center justify-center text-xl shadow-inner border border-gray-100">
                        ${avatarIcon}
                    </div>
                    <div>
                        <p class="font-bold text-gray-800">${p.name}</p>
                        <p class="text-xs font-semibold text-indigo-500">${p.class} • ${p.activeTitle || "Novice"}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-xl font-black text-indigo-700">${p.totalScore || 0}</p>
                    <p class="text-[10px] text-gray-400 uppercase font-bold">Points</p>
                </div>
            `;
            lbList.appendChild(item);
        });
    } catch (error) {
        console.error("Leaderboard error:", error);
        if (lbList) lbList.innerHTML = "<p class='text-red-500 text-center font-bold'>Ralat memuat turun data.</p>";
    }
}

async function loadSchoolsDropdown() {
    const schoolSelect = document.getElementById('login-school');
    if (!schoolSelect) return;

    try {
        const snapshot = await db.collection("players").where("activeTitle", "==", "School Admin").get();
        let schoolsList = new Set();
        
        snapshot.forEach(doc => {
            if (doc.data().school && doc.data().school !== "ADMIN") {
                schoolsList.add(doc.data().school.toUpperCase());
            }
        });

        schoolSelect.innerHTML = `<option value="" disabled selected>-- Select School --</option>`;
        let sortedSchools = Array.from(schoolsList).sort();
        
        sortedSchools.forEach(school => {
            const opt = document.createElement('option');
            opt.value = school;
            opt.innerText = school;
            schoolSelect.appendChild(opt);
        });

        const adminOpt = document.createElement('option');
        adminOpt.value = "ADMIN";
        adminOpt.innerText = "ADMIN / GAME MASTER";
        schoolSelect.appendChild(adminOpt);

    } catch (error) {
        console.error("Ralat memuat turun senarai sekolah:", error);
    }
}

// ==========================================
// 11. DATA FETCHING & EDITING (ADMIN DASHBOARD)
// ==========================================

async function loadAdminSchools() {
    const list = document.getElementById('sa-schools-list');
    if(!list) return;
    list.innerHTML = '<tr><td colspan="4" class="text-center italic py-4">Memuat turun data...</td></tr>';
    
    try {
        const snapshot = await db.collection("players").where("activeTitle", "==", "School Admin").get();
        list.innerHTML = "";
        
        if(snapshot.empty) {
            list.innerHTML = '<tr><td colspan="4" class="text-center py-4">Tiada sekolah didaftarkan.</td></tr>';
            return;
        }
        
        snapshot.forEach(doc => {
            const d = doc.data();
            if(d.school !== "ADMIN") {
                const dateStr = d.createdAt ? d.createdAt.toDate().toLocaleDateString() : 'N/A';
                list.innerHTML += `
                    <tr class="hover:bg-gray-50">
                        <td class="font-bold text-purple-700 uppercase">${d.school}</td>
                        <td class="uppercase">${d.name}</td>
                        <td>${dateStr}</td>
                        <td class="flex gap-2">
                            <button onclick="editSchoolAdmin('${doc.id}', '${d.school}', '${d.name}', '${d.passcode || ''}')" class="bg-blue-500 text-white px-3 py-1 rounded-lg text-sm shadow-sm hover:bg-blue-600 font-bold">Edit</button>
                            <button onclick="deleteAccount('${doc.id}')" class="bg-red-500 text-white px-3 py-1 rounded-lg text-sm shadow-sm hover:bg-red-600 font-bold">Padam</button>
                        </td>
                    </tr>
                `;
            }
        });
    } catch(e) {
        console.error(e);
        list.innerHTML = '<tr><td colspan="4" class="text-center text-red-500">Ralat memuat turun data.</td></tr>';
    }
}

async function loadGlobalStudents() {
    const list = document.getElementById('sa-students-list');
    const filterDropdown = document.getElementById('sa-filter-school');
    const filterVal = filterDropdown ? filterDropdown.value : "ALL";
    if(!list) return;

    list.innerHTML = '<tr><td colspan="5" class="text-center italic py-4">Memuat turun data...</td></tr>';
    try {
        const snapshot = await db.collection("players").get();
        list.innerHTML = "";
        
        let schoolsSet = new Set();
        let count = 0;
        
        snapshot.forEach(doc => {
            const d = doc.data();
            
            if (d.activeTitle === "School Admin" && d.school !== "ADMIN") {
                schoolsSet.add(d.school);
            }

            if(d.school === "ADMIN" || d.activeTitle === "School Admin" || d.class === "ADMIN") return;
            if (d.school) schoolsSet.add(d.school);

            if (filterVal === "ALL" || filterVal === d.school) {
                count++;
                list.innerHTML += `
                    <tr class="hover:bg-gray-50">
                        <td class="font-bold text-indigo-700 uppercase">${d.school}</td>
                        <td class="uppercase">${d.name}</td>
                        <td class="uppercase">${d.class}</td>
                        <td class="font-bold text-yellow-600">${d.coins || 0}</td>
                        <td class="flex gap-2">
                            <button onclick="editStudent('${doc.id}', '${d.school}', '${d.name}', '${d.class}', ${d.coins || 0}, '${d.passcode || ''}')" class="bg-blue-500 text-white px-3 py-1 rounded-lg text-sm shadow-sm hover:bg-blue-600 font-bold">Edit</button>
                            <button onclick="deleteAccount('${doc.id}')" class="bg-red-500 text-white px-3 py-1 rounded-lg text-sm shadow-sm hover:bg-red-600 font-bold">Padam</button>
                        </td>
                    </tr>
                `;
            }
        });

        if(count === 0) list.innerHTML = `<tr><td colspan="5" class="text-center py-4 font-bold text-gray-500">Tiada murid dijumpai untuk carian ini.</td></tr>`;

        if (filterDropdown) {
            const currentSelection = filterDropdown.value; 
            filterDropdown.innerHTML = `<option value="ALL">Semua Sekolah</option>`;
            let sortedSchools = Array.from(schoolsSet).sort();
            
            sortedSchools.forEach(sch => {
                filterDropdown.innerHTML += `<option value="${sch}">${sch.toUpperCase()}</option>`;
            });
            
            if(sortedSchools.includes(currentSelection)) {
                filterDropdown.value = currentSelection;
            }
        }

    } catch(e) {
        console.error(e);
        list.innerHTML = '<tr><td colspan="5" class="text-center text-red-500">Ralat memuat turun data.</td></tr>';
    }
}

// ------------------------------------------
// FUNGSI EDIT ADMIN SEKOLAH (POPUP)
// ------------------------------------------
async function editSchoolAdmin(docId, school, currentName, currentPin) {
    const { value: formValues } = await Swal.fire({
        title: 'Edit Admin Sekolah',
        html:
            `<div class="text-left text-sm mb-4 font-bold text-purple-700">Sekolah: ${school}</div>` +
            `<label class="block text-left text-sm font-bold mt-2">Nama Admin</label>`+
            `<input id="swal-admin-name" class="swal2-input uppercase w-4/5" value="${currentName}">` +
            `<label class="block text-left text-sm font-bold mt-2">PIN Baru</label>`+
            `<input id="swal-admin-pin" class="swal2-input w-4/5" value="${currentPin}">`,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Simpan',
        preConfirm: () => {
            return {
                newName: document.getElementById('swal-admin-name').value.trim().toUpperCase(),
                passcode: document.getElementById('swal-admin-pin').value.trim()
            }
        }
    });

    if (formValues) {
        try {
            Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            
            const newDocId = `${school}_ADMIN_${formValues.newName}`.replace(/\s+/g, '_');
            
            // Jika nama admin bertukar, kita perlu pindahkan ID Dokumen di Firebase
            if (newDocId !== docId) {
                const oldDoc = await db.collection("players").doc(docId).get();
                const data = oldDoc.data();
                data.name = formValues.newName;
                data.passcode = formValues.passcode;
                
                await db.collection("players").doc(newDocId).set(data);
                await db.collection("players").doc(docId).delete();
            } else {
                // Jika hanya tukar PIN, update dokumen lama
                await db.collection("players").doc(docId).update({
                    passcode: formValues.passcode
                });
            }
            Swal.fire("Berjaya", "Data admin telah dikemaskini.", "success");
            loadAdminSchools(); // Segar semula jadual
        } catch (e) {
            console.error(e);
            Swal.fire("Ralat", "Gagal mengemaskini data.", "error");
        }
    }
}

// ------------------------------------------
// FUNGSI EDIT MURID (POPUP)
// ------------------------------------------
async function editStudent(docId, school, currentName, currentClass, currentCoins, currentPin) {
    const { value: formValues } = await Swal.fire({
        title: 'Edit Data Murid',
        html:
            `<div class="text-left text-sm mb-4 font-bold text-indigo-700">Sekolah: ${school}</div>` +
            `<label class="block text-left text-sm font-bold mt-2">Nama Murid</label>`+
            `<input id="swal-stu-name" class="swal2-input uppercase w-4/5" value="${currentName}">` +
            `<label class="block text-left text-sm font-bold mt-2">Kelas</label>`+
            `<input id="swal-stu-class" class="swal2-input uppercase w-4/5" value="${currentClass}">` +
            `<label class="block text-left text-sm font-bold mt-2">Syiling (Coins)</label>`+
            `<input id="swal-stu-coins" type="number" class="swal2-input w-4/5" value="${currentCoins}">`+
            `<label class="block text-left text-sm font-bold mt-2">PIN / Passcode</label>`+
            `<input id="swal-stu-pin" class="swal2-input w-4/5" value="${currentPin}">`,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Simpan',
        preConfirm: () => {
            return {
                newName: document.getElementById('swal-stu-name').value.trim().toUpperCase(),
                newClass: document.getElementById('swal-stu-class').value.trim().toUpperCase(),
                coins: parseInt(document.getElementById('swal-stu-coins').value) || 0,
                passcode: document.getElementById('swal-stu-pin').value.trim()
            }
        }
    });

    if (formValues) {
        try {
            Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            
            const newDocId = `${school}_${formValues.newClass}_${formValues.newName}`.replace(/\s+/g, '_');
            
            // Logik pemindahan rekod jika Nama atau Kelas berubah (untuk kekalkan Login murid)
            if (newDocId !== docId) {
                const oldDoc = await db.collection("players").doc(docId).get();
                const data = oldDoc.data();
                data.name = formValues.newName;
                data.class = formValues.newClass;
                data.coins = formValues.coins;
                data.passcode = formValues.passcode;
                
                await db.collection("players").doc(newDocId).set(data);
                await db.collection("players").doc(docId).delete();
            } else {
                await db.collection("players").doc(docId).update({
                    coins: formValues.coins,
                    passcode: formValues.passcode
                });
            }
            Swal.fire("Berjaya", "Profil murid telah dikemaskini.", "success");
            loadGlobalStudents(); // Segar semula jadual
        } catch (e) {
            console.error(e);
            Swal.fire("Ralat", "Gagal mengemaskini data.", "error");
        }
    }
}

// ------------------------------------------
// ANALISIS & LAIN-LAIN
// ------------------------------------------
async function loadSystemAnalysis() {
    const elSchools = document.getElementById('stat-total-schools');
    const elStudents = document.getElementById('stat-total-students');
    const elList = document.getElementById('stat-breakdown-list');
    if(!elSchools) return;

    try {
        const snapshot = await db.collection("players").get();
        let schoolAdmins = 0;
        let students = 0;
        let breakdown = {};

        snapshot.forEach(doc => {
            const d = doc.data();
            if (d.school === "ADMIN") return; 
            
            if (d.activeTitle === "School Admin" || d.class === "ADMIN") {
                schoolAdmins++;
            } else {
                students++;
                if (!breakdown[d.school]) breakdown[d.school] = 0;
                breakdown[d.school]++;
            }
        });

        elSchools.innerText = schoolAdmins;
        elStudents.innerText = students;
        elList.innerHTML = "";
        
        for (let sch in breakdown) {
            elList.innerHTML += `<li class="flex justify-between border-b border-gray-100 pb-2 pt-2"><span class="uppercase">${sch}</span> <span class="font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-lg">${breakdown[sch]} murid</span></li>`;
        }
        if(Object.keys(breakdown).length === 0) elList.innerHTML = "<li class='italic'>Belum ada murid didaftarkan.</li>";

    } catch(e) {
        console.error(e);
    }
}

async function deleteAccount(docId) {
    if(confirm("AWAS: Adakah anda pasti mahu memadam akaun ini? Data yang dipadam tidak boleh dikembalikan.")) {
        try {
            await db.collection("players").doc(docId).delete();
            Swal.fire("Berjaya", "Akaun telah dipadam secara kekal.", "success");
            
            if(!document.getElementById('sa-schools-screen').classList.contains('hidden')) loadAdminSchools();
            if(!document.getElementById('sa-students-screen').classList.contains('hidden')) loadGlobalStudents();
        } catch(e) {
            console.error(e);
            Swal.fire("Ralat", "Gagal memadam akaun.", "error");
        }
    }
}