const fs = require('fs');
const path = require('path');
const cron = require('node-cron'); // Import cron job untuk backup
const { MessageMedia } = require('whatsapp-web.js');
const { GROUP_ID } = require('../utils/constants');

const paymentFilePath = path.join(__dirname, '../data//payments.json');
const productFilePath = path.join(__dirname, '../data/products.json');

let paymentOptions = [];
let productOptions = [];

// Fungsi untuk memuat data dari JSON
const loadData = () => {
    if (fs.existsSync(paymentFilePath)) {
        const data = fs.readFileSync(paymentFilePath);
        paymentOptions = JSON.parse(data);
    }
    if (fs.existsSync(productFilePath)) {
        const data = fs.readFileSync(productFilePath);
        productOptions = JSON.parse(data);
    }
};

// Memuat data saat inisialisasi
loadData();

module.exports = (client) => {
    client.on('message', async (msg) => {
        const chat = await msg.getChat();
        const sender = await msg.getContact();

        if (chat.isGroup && chat.id._serialized === GROUP_ID) {
        switch (msg.body.toLowerCase()) {
            case 'menu':
                let serviceList = `Halo Kak @${msg.author || msg.from}! 👋
Berikut beberapa list layanan yang tersedia saat ini di ${chat.name} 🏦
📜 OUR EXCLUSIVE LIST 📜

• PAYMENT - Untuk melihat opsi pembayaran
`;

                // Tambahkan daftar produk ke dalam menu (hanya keywordnya)
                productOptions.forEach((product) => {
                    serviceList += `• ${product.keyword.toUpperCase()}
`;
                });

                serviceList += `
💎 Mau lebih detail? Ketik list key yang ada di atas!
🔑 Contoh: PAYMENT untuk informasi lebih lanjut.
━━━━━━━━━━━━━━━━━━━ ⚜️
🏪: ${chat.name} | Layanan Aplikasi premium
⏰ Jam: ${new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB
━━━━━━━━━━━ kyrabot 💎`;

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
};