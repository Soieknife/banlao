const path = require('path');
const dotenv = require('dotenv');
const sqlite3 = require('sqlite3').verbose();
const { Pool, types } = require('pg');

dotenv.config();

types.setTypeParser(20, (val) => (val === null ? null : parseInt(val, 10)));

const SQLITE_PATH = path.resolve(__dirname, '..', 'database.sqlite');

function openSqlite(filePath) {
    return new sqlite3.Database(filePath);
}

function sqliteAll(db, sql, params) {
    return new Promise((resolve, reject) => {
        db.all(sql, params || [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

function sqliteGet(db, sql, params) {
    return new Promise((resolve, reject) => {
        db.get(sql, params || [], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

async function main() {
    if (!process.env.DATABASE_URL && !process.env.PGHOST && !process.env.PGDATABASE) {
        throw new Error('未检测到 Postgres 连接配置，请设置 DATABASE_URL 或 PGHOST/PGDATABASE 等环境变量');
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        host: process.env.PGHOST,
        port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
        ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined
    });

    const sqlite = openSqlite(SQLITE_PATH);
    const reset = String(process.env.RESET || '').toLowerCase() === 'true';

    try {
        if (reset) {
            await pool.query('TRUNCATE TABLE medication_ocr_records, emergency_calls, health_records, activity_logs, reminders, relations, bind_requests, app_settings, users RESTART IDENTITY CASCADE');
        }

        const users = await sqliteAll(sqlite, 'SELECT * FROM users ORDER BY id ASC');
        for (const u of users) {
            await pool.query(
                `INSERT INTO users (id, username, password, role, nickname, phone, avatar, emergency_contact, emergency_phone, is_vip, vip_expire, created_at)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
                 ON CONFLICT (username) DO UPDATE SET
                   password=EXCLUDED.password,
                   role=EXCLUDED.role,
                   nickname=EXCLUDED.nickname,
                   phone=EXCLUDED.phone,
                   avatar=EXCLUDED.avatar,
                   emergency_contact=EXCLUDED.emergency_contact,
                   emergency_phone=EXCLUDED.emergency_phone,
                   is_vip=EXCLUDED.is_vip,
                   vip_expire=EXCLUDED.vip_expire,
                   created_at=EXCLUDED.created_at`,
                [
                    u.id,
                    u.username,
                    u.password,
                    u.role,
                    u.nickname,
                    u.phone,
                    u.avatar,
                    u.emergency_contact,
                    u.emergency_phone,
                    u.is_vip || 0,
                    u.vip_expire,
                    u.created_at
                ]
            );
        }

        const relations = await sqliteAll(sqlite, 'SELECT * FROM relations ORDER BY id ASC');
        for (const r of relations) {
            await pool.query(
                `INSERT INTO relations (id, elder_id, child_id, created_at)
                 VALUES ($1,$2,$3,$4)
                 ON CONFLICT DO NOTHING`,
                [r.id, r.elder_id, r.child_id, r.created_at]
            );
        }

        const reminders = await sqliteAll(sqlite, 'SELECT * FROM reminders ORDER BY id ASC');
        for (const r of reminders) {
            await pool.query(
                `INSERT INTO reminders (id, user_id, title, content, remind_time, status, type, created_by, created_at, repeat_type, repeat_days, repeat_times, start_date, end_date, enabled)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
                 ON CONFLICT DO NOTHING`,
                [
                    r.id,
                    r.user_id,
                    r.title,
                    r.content,
                    r.remind_time,
                    r.status || 0,
                    r.type,
                    r.created_by,
                    r.created_at,
                    r.repeat_type,
                    r.repeat_days,
                    r.repeat_times,
                    r.start_date,
                    r.end_date,
                    typeof r.enabled === 'number' ? r.enabled : 1
                ]
            );
        }

        const bindRequests = await sqliteAll(sqlite, 'SELECT * FROM bind_requests ORDER BY id ASC').catch(() => []);
        for (const b of bindRequests) {
            await pool.query(
                `INSERT INTO bind_requests (id, elder_id, child_id, verify_code, status, expires_at, created_at)
                 VALUES ($1,$2,$3,$4,$5,$6,$7)
                 ON CONFLICT DO NOTHING`,
                [b.id, b.elder_id, b.child_id, b.verify_code, b.status || 'pending', b.expires_at, b.created_at]
            );
        }

        const settings = await sqliteAll(sqlite, 'SELECT * FROM app_settings ORDER BY key ASC').catch(() => []);
        for (const s of settings) {
            await pool.query(
                `INSERT INTO app_settings (key, value_enc, updated_at)
                 VALUES ($1,$2,$3)
                 ON CONFLICT (key) DO UPDATE SET value_enc=EXCLUDED.value_enc, updated_at=EXCLUDED.updated_at`,
                [s.key, s.value_enc, s.updated_at]
            );
        }

        const logs = await sqliteAll(sqlite, 'SELECT * FROM activity_logs ORDER BY id ASC');
        for (const l of logs) {
            await pool.query(
                `INSERT INTO activity_logs (id, user_id, action_type, action_desc, created_at)
                 VALUES ($1,$2,$3,$4,$5)
                 ON CONFLICT DO NOTHING`,
                [l.id, l.user_id, l.action_type, l.action_desc, l.created_at]
            );
        }

        const health = await sqliteAll(sqlite, 'SELECT * FROM health_records ORDER BY id ASC');
        for (const h of health) {
            await pool.query(
                `INSERT INTO health_records (id, user_id, steps, medication_taken, record_date)
                 VALUES ($1,$2,$3,$4,$5)
                 ON CONFLICT DO NOTHING`,
                [h.id, h.user_id, h.steps || 0, h.medication_taken || 0, h.record_date]
            );
        }

        const emergency = await sqliteAll(sqlite, 'SELECT * FROM emergency_calls ORDER BY id ASC');
        for (const e of emergency) {
            await pool.query(
                `INSERT INTO emergency_calls (id, user_id, location_lat, location_lng, address, created_at)
                 VALUES ($1,$2,$3,$4,$5,$6)
                 ON CONFLICT DO NOTHING`,
                [e.id, e.user_id, e.location_lat, e.location_lng, e.address, e.created_at]
            );
        }

        const ocrRecords = await sqliteAll(sqlite, 'SELECT * FROM medication_ocr_records ORDER BY id ASC').catch(() => []);
        for (const m of ocrRecords) {
            await pool.query(
                `INSERT INTO medication_ocr_records (id, user_id, image_hash, raw_text, extracted_json, elder_summary, created_at)
                 VALUES ($1,$2,$3,$4,$5,$6,$7)
                 ON CONFLICT DO NOTHING`,
                [m.id, m.user_id, m.image_hash, m.raw_text, m.extracted_json, m.elder_summary, m.created_at]
            );
        }

        const maxUserId = await sqliteGet(sqlite, 'SELECT MAX(id) as max_id FROM users');
        const maxRelationId = await sqliteGet(sqlite, 'SELECT MAX(id) as max_id FROM relations');
        const maxReminderId = await sqliteGet(sqlite, 'SELECT MAX(id) as max_id FROM reminders');
        const maxBindRequestId = await sqliteGet(sqlite, 'SELECT MAX(id) as max_id FROM bind_requests').catch(() => ({ max_id: 0 }));
        const maxLogId = await sqliteGet(sqlite, 'SELECT MAX(id) as max_id FROM activity_logs');
        const maxHealthId = await sqliteGet(sqlite, 'SELECT MAX(id) as max_id FROM health_records');
        const maxEmergencyId = await sqliteGet(sqlite, 'SELECT MAX(id) as max_id FROM emergency_calls');
        const maxOcrId = await sqliteGet(sqlite, 'SELECT MAX(id) as max_id FROM medication_ocr_records').catch(() => ({ max_id: 0 }));

        await pool.query(`SELECT setval(pg_get_serial_sequence('users','id'), $1, true)`, [Number(maxUserId?.max_id || 1)]);
        await pool.query(`SELECT setval(pg_get_serial_sequence('relations','id'), $1, true)`, [Number(maxRelationId?.max_id || 1)]);
        await pool.query(`SELECT setval(pg_get_serial_sequence('reminders','id'), $1, true)`, [Number(maxReminderId?.max_id || 1)]);
        await pool.query(`SELECT setval(pg_get_serial_sequence('bind_requests','id'), $1, true)`, [Number(maxBindRequestId?.max_id || 1)]);
        await pool.query(`SELECT setval(pg_get_serial_sequence('activity_logs','id'), $1, true)`, [Number(maxLogId?.max_id || 1)]);
        await pool.query(`SELECT setval(pg_get_serial_sequence('health_records','id'), $1, true)`, [Number(maxHealthId?.max_id || 1)]);
        await pool.query(`SELECT setval(pg_get_serial_sequence('emergency_calls','id'), $1, true)`, [Number(maxEmergencyId?.max_id || 1)]);
        await pool.query(`SELECT setval(pg_get_serial_sequence('medication_ocr_records','id'), $1, true)`, [Number(maxOcrId?.max_id || 1)]);

        console.log('SQLite -> Postgres 数据迁移完成');
    } finally {
        sqlite.close();
        await pool.end();
    }
}

main().catch((err) => {
    console.error(err.message);
    process.exit(1);
});
