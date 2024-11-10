const fs = require('fs');
const path = require('path');
const { GROUP_ID } = require('../utils/constants');
const ordersFilePath = path.join(__dirname, '..', 'data', 'orders.json');

function updateTransactionCount(user) {
    let ordersData = {};

    if (fs.existsSync(ordersFilePath)) {
        ordersData = JSON.parse(fs.readFileSync(ordersFilePath, 'utf-8'));
    }

    if (!ordersData[user]) {
        ordersData[user] = { successfulTransactions: 0 };
    }

    ordersData[user].successfulTransactions += 1;
    fs.writeFileSync(ordersFilePath, JSON.stringify(ordersData, null, 2));
}

module.exports = (client) => {
    client.on('message', async (msg) => {
        const chat = await msg.getChat();

        // Batasi fitur hanya untuk grup tertentu
        if (chat.isGroup && chat.id._serialized === GROUP_ID) {
            switch (true) {
                // Perintah "P" untuk membuat status pesanan pending
                case msg.hasMedia: {
                    const media = await msg.downloadMedia();
                    const namaAnggota = msg._data.notifyName;
                    const caption = msg.body;

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
                            msg.reply('Terjadi kesalahan saat menyimpan bukti transfer.');
                        }
                    });

                    msg.originalCaption = caption || ''; // Simpan caption atau kosong jika tidak ada
                    break;
                }
                case msg.body.toUpperCase() === 'P' && msg.hasQuotedMsg: {
                    const contact = await msg.getContact();
                    const isAdmin = chat.isGroup && chat.participants.some(participant => participant.id._serialized === contact.id._serialized && participant.isAdmin);
                    if (!isAdmin) {
                        msg.reply('Hanya admin grup yang dapat menggunakan perintah ini.');
                        break;
                    }
                    const quotedMsg = await msg.getQuotedMessage();
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
                case msg.body.toUpperCase() === 'D' && msg.hasQuotedMsg: {
                    const contact = await msg.getContact();
                    const isAdmin = chat.isGroup && chat.participants.some(participant => participant.id._serialized === contact.id._serialized && participant.isAdmin);
                    if (!isAdmin) {
                        msg.reply('Hanya admin grup yang dapat menggunakan perintah ini.');
                        break;
                    }
                    const quotedMsg = await msg.getQuotedMessage();
                    if (quotedMsg.body.includes('*STATUS PESANAN: PENDING*')) {
                        const orderNumberMatch = quotedMsg.body.match(/#(\d+)/);
                        const orderNumber = orderNumberMatch ? orderNumberMatch[1] : 'Unknown';
                        const tanggal = new Date().toLocaleDateString('id-ID');
                        const jam = new Date().toLocaleTimeString('id-ID');
                        const namaAnggota = quotedMsg.body.match(/Pesanan @(\S+)/)[1];
                        updateTransactionCount(namaAnggota);

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
                    // Jika tidak ada kondisi yang terpenuhi
                    break;
            }
        }

    });
};
