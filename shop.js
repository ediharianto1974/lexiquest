// ==========================================
// FUNGSI EDU SHOP: CHECKOUT (FIREBASE VERSION)
// ==========================================
async function submitEduCheckout() {
    const btn = document.getElementById('eduConfirmBtn');
    const itemID = document.getElementById('eduItemID').value;
    const itemName = document.getElementById('eduItemName').value;
    const qty = parseInt(document.getElementById('eduQuantity').value);
    const price = parseInt(document.getElementById('eduBasePrice').value);
    const totalCost = qty * price;
    
    let playerName = document.getElementById('eduStudentName').value.trim().toUpperCase();
    let playerClass = (typeof localPlayerData !== 'undefined' && localPlayerData.class) ? localPlayerData.class : "-";
    let playerSchool = (typeof localPlayerData !== 'undefined' && localPlayerData.school) ? localPlayerData.school : "SK_DEFAULT";
    
    // Hasilkan ID Dokumen Pemain (Sama seperti auth.js)
    let playerDocId = `${playerSchool}_${playerClass}_${playerName}`.replace(/\s+/g, '_');

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menghantar Pesanan...';
    btn.classList.add('opacity-50', 'cursor-not-allowed');

    try {
        // 1. Rekod pesanan ke dalam koleksi 'eduOrders'
        await db.collection("eduOrders").add({
            orderID: "ORD-" + Date.now(),
            studentName: playerName,
            studentClass: playerClass,
            playerDocId: playerDocId,
            itemID: itemID,
            itemName: itemName,
            quantity: qty,
            totalCost: totalCost,
            status: "pending",
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 2. Tolak stok dari koleksi 'eduItems' supaya murid lain tak boleh beli stok yang dah habis
        await db.collection("eduItems").doc(itemID).update({
            stock: firebase.firestore.FieldValue.increment(-qty)
        });

        closeEduCheckout();
        
        alert("✅ PESANAN DIHANTAR KE CIKGU!\n\nKoin anda belum ditolak. Koin hanya akan ditolak selepas Game Master menyerahkan barang kepada anda.");
        
        // Refresh kedai untuk paparkan stok terkini
        syncEduStock(); 
        
    } catch (error) {
        console.error("Checkout Error:", error);
        showEduWarning("Ralat rangkaian. Gagal hantar ke Firebase.");
        resetConfirmBtn();
    }
}

function resetConfirmBtn() {
    const btn = document.getElementById('eduConfirmBtn');
    if (btn) {
        btn.innerHTML = '<i class="fas fa-check"></i> Sahkan';
        btn.disabled = false;
        btn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

// ==========================================
// FUNGSI LIVE STOCK SYNC DARI FIREBASE
// ==========================================
async function syncEduStock() {
    const eduContainer = document.getElementById('edu-container') || document.querySelector('.edu-items-container');
    if (eduContainer) {
        eduContainer.innerHTML = '<div class="col-span-full text-center text-indigo-500 py-4"><i class="fas fa-spinner fa-spin text-2xl mb-2"></i><br>Menyemak stok terkini di stor cikgu...</div>';
    }

    try {
        // Tarik data stok dari Firestore
        const snapshot = await db.collection("eduItems").get();
        const realTimeInventory = [];
        snapshot.forEach(doc => realTimeInventory.push(doc.data()));

        if (realTimeInventory.length > 0) {
            realTimeInventory.forEach(dbItem => {
                let localItem = shopItems.find(item => item.id === dbItem.id);
                if (localItem) {
                    localItem.stock = dbItem.stock;   
                    localItem.price = dbItem.price;   
                }
            });
            
            if (typeof renderShop === 'function') renderShop();
        }
    } catch (error) {
        console.error("Gagal menyemak stok Firestore:", error);
    }
}

// ==========================================
// ADMIN FIREBASE CONTROL LOGIC
// ==========================================

let adminInventoryData = []; // PEMBOLEHUBAH INI WAJIB ADA

// 3. Muat Turun Senarai Pesanan (Orders) dari Firestore
async function loadAdminOrders() {
    const container = document.getElementById('admin-content');
    if (!container) return; // Pengawal keselamatan

    container.innerHTML = `<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-3xl text-indigo-600"></i><p class="mt-2 text-gray-500">Menyemak pesanan Firestore...</p></div>`;

    try {
        const snapshot = await db.collection("eduOrders").orderBy("timestamp", "desc").get();
        
        if (snapshot.empty) {
            container.innerHTML = "<p class='text-center py-10 text-gray-400'>Tiada pesanan ditemui.</p>";
            return;
        }

        let html = `<div class="grid gap-4">`;
        snapshot.forEach(doc => {
            const ord = doc.data();
            const docId = doc.id; 
            const isPending = ord.status.toLowerCase() === 'pending';
            const orderDate = ord.timestamp ? ord.timestamp.toDate().toLocaleString() : 'Baru sahaja';

            html += `
                <div class="bg-white p-4 rounded-2xl border ${isPending ? 'border-yellow-300 bg-yellow-50/30' : 'border-gray-200'} shadow-sm flex flex-wrap justify-between items-center">
                    <div>
                        <div class="text-[10px] font-bold text-gray-400 uppercase">${ord.orderID} • ${orderDate}</div>
                        <div class="font-bold text-lg text-indigo-900">${ord.studentName} <span class="text-sm font-normal text-gray-500">(${ord.studentClass})</span></div>
                        <div class="text-sm font-semibold text-gray-700">Membeli: <span class="text-indigo-600">${ord.itemName} (x${ord.quantity})</span></div>
                        <div class="mt-1 text-xs font-bold text-yellow-700"><i class="fas fa-coins mr-1"></i>${ord.totalCost} Koin</div>
                    </div>
                    <div class="flex items-center gap-2">
                        ${isPending ? 
                            `<button onclick="approveOrder('${docId}', '${ord.playerDocId}', ${ord.totalCost})" class="bg-green-500 hover:bg-green-600 text-white px-5 py-2 rounded-xl font-bold text-sm shadow-md transition-all">SAHKAN PENYERAHAN</button>` : 
                            `<span class="bg-green-100 text-green-700 px-4 py-2 rounded-xl font-bold text-sm"><i class="fas fa-check-circle mr-1"></i> SELESAI</span>`
                        }
                    </div>
                </div>`;
        });
        container.innerHTML = html + "</div>";
    } catch (e) {
        console.error("Order Load Error:", e);
        container.innerHTML = "<p class='text-center text-red-500'>Gagal memuatkan data pesanan.</p>";
    }
}

// 4. Sahkan Pesanan (Selesaikan & Tolak Koin Murid)
async function approveOrder(orderDocId, playerDocId, costToDeduct) {
    if(!confirm("Anda pasti ingin mengesahkan penyerahan? Koin pelajar akan ditolak sekarang.")) return;
    
    try {
        await db.collection("eduOrders").doc(orderDocId).update({ status: "completed" });
        if (playerDocId && costToDeduct > 0) {
            await db.collection("players").doc(playerDocId).update({
                coins: firebase.firestore.FieldValue.increment(-costToDeduct)
            });
        }
        alert("Pesanan berjaya diselesaikan dan koin ditolak!");
        loadAdminOrders();
    } catch (e) {
        console.error("Approve Error:", e);
        alert("Gagal mengemaskini status pesanan.");
    }
}

// 5. Muat Turun Inventori (Stok) dari Firestore
async function loadAdminInventory() {
    const container = document.getElementById('admin-content');
    if (!container) return; // Pengawal keselamatan

    container.innerHTML = `<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-3xl text-indigo-600"></i><p>Memuatkan stok Firestore...</p></div>`;

    try {
        const snapshot = await db.collection("eduItems").get();
        adminInventoryData = [];
        snapshot.forEach(doc => adminInventoryData.push(doc.data()));

        let html = `
            <div class="mb-6 flex justify-between items-center bg-indigo-50 p-4 rounded-2xl">
                <h3 class="font-bold text-indigo-800">Senarai Stok EduShop</h3>
                <button onclick="openAddItemForm()" class="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-xs"><i class="fas fa-plus mr-1"></i> TAMBAH BARANG</button>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left bg-white rounded-xl overflow-hidden shadow-sm">
                    <thead class="bg-gray-100 text-[10px] uppercase text-gray-500">
                        <tr>
                            <th class="p-3">Item</th><th class="p-3">Harga</th><th class="p-3">Stok</th><th class="p-3">Had</th><th class="p-3">Tindakan</th>
                        </tr>
                    </thead>
                    <tbody class="text-sm">`;

        if(adminInventoryData.length === 0){
             html += `<tr><td colspan="5" class="p-4 text-center text-gray-500">Tiada barang. Sila tambah barang baru.</td></tr>`;
        } else {
            adminInventoryData.forEach(item => {
                html += `
                    <tr class="border-b">
                        <td class="p-3">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 bg-gray-100 rounded flex items-center justify-center"><i class="${item.icon || 'fas fa-box'}"></i></div>
                                <div>
                                    <div class="font-bold">${item.name}</div>
                                    <div class="text-[10px] text-gray-400">${item.id}</div>
                                </div>
                            </div>
                        </td>
                        <td class="p-3 font-bold text-yellow-600">${item.price}</td>
                        <td class="p-3 font-bold ${item.stock <= 5 ? 'text-red-500' : 'text-green-600'}">${item.stock}</td>
                        <td class="p-3 uppercase text-[10px] font-bold">${item.limitType || '-'}</td>
                        <td class="p-3">
                             <button onclick="editItem('${item.id}')" class="text-blue-500 hover:underline mr-2 text-xs">Edit</button>
                        </td>
                    </tr>`;
            });
        }
        container.innerHTML = html + "</tbody></table></div>";
    } catch (e) {
        container.innerHTML = "<p class='text-center text-red-500'>Gagal memuatkan stok dari Firestore.</p>";
    }
}

// 6. FUNGSI KAWALAN MODAL (TERTINGGAL SEBELUM INI)
function openAddItemForm() {
    const modal = document.getElementById('admin-item-modal');
    if(modal) modal.classList.remove('hidden');
    document.getElementById('admin-item-action').value = 'add';
    document.getElementById('admin-item-id').value = '';
    document.getElementById('admin-item-name').value = '';
    document.getElementById('admin-item-price').value = '';
    document.getElementById('admin-item-stock').value = '';
    document.getElementById('admin-item-desc').value = '';
}

function closeItemForm() {
    const modal = document.getElementById('admin-item-modal');
    if(modal) modal.classList.add('hidden');
}

function editItem(id) {
    const item = adminInventoryData.find(i => i.id === id);
    if (!item) return;
    const modal = document.getElementById('admin-item-modal');
    if(modal) modal.classList.remove('hidden');
    document.getElementById('admin-item-action').value = 'edit';
    document.getElementById('admin-item-id').value = item.id;
    document.getElementById('admin-item-name').value = item.name;
    document.getElementById('admin-item-price').value = item.price;
    document.getElementById('admin-item-stock').value = item.stock;
    document.getElementById('admin-item-limit').value = item.limitType || 'none';
    document.getElementById('admin-item-category').value = item.category || '';
    document.getElementById('admin-item-icon').value = item.icon || '';
    document.getElementById('admin-item-desc').value = item.desc || '';
}

// 7. Hantar Data Item ke Firestore (Tambah/Kemaskini)
async function submitItemForm() {
    const btn = document.getElementById('admin-save-item-btn');
    const itemId = document.getElementById('admin-item-id').value.trim().toUpperCase();
    
    const itemData = {
        id: itemId,
        name: document.getElementById('admin-item-name').value.trim(),
        price: parseInt(document.getElementById('admin-item-price').value) || 0,
        stock: parseInt(document.getElementById('admin-item-stock').value) || 0,
        limitType: document.getElementById('admin-item-limit').value,
        category: document.getElementById('admin-item-category').value,
        icon: document.getElementById('admin-item-icon').value.trim(),
        desc: document.getElementById('admin-item-desc').value.trim()
    };

    if (!itemId || !itemData.name) {
        alert("Sila isikan ID Item dan Nama Item!");
        return;
    }

    const originalBtnHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';

    try {
        await db.collection("eduItems").doc(itemId).set(itemData, { merge: true });
        alert(`Berjaya! Item ${itemId} telah dikemaskini dalam pangkalan data.`);
        closeItemForm();
        loadAdminInventory(); 
    } catch (e) {
        console.error("Save Item Error:", e);
        alert("Ralat. Gagal menyimpan ke Firestore.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalBtnHTML;
    }
}

// ==========================================
// FUNGSI NAVIGASI TAB KEDAI MURID
// ==========================================
/**
 * Fungsi untuk menukar tab di dalam Kedai (Shop)
 * @param {string} tabName - Nama tab (contoh: 'edu', 'avatar', 'badge')
 */
function switchShopTab(tabName) {
    // ==========================================
    // 🎥 CCTV TRACKER: REKOD BUKA KEDAI
    // ==========================================
    if (window.Trackers) Trackers.rekodBukaKedai();

    // 1. SEMBUNYIKAN semua bahagian kandungan kedai
    document.querySelectorAll('.shop-section').forEach(el => {
        el.classList.add('hidden');
    });
    
    // 2. RESET gaya butang (kembalikan ke warna asal/tidak aktif)
    document.querySelectorAll('.shop-tab-btn').forEach(btn => {
        btn.classList.remove('bg-indigo-600', 'text-white', 'shadow-sm');
        btn.classList.add('bg-gray-200', 'text-gray-500');
    });

    // 3. TUNJUKKAN bahagian kandungan yang dipilih sahaja
    const activeSection = document.getElementById(`shop-content-${tabName}`);
    if (activeSection) {
        activeSection.classList.remove('hidden');
    }

    // 4. AKTIFKAN gaya visual pada butang yang diklik
    const activeBtn = document.getElementById(`tab-btn-${tabName}`);
    if (activeBtn) {
        activeBtn.classList.remove('bg-gray-200', 'text-gray-500');
        activeBtn.classList.add('bg-indigo-600', 'text-white', 'shadow-sm');
    }

    // 5. MUAT DATA secara dinamik mengikut tab yang dipilih
    // Ini penting supaya item hanya muncul apabila tab diklik
    if (tabName === 'edu') {
        if (typeof loadShopInventory === 'function') {
            loadShopInventory(); 
        }
    } 
    else if (tabName === 'avatar') {
        if (typeof loadAvatarShop === 'function') {
            loadAvatarShop(); // Memastikan item avatar cikgu muncul
        } else {
            console.error("Fungsi loadAvatarShop tidak dijumpai dalam shop.js");
        }
    } 
    else if (tabName === 'badge') {
        if (typeof loadMedalShop === 'function') {
            loadMedalShop(); // <-- Pastikan ini loadMedalShop
        }
    }
    
    // Simpan pilihan terakhir murid (Opsional - supaya bila refresh dia tetap di tab sama)
    localStorage.setItem('lastShopTab', tabName);
}

// ==========================================
// FUNGSI PAPARAN KEDAI UNTUK MURID
// ==========================================
async function loadShopInventory() {
    const container = document.getElementById('edu-shop-items');
    if (!container) return;

    // Paparan sedang loading
    container.innerHTML = `<div class="text-center col-span-full py-10 text-gray-500">
        <i class="fas fa-spinner fa-spin text-3xl mb-2 text-indigo-600"></i>
        <p>Menyemak stok kedai dari Firebase...</p>
    </div>`;

    try {
        // Ambil data dari koleksi eduItems di Firestore
        const snapshot = await db.collection("eduItems").get();
        
        // JIKA KEDAI KOSONG (Admin belum letak barang)
        if (snapshot.empty) {
            container.innerHTML = `<div class="text-center col-span-full py-10 text-gray-400">
                <i class="fas fa-box-open text-5xl mb-3 text-gray-300"></i>
                <h3 class="font-bold text-lg">Kedai Masih Kosong</h3>
                <p>Cikgu belum meletakkan sebarang barang untuk dibeli.</p>
            </div>`;
            return;
        }

        // JIKA ADA BARANG
        let html = "";
        snapshot.forEach(doc => {
            const item = doc.data();
            const isOutOfStock = item.stock <= 0;
            
            // Bina "Kad Item" untuk setiap barang
            html += `
            <div class="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col items-center text-center relative overflow-hidden hover:shadow-md transition-all">
                ${isOutOfStock ? `<div class="absolute top-3 right-[-25px] bg-red-500 text-white text-[10px] font-black px-8 py-1.5 rotate-45 shadow-sm">HABIS</div>` : ''}
                
                <div class="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center text-3xl mb-3 shadow-inner">
                    <i class="${item.icon || 'fas fa-gift'}"></i>
                </div>
                <h4 class="font-bold text-gray-800 text-sm mb-1">${item.name}</h4>
                <p class="text-[10px] text-gray-400 mb-4 h-8 overflow-hidden">${item.desc || ''}</p>
                
                <div class="w-full flex justify-between items-center mt-auto pt-3 border-t border-gray-50">
                    <div class="font-black text-yellow-600 flex items-center gap-1 text-sm">
                        <i class="fas fa-coins"></i> ${item.price}
                    </div>
                    <span class="text-[10px] font-bold px-2 py-1 rounded-md ${isOutOfStock ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}">
                        Stok: ${item.stock}
                    </span>
                </div>

                <button 
                    onclick="openEduCheckout('${item.id}', '${item.name}', ${item.price})" 
                    class="mt-4 w-full py-2.5 rounded-xl font-bold text-xs transition-all ${isOutOfStock ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'}"
                    ${isOutOfStock ? 'disabled' : ''}>
                    ${isOutOfStock ? 'STOK KOSONG' : 'BELI SEKARANG'}
                </button>
            </div>
            `;
        });
        
        // Masukkan semua kad item ke dalam HTML
        container.innerHTML = html;

    } catch (e) {
        console.error("Ralat Muat Turun Kedai Murid:", e);
        container.innerHTML = `<div class="text-center col-span-full py-10 text-red-500">
            <i class="fas fa-exclamation-triangle text-3xl mb-2"></i>
            <p>Gagal memuatkan kedai. Sila semak fail pangkalan data.</p>
        </div>`;
    }
}

// ==========================================
// FUNGSI PAPARAN AVATAR (MENYOKONG GAMBAR & IKON)
// ==========================================

function loadAvatarShop() {
    const container = document.getElementById('avatar-shop-items');
    if (!container) return;

    // Ambil level dan nama pemain dengan selamat
    const playerLevel = localPlayerData.level || 1;
    const playerName = localPlayerData.name || "";
    
    // Pastikan memori wujud (untuk semak dah beli atau belum)
    if (!localPlayerData.avatars) localPlayerData.avatars = {};
    if (!localPlayerData.inventory) localPlayerData.inventory = [];

    let html = "";
    
    for (const key in avatars) {
        const category = avatars[key];
        
        category.levels.forEach(item => {
            // ==========================================
            // ⭐ LOGIK ITEM RAHSIA (GAME MASTER ONLY)
            // ==========================================
            // Jika item ditanda 'isSecret' tapi nama pemain bukan GAME MASTER, kita skip/abaikan.
            if (item.isSecret && playerName.trim().toUpperCase() !== "GAME MASTER") {
                return; 
            }

            const isLocked = playerLevel < item.level;
            
            // SEMAK: Adakah avatar ini sudah dibeli?
            const itemKey = `${key}_lvl${item.level}`;
            const isOwned = localPlayerData.inventory.includes(itemKey);
            
            // AMBIL DATA DENGAN SELAMAT
            const safeImg = item.img ? item.img : '';
            const safeIcon = item.icon ? item.icon : '';

            // PAPARAN VISUAL
            const visual = item.img 
                ? `<img src="assets/avatars/${item.img}" class="w-16 h-16 object-contain mb-3 ${isLocked ? 'grayscale opacity-50' : ''}">`
                : `<div class="w-16 h-16 ${isLocked ? 'bg-gray-200 text-gray-400' : 'bg-blue-50 text-blue-600'} rounded-full flex items-center justify-center text-3xl mb-3 border-2 border-dashed shadow-inner">
                    <i class="${isLocked ? 'fas fa-lock' : item.icon}"></i>
                   </div>`;

            // TUKAR RUPA BUTANG (Locked -> Equip -> Beli)
            let buttonHtml = "";
            
            if (isLocked) {
                buttonHtml = `<button class="mt-4 w-full py-2 bg-gray-300 text-gray-600 rounded-xl font-bold text-[10px] cursor-not-allowed" disabled>
                    <i class="fas fa-lock mr-1"></i> LVL ${item.level} REQUIRED
                   </button>`;
            } else if (isOwned) {
                buttonHtml = `<button onclick="equipAvatar('${safeImg}', '${safeIcon}', '${item.name}')" 
                    class="mt-4 w-full py-2 bg-green-500 text-white rounded-xl font-bold text-[10px] hover:bg-green-600 shadow-sm transition-all border-2 border-green-600">
                    <i class="fas fa-user-check mr-1"></i> PAKAI AVATAR
                   </button>`;
            } else {
                buttonHtml = `<button onclick="buyAvatar('${key}', ${item.level}, ${item.price}, '${item.name}')" 
                    class="mt-4 w-full py-2 bg-indigo-600 text-white rounded-xl font-bold text-[10px] hover:bg-indigo-700 shadow-sm transition-all">
                    BELI GUARDIAN
                   </button>`;
            }

            html += `
            <div class="bg-white rounded-3xl p-5 shadow-sm border ${isLocked ? 'border-gray-200 bg-gray-50' : 'border-gray-100'} flex flex-col items-center text-center transition-all relative overflow-hidden">
                
                <div class="absolute top-0 left-0 w-full ${isLocked ? 'bg-gray-400' : (item.isSecret ? 'bg-yellow-500' : 'bg-indigo-600')} text-white text-[9px] font-bold py-1 uppercase opacity-80">
                    ${isLocked ? 'LOCKED' : (item.isSecret ? '👑 ADMIN ONLY' : category.theme)}
                </div>

                <div class="mt-4"></div>
                ${visual}
                
                <h4 class="font-bold ${isLocked ? 'text-gray-400' : 'text-gray-800'} text-sm mb-1">${item.name}</h4>
                <p class="text-[10px] text-gray-400 leading-tight mb-3 h-8 line-clamp-2">${isLocked ? 'Capai tahap yang diperlukan untuk melihat maklumat.' : item.desc}</p>
                
                <div class="font-black ${isLocked ? 'text-gray-400' : (isOwned ? 'text-green-500' : 'text-yellow-600')} flex items-center gap-1 text-sm mt-auto pt-3 border-t w-full justify-center">
                    ${isOwned ? '<i class="fas fa-check-circle"></i> DIMILIKI' : `<i class="fas fa-coins text-xs"></i> ${item.price.toLocaleString()}`}
                </div>

                ${buttonHtml}
            </div>`;
        });
    }
    
    container.innerHTML = html;
}

// ==========================================
// FUNGSI APABILA BUTANG BELI DITEKAN
// ==========================================
function buyAvatar(category, level, price, name) {
    // 1. Guna parseInt() dan panggil localPlayerData BUKAN currentUserData
    let playerLevel = (typeof localPlayerData !== 'undefined' && localPlayerData.level) ? parseInt(localPlayerData.level) : 1;
    let itemLevel = parseInt(level);

    // 2. Kuasa Veto untuk GAME MASTER / ADMIN
    if (typeof studentInfo !== 'undefined' && (studentInfo.name.includes("ADMIN") || studentInfo.name === "GAME MASTER")) {
        playerLevel = 999; // Beri level maksimum rahsia supaya Admin boleh beli semua!
    }

    // Sekatan Level (Kini membandingkan nombor dengan tepat)
    if (playerLevel < itemLevel) {
        Swal.fire({
            title: 'Tahap Tidak Mencukupi!',
            text: `Anda perlu mencapai Level ${itemLevel} untuk membeli Guardian ini. Teruskan belajar!`,
            icon: 'error',
            confirmButtonColor: '#ef4444'
        });
        return;
    }

    Swal.fire({
        title: 'Sahkan Pembelian?',
        text: `Beli ${name} dengan harga ${price} koin?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Ya, Beli!',
        confirmButtonColor: '#4f46e5'
    }).then((result) => {
        if (result.isConfirmed) {
            processPurchase(category, level, price); 
            // PENTING: Pembayaran sebenar berlaku di dalam processPurchase().
            // Jadi Trackers.rekodKoinBelanja mesti diletakkan di dalam processPurchase() itu sendiri!
        }
    });
}

// ==========================================
// FUNGSI JURUWANG KEDAI (PROCESS PURCHASE)
// ==========================================
function processPurchase(category, level, price) {
    // 1. Semak sama ada koin mencukupi
    if (localPlayerData.coins < price) {
        Swal.fire({
            icon: 'error',
            title: 'Koin Tidak Mencukupi! 🪙',
            text: 'Sila main lebih banyak permainan untuk kumpul koin.',
            confirmButtonColor: '#ef4444'
        });
        return; // Hentikan proses jika tak cukup duit
    }

    // 2. Tolak duit koin dari dompet murid
    localPlayerData.coins -= price;

    // ==========================================
    // 🎥 CCTV TRACKER: REKOD KOIN DIBELANJAKAN
    // ==========================================
    if (window.Trackers) {
        Trackers.rekodKoinBelanja(price);
    }

    // 3. Masukkan item ke dalam Inventori / Avatars murid
    // Pastikan fail memori wujud supaya tidak ralat
    if (!localPlayerData.avatars) localPlayerData.avatars = {};
    if (!localPlayerData.inventory) localPlayerData.inventory = [];

    // Simpan rekod avatar yang dibeli mengikut kategori dan tahap
    localPlayerData.avatars[category] = {
        level: level,
        purchasedAt: new Date().toISOString()
    };

    // (Pilihan) Simpan juga jejak dalam bentuk senarai inventori 
    const itemKey = `${category}_lvl${level}`;
    if (!localPlayerData.inventory.includes(itemKey)) {
        localPlayerData.inventory.push(itemKey);
    }

    // ==========================================
    // 🎥 CCTV TRACKER: REKOD DATA AVATAR BARU
    // ==========================================
    if (window.Trackers) {
        Trackers.rekodDataAvatar();
    }

// 4. Kemas kini tulisan koin di skrin terus (Guna updateUI supaya semua tempat berubah)
    if (typeof updateUI === 'function') {
        updateUI(); 
    }

    // 5. Berikan notifikasi berjaya
    Swal.fire({
        icon: 'success',
        title: 'Pembelian Berjaya! 🎉',
        text: 'Item telah dimasukkan ke dalam inventori anda.',
        confirmButtonColor: '#22c55e'
    });

    // 6. Simpan data ke Cloud & LocalStorage
    localStorage.setItem('currentPlayer', JSON.stringify(localPlayerData));
    if (typeof saveCloudPlayerData === 'function') {
        saveCloudPlayerData();
    }

    // 7. ⭐ KEMASKINI BUTANG KEDAI (NAMA FUNGSI KENA BETUL)
    // Kita panggil nama fungsi yang cikgu berikan tadi: loadAvatarShop
    if (typeof loadAvatarShop === 'function') {
        loadAvatarShop();
    }
}

// ==========================================
// FUNGSI BUKA & TUTUP MODAL CHECKOUT EDU SHOP
// ==========================================

function openEduCheckout(id, name, price) {
    // 1. Masukkan data item ke dalam borang (form) tersembunyi
    const idInput = document.getElementById('eduItemID');
    const nameInput = document.getElementById('eduItemName');
    const priceInput = document.getElementById('eduBasePrice');
    
    if (idInput) idInput.value = id;
    if (nameInput) nameInput.value = name;
    if (priceInput) priceInput.value = price;

    // 2. Set kuantiti lalai kepada 1
    const qtyInput = document.getElementById('eduQuantity');
    if (qtyInput) qtyInput.value = 1;

    // 3. Auto-isi nama murid dari sistem
    const studentNameInput = document.getElementById('eduStudentName');
    if (studentNameInput && typeof studentInfo !== 'undefined') {
        studentNameInput.value = studentInfo.name;
    }

    // 4. Buka paparan Modal Checkout
    const modal = document.getElementById('edu-checkout-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex'); // Buka sebagai flexbox supaya berada di tengah
    } else {
        console.error("Ralat UI: Kotak modal 'edu-checkout-modal' tidak dijumpai dalam HTML.");
        alert("Ralat Sistem: Borang pembelian tidak wujud di skrin.");
    }
}

function closeEduCheckout() {
    // Tutup paparan Modal Checkout
    const modal = document.getElementById('edu-checkout-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    
    // Reset semula keadaan butang 'Sahkan' jika ia tersangkut masa loading
    if (typeof resetConfirmBtn === 'function') {
        resetConfirmBtn();
    }
}

function checkMedalRequirement(reqType, reqValue) {
    if (!localPlayerData) return false;

    // Ambil data asas atau set ke 0 jika tiada
    const stats = {
        level: parseInt(localPlayerData.level) || 1,
        totalScore: parseInt(localPlayerData.totalScore) || 0,
        totalGames: parseInt(localPlayerData.totalGames) || 0,
        perfectScores: parseInt(localPlayerData.perfectScores) || 0,
        coins: parseInt(localPlayerData.coins) || 0,
        totalCoinsEarned: parseInt(localPlayerData.totalCoinsEarned) || 0,
        challengesSent: parseInt(localPlayerData.challengesSent) || 0,
        challengesWon: parseInt(localPlayerData.challengesWon) || 0,
        challengesTied: parseInt(localPlayerData.challengesTied) || 0,
        challengesLost: parseInt(localPlayerData.challengesLost) || 0,
        totalChallenges: parseInt(localPlayerData.totalChallenges) || 0,
        loginStreak: parseInt(localPlayerData.loginStreak) || 0,
        loginCount: parseInt(localPlayerData.loginCount) || 0,
        spendCoins: parseInt(localPlayerData.totalSpent) || 0,
        rank: parseInt(localPlayerData.rank) || 999, // Semakin kecil semakin bagus
        uniqueGames: (localPlayerData.playedGamesList) ? localPlayerData.playedGamesList.length : 0,
        
        // 👇👇👇 INI YANG KITA UBAH 👇👇👇
        // Sekarang ia terus baca nombor dari CCTV trackers.js
        unlockedAvatars: parseInt(localPlayerData.unlockedAvatarsCount) || 0,
        
        dailyGames: parseInt(localPlayerData.dailyGamesCount) || 0
    };

    // 👇👇👇 PENGINTIP KHAS KITA LETAK DI SINI 👇👇👇
    if (reqType === 'total_score') {
        console.log(`[PENGINTIP] Syarat: ${reqValue} | Markah Murid: ${stats.totalScore} | Keputusan: ${stats.totalScore >= reqValue}`);
    }

    switch (reqType) {
        // --- Statistik Asas ---
        case 'level': return stats.level >= reqValue;
        case 'total_score': return stats.totalScore >= reqValue;
        case 'total_games': return stats.totalGames >= reqValue;
        case 'perfect_scores': return stats.perfectScores >= reqValue;
        case 'total_coins': return stats.coins >= reqValue;
        case 'total_coins_earned': return stats.totalCoinsEarned >= reqValue;
        case 'unique_games': return stats.uniqueGames >= reqValue;
        case 'spend_coins': return stats.spendCoins >= reqValue;

        // --- Cabaran (Challenges) ---
        case 'send_challenge': return stats.challengesSent >= reqValue;
        case 'win_challenge': return stats.challengesWon >= reqValue;
        case 'tie_challenge': return stats.challengesTied >= reqValue;
        case 'lose_challenge': return stats.challengesLost >= reqValue;
        case 'total_challenges': return stats.totalChallenges >= reqValue;
        case 'comeback_win': return localPlayerData.hasDoneComeback === true;
        case 'revenge_win': return localPlayerData.hasDoneRevenge === true;
        case 'narrow_win': return localPlayerData.hasDoneNarrowWin === true;

        // --- Avatar ---
        case 'unlock_avatar': return stats.unlockedAvatars >= reqValue;
        case 'avatar_level': return (localPlayerData.maxAvatarLevel || 1) >= reqValue;
        case 'multiple_avatar_level': return (localPlayerData.avatarsAtLevel5 || 0) >= reqValue;
        case 'all_avatars': return stats.unlockedAvatars >= 12; // Andaikan ada 12 avatar
        case 'rare_skin': return localPlayerData.hasRareSkin === true;

        // --- Login & Masa ---
        case 'login_streak': return stats.loginStreak >= reqValue;
        case 'login_count': return stats.loginCount >= reqValue;
        case 'daily_games': return stats.dailyGames >= reqValue;
        case 'play_time_late': return localPlayerData.hasPlayedLate === true;
        case 'play_time_early': return localPlayerData.hasPlayedEarly === true;
        case 'play_weekend': return localPlayerData.hasPlayedWeekend === true;
        case 'play_month': return new Date().getMonth() + 1 === reqValue; // Semak bulan semasa
        case 'merdeka_day': return localPlayerData.hasPlayedMerdeka === true;

        // --- Lain-lain ---
        case 'rank': return stats.rank <= reqValue; // Untuk Rank, lebih kecil lebih bagus (Rank 1 < Rank 3)
        case 'visit_shop': return (localPlayerData.shopVisits || 0) >= reqValue;
        case 'hidden_secret': return localPlayerData.foundSecret === true;
        case 'special_event': return localPlayerData.playedEvent === true;
        case 'high_score_all': return (localPlayerData.gamesWithScore50Plus || 0) >= reqValue;
        case 'polymath': return (localPlayerData.gamesWithScore50Plus || 0) >= 12;

        default:
            return false;
    }
}

function loadMedalShop() {
    console.log("--- PENGESAN MEDAL SHOP BERMULA ---");
    
    // Langkah 1: Cari bekas (container) dalam HTML
    const container = document.getElementById('medal-shop-container');
    console.log("1. Bekas HTML (Container):", container ? "Dijumpai!" : "TIDAK JUMPA!");
    
    if (!container) {
        console.warn("Sistem berhenti kerana ID 'medalShopContainer' tiada dalam HTML index.html");
        return; // Berhenti senyap jika tiada bekas
    }

    // Langkah 2: Semak data lencana
    console.log("2. Data Lencana (achievementsData):", typeof achievementsData !== 'undefined' ? "Ada" : "Tiada");
    if (typeof achievementsData === 'undefined') {
        container.innerHTML = '<p class="text-red-500 text-center">Senarai lencana tiada dalam config.js</p>';
        return;
    }

    // Langkah 3: Semak data profil pemain
    console.log("3. Data Pemain (localPlayerData):", localPlayerData ? "Sedia" : "Belum Sedia");
    if (!localPlayerData) {
        container.innerHTML = '<p class="text-gray-500 text-center">Memuat turun profil...</p>';
        return;
    }

    // Jika sampai ke sini, bermakna semua lulus! Mula melukis.
    console.log("4. Semua lulus! Mula melukis lencana di skrin...");
    container.innerHTML = ''; // Buang teks "Memuatkan..."

    const playerInventory = Array.isArray(localPlayerData.inventory) ? localPlayerData.inventory : [];

    achievementsData.forEach(item => {
        const isOwned = playerInventory.includes(item.id);
        const isUnlocked = checkMedalRequirement(item.reqType, item.reqValue);

        let buttonHTML = '';
        if (isOwned) {
            buttonHTML = `<button class="w-full py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed font-bold text-sm" disabled>Sudah Dimiliki</button>`;
        } else if (isUnlocked) {
            buttonHTML = `<button onclick="buyMedal('${item.id}', ${item.price}, '${item.name}')" class="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition">Beli: ${item.price} Koin</button>`;
        } else {
            buttonHTML = `<button class="w-full py-2 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed font-bold text-sm" disabled><i class="fas fa-lock mr-1"></i>Terkunci</button>`;
        }

        const badgeImage = item.image ? item.image : "assets/badges/default.png";

        const card = `
            <div class="bg-white p-4 rounded-xl shadow-sm border-2 ${isUnlocked ? 'border-blue-200' : 'border-gray-100'} text-center relative flex flex-col h-full justify-between">
                <div>
                    <div class="w-20 h-20 mx-auto mb-3 bg-gray-50 rounded-full flex items-center justify-center relative overflow-hidden">
                        <img src="${badgeImage}" alt="${item.name}" class="w-14 h-14 object-contain ${isUnlocked ? '' : 'grayscale opacity-30'}">
                        ${!isUnlocked ? '<div class="absolute inset-0 flex items-center justify-center text-gray-700 text-3xl"><i class="fas fa-lock drop-shadow-md"></i></div>' : ''}
                    </div>
                    <h4 class="font-bold text-sm text-gray-800 mb-1 leading-tight">${item.name}</h4>
                    <p class="text-[10px] text-gray-500 mb-3 h-10 leading-tight flex items-center justify-center">${item.description}</p>
                </div>
                ${buttonHTML}
            </div>
        `;
        container.innerHTML += card;
    });
    
    console.log("--- LUKISAN SELESAI ---");
}

function buyMedal(id, price, name) {
    if (localPlayerData.coins < price) {
        Swal.fire('Koin Tidak Cukup!', 'Teruskan bermain untuk kumpul koin.', 'error');
        return;
    }

    Swal.fire({
        title: 'Beli Lencana ini?',
        text: `Adakah anda ingin membeli ${name}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Ya, Milikinya!'
    }).then((result) => {
        if (result.isConfirmed) {
            // Tolak koin
            localPlayerData.coins -= price;
            
            // Masukkan ke inventori
            if (!localPlayerData.inventory) localPlayerData.inventory = [];
            localPlayerData.inventory.push(id);

            // Simpan data
            saveCloudPlayerData();
            updateUI(); // Kemas kini paparan koin di skrin
            loadMedalShop(); // Lukis semula kedai supaya butang berubah jadi 'Milik'

            Swal.fire('Berjaya!', 'Lencana kini milik anda. Syabas!', 'success');
        }
    });
}