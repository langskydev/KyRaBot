const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');

// Membuat instance client WhatsApp
const client = new Client({
    authStrategy: new LocalAuth(),
});

// Membuat QR Code untuk login
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});


// Konfirmasi bahwa bot sudah siap
client.on('ready', () => {
    console.log('Bot sudah siap dan berjalan!');
});

// Membatasi bot hanya aktif pada grup tertentu
const allowedGroups = ['120363348122136023@g.us']; 

// Path file untuk menyimpan data transaksi dan menu
const transaksiFilePath = path.join(__dirname, 'transaksi.json');
const menuFilePath = path.join(__dirname, 'menu.json');

// Membaca data transaksi dari file saat bot dimulai
let transaksiData = {};
if (fs.existsSync(transaksiFilePath)) {
    const rawData = fs.readFileSync(transaksiFilePath);
    transaksiData = JSON.parse(rawData);
}

// Membaca data menu dari file saat bot dimulai
let menu = { menu: [] };
if (fs.existsSync(menuFilePath)) {
    const rawMenuData = fs.readFileSync(menuFilePath);
    menu = JSON.parse(rawMenuData);
}

// Fungsi untuk menyimpan data menu ke file
function saveMenuToFile() {
    fs.writeFileSync(menuFilePath, JSON.stringify(menu, null, 2));
}

// Fungsi untuk menyimpan data transaksi ke file
function saveTransaksiToFile() {
    fs.writeFileSync(transaksiFilePath, JSON.stringify(transaksiData, null, 2));
}

// Fungsi untuk menambah transaksi
function tambahTransaksi(userName) {
    if (!transaksiData[userName]) {
        transaksiData[userName] = { count: 0 };
    }
    transaksiData[userName].count++;
}

// Fungsi untuk menghapus anggota yang tidak aktif
async function removeInactiveUsers() {
    const chats = await client.getChats();
    const groupChats = chats.filter(chat => chat.isGroup);
    const inactivePeriod = 30 * 24 * 60 * 60 * 1000; // 30 hari dalam milidetik
    const warningPeriod = 7 * 24 * 60 * 60 * 1000; // 7 hari dalam milidetik

    for (const groupChat of groupChats) {
        const participants = await groupChat.participants;
        const currentTime = new Date().getTime();

        for (const participant of participants) {
            const contact = await client.getContactById(participant.id._serialized);
            const lastSeen = await contact.getLastSeen();

            if (lastSeen) {
                const inactiveTime = currentTime - lastSeen.getTime();
                if (inactiveTime >= inactivePeriod) {
                    await groupChat.sendMessage(`@${participant.id.user} telah tidak aktif selama lebih dari 30 hari dan akan dikeluarkan dari grup.`, {
                        mentions: [participant.id._serialized]
                    });
                    await groupChat.removeParticipants([participant.id._serialized]);
                } else if (inactiveTime >= (inactivePeriod - warningPeriod)) {
                    await groupChat.sendMessage(`@${participant.id.user}, Anda telah tidak aktif selama lebih dari ${Math.floor(inactiveTime / (24 * 60 * 60 * 1000))} hari. Mohon berinteraksi agar tidak dikeluarkan dari grup.`, {
                        mentions: [participant.id._serialized]
                    });
                }
            }
        }
    }
}

// Menjalankan fungsi untuk menghapus anggota yang tidak aktif setiap hari
setInterval(() => {
    removeInactiveUsers();
}, 24 * 60 * 60 * 1000); // Setiap 24 jam

// Menambahkan produk melalui pesan
client.on('message', async (message) => {
    const adminNumber = '6285714608649@c.us';
    const content = message.body;
    const chat = await message.getChat();

    // Membatasi bot hanya merespon di grup yang diizinkan
    if (chat.isGroup && !allowedGroups.includes(chat.id._serialized)) {
        return;
    }

    // Cek apakah pengirim adalah admin
    const fromAdmin = message.author === adminNumber || message.from === adminNumber;
    
    // Definisikan fungsi removeInappropriateMessages untuk menghindari error
    async function removeInappropriateMessages(message) {
        // Contoh logika untuk menghapus pesan yang tidak pantas atau promosi
        const inappropriateKeywords = ['promosi', 'iklan', 'spam'];
        const promotionRegex = /Rp\s?\d{1,3}(\.\d{3})*(\.000)?|\d+(\.\d+)?[kK]|\d+[rR][bB]|\b(bot|nomor whatsapp)\b/i;

        if (inappropriateKeywords.some(keyword => message.body.toLowerCase().includes(keyword)) || promotionRegex.test(message.body)) {
            await message.delete(true); // Menghapus pesan untuk semua orang
            if (chat.isGroup) {
                const participant = await client.getContactById(message.author || message.from);
                await chat.sendMessage(`@${participant.id.user}, pesan Anda melanggar aturan grup dan telah dihapus. Anda mendapatkan SP1.`, {
                    mentions: [participant.id._serialized]
                });

                // Simpan status peringatan pengguna
                if (!participant.warningCount) participant.warningCount = 0;
                participant.warningCount++;

                if (participant.warningCount >= 2) {
                    await chat.sendMessage(`@${participant.id.user} telah melanggar aturan grup sebanyak 2 kali dan akan dikeluarkan dari grup.`, {
                        mentions: [participant.id._serialized]
                    });
                    await chat.removeParticipants([participant.id._serialized]);
                }
            }
        }
    }

    // Hanya admin yang dapat mengirimkan larangan
    if (fromAdmin) {
        // Hapus pesan yang tidak pantas atau promosi
        await removeInappropriateMessages(message);
    }


    // Cek apakah pesan berasal dari admin
    if (message.author === adminNumber || message.from === adminNumber) {
        try {
            // Jika pesan dimulai dengan 'add '
            if (content.toLowerCase().startsWith('add ')) {
                const [, keywordProduk, detailProduk] = content.match(/^add\s+(\w+)\|(.*)/is) || [];

                if (keywordProduk && detailProduk) {
                    const keywordLower = keywordProduk.toLowerCase();
                    // Tambahkan produk ke menu atau update produk yang sudah ada
                    menu[keywordLower] = detailProduk.trim();
                    if (!menu["menu"].includes(keywordLower)) {
                        menu["menu"].push(keywordLower);
                    }
                    saveMenuToFile();
                    await message.reply(`Produk berhasil ditambahkan dengan keyword: ${keywordProduk}`);
                } else {
                    await message.reply('Format tidak sesuai. Gunakan format: add keywordproduk|detail produk');
                }
            }

            // Jika pesan dimulai dengan 'delete '
            if (content.toLowerCase().startsWith('delete ')) {
                const [, keywordProduk] = content.match(/^delete\s+(\w+)/is) || [];

                if (keywordProduk) {
                    const keywordLower = keywordProduk.toLowerCase();
                    // Hapus produk dari menu jika ada
                    if (menu["menu"].includes(keywordLower)) {
                        delete menu[keywordLower];
                        menu["menu"] = menu["menu"].filter(item => item !== keywordLower);
                        saveMenuToFile();
                        await message.reply(`Produk dengan keyword: ${keywordProduk} berhasil dihapus.`);
                    } else {
                        await message.reply(`Produk dengan keyword: ${keywordProduk} tidak ditemukan.`);
                    }
                } else {
                    await message.reply('Format tidak sesuai. Gunakan format: delete keywordproduk');
                }
            }

            // Jika pesan dimulai dengan 'updated '
            if (content.toLowerCase().startsWith('updated ')) {
                const [, keywordProduk, detailProduk] = content.match(/^updated\s+(\w+)\|(.*)/is) || [];

                if (keywordProduk && detailProduk) {
                    const keywordLower = keywordProduk.toLowerCase();
                    // Update produk yang sudah ada di menu
                    if (menu["menu"].includes(keywordLower)) {
                        menu[keywordLower] = detailProduk.trim();
                        saveMenuToFile();
                        await message.reply(`Produk dengan keyword: ${keywordProduk} berhasil diperbarui.`);
                    } else {
                        await message.reply(`Produk dengan keyword: ${keywordProduk} tidak ditemukan.`);
                    }
                } else {
                    await message.reply('Format tidak sesuai. Gunakan format: updated keywordproduk|detail produk');
                }
            }

            // Jika pesan dimulai dengan 'rename '
            if (content.toLowerCase().startsWith('rename ')) {
                const [, oldKeyword, newKeyword] = content.match(/^rename\s+(\w+)\s+(\w+)/is) || [];

                if (oldKeyword && newKeyword) {
                    const oldKeywordLower = oldKeyword.toLowerCase();
                    const newKeywordLower = newKeyword.toLowerCase();
                    // Rename produk yang sudah ada di menu
                    if (menu["menu"].includes(oldKeywordLower)) {
                        // Rename key produk dan update daftar menu
                        menu[newKeywordLower] = menu[oldKeywordLower];
                        delete menu[oldKeywordLower];
                        menu["menu"] = menu["menu"].map(item => item === oldKeywordLower ? newKeywordLower : item);
                        saveMenuToFile();
                        await message.reply(`Produk dengan keyword: ${oldKeyword} berhasil diubah menjadi: ${newKeyword}`);
                    } else {
                        await message.reply(`Produk dengan keyword: ${oldKeyword} tidak ditemukan.`);
                    }
                } else {
                    await message.reply('Format tidak sesuai. Gunakan format: rename keywordlama keywordbaru');
                }
            }

            // Jika pesan dimulai dengan 'h '
            if (content.toLowerCase().startsWith('h ')) {
                const [, keterangan] = content.match(/^h\s+(.*)/is) || [];

                if (keterangan) {
                    const chat = await message.getChat();
                    if (chat.isGroup) {
                        const participants = await chat.participants;
                        const mentions = participants.map(participant => participant.id._serialized);
                        await chat.sendMessage(keterangan, { mentions });
                    } else {
                        await message.reply('Fitur ini hanya dapat digunakan di grup.');
                    }
                } else {
                    await message.reply('Format tidak sesuai. Gunakan format: h keterangan');
                }
            }

            // Jika pesan dimulai dengan 'giveaway'
            if (content.toLowerCase().startsWith('giveaway')) {
                const [, jumlahPemenang] = content.match(/^giveaway\s+(\d+)/) || [];

                if (jumlahPemenang) {
                    const jumlah = parseInt(jumlahPemenang, 10);
                    const chat = await message.getChat();
                    if (chat.isGroup) {
                        const participants = await chat.participants.filter(participant => !participant.isAdmin && !participant.isSelf);
                        if (participants.length < jumlah) {
                            await message.reply('Jumlah peserta tidak cukup untuk memilih pemenang sebanyak itu.');
                            return;
                        }
                        const mentions = participants.map(participant => participant.id._serialized);

                        // Kirim pesan info giveaway dan mention semua anggota grup
                        await chat.sendMessage(`Giveaway dimulai! Akan dipilih ${jumlah} pemenang.`, { mentions });

                        // Pilih pemenang secara acak
                        const shuffledParticipants = participants.sort(() => 0.5 - Math.random());
                        const winners = shuffledParticipants.slice(0, jumlah);
                        const winnerMentions = winners.map(winner => winner.id._serialized);
                        const winnerNames = winners.map(winner => `@${winner.id.user}`).join(', ');

                        // Kirim pesan pemenang dan mention pemenang
                        await chat.sendMessage(
                            `🎉 Selamat kepada pemenang Giveaway KyPay Store! 🎉\n\n` +
                            `Terima kasih banyak untuk semua yang telah berpartisipasi dalam giveaway kali ini. Kami sangat senang melihat antusiasme dari kalian semua!\n\n` +
                            `Dan akhirnya, setelah melalui proses undian yang adil, kami dengan bangga mengumumkan pemenang giveaway kali ini adalah...\n\n` +
                            `🥳 ${winnerNames} 🥳\n\n` +
                            `Selamat! Anda telah memenangkan hadiah spesial dari KyPay Store! 🎁 Kami akan segera menghubungi Anda untuk proses pengiriman hadiah.\n\n` +
                            `Bagi yang belum beruntung, jangan khawatir, karena kami akan terus mengadakan giveaway dan event menarik lainnya. Jadi, tetap ikuti kami di KyPay Store dan nantikan kesempatan berikutnya!\n\n` +
                            `Sekali lagi, terima kasih dan sampai jumpa di event berikutnya! 🙌`,
                            { mentions: winnerMentions }
                        );
                    } else {
                        await message.reply('Fitur ini hanya dapat digunakan di grup.');
                    }
                } else {
                    await message.reply('Format tidak sesuai. Gunakan format: giveaway jumlahPemenang');
                }
            }
        } catch (error) {
            console.error('Error saat memproses perintah admin:', error);
            await message.reply('Terjadi kesalahan saat memproses perintah admin.');
        }
    } else {
        // Jika pengguna bukan admin dan mencoba menggunakan fitur khusus admin
        if (content.toLowerCase().startsWith('add ') || content.toLowerCase().startsWith('delete ') || content.toLowerCase().startsWith('updated ') || content.toLowerCase().startsWith('rename ') || content.toLowerCase().startsWith('h ') || content.toLowerCase().startsWith('giveaway')) {
            await message.reply('Fitur ini khusus untuk admin.');
        }
    }
});

// Ketika ada anggota yang masuk ke grup
client.on('group_join', async (notification) => {
    const chatId = notification.id.remote;
    const userId = notification.recipientIds[0];

    // Mengambil informasi tentang grup dan anggota yang masuk
    const chat = await client.getChatById(chatId);
    const contact = await client.getContactById(userId);

    // Membatasi bot hanya merespon di grup yang diizinkan
    if (!chat.isGroup || !allowedGroups.includes(chat.id._serialized)) {
        return;
    }

    // Mengirimkan pesan selamat datang
    const welcomeMessage = `
✨ Selamat datang di KyPay Store ✨

Halo @${contact.pushname || contact.number}, selamat bergabung! 🎮🔑

Di sini kamu bisa menemukan penawaran terbaik untuk top up game dan aplikasi premium favoritmu. Jangan ragu untuk bertanya dan cek penawaran menarik kami! 🔥💰
`;

    await chat.sendMessage(welcomeMessage, { mentions: [contact] });
});

// Menutup grup jika admin mengetikkan 'cl'
client.on('message', async (message) => {
    const chat = await message.getChat();
    const adminNumbers = ['6285714608649@c.us'];

    // Membatasi bot hanya merespon di grup yang diizinkan
    if (chat.isGroup && !allowedGroups.includes(chat.id._serialized)) {
        return;
    }

    if (message.body.toLowerCase() === 'cl' && chat.isGroup) {
        if (adminNumbers.includes(message.author || message.from)) {
            await chat.setMessagesAdminsOnly(true);
            const currentDate = new Date();
            const tanggal = currentDate.toLocaleDateString('id-ID');
            const jam = currentDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            const closeMessage = `
Group sukses ditutup 「 🔒 」
📆 TANGGAL: ${tanggal}
⏰ JAM    : ${jam} WIB
🔊 SILAHKAN CHATT ADMIN JIKA BUTUH SESUATU. JANGAN TRANSAKSI DI LUAR ADMIN❗
`;

            message.reply(closeMessage);

            // Jeda singkat sebelum mengirim pesan tambahan
            setTimeout(() => {
                const additionalMessage = `
- CLOSE ORDER -

💌 TERIMAKASIH YANG UDAH ORDER HARI INI
📢 ORDER BISA KEPM, DIBALAS JIKA MASIH MELEK

📞 Contact Admin:
Admin 1 : 6285714608649
Admin 2 : 6285810219251

Saluran : https://whatsapp.com/channel/0029Vas6KV1BqbrA3oyIC220
`;
                client.sendMessage(chat.id._serialized, additionalMessage);
            }, 500);
        } else {
            message.reply('Fitur ini khusus untuk admin.');
        }
    }

    // Membuka grup jika admin mengetikkan 'op'
    if (message.body.toLowerCase() === 'op' && chat.isGroup) {
        if (adminNumbers.includes(message.author || message.from)) {
            await chat.setMessagesAdminsOnly(false);
            const currentDate = new Date();
            const tanggal = currentDate.toLocaleDateString('id-ID');
            const jam = currentDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            const openMessage = `
Group sukses dibuka 「 🔓 」

📆 TANGGAL: ${tanggal}
⏰ JAM    : ${jam} WIB

🔊 TRANSAKSI HANYA MELALUI ADMIN GROUP❗. SELEBIHNYA BUKAN TANGGUNG JAWAB ADMIN
`;

            message.reply(openMessage);

            // Jeda singkat sebelum mengirim pesan tambahan
            setTimeout(async () => {
                const participants = await chat.participants;
                const mentions = participants.map(participant => participant.id._serialized);
                const additionalMessage = `
📢📢 𝕾𝖊𝖑𝖆𝖒𝖆𝖙 𝖕𝖆𝖌𝖎, 𝖙𝖗𝖝 𝖔𝖓 𝖞𝖆𝖓𝖌 𝖒𝖆𝖚 𝖔𝖗𝖉𝖊𝖗

- ORDER DI GRUP
- Tanyakan stok sebelum Transfer
- 95% item ready
- GARANSI KE PM
- Promo ? https://whatsapp.com/channel/0029Vas6KV1BqbrA3oyIC220
`;
                client.sendMessage(chat.id._serialized, additionalMessage, { mentions });
            }, 500);
        } else {
            message.reply('Fitur ini khusus untuk admin.');
        }
    }

    // Menampilkan menu jika anggota atau admin mengetikkan 'menu'
    if (message.body.toLowerCase() === 'menu') {
        const contact = await message.getContact();
        const userName = contact.pushname || 'Pengguna';
        const menuItems = menu["menu"].map(item => `📝  ${item.toUpperCase()}`).join('\n');
        const menuMessage = `
Halo kak ${userName} 👋, Berikut beberapa list yang tersedia saat ini.

📝  PAYMENT
${menuItems}

Dapatkan list dengan ketik list key yang tersedia di atas. 

Contoh : PAYMENT

                   ⏮️⏸⏩
💬 Group : KyPay Store🏪
⏰ Jam   : ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
━━━━━━━━ KyRaBot 🃏
`;

        // Mengirim pesan menu yang baru
        await message.reply(menuMessage);
    }

    // Menampilkan detail produk jika mengetikkan keyword produk
    if (menu["menu"].includes(message.body.toLowerCase()) && message.body.toLowerCase() !== 'menu') {
        const keywordProduk = message.body.toLowerCase();
        const detailProduk = menu[keywordProduk];
        await message.reply(`Detail produk untuk ${keywordProduk.toUpperCase()}:

${detailProduk}`);
    }

    // Menampilkan detail PAYMENT jika mengetikkan 'payment'
    if (message.body.toLowerCase() === 'payment') {
        const mediaPath = path.join(__dirname, 'images', 'qris.jpg'); // Path ke gambar QRIS
        const media = MessageMedia.fromFilePath(mediaPath);
        const paymentMessage = `
💳 PAYMENT :

· DANA – 085714608649 (GAL)
· GoPay1 - 085714608649  (NUR)
· GoPay2 - 085810219251  (GAL)
· Ovo - 085714608649  (NUR)
· Shopeepay - 085714608649 (NUR)
· Mandiri - 60012509679 (GAL)
· Qris - Lihat Gambar Diatas (LANGSKYA)

🗒 CARA ORDER:
TF - Screenshot - Bukti kirim ke Grup (kasih keterangan)

❗ Gak Ikutin Aturan , Order Gak Diproses
`;
        await client.sendMessage(message.from, media, { caption: paymentMessage });
    }

    // Sistem pembelian dengan verifikasi admin
    if (message.hasMedia && chat.isGroup) {
        const contact = await message.getContact();
        const userName = contact.pushname || 'Pengguna';
        const caption = message.body || 'Tidak ada keterangan';

        // Simpan pesan yang memiliki media untuk referensi
        const mediaMessage = message;

        // Tangkap event ketika admin mengirim balasan "P"
        client.on('message_create', async (msg) => {
            if (msg.hasQuotedMsg && msg.body.toLowerCase() === 'p' && adminNumbers.includes(msg.author || msg.from)) {
                const quotedMsg = await msg.getQuotedMessage();

                // Cek apakah pesan yang di-quote adalah pesan yang berisi media
                if (quotedMsg.id.id === mediaMessage.id.id) {
                    const currentDate = new Date();
                    const tanggal = currentDate.toLocaleDateString('id-ID');
                    const jam = currentDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    const pendingMessage = `
TRANSAKSI PENDING  「 ⏳ 」

📆 TANGGAL: ${tanggal}
⏰ JAM    : ${jam} WIB

📝 Catatan :
${caption} ✍

Pesanan @~${userName} ⍤⃝💐 sedang di proses!𓆩🖤𓆪
`;
                    quotedMsg.reply(pendingMessage);
                }
            }

            // Tangkap event ketika admin mengirim balasan "D" untuk transaksi berhasil
            if (msg.hasQuotedMsg && msg.body.toLowerCase() === 'd' && adminNumbers.includes(msg.author || msg.from)) {
                const quotedMsg = await msg.getQuotedMessage();
                const contact = await quotedMsg.getContact();
                const userName = quotedMsg.body.match(/Pesanan @(\S+)/)?.[1] || contact.pushname || 'Pengguna';

                // Cek apakah pesan yang di-quote adalah pesan transaksi pending
                if (quotedMsg.body.includes('TRANSAKSI PENDING')) {
                    // Jika transaksi belum pernah diproses atau jika pesan transaksi berbeda
                    if (!transaksiData[userName] || transaksiData[userName].lastProcessedMessageId !== quotedMsg.id.id) {
                        // Tambahkan transaksi ke data
                        tambahTransaksi(userName);
                        transaksiData[userName].lastProcessedMessageId = quotedMsg.id.id;
                        saveTransaksiToFile();

                        const jumlahTransaksi = transaksiData[userName].count;
                        const currentDate = new Date();
                        const tanggal = currentDate.toLocaleDateString('id-ID');
                        const jam = currentDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                        const successMessage = `
=============================
        TRANSAKSI BERHASIL ✅
=============================
📆 Tanggal : ${tanggal}
⏰ Jam     : ${jam} WIB

Terima kasih atas kepercayaan Anda, @${userName}.
Next order lagi ya, ditunggu! 🙏

Jumlah Transaksi : ${jumlahTransaksi}
=============================
        `;
                        await quotedMsg.reply(successMessage);
                    } else {
                        // Jika transaksi sudah diproses sebelumnya, abaikan untuk menghindari pengiriman ulang
                        console.log('Transaksi ini sudah diproses sebelumnya, abaikan.');
                    }
                }
            }

            // Fungsi untuk mengumumkan pemenang transaksi terbanyak setiap bulan
            function umumkanPemenang() {
                // Urutkan pengguna berdasarkan jumlah transaksi
                const sortedUsers = Object.entries(transaksiData).sort((a, b) => b[1].count - a[1].count);
                const pemenang = sortedUsers.slice(0, 3);

                let pengumuman = '🎉 PENGUMUMAN PEMENANG TRANSAKSI BULAN INI 🎉\n\n';
                if (pemenang.length > 0) {
                    if (pemenang[0]) {
                        pengumuman += `🥇 Peringkat 1: @${pemenang[0][0]} - Mendapatkan DANA Rp 10.000\n`;
                    }
                    if (pemenang[1]) {
                        pengumuman += `🥈 Peringkat 2: @${pemenang[1][0]} - Mendapatkan DANA Rp 5.000\n`;
                    }
                    if (pemenang[2]) {
                        pengumuman += `🥉 Peringkat 3: @${pemenang[2][0]} - Mendapatkan DANA Rp 2.500\n`;
                    }
                } else {
                    pengumuman += 'Belum ada transaksi yang tercatat bulan ini. Ayo tingkatkan transaksi Anda!';
                }

                pengumuman += '\n\nTerima kasih kepada semua anggota atas partisipasinya! 🎊';

                // Kirim pengumuman ke grup
                client.getChats().then(chats => {
                    const groupChat = chats.find(chat => chat.isGroup);
                    if (groupChat) {
                        client.sendMessage(groupChat.id._serialized, pengumuman, {
                            mentions: pemenang.map(p => ({ id: `${p[0]}@c.us` }))
                        });
                    }
                });
            }

            // Menjadwalkan pengumuman pemenang setiap bulan
            setInterval(() => {
                const currentDate = new Date();
                if (currentDate.getDate() === 1 && currentDate.getHours() === 9 && currentDate.getMinutes() === 0) {
                    umumkanPemenang();
                    // Reset transaksi bulanan setelah pengumuman
                    transaksiData = {};
                    saveTransaksiToFile();
                }
            }, 60000);


        });
    }

    // Hapus link yang berisi http, https, atau wa.me dan kick anggota yang mengirimkannya
    if ((message.body.includes('http://') || message.body.includes('https://') || message.body.includes('wa.me')) && chat.isGroup) {
        const warningMessage = `
ANTI LINK 「 📵 」

Link terdeteksi, maaf kamu akan di kick !
`;
        message.reply(warningMessage);
        const contact = await message.getContact();
        await chat.removeParticipants([contact.id._serialized]);
        await message.delete(true);
    }
});

// Mulai menjalankan bot
client.initialize();
