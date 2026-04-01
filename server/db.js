const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/**
 * 初始化并连接 SQLite 数据库
 */
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('数据库连接失败:', err.message);
    } else {
        console.log('已连接到 SQLite 数据库');
        initTables();
    }
});

/**
 * 创建数据库表结构
 */
function initTables() {
    db.serialize(() => {
        // 用户表 (老人、子女、管理员)
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            role TEXT, -- 'elder', 'child', 'admin'
            nickname TEXT,
            phone TEXT,
            avatar TEXT,
            emergency_contact TEXT,
            emergency_phone TEXT,
            is_vip INTEGER DEFAULT 0, -- 0: no, 1: yes
            vip_expire DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // 绑定关系表 (支持一对多或多对多)
        db.run(`CREATE TABLE IF NOT EXISTS relations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            elder_id INTEGER,
            child_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (elder_id) REFERENCES users(id),
            FOREIGN KEY (child_id) REFERENCES users(id)
        )`);

        // 提醒表 (增加创建者字段)
        db.run(`CREATE TABLE IF NOT EXISTS reminders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            title TEXT,
            content TEXT,
            remind_time TEXT,
            status INTEGER DEFAULT 0, -- 0: pending, 1: done
            type TEXT, -- 'medicine', 'daily', etc.
            created_by INTEGER, -- 记录是由谁创建的 (子女或老人自己)
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (created_by) REFERENCES users(id)
        )`);

        // 活动日志表 (商业项目用于行为分析和查看老人活动)
        db.run(`CREATE TABLE IF NOT EXISTS activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action_type TEXT, -- 'app_open', 'medicine_taken', 'emergency_call', etc.
            action_desc TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`);

        // 健康记录表
        db.run(`CREATE TABLE IF NOT EXISTS health_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            steps INTEGER DEFAULT 0,
            medication_taken INTEGER DEFAULT 0, -- 0: no, 1: yes
            record_date DATE DEFAULT CURRENT_DATE,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`);

        // 紧急求助记录表
        db.run(`CREATE TABLE IF NOT EXISTS emergency_calls (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            location_lat REAL,
            location_lng REAL,
            address TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`);
    });
}

module.exports = db;
