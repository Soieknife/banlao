const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

/**
 * 用户注册 API
 * @route POST /api/user/register
 */
router.post('/register', (req, res) => {
    const { username, password, role, nickname, phone } = req.body;
    if (!username || !password || !role) {
        return res.error('参数不完整', 400);
    }

    const sql = `INSERT INTO users (username, password, role, nickname, phone) VALUES (?, ?, ?, ?, ?)`;
    db.run(sql, [username, password, role, nickname, phone], function(err) {
        if (err) {
            return res.error(err.message, 500);
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

    const sql = `SELECT id, username, role, nickname, is_vip, vip_expire FROM users WHERE username = ? AND password = ?`;
    db.get(sql, [username, password], (err, user) => {
        if (err) {
            return res.error(err.message, 500);
        }
        if (!user) {
            return res.error('用户名或密码错误', 401);
        }

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET || 'warm_sun_secret', { expiresIn: '7d' });
        res.success({ token, user }, '登录成功');
    });
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

module.exports = router;
