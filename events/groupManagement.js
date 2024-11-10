// events/groupManagement.js
const { GROUP_ID } = require('../utils/constants');

module.exports = (client) => {
    client.on('message', async (msg) => {
        const chat = await msg.getChat();

        // Hanya aktif di grup dengan ID berikut
        if (chat.id._serialized === GROUP_ID) {
            const isAdmin = msg.author === undefined || chat.participants.find(participant => participant.id._serialized === msg.author).isAdmin;

            switch (true) {
                // Fitur Anti Link
                case (/https?:\/\/|wa\.me\//i.test(msg.body)): {
                    if (!isAdmin) {
                        try {
                            const contact = await client.getContactById(msg.author);
                            await msg.reply('ANTI LINK 「 📵 」\nLink terdeteksi, maaf kamu akan di kick !');
                            await chat.removeParticipants([contact.id._serialized]);
                            await msg.delete(true);
                        } catch (error) {
                            console.error('Error handling anti-link feature:', error);
                        }
                    }
                    break;
                }
                // Mengatur gambar profil grup
                case (msg.hasMedia && msg.body === '#setpp'): {
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
                // Mengatur deskripsi grup
                case (msg.body.startsWith('#setdesgc | ')): {
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
                // Mengatur nama grup
                case (msg.body.startsWith('#setname | ')): {
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
                // Mengatur ulang link undangan grup
                case (msg.body === '#reset'): {
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
                // Mengirim pesan kepada semua anggota grup
                case (msg.body.startsWith('h ')): {
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
                // Menutup grup untuk anggota
                case (msg.body === 'cl'): {
                    if (isAdmin) {
                        await chat.setMessagesAdminsOnly(true);
                        const now = new Date();
                        const tanggal = now.toLocaleDateString('id-ID');
                        const jam = now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' });
                        const lockMessage = 
`Grup sukses ditutup 「 🔒 」

📆 TANGGAL: ${tanggal}
⏰ WAKTU: ${jam} WIB

📌 Informasi: Terima kasih kepada seluruh anggota yang telah melakukan transaksi! Jika ada kebutuhan atau ingin melakukan pembelian, silakan hubungi admin. Demi keamanan, transaksi hanya melalui admin❗`;
                        chat.sendMessage(lockMessage);
                        setTimeout(() => {
                            const closingMessage = 
`⏳ close order ⏳
💌 Terima kasih untuk setiap order hari ini! Kami siap melayani Anda kembali di kesempatan berikutnya.
📢 Untuk pemesanan, kirim saja pesan ke PM, admin akan merespon ketika aktif.
📞 Kontak Admin:
• Admin 1: +6285714608649
• Admin 2: +6285810219251
🔗 Saluran WhatsApp: https://whatsapp.com/channel/0029Vas6KV1BqbrA3oyIC220`;
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
                // Membuka grup untuk anggota
                case (msg.body === 'op'): {
                    if (isAdmin) {
                        await chat.setMessagesAdminsOnly(false);
                        const now = new Date();
                        const tanggal = now.toLocaleDateString('id-ID');
                        const jam = now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' });
                        const unlockMessage = 
`Group sukses dibuka 「 🔓 」

📆 TANGGAL: ${tanggal}
⏰ JAM    : ${jam} WIB

🔊 TRANSAKSI HANYA MELALUI ADMIN GROUP❗. SELEBIHNYA BUKAN TANGGUNG JAWAB ADMIN`;
                        chat.sendMessage(unlockMessage);
                        setTimeout(() => {
                            const greetingMessage = 
`📢📢 ${chat.name} 📢📢
💥 Selamat ${(jam.startsWith('0') || parseInt(jam.split(':')[0]) < 12) ? 'pagi' : (parseInt(jam.split(':')[0]) < 15) ? 'siang' : (parseInt(jam.split(':')[0]) < 18) ? 'sore' : 'malam'}! Order GRUP! 💥
💌 Cara Order:
• ORDER langsung di grup ini
• Pastikan cek stok dulu sebelum Transfer
• 𝟗𝟓% item READY dan segera dikirim setelah pembayaran
📞 Untuk Layanan dan Garansi: Hubungi admin di PM jika ada yang perlu dibantu!
Promo terbaru bisa dicek di:
https://whatsapp.com/channel/0029Vas6KV1BqbrA3oyIC220`;
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
};
