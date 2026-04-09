const path = require('path');
const bcrypt = require('bcryptjs');

function detectDbClient() {
    const explicit = (process.env.DB_CLIENT || '').trim().toLowerCase();
    if (explicit === 'postgres' || explicit === 'postgresql' || explicit === 'pg') return 'postgres';
    if (explicit === 'sqlite' || explicit === 'sqlite3') return 'sqlite';

    const hasPgEnv = Boolean(process.env.DATABASE_URL || process.env.PGHOST || process.env.PGDATABASE);
    return hasPgEnv ? 'postgres' : 'sqlite';
}

function replaceQuestionParams(sql) {
    let index = 0;
    let inSingle = false;
    let inDouble = false;
    let result = '';
    for (let i = 0; i < sql.length; i += 1) {
        const ch = sql[i];
        if (ch === "'" && !inDouble) {
            const prev = sql[i - 1];
            if (prev !== '\\') inSingle = !inSingle;
            result += ch;
            continue;
        }
        if (ch === '"' && !inSingle) {
            const prev = sql[i - 1];
            if (prev !== '\\') inDouble = !inDouble;
            result += ch;
            continue;
        }
        if (!inSingle && !inDouble && ch === '?') {
            index += 1;
            result += `$${index}`;
            continue;
        }
        result += ch;
    }
    return result;
}

function isInsertSql(sql) {
    const s = String(sql).trim().toLowerCase();
    return s.startsWith('insert ');
}

function hasReturning(sql) {
    return /\breturning\b/i.test(sql);
}

function createSqliteDb() {
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = path.resolve(__dirname, 'database.sqlite');
    const sqlite = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('数据库连接失败:', err.message);
        } else {
            console.log('已连接到 SQLite 数据库');
            initSqliteTables(sqlite);
        }
    });
    return sqlite;
}

function initSqliteTables(db) {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            role TEXT,
            nickname TEXT,
            phone TEXT,
            avatar TEXT,
            emergency_contact TEXT,
            emergency_phone TEXT,
            is_vip INTEGER DEFAULT 0,
            vip_expire DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS relations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            elder_id INTEGER,
            child_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS reminders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            title TEXT,
            content TEXT,
            remind_time TEXT,
            status INTEGER DEFAULT 0,
            type TEXT,
            created_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            repeat_type TEXT,
            repeat_days TEXT,
            repeat_times TEXT,
            start_date TEXT,
            end_date TEXT,
            enabled INTEGER DEFAULT 1
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS bind_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            elder_id INTEGER,
            child_id INTEGER,
            verify_code TEXT,
            status TEXT DEFAULT 'pending',
            expires_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action_type TEXT,
            action_desc TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS health_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            steps INTEGER DEFAULT 0,
            medication_taken INTEGER DEFAULT 0,
            record_date DATE DEFAULT CURRENT_DATE
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS emergency_calls (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            location_lat REAL,
            location_lng REAL,
            address TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value_enc TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS medication_ocr_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            image_hash TEXT,
            raw_text TEXT,
            extracted_json TEXT,
            elder_summary TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        sqliteEnsureColumn(db, 'users', 'is_vip', 'INTEGER DEFAULT 0');
        sqliteEnsureColumn(db, 'users', 'vip_expire', 'DATETIME');
        sqliteEnsureColumn(db, 'relations', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
        sqliteEnsureColumn(db, 'reminders', 'created_by', 'INTEGER');
        sqliteEnsureColumn(db, 'reminders', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
        sqliteEnsureColumn(db, 'reminders', 'repeat_type', 'TEXT');
        sqliteEnsureColumn(db, 'reminders', 'repeat_days', 'TEXT');
        sqliteEnsureColumn(db, 'reminders', 'repeat_times', 'TEXT');
        sqliteEnsureColumn(db, 'reminders', 'start_date', 'TEXT');
        sqliteEnsureColumn(db, 'reminders', 'end_date', 'TEXT');
        sqliteEnsureColumn(db, 'reminders', 'enabled', 'INTEGER DEFAULT 1');
        sqliteEnsureColumn(db, 'bind_requests', 'status', 'TEXT DEFAULT \'pending\'');
        sqliteEnsureColumn(db, 'bind_requests', 'expires_at', 'DATETIME');
        sqliteEnsureColumn(db, 'bind_requests', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
        sqliteEnsureColumn(db, 'app_settings', 'value_enc', 'TEXT');
        sqliteEnsureColumn(db, 'app_settings', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
        sqliteEnsureColumn(db, 'medication_ocr_records', 'image_hash', 'TEXT');
        sqliteEnsureColumn(db, 'medication_ocr_records', 'raw_text', 'TEXT');
        sqliteEnsureColumn(db, 'medication_ocr_records', 'extracted_json', 'TEXT');
        sqliteEnsureColumn(db, 'medication_ocr_records', 'elder_summary', 'TEXT');
        sqliteEnsureColumn(db, 'medication_ocr_records', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');

        db.run(`CREATE UNIQUE INDEX IF NOT EXISTS uidx_relations_elder_child ON relations(elder_id, child_id)`);
        db.run(`CREATE UNIQUE INDEX IF NOT EXISTS uidx_health_user_date ON health_records(user_id, record_date)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_activity_logs_user_time ON activity_logs(user_id, created_at)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_reminders_user_status_time ON reminders(user_id, status, remind_time)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_emergency_user_time ON emergency_calls(user_id, created_at)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_bind_requests_elder_status ON bind_requests(elder_id, status, created_at)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_bind_requests_child_status ON bind_requests(child_id, status, created_at)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_med_ocr_user_time ON medication_ocr_records(user_id, created_at)`);

        seedAdminUserSqlite(db);
    });
}

function sqliteEnsureColumn(db, table, column, definition) {
    db.all(`PRAGMA table_info(${table})`, (err, rows) => {
        if (err) return;
        const exists = (rows || []).some((r) => r.name === column);
        if (exists) return;
        db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    });
}

function seedAdminUserSqlite(db) {
    const username = (process.env.ADMIN_USERNAME || '').trim();
    const password = String(process.env.ADMIN_PASSWORD || '');
    const nickname = (process.env.ADMIN_NICKNAME || '管理员').trim();
    if (!username || !password) return;

    db.get(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`, [], (err, row) => {
        if (err) return;
        if (row) return;
        const passwordHash = bcrypt.hashSync(password, 10);
        db.run(`INSERT INTO users (username, password, role, nickname) VALUES (?, ?, 'admin', ?)`, [username, passwordHash, nickname], (insertErr) => {
            if (insertErr) {
                console.error('初始化管理员失败:', insertErr.message);
            } else {
                console.log('已初始化管理员账号');
            }
        });
    });
}

function createPostgresDb() {
    const pg = require('pg');
    const { Pool, types } = pg;
    types.setTypeParser(20, (val) => (val === null ? null : parseInt(val, 10)));

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        host: process.env.PGHOST,
        port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
        ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined
    });

    const db = {
        async _query(sql, params) {
            const text = replaceQuestionParams(sql);
            return pool.query(text, params || []);
        },
        run(sql, params, cb) {
            const p = Array.isArray(params) ? params : [];
            const callback = typeof params === 'function' ? params : cb;

            let finalSql = sql;
            if (isInsertSql(finalSql) && !hasReturning(finalSql)) {
                finalSql = `${String(finalSql).replace(/;+\s*$/g, '')} RETURNING id`;
            }

            const promise = this._query(finalSql, p)
                .then((result) => {
                    const id = result && result.rows && result.rows[0] ? result.rows[0].id : undefined;
                    if (typeof callback === 'function') callback.call({ lastID: id }, null);
                    return { lastID: id, rowCount: result.rowCount };
                })
                .catch((err) => {
                    if (typeof callback === 'function') callback.call({}, err);
                    else throw err;
                });

            return promise;
        },
        get(sql, params, cb) {
            const p = Array.isArray(params) ? params : [];
            const callback = typeof params === 'function' ? params : cb;

            const promise = this._query(sql, p)
                .then((result) => {
                    const row = result && result.rows && result.rows.length ? result.rows[0] : undefined;
                    if (typeof callback === 'function') callback(null, row);
                    return row;
                })
                .catch((err) => {
                    if (typeof callback === 'function') callback(err);
                    else throw err;
                });

            return promise;
        },
        all(sql, params, cb) {
            const p = Array.isArray(params) ? params : [];
            const callback = typeof params === 'function' ? params : cb;

            const promise = this._query(sql, p)
                .then((result) => {
                    const rows = result && result.rows ? result.rows : [];
                    if (typeof callback === 'function') callback(null, rows);
                    return rows;
                })
                .catch((err) => {
                    if (typeof callback === 'function') callback(err);
                    else throw err;
                });

            return promise;
        },
        serialize(fn) {
            fn();
        }
    };

    initPostgresSchema(db).catch((err) => {
        console.error('Postgres 初始化失败:', err.message);
    });

    return db;
}

async function initPostgresSchema(db) {
    await db.run(`CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT,
        nickname TEXT,
        phone TEXT,
        avatar TEXT,
        emergency_contact TEXT,
        emergency_phone TEXT,
        is_vip INTEGER DEFAULT 0,
        vip_expire TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await db.run(`CREATE TABLE IF NOT EXISTS relations (
        id BIGSERIAL PRIMARY KEY,
        elder_id BIGINT,
        child_id BIGINT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await db.run(`CREATE TABLE IF NOT EXISTS reminders (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT,
        title TEXT,
        content TEXT,
        remind_time TEXT,
        status INTEGER DEFAULT 0,
        type TEXT,
        created_by BIGINT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        repeat_type TEXT,
        repeat_days TEXT,
        repeat_times TEXT,
        start_date TEXT,
        end_date TEXT,
        enabled INTEGER DEFAULT 1
    )`);

    await db.run(`CREATE TABLE IF NOT EXISTS bind_requests (
        id BIGSERIAL PRIMARY KEY,
        elder_id BIGINT,
        child_id BIGINT,
        verify_code TEXT,
        status TEXT DEFAULT 'pending',
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await db.run(`CREATE TABLE IF NOT EXISTS activity_logs (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT,
        action_type TEXT,
        action_desc TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await db.run(`CREATE TABLE IF NOT EXISTS health_records (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT,
        steps INTEGER DEFAULT 0,
        medication_taken INTEGER DEFAULT 0,
        record_date DATE DEFAULT CURRENT_DATE
    )`);

    await db.run(`CREATE TABLE IF NOT EXISTS emergency_calls (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT,
        location_lat DOUBLE PRECISION,
        location_lng DOUBLE PRECISION,
        address TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await db.run(`CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value_enc TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await db.run(`CREATE TABLE IF NOT EXISTS medication_ocr_records (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT,
        image_hash TEXT,
        raw_text TEXT,
        extracted_json TEXT,
        elder_summary TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await db.run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_vip INTEGER DEFAULT 0`);
    await db.run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS vip_expire TIMESTAMPTZ`);
    await db.run(`ALTER TABLE relations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`);
    await db.run(`ALTER TABLE reminders ADD COLUMN IF NOT EXISTS created_by BIGINT`);
    await db.run(`ALTER TABLE reminders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`);
    await db.run(`ALTER TABLE reminders ADD COLUMN IF NOT EXISTS repeat_type TEXT`);
    await db.run(`ALTER TABLE reminders ADD COLUMN IF NOT EXISTS repeat_days TEXT`);
    await db.run(`ALTER TABLE reminders ADD COLUMN IF NOT EXISTS repeat_times TEXT`);
    await db.run(`ALTER TABLE reminders ADD COLUMN IF NOT EXISTS start_date TEXT`);
    await db.run(`ALTER TABLE reminders ADD COLUMN IF NOT EXISTS end_date TEXT`);
    await db.run(`ALTER TABLE reminders ADD COLUMN IF NOT EXISTS enabled INTEGER DEFAULT 1`);
    await db.run(`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS value_enc TEXT`);
    await db.run(`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`);
    await db.run(`ALTER TABLE medication_ocr_records ADD COLUMN IF NOT EXISTS image_hash TEXT`);
    await db.run(`ALTER TABLE medication_ocr_records ADD COLUMN IF NOT EXISTS raw_text TEXT`);
    await db.run(`ALTER TABLE medication_ocr_records ADD COLUMN IF NOT EXISTS extracted_json TEXT`);
    await db.run(`ALTER TABLE medication_ocr_records ADD COLUMN IF NOT EXISTS elder_summary TEXT`);
    await db.run(`ALTER TABLE medication_ocr_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`);

    await db.run(`CREATE UNIQUE INDEX IF NOT EXISTS uidx_relations_elder_child ON relations(elder_id, child_id)`);
    await db.run(`CREATE UNIQUE INDEX IF NOT EXISTS uidx_health_user_date ON health_records(user_id, record_date)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_activity_logs_user_time ON activity_logs(user_id, created_at)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_reminders_user_status_time ON reminders(user_id, status, remind_time)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_emergency_user_time ON emergency_calls(user_id, created_at)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_bind_requests_elder_status ON bind_requests(elder_id, status, created_at)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_bind_requests_child_status ON bind_requests(child_id, status, created_at)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_med_ocr_user_time ON medication_ocr_records(user_id, created_at)`);

    await seedAdminUserPostgres(db);
    console.log('已连接到 Postgres 数据库');
}

async function seedAdminUserPostgres(db) {
    const username = (process.env.ADMIN_USERNAME || '').trim();
    const password = String(process.env.ADMIN_PASSWORD || '');
    const nickname = (process.env.ADMIN_NICKNAME || '管理员').trim();
    if (!username || !password) return;

    const admin = await db.get(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`, []);
    if (admin) return;

    const passwordHash = bcrypt.hashSync(password, 10);
    await db.run(`INSERT INTO users (username, password, role, nickname) VALUES (?, ?, 'admin', ?)`, [username, passwordHash, nickname]);
    console.log('已初始化管理员账号');
}

const client = detectDbClient();
const db = client === 'postgres' ? createPostgresDb() : createSqliteDb();

module.exports = db;
