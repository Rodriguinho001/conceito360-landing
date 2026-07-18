const fs = require('fs');

const FILE_NAME = 'morro_triangles.bin';
const META_NAME = 'morro_meta.json';
const BACKUP_DIR = 'scratch/intake/backups';

if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[-:.]/g, '');

let success = true;

if (fs.existsSync(FILE_NAME)) {
    fs.copyFileSync(FILE_NAME, `${BACKUP_DIR}/${FILE_NAME}.bak_${timestamp}`);
    console.log(`[PASS] Backup created: ${BACKUP_DIR}/${FILE_NAME}.bak_${timestamp}`);
} else {
    console.log(`[WARN] Original ${FILE_NAME} not found, skipping backup.`);
    success = false;
}

if (fs.existsSync(META_NAME)) {
    fs.copyFileSync(META_NAME, `${BACKUP_DIR}/${META_NAME}.bak_${timestamp}`);
    console.log(`[PASS] Backup created: ${BACKUP_DIR}/${META_NAME}.bak_${timestamp}`);
} else {
    console.log(`[WARN] Original ${META_NAME} not found, skipping backup.`);
    success = false;
}

if (success) {
    console.log('[PASS] All backups completed successfully.');
} else {
    console.log('[WARN] Partial or missing backups. Proceed with caution.');
}
