const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

/**
 * 用户注册 API
 * @route POST /api/user/register
 */
router.post('/register', (req, res) => {
    const { username, password, role, nickname, phone } = req.body;
    if (!username || !password || !role || !nickname) {
        return res.error('参数不完整', 400);
    }

    const normalizedRole = String(role).trim();
    if (!['elder', 'child'].includes(normalizedRole)) {
        return res.error('非法角色，仅允许 elder 或 child 注册', 400);
    }

    if (String(password).length < 6) {
        return res.error('密码长度至少 6 位', 400);
    }

    const passwordHash = bcrypt.hashSync(String(password), 10);
    const sql = `INSERT INTO users (username, password, role, nickname, phone) VALUES (?, ?, ?, ?, ?)`;
    db.run(sql, [username, passwordHash, normalizedRole, nickname, phone], function(err) {
        if (err) {
            if (String(err.message || '').includes('UNIQUE')) {
                return res.error('用户名已存在', 409);
            }
            return res.error('注册失败', 500);
        }
        res.success({ id: this.lastID }, '注册成功');
    });
});

/**
 * 用户登录 API
 * @route POST /api/user/login
 */
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.error('参数不完整', 400);
    }

    const sql = `SELECT id, username, role, nickname, password, is_vip, vip_expire FROM users WHERE username = ?`;
    db.get(sql, [username], (err, user) => {
        if (err) {
            return res.error(err.message, 500);
        }
        if (!user) {
            return res.error('用户名或密码错误', 401);
        }

        const storedPassword = String(user.password || '');
        const inputPassword = String(password);

        let isMatch = false;
        if (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2y$')) {
            isMatch = bcrypt.compareSync(inputPassword, storedPassword);
        } else {
            isMatch = storedPassword === inputPassword;
            if (isMatch) {
                const upgradedHash = bcrypt.hashSync(inputPassword, 10);
                db.run(`UPDATE users SET password = ? WHERE id = ?`, [upgradedHash, user.id]);
            }
        }

        if (!isMatch) {
            return res.error('用户名或密码错误', 401);
        }

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET || 'warm_sun_secret', { expiresIn: '7d' });
        const now = new Date().toISOString();
        db.run(
            `UPDATE users SET is_logged_in = 1, last_login_at = ?, last_logout_at = NULL WHERE id = ?`,
            [now, user.id],
            (updateErr) => {
                if (updateErr) {
                    return res.error('登录状态更新失败', 500);
                }
                res.success({
                    token,
                    user: {
                        id: user.id,
                        username: user.username,
                        role: user.role,
                        nickname: user.nickname,
                        is_vip: user.is_vip,
                        vip_expire: user.vip_expire,
                        is_logged_in: 1,
                        last_login_at: now
                    }
                }, '登录成功');
            }
        );
    });
});

router.get('/session-status', require('../middleware/auth'), (req, res) => {
    const sql = `SELECT id, username, role, nickname, is_vip, vip_expire, is_logged_in, last_login_at, last_logout_at FROM users WHERE id = ?`;
    db.get(sql, [req.user.id], (err, user) => {
        if (err) {
            return res.error(err.message, 500);
        }
        if (!user) {
            return res.error('用户不存在', 404);
        }
        res.success({
            is_logged_in: Number(user.is_logged_in) === 1,
            user
        });
    });
});

router.post('/logout', require('../middleware/auth'), (req, res) => {
    const now = new Date().toISOString();
    db.run(
        `UPDATE users SET is_logged_in = 0, last_logout_at = ? WHERE id = ?`,
        [now, req.user.id],
        function(err) {
            if (err) {
                return res.error('退出登录失败', 500);
            }
            res.success({
                is_logged_in: false,
                last_logout_at: now
            }, '已退出登录');
        }
    );
});

/**
 * 获取用户信息 API
 * @route GET /api/user/profile
 */
router.get('/profile', require('../middleware/auth'), (req, res) => {
    const sql = `SELECT id, username, role, nickname, phone, avatar, emergency_contact, emergency_phone, is_vip, vip_expire FROM users WHERE id = ?`;
    db.get(sql, [req.user.id], (err, user) => {
        if (err) {
            return res.error(err.message, 500);
        }
        res.success(user);
    });
});

router.post('/profile/update', require('../middleware/auth'), (req, res) => {
    const { nickname, phone, emergency_contact, emergency_phone, password } = req.body || {};
    const updates = [];
    const values = [];

    if (typeof nickname === 'string') {
        updates.push('nickname = ?');
        values.push(nickname.trim());
    }
    if (typeof phone === 'string') {
        updates.push('phone = ?');
        values.push(phone.trim());
    }
    if (typeof emergency_contact === 'string') {
        updates.push('emergency_contact = ?');
        values.push(emergency_contact.trim());
    }
    if (typeof emergency_phone === 'string') {
        updates.push('emergency_phone = ?');
        values.push(emergency_phone.trim());
    }
    if (typeof password === 'string' && password.trim()) {
        if (password.trim().length < 6) {
            return res.error('密码长度至少 6 位', 400);
        }
        updates.push('password = ?');
        values.push(bcrypt.hashSync(password.trim(), 10));
    }

    if (!updates.length) {
        return res.error('没有可更新的内容', 400);
    }

    values.push(req.user.id);
    db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values, function(err) {
        if (err) return res.error(err.message, 500);
        db.get(
            `SELECT id, username, role, nickname, phone, avatar, emergency_contact, emergency_phone, is_vip, vip_expire FROM users WHERE id = ?`,
            [req.user.id],
            (e2, user) => {
                if (e2) return res.error(e2.message, 500);
                res.success(user, '个人信息已更新');
            }
        );
    });
});

module.exports = router;
