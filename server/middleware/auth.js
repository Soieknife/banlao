const jwt = require('jsonwebtoken');

/**
 * JWT 认证中间件
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
const authMiddleware = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(401).json({ code: 401, message: '未授权，请提供 token', data: null });
    }

    try {
        const raw = String(token).trim();
        const value = raw.toLowerCase().startsWith('bearer ') ? raw.slice(7).trim() : raw;
        const decoded = jwt.verify(value, process.env.JWT_SECRET || 'warm_sun_secret');
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ code: 403, message: '无效的 token', data: null });
    }
};

module.exports = authMiddleware;
