const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { logActivity } = require('../utils/logger');

/**
 * 获取提醒列表 API
 * @route GET /api/reminder/list
 */
router.get('/list', auth, (req, res) => {
    const userId = req.user.id;
    const sql = `SELECT * FROM reminders WHERE user_id = ? ORDER BY remind_time ASC`;
    db.all(sql, [userId], (err, rows) => {
        if (err) {
            return res.error(err.message, 500);
        }
        res.success(rows);
    });
});

/**
 * 添加提醒 API
 * @route POST /api/reminder/add
 */
router.post('/add', auth, (req, res) => {
    const { title, content, remind_time, type, user_id } = req.body;
    const currentUserId = req.user.id;
    
    // 如果传了 user_id，说明是子女在设置，这里简单处理，实际应检查绑定关系
    const targetUserId = user_id || currentUserId;

    const sql = `INSERT INTO reminders (user_id, title, content, remind_time, type, created_by) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(sql, [targetUserId, title, content, remind_time, type, currentUserId], function(err) {
        if (err) {
            return res.error(err.message, 500);
        }

        // 记录日志
        if (currentUserId !== targetUserId) {
            logActivity(targetUserId, 'reminder_pushed', `子女 (${currentUserId}) 为其推送了提醒: ${title}`);
        } else {
            logActivity(targetUserId, 'reminder_set', `用户自己设置了提醒: ${title}`);
        }

        res.success({ id: this.lastID }, '提醒设置成功');
    });
});

/**
 * 标记提醒已完成 API
 * @route POST /api/reminder/complete/:id
 */
router.post('/complete/:id', auth, (req, res) => {
    const { id } = req.params;
    const sql = `UPDATE reminders SET status = 1 WHERE id = ?`;
    db.run(sql, [id], function(err) {
        if (err) {
            return res.error(err.message, 500);
        }
        res.success(null, '已标记为完成');
    });
});

module.exports = router;
