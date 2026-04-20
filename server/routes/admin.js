const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const settings = require('../utils/settings');

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

    db.get("SELECT COUNT(*) as count FROM users", [], (err, row) => {
        if (err) return res.error(err.message, 500);
        stats.total_users = Number(row.count || 0);

        db.get("SELECT COUNT(*) as count FROM users WHERE role = 'elder'", [], (err, row) => {
            if (err) return res.error(err.message, 500);
            stats.elder_count = Number(row.count || 0);

            db.get("SELECT COUNT(*) as count FROM users WHERE role = 'child'", [], (err, row) => {
                if (err) return res.error(err.message, 500);
                stats.child_count = Number(row.count || 0);

                db.get("SELECT COUNT(*) as count FROM users WHERE is_vip = 1", [], (err, row) => {
                    if (err) return res.error(err.message, 500);
                    stats.vip_count = Number(row.count || 0);
                    res.success(stats);
                });
            });
        });
    });
});

router.get('/overview', auth, isAdmin, (req, res) => {
    const data = {};

    db.get(`SELECT COUNT(*) as count FROM users`, [], (err, row) => {
        if (err) return res.error(err.message, 500);
        data.total_users = Number(row.count || 0);

        db.get(`SELECT COUNT(*) as count FROM relations`, [], (err2, row2) => {
            if (err2) return res.error(err2.message, 500);
            data.total_relations = Number(row2.count || 0);

            db.get(`SELECT COUNT(*) as count FROM bind_requests WHERE status = 'pending'`, [], (err3, row3) => {
                if (err3) return res.error(err3.message, 500);
                data.pending_bind_requests = Number(row3.count || 0);

                db.get(`SELECT COUNT(*) as count FROM reminders WHERE status = 0`, [], (err4, row4) => {
                    if (err4) return res.error(err4.message, 500);
                    data.pending_reminders = Number(row4.count || 0);

                    db.get(`SELECT COUNT(*) as count FROM emergency_calls`, [], (err5, row5) => {
                        if (err5) return res.error(err5.message, 500);
                        data.emergency_calls = Number(row5.count || 0);

                        db.get(`SELECT COUNT(*) as count FROM medication_ocr_records`, [], (err6, row6) => {
                            if (err6) return res.error(err6.message, 500);
                            data.medication_ocr_records = Number(row6.count || 0);
                            res.success(data);
                        });
                    });
                });
            });
        });
    });
});

router.get('/relations', auth, isAdmin, (req, res) => {
    const sql = `
        SELECT r.*, e.username as elder_username, e.nickname as elder_nickname, c.username as child_username, c.nickname as child_nickname
        FROM relations r
        JOIN users e ON e.id = r.elder_id
        JOIN users c ON c.id = r.child_id
        ORDER BY r.created_at DESC
        LIMIT 200
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.error(err.message, 500);
        res.success(rows || []);
    });
});

router.get('/bind_requests', auth, isAdmin, (req, res) => {
    const sql = `
        SELECT br.*, e.username as elder_username, e.nickname as elder_nickname, c.username as child_username, c.nickname as child_nickname
        FROM bind_requests br
        JOIN users e ON e.id = br.elder_id
        JOIN users c ON c.id = br.child_id
        ORDER BY br.created_at DESC
        LIMIT 200
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.error(err.message, 500);
        res.success(rows || []);
    });
});

router.get('/emergency_calls', auth, isAdmin, (req, res) => {
    const sql = `
        SELECT ec.*, u.username as user_username, u.nickname as user_nickname
        FROM emergency_calls ec
        JOIN users u ON u.id = ec.user_id
        ORDER BY ec.created_at DESC
        LIMIT 200
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.error(err.message, 500);
        res.success(rows || []);
    });
});

router.get('/medication_ocr_records', auth, isAdmin, (req, res) => {
    const sql = `
        SELECT m.id, m.user_id, m.image_hash, m.ocr_provider, m.parse_status, m.parse_method, m.created_at, substr(m.elder_summary, 1, 180) as elder_summary, u.username as user_username, u.nickname as user_nickname
        FROM medication_ocr_records m
        JOIN users u ON u.id = m.user_id
        ORDER BY m.created_at DESC
        LIMIT 200
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.error(err.message, 500);
        res.success(rows || []);
    });
});

router.get('/medication_ocr_record/:id', auth, isAdmin, (req, res) => {
    const sql = `
        SELECT m.*, u.username as user_username, u.nickname as user_nickname
        FROM medication_ocr_records m
        JOIN users u ON u.id = m.user_id
        WHERE m.id = ?
        LIMIT 1
    `;
    db.get(sql, [req.params.id], (err, row) => {
        if (err) return res.error(err.message, 500);
        if (!row) return res.error('记录不存在', 404);
        let extracted = null;
        try {
            extracted = row.extracted_json ? JSON.parse(row.extracted_json) : null;
        } catch (e) {}
        res.success({
            id: row.id,
            user_id: row.user_id,
            user_username: row.user_username,
            user_nickname: row.user_nickname,
            image_hash: row.image_hash,
            ocr_provider: row.ocr_provider || '',
            raw_text: row.raw_text,
            extracted,
            elder_summary: row.elder_summary,
            parse_status: row.parse_status || '',
            parse_method: row.parse_method || '',
            parse_error: row.parse_error || '',
            created_at: row.created_at
        });
    });
});

router.get('/settings', auth, isAdmin, (req, res) => {
    settings.listKeys((err, rows) => {
        if (err) return res.error(err.message, 500);
        const masked = (rows || []).map((r) => ({ key: r.key, updated_at: r.updated_at, masked: true }));
        res.success(masked);
    });
});

router.post('/settings/set', auth, isAdmin, (req, res) => {
    const { key, value } = req.body;
    const k = String(key || '').trim();
    if (!k) return res.error('参数不完整', 400);
    if (k.length > 64) return res.error('key 过长', 400);

    try {
        if (!settings.getKey()) {
            return res.error('未配置 SETTINGS_ENCRYPTION_KEY，无法保存密钥', 400);
        }
    } catch (e) {}

    settings.setSecret(k, String(value || ''), function(err) {
        if (err) return res.error(err.message, 500);
        res.success(null, '设置已保存');
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
