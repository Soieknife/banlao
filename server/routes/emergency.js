const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { logActivity } = require('../utils/logger');

/**
 * 发起紧急求助 API
 * @route POST /api/emergency/call
 */
router.post('/call', auth, (req, res) => {
    const { lat, lng, address } = req.body;
    const userId = req.user.id;

    const sql = `INSERT INTO emergency_calls (user_id, location_lat, location_lng, address) VALUES (?, ?, ?, ?)`;
    db.run(sql, [userId, lat, lng, address], function(err) {
        if (err) {
            return res.error(err.message, 500);
        }
        
        // 记录日志
        logActivity(userId, 'emergency_call', `用户发起了紧急求助，位置: ${address || '未知'}`);
        
        // 此处可以集成短信或推送服务，通知绑定的子女
        // 模拟通知过程
        console.log(`用户 ${userId} 发起求助，位置: ${address || '未知'}`);
        
        res.success({ id: this.lastID }, '紧急求助已发出，请原地等待，子女将立即联系您');
    });
});

/**
 * 获取紧急求助历史 API
 * @route GET /api/emergency/history
 */
router.get('/history', auth, (req, res) => {
    const userId = req.user.id;
    const sql = `SELECT * FROM emergency_calls WHERE user_id = ? ORDER BY created_at DESC`;
    db.all(sql, [userId], (err, rows) => {
        if (err) {
            return res.error(err.message, 500);
        }
        res.success(rows);
    });
});

module.exports = router;
