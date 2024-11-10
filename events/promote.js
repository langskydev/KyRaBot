const { GROUP_ID, EXCLUDED_GROUP_IDS } = require('../utils/constants');
const cron = require('node-cron');

module.exports = (client) => {
    let promoteContent = null;
    let media = null;
    let mentions = [];
    let promoteTask = null;

    client.on('message', async (message) => {
        if (message.fromMe || message.isGroupMsg) return;

        const chat = await message.getChat();
        const contact = await message.getContact();
        const text = message.body;

        // Cek format pesan "promote | isipromote" atau "stoppromote"
        if (text.startsWith("promote |") || text.toLowerCase() === "stoppromote" || message.hasMedia) {
            // Ambil data grup dan cek apakah pengguna adalah admin
            const group = await client.getChatById(GROUP_ID);
            const isAdmin = group.participants.some(participant => participant.id._serialized === contact.id._serialized && participant.isAdmin);

            if (!isAdmin) {
                await message.reply("Hanya admin yang dapat menggunakan fitur promote dan stoppromote.");
                return;
            }

            // Menghentikan promote otomatis jika perintah "stoppromote" diberikan
            if (text.toLowerCase() === "stoppromote") {
                if (promoteTask) {
                    promoteTask.stop();
                    promoteTask = null;
                    promoteContent = null;
                    media = null;
                    mentions = [];
                    await message.reply("Promote otomatis berhasil dihentikan.");
                } else {
                    await message.reply("Promote otomatis tidak aktif saat ini.");
                }
                return;
            }

            // Menyimpan konten promote jika perintah "promote | isipromote" diberikan
            const [, content] = text.split(" | ");
            if (!content && !message.hasMedia) {
                await message.reply("Format salah. Gunakan format: promote | [isipromote]");
                return;
            }

            // Simpan konten dan media promote
            promoteContent = content;
            if (message.hasMedia) {
                media = await message.downloadMedia();
            } else {
                media = null;
            }

            // Siapkan daftar mentions dari grup yang memenuhi syarat
            const chats = await client.getChats();
            const groupChats = chats.filter(chat => chat.isGroup && chat.id._serialized !== GROUP_ID && !EXCLUDED_GROUP_IDS.includes(chat.id._serialized));
            
            mentions = [];
            for (const groupChat of groupChats) {
                const participants = await groupChat.participants;
                mentions.push(...participants.map(participant => participant.id._serialized));
            }

            // Kirim pesan promote pertama kali ke semua grup yang memenuhi syarat
            for (const groupChat of groupChats) {
                if (media) {
                    await groupChat.sendMessage(media, { caption: promoteContent, mentions });
                } else {
                    await groupChat.sendMessage(promoteContent, { mentions });
                }
            }

            await message.reply("Pesan promote pertama berhasil dikirim. Pesan akan dikirim otomatis setiap 30 menit ke grup yang memenuhi syarat.");

            // Mulai tugas cron untuk mengirim pesan setiap 30 menit
            if (!promoteTask) {
                promoteTask = cron.schedule('*/30 * * * *', async () => {
                    if (promoteContent) {
                        for (const groupChat of groupChats) {
                            if (media) {
                                await groupChat.sendMessage(media, { caption: promoteContent, mentions });
                            } else {
                                await groupChat.sendMessage(promoteContent, { mentions });
                            }
                        }
                    }
                });
            }
        }
    });
};
