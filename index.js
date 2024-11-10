// index.js
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const groupJoinHandler = require('./events/groupJoin');
const groupManagementHandler = require('./events/groupManagement');
const productPaymentHandler = require('./events/productPayment');
const ordersHandler = require('./events/orders');
const badwordsHandler = require('./events/badwords');
const giveawayHandler = require('./events/giveaway');
const promoteHandler = require('./events/promote');
const cronJob = require('./data/backup/backup');
const balanceHandler = require('./events/balance');

const client = new Client();

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Bot sudah siap!');
    cronJob();
});

// Menangani event join grup
client.on('group_join', async (notification) => {
    await groupJoinHandler(client, notification);
});

// Memanggil semua event handler yang diperlukan
groupManagementHandler(client);
productPaymentHandler(client);
ordersHandler(client);
badwordsHandler(client);
giveawayHandler(client);
promoteHandler(client);
balanceHandler(client);

client.initialize();
