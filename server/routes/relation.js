const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

/**
 * 绑定老人 API
 * @route POST /api/relation/bind
 */
router.post('/bind', auth, (req, res) => {
    const { elder_username } = req.body;
    const childId = req.user.id;

    // 先找到老人的 ID
    const findElderSql = `SELECT id FROM users WHERE username = ? AND role = 'elder'`;
    db.get(findElderSql, [elder_username], (err, elder) => {
        if (err) return res.error(err.message, 500);
        if (!elder) return res.error('找不到该老人账号', 404);

        // 检查是否已经绑定
        const checkSql = `SELECT id FROM relations WHERE elder_id = ? AND child_id = ?`;
        db.get(checkSql, [elder.id, childId], (err, row) => {
            if (err) return res.error(err.message, 500);
            if (row) return res.error('已经绑定过该老人', 400);

            // 执行绑定
            const bindSql = `INSERT INTO relations (elder_id, child_id) VALUES (?, ?)`;
            db.run(bindSql, [elder.id, childId], function(err) {
                if (err) return res.error(err.message, 500);
                res.success(null, '绑定成功');
            });
        });
    });
});

/**
 * 获取已绑定的老人列表 API
 * @route GET /api/relation/elders
 */
router.get('/elders', auth, (req, res) => {
    const childId = req.user.id;
    const sql = `
        SELECT u.id, u.nickname, u.username, u.avatar 
        FROM relations r 
        JOIN users u ON r.elder_id = u.id 
        WHERE r.child_id = ?
    `;
    db.all(sql, [childId], (err, rows) => {
        if (err) return res.error(err.message, 500);
        res.success(rows);
    });
});

/**
 * 获取指定老人的健康和提醒状态 API
 * @route GET /api/relation/elder_status/:id
 */
router.get('/elder_status/:id', auth, (req, res) => {
    const elderId = req.params.id;
    const today = new Date().toISOString().split('T')[0];

    // 获取今日步数和服药
    const healthSql = `SELECT * FROM health_records WHERE user_id = ? AND record_date = ?`;
    // 获取待办提醒
    const reminderSql = `SELECT * FROM reminders WHERE user_id = ? AND status = 0`;

    db.get(healthSql, [elderId, today], (err, health) => {
        if (err) return res.error(err.message, 500);
        
        db.all(reminderSql, [elderId], (err, reminders) => {
            if (err) return res.error(err.message, 500);
            res.success({ health, reminders });
        });
    });
});

/**
 * 获取指定老人的活动日志 API
 * @route GET /api/relation/elder_logs/:id
 */
router.get('/elder_logs/:id', auth, (req, res) => {
    const elderId = req.params.id;
    const sql = `SELECT * FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`;
    db.all(sql, [elderId], (err, rows) => {
        if (err) return res.error(err.message, 500);
        res.success(rows);
    });
});

module.exports = router;
