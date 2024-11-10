// events/groupJoin.js
const { GROUP_ID } = require('../utils/constants');

// features/welcome.js
module.exports = (client) => {
    client.on('group_join', async (notification) => {
        const chat = await client.getChatById(notification.chatId);
        const contact = await client.getContactById(notification.recipientIds[0]);

        // Hanya aktif di grup dengan ID berikut
        if (notification.chatId === GROUP_ID) {
            // Pesan sambutan untuk anggota yang baru masuk
            const welcomeMessage = `✨👾 Welcome to KyPay Store 👾✨

Hey, @${contact.id.user}, selamat bergabung! 🎮🔑

Top up game & aplikasi premium? Ketik ?menu. 💎🚀
Siap buat pengalaman top up tanpa ribet, cepat, dan murah? Let's go! 🔥

⚡️ Enjoy your stay, let's level up! ⚡️`;

            if (chat.isGroup) {
                await chat.sendMessage(welcomeMessage, {
                    mentions: [contact]
                });
            }
        }
    });
};

