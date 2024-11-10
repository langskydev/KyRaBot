const { GROUP_ID } = require('../utils/constants');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

const badwordsFilePath = path.join(__dirname, '../data/badwords.json');
const warnedUsers = {}; // Menyimpan ID anggota yang sudah diberi peringatan

let badwords = [];
let antiBadwordMode = false; // Status mode antibadword

// Fungsi untuk memuat kata-kata terlarang dari file JSON
const loadBadwords = () => {
    if (fs.existsSync(badwordsFilePath)) {
        const data = fs.readFileSync(badwordsFilePath);
        badwords = JSON.parse(data);
    }
};

// Memuat kata-kata terlarang saat inisialisasi
loadBadwords();

module.exports = (client) => {
    client.on('message', async (msg) => {
        const chat = await msg.getChat();
        const contact = await msg.getContact();

        // Fitur `add badword` harus bisa digunakan di chat pribadi oleh admin
        if (!chat.isGroup && msg.body.toLowerCase() === 'add badword') {
            // Anda bisa menambahkan logika tambahan untuk memverifikasi apakah pengguna adalah admin
            msg.reply(`Ketikkan kata-kata yang dilarang, dipisahkan dengan baris baru. Contoh:\n\nFF\nML\nSpam`);

            // Menangkap kata-kata yang dimasukkan admin di chat pribadi
            client.on('message', async (responseMsg) => {
                if (responseMsg.from === msg.from && responseMsg.body) {
                    const newBadwords = responseMsg.body.split('\n').map(word => word.trim()).filter(word => word);
                    badwords.push(...newBadwords);

                    // Simpan bad words ke file JSON
                    fs.writeFile(badwordsFilePath, JSON.stringify(badwords, null, 2), (error) => {
                        if (error) {
                            console.error('Error saving bad words:', error);
                            responseMsg.reply('Terjadi kesalahan saat menyimpan kata-kata terlarang.');
                        } else {
                            responseMsg.reply('Kata-kata terlarang berhasil ditambahkan.');
                            console.log('Bad words added:', newBadwords);
                        }
                    });
                }
            });
            return;
        }

        // Hanya fitur grup yang boleh diakses di grup dengan ID tertentu (`GROUP_ID`)
        if (chat.isGroup && chat.id._serialized !== GROUP_ID) {
            return; // Jika grup bukan target yang diinginkan, abaikan
        }

        // Perintah untuk mengaktifkan antibadword mode
        if (chat.isGroup && msg.body.toLowerCase() === 'antibadwordon') {
            const isAdmin = chat.participants.some(participant => participant.id._serialized === contact.id._serialized && participant.isAdmin);
            if (isAdmin) {
                antiBadwordMode = true;
                msg.reply('⚠️ Mode Anti-Badword telah diaktifkan. Semua kata terlarang akan otomatis dihapus, pelanggar akan diberi peringatan, dan jika melanggar lagi akan dikeluarkan dari grup.');
            } else {
                msg.reply('Hanya admin yang dapat mengaktifkan mode Anti-Badword.');
            }
        }

        // Perintah untuk menonaktifkan antibadword mode
        if (chat.isGroup && msg.body.toLowerCase() === 'antibadwordoff') {
            const isAdmin = chat.participants.some(participant => participant.id._serialized === contact.id._serialized && participant.isAdmin);
            if (isAdmin) {
                antiBadwordMode = false;
                msg.reply('⚠️ Mode Anti-Badword telah dinonaktifkan.');
            } else {
                msg.reply('Hanya admin yang dapat menonaktifkan mode Anti-Badword.');
            }
        }

        // Perintah untuk menampilkan daftar kata-kata terlarang di grup
        if (chat.isGroup && msg.body.toLowerCase() === 'listbadword') {
            const isAdmin = chat.participants.some(participant => participant.id._serialized === contact.id._serialized && participant.isAdmin);

            if (isAdmin) {
                const badwordList = badwords.map(word => `🚫 ${word}`).join('\n');
                const decoratedMessage = `
*⚠️ DAFTAR KATA TERLARANG ⚠️*
━━━━━━━━━━━━━━━━━━━━━
${badwordList}
━━━━━━━━━━━━━━━━━━━━━

⛔️ Mohon tidak menggunakan kata-kata di atas dalam grup untuk menjaga suasana tetap kondusif. Terima kasih atas pengertiannya. 🙏`;

                await chat.sendMessage(decoratedMessage);
            } else {
                msg.reply('Hanya admin yang dapat melihat daftar kata terlarang.');
            }
        }

        // Jika mode antibadword aktif, periksa setiap pesan untuk kata terlarang
        if (antiBadwordMode && chat.isGroup) {
            const messageText = msg.body.toLowerCase();
            const containsBadword = badwords.some(badword => messageText.includes(badword.toLowerCase()));

            if (containsBadword) {
                // Hapus pesan yang mengandung kata terlarang
                await msg.delete(true);

                const userId = contact.id._serialized;

                // Cek apakah pengguna sudah mendapat peringatan sebelumnya
                if (warnedUsers[userId]) {
                    // Pengguna sudah mendapat peringatan, kick dari grup
                    await chat.sendMessage(`⚠️ @${contact.pushname || contact.number} telah melanggar aturan lebih dari satu kali dan akan dikeluarkan dari grup.`, {
                        mentions: [contact]
                    });
                    await chat.removeParticipants([userId]); // Kick pengguna dari grup
                } else {
                    // Pengguna belum mendapat peringatan, kirim peringatan pertama
                    warnedUsers[userId] = true; // Tandai bahwa pengguna ini sudah mendapat peringatan
                    const warningMessage = `⚠️ @${contact.pushname || contact.number}, pesan Anda telah dihapus karena mengandung kata-kata terlarang. Jika Anda melanggar lagi, Anda akan dikeluarkan dari grup.`;

                    // Kirim peringatan sebagai balasan ke pesan yang dihapus
                    await chat.sendMessage(warningMessage, {
                        mentions: [contact],
                        quotedMessageId: msg.id._serialized
                    });
                }
            }
        }
    });
};
