// ==========================================
// PUSAT KAWALAN DATA (TRACKERS)
// ==========================================
// Fail ini menguruskan semua jejak aktiviti murid untuk lencana (achievements).

window.Trackers = {

    // ----------------------------------------------------
    // 1. FUNGSI PENYELAMAT DATA (SAVE HELPER)
    // ----------------------------------------------------
    // Fungsi ini dipanggil setiap kali ada data baru untuk terus simpan ke Firestore
    saveData: function() {
        if (typeof saveCloudPlayerData === "function") {
            saveCloudPlayerData();
        } else if (typeof syncDataToFirestore === "function") {
            syncDataToFirestore();
        }
    },

    // ----------------------------------------------------
    // 2. JEJAK LOG MASUK & MASA (LOGIN & TIME)
    // ----------------------------------------------------
    rekodLogin: function() {
        if (!window.localPlayerData) return;
        
        const now = new Date();
        const hour = now.getHours();
        const month = now.getMonth() + 1; // 1-12
        const date = now.getDate();
        const day = now.getDay(); // 0 = Ahad, 6 = Sabtu

        // Tambah jumlah login
        localPlayerData.loginCount = (Number(localPlayerData.loginCount) || 0) + 1;

        // Semak Waktu Main (Awal Pagi < 7 AM, Lewat Malam >= 10 PM)
        if (hour < 7) localPlayerData.hasPlayedEarly = true;
        if (hour >= 22) localPlayerData.hasPlayedLate = true;

        // Semak Hujung Minggu
        if (day === 0 || day === 6) localPlayerData.hasPlayedWeekend = true;

        // Semak Merdeka (31 Ogos) & Bulan Disember
        if (date === 31 && month === 8) localPlayerData.hasPlayedMerdeka = true;
        if (month === 12) localPlayerData.hasPlayedDecember = true; 

        this.saveData();
    },

    rekodStreakHarian: function(loginBerterusan, avatarBerterusan) {
        // Dipanggil oleh auth.js semasa login harian
        if (!window.localPlayerData) return;
        localPlayerData.loginStreak = loginBerterusan;
        localPlayerData.avatarStreak = avatarBerterusan;
        this.saveData();
    },

    // ----------------------------------------------------
    // 3. JEJAK PERMAINAN (GAME & SCORE)
    // ----------------------------------------------------
    rekodTamatGame: function(gameId, markah, isPerfect) {
        if (!window.localPlayerData) return;

        // Tambah Markah dan Jumlah Game
        localPlayerData.totalScore = (Number(localPlayerData.totalScore) || 0) + markah;
        localPlayerData.totalGames = (Number(localPlayerData.totalGames) || 0) + 1;
        localPlayerData.dailyGamesCount = (Number(localPlayerData.dailyGamesCount) || 0) + 1;

        // Semak Markah Penuh (Perfect Score)
        if (isPerfect) {
            localPlayerData.perfectScores = (Number(localPlayerData.perfectScores) || 0) + 1;
        }

        // Semak Senarai Game Unik yang dimainkan
        if (!localPlayerData.playedGamesList) localPlayerData.playedGamesList = [];
        if (!localPlayerData.playedGamesList.includes(gameId)) {
            localPlayerData.playedGamesList.push(gameId);
        }

        // Semak Game yang mendapat markah 50 ke atas (Untuk lencana Polymath)
        if (markah >= 50) {
            if (!localPlayerData.highScoreGamesList) localPlayerData.highScoreGamesList = [];
            if (!localPlayerData.highScoreGamesList.includes(gameId)) {
                localPlayerData.highScoreGamesList.push(gameId);
            }
            localPlayerData.gamesWithScore50Plus = localPlayerData.highScoreGamesList.length;
        }

        this.saveData();
    },

    // ----------------------------------------------------
    // 4. JEJAK EKONOMI & KEDAI (SHOP & ECONOMY)
    // ----------------------------------------------------
    rekodBukaKedai: function() {
        if (!window.localPlayerData) return;
        localPlayerData.shopVisits = (Number(localPlayerData.shopVisits) || 0) + 1;
        this.saveData();
    },

    rekodKoinDapat: function(jumlah) {
        if (!window.localPlayerData) return;
        localPlayerData.totalCoinsEarned = (Number(localPlayerData.totalCoinsEarned) || 0) + jumlah;
        // Baki koin (localPlayerData.coins) diuruskan di tempat lain, di sini cuma track jumlah keseluruhan yang pernah diraih
        this.saveData();
    },

    rekodKoinBelanja: function(jumlah) {
        if (!window.localPlayerData) return;
        localPlayerData.totalSpent = (Number(localPlayerData.totalSpent) || 0) + jumlah;
        this.saveData();
    },

    // ----------------------------------------------------
    // 5. JEJAK AVATAR (AVATAR COLLECTION)
    // ----------------------------------------------------
    rekodDataAvatar: function() {
        // Dipanggil setiap kali lepas beli/upgrade avatar
        if (!window.localPlayerData) return;

        let levelPalingTinggi = 1;
        let bilanganLevel5 = 0;
        let jumlahAvatarDibuka = 0;

        // Semak di dalam objek 'avatars' mengikut format Firestore cikgu
        if (localPlayerData.avatars) {
            const senaraiAvatar = Object.keys(localPlayerData.avatars);
            jumlahAvatarDibuka = senaraiAvatar.length;

            senaraiAvatar.forEach(namaAvatar => {
                const levelAvatar = localPlayerData.avatars[namaAvatar].level || 1;
                
                // Cari level paling tinggi (Untuk ach_15 - Max Level 10)
                if (levelAvatar > levelPalingTinggi) {
                    levelPalingTinggi = levelAvatar;
                }
                
                // Kira berapa avatar capai level 5 (Untuk ach_35 - Elite Squad)
                if (levelAvatar >= 5) {
                    bilanganLevel5++;
                }
            });
        }

        localPlayerData.maxAvatarLevel = levelPalingTinggi;
        localPlayerData.avatarsAtLevel5 = bilanganLevel5;
        localPlayerData.unlockedAvatarsCount = jumlahAvatarDibuka; 
        
        this.saveData();
    },

    // ----------------------------------------------------
    // 6. JEJAK CABARAN (CHALLENGE MODE)
    // ----------------------------------------------------
    rekodHantarCabaran: function() {
        if (!window.localPlayerData) return;
        localPlayerData.challengesSent = (Number(localPlayerData.challengesSent) || 0) + 1;
        localPlayerData.totalChallenges = (Number(localPlayerData.totalChallenges) || 0) + 1;
        this.saveData();
    },

    rekodKeputusanCabaran: function(keputusan, isNarrow = false, isComeback = false, isRevenge = false) {
        if (!window.localPlayerData) return;
        
        localPlayerData.totalChallenges = (Number(localPlayerData.totalChallenges) || 0) + 1;

        if (keputusan === 'win') {
            localPlayerData.challengesWon = (Number(localPlayerData.challengesWon) || 0) + 1;
            if (isNarrow) localPlayerData.hasDoneNarrowWin = true;
            if (isComeback) localPlayerData.hasDoneComeback = true;
            if (isRevenge) localPlayerData.hasDoneRevenge = true;
        } 
        else if (keputusan === 'lose') {
            localPlayerData.challengesLost = (Number(localPlayerData.challengesLost) || 0) + 1;
        } 
        else if (keputusan === 'tie') {
            localPlayerData.challengesTied = (Number(localPlayerData.challengesTied) || 0) + 1;
        }

        this.saveData();
    },

    // ----------------------------------------------------
    // 7. JEJAK ISTIMEWA (SPECIAL & HIDDEN)
    // ----------------------------------------------------
    rekodRahsiaDitemui: function() {
        if (!window.localPlayerData) return;
        localPlayerData.foundSecret = true;
        this.saveData();
    },

    rekodEventDimainkan: function() {
        if (!window.localPlayerData) return;
        localPlayerData.playedEvent = true;
        this.saveData();
    },

    rekodRank: function(rankNombor) {
        if (!window.localPlayerData) return;
        localPlayerData.rank = rankNombor;
        this.saveData();
    }
};