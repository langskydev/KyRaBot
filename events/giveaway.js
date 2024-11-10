const fs = require('fs');
const path = require('path');
const { GROUP_ID } = require('../utils/constants');

module.exports = (client) => {
    client.on('message', async (message) => {
        const groupId = GROUP_ID;
        const chat = await message.getChat();

        if (chat.isGroup && chat.id._serialized === groupId) {
            switch (true) {
                case message.body.toLowerCase().startsWith('giveaway'):
                    const [, jumlahPemenang] = message.body.match(/^giveaway\s+(\d+)/) || [];

                    if (jumlahPemenang) {
                        const jumlah = parseInt(jumlahPemenang, 10);
                        const ordersData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'orders.json')));

                        // Sort participants by transaction count in descending order
                        const sortedParticipants = Object.entries(ordersData)
                            .sort((a, b) => b[1].successfulTransactions - a[1].successfulTransactions)
                            .slice(0, jumlah);

                        const winners = sortedParticipants.map(([key]) => key);

                        // Simpan pemenang ke file winners.json
                        const giveawayFilePath = path.join(__dirname, '..', 'data', 'giveaway', 'winners.json');
                        let winnersData = [];
                        if (fs.existsSync(giveawayFilePath)) {
                            winnersData = JSON.parse(fs.readFileSync(giveawayFilePath, 'utf-8'));
                        }
                        winners.forEach(winner => {
                            winnersData.push({ whatsappNumber: winner });
                        });
                        fs.writeFileSync(giveawayFilePath, JSON.stringify(winnersData, null, 2));

                        // Send winners announcement
                        const winnerNames = winners.join(', ');
                        await chat.sendMessage(
                            `*🎉 PENGUMUMAN PEMENANG GIVEAWAY KYPAY STORE 🎉*\n\n` +
                            `Halo semua! Terima kasih telah berpartisipasi dalam giveaway kali ini. Kami sangat menghargai antusiasme kalian!\n\n` +
                            `Dan sekarang, saat yang ditunggu-tunggu telah tiba... setelah melalui seleksi, kami dengan bangga mengumumkan pemenang giveaway ini:\n\n` +
                            `*Selamat kepada para pemenang!*\n\n` +
                            `🏆 ${winnerNames} 🏆\n\n` +
                            `Anda berhak atas hadiah spesial dari KyPay Store. Kami akan segera menghubungi Anda untuk proses pengambilan hadiah.\n\n` +
                            `Bagi yang belum beruntung, tetap semangat! Pantau terus KyPay Store untuk event menarik berikutnya.\n\n` +
                            `Terima kasih dan sampai jumpa di kesempatan berikutnya!`
                        );
                    } else {
                        await message.reply('Format tidak sesuai. Gunakan format: giveaway jumlahPemenang');
                    }
                    break;
            }
        }
    });

};