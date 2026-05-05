// ==========================================
// PENGURUSAN AUDIO & MUZIK LATAR
// ==========================================

// 1. Tetapkan sumber fail audio
const bgMusic = new Audio('assets/audio/audio.mp3');
bgMusic.loop = true;   // Mainkan berulang-ulang
bgMusic.volume = 0.3;  // Tetapkan kelantangan (30% cukup untuk latar)

// 2. Semak memori jika murid pernah 'Mute' sebelum ini
let isMusicMuted = localStorage.getItem('bgMusicMuted') === 'true';

function initAudio() {
    updateMusicIcon();
    
    // Taktik Autoplay Pelayar: Tunggu murid klik di mana-mana pada skrin
    // untuk kali pertama, baru muzik mula dimainkan (jika tidak di-mute).
    document.body.addEventListener('click', function startAudio() {
        if (!isMusicMuted) {
            playBgMusic();
        }
        document.body.removeEventListener('click', startAudio); // Buang pendengar selepas klik pertama
    }, { once: true });
}

// Fungsi untuk MULA muzik
function playBgMusic() {
    if (!isMusicMuted) {
        bgMusic.play().catch(e => console.log("Menunggu interaksi pengguna untuk mainkan muzik."));
    }
}

// Fungsi untuk HENTI muzik
function pauseBgMusic() {
    bgMusic.pause();
}

// Fungsi untuk TUKAR (Mute / Unmute) bila butang ditekan
function toggleMusic() {
    isMusicMuted = !isMusicMuted;
    localStorage.setItem('bgMusicMuted', isMusicMuted); // Simpan pilihan ke memori
    
    if (isMusicMuted) {
        pauseBgMusic();
    } else {
        playBgMusic();
    }
    updateMusicIcon();
}

// Fungsi sokongan untuk tukar rupa ikon butang
function updateMusicIcon() {
    const icon = document.getElementById('music-btn-icon');
    if (icon) {
        if (isMusicMuted) {
            icon.classList.remove('fa-volume-up');
            icon.classList.add('fa-volume-mute', 'text-red-400');
            icon.classList.remove('text-green-400');
        } else {
            icon.classList.remove('fa-volume-mute', 'text-red-400');
            icon.classList.add('fa-volume-up', 'text-green-400');
        }
    }
}

// Mulakan sistem bila skrin sedia
window.addEventListener('DOMContentLoaded', initAudio);