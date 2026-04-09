const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { logActivity } = require('../utils/logger');

/**
 * 校验当前用户是否可以为某个老人推送提醒
 * @param {Object} user - 当前登录用户（JWT 解码后）
 * @param {number|string} elderId - 老人用户 ID
 * @param {Function} cb - 回调 (err, allowed)
 */
function canPushToElder(user, elderId, cb) {
    const elderIdNum = Number(elderId);
    if (!Number.isFinite(elderIdNum)) {
        return cb(null, false);
    }

    if (user.role === 'admin') {
        return cb(null, true);
    }

    if (user.role !== 'child') {
        return cb(null, false);
    }

    const sql = `
        SELECT 1 as ok
        FROM relations r
        JOIN users u ON u.id = r.elder_id AND u.role = 'elder'
        WHERE r.elder_id = ? AND r.child_id = ?
        LIMIT 1
    `;
    db.get(sql, [elderIdNum, user.id], (err, row) => {
        if (err) return cb(err, false);
        cb(null, Boolean(row));
    });
}

/**
 * 获取提醒列表 API
 * @route GET /api/reminder/list
 */
router.get('/list', auth, (req, res) => {
    const userId = req.user.id;
    const sql = `SELECT * FROM reminders WHERE user_id = ? ORDER BY status ASC, created_at DESC, remind_time ASC`;
    db.all(sql, [userId], (err, rows) => {
        if (err) {
            return res.error(err.message, 500);
        }
        res.success(rows);
    });
});

/**
 * 子女端：获取某位老人的提醒列表
 * @route GET /api/reminder/elder_list/:elderId
 */
router.get('/elder_list/:elderId', auth, (req, res) => {
    const elderId = req.params.elderId;
    if (req.user.role !== 'child' && req.user.role !== 'admin') {
        return res.error('无权限查看该老人提醒', 403);
    }

    return canPushToElder(req.user, elderId, (err, allowed) => {
        if (err) return res.error(err.message, 500);
        if (!allowed) return res.error('无权限查看该老人提醒（请先绑定）', 403);

        const sql = `SELECT * FROM reminders WHERE user_id = ? ORDER BY status ASC, created_at DESC, remind_time ASC`;
        db.all(sql, [elderId], (err, rows) => {
            if (err) return res.error(err.message, 500);
            res.success(rows);
        });
    });
});

/**
 * 添加提醒 API
 * @route POST /api/reminder/add
 */
router.post('/add', auth, (req, res) => {
    const { title, content, remind_time, type, user_id, repeat_type, repeat_days, repeat_times, start_date, end_date, enabled } = req.body;
    const currentUserId = req.user.id;
    
    // 如果传了 user_id，说明是子女在设置，这里简单处理，实际应检查绑定关系
    const targetUserId = user_id || currentUserId;

    const insert = () => {
        const sql = `INSERT INTO reminders (user_id, title, content, remind_time, type, created_by, repeat_type, repeat_days, repeat_times, start_date, end_date, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        db.run(sql, [
            targetUserId,
            title,
            content,
            remind_time,
            type,
            currentUserId,
            repeat_type || 'once',
            repeat_days || '',
            repeat_times || '',
            start_date || '',
            end_date || '',
            typeof enabled === 'number' ? enabled : 1
        ], function(err) {
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
    };

    if (Number(targetUserId) !== Number(currentUserId)) {
        return canPushToElder(req.user, targetUserId, (err, allowed) => {
            if (err) return res.error(err.message, 500);
            if (!allowed) return res.error('无权限为该老人推送提醒（请先绑定）', 403);
            insert();
        });
    }

    insert();
});

/**
 * 子女端：更新提醒
 * @route POST /api/reminder/update/:id
 */
router.post('/update/:id', auth, (req, res) => {
    const id = req.params.id;
    const { title, content, remind_time, type, repeat_type, repeat_days, repeat_times, start_date, end_date, enabled } = req.body;

    const findSql = `SELECT id, user_id FROM reminders WHERE id = ? LIMIT 1`;
    db.get(findSql, [id], (err, reminder) => {
        if (err) return res.error(err.message, 500);
        if (!reminder) return res.error('提醒不存在', 404);

        const targetUserId = reminder.user_id;

        const doUpdate = () => {
            const sql = `
                UPDATE reminders
                SET title = ?, content = ?, remind_time = ?, type = ?,
                    repeat_type = ?, repeat_days = ?, repeat_times = ?, start_date = ?, end_date = ?, enabled = ?
                WHERE id = ?
            `;
            db.run(sql, [
                title,
                content,
                remind_time,
                type,
                repeat_type || 'once',
                repeat_days || '',
                repeat_times || '',
                start_date || '',
                end_date || '',
                typeof enabled === 'number' ? enabled : 1,
                id
            ], function(err) {
                if (err) return res.error(err.message, 500);
                logActivity(targetUserId, 'reminder_updated', `提醒已更新: ${title || ''}`);
                res.success(null, '提醒已更新');
            });
        };

        if (req.user.role === 'admin') return doUpdate();
        if (req.user.role === 'elder' && Number(req.user.id) === Number(targetUserId)) return doUpdate();
        if (req.user.role === 'child') {
            return canPushToElder(req.user, targetUserId, (err, allowed) => {
                if (err) return res.error(err.message, 500);
                if (!allowed) return res.error('无权限更新该老人提醒（请先绑定）', 403);
                doUpdate();
            });
        }

        res.error('无权限更新提醒', 403);
    });
});

/**
 * 子女端：删除提醒
 * @route POST /api/reminder/delete/:id
 */
router.post('/delete/:id', auth, (req, res) => {
    const id = req.params.id;

    const findSql = `SELECT id, user_id, title FROM reminders WHERE id = ? LIMIT 1`;
    db.get(findSql, [id], (err, reminder) => {
        if (err) return res.error(err.message, 500);
        if (!reminder) return res.error('提醒不存在', 404);

        const targetUserId = reminder.user_id;

        const doDelete = () => {
            const sql = `DELETE FROM reminders WHERE id = ?`;
            db.run(sql, [id], function(err) {
                if (err) return res.error(err.message, 500);
                logActivity(targetUserId, 'reminder_deleted', `提醒已删除: ${reminder.title || ''}`);
                res.success(null, '提醒已删除');
            });
        };

        if (req.user.role === 'admin') return doDelete();
        if (req.user.role === 'elder' && Number(req.user.id) === Number(targetUserId)) return doDelete();
        if (req.user.role === 'child') {
            return canPushToElder(req.user, targetUserId, (err, allowed) => {
                if (err) return res.error(err.message, 500);
                if (!allowed) return res.error('无权限删除该老人提醒（请先绑定）', 403);
                doDelete();
            });
        }

        res.error('无权限删除提醒', 403);
    });
});

/**
 * 标记提醒已完成 API
 * @route POST /api/reminder/complete/:id
 */
router.post('/complete/:id', auth, (req, res) => {
    const { id } = req.params;
    const findSql = `SELECT id, user_id, title FROM reminders WHERE id = ? LIMIT 1`;
    db.get(findSql, [id], (err, reminder) => {
        if (err) return res.error(err.message, 500);
        if (!reminder) return res.error('提醒不存在', 404);

        const targetUserId = reminder.user_id;

        const doComplete = () => {
            const sql = `UPDATE reminders SET status = 1 WHERE id = ?`;
            db.run(sql, [id], function(err) {
                if (err) return res.error(err.message, 500);
                logActivity(targetUserId, 'reminder_completed', `提醒完成: ${reminder.title || ''}`);
                res.success(null, '已标记为完成');
            });
        };

        if (req.user.role === 'admin') return doComplete();
        if (req.user.role === 'elder' && Number(req.user.id) === Number(targetUserId)) return doComplete();
        if (req.user.role === 'child') {
            return canPushToElder(req.user, targetUserId, (err, allowed) => {
                if (err) return res.error(err.message, 500);
                if (!allowed) return res.error('无权限完成该老人提醒（请先绑定）', 403);
                doComplete();
            });
        }

        res.error('无权限完成提醒', 403);
    });
});

module.exports = router;
