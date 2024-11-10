const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

// Fungsi untuk melakukan backup file
function backupData(fileName, folder = 'data') {
    const dataFilePath = path.join(__dirname, '..', folder, fileName);
    const backupFolderPath = path.join(__dirname, '..', folder, 'backup');

    if (!fs.existsSync(backupFolderPath)) {
        fs.mkdirSync(backupFolderPath, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
    const backupFilePath = path.join(backupFolderPath, `${fileName}_${timestamp}.json`);

    if (fs.existsSync(dataFilePath)) {
        const data = fs.readFileSync(dataFilePath, 'utf-8');
        fs.writeFileSync(backupFilePath, data);

        // Hapus backup sebelumnya jika ada
        const backups = fs.readdirSync(backupFolderPath);
        backups.forEach(file => {
            if (file !== `${fileName}_${timestamp}.json`) {
                fs.unlinkSync(path.join(backupFolderPath, file));
            }
        });

        console.log(`Backup ${fileName} berhasil dibuat.`);
    } else {
        console.log(`File ${fileName} tidak ditemukan.`);
    }
}

// Jadwalkan backup setiap pukul 00:00
cron.schedule('0 0 * * *', () => {
    backupData('payments.json');
    backupData('products.json');
    backupData('badwords.json');
    backupData('orders.json')
    backupData('giveaway/winners.json');
    backupData('balance.json');
    backupData('transactions.json');
});
