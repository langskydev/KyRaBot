// Install library yang dibutuhkan
// npm install whatsapp-web.js qrcode-terminal

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

// Retry mechanism for handling locked session files
async function retryAsync(fn, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === retries - 1) throw error;
            console.log(`Retrying due to error: ${error.message}`);
            await new Promise(res => setTimeout(res, delay));
        }
    }
}

// Inisialisasi klien WhatsApp
const client = new Client({
    authStrategy: new LocalAuth(),
});

// Generate QR code untuk login pertama kali
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('Scan kode QR ini dengan WhatsApp Anda.');
});

// Tampilkan pesan ketika sudah siap
client.on('ready', () => {
    console.log('Client sudah siap!');
});

// Tangani error ketika file terkunci
client.on('auth_failure', async (msg) => {
    console.error('AUTHENTICATION FAILURE', msg);
    try {
        const cookiesPath = path.join(__dirname, '.wwebjs_auth', 'session', 'Default', 'Cookies');
        if (fs.existsSync(cookiesPath)) {
            await retryAsync(() => fs.promises.unlink(cookiesPath));
            console.log('Locked session file removed, retrying login.');
        }
    } catch (err) {
        console.error('Failed to handle locked session file:', err);
    }
});

// Fungsi untuk mendapatkan waktu saat ini
tambahNol = (i) => {
    return (i < 10) ? "0" + i : i;
}

function getCurrentDateTime() {
    const today = new Date();
    const tanggal = `${tambahNol(today.getDate())}/${tambahNol(today.getMonth() + 1)}/${today.getFullYear()}`;
    const jam = `${tambahNol(today.getHours())}:${tambahNol(today.getMinutes())}`;
    return { tanggal, jam };
}

// Fungsi untuk membatalkan transaksi setelah 5 menit
function batalkanTransaksi(transactionId, message) {
    setTimeout(() => {
        message.reply(`*TRANSAKSI DIBATALKAN ❌*

🗑 *ID Transaksi:* ${transactionId}

Transaksi dibatalkan karena tidak ada respons lebih lanjut dalam 5 menit.`);
        delete transactions[message.from];
    }, 5 * 60 * 1000); // 5 menit dalam milidetik
}

// Menangani pesan yang diterima
const transactions = {}; // Menyimpan detail transaksi
const activeChats = {}; // Menyimpan status chat aktif antara admin dan user

client.on('message', async message => {
    if (message.body.toLowerCase() === 'menu') {
        const { tanggal, jam } = getCurrentDateTime();
        const response = `*📋 Selamat Datang di KYS STORE - Layanan Media Sosial 📋*

📆 *Tanggal:* ${tanggal}
⏰ *Jam:* ${jam}

*Untuk melihat daftar layanan, ketik salah satu pilihan di bawah ini:*

◾ *FF* (Free Fire)
◾ *ML* (Mobile Legends)
◾ *Netflix*
◾ *Pay*
◾ *YouTube*
◾ *Canva*`;
        message.reply(response);
    } else if (message.body.toLowerCase() === 'ff') {
        const response = `*🛒 Tata Cara Order DM Free Fire:*

📌 Ketik format order berikut:
*ff [jumlahdm] [id]*

✉️ Contoh:
- *ff 100 123456789*

---

🎮 *Harga Diamond Free Fire:*

- *MM*: Rp28.061
- *MB*: Rp83.182
- *50*: Rp8.255
- *55*: Rp9.036
- *60*: Rp9.818
- *70*: Rp10.600
- *75*: Rp11.382
- *80*: Rp12.164
- *90*: Rp13.727
- *100*: Rp14.509

---

📥 Setelah mengirim format order, harap menunggu konfirmasi dan proses pengiriman diamond akan segera dilakukan!`;
        message.reply(response);
    } else if (message.body.toLowerCase() === 'ml') {
        const response = `*🛒 Tata Cara Order DM Mobile Legends:*

📌 Ketik format order berikut:
*ml [jumlahdm] [id] [server]*

✉️ Contoh:
- *ml 5 12445 2234*

---

🎮 *Harga Diamond Mobile Legends:*

- *5 diamonds*: Rp3.424
- *12 diamonds*: Rp5.266
- *19 diamonds*: Rp7.176
- *28 diamonds*: Rp9.504
- *44 diamonds*: Rp13.256
- *59 diamonds*: Rp17.008
- *85 diamonds*: Rp23.574
- *113 diamonds*: Rp31.079

---

📥 Setelah mengirim format order, harap menunggu konfirmasi dan proses pengiriman diamond akan segera dilakukan!`;
        message.reply(response);
    } else if (message.body.toLowerCase() === 'netflix') {
        const response = `*•------» NETFLIX PREMIUM «------•*

*NETFLIX SHARING 1P1U:*
- 1 Bulan: 23.000 PROMO
- 2 Bulan: 47.000
- 3 Bulan: 66.000
+3rb REQ PIN+NAMA PROFIL

*NETFLIX SHARING 1P2U:*
- 1 Bulan: 15.000 PROMO
- 2 Bulan: 28.000
- 3 Bulan: 40.000

*NETFLIX PRIVATE:*
- 1 Bulan: 110.000

*NETFLIX CRACK*
- Private : 18.000
CRACK DURASI RANDOM, GARANSI LOGIN

📝 *NOTE:*
✅ 4K UHD
✅ Support All device
✅ Garansi fixing max 1x24 jam
✅ Fullgaransi
✅ Lu beli private ? Lu punya kuasa

Order? Ketik —» *buy netflix*

© tahun LkyBot`;
        message.reply(response);
    } else if (message.body.toLowerCase() === 'buy netflix') {
        const response = `*🔸 Pilih Varian Netflix 🔸*

A. *1P1U*
B. *1P2U*
C. *PRIVATE*
D. *CRACK PRIVATE*

Ketik huruf untuk memilih varian.`;
        message.reply(response);
    } else if (['a', 'b', 'c', 'd'].includes(message.body.toLowerCase())) {
        let variant = '';
        let variantKey = message.body.toLowerCase();
        switch (variantKey) {
            case 'a':
                variant = `*1P1U* - Pilih Durasi:

1. *1 Bulan*: Rp23.000 (PROMO)
2. *2 Bulan*: Rp47.000
3. *3 Bulan*: Rp66.000 (+3rb REQ PIN+NAMA PROFIL)`;
                break;
            case 'b':
                variant = `*1P2U* - Pilih Durasi:

1. *1 Bulan*: Rp15.000 (PROMO)
2. *2 Bulan*: Rp28.000
3. *3 Bulan*: Rp40.000`;
                break;
            case 'c':
                variant = `*PRIVATE* - Pilih Durasi:

1. *1 Bulan*: Rp110.000`;
                break;
            case 'd':
                variant = `*CRACK PRIVATE* - Pilih Durasi:

1. *Private*: Rp18.000 (CRACK DURASI RANDOM, GARANSI LOGIN)`;
                break;
        }
        transactions[message.from] = { variant: variantKey }; // Simpan varian yang dipilih oleh user
        const response = `${variant}

Ketik angka untuk memilih durasi yang diinginkan.`;
        message.reply(response);
    } else if (/^[1-3]$/.test(message.body)) {
        if (transactions[message.from] && transactions[message.from].variant) {
            const variantKey = transactions[message.from].variant;
            let duration = '';
            let layanan = '';
            let harga = '';
            switch (variantKey) {
                case 'a':
                    layanan = 'Netflix Sharing 1P1U';
                    duration = {
                        '1': '1 Bulan',
                        '2': '2 Bulan',
                        '3': '3 Bulan'
                    }[message.body];
                    harga = {
                        '1': 'Rp23.000 (PROMO)',
                        '2': 'Rp47.000',
                        '3': 'Rp66.000 (+3rb REQ PIN+NAMA PROFIL)'
                    }[message.body];
                    break;
                case 'b':
                    layanan = 'Netflix Sharing 1P2U';
                    duration = {
                        '1': '1 Bulan',
                        '2': '2 Bulan',
                        '3': '3 Bulan'
                    }[message.body];
                    harga = {
                        '1': 'Rp15.000 (PROMO)',
                        '2': 'Rp28.000',
                        '3': 'Rp40.000'
                    }[message.body];
                    break;
                case 'c':
                    layanan = 'Netflix Private';
                    duration = {
                        '1': '1 Bulan'
                    }[message.body];
                    harga = {
                        '1': 'Rp110.000'
                    }[message.body];
                    break;
                case 'd':
                    layanan = 'Netflix Crack Private';
                    duration = {
                        '1': 'Private'
                    }[message.body];
                    harga = {
                        '1': 'Rp18.000 (CRACK DURASI RANDOM, GARANSI LOGIN)'
                    }[message.body];
                    break;
            }
            if (duration && harga) {
                const response = `*📝 Detail Produk*

📱 *Layanan Aplikasi:* ${layanan}
📦 *Varian:* ${variantKey.toUpperCase()}
⏳ *Durasi:* ${duration}
💰 *Harga:* ${harga}

Jika detail sudah benar, silakan ketik *pembayaran* untuk melanjutkan.`;
                message.reply(response);
                transactions[message.from] = { variant: variantKey, duration: duration, layanan: layanan, harga: harga }; // Simpan detail produk
                batalkanTransaksi(message.from, message); // Batalkan transaksi jika tidak ada respon dalam 5 menit
            } else {
                message.reply('Pilihan durasi tidak valid.');
            }
        } else {
            message.reply('Silakan pilih varian terlebih dahulu dengan mengetik huruf yang sesuai.');
        }
    } else if (message.body.toLowerCase() === 'pembayaran') {
        if (transactions[message.from]) {
            const response = `*💳 Metode Pembayaran*

Silahkan lakukan transfer melalui metode pembayaran yang disediakan:

*DANA*
Nomor: 085713608649
Atas Nama: Galang Rizky Arridho

*OVO*
Nomor: 085713608649
Atas Nama: Galang Rizky Arridho

*GoPay*
Nomor: 085810219251
Atas Nama: Galang Rizky Arridho

📸 Setelah transfer, kirim bukti pembayaran dengan format:
Ketik: #[nama layanan], contoh: *#netflix* untuk melanjutkan konfirmasi pembayaran.`;
            message.reply(response);
            batalkanTransaksi(message.from, message); // Batalkan transaksi jika tidak ada respon dalam 5 menit
        } else {
            message.reply('Silakan pilih varian dan durasi terlebih dahulu sebelum melanjutkan ke pembayaran.');
        }
    } else if (/^#(ff|ml|netflix)$/.test(message.body.toLowerCase())) {
        const productKey = message.body.toLowerCase().substring(1);
        const transactionId = Object.keys(transactions).find(id => transactions[id].gameType === productKey && transactions[id].userNumber === message.from);
        if (!transactionId) {
            message.reply('Transaksi tidak ditemukan. Pastikan ID transaksi benar.');
            return;
        }
    
        const transaction = transactions[transactionId];
        let response = '';
    
        switch (transaction.gameType) {
            case 'ff':
                response = `🔄 *[TRANSAKSI PENDING]* 🔄
    
    *Free Fire:*
    
    ❗ Pesanan Anda sedang diproses.
    
    🔢 *Detail Pesanan:*
    
    - *Jumlah Diamond:* ${transaction.jumlahDm}
    - *ID Akun:* ${transaction.gameId}
    - *Harga:* Rp${transaction.harga.toLocaleString('id-ID')}
    
    ⏳ *Status:* Menunggu konfirmasi dan pengiriman Diamond.
    
    💡 Harap sabar menunggu. Estimasi waktu pengiriman Diamond adalah 5-15 menit. Jika ada kendala, segera hubungi layanan pelanggan kami.`;
                break;
            case 'ml':
                response = `🔄 *[TRANSAKSI PENDING]* 🔄
    
    *Mobile Legends:*
    
    ❗ Pesanan Anda sedang diproses.
    
    🔢 *Detail Pesanan:*
    
    - *Jumlah Diamond:* ${transaction.jumlahDm}
    - *ID Akun:* ${transaction.gameId}
    - *Server:* ${transaction.serverId}
    - *Harga:* Rp${transaction.harga.toLocaleString('id-ID')}
    
    ⏳ *Status:* Menunggu konfirmasi dan pengiriman Diamond.
    
    💡 Harap sabar menunggu. Estimasi waktu pengiriman Diamond adalah 5-15 menit. Jika ada kendala, segera hubungi layanan pelanggan kami.`;
                break;
            case 'netflix':
                response = `🔄 *[TRANSAKSI PENDING]* 🔄
    
    *Netflix:*
    
    ❗ Pesanan Anda sedang diproses.
    
    🔢 *Detail Pesanan:*
    
    - *Layanan:* Netflix
    - *Durasi:* ${transaction.duration}
    - *Harga:* Rp${transaction.harga.toLocaleString('id-ID')}
    
    ⏳ *Status:* Menunggu konfirmasi.
    
    💡 Harap sabar menunggu. Jika ada kendala, segera hubungi layanan pelanggan kami.`;
                break;
            default:
                response = 'Produk tidak valid. Pastikan Anda mengirim bukti TF dengan produk yang sesuai.';
        }
    
        message.reply(response);
    
        // Mengirim detail pesanan dan bukti transfer ke admin
        if (message.hasMedia) {
            message.downloadMedia().then(media => {
                if (media) {
                    const adminNumber = '6285714608649@c.us';
                    const adminMessage = `*DETAIL PESANAN USER*
    
    📌 *Nama Layanan:* ${transaction.gameType === 'ff' ? 'Free Fire' : transaction.gameType === 'ml' ? 'Mobile Legends' : 'Netflix'}
    🔢 *Jumlah Diamond:* ${transaction.jumlahDm || 'N/A'}
    🆔 *ID Akun:* ${transaction.gameId || 'N/A'}${transaction.serverId ? `
    🌐 *Server:* ${transaction.serverId}` : ''}
    💰 *Harga:* Rp${transaction.harga.toLocaleString('id-ID')}
    📅 *Tanggal Pesanan:* ${getCurrentDateTime().tanggal}
    ⏳ *Status:* Sedang diproses`;
                    client.sendMessage(adminNumber, media, { caption: adminMessage });
                    activeChats[adminNumber] = { admin: adminNumber, user: message.from }; // Simpan chat aktif antara admin dan user
                } else {
                    message.reply('Media tidak dapat diunduh. Harap coba lagi.');
                }
            }).catch(error => {
                console.error('Error saat mengunduh media:', error);
                message.reply('Terjadi kesalahan saat memproses bukti pembayaran. Harap coba lagi.');
            });
        } else {
            const adminNumber = '6285714608649@c.us';
            const adminMessage = `*DETAIL PESANAN USER*
    
    📌 *Nama Layanan:* ${transaction.gameType === 'ff' ? 'Free Fire' : transaction.gameType === 'ml' ? 'Mobile Legends' : 'Netflix'}
    🔢 *Jumlah Diamond:* ${transaction.jumlahDm || 'N/A'}
    🆔 *ID Akun:* ${transaction.gameId || 'N/A'}${transaction.serverId ? `
    🌐 *Server:* ${transaction.serverId}` : ''}
    💰 *Harga:* Rp${transaction.harga.toLocaleString('id-ID')}
    📅 *Tanggal Pesanan:* ${getCurrentDateTime().tanggal}
    ⏳ *Status:* Sedang diproses`;
            client.sendMessage(adminNumber, adminMessage);
            activeChats[adminNumber] = { admin: adminNumber, user: message.from }; // Simpan chat aktif antara admin dan user
        }
    } else if (message.body.toLowerCase() === 'k netflix') {
        // Cari chat aktif yang terkait dengan Netflix
        const adminNumber = message.from;
        const activeChat = Object.values(activeChats).find(chat => chat.admin === adminNumber && transactions[chat.user] && transactions[chat.user].gameType === 'netflix');
        if (activeChat) {
            const userNumber = activeChat.user;
            client.sendMessage(userNumber, '*🔄 Terhubung dengan Admin, silakan berinteraksi hingga transaksi selesai.*');
            activeChats[adminNumber].isConnected = true; // Tandai bahwa admin dan user sedang terhubung
        } else {
            message.reply('Tidak ada transaksi Netflix yang ditemukan untuk diproses. Pastikan Anda membalas detail pesanan yang benar.');
        }
    } else if (message.body.toLowerCase() === 'close' && activeChats[message.from]) {
        const chat = activeChats[message.from];
        const userNumber = chat.user;
        const { tanggal, jam } = getCurrentDateTime();
        delete activeChats[message.from];
        client.sendMessage(userNumber, `*🔒 TRANSAKSI BERHASIL ✅*
    
    📆 *Tanggal:* ${tanggal}
    ⏰ *Jam:* ${jam}
    
    📱 *Layanan Aplikasi:* ${transactions[userNumber].layanan}
    📦 *Varian:* ${transactions[userNumber].variant ? transactions[userNumber].variant.toUpperCase() : 'N/A'}
    ⏳ *Durasi:* ${transactions[userNumber].duration || 'N/A'}
    
    Layanan dimulai dari sekarang hingga ${transactions[userNumber].duration || 'N/A'}.
    
    Terima kasih @${message._data.notifyName} ✌️. Next order lagi ya 🙏`);
        delete transactions[userNumber];
    } else if (activeChats[message.from] && activeChats[message.from].isConnected) {
        // Forward pesan dari admin ke user
        const chat = activeChats[message.from];
        const userNumber = chat.user;
        if (message.hasMedia) {
            const media = await message.downloadMedia();
            await client.sendMessage(userNumber, media, { caption: message.body });
        } else {
            client.sendMessage(userNumber, message.body);
        }
    } else if (Object.values(activeChats).some(chat => chat.user === message.from && chat.isConnected)) {
        // Forward pesan dari user ke admin
        const chat = Object.values(activeChats).find(chat => chat.user === message.from);
        const adminNumber = chat.admin;
        if (message.hasMedia) {
            const media = await message.downloadMedia();
            await client.sendMessage(adminNumber, media, { caption: message.body });
        } else {
            client.sendMessage(adminNumber, message.body);
        }
    } else if (/^ml \d+ \d+ \d+$/.test(message.body) || /^ff \d+ \d+$/.test(message.body) || /^netflix \d+$/.test(message.body)) {
        // Proses order topup game atau Netflix
        const parts = message.body.split(' ');
        const gameType = parts[0];
        let jumlahDm = null;
        let gameId = null;
        let serverId = null;
        let harga = 0;
        let duration = null;
        const currentDate = new Date();
        const date = currentDate.toLocaleDateString('id-ID');
        const time = currentDate.toLocaleTimeString('id-ID');
        const transactionId = `TRX${Date.now()}`;
    
        if (gameType === 'ml' || gameType === 'ff') {
            jumlahDm = parseInt(parts[1], 10);
            gameId = parts[2];
            serverId = gameType === 'ml' ? parts[3] : null;
    
            if (gameType === 'ml') {
                switch (jumlahDm) {
                    case 5: harga = 3424; break;
                    case 12: harga = 5266; break;
                    case 19: harga = 7176; break;
                    case 28: harga = 9504; break;
                    case 44: harga = 13256; break;
                    case 59: harga = 17008; break;
                    case 85: harga = 23574; break;
                    case 113: harga = 31079; break;
                    default: harga = jumlahDm * 400; break; // Harga default jika jumlah tidak sesuai
                }
            } else if (gameType === 'ff') {
                switch (jumlahDm) {
                    case 50: harga = 8255; break;
                    case 55: harga = 9036; break;
                    case 60: harga = 9818; break;
                    case 70: harga = 10600; break;
                    case 75: harga = 11382; break;
                    case 80: harga = 12164; break;
                    case 90: harga = 13727; break;
                    case 100: harga = 14509; break;
                    default: harga = jumlahDm * 150; break; // Harga default jika jumlah tidak sesuai
                }
            }
        } else if (gameType === 'netflix') {
            harga = parseInt(parts[1], 10);
            duration = parts.length > 2 ? parts[2] : '1 Bulan';
        } else {
            message.reply('Produk tidak valid. Pastikan Anda mengetik dengan format yang benar.');
            return;
        }
    
        const transaction = {
            gameType,
            jumlahDm,
            gameId,
            serverId,
            harga,
            duration,
            userNumber: message.from,
            pendingMessage: message // Simpan pesan pending untuk dibalas nanti
        };
    
        transactions[transactionId] = transaction;
    
        message.reply(`*ORDER DITERIMA  「 ⏳ 」*
    
    📅 *Tanggal:* ${date}
    ⏰ *Jam:* ${time} WIB
    🗑 *ID Transaksi:* ${transactionId}
    
    *🗑 Detail Order:*
    ${gameType === 'netflix' ? `- *Layanan:* Netflix
    - *Durasi:* ${duration}
    - *Harga:* Rp${harga.toLocaleString('id-ID')}` : `- *Jumlah DM:* ${jumlahDm}
    - *ID Game:* ${gameId}${serverId ? `
    - *Server:* ${serverId}` : ''}
    - *Harga:* Rp${harga.toLocaleString('id-ID')}`}
    
    *💳 PAYMENT:*
    - *DANA*: 085714608649 (Galang Rizky Arridho)
    - *GoPay*: 085714608649 (Galang Rizky Arridho)
    - *Ovo*: 085714608649 (Galang Rizky Arridho)
    - *Shopeepay*: 085714608649 (Galang Rizky Arridho)
    
    *🗑 Cara Order:*
    - TF – Screenshot bukti pembayaran
    - Bukti kirim ke bot dengan menggunakan keyword *#${gameType}*
    
    *Gak Ikutin Aturan, Order Gak Diproses*`);
    } else if (/^d (ff|ml|netflix)$/i.test(message.body)) {
        // Mengirim pesan transaksi berhasil setelah admin memberikan konfirmasi
        const gameType = message.body.split(' ')[1].toLowerCase();
        const transactionId = Object.keys(transactions).find(id => transactions[id].gameType === gameType && transactions[id].userNumber === message.from);
        if (!transactionId) {
            message.reply('Transaksi tidak ditemukan. Pastikan ID transaksi benar.');
            return;
        }
    
        const transaction = transactions[transactionId];
        const pendingMessage = transaction.pendingMessage; // Ambil pesan pending untuk dibalas
        let response = '';
    
        switch (transaction.gameType) {
            case 'ff':
                response = `✅ *[TRANSAKSI BERHASIL]* ✅
    
    *Free Fire:*
    
    🎉 Pesanan Anda telah berhasil diproses!
    
    🔢 *Detail Pesanan:*
    
    - *Jumlah Diamond:* ${transaction.jumlahDm}
    - *ID Akun:* ${transaction.gameId}
    - *Harga:* Rp${transaction.harga.toLocaleString('id-ID')}
    
    💎 Diamond telah dikirim ke akun Anda. Terima kasih sudah bertransaksi di KYS STORE!`;
                break;
            case 'ml':
                response = `✅ *[TRANSAKSI BERHASIL]* ✅
    
    *Mobile Legends:*
    
    🎉 Pesanan Anda telah berhasil diproses!
    
    🔢 *Detail Pesanan:*
    
    - *Jumlah Diamond:* ${transaction.jumlahDm}
    - *ID Akun:* ${transaction.gameId}
    - *Server:* ${transaction.serverId}
    - *Harga:* Rp${transaction.harga.toLocaleString('id-ID')}
    
    💎 Diamond telah dikirim ke akun Anda. Terima kasih sudah bertransaksi di KYS STORE!`;
                break;
            case 'netflix':
                response = `✅ *[TRANSAKSI BERHASIL]* ✅
    
    *Netflix:*
    
    🎉 Pesanan Anda telah berhasil diproses!
    
    🔢 *Detail Pesanan:*
    
    - *Layanan:* Netflix
    - *Durasi:* ${transaction.duration}
    - *Harga:* Rp${transaction.harga.toLocaleString('id-ID')}
    
    Layanan telah diaktifkan. Terima kasih sudah bertransaksi di KYS STORE!`;
                break;
            default:
                response = 'Produk tidak valid. Pastikan Anda mengirim bukti TF dengan produk yang sesuai.';
        }
    
        pendingMessage.reply(response); // Balas pesan pending dengan pesan transaksi berhasil
        delete transactions[transactionId]; // Hapus transaksi setelah selesai
    }
    
});

// Menghubungkan ke WhatsApp
client.initialize();
