const crypto = require('crypto');
const db = require('../db');

function getKey() {
    const raw = process.env.SETTINGS_ENCRYPTION_KEY || '';
    if (!raw) return null;
    try {
        const buf = Buffer.from(raw, 'base64');
        if (buf.length !== 32) return null;
        return buf;
    } catch (e) {
        return null;
    }
}

function encrypt(plaintext) {
    const key = getKey();
    if (!key) {
        throw new Error('未配置 SETTINGS_ENCRYPTION_KEY');
    }
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

function decrypt(payload) {
    const key = getKey();
    if (!key) {
        throw new Error('未配置 SETTINGS_ENCRYPTION_KEY');
    }
    if (!payload) return '';
    const buf = Buffer.from(String(payload), 'base64');
    if (buf.length < 12 + 16 + 1) return '';
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const ciphertext = buf.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

function upsertSetting(key, valueEnc, cb) {
    db.run(
        `INSERT INTO app_settings (key, value_enc, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET value_enc = excluded.value_enc, updated_at = CURRENT_TIMESTAMP`,
        [key, valueEnc],
        cb
    );
}

function setSecret(key, value, cb) {
    const enc = encrypt(value);
    upsertSetting(key, enc, cb);
}

function getSecret(key, cb) {
    db.get(`SELECT value_enc FROM app_settings WHERE key = ? LIMIT 1`, [key], (err, row) => {
        if (err) return cb(err);
        if (!row || !row.value_enc) return cb(null, '');
        try {
            const val = decrypt(row.value_enc);
            cb(null, val);
        } catch (e) {
            cb(e);
        }
    });
}

function listKeys(cb) {
    db.all(`SELECT key, updated_at FROM app_settings ORDER BY key ASC`, [], (err, rows) => {
        if (err) return cb(err);
        cb(null, rows || []);
    });
}

module.exports = {
    getKey,
    setSecret,
    getSecret,
    listKeys
};

