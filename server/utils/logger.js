const db = require('../db');

/**
 * 记录用户活动日志
 * @param {number} userId - 用户 ID
 * @param {string} type - 活动类型 (e.g., 'medicine_taken', 'app_open')
 * @param {string} desc - 活动描述
 */
const logActivity = (userId, type, desc) => {
    const sql = `INSERT INTO activity_logs (user_id, action_type, action_desc) VALUES (?, ?, ?)`;
    db.run(sql, [userId, type, desc], (err) => {
        if (err) console.error('日志记录失败:', err.message);
    });
};

module.exports = { logActivity };
