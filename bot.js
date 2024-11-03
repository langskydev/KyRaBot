const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const Tesseract = require('tesseract.js');
const PDFDocument = require('pdfkit'); // Add pdfkit module for PDF creation

// Membuat client baru menggunakan LocalAuth untuk autentikasi
const client = new Client({
    authStrategy: new LocalAuth()
});

// Define the group ID and the allowed group admin ID
const groupId = '120363336251818783@g.us';
const allowedNumber = '6285714608649';

// Load existing payment options from JSON file
const paymentFilePath = path.join(__dirname, 'data', 'payment', 'paymentOptions.json');
if (!fs.existsSync(path.dirname(paymentFilePath))) {
    fs.mkdirSync(path.dirname(paymentFilePath), { recursive: true });
}

if (fs.existsSync(paymentFilePath)) {
    try {
        paymentOptions = JSON.parse(fs.readFileSync(paymentFilePath, 'utf-8'));
    } catch (error) {
        console.error('Error reading payment options:', error);
        paymentOptions = [];
    }
}

// Load existing product options from JSON file
const productFilePath = path.join(__dirname, 'data', 'produk', 'produkOptions.json');
if (!fs.existsSync(path.dirname(productFilePath))) {
    fs.mkdirSync(path.dirname(productFilePath), { recursive: true });
}
let productOptions = [];
if (fs.existsSync(productFilePath)) {
    try {
        productOptions = JSON.parse(fs.readFileSync(productFilePath, 'utf-8'));
    } catch (error) {
        console.error('Error reading product options:', error);
        productOptions = [];
    }
}

// Load existing balance from JSON file
const balanceFilePath = path.join(__dirname, 'data', 'admin', 'balance.json');
if (!fs.existsSync(path.dirname(balanceFilePath))) {
    fs.mkdirSync(path.dirname(balanceFilePath), { recursive: true });
}
let balance = 0;
let transactionHistory = [];
if (fs.existsSync(balanceFilePath)) {
    try {
        const balanceData = JSON.parse(fs.readFileSync(balanceFilePath, 'utf-8'));
        balance = balanceData.balance;
        transactionHistory = balanceData.transactionHistory || [];
    } catch (error) {
        console.error('Error reading balance:', error);
        balance = 0;
        transactionHistory = [];
    }
}

// Load debt data from JSON file
const debtFilePath = path.join(__dirname, 'data', 'admin', 'debt.json');
if (!fs.existsSync(path.dirname(debtFilePath))) {
    fs.mkdirSync(path.dirname(debtFilePath), { recursive: true });
}
let debtData = [];
if (fs.existsSync(debtFilePath)) {
    try {
        debtData = JSON.parse(fs.readFileSync(debtFilePath, 'utf-8'));
    } catch (error) {
        console.error('Error reading debt data:', error);
        debtData = [];
    }
}

// Adding the badword and image restriction features
const badwordFilePath = path.join(__dirname, 'data', 'admin', 'badwords.json');
let badwords = [];
let antibadwordEnabled = false;

// Load existing badwords and restricted images from JSON files
if (!fs.existsSync(path.dirname(badwordFilePath))) {
    fs.mkdirSync(path.dirname(badwordFilePath), { recursive: true });
}
if (fs.existsSync(badwordFilePath)) {
    try {
        badwords = JSON.parse(fs.readFileSync(badwordFilePath, 'utf-8'));
    } catch (error) {
        console.error('Error reading badwords:', error);
        badwords = [];
    }
}

// File path for storing group details
const groupDetailsFilePath = path.join(__dirname, 'data', 'admin', 'groupDetails.json');
if (!fs.existsSync(path.dirname(groupDetailsFilePath))) {
    fs.mkdirSync(path.dirname(groupDetailsFilePath), { recursive: true });
}
let groupDetails = [];
if (fs.existsSync(groupDetailsFilePath)) {
    try {
        groupDetails = JSON.parse(fs.readFileSync(groupDetailsFilePath, 'utf-8'));
    } catch (error) {
        console.error('Error reading group details:', error);
        groupDetails = [];
    }
}

let awaitingBadwordInput = false;
let promoteInterval = null;

// Fungsi format Rupiah
function formatRupiah(amount) {
    return 'Rp' + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Event untuk memunculkan QR code pada terminal untuk autentikasi
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

// Event untuk client ketika berhasil terhubung
client.on('ready', () => {
    console.log('WhatsApp bot is ready!');
});

// Event ketika anggota baru masuk grup
client.on('group_join', async (notification) => {
    const chat = await client.getChatById(notification.chatId);
    const contact = await client.getContactById(notification.recipientIds[0]);

    // Hanya aktif di grup dengan ID berikut
    if (notification.chatId === '120363336251818783@g.us') {
        // Pesan sambutan untuk anggota yang baru masuk
        const welcomeMessage = `
*✨ Selamat datang di KyPay Store ✨*

Halo @${contact.pushname || contact.number}, selamat bergabung! 🎮🔑

Di sini kamu bisa menemukan penawaran terbaik untuk top up game dan aplikasi premium favoritmu dengan cara ketik *?menu*. Jangan ragu untuk bertanya dan cek penawaran menarik kami! 🔥💰
`;

        if (chat.isGroup) {
            chat.sendMessage(welcomeMessage, {
                mentions: [contact]
            });
        }
    }
});

// Event ketika admin mengirim foto dengan keterangan #setpp atau mengubah deskripsi dengan #setdesgc atau mengubah nama grup dengan #setname atau menyetel ulang link dengan #reset atau menutup grup dengan cl atau membuka grup dengan op
client.on('message', async (msg) => {
    const chat = await msg.getChat();

    // Hanya aktif di grup dengan ID berikut
    if (chat.id._serialized === '120363336251818783@g.us') {
        switch (true) {
            case (msg.hasMedia && msg.body === '#setpp'): {
                const isAdmin = msg.author === undefined || chat.participants.find(participant => participant.id._serialized === msg.author).isAdmin;
                if (isAdmin) {
                    const media = await msg.downloadMedia();
                    await chat.setPicture(media);
                    msg.reply('*Foto profil grup berhasil diperbarui!*');
                } else {
                    const contact = await client.getContactById(msg.author);
                    chat.sendMessage(`@${contact.pushname || contact.number}, hanya admin yang dapat menggunakan perintah ini.`, {
                        mentions: [contact]
                    });
                }
                break;
            }
            case (msg.body.startsWith('#setdesgc | ')): {
                const isAdmin = msg.author === undefined || chat.participants.find(participant => participant.id._serialized === msg.author).isAdmin;
                if (isAdmin) {
                    const newDescription = msg.body.split('|')[1].trim();
                    await chat.setDescription(newDescription);
                    msg.reply('*Deskripsi grup berhasil diperbarui!*');
                } else {
                    const contact = await client.getContactById(msg.author);
                    chat.sendMessage(`@${contact.pushname || contact.number}, hanya admin yang dapat menggunakan perintah ini.`, {
                        mentions: [contact]
                    });
                }
                break;
            }
            case (msg.body.startsWith('#setname | ')): {
                const isAdmin = msg.author === undefined || chat.participants.find(participant => participant.id._serialized === msg.author).isAdmin;
                if (isAdmin) {
                    const newName = msg.body.split('|')[1].trim();
                    await chat.setSubject(newName);
                    msg.reply('*Nama grup berhasil diperbarui!*');
                } else {
                    const contact = await client.getContactById(msg.author);
                    chat.sendMessage(`@${contact.pushname || contact.number}, hanya admin yang dapat menggunakan perintah ini.`, {
                        mentions: [contact]
                    });
                }
                break;
            }
            case (msg.body === '#reset'): {
                const isAdmin = msg.author === undefined || chat.participants.find(participant => participant.id._serialized === msg.author).isAdmin;
                if (isAdmin) {
                    await chat.revokeInvite();
                    msg.reply('*Link undangan grup berhasil disetel ulang!*');
                } else {
                    const contact = await client.getContactById(msg.author);
                    chat.sendMessage(`@${contact.pushname || contact.number}, hanya admin yang dapat menggunakan perintah ini.`, {
                        mentions: [contact]
                    });
                }
                break;
            }
            case (msg.body.startsWith('h ')): {
                const isAdmin = msg.author === undefined || chat.participants.find(participant => participant.id._serialized === msg.author).isAdmin;
                if (isAdmin) {
                    const messageContent = msg.body.slice(2).trim();
                    const mentions = await Promise.all(chat.participants.map(async (participant) => await client.getContactById(participant.id._serialized)));
                    chat.sendMessage(messageContent, {
                        mentions: mentions
                    });
                } else {
                    const contact = await client.getContactById(msg.author);
                    chat.sendMessage(`@${contact.pushname || contact.number}, hanya admin yang dapat menggunakan perintah ini.`, {
                        mentions: [contact]
                    });
                }
                break;
            }
            case (msg.body === 'cl'): {
                const isAdmin = msg.author === undefined || chat.participants.find(participant => participant.id._serialized === msg.author).isAdmin;
                if (isAdmin) {
                    await chat.setMessagesAdminsOnly(true);
                    const now = new Date();
                    const tanggal = now.toLocaleDateString('id-ID');
                    const jam = now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' });
                    const lockMessage = `
Grup sukses ditutup 「 🔒 」

📆 TANGGAL: ${tanggal}
⏰ WAKTU: ${jam} WIB

📌 Informasi: Terima kasih kepada seluruh anggota yang telah melakukan transaksi! Jika ada kebutuhan atau ingin melakukan pembelian, silakan hubungi admin. Demi keamanan, transaksi hanya melalui admin❗
`;
                    chat.sendMessage(lockMessage);
                    setTimeout(() => {
                        const closingMessage = `
⏳ ORDER SEMENTARA DITUTUP ⏳
💌 Terima kasih untuk setiap order hari ini! Kami siap melayani Anda kembali di kesempatan berikutnya.
📢 Untuk pemesanan, kirim saja pesan ke PM, admin akan merespon ketika aktif.
📞 Kontak Admin:
• Admin 1: +6285714608649
• Admin 2: +6285810219251
🔗 Saluran WhatsApp: https://whatsapp.com/channel/0029Vas6KV1BqbrA3oyIC220
`;
                        chat.sendMessage(closingMessage);
                    }, 1000);
                } else {
                    const contact = await client.getContactById(msg.author);
                    chat.sendMessage(`@${contact.pushname || contact.number}, hanya admin yang dapat menggunakan perintah ini.`, {
                        mentions: [contact]
                    });
                }
                break;
            }
            case (msg.body === 'op'): {
                const isAdmin = msg.author === undefined || chat.participants.find(participant => participant.id._serialized === msg.author).isAdmin;
                if (isAdmin) {
                    await chat.setMessagesAdminsOnly(false);
                    const now = new Date();
                    const tanggal = now.toLocaleDateString('id-ID');
                    const jam = now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' });
                    const unlockMessage = `
Group sukses dibuka 「 🔓 」

📆 TANGGAL: ${tanggal}
⏰ JAM    : ${jam} WIB

🔊 TRANSAKSI HANYA MELALUI ADMIN GROUP❗. SELEBIHNYA BUKAN TANGGUNG JAWAB ADMIN
`;
                    chat.sendMessage(unlockMessage);
                    setTimeout(() => {
                        const greetingMessage = `
📢📢 ${chat.name} 📢📢
💥 Selamat ${(jam.startsWith('0') || parseInt(jam.split(':')[0]) < 12) ? 'pagi' : (parseInt(jam.split(':')[0]) < 15) ? 'siang' : (parseInt(jam.split(':')[0]) < 18) ? 'sore' : 'malam'}! Order GRUP! 💥
💌 Cara Order:
• ORDER langsung di grup ini
• Pastikan cek stok dulu sebelum Transfer
• 𝟗𝟓% item READY dan segera dikirim setelah pembayaran
📞 Untuk Layanan dan Garansi: Hubungi admin di PM jika ada yang perlu dibantu!
Promo terbaru bisa dicek di:
https://whatsapp.com/channel/0029Vas6KV1BqbrA3oyIC220
`;
                        chat.sendMessage(greetingMessage);
                    }, 1000);
                } else {
                    const contact = await client.getContactById(msg.author);
                    chat.sendMessage(`@${contact.pushname || contact.number}, hanya admin yang dapat menggunakan perintah ini.`, {
                        mentions: [contact]
                    });
                }
                break;
            }
        }
    }
});

client.on('message', async (msg) => {
    const chat = await msg.getChat();
    const sender = await msg.getContact();

    // Regular expression to detect http, https, and wa.me links
    const linkPattern = /(http:\/\/|https:\/\/|wa\.me\/)\S+/gi;

    // Anti-link feature for group chats
    if (chat.isGroup && linkPattern.test(msg.body)) {
        // Check if the sender is an admin
        const participants = await chat.participants;
        const senderIsAdmin = participants.some(participant => participant.id._serialized === sender.id._serialized && participant.isAdmin);

        if (!senderIsAdmin) {
            // Delete the message that contains the link
            await msg.delete(true);

            // Send warning message to the group
            chat.sendMessage(`ANTI LINK 「 🔵 」\n\nLink terdeteksi, maaf @${sender.id.user} kamu akan di kick!`, { mentions: [sender] });

            // Kick the member who sent the link
            await chat.removeParticipants([sender.id._serialized]);
        }
    }

    // Batasi fitur hanya untuk grup tertentu
    if (chat.isGroup && chat.id._serialized === '120363336251818783@g.us') {
        switch (msg.body.toLowerCase()) {
            case 'menu':
                let serviceList = `Halo Kak @${msg.author || msg.from}! 👋
Berikut beberapa list layanan yang tersedia saat ini di ${chat.name} 🏦
✍️ Daftar Layanan:
• PAYMENT - Untuk melihat opsi pembayaran
`;

                // Tambahkan daftar produk ke dalam menu (hanya keywordnya)
                productOptions.forEach((product) => {
                    serviceList += `• ${product.keyword.toUpperCase()}
`;
                });

                serviceList += `
Cara Mendapatkan Info:
Ketik list key sesuai layanan yang diinginkan di atas.
Contoh: Ketik PAYMENT untuk melihat opsi pembayaran.
━━━━━━━━
📍 Group: ${chat.name}
⏰ Jam: ${new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB
KyRaBot တ`;

                msg.reply(serviceList);
                break;

            case 'payment':
                // Kirim gambar QRIS jika tersedia dengan caption yang mencakup opsi pembayaran
                const qrisPayment = paymentOptions.find(payment => payment.image);
                if (qrisPayment) {
                    let paymentList = '💳 PAYMENT OPTIONS:\n';
                    paymentOptions.forEach((payment) => {
                        if (!payment.image) {
                            paymentList += `• ${payment.name} - ${payment.number} (${payment.holder})\n`;
                        }
                    });
                    const mediaPath = path.join(__dirname, 'images', 'qr', qrisPayment.image.filename);
                    if (fs.existsSync(mediaPath)) {
                        const media = MessageMedia.fromFilePath(mediaPath);
                        chat.sendMessage(media, { caption: paymentList + '\n📜 CARA ORDER:\n1. Lakukan transfer sesuai pilihan pembayaran.\n2. Screenshot bukti transfer.\n3. Kirim bukti pembayaran ke grup dengan keterangan order.\n\n❗ Catatan: Pesanan tidak akan diproses jika aturan tidak diikuti.' });
                    } else {
                        msg.reply('Gambar QRIS tidak ditemukan.');
                    }
                } else {
                    let paymentList = '💳 PAYMENT OPTIONS:\n';
                    if (paymentOptions.length > 0) {
                        paymentOptions.forEach((payment) => {
                            if (!payment.image) {
                                paymentList += `• ${payment.name} - ${payment.number} (${payment.holder})\n`;
                            }
                        });
                    } else {
                        paymentList += 'Belum ada metode pembayaran yang ditambahkan.\n';
                    }

                    const orderInstructions = `\n📜 CARA ORDER:\n1. Lakukan transfer sesuai pilihan pembayaran.\n2. Screenshot bukti transfer.\n3. Kirim bukti pembayaran ke grup dengan keterangan order.\n\n❗ Catatan: Pesanan tidak akan diproses jika aturan tidak diikuti.`;
                    msg.reply(paymentList + orderInstructions);
                }
                break;

            default:
                // Cek apakah pesan sesuai dengan keyword produk
                const product = productOptions.find(prod => prod.keyword.toLowerCase() === msg.body.toLowerCase());
                if (product) {
                    msg.reply(`📦 Detail Produk:
${product.detail}`);
                }
                break;
        }
    }

    // Jika pesan berasal dari chat pribadi
    if (!chat.isGroup) {
        const parts = msg.body.split('|');
        switch (parts[0].trim().toLowerCase()) {
            case 'add':
                if (parts.length === 5 && parts[1].trim().toLowerCase() === 'payment') {
                    const paymentName = parts[2].trim();
                    const paymentNumber = parts[3].trim();
                    const paymentHolder = parts[4].trim();

                    // Menambahkan metode pembayaran ke list
                    paymentOptions.push({ name: paymentName, number: paymentNumber, holder: paymentHolder });

                    // Menyimpan metode pembayaran ke file JSON secara asynchronous untuk mencegah blocking
                    fs.writeFile(paymentFilePath, JSON.stringify(paymentOptions, null, 2), (error) => {
                        if (error) {
                            console.error('Error saving payment options:', error);
                            msg.reply('Terjadi kesalahan saat menyimpan metode pembayaran.');
                        } else {
                            msg.reply(`Metode pembayaran berhasil ditambahkan:\n💳 ${paymentName} - ${paymentNumber} (${paymentHolder})`);
                        }
                    });
                } else if (parts.length === 3 && parts[1].trim().toLowerCase() === 'qris') {
                    // Meminta gambar QRIS setelah menambahkan metode pembayaran QRIS
                    msg.reply('Silahkan masukan gambar QRIS dengan keterangan #qr');
                } else if (parts.length === 3) {
                    const productKeyword = parts[1].trim();
                    const productDetail = parts[2].trim();

                    // Menambahkan produk ke list
                    productOptions.push({ keyword: productKeyword, detail: productDetail });

                    // Menyimpan produk ke file JSON secara asynchronous untuk mencegah blocking
                    fs.writeFile(productFilePath, JSON.stringify(productOptions, null, 2), (error) => {
                        if (error) {
                            console.error('Error saving product options:', error);
                            msg.reply('Terjadi kesalahan saat menyimpan produk.');
                        } else {
                            msg.reply(`Produk berhasil ditambahkan:\n📦 ${productKeyword} - ${productDetail}`);
                        }
                    });
                } else {
                    msg.reply('Format tidak valid. Gunakan format: add | payment | nama payment | nomor | atas nama atau add | keywordproduk | detailproduk');
                }
                break;

            case '#qr':
                if (msg.hasMedia) {
                    const media = await msg.downloadMedia();
                    if (media) {
                        // Menambahkan QRIS ke daftar metode pembayaran
                        const imagePath = path.join(__dirname, 'images', 'qr');
                        if (!fs.existsSync(imagePath)) {
                            fs.mkdirSync(imagePath, { recursive: true });
                        }
                        const filename = `qris_${Date.now()}.jpg`;
                        const fullImagePath = path.join(imagePath, filename);

                        fs.writeFileSync(fullImagePath, media.data, { encoding: 'base64' });

                        paymentOptions.push({ name: 'QRIS', image: { mimetype: media.mimetype, data: media.data, filename } });

                        // Menyimpan metode pembayaran ke file JSON secara asynchronous untuk mencegah blocking
                        fs.writeFile(paymentFilePath, JSON.stringify(paymentOptions, null, 2), (error) => {
                            if (error) {
                                console.error('Error saving payment options:', error);
                                msg.reply('Terjadi kesalahan saat menyimpan gambar QRIS.');
                            } else {
                                msg.reply('Gambar QRIS berhasil ditambahkan ke opsi pembayaran.');
                            }
                        });
                    }
                }
                break;

            case 'update':
                if (parts.length === 5 && parts[1].trim().toLowerCase() === 'payment') {
                    const oldPaymentName = parts[1].trim();
                    const newPaymentName = parts[2].trim();
                    const newPaymentNumber = parts[3].trim();
                    const newPaymentHolder = parts[4].trim();

                    const paymentIndex = paymentOptions.findIndex(payment => payment.name.toLowerCase() === oldPaymentName.toLowerCase());
                    if (paymentIndex !== -1) {
                        paymentOptions[paymentIndex] = {
                            ...paymentOptions[paymentIndex],
                            name: newPaymentName,
                            number: newPaymentNumber,
                            holder: newPaymentHolder
                        };

                        // Menyimpan perubahan ke file JSON
                        fs.writeFile(paymentFilePath, JSON.stringify(paymentOptions, null, 2), (error) => {
                            if (error) {
                                console.error('Error updating payment options:', error);
                                msg.reply('Terjadi kesalahan saat mengupdate metode pembayaran.');
                            } else {
                                msg.reply(`Metode pembayaran berhasil diupdate:
    💳 ${newPaymentName} - ${newPaymentNumber} (${newPaymentHolder})`);
                            }
                        });
                    } else {
                        msg.reply(`Metode pembayaran dengan nama "${oldPaymentName}" tidak ditemukan.`);
                    }
                } else if (parts.length === 3) {
                    const productKeyword = parts[1].trim();
                    const productDetail = parts[2].trim();

                    const productIndex = productOptions.findIndex(prod => prod.keyword.toLowerCase() === productKeyword.toLowerCase());
                    if (productIndex !== -1) {
                        productOptions[productIndex] = {
                            ...productOptions[productIndex],
                            detail: productDetail
                        };

                        // Menyimpan perubahan ke file JSON
                        fs.writeFile(productFilePath, JSON.stringify(productOptions, null, 2), (error) => {
                            if (error) {
                                console.error('Error updating product options:', error);
                                msg.reply('Terjadi kesalahan saat mengupdate produk.');
                            } else {
                                msg.reply(`Produk berhasil diupdate:
    📦 ${productKeyword} - ${productDetail}`);
                            }
                        });
                    } else {
                        msg.reply(`Produk dengan keyword "${productKeyword}" tidak ditemukan.`);
                    }
                } else {
                    msg.reply('Format tidak valid. Gunakan format: update | payment | nama pembayaran sebelumnya | nama pembayaran baru | nomor pembayaran baru | atas nama baru atau update | keywordproduk | detailproduk');
                }
                break;

            case '#uqr':
                if (msg.hasMedia) {
                    const media = await msg.downloadMedia();
                    if (media) {
                        // Mengupdate QRIS di daftar metode pembayaran
                        const qrisIndex = paymentOptions.findIndex(payment => payment.name.toLowerCase() === 'qris');
                        if (qrisIndex !== -1) {
                            const imagePath = path.join(__dirname, 'images', 'qr');
                            if (!fs.existsSync(imagePath)) {
                                fs.mkdirSync(imagePath, { recursive: true });
                            }
                            const filename = `qris_${Date.now()}.jpg`;
                            const fullImagePath = path.join(imagePath, filename);

                            fs.writeFileSync(fullImagePath, media.data, { encoding: 'base64' });

                            paymentOptions[qrisIndex].image = { mimetype: media.mimetype, data: media.data, filename };

                            // Menyimpan perubahan ke file JSON
                            fs.writeFile(paymentFilePath, JSON.stringify(paymentOptions, null, 2), (error) => {
                                if (error) {
                                    console.error('Error updating QRIS payment option:', error);
                                    msg.reply('Terjadi kesalahan saat mengupdate gambar QRIS.');
                                } else {
                                    msg.reply('Gambar QRIS berhasil diupdate.');
                                }
                            });
                        } else {
                            msg.reply('Metode pembayaran QRIS tidak ditemukan.');
                        }
                    }
                }
                break;

            case 'delete':
                if (parts.length === 2) {
                    const keywordToDelete = parts[1].trim().toLowerCase();

                    if (keywordToDelete === 'qris') {
                        // Menghapus metode pembayaran QRIS
                        const qrisIndex = paymentOptions.findIndex(payment => payment.name.toLowerCase() === 'qris');
                        if (qrisIndex !== -1) {
                            const mediaPath = path.join(__dirname, 'images', 'qr', paymentOptions[qrisIndex].image.filename);
                            if (fs.existsSync(mediaPath)) {
                                fs.unlinkSync(mediaPath);
                            }
                            paymentOptions.splice(qrisIndex, 1);

                            // Menyimpan perubahan ke file JSON
                            fs.writeFile(paymentFilePath, JSON.stringify(paymentOptions, null, 2), (error) => {
                                if (error) {
                                    console.error('Error deleting QRIS payment option:', error);
                                    msg.reply('Terjadi kesalahan saat menghapus QRIS.');
                                } else {
                                    msg.reply('Metode pembayaran QRIS berhasil dihapus.');
                                }
                            });
                        } else {
                            msg.reply('Metode pembayaran QRIS tidak ditemukan.');
                        }
                    } else {
                        // Menghapus metode pembayaran atau produk
                        const paymentIndex = paymentOptions.findIndex(payment => payment.name.toLowerCase() === keywordToDelete);
                        if (paymentIndex !== -1) {
                            paymentOptions.splice(paymentIndex, 1);

                            // Menyimpan perubahan ke file JSON
                            fs.writeFile(paymentFilePath, JSON.stringify(paymentOptions, null, 2), (error) => {
                                if (error) {
                                    console.error('Error deleting payment option:', error);
                                    msg.reply('Terjadi kesalahan saat menghapus metode pembayaran.');
                                } else {
                                    msg.reply(`Metode pembayaran ${parts[1].trim()} berhasil dihapus.`);
                                }
                            });
                        } else {
                            const productIndex = productOptions.findIndex(prod => prod.keyword.toLowerCase() === keywordToDelete);
                            if (productIndex !== -1) {
                                productOptions.splice(productIndex, 1);

                                // Menyimpan perubahan ke file JSON
                                fs.writeFile(productFilePath, JSON.stringify(productOptions, null, 2), (error) => {
                                    if (error) {
                                        console.error('Error deleting product option:', error);
                                        msg.reply('Terjadi kesalahan saat menghapus produk.');
                                    } else {
                                        msg.reply(`Produk dengan keyword "${parts[1].trim()}" berhasil dihapus.`);
                                    }
                                });
                            } else {
                                msg.reply(`Metode pembayaran atau produk dengan nama "${parts[1].trim()}" tidak ditemukan.`);
                            }
                        }
                    }
                } else {
                    msg.reply('Format tidak valid. Gunakan format: delete | nama pembayaran atau delete | keywordproduk');
                }
                break;
        }
    }
});

client.on('message', async (message) => {
    const chat = await message.getChat();

    // Only proceed if the message is from the allowed group
    if (!chat.isGroup || chat.id._serialized !== groupId) {
        return;
    }

    switch (true) {
        case message.hasMedia: {
            const media = await message.downloadMedia();
            const namaAnggota = message._data.notifyName;
            const caption = message.body;

            // Simpan media ke folder "images/(nama anggota)"
            const folderPath = path.join(__dirname, 'images', namaAnggota);
            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath, { recursive: true });
            }
            const innerFolderPath = path.join(folderPath, 'bukti_tf');
            if (!fs.existsSync(innerFolderPath)) {
                fs.mkdirSync(innerFolderPath, { recursive: true });
            }
            const fileName = `bukti_tf_${Date.now()}.jpeg`;
            const filePath = path.join(innerFolderPath, fileName);

            fs.writeFile(filePath, media.data, { encoding: 'base64' }, (err) => {
                if (err) {
                    console.error('Error saving the file:', err);
                    message.reply('Terjadi kesalahan saat menyimpan bukti transfer.');
                }
            });

            message.originalCaption = caption || ''; // Simpan caption atau kosong jika tidak ada
            break;
        }
        case message.body.toUpperCase() === 'P' && message.hasQuotedMsg: {
            const contact = await message.getContact();
            const isAdmin = chat.isGroup && chat.participants.some(participant => participant.id._serialized === contact.id._serialized && participant.isAdmin);
            if (!isAdmin) {
                message.reply('Hanya admin grup yang dapat menggunakan perintah ini.');
                break;
            }
            const quotedMsg = await message.getQuotedMessage();
            if (quotedMsg.hasMedia) {
                const namaAnggota = quotedMsg._data.notifyName;
                const originalCaption = quotedMsg.body || ''; // Simpan caption asli jika ada
                const orderNumber = Math.floor(Math.random() * 1000000);
                const estimatedTime = Math.floor(Math.random() * 10) + 1;

                const statusMessage = `*STATUS PESANAN: PENDING* ⏳

🔢 *Nomor Pesanan:* #${orderNumber}
📦 *Estimasi Selesai:* ${estimatedTime} menit
💳 *Status Pembayaran:* Sudah Dibayar ✅
📝 *Catatan:*
${originalCaption}

Pesanan @${quotedMsg.author ? quotedMsg.author.split('@')[0] : namaAnggota.replace(/ /g, '')} 🌺✨ sedang diproses! Terima kasih atas kesabarannya. 𓆩💙𓆪`;

                quotedMsg.reply(statusMessage);

                quotedMsg.orderNumber = orderNumber;
                quotedMsg.originalCaption = originalCaption; // Simpan ini untuk digunakan nanti pada perintah 'D'
            }
            break;
        }
        case message.body.toUpperCase() === 'D' && message.hasQuotedMsg: {
            const contact = await message.getContact();
            const isAdmin = chat.isGroup && chat.participants.some(participant => participant.id._serialized === contact.id._serialized && participant.isAdmin);
            if (!isAdmin) {
                message.reply('Hanya admin grup yang dapat menggunakan perintah ini.');
                break;
            }
            const quotedMsg = await message.getQuotedMessage();
            if (quotedMsg.body.includes('*STATUS PESANAN: PENDING*')) {
                const orderNumberMatch = quotedMsg.body.match(/#(\d+)/);
                const orderNumber = orderNumberMatch ? orderNumberMatch[1] : 'Unknown';
                const tanggal = new Date().toLocaleDateString('id-ID');
                const jam = new Date().toLocaleTimeString('id-ID');
                const namaAnggota = quotedMsg.body.match(/Pesanan @(\S+)/)[1];

                const successMessage = `*TRANSAKSI BERHASIL* 「✅」

🎉 *Selamat!*
Pesanan Anda telah berhasil diproses.

🔢 *Nomor Pesanan:* #${orderNumber}
📆 *Tanggal Transaksi:* ${tanggal}
⏰ *Jam:* ${jam} WIB

Pesanan @${namaAnggota.replace(/ /g, '')} 🌸✨ akan segera dikirim! Terima kasih atas kepercayaannya.𓆩💚𓆪`;

                quotedMsg.reply(successMessage);
            }
            break;
        }
        default:
            break;
    }
});

// Event untuk client ketika berhasil terhubung
client.on('ready', () => {

    // Check for due debts and send reminders
    const today = new Date().toISOString().split('T')[0];
    debtData.forEach(debt => {
        if (debt.jatuhTempo === today) {
            const contactNumber = debt.nomorWhatsApp.replace(/^0/, '+62');
            const reminderMessage = `Halo ${debt.namaPengutang}, ini adalah pengingat bahwa Anda memiliki utang sebesar Rp${debt.totalUtang} yang jatuh tempo hari ini. Mohon segera melakukan pembayaran. Terima kasih.`;

            client.sendMessage(contactNumber + '@c.us', reminderMessage).then(() => {
                console.log(`Pengingat utang telah dikirim ke ${debt.namaPengutang} (${debt.nomorWhatsApp}).`);
            }).catch((error) => {
                console.error('Error sending reminder message:', error);
            });

            // Start 5-minute timeout for response
            debt.timeoutId = setTimeout(() => {
                debtData = debtData.filter(d => d !== debt);
                fs.writeFile(debtFilePath, JSON.stringify(debtData, null, 2), (error) => {
                    if (error) {
                        console.error('Error updating debt data:', error);
                    }
                });
            }, 5 * 60 * 1000);
        }
    });
});

client.on('message', async (message) => {
    const chat = await message.getChat();
    const contact = await message.getContact();

    // Only process messages from the specific group or private messages from the allowed number
    if (chat.isGroup && chat.id._serialized === groupId) {
        switch (true) {
            case message.hasMedia && chat.isGroup: {
                const media = await message.downloadMedia();
                if (media && media.mimetype === 'image/jpeg') {
                    // Extract text from the image using OCR
                    Tesseract.recognize(Buffer.from(media.data, 'base64'), 'ind', {
                        logger: (m) => console.log(m),
                    }).then(({ data: { text } }) => {
                        const amountMatch = text.match(/Rp\s?\d+[.,]?\d*/g);
                        if (amountMatch) {
                            // Extract the first amount found
                            const amountString = amountMatch[0].replace(/[^\d,]/g, '').replace(',', '.');
                            const amount = parseFloat(amountString);
                            if (!isNaN(amount)) {
                                // Add the amount to the admin balance
                                balance += amount;

                                // Add to transaction history
                                transactionHistory.push({
                                    type: 'pemasukan',
                                    amount,
                                    source: 'Group Transfer Image',
                                    date: new Date().toISOString()
                                });

                                // Save the updated balance and transaction history to the JSON file
                                fs.writeFile(balanceFilePath, JSON.stringify({ balance: balance, transactionHistory: transactionHistory }, null, 2), (error) => {
                                    if (error) {
                                        console.error('Error saving balance:', error);
                                        message.reply('Terjadi kesalahan saat menyimpan saldo admin.');
                                    }
                                });
                            }
                        }
                    }).catch((error) => {
                        console.error('Error recognizing text from image:', error);
                        message.reply('Terjadi kesalahan saat membaca gambar. Mohon coba lagi dengan gambar yang lebih jelas.');
                    });
                }
                break;
            }
        }
    } else if (!chat.isGroup && contact.number === allowedNumber) {
        // Handle admin commands in personal chat
        switch (true) {
            case message.body === '#saldo': {
                message.reply(`Saldo admin saat ini adalah: ${formatRupiah(balance)}`);
                break;
            }
            case message.body === '#rekaps': {
                // Generate PDF report
                const pdfPath = path.join(__dirname, 'data', 'admin', 'pdf', 'rekapanSaldo.pdf');
                if (!fs.existsSync(path.dirname(pdfPath))) {
                    fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
                }
                const doc = new PDFDocument();
                doc.pipe(fs.createWriteStream(pdfPath));

                doc.fontSize(16).text('Rekapan Saldo Admin', { align: 'center' });
                doc.moveDown();

                doc.fontSize(12).text(`Saldo Saat Ini: ${formatRupiah(balance)}`, { align: 'left' });
                doc.moveDown();

                doc.fontSize(12).text('Detail Transaksi:', { align: 'left' });
                transactionHistory.forEach((transaction, index) => {
                    doc.text(`${index + 1}. ${transaction.type} - ${formatRupiah(transaction.amount)} - ${transaction.source} - ${transaction.date}`, {
                        align: 'left'
                    });
                });

                doc.end();

                // Send the PDF file
                setTimeout(() => {
                    const media = MessageMedia.fromFilePath(pdfPath);
                    client.sendMessage(message.from, media);
                }, 1000);
                break;
            }
            case message.body.startsWith('#out'): {
                const outAmountString = message.body.split(' ')[1];
                const outAmount = parseFloat(outAmountString);

                if (!isNaN(outAmount) && outAmount > 0) {
                    if (balance >= outAmount) {
                        // Deduct the amount from the admin balance
                        balance -= outAmount;

                        // Add to transaction history
                        transactionHistory.push({
                            type: 'pengeluaran',
                            amount: outAmount,
                            source: 'Manual Deduction',
                            date: new Date().toISOString()
                        });

                        // Save the updated balance and transaction history to the JSON file
                        fs.writeFile(balanceFilePath, JSON.stringify({ balance: balance, transactionHistory: transactionHistory }, null, 2), (error) => {
                            if (error) {
                                console.error('Error saving balance:', error);
                                message.reply('Terjadi kesalahan saat menyimpan saldo admin.');
                            } else {
                                message.reply(`Saldo berhasil dikurangi sebesar: ${formatRupiah(outAmount)}. Saldo admin saat ini adalah: ${formatRupiah(balance)}`);
                            }
                        });
                    } else {
                        message.reply('Saldo tidak mencukupi untuk melakukan pengeluaran tersebut.');
                    }
                } else {
                    message.reply('Format jumlah tidak valid. Gunakan format: #out <jumlah>');
                }
                break;
            }
            case message.body.startsWith('#in'): {
                const inAmountString = message.body.split(' ')[1];
                const inAmount = parseFloat(inAmountString);

                if (!isNaN(inAmount) && inAmount > 0) {
                    // Add the amount to the admin balance
                    balance += inAmount;

                    // Add to transaction history
                    transactionHistory.push({
                        type: 'pemasukan',
                        amount: inAmount,
                        source: 'Manual Addition',
                        date: new Date().toISOString()
                    });

                    // Save the updated balance and transaction history to the JSON file
                    fs.writeFile(balanceFilePath, JSON.stringify({ balance: balance, transactionHistory: transactionHistory }, null, 2), (error) => {
                        if (error) {
                            console.error('Error saving balance:', error);
                            message.reply('Terjadi kesalahan saat menyimpan saldo admin.');
                        } else {
                            message.reply(`Saldo berhasil ditambahkan sebesar: ${formatRupiah(inAmount)}. Saldo admin saat ini adalah: ${formatRupiah(balance)}`);
                        }
                    });
                } else {
                    message.reply('Format jumlah tidak valid. Gunakan format: #in <jumlah>');
                }
                break;
            }
            case message.body.startsWith('#utang'): {
                const args = message.body.split('|').map(arg => arg.trim());
                if (args.length === 5) {
                    const [_, namaPengutang, nomorWhatsApp, totalUtang, jatuhTempo] = args;
                    const contactNumber = nomorWhatsApp.replace(/^0/, '+62'); // Assuming Indonesian numbers
                    const reminderMessage = `Halo ${namaPengutang}, ini adalah pengingat bahwa Anda memiliki utang sebesar ${formatRupiah(totalUtang)} yang jatuh tempo pada tanggal ${jatuhTempo}. Mohon segera melakukan pembayaran. Terima kasih.`;

                    // Save debt information to the debt file
                    debtData.push({
                        namaPengutang,
                        nomorWhatsApp,
                        totalUtang,
                        jatuhTempo,
                        timeoutId: null
                    });
                    fs.writeFile(debtFilePath, JSON.stringify(debtData, null, 2), (error) => {
                        if (error) {
                            console.error('Error saving debt data:', error);
                            message.reply('Terjadi kesalahan saat menyimpan data utang.');
                        } else {
                            client.sendMessage(contactNumber + '@c.us', reminderMessage).then(() => {
                                message.reply(`Pengingat utang telah dikirim ke ${namaPengutang} (${nomorWhatsApp}).`);

                                // Start 5-minute timeout for response
                                const debt = debtData.find(d => d.nomorWhatsApp === nomorWhatsApp && d.totalUtang === totalUtang && d.jatuhTempo === jatuhTempo);
                                if (debt) {
                                    debt.timeoutId = setTimeout(() => {
                                        debtData = debtData.filter(d => d !== debt);
                                        fs.writeFile(debtFilePath, JSON.stringify(debtData, null, 2), (error) => {
                                            if (error) {
                                                console.error('Error updating debt data:', error);
                                            }
                                        });
                                    }, 5 * 60 * 1000);
                                }
                            }).catch((error) => {
                                console.error('Error sending reminder message:', error);
                                message.reply('Terjadi kesalahan saat mengirim pengingat utang. Mohon periksa nomor WhatsApp yang diberikan.');
                            });
                        }
                    });
                } else {
                    message.reply('Format utang tidak valid. Gunakan format: #utang | nama pengutang | nomor whatsapp pengutang | total utang | jatuh tempo');
                }
                break;
            }
        }
    }
});


// Event handler untuk pesan yang diterima
client.on('message', async (message) => {
    const groupId = '120363336251818783@g.us';
    const chat = await message.getChat();

    // Mengecek apakah pesan berasal dari grup dengan ID yang diberikan
    if (chat.isGroup && chat.id._serialized === groupId) {
        switch (true) {
            case message.body.toLowerCase().startsWith('giveaway'):
                const [, jumlahPemenang] = message.body.match(/^giveaway\s+(\d+)/) || [];

                if (jumlahPemenang) {
                    const jumlah = parseInt(jumlahPemenang, 10);
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

                        // Simpan pemenang ke file JSON
                        const giveawayFilePath = path.join(__dirname, 'data', 'giveaway', 'winners.json');
                        if (!fs.existsSync(path.dirname(giveawayFilePath))) {
                            fs.mkdirSync(path.dirname(giveawayFilePath), { recursive: true });
                        }
                        let winnersData = [];
                        if (fs.existsSync(giveawayFilePath)) {
                            try {
                                winnersData = JSON.parse(fs.readFileSync(giveawayFilePath, 'utf-8'));
                            } catch (error) {
                                console.error('Error reading giveaway winners:', error);
                            }
                        }
                        winners.forEach(winner => {
                            winnersData.push({
                                whatsappNumber: winner.id.user,
                                whatsappName: winner.name || winner.pushname || 'Unknown'
                            });
                        });
                        fs.writeFileSync(giveawayFilePath, JSON.stringify(winnersData, null, 2));

                        // Kirim pesan pemenang dan mention pemenang
                        await chat.sendMessage(
                            `🎉 Selamat kepada pemenang Giveaway KyPay Store! 🎉\n\n` +
                            `Terima kasih banyak untuk semua yang telah berpartisipasi dalam giveaway kali ini. Kami sangat senang melihat antusiasme dari kalian semua!\n\n` +
                            `Dan akhirnya, setelah melalui proses undian yang adil, kami dengan bangga mengumumkan pemenang giveaway kali ini adalah...\n\n` +
                            `🥳 ${winnerNames} 🥳\n\n` +
                            `Selamat! Anda telah memenangkan hadiah spesial dari KyPay Store! 🎁 Kami akan segera menghubungi Anda untuk proses pengiriman hadiah.\n\n` +
                            `Bagi yang belum beruntung, jangan khawatir, karena kami akan terus mengadakan giveaway dan event menarik lainnya. Jadi, tetap ikuti kami di KyPay Store dan nantikan kesempatan berikutnya!\n\n` +
                            `Sekali lagi, terima kasih dan sampai jumpa di event berikutnya! 👊`,
                            { mentions: winnerMentions }
                        );
                    } else {
                        await message.reply('Fitur ini hanya dapat digunakan di grup.');
                    }
                } else {
                    await message.reply('Format tidak sesuai. Gunakan format: giveaway jumlahPemenang');
                }
                break;
        }
    }
});

client.on('message', async (msg) => {
    const chat = await msg.getChat();
    const author = msg.author || msg.from;
    const contact = await client.getContactById(author);
    const isAdmin = chat.participants && chat.participants.find(
        (participant) => participant.id._serialized === author && participant.isAdmin
    );

    const messageParts = msg.body.toLowerCase().split('|').map(part => part.trim());

    switch (messageParts[0]) {
        case 'add badword':
            if (!chat.isGroup) {
                // Prompt admin to add badwords
                msg.reply(
                    'Ketikkan apa saja kata-kata yang dilarang, dipisahkan dengan baris baru (contoh:\nKontol\nMemek)'
                );
                awaitingBadwordInput = true;
            } else {
                msg.reply('Perintah ini hanya dapat digunakan di chat pribadi dengan bot.');
            }
            break;

        case 'deletebadword':
            if (!chat.isGroup) {
                if (messageParts.length < 2) {
                    msg.reply('Harap cantumkan kata yang ingin dihapus. Contoh: deletebadword | kata');
                    return;
                }

                const wordToDelete = messageParts[1];
                const index = badwords.findIndex((badword) => badword.toLowerCase() === wordToDelete.toLowerCase());

                if (index !== -1) {
                    badwords.splice(index, 1);

                    // Save updated badwords to JSON file
                    fs.writeFile(badwordFilePath, JSON.stringify(badwords, null, 2), (err) => {
                        if (err) {
                            console.error('Error saving badwords:', err);
                            msg.reply('Gagal menghapus kata-kata terlarang.');
                        } else {
                            msg.reply(`Kata "${wordToDelete}" berhasil dihapus dari daftar kata-kata terlarang.`);
                        }
                    });
                } else {
                    msg.reply(`Kata "${wordToDelete}" tidak ditemukan dalam daftar kata-kata terlarang.`);
                }
            } else {
                msg.reply('Perintah ini hanya dapat digunakan di chat pribadi dengan bot.');
            }
            break;

        // Cases like listbadword, antibadwordon, and antibadwordoff
        // can still be used in the group chat by admin as per your requirement.
        case 'listbadword':
            if (chat.isGroup) {
                if (!isAdmin) {
                    msg.reply('Maaf, hanya admin grup yang dapat menggunakan perintah ini.');
                    return;
                }

                if (badwords.length === 0) {
                    msg.reply('Tidak ada kata-kata terlarang yang terdaftar.');
                } else {
                    msg.reply(`Daftar kata-kata terlarang saat ini:\n${badwords.join('\n')}`);
                }
            }
            break;

        case 'antibadwordon':
            if (chat.isGroup) {
                if (!isAdmin) {
                    msg.reply('Maaf, hanya admin grup yang dapat menggunakan perintah ini.');
                    return;
                }
                antibadwordEnabled = true;
                msg.reply('Fitur anti kata-kata terlarang telah diaktifkan.');
            }
            break;

        case 'antibadwordoff':
            if (chat.isGroup) {
                if (!isAdmin) {
                    msg.reply('Maaf, hanya admin grup yang dapat menggunakan perintah ini.');
                    return;
                }
                antibadwordEnabled = false;
                msg.reply('Fitur anti kata-kata terlarang telah dinonaktifkan.');
            }
            break;

        default:
            if (awaitingBadwordInput) {
                const badwordMessage = msg.body;
                const newBadwords = badwordMessage.split('\n');
                badwords.push(...newBadwords);
                awaitingBadwordInput = false;

                // Save updated badwords to JSON file
                fs.writeFile(badwordFilePath, JSON.stringify(badwords, null, 2), (err) => {
                    if (err) {
                        console.error('Error saving badwords:', err);
                        msg.reply('Gagal menyimpan kata-kata terlarang baru.');
                    } else {
                        msg.reply('Kata-kata terlarang berhasil ditambahkan.');
                    }
                });
            } else {
                // Check message against badwords and delete if necessary
                if (antibadwordEnabled && badwords.some((badword) => msg.body.toLowerCase().includes(badword.toLowerCase()))) {
                    if (!isAdmin || messageParts[0] !== 'add badword') {
                        await msg.delete(true);
                        msg.reply('Pesan ini mengandung kata-kata yang tidak diperbolehkan dan telah dihapus. Mohon perhatikan bahasa Anda.');
                    }
                }
            }
            break;
    }
});

client.on('message', async msg => {
    const chat = await msg.getChat();
    const senderNumber = msg.from.split('@')[0];

    // Check if message is from the allowed admin
    if (senderNumber === allowedNumber && !chat.isGroup) {
        const command = msg.body.split(' ')[0].toLowerCase();
        const args = msg.body.slice(command.length + 1).trim();

        switch (command) {
            case 'promote':
                if (msg.hasMedia) {
                    const media = await msg.downloadMedia();
                    if (args.length > 0) {
                        const promoteMessage = args;
                        // Send the image with caption to all groups
                        const chats = await client.getChats();
                        chats.forEach(async groupChat => {
                            if (groupChat.isGroup) {
                                await groupChat.sendMessage(media, { caption: promoteMessage });
                            }
                        });
                        msg.reply('Promotion image with caption has been sent to all groups.');
                    } else {
                        msg.reply('Please provide a caption for the promotion.');
                    }
                } else if (args.length > 0) {
                    const promoteMessage = args;
                    // Send the message immediately to all groups
                    const chats = await client.getChats();
                    chats.forEach(async groupChat => {
                        if (groupChat.isGroup) {
                            await groupChat.sendMessage(promoteMessage);
                        }
                    });
                    msg.reply('Promotion message has been sent to all groups.');
                } else {
                    msg.reply('Please provide a message or image with a caption to promote.');
                }

                // Schedule the message to be sent every 30 minutes
                promoteInterval = setInterval(async () => {
                    const chats = await client.getChats();
                    if (msg.hasMedia && media) {
                        chats.forEach(async groupChat => {
                            if (groupChat.isGroup) {
                                await groupChat.sendMessage(media, { caption: args });
                            }
                        });
                    } else {
                        chats.forEach(async groupChat => {
                            if (groupChat.isGroup) {
                                await groupChat.sendMessage(args);
                            }
                        });
                    }
                }, 30 * 60 * 1000);
                break;

            case 'stoppromote':
                if (promoteInterval) {
                    clearInterval(promoteInterval);
                    promoteInterval = null;
                    msg.reply('Promotion has been stopped.');
                } else {
                    msg.reply('No promotion is currently running.');
                }
                break;

            case 'getidgc':
                try {
                    const chats = await client.getChats();
                    const groupChats = chats.filter(chat => chat.isGroup);

                    groupChats.forEach(groupChat => {
                        const groupInfo = {
                            id: groupChat.id._serialized,
                            name: groupChat.name
                        };

                        // Store group information in JSON file
                        groupDetails.push(groupInfo);
                    });
                    fs.writeFileSync(groupDetailsFilePath, JSON.stringify(groupDetails, null, 2));

                    let replyMessage = 'Group details have been saved:\n';
                    groupChats.forEach(groupChat => {
                        replyMessage += `Group ID: ${groupChat.id._serialized}\nGroup Name: ${groupChat.name}\n`;
                    });

                    msg.reply(replyMessage);
                } catch (error) {
                    console.error('Error retrieving group details:', error);
                    msg.reply('Failed to retrieve group details.');
                }
                break;
        }
    }
});

client.on('message', async (msg) => {
    const chat = await msg.getChat();

    // If the message comes from a private chat and is from the allowed admin number
    if (!chat.isGroup && msg.from === allowedNumber + '@c.us') {
        if (msg.body.toLowerCase() === 'allmenu') {
            const allMenuMessage = `
*📋 KyPay Bot Menu:*

━━━━━━━━━━━

*1. 🔧 Group Management:*
- *#setpp*: Update group profile picture.
- *#setdesgc | [description]*: Update group description.
- *#setname | [new name]*: Update group name.
- *#reset*: Reset group invite link.
- *cl*: Close group.
- *op*: Open group.

━━━━━━━━━━━

*2. 🛍️ Product & Payment:*
- *add | payment | [name] | [number] | [holder]*: Add payment option.
- *add | [keyword] | [detail]*: Add product.
- *update | [type] | [old] | [new details]*: Update payment/product.
- *delete | [name/keyword]*: Delete payment/product.
- *payment*: Show payment options.
- *qris*: Upload QRIS image.

━━━━━━━━━━━

*3. 🚫 Anti-Link & Bad Words:*
- *add badword*: Add prohibited word.
- *deletebadword | [word]*: Remove prohibited word.
- *listbadword*: Show bad words.
- *antibadwordon/off*: Toggle anti-badword feature.

━━━━━━━━━━━

*4. 📢 Promotions:*
- *promote | [message]*: Send promotion to groups.
- *stoppromote*: Stop promotions.
- *giveaway [number]*: Start giveaway & pick winners.

━━━━━━━━━━━

*5. 💰 Balance & Debt:*
- *#saldo*: Show admin balance.
- *#out [amount]*: Deduct balance.
- *#in [amount]*: Add balance.
- *#utang | [name] | [number] | [amount] | [due]*: Set debt reminder.
- *#rekaps : summarize all admin financial data

━━━━━━━━━━━

*6. 🛒 Orders:*
- Send payment proof with description.
- Use *P* (Pending) and *D* (Done) for managing orders.

━━━━━━━━━━━

*🌟 KyPay Bot at Your Service!*
            `;

            msg.reply(allMenuMessage);
        }
    }
});


// Menghubungkan client
client.initialize();
