const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { logActivity } = require('../utils/logger');

/**
 * 获取今日健康记录 API
 * @route GET /api/health/today
 */
router.get('/today', auth, (req, res) => {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    const sql = `SELECT * FROM health_records WHERE user_id = ? AND record_date = ?`;
    db.get(sql, [userId, today], (err, row) => {
        if (err) {
            return res.error(err.message, 500);
        }
        if (!row) {
            // 如果今天还没有记录，创建一个默认的
            const insertSql = `INSERT INTO health_records (user_id, steps, medication_taken, record_date) VALUES (?, 0, 0, ?)`;
            db.run(insertSql, [userId, today], function(err) {
                if (err) return res.error(err.message, 500);
                res.success({ id: this.lastID, medication_taken: 0, record_date: today });
            });
        } else {
            res.success({ id: row.id, medication_taken: row.medication_taken, record_date: row.record_date });
        }
    });
});

/**
 * 标记今日已服药 API
 * @route POST /api/health/take_medicine
 */
router.post('/take_medicine', auth, (req, res) => {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    const sql = `UPDATE health_records SET medication_taken = 1 WHERE user_id = ? AND record_date = ?`;
    db.run(sql, [userId, today], function(err) {
        if (err) {
            return res.error(err.message, 500);
        }
        
        // 记录日志
        logActivity(userId, 'medicine_taken', '用户标记了今日已服药');
        
        res.success(null, '已记录今日服药');
    });
});

module.exports = router;
