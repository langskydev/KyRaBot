// Import the required libraries
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Create a new client instance
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: null,
        headless: true,
        ignoreDefaultArgs: ['--disable-extensions'],
    },
    downloadMedia: false
});

// Generate QR code for authentication
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

// Log when the client is ready
client.on('ready', () => {
    console.log('Bot is ready!');
});

// Handle new participant joining the group
client.on('group_join', async (notification) => {
    try {
        const chat = await client.getChatById(notification.chatId);
        const groupName = chat.name;
        const participant = await client.getContactById(notification.recipientIds[0]);
        const participantName = `@${participant.number}`;

        if (chat.isGroup && chat.id._serialized === '120363336251818783@g.us') { // Replace 'GROUP_ID_HERE' with the target group ID
            const welcomeMessage = `
✨ Selamat datang di ${groupName} ✨

Halo ${participantName}, selamat bergabung! 🎮🔑

Di sini kamu bisa menemukan penawaran terbaik untuk top up game dan aplikasi premium favoritmu dengan mengetikkan *list*. Jangan ragu untuk bertanya dan cek penawaran menarik kami! 🔥💰`;
            await chat.sendMessage(welcomeMessage, { mentions: [participant] });
        }
    } catch (error) {
        console.error('Error sending welcome message:', error);
    }
});

// Handle anti-spam link
client.on('message_create', async (msg) => {
    try {
        const chat = await msg.getChat();
        const sender = await msg.getContact();

        if (chat.isGroup && chat.id._serialized === '120363336251818783@g.us') { // Only target the specific group
            const participants = await chat.participants;
            const adminIds = participants.filter(participant => participant.isAdmin).map(participant => participant.id._serialized);
            const isAdmin = adminIds.includes(sender.id._serialized);

            // Check if the message contains a link
            const linkPattern = /(https?:\/\/|wa\.me\/)\S+/i;
            if (linkPattern.test(msg.body) && !isAdmin) {
                // Remove participant and delete the message
                await chat.removeParticipants([sender.id._serialized]);
                await msg.delete(true);
            }

            // Handle #setpp command from admin
            if (msg.hasMedia && msg.body.toLowerCase().includes('#setpp')) {
                if (isAdmin) {
                    const media = await msg.downloadMedia();
                    if (media) {
                        await chat.setPicture(media);
                        await chat.sendMessage('Foto profil grup berhasil diubah oleh admin.', { mentions: [sender] });
                    }
                } else {
                    await chat.sendMessage('Hanya admin yang dapat menggunakan perintah ini.', { mentions: [sender] });
                }
            }

            // Handle #setdesgc command from admin
            const setDescriptionPattern = /#setdesgc\s*\|\s*(.+)/i;
            const descriptionMatch = msg.body.match(setDescriptionPattern);
            if (descriptionMatch) {
                if (isAdmin) {
                    const newDescription = descriptionMatch[1].trim();
                    await chat.setDescription(newDescription);
                    await chat.sendMessage('Deskripsi grup berhasil diubah oleh admin.', { mentions: [sender] });
                } else {
                    await chat.sendMessage('Hanya admin yang dapat menggunakan perintah ini.', { mentions: [sender] });
                }
            }

            // Handle #setname command from admin
            const setNamePattern = /#setname\s*\|\s*(.+)/i;
            const nameMatch = msg.body.match(setNamePattern);
            if (nameMatch) {
                if (isAdmin) {
                    const newName = nameMatch[1].trim();
                    await chat.setSubject(newName);
                    await chat.sendMessage('Nama grup berhasil diubah oleh admin.', { mentions: [sender] });
                } else {
                    await chat.sendMessage('Hanya admin yang dapat menggunakan perintah ini.', { mentions: [sender] });
                }
            }

            // Handle afk command from admin
            const afkPattern = /afk\s*\|\s*(.+)/i;
            const afkMatch = msg.body.match(afkPattern);
            if (afkMatch) {
                if (isAdmin) {
                    const reason = afkMatch[1].trim();
                    await chat.sendMessage(`Admin ${sender.pushname} sedang AFK: ${reason}. Mohon pengertiannya, teman-teman.`, { mentions: [sender] });
                } else {
                    await chat.sendMessage('Hanya admin yang dapat menggunakan perintah ini.', { mentions: [sender] });
                }
            }

            // Handle close group command from admin
            if (msg.body.toLowerCase() === 'cl') {
                if (isAdmin) {
                    await chat.setMessagesAdminsOnly(true);
                    const date = new Date();
                    const options = { year: 'numeric', month: 'long', day: 'numeric' };
                    const formattedDate = date.toLocaleDateString('id-ID', options);
                    const formattedTime = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    const closeMessage = `Group Sukses Ditutup 「 🔒 」
                    
📅 Tanggal Penutupan: ${formattedDate}
⏰ Waktu Penutupan: ${formattedTime} WIB
📍 Lokasi Virtual: ${chat.name}
🔒 Status: Tutup

💡 Informasi Lanjutan:
Bagi yang memerlukan informasi lebih lanjut, bantuan, atau pertanyaan seputar grup, silakan menghubungi langsung Admin. Demi keamanan, hindari segala bentuk transaksi di luar Admin untuk menjaga kepercayaan bersama. ❗️`;
                    await chat.sendMessage(closeMessage);
                } else {
                    await chat.sendMessage('Hanya admin yang dapat menggunakan perintah ini.', { mentions: [sender] });
                }
            }

            // Handle open group command from admin
            if (msg.body.toLowerCase() === 'op') {
                if (isAdmin) {
                    await chat.setMessagesAdminsOnly(false);
                    const date = new Date();
                    const options = { year: 'numeric', month: 'long', day: 'numeric' };
                    const formattedDate = date.toLocaleDateString('id-ID', options);
                    const formattedTime = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    const openMessage = `Group Sukses Dibuka 「 🔓 」

📅 Tanggal Pembukaan: ${formattedDate}
⏰ Waktu Pembukaan: ${formattedTime} WIB
📍 Lokasi Virtual: ${chat.name}
🔓 Status: Buka

💡 Informasi Lanjutan:
Grup sudah dibuka kembali, silakan berdiskusi dengan tertib dan bijak. Jika ada pertanyaan lebih lanjut, silakan menghubungi Admin. ❗️`;
                    await chat.sendMessage(openMessage);
                } else {
                    await chat.sendMessage('Hanya admin yang dapat menggunakan perintah ini.', { mentions: [sender] });
                }
            }
        }
    } catch (error) {
        console.error('Error handling anti-spam link, set profile picture, set group description, set group name, afk command, close group command, or open group command:', error);
    }
});

// Start the client
client.initialize();
