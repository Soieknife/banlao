const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

/**
 * 获取天气 API
 * @route GET /api/life/weather
 */
router.get('/weather', (req, res) => {
    // 实际开发可集成心知天气、和风天气等 API
    const weatherData = {
        city: '北京',
        temp: '22',
        weather: '晴',
        humidity: '45%',
        wind: '北风 2 级',
        advice: '天气晴朗，适合出门走走哦'
    };
    res.success(weatherData);
});

/**
 * 获取常用电话 API
 * @route GET /api/life/contacts
 */
router.get('/contacts', auth, (req, res) => {
    const userId = req.user.id;
    // 模拟常用电话
    const contacts = [
        { name: '急救电话', phone: '120', type: 'emergency' },
        { name: '报警电话', phone: '110', type: 'emergency' },
        { name: '社区服务', phone: '010-12345', type: 'service' },
        { name: '物业电话', phone: '010-67890', type: 'service' }
    ];
    res.success(contacts);
});

module.exports = router;
