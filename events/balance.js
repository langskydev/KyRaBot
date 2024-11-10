const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { MessageMedia } = require('whatsapp-web.js');

// Fungsi untuk format Rupiah
function formatRupiah(amount) {
    return `Rp ${amount.toLocaleString('id-ID')}`;
}

// Fungsi untuk memastikan file dan direktori ada
function ensureFile(filePath, defaultValue) {
    if (!fs.existsSync(filePath)) {
        const dirPath = path.dirname(filePath);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(defaultValue));
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

// Fungsi untuk memuat saldo
function loadBalance() {
    const balanceFilePath = path.join(__dirname, '..', 'data', 'balance.json');
    return ensureFile(balanceFilePath, {});
}

// Fungsi untuk memuat riwayat transaksi
function loadTransactions() {
    const transactionsFilePath = path.join(__dirname, '..', 'data', 'transactions.json');
    return ensureFile(transactionsFilePath, []);
}

module.exports = (client) => {
    client.on('message', async (message) => {
        const chatId = message.from;
        const isPrivateChat = message.fromMe || message.id.participant === undefined;

        if (isPrivateChat) {
            const balanceData = loadBalance();
            const transactions = loadTransactions();

            const [command, arg] = message.body.split(' ');

            switch (command) {
                case '#saldo':
                    // Menampilkan saldo admin
                    const currentBalance = balanceData[chatId] || 0;
                    message.reply(`Saldo Anda adalah: ${formatRupiah(currentBalance)}`);
                    break;

                case '#in':
                    // Menambahkan pemasukan
                    const incomeAmount = parseInt(arg, 10);
                    if (!isNaN(incomeAmount) && incomeAmount > 0) {
                        balanceData[chatId] = (balanceData[chatId] || 0) + incomeAmount;
                        saveBalance(balanceData);
                        saveTransaction('income', incomeAmount);
                        message.reply(`Saldo berhasil ditambahkan: ${formatRupiah(incomeAmount)}\nSaldo baru Anda: ${formatRupiah(balanceData[chatId])}`);
                    } else {
                        message.reply('Format tidak valid. Gunakan perintah seperti ini: #in 5000');
                    }
                    break;

                case '#out':
                    // Mengurangi pengeluaran
                    const expenseAmount = parseInt(arg, 10);
                    if (!isNaN(expenseAmount) && expenseAmount > 0) {
                        if ((balanceData[chatId] || 0) >= expenseAmount) {
                            balanceData[chatId] -= expenseAmount;
                            saveBalance(balanceData);
                            saveTransaction('expense', expenseAmount);
                            message.reply(`Saldo berhasil dikurangi: ${formatRupiah(expenseAmount)}\nSaldo baru Anda: ${formatRupiah(balanceData[chatId])}`);
                        } else {
                            message.reply('Saldo tidak mencukupi untuk melakukan pengeluaran ini.');
                        }
                    } else {
                        message.reply('Format tidak valid. Gunakan perintah seperti ini: #out 5000');
                    }
                    break;

                case '#rekaps':
                    // Path untuk menyimpan PDF
                    const pdfPath = path.join(__dirname, '..',  'data', 'pdf', 'rekapanSaldo.pdf');

                    // Pastikan direktori ada
                    if (!fs.existsSync(path.dirname(pdfPath))) {
                        fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
                    }

                    // Membuat PDF
                    const doc = new PDFDocument();
                    doc.pipe(fs.createWriteStream(pdfPath));

                    doc.fontSize(16).text('Rekapan Saldo Admin', { align: 'center' });
                    doc.moveDown();

                    // Menampilkan saldo saat ini
                    const currentBalanceForPDF = balanceData[chatId] || 0;
                    doc.fontSize(12).text(`Saldo Saat Ini: ${formatRupiah(currentBalanceForPDF)}`, { align: 'left' });
                    doc.moveDown();

                    doc.fontSize(12).text('Detail Transaksi:', { align: 'left' });

                    // Menampilkan riwayat transaksi
                    transactions.forEach((transaction, index) => {
                        doc.text(`${index + 1}. ${transaction.type} - ${formatRupiah(transaction.amount)} - ${transaction.source || 'N/A'} - ${transaction.date}`, {
                            align: 'left'
                        });
                    });

                    doc.end();

                    // Kirim file PDF setelah selesai dibuat
                    setTimeout(() => {
                        const media = MessageMedia.fromFilePath(pdfPath);
                        client.sendMessage(message.from, media);
                    }, 1000);
                    break;

                default:
                    message.reply('Perintah tidak dikenali. Gunakan #saldo untuk cek saldo, #in <amount> untuk menambah saldo, #out <amount> untuk mengurangi saldo, atau #rekaps untuk melihat laporan keuangan.');
            }
        }
    });
};
