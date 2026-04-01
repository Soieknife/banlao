const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

/**
 * 权限校验中间件 (仅限管理员)
 */
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.error('权限不足，仅限管理员访问', 403);
    }
};

/**
 * 获取所有用户列表
 * @route GET /api/admin/users
 */
router.get('/users', auth, isAdmin, (req, res) => {
    const sql = `SELECT id, username, role, nickname, is_vip, vip_expire, created_at FROM users ORDER BY created_at DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.error(err.message, 500);
        res.success(rows);
    });
});

/**
 * 设置用户 VIP 状态
 * @route POST /api/admin/set_vip
 */
router.post('/set_vip', auth, isAdmin, (req, res) => {
    const { user_id, days } = req.body;
    if (!user_id || !days) return res.error('参数不完整', 400);

    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + parseInt(days));
    const expireStr = expireDate.toISOString();

    const sql = `UPDATE users SET is_vip = 1, vip_expire = ? WHERE id = ?`;
    db.run(sql, [expireStr, user_id], function(err) {
        if (err) return res.error(err.message, 500);
        res.success(null, '会员状态设置成功');
    });
});

/**
 * 获取系统统计信息
 * @route GET /api/admin/stats
 */
router.get('/stats', auth, isAdmin, (req, res) => {
    const stats = {};
    
    db.serialize(() => {
        db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
            stats.total_users = row.count;
        });
        db.get("SELECT COUNT(*) as count FROM users WHERE role = 'elder'", (err, row) => {
            stats.elder_count = row.count;
        });
        db.get("SELECT COUNT(*) as count FROM users WHERE role = 'child'", (err, row) => {
            stats.child_count = row.count;
        });
        db.get("SELECT COUNT(*) as count FROM users WHERE is_vip = 1", (err, row) => {
            stats.vip_count = row.count;
            res.success(stats);
        });
    });
});

/**
 * 查看全平台活动日志
 * @route GET /api/admin/logs
 */
router.get('/logs', auth, isAdmin, (req, res) => {
    const sql = `
        SELECT l.*, u.nickname as user_name 
        FROM activity_logs l 
        JOIN users u ON l.user_id = u.id 
        ORDER BY l.created_at DESC LIMIT 100
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.error(err.message, 500);
        res.success(rows);
    });
});

module.exports = router;
