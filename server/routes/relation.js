const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { logActivity } = require('../utils/logger');

/**
 * 校验当前用户是否有权限访问某个老人的数据
 * @param {Object} user - 当前登录用户信息（JWT 解码后）
 * @param {number|string} elderId - 老人用户 ID
 * @param {Function} cb - 回调 (err, allowed)
 */
function canAccessElder(user, elderId, cb) {
    const elderIdNum = Number(elderId);
    if (!Number.isFinite(elderIdNum)) {
        return cb(null, false);
    }

    if (user.role === 'admin') {
        return cb(null, true);
    }

    if (user.role === 'elder' && Number(user.id) === elderIdNum) {
        return cb(null, true);
    }

    if (user.role === 'child') {
        const sql = `SELECT 1 as ok FROM relations WHERE elder_id = ? AND child_id = ? LIMIT 1`;
        return db.get(sql, [elderIdNum, user.id], (err, row) => {
            if (err) return cb(err, false);
            cb(null, Boolean(row));
        });
    }

    cb(null, false);
}

/**
 * 生成绑定验证码
 * @returns {string} 6 位数字验证码
 */
function generateBindCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

function isBindRequestExpired(requestRow) {
    if (!requestRow || requestRow.status !== 'pending' || !requestRow.expires_at) {
        return false;
    }

    const expiresAt = new Date(requestRow.expires_at).getTime();
    return Number.isFinite(expiresAt) && expiresAt < Date.now();
}

function syncExpiredBindRequests(rows, cb) {
    const list = Array.isArray(rows) ? rows : [];
    const expiredIds = [];
    const normalizedRows = list.map((row) => {
        if (isBindRequestExpired(row)) {
            expiredIds.push(row.id);
            return { ...row, status: 'expired' };
        }
        return row;
    });

    if (!expiredIds.length) {
        return cb(null, normalizedRows);
    }

    const uniqueIds = [...new Set(expiredIds)];
    const placeholders = uniqueIds.map(() => '?').join(', ');
    const sql = `UPDATE bind_requests SET status = 'expired' WHERE id IN (${placeholders})`;
    db.run(sql, uniqueIds, (err) => {
        if (err) return cb(err);
        cb(null, normalizedRows);
    });
}

/**
 * 老人端：通过验证码确认绑定（不需要 request_id）
 * @route POST /api/relation/approve_by_code
 */
router.post('/approve_by_code', auth, (req, res) => {
    if (req.user.role !== 'elder') {
        return res.error('仅老人账号可确认绑定', 403);
    }

    const { verify_code } = req.body;
    const code = String(verify_code || '').trim();
    if (code.length !== 6) {
        return res.error('请输入 6 位验证码', 400);
    }

    const sql = `
        SELECT *
        FROM bind_requests
        WHERE elder_id = ? AND status = 'pending' AND verify_code = ?
        ORDER BY created_at DESC
        LIMIT 1
    `;
    db.get(sql, [req.user.id, code], (err, br) => {
        if (err) return res.error(err.message, 500);
        if (!br) return res.error('未找到匹配的绑定申请，请核对验证码', 404);

        if (br.expires_at && new Date(br.expires_at).getTime() < Date.now()) {
            db.run(`UPDATE bind_requests SET status = 'expired' WHERE id = ?`, [br.id]);
            return res.error('验证码已过期，请让子女重新发起绑定', 400);
        }

        const bindSql = `INSERT INTO relations (elder_id, child_id) VALUES (?, ?)`;
        db.run(bindSql, [br.elder_id, br.child_id], function(err) {
            if (err && String(err.message || '').includes('UNIQUE')) {
                db.run(`UPDATE bind_requests SET status = 'approved' WHERE id = ?`, [br.id]);
                return res.success(null, '已绑定（重复请求已忽略）');
            }
            if (err) return res.error(err.message, 500);

            db.run(`UPDATE bind_requests SET status = 'approved' WHERE id = ?`, [br.id]);
            logActivity(br.elder_id, 'bind_approved', `老人通过验证码确认绑定子女账号(${br.child_id})`);
            res.success(null, '绑定成功');
        });
    });
});

/**
 * 子女发起绑定申请（老人端确认 + 验证码）
 * @route POST /api/relation/request_bind
 */
router.post('/request_bind', auth, (req, res) => {
    const { elder_username } = req.body;
    const childId = req.user.id;
    if (req.user.role !== 'child') {
        return res.error('仅子女账号可绑定老人', 403);
    }

    if (!elder_username) {
        return res.error('请输入老人账号', 400);
    }

    const findElderSql = `SELECT id, username, nickname FROM users WHERE username = ? AND role = 'elder'`;
    db.get(findElderSql, [elder_username], (err, elder) => {
        if (err) return res.error(err.message, 500);
        if (!elder) return res.error('找不到该老人账号', 404);

        const checkSql = `SELECT id FROM relations WHERE elder_id = ? AND child_id = ?`;
        db.get(checkSql, [elder.id, childId], (err, row) => {
            if (err) return res.error(err.message, 500);
            if (row) return res.error('已经绑定过该老人', 400);

            const code = generateBindCode();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

            const checkPendingSql = `SELECT id FROM bind_requests WHERE elder_id = ? AND child_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1`;
            db.get(checkPendingSql, [elder.id, childId], (err, pending) => {
                if (err) return res.error(err.message, 500);

                if (pending && pending.id) {
                    const updateSql = `UPDATE bind_requests SET verify_code = ?, expires_at = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?`;
                    db.run(updateSql, [code, expiresAt, pending.id], function(err) {
                        if (err) return res.error(err.message, 500);
                        logActivity(elder.id, 'bind_requested', `子女(${childId}) 发起了绑定申请`);
                        res.success({ request_id: pending.id, verify_code: code, expires_at: expiresAt }, '已发起绑定申请，请让老人端输入验证码确认');
                    });
                    return;
                }

                const insertSql = `INSERT INTO bind_requests (elder_id, child_id, verify_code, status, expires_at) VALUES (?, ?, ?, 'pending', ?)`;
                db.run(insertSql, [elder.id, childId, code, expiresAt], function(err) {
                    if (err) return res.error(err.message, 500);
                    logActivity(elder.id, 'bind_requested', `子女(${childId}) 发起了绑定申请`);
                    res.success({ request_id: this.lastID, verify_code: code, expires_at: expiresAt }, '已发起绑定申请，请让老人端输入验证码确认');
                });
            });
        });
    });
});

/**
 * 兼容旧接口：不再直接绑定，改为发起绑定申请
 * @route POST /api/relation/bind
 */
router.post('/bind', auth, (req, res) => {
    res.error('该接口已升级为“绑定申请 + 老人确认”，请改用 /api/relation/request_bind', 410);
});

/**
 * 老人端：查看待确认的绑定申请
 * @route GET /api/relation/pending_requests
 */
router.get('/pending_requests', auth, (req, res) => {
    if (req.user.role !== 'elder') {
        return res.error('仅老人账号可查看绑定申请', 403);
    }

    const sql = `
        SELECT br.id, br.child_id, br.status, br.expires_at, br.created_at, u.username as child_username, u.nickname as child_nickname
        FROM bind_requests br
        JOIN users u ON u.id = br.child_id
        WHERE br.elder_id = ? AND br.status = 'pending'
        ORDER BY br.created_at DESC
    `;
    db.all(sql, [req.user.id], (err, rows) => {
        if (err) return res.error(err.message, 500);
        syncExpiredBindRequests(rows, (syncErr, normalizedRows) => {
            if (syncErr) return res.error(syncErr.message, 500);
            res.success(normalizedRows.filter((row) => row.status === 'pending'));
        });
    });
});

/**
 * 子女端：查看自己发起的绑定申请
 * @route GET /api/relation/my_bind_requests
 */
router.get('/my_bind_requests', auth, (req, res) => {
    if (req.user.role !== 'child') {
        return res.error('仅子女账号可查看绑定申请记录', 403);
    }

    const sql = `
        SELECT
            br.id,
            br.elder_id,
            br.child_id,
            br.verify_code,
            br.status,
            br.expires_at,
            br.created_at,
            u.username as elder_username,
            u.nickname as elder_nickname
        FROM bind_requests br
        JOIN users u ON u.id = br.elder_id
        WHERE br.child_id = ?
        ORDER BY
            CASE br.status
                WHEN 'pending' THEN 0
                WHEN 'approved' THEN 1
                WHEN 'rejected' THEN 2
                WHEN 'expired' THEN 3
                ELSE 4
            END,
            br.created_at DESC
        LIMIT 20
    `;
    db.all(sql, [req.user.id], (err, rows) => {
        if (err) return res.error(err.message, 500);
        syncExpiredBindRequests(rows, (syncErr, normalizedRows) => {
            if (syncErr) return res.error(syncErr.message, 500);
            res.success(normalizedRows);
        });
    });
});

/**
 * 老人端：确认绑定（需要验证码）
 * @route POST /api/relation/approve_bind
 */
router.post('/approve_bind', auth, (req, res) => {
    if (req.user.role !== 'elder') {
        return res.error('仅老人账号可确认绑定', 403);
    }

    const { request_id, verify_code } = req.body;
    if (!request_id || !verify_code) {
        return res.error('参数不完整', 400);
    }

    const sql = `SELECT * FROM bind_requests WHERE id = ? AND elder_id = ? AND status = 'pending' LIMIT 1`;
    db.get(sql, [request_id, req.user.id], (err, br) => {
        if (err) return res.error(err.message, 500);
        if (!br) return res.error('绑定申请不存在或已处理', 404);

        if (br.expires_at && new Date(br.expires_at).getTime() < Date.now()) {
            db.run(`UPDATE bind_requests SET status = 'expired' WHERE id = ?`, [br.id]);
            return res.error('验证码已过期，请让子女重新发起绑定', 400);
        }

        if (String(br.verify_code) !== String(verify_code)) {
            return res.error('验证码错误', 400);
        }

        const bindSql = `INSERT INTO relations (elder_id, child_id) VALUES (?, ?)`;
        db.run(bindSql, [br.elder_id, br.child_id], function(err) {
            if (err && String(err.message || '').includes('UNIQUE')) {
                db.run(`UPDATE bind_requests SET status = 'approved' WHERE id = ?`, [br.id]);
                return res.success(null, '已绑定（重复请求已忽略）');
            }
            if (err) return res.error(err.message, 500);

            db.run(`UPDATE bind_requests SET status = 'approved' WHERE id = ?`, [br.id]);
            logActivity(br.elder_id, 'bind_approved', `老人确认绑定子女账号(${br.child_id})`);
            res.success(null, '绑定成功');
        });
    });
});

/**
 * 老人端：拒绝绑定
 * @route POST /api/relation/reject_bind
 */
router.post('/reject_bind', auth, (req, res) => {
    if (req.user.role !== 'elder') {
        return res.error('仅老人账号可拒绝绑定', 403);
    }
    const { request_id } = req.body;
    if (!request_id) return res.error('参数不完整', 400);

    const sql = `UPDATE bind_requests SET status = 'rejected' WHERE id = ? AND elder_id = ? AND status = 'pending'`;
    db.run(sql, [request_id, req.user.id], function(err) {
        if (err) return res.error(err.message, 500);
        res.success(null, '已拒绝绑定申请');
    });
});

/**
 * 子女端：查询绑定申请状态
 * @route GET /api/relation/request_status/:id
 */
router.get('/request_status/:id', auth, (req, res) => {
    const id = req.params.id;
    const sql = `SELECT id, elder_id, child_id, status, expires_at, created_at FROM bind_requests WHERE id = ? LIMIT 1`;
    db.get(sql, [id], (err, row) => {
        if (err) return res.error(err.message, 500);
        if (!row) return res.error('未找到绑定申请', 404);
        if (req.user.role === 'child' && Number(row.child_id) !== Number(req.user.id)) {
            return res.error('无权限查看该绑定申请', 403);
        }
        if (req.user.role === 'elder' && Number(row.elder_id) !== Number(req.user.id)) {
            return res.error('无权限查看该绑定申请', 403);
        }
        syncExpiredBindRequests([row], (syncErr, normalizedRows) => {
            if (syncErr) return res.error(syncErr.message, 500);
            res.success(normalizedRows[0] || row);
        });
    });
});

/**
 * 获取已绑定的老人列表 API
 * @route GET /api/relation/elders
 */
router.get('/elders', auth, (req, res) => {
    const childId = req.user.id;
    if (req.user.role !== 'child') {
        return res.error('仅子女账号可查看已绑定老人列表', 403);
    }
    const sql = `
        SELECT u.id, u.nickname, u.username, u.avatar, u.is_vip, u.vip_expire
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
 * 老人端：获取已绑定子女列表
 * @route GET /api/relation/my_children
 */
router.get('/my_children', auth, (req, res) => {
    if (req.user.role !== 'elder') {
        return res.error('仅老人账号可查看子女列表', 403);
    }
    const sql = `
        SELECT u.id, u.username, u.nickname, u.phone, u.created_at
        FROM relations r
        JOIN users u ON u.id = r.child_id
        WHERE r.elder_id = ?
        ORDER BY r.created_at DESC
    `;
    db.all(sql, [req.user.id], (err, rows) => {
        if (err) return res.error(err.message, 500);
        res.success(rows);
    });
});

router.post('/unbind', auth, (req, res) => {
    if (req.user.role !== 'child' && req.user.role !== 'admin') {
        return res.error('无权限解绑', 403);
    }
    const { elder_id } = req.body;
    if (!elder_id) return res.error('参数不完整', 400);

    const doUnbind = () => {
        const sql = `DELETE FROM relations WHERE elder_id = ? AND child_id = ?`;
        db.run(sql, [elder_id, req.user.id], function(err) {
            if (err) return res.error(err.message, 500);
            logActivity(elder_id, 'unbind', `子女(${req.user.id}) 解除了绑定关系`);
            res.success(null, '解绑成功');
        });
    };

    if (req.user.role === 'admin') {
        const sql = `DELETE FROM relations WHERE elder_id = ?`;
        db.run(sql, [elder_id], function(err) {
            if (err) return res.error(err.message, 500);
            logActivity(elder_id, 'unbind', `管理员(${req.user.id}) 解除了绑定关系`);
            res.success(null, '解绑成功');
        });
        return;
    }

    canAccessElder(req.user, elder_id, (err, allowed) => {
        if (err) return res.error(err.message, 500);
        if (!allowed) return res.error('无权限解绑该老人（请先绑定）', 403);
        doUnbind();
    });
});

router.post('/remove_child', auth, (req, res) => {
    if (req.user.role !== 'elder' && req.user.role !== 'admin') {
        return res.error('无权限解绑', 403);
    }
    const { child_id } = req.body;
    if (!child_id) return res.error('参数不完整', 400);

    if (req.user.role === 'admin') {
        const sql = `DELETE FROM relations WHERE child_id = ?`;
        db.run(sql, [child_id], function(err) {
            if (err) return res.error(err.message, 500);
            res.success(null, '解绑成功');
        });
        return;
    }

    const sql = `DELETE FROM relations WHERE elder_id = ? AND child_id = ?`;
    db.run(sql, [req.user.id, child_id], function(err) {
        if (err) return res.error(err.message, 500);
        logActivity(req.user.id, 'unbind', `老人解除绑定子女账号(${child_id})`);
        res.success(null, '解绑成功');
    });
});

/**
 * 子女端：获取老人紧急联系人信息
 * @route GET /api/relation/elder_profile/:id
 */
router.get('/elder_profile/:id', auth, (req, res) => {
    const elderId = req.params.id;
    canAccessElder(req.user, elderId, (err, allowed) => {
        if (err) return res.error(err.message, 500);
        if (!allowed) return res.error('无权限查看该老人信息', 403);

        const sql = `SELECT id, username, nickname, emergency_contact, emergency_phone, is_vip, vip_expire FROM users WHERE id = ? LIMIT 1`;
        db.get(sql, [elderId], (err, row) => {
            if (err) return res.error(err.message, 500);
            res.success(row);
        });
    });
});

/**
 * 子女端：设置老人紧急联系人（电话号/提醒文案等可扩展）
 * @route POST /api/relation/update_emergency
 */
router.post('/update_emergency', auth, (req, res) => {
    if (req.user.role !== 'child') {
        return res.error('仅子女账号可设置紧急联系人', 403);
    }
    const { elder_id, emergency_contact, emergency_phone } = req.body;
    if (!elder_id) return res.error('参数不完整', 400);

    canAccessElder(req.user, elder_id, (err, allowed) => {
        if (err) return res.error(err.message, 500);
        if (!allowed) return res.error('无权限修改该老人信息', 403);

        const sql = `UPDATE users SET emergency_contact = ?, emergency_phone = ? WHERE id = ?`;
        db.run(sql, [emergency_contact || '', emergency_phone || '', elder_id], function(err) {
            if (err) return res.error(err.message, 500);
            logActivity(elder_id, 'emergency_contact_updated', `子女(${req.user.id}) 更新了紧急联系人信息`);
            res.success(null, '已更新紧急联系人');
        });
    });
});

/**
 * 子女端：为指定老人开通会员（付费由子女发起）
 * @route POST /api/relation/purchase_vip
 */
router.post('/purchase_vip', auth, (req, res) => {
    if (req.user.role !== 'child') {
        return res.error('仅子女账号可为老人开通会员', 403);
    }

    const { elder_id, plan } = req.body;
    if (!elder_id || !plan) return res.error('参数不完整', 400);

    const planKey = String(plan).trim();
    const days = planKey === 'year' ? 365 : 30;

    canAccessElder(req.user, elder_id, (err, allowed) => {
        if (err) return res.error(err.message, 500);
        if (!allowed) return res.error('无权限为该老人开通会员', 403);

        db.get(`SELECT vip_expire FROM users WHERE id = ? LIMIT 1`, [elder_id], (err, row) => {
            if (err) return res.error(err.message, 500);

            const now = Date.now();
            const currentExpire = row && row.vip_expire ? new Date(row.vip_expire).getTime() : 0;
            const base = currentExpire > now ? currentExpire : now;
            const newExpire = new Date(base + days * 24 * 60 * 60 * 1000).toISOString();

            const updateSql = `UPDATE users SET is_vip = 1, vip_expire = ? WHERE id = ?`;
            db.run(updateSql, [newExpire, elder_id], function(err) {
                if (err) return res.error(err.message, 500);
                logActivity(elder_id, 'vip_purchased', `子女(${req.user.id}) 为老人开通会员(${planKey})`);
                res.success({ vip_expire: newExpire }, '已开通会员');
            });
        });
    });
});

/**
 * 获取指定老人的健康和提醒状态 API
 * @route GET /api/relation/elder_status/:id
 */
router.get('/elder_status/:id', auth, (req, res) => {
    const elderId = req.params.id;
    const today = new Date().toISOString().split('T')[0];

    canAccessElder(req.user, elderId, (err, allowed) => {
        if (err) return res.error(err.message, 500);
        if (!allowed) return res.error('无权限查看该老人信息', 403);

        // 获取今日步数和服药
        const healthSql = `SELECT * FROM health_records WHERE user_id = ? AND record_date = ?`;
        // 获取待办提醒
        const reminderSql = `SELECT * FROM reminders WHERE user_id = ? AND status = 0`;

        db.get(healthSql, [elderId, today], (err, health) => {
            if (err) return res.error(err.message, 500);

            const loadReminders = (finalHealth) => {
                db.all(reminderSql, [elderId], (err, reminders) => {
                    if (err) return res.error(err.message, 500);
                    res.success({ health: finalHealth, reminders });
                });
            };

            if (!health) {
                const insertSql = `INSERT INTO health_records (user_id, steps, medication_taken, record_date) VALUES (?, 0, 0, ?)`;
                db.run(insertSql, [elderId, today], function(insertErr) {
                    if (insertErr && String(insertErr.message || '').includes('UNIQUE')) {
                        return db.get(healthSql, [elderId, today], (err, row) => {
                            if (err) return res.error(err.message, 500);
                            loadReminders(row);
                        });
                    }
                    if (insertErr) return res.error(insertErr.message, 500);
                    db.get(healthSql, [elderId, today], (err, row) => {
                        if (err) return res.error(err.message, 500);
                        loadReminders(row);
                    });
                });
                return;
            }

            loadReminders(health);
        });
    });
});

/**
 * 获取指定老人的活动日志 API
 * @route GET /api/relation/elder_logs/:id
 */
router.get('/elder_logs/:id', auth, (req, res) => {
    const elderId = req.params.id;
    canAccessElder(req.user, elderId, (err, allowed) => {
        if (err) return res.error(err.message, 500);
        if (!allowed) return res.error('无权限查看该老人活动日志', 403);

        const sql = `SELECT * FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`;
        db.all(sql, [elderId], (err, rows) => {
            if (err) return res.error(err.message, 500);
            res.success(rows);
        });
    });
});

module.exports = router;
