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
let localPlayerData = { coins: 0, inventory: [], avatars: {}, activeAvatar: null };

// Pemboleh ubah Memori Cabaran
let isChallengeMode = false;
let activeChallengeCode = null;
let targetScoreToBeat = 0;
let activeChallengerName = "";

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
// BUKU REKOD PENCAPAIAN
// ==========================================
const achievementsData = [
    { id: "ach_01", name: "The Alphabet Apprentice", description: "Collect a total score of 100.", coinReward: 20, tier: "common" },
    { id: "ach_02", name: "The Grammar Scholar", description: "Collect a total score of 1000.", coinReward: 20, tier: "rare" },
    { id: "ach_03", name: "The Vocabulary Virtuoso", description: "Collect a total score of 5000.", coinReward: 20, tier: "epic" },
    { id: "ach_04", name: "The Literary Mastermind", description: "Collect a total score of 10000.", coinReward: 20 , tier: "legendary" },
    { id: "ach_05", name: "Flawless English", description: "Get 5 perfect scores.", coinReward: 20, tier: "legendary" },
    { id: "ach_06", name: "Brave Speaker", description: "Send your first challenge.", coinReward: 20, tier: "common" },
    { id: "ach_07", name: "Fluent Victor", description: "Win 1 challenge.", coinReward: 20, tier: "rare" },
    { id: "ach_08", name: "Spelling Champion", description: "Win 10 challenges.", coinReward: 20, tier: "legendary" },
    { id: "ach_09", name: "Peer Reviewer", description: "Tie in a challenge.", coinReward: 20, tier: "epic" },
    { id: "ach_10", name: "Knowledge Seeker", description: "Accumulate 1000 coins.", coinReward: 20, tier: "common" },
    { id: "ach_11", name: "Resource Investor", description: "Spend 5000 coins in the shop.", coinReward: 20, tier: "rare" },
    { id: "ach_12", name: "Wealthy Wordsmith", description: "Earn a total of 20000 coins.", coinReward: 20, tier: "epic" },
    { id: "ach_13", name: "Style Articulator", description: "Unlock your first avatar.", coinReward: 20, tier: "common" },
    { id: "ach_14", name: "Guardian Collector", description: "Unlock 5 different avatars.", coinReward: 20, tier: "rare" },
    { id: "ach_15", name: "Syntax Sage", description: "Upgrade an avatar to Level 10.", coinReward: 20, tier: "epic" },
    { id: "ach_16", name: "Guardian Master", description: "Unlock 10 avatars.", coinReward: 20, tier: "legendary" },
    { id: "ach_17", name: "Active Participant", description: "Play during a special active event.", coinReward: 20, tier: "common" },
    { id: "ach_18", name: "Midnight Reader", description: "Play the game after 10 PM.", coinReward: 20, tier: "common" },
    { id: "ach_19", name: "Morning Orator", description: "Play the game before 7 AM.", coinReward: 20, tier: "common" },
    { id: "ach_20", name: "Weekend Writer", description: "Play the game on a weekend.", coinReward: 20, tier: "common" },
    { id: "ach_21", name: "Consistent Student", description: "Achieve a 3-day login streak.", coinReward: 20, tier: "rare" },
    { id: "ach_22", name: "Dedicated Linguist", description: "Achieve a 7-day login streak.", coinReward: 20, tier: "epic" },
    { id: "ach_23", name: "Language Marathoner", description: "Play 5 games in a single day.", coinReward: 20, tier: "epic" },
    { id: "ach_24", name: "Syllabus Explorer", description: "Play 12 unique games.", coinReward: 20, tier: "epic" },
    { id: "ach_25", name: "The Polymath", description: "Score over 50 in 12 different games.", coinReward: 20, tier: "epic" },
    { id: "ach_26", name: "Resilient Reviser", description: "Win a comeback game.", coinReward: 20, tier: "epic" },
    { id: "ach_27", name: "English Prodigy", description: "Achieve 3 perfect scores.", coinReward: 20, tier: "epic" },
    { id: "ach_28", name: "Study Buddy", description: "Send 10 challenges to friends.", coinReward: 20, tier: "common" },
    { id: "ach_29", name: "Forum Debater", description: "Complete 50 challenges.", coinReward: 20, tier: "rare" },
    { id: "ach_30", name: "Gracious Learner", description: "Lose 5 challenges.", coinReward: 20, tier: "common" },
    { id: "ach_31", name: "Sharp Thinker", description: "Win a challenge by a very narrow margin.", coinReward: 20, tier: "epic" },
    { id: "ach_32", name: "Academic Comeback", description: "Win a revenge challenge.", coinReward: 20, tier: "legendary" },
    { id: "ach_33", name: "Curious Browser", description: "Visit the shop 20 times.", coinReward: 20, tier: "common" },
    { id: "ach_34", name: "Archive Master", description: "Collect all standard avatars.", coinReward: 20, tier: "legendary" },
    { id: "ach_35", name: "Dean of Guardians", description: "Upgrade 5 avatars to Level 5.", coinReward: 20, tier: "epic" },
    { id: "ach_36", name: "Special Edition Scholar", description: "Unlock a rare avatar skin.", coinReward: 20, tier: "legendary" },
    { id: "ach_37", name: "Patriotic Poet", description: "Log in and play on 31st August.", coinReward: 20, tier: "legendary" },
    { id: "ach_38", name: "Festive Storyteller", description: "Play during the month of December.", coinReward: 20, tier: "epic" },
    { id: "ach_39", name: "The Freshman", description: "Log in to the Game Hub for the first time.", coinReward: 20, tier: "common" },
    { id: "ach_40", name: "Context Detective", description: "Find a hidden secret in the game hub.", coinReward: 20, tier: "legendary" },
    { id: "ach_41", name: "Top Honor Roll", description: "Reach Rank 3 in the Leaderboard.", coinReward: 50, tier: "rare" },
    { id: "ach_42", name: "Silver Laureate", description: "Reach Rank 2 in the Leaderboard.", coinReward: 100, tier: "epic" },
    { id: "ach_43", name: "Supreme Valedictorian", description: "Reach Rank 1 in the Leaderboard.", coinReward: 200, tier: "legendary" }
];