// ==========================================
// TETAPAN UTAMA & PEMBOLEH UBAH GLOBAL
// ==========================================

// URL GOOGLE APPS SCRIPT ANDA
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwG1uiPv8Z0LCpHxmmcs5H3ZT_aPh0uOTfTCqmb5lyGF4C224BXObkeGJgq8pnj8W6C/exec";

let currentTimer;
let timeLeft;
let studentInfo = { name: '', class: '' };
let currentGameType = ''; 
let studentDatabase = [];
let localPlayerData = {
    coins: 0,
    inventory: [],
    avatars: {},
    activeAvatar: null,
    passcode: "",
    achievements: [],
    activeTitle: "Novice",
    totalScore: 0, 
    claimedLevels: [],
    lastPlayed: [],
    games: {}
};

// Pemboleh ubah Memori Cabaran (Sistem Lama)
let isChallengeMode = false;
let activeChallengeCode = null;
let targetScoreToBeat = 0;
let activeChallengerName = "";

// ==========================================
// PEMBOLEH UBAH PVP (MASA NYATA / REAL-TIME)
// ==========================================
let currentPvPChallengeId = null;
let isPlayer1 = false; 
let currentPvPAnswer = "";
let pvpTimerInterval = null;

// ==========================================
// DYNAMIC LIMITED TIME EVENT CALENDAR
// ==========================================
const EVENT_CALENDAR = [
    { name: "Back to School Kickoff! (2x Coins) - Ends on 14 Jan 2026", startDate: "2026-01-10T00:00:00", endDate: "2026-01-14T23:59:59", multiplier: 2 },
    { name: "Lunar Prosperity Week (2x Coins) - Ends on 17 Feb 2026", startDate: "2026-02-15T00:00:00", endDate: "2026-02-17T23:59:59", multiplier: 2 },
    { name: "Spring Break Flash Sale (Avatar Discounts!) - Ends on 1 Mar 2026", startDate: "2026-03-01T00:00:00", endDate: "2026-03-01T23:59:59", multiplier: 1 },
    { name: "Festive Avatar Rush (2x Coins) - Ends on 3 Apr 2026", startDate: "2026-04-02T00:00:00", endDate: "2026-04-03T23:59:59", multiplier: 2 },
    { name: "Teacher's Boss Challenge (2x Coins) - Ends on 31 May 2026", startDate: "2026-05-31T00:00:00", endDate: "2026-05-31T23:59:59", multiplier: 2 },
    { name: "Mid-Year Marathon (3x Coins) - Ends on 25 Jun 2026", startDate: "2026-06-25T00:00:00", endDate: "2026-06-25T23:59:59", multiplier: 3 },
    { name: "No-Risk Challenge Month (2x Coins) - Ends on 2 Jul 2026", startDate: "2026-07-01T00:00:00", endDate: "2026-07-02T23:59:59", multiplier: 2 },
    { name: "Merdeka Spirit Special (2x Coins) - Ends on 31 Aug 2026", startDate: "2026-08-30T00:00:00", endDate: "2026-08-31T23:59:59", multiplier: 2 },
    { name: "Super Scholar Discount Month - Ends on 30 Sep 2026", startDate: "2026-09-01T00:00:00", endDate: "2026-09-30T23:59:59", multiplier: 1 },
    { name: "Spooky Spelling Week (2x Coins) - Ends on 16 Oct 2026", startDate: "2026-10-15T00:00:00", endDate: "2026-10-16T23:59:59", multiplier: 2 },
    { name: "Final Exam Push! (3x Coins) - Ends on 1 Nov 2026", startDate: "2026-11-01T00:00:00", endDate: "2026-11-01T23:59:59", multiplier: 3 },
    { name: "Year-End Grand Festival (2x Coins) - Ends on 31 Dec 2026", startDate: "2026-12-01T00:00:00", endDate: "2026-12-31T23:59:59", multiplier: 2 }
];

function getCurrentEvent() {
    const now = new Date(); 
    return EVENT_CALENDAR.find(event => {
        const start = new Date(event.startDate);
        const end = new Date(event.endDate);
        return now >= start && now <= end; 
    });
}

// ==========================================
// BUKU REKOD PENCAPAIAN & MEDAL SHOP
// ==========================================
const achievementsData = [
    // --- TIER COMMON (Price: 500) ---
    { id: "ach_01", name: "The Alphabet Apprentice", description: "Collect a total score of 100.", coinReward: 100, price: 500, tier: "common", image: "assets/badges/alphabetApprentice.png", reqType: "total_score", reqValue: 100 },
    { id: "ach_06", name: "Brave Speaker", description: "Send your first challenge.", coinReward: 100, price: 500, tier: "common", image: "assets/badges/braveSpeaker.png", reqType: "send_challenge", reqValue: 1 },
    { id: "ach_10", name: "Knowledge Seeker", description: "Accumulate 1000 coins.", coinReward: 100, price: 500, tier: "common", image: "assets/badges/knowledgeSeeker.png", reqType: "total_coins", reqValue: 1000 },
    { id: "ach_13", name: "Style Articulator", description: "Unlock your first avatar.", coinReward: 100, price: 500, tier: "common", image: "assets/badges/styleArticulator.png", reqType: "unlock_avatar", reqValue: 1 },
    { id: "ach_17", name: "Active Participant", description: "Play during a special active event.", coinReward: 100, price: 500, tier: "common", image: "assets/badges/activeParticipant.png", reqType: "special_event", reqValue: 1 },
    { id: "ach_18", name: "Midnight Reader", description: "Play the game after 10 PM.", coinReward: 100, price: 500, tier: "common", image: "assets/badges/midnightReader.png", reqType: "play_time_late", reqValue: 22 },
    { id: "ach_19", name: "Morning Orator", description: "Play the game before 7 AM.", coinReward: 100, price: 500, tier: "common", image: "assets/badges/morningOrator.png", reqType: "play_time_early", reqValue: 7 },
    { id: "ach_20", name: "Weekend Writer", description: "Play the game on a weekend.", coinReward: 100, price: 500, tier: "common", image: "assets/badges/weekendWriter.png", reqType: "play_weekend", reqValue: 1 },
    { id: "ach_28", name: "Study Buddy", description: "Send 10 challenges to friends.", coinReward: 100, price: 500, tier: "common", image: "assets/badges/studyBuddy.png", reqType: "send_challenge", reqValue: 10 },
    { id: "ach_30", name: "Gracious Learner", description: "Lose 5 challenges.", coinReward: 100, price: 500, tier: "common", image: "assets/badges/graciousLearner.png", reqType: "lose_challenge", reqValue: 5 },
    { id: "ach_33", name: "Curious Browser", description: "Visit the shop 20 times.", coinReward: 100, price: 500, tier: "common", image: "assets/badges/curiousBrowser.png", reqType: "visit_shop", reqValue: 20 },
    { id: "ach_39", name: "The Freshman", description: "Log in for the first time.", coinReward: 100, price: 500, tier: "common", image: "assets/badges/freshman.png", reqType: "login_count", reqValue: 1 },

    // --- TIER RARE (Price: 1000) ---
    { id: "ach_02", name: "The Grammar Scholar", description: "Collect a total score of 1000.", coinReward: 500, price: 1000, tier: "rare", image: "assets/badges/grammarScholar.png", reqType: "total_score", reqValue: 1000 },
    { id: "ach_07", name: "Fluent Victor", description: "Win 1 challenge.", coinReward: 500, price: 1000, tier: "rare", image: "assets/badges/fluentVictor.png", reqType: "win_challenge", reqValue: 1 },
    { id: "ach_11", name: "Resource Investor", description: "Spend 5000 coins in the shop.", coinReward: 500, price: 1000, tier: "rare", image: "assets/badges/resourceInvestor.png", reqType: "spend_coins", reqValue: 5000 },
    { id: "ach_14", name: "Guardian Collector", description: "Unlock 5 different avatars.", coinReward: 500, price: 1000, tier: "rare", image: "assets/badges/guardianCollector.png", reqType: "unlock_avatar", reqValue: 5 },
    { id: "ach_21", name: "Consistent Student", description: "Achieve a 3-day login streak.", coinReward: 500, price: 1000, tier: "rare", image: "assets/badges/consistentStudent.png", reqType: "login_streak", reqValue: 3 },
    { id: "ach_29", name: "Forum Debater", description: "Complete 50 challenges.", coinReward: 500, price: 1000, tier: "rare", image: "assets/badges/forumDebater.png", reqType: "total_challenges", reqValue: 50 },
    { id: "ach_41", name: "Top Honor Roll", description: "Reach Rank 3 in the Leaderboard.", coinReward: 500, price: 1000, tier: "rare", image: "assets/badges/topHonorRoll.png", reqType: "rank", reqValue: 3 },

    // --- TIER EPIC (Price: 5000) ---
    { id: "ach_03", name: "The Vocabulary Virtuoso", description: "Collect a total score of 5000.", coinReward: 1000, price: 5000, tier: "epic", image: "assets/badges/vocabularyVirtuoso.png", reqType: "total_score", reqValue: 5000 },
    { id: "ach_09", name: "Peer Reviewer", description: "Tie in a challenge.", coinReward: 1000, price: 5000, tier: "epic", image: "assets/badges/peerReviewer.png", reqType: "tie_challenge", reqValue: 1 },
    { id: "ach_12", name: "Wealthy Wordsmith", description: "Earn a total of 20000 coins.", coinReward: 1000, price: 5000, tier: "epic", image: "assets/badges/wealthyWordsmith.png", reqType: "total_coins_earned", reqValue: 20000 },
    { id: "ach_15", name: "Syntax Sage", description: "Upgrade an avatar to Level 10.", coinReward: 1000, price: 5000, tier: "epic", image: "assets/badges/syntaxSage.png", reqType: "avatar_level", reqValue: 10 },
    { id: "ach_22", name: "Dedicated Linguist", description: "Achieve a 7-day login streak.", coinReward: 1000, price: 5000, tier: "epic", image: "assets/badges/dedicatedLinguist.png", reqType: "login_streak", reqValue: 7 },
    { id: "ach_23", name: "Language Marathoner", description: "Play 5 games in a single day.", coinReward: 1000, price: 5000, tier: "epic", image: "assets/badges/languageMarathoner.png", reqType: "daily_games", reqValue: 5 },
    { id: "ach_24", name: "Syllabus Explorer", description: "Play 12 unique games.", coinReward: 1000, price: 5000, tier: "epic", image: "assets/badges/syllabusExplorer.png", reqType: "unique_games", reqValue: 12 },
    { id: "ach_25", name: "The Polymath", description: "Score over 50 in 12 different games.", coinReward: 1000, price: 5000, tier: "epic", image: "assets/badges/polymath.png", reqType: "high_score_all", reqValue: 12 },
    { id: "ach_26", name: "Resilient Reviser", description: "Win a comeback game.", coinReward: 1000, price: 5000, tier: "epic", image: "assets/badges/resilientReviser.png", reqType: "comeback_win", reqValue: 1 },
    { id: "ach_27", name: "English Prodigy", description: "Achieve 3 perfect scores.", coinReward: 1000, price: 5000, tier: "epic", image: "assets/badges/englishProdigy.png", reqType: "perfect_scores", reqValue: 3 },
    { id: "ach_31", name: "Sharp Thinker", description: "Win a challenge by a narrow margin.", coinReward: 1000, price: 5000, tier: "epic", image: "assets/badges/sharpThinker.png", reqType: "narrow_win", reqValue: 1 },
    { id: "ach_35", name: "Dean of Guardians", description: "Upgrade 5 avatars to Level 5.", coinReward: 1000, price: 5000, tier: "epic", image: "assets/badges/deanOfGuardians.png", reqType: "multiple_avatar_level", reqValue: 5 },
    { id: "ach_38", name: "Festive Storyteller", description: "Play during the month of December.", coinReward: 1000, price: 5000, tier: "epic", image: "assets/badges/festiveStoryteller.png", reqType: "play_month", reqValue: 12 },
    { id: "ach_42", name: "Silver Laureate", description: "Reach Rank 2 in the Leaderboard.", coinReward: 1000, price: 5000, tier: "epic", image: "assets/badges/silverLaureate.png", reqType: "rank", reqValue: 2 },

    // --- TIER LEGENDARY (Price: 10000) ---
    { id: "ach_04", name: "The Literary Mastermind", description: "Collect a total score of 10000.", coinReward: 2000, price: 10000, tier: "legendary", image: "assets/badges/literaryMastermind.png", reqType: "total_score", reqValue: 10000 },
    { id: "ach_05", name: "Flawless English", description: "Get 5 perfect scores.", coinReward: 2000, price: 10000, tier: "legendary", image: "assets/badges/flawlessEnglish.png", reqType: "perfect_scores", reqValue: 5 },
    { id: "ach_08", name: "Spelling Champion", description: "Win 10 challenges.", coinReward: 2000, price: 10000, tier: "legendary", image: "assets/badges/spellingChampion.png", reqType: "win_challenge", reqValue: 10 },
    { id: "ach_16", name: "Guardian Master", description: "Unlock 10 avatars.", coinReward: 2000, price: 10000, tier: "legendary", image: "assets/badges/guardianMaster.png", reqType: "unlock_avatar", reqValue: 10 },
    { id: "ach_32", name: "Academic Comeback", description: "Win a revenge challenge.", coinReward: 2000, price: 10000, tier: "legendary", image: "assets/badges/academicComeback.png", reqType: "revenge_win", reqValue: 1 },
    { id: "ach_34", name: "Archive Master", description: "Collect all standard avatars.", coinReward: 2000, price: 10000, tier: "legendary", image: "assets/badges/archiveMaster.png", reqType: "all_avatars", reqValue: 1 },
    { id: "ach_36", name: "Special Edition Scholar", description: "Unlock a rare avatar skin.", coinReward: 2000, price: 10000, tier: "legendary", image: "assets/badges/specialEditionScholar.png", reqType: "rare_skin", reqValue: 1 },
    { id: "ach_37", name: "Patriotic Poet", description: "Log in and play on 31st August.", coinReward: 2000, price: 10000, tier: "legendary", image: "assets/badges/patrioticPoet.png", reqType: "merdeka_day", reqValue: 1 },
    { id: "ach_40", name: "Context Detective", description: "Find a hidden secret.", coinReward: 2000, price: 10000, tier: "legendary", image: "assets/badges/contextDetective.png", reqType: "hidden_secret", reqValue: 1 },
    { id: "ach_43", name: "Supreme Valedictorian", description: "Reach Rank 1 in the Leaderboard.", coinReward: 2000, price: 10000, tier: "legendary", image: "assets/badges/supremeValedictorian.png", reqType: "rank", reqValue: 1 }
];
