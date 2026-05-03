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
    
    let playerDocId = `${playerSchool}_${playerClass}_${playerName}`.replace(/\s+/g, '_');

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menghantar Pesanan...';
    btn.classList.add('opacity-50', 'cursor-not-allowed');

    try {
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

        await db.collection("eduItems").doc(itemID).update({
            stock: firebase.firestore.FieldValue.increment(-qty)
        });

        closeEduCheckout();
        alert("✅ ORDERED SENT!\n\nYour coin hasn't been deducted. Coin will be deducted once ADMIN comfirm your order.");
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

let adminInventoryData = []; 

async function loadAdminOrders() {
    const container = document.getElementById('admin-content');
    if (!container) return; 

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

async function approveOrder(orderDocId, playerDocId, costToDeduct) {
    if(!confirm("Anda pasti ingin mengesahkan penyerahan? Koin pelajar akan ditolak sekarang.")) return;
    
    try {
        await db.collection("eduOrders").doc(orderDocId).update({ status: "completed" });
        if (playerDocId && costToDeduct > 0) {
            await db.collection("players").doc(playerDocId).update({
                coins: firebase.firestore.FieldValue.increment(-costToDeduct)
            });
        }
        alert("Order Approved!");
        loadAdminOrders();
    } catch (e) {
        console.error("Approve Error:", e);
        alert("Fail to update order status.");
    }
}

async function loadAdminInventory() {
    const container = document.getElementById('admin-content');
    if (!container) return; 

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
        alert("Please complete Item ID and Item Name!");
        return;
    }

    const originalBtnHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';

    try {
        await db.collection("eduItems").doc(itemId).set(itemData, { merge: true });
        alert(`Successfull! Item ${itemId} has been updated in the database.`);
        closeItemForm();
        loadAdminInventory(); 
    } catch (e) {
        console.error("Save Item Error:", e);
        alert("Error. Failed to save to Firestore.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalBtnHTML;
    }
}

// ==========================================
// FUNGSI NAVIGASI TAB KEDAI MURID
// ==========================================
function switchShopTab(tabName) {
    if (window.Trackers) Trackers.rekodBukaKedai();

    document.querySelectorAll('.shop-section').forEach(el => {
        el.classList.add('hidden');
    });
    
    document.querySelectorAll('.shop-tab-btn').forEach(btn => {
        btn.classList.remove('bg-indigo-600', 'text-white', 'shadow-sm');
        btn.classList.add('bg-gray-200', 'text-gray-500');
    });

    const activeSection = document.getElementById(`shop-content-${tabName}`);
    if (activeSection) {
        activeSection.classList.remove('hidden');
    }

    const activeBtn = document.getElementById(`tab-btn-${tabName}`);
    if (activeBtn) {
        activeBtn.classList.remove('bg-gray-200', 'text-gray-500');
        activeBtn.classList.add('bg-indigo-600', 'text-white', 'shadow-sm');
    }

    if (tabName === 'edu') {
        if (typeof loadShopInventory === 'function') loadShopInventory(); 
    } 
    else if (tabName === 'avatar') {
        if (typeof loadAvatarShop === 'function') loadAvatarShop(); 
    } 
    else if (tabName === 'badge') {
        if (typeof loadMedalShop === 'function') loadMedalShop(); 
    }
    
    localStorage.setItem('lastShopTab', tabName);
}

// ==========================================
// FUNGSI PAPARAN KEDAI UNTUK MURID
// ==========================================
async function loadShopInventory() {
    const container = document.getElementById('edu-shop-items');
    if (!container) return;

    container.innerHTML = `<div class="text-center col-span-full py-10 text-gray-500">
        <i class="fas fa-spinner fa-spin text-3xl mb-2 text-indigo-600"></i>
        <p>Menyemak stok kedai dari Firebase...</p>
    </div>`;

    try {
        const snapshot = await db.collection("eduItems").get();
        
        if (snapshot.empty) {
            container.innerHTML = `<div class="text-center col-span-full py-10 text-gray-400">
                <i class="fas fa-box-open text-5xl mb-3 text-gray-300"></i>
                <h3 class="font-bold text-lg">Kedai Masih Kosong</h3>
                <p>Cikgu belum meletakkan sebarang barang untuk dibeli.</p>
            </div>`;
            return;
        }

        let html = "";
        snapshot.forEach(doc => {
            const item = doc.data();
            const isOutOfStock = item.stock <= 0;
            
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
                    ${isOutOfStock ? 'STOCK EMPTY' : 'BUY NOW'}
                </button>
            </div>
            `;
        });
        
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

    const playerLevel = localPlayerData.level || 1;
    const playerName = localPlayerData.name || "";
    
    if (!localPlayerData.avatars) localPlayerData.avatars = {};
    if (!localPlayerData.inventory) localPlayerData.inventory = [];

    let html = "";
    
    for (const key in avatars) {
        const category = avatars[key];
        
        category.levels.forEach(item => {
            if (item.isSecret && playerName.trim().toUpperCase() !== "GAME MASTER") {
                return; 
            }

            const isLocked = playerLevel < item.level;
            const itemKey = `${key}_lvl${item.level}`;
            const isOwned = localPlayerData.inventory.includes(itemKey);
            
            const safeImg = item.img ? item.img : '';
            const safeIcon = item.icon ? item.icon : '';

            const visual = item.img 
                ? `<img src="assets/avatars/${item.img}" class="w-16 h-16 object-contain mb-3 ${isLocked ? 'grayscale opacity-50' : ''}">`
                : `<div class="w-16 h-16 ${isLocked ? 'bg-gray-200 text-gray-400' : 'bg-blue-50 text-blue-600'} rounded-full flex items-center justify-center text-3xl mb-3 border-2 border-dashed shadow-inner">
                    <i class="${isLocked ? 'fas fa-lock' : item.icon}"></i>
                   </div>`;

            let buttonHtml = "";
            
            if (isLocked) {
                buttonHtml = `<button class="mt-4 w-full py-2 bg-gray-300 text-gray-600 rounded-xl font-bold text-[10px] cursor-not-allowed" disabled>
                    <i class="fas fa-lock mr-1"></i> LVL ${item.level} REQUIRED
                   </button>`;
            } else if (isOwned) {
                buttonHtml = `<button onclick="equipAvatar('${safeImg}', '${safeIcon}', '${item.name}')" 
                    class="mt-4 w-full py-2 bg-green-500 text-white rounded-xl font-bold text-[10px] hover:bg-green-600 shadow-sm transition-all border-2 border-green-600">
                    <i class="fas fa-user-check mr-1"></i> USE AVATAR
                   </button>`;
            } else {
                buttonHtml = `<button onclick="buyAvatar('${key}', ${item.level}, ${item.price}, '${item.name}')" 
                    class="mt-4 w-full py-2 bg-indigo-600 text-white rounded-xl font-bold text-[10px] hover:bg-indigo-700 shadow-sm transition-all">
                    BUY GUARDIAN
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
    let playerLevel = (typeof localPlayerData !== 'undefined' && localPlayerData.level) ? parseInt(localPlayerData.level) : 1;
    let itemLevel = parseInt(level);

    if (typeof studentInfo !== 'undefined' && (studentInfo.name.includes("ADMIN") || studentInfo.name === "GAME MASTER")) {
        playerLevel = 999; 
    }

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
        }
    });
}

// ==========================================
// FUNGSI JURUWANG KEDAI (PROCESS PURCHASE)
// ==========================================
function processPurchase(category, level, price) {
    if (localPlayerData.coins < price) {
        Swal.fire({
            icon: 'error',
            title: 'Koin Tidak Mencukupi! 🪙',
            text: 'Sila main lebih banyak permainan untuk kumpul koin.',
            confirmButtonColor: '#ef4444'
        });
        return; 
    }

    localPlayerData.coins -= price;

    if (window.Trackers) {
        Trackers.rekodKoinBelanja(price);
    }

    if (!localPlayerData.avatars) localPlayerData.avatars = {};
    if (!localPlayerData.inventory) localPlayerData.inventory = [];

    localPlayerData.avatars[category] = {
        level: level,
        purchasedAt: new Date().toISOString()
    };

    const itemKey = `${category}_lvl${level}`;
    if (!localPlayerData.inventory.includes(itemKey)) {
        localPlayerData.inventory.push(itemKey);
    }

    if (window.Trackers) {
        Trackers.rekodDataAvatar();
    }

    if (typeof updateUI === 'function') {
        updateUI(); 
    }

    Swal.fire({
        icon: 'success',
        title: 'Pembelian Berjaya! 🎉',
        text: 'Item telah dimasukkan ke dalam inventori anda.',
        confirmButtonColor: '#22c55e'
    });

    localStorage.setItem('currentPlayer', JSON.stringify(localPlayerData));
    if (typeof saveCloudPlayerData === 'function') {
        saveCloudPlayerData();
    }

    if (typeof loadAvatarShop === 'function') {
        loadAvatarShop();
    }
}

// ==========================================
// FUNGSI BUKA & TUTUP MODAL CHECKOUT EDU SHOP
// ==========================================
function openEduCheckout(id, name, price) {
    const idInput = document.getElementById('eduItemID');
    const nameInput = document.getElementById('eduItemName');
    const priceInput = document.getElementById('eduBasePrice');
    
    if (idInput) idInput.value = id;
    if (nameInput) nameInput.value = name;
    if (priceInput) priceInput.value = price;

    const qtyInput = document.getElementById('eduQuantity');
    if (qtyInput) qtyInput.value = 1;

    const studentNameInput = document.getElementById('eduStudentName');
    if (studentNameInput && typeof studentInfo !== 'undefined') {
        studentNameInput.value = studentInfo.name;
    }

    const modal = document.getElementById('edu-checkout-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex'); 
    } else {
        console.error("Ralat UI: Kotak modal 'edu-checkout-modal' tidak dijumpai dalam HTML.");
    }
}

function closeEduCheckout() {
    const modal = document.getElementById('edu-checkout-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    
    if (typeof resetConfirmBtn === 'function') {
        resetConfirmBtn();
    }
}

// ==========================================
// 🔥 FUNGSI SEMAK SYARAT LENCANA (DIKEMASKINI & DISELARASKAN DENGAN FIRESTORE)
// ==========================================
function checkMedalRequirement(reqType, reqValue) {
    if (typeof localPlayerData === 'undefined' || !localPlayerData) return false;

    let conditionMet = false;
    const target = reqValue;
    const currentMonth = new Date().getMonth() + 1; // 1-12

    switch (reqType) {
        case "total_score":
            if ((Number(localPlayerData.totalScore) || 0) >= target) conditionMet = true;
            break;
        case "perfect_scores":
            if ((Number(localPlayerData.perfectScores) || 0) >= target) conditionMet = true;
            break;
        case "total_games":
            if ((Number(localPlayerData.totalGames) || 0) >= target) conditionMet = true;
            break;
        case "send_challenge":
            if ((Number(localPlayerData.challengesSent) || 0) >= target) conditionMet = true;
            break;
        case "win_challenge":
            if ((Number(localPlayerData.challengesWon) || 0) >= target) conditionMet = true;
            break;
        case "total_challenges":
            if ((Number(localPlayerData.totalChallenges) || 0) >= target) conditionMet = true;
            break;
        case "lose_challenge":
            if ((Number(localPlayerData.challengesLost) || 0) >= target) conditionMet = true;
            break;
        case "total_coins": 
            if ((Number(localPlayerData.coins) || 0) >= target) conditionMet = true;
            break;

        // 🔥 Diselaraskan: total_earned & total_coins_earned (ach_12)
        case "total_earned": 
        case "total_coins_earned":
            if ((Number(localPlayerData.totalCoinsEarned) || 0) >= target) conditionMet = true;
            break;

        // 🔥 Diselaraskan: total_spent & spend_coins (ach_11)
        case "total_spent":
        case "spend_coins":
            if ((Number(localPlayerData.totalSpent) || 0) >= target) conditionMet = true;
            break;

        // ==========================================
        // 🌟 KEMASKINI KRITIKAL: LOGIK AVATAR FIRESTORE
        // ==========================================
        
        // 🔥 Lencana Kiraan Avatar (ach_13, ach_14, ach_16, ach_34)
        case "avatar_count":
        case "unlock_avatar":
        case "all_avatars":
        case "all_standard_avatars":
            let avatarCount = 0;
            // Pengadil tolong kirakan berapa banyak avatar dalam map "avatars"
            if (localPlayerData.avatars) {
                avatarCount = Object.keys(localPlayerData.avatars).length;
            }
            if (avatarCount >= target) conditionMet = true;
            break;

        // 🔥 Lencana Max Level Avatar (ach_15 - Max Power)
        case "avatar_level": 
            let maxLvl = 0;
            // Pengadil cari level paling tinggi dari semua avatar yang ada
            if (localPlayerData.avatars) {
                for (let key in localPlayerData.avatars) {
                    let lvl = localPlayerData.avatars[key].level || 0;
                    if (lvl > maxLvl) maxLvl = lvl;
                }
            }
            if (maxLvl >= target) conditionMet = true;
            break;

        // 🔥 Lencana Multiple Avatar Max Level (ach_35 - Elite Squad)
        case "avatars_at_level": 
        case "multiple_avatar_level":
            let avatarsAtMaxLevel = 0;
            // Pengadil kira berapa banyak avatar yang sudah mencapai level 10
            if (localPlayerData.avatars) {
                for (let key in localPlayerData.avatars) {
                    let lvl = localPlayerData.avatars[key].level || 0;
                    if (lvl >= 10) avatarsAtMaxLevel++;
                }
            }
            if (avatarsAtMaxLevel >= target) conditionMet = true; 
            break;

        // 🔥 Lencana Baru: Loyal Companion (ach_36)
        case "avatar_streak":
            if ((Number(localPlayerData.avatarStreak) || 0) >= target) conditionMet = true;
            break;

        // ==========================================

        case "login_streak":
            if ((Number(localPlayerData.loginStreak) || 0) >= target) conditionMet = true;
            break;
        case "daily_games":
            if ((Number(localPlayerData.dailyGamesCount) || 0) >= target) conditionMet = true;
            break;
        case "unique_games": 
            if (((localPlayerData.playedGamesList || []).length) >= target) conditionMet = true;
            break;

        // 🔥 Diselaraskan: score_threshold & high_score_all (ach_25)
        case "score_threshold": 
        case "high_score_all":
            if ((Number(localPlayerData.gamesWithScore50Plus) || 0) >= target) conditionMet = true;
            break;

        case "play_time_late": 
            if (localPlayerData.hasPlayedLate) conditionMet = true;
            break;
        case "play_time_early": 
            if (localPlayerData.hasPlayedEarly) conditionMet = true;
            break;

        // 🔥 Diselaraskan: weekend_play & play_weekend (ach_20)
        case "weekend_play":
        case "play_weekend":
            if (localPlayerData.hasPlayedWeekend) conditionMet = true;
            break;

        case "merdeka_day":
            if (localPlayerData.hasPlayedMerdeka) conditionMet = true;
            break;
        case "play_month":
            if (localPlayerData.hasPlayedDecember && target === 12) conditionMet = true;
            else if (currentMonth === target) conditionMet = true;
            break;

        // 🔥 Diselaraskan: shop_visits & visit_shop (ach_33)
        case "shop_visits":
        case "visit_shop":
            if ((Number(localPlayerData.shopVisits) || 0) >= target) conditionMet = true;
            break;
            
        case "first_login":
            if ((Number(localPlayerData.loginCount) || 0) >= 1 || localPlayerData.name) {
                conditionMet = true;
            }
            break;

        case "event_play":
        case "special_event":
            if (localPlayerData.hasPlayedEvent) conditionMet = true;
            break;

        case "special_avatar":
            if (localPlayerData.hasSecretAvatar) conditionMet = true;
            break;

        case "rank":
        case "leaderboard_rank": 
            const cRank = Number(localPlayerData.currentRank) || 999;
            const bRank = Number(localPlayerData.bestRank) || 999;
            const actualRank = Math.min(cRank, bRank);
            if (actualRank > 0 && actualRank <= target) {
                conditionMet = true;
            }
            break;
            
        case "tie_challenge":
            if (localPlayerData.lastGameResult === 'tie') conditionMet = true;
            break;
        case "comeback_win":
            if (localPlayerData.hasDoneComeback) conditionMet = true;
            break;
        case "narrow_win":
            if (localPlayerData.hasDoneNarrowWin) conditionMet = true;
            break;
        case "revenge_win":
            if (localPlayerData.hasDoneRevenge) conditionMet = true;
            break;
        case "hidden_secret":
            if (localPlayerData.foundSecret) conditionMet = true;
            break;
            
        default:
            conditionMet = false;
    }

    return conditionMet;
}

// ==========================================
// FUNGSI MELUKIS KEDAI LENCANA
// ==========================================
function loadMedalShop() {
    const container = document.getElementById('medal-shop-container');
    
    if (!container) return; 
    if (typeof achievementsData === 'undefined' || !localPlayerData) {
        container.innerHTML = '<p class="text-gray-500 text-center">Memuat turun profil & data...</p>';
        return;
    }

    container.innerHTML = ''; 
    const playerInventory = Array.isArray(localPlayerData.inventory) ? localPlayerData.inventory : [];

console.log("Perfect Scores:", localPlayerData.perfectScores);
console.log("Played On Weekend:", localPlayerData.playedOnWeekend);

    achievementsData.forEach(item => {
        const isOwned = playerInventory.includes(item.id);
        const isUnlocked = checkMedalRequirement(item.reqType, item.reqValue);

        let buttonHTML = '';
        if (isOwned) {
            buttonHTML = `<button class="w-full py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed font-bold text-sm" disabled>Sudah Dimiliki</button>`;
        } else if (isUnlocked) {
buttonHTML = `<button onclick="buyMedal('${item.id}', ${item.price}, \`${item.name}\`)" class="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition">Beli: ${item.price} Koin</button>`;
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
}

// ==========================================
// FUNGSI PEMBELIAN LENCANA (DITAMBAH TRACKER)
// ==========================================
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
            
            localPlayerData.coins -= price;
            
            // Rekodkan koin yang dibelanjakan ke dalam Tracker
            if (window.Trackers) {
                Trackers.rekodKoinBelanja(price);
            }
            
            if (!localPlayerData.inventory) localPlayerData.inventory = [];
            localPlayerData.inventory.push(id);

            if (typeof saveCloudPlayerData === 'function') {
                saveCloudPlayerData();
            } else if (typeof syncDataToFirestore === 'function') {
                syncDataToFirestore();
            }

            if (typeof updateUI === 'function') updateUI(); 
            loadMedalShop(); 

            Swal.fire('Berjaya!', 'Lencana kini milik anda. Syabas!', 'success');
        }
    });
}