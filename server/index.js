const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const responseHandler = require('./middleware/response');
const config = require('./config');

const app = express();
const PORT = config.server.port;
const HOST = config.server.host;

/**
 * 后端入口程序
 */

// 日志中间件
app.use(morgan(config.logger.format));

// CORS配置
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// 安全中间件
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 请求限制
if (config.api.rateLimit.enabled) {
    const limiter = rateLimit({
        windowMs: config.api.rateLimit.windowMs,
        max: config.api.rateLimit.max,
        message: {
            code: 429,
            message: '请求过于频繁，请稍后再试'
        }
    });
    app.use(limiter);
}

// 解析请求体
app.use(bodyParser.json({
    limit: config.api.upload.maxSize
}));
app.use(bodyParser.urlencoded({ 
    extended: true,
    limit: config.api.upload.maxSize
}));

// 静态文件服务
app.use('/admin', express.static(path.join(__dirname, 'admin-ui')));
app.use('/static', express.static(path.join(__dirname, 'static')));

// 使用统一响应中间件
app.use(responseHandler);

// 路由
app.use('/api/user', require('./routes/user'));
app.use('/api/emergency', require('./routes/emergency'));
app.use('/api/reminder', require('./routes/reminder'));
app.use('/api/life', require('./routes/life'));
app.use('/api/health_record', require('./routes/health'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/relation', require('./routes/relation'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/medication', require('./routes/medication'));

// 测试接口
app.get('/api/health', (req, res) => {
    res.success(null, 'API 服务正常运行');
});

// 404处理
app.use((req, res, next) => {
    res.error('接口不存在', 404);
});

// 错误处理
app.use((err, req, res, next) => {
    console.error(err.stack);
    
    // 处理不同类型的错误
    if (err.name === 'ValidationError') {
        return res.error('数据验证失败', 400, err.details);
    }
    
    if (err.name === 'UnauthorizedError') {
        return res.error('未授权访问', 401);
    }
    
    if (err.code === 'EBADCSRFTOKEN') {
        return res.error('CSRF验证失败', 403);
    }
    
    res.error('服务器内部错误', 500);
});

// 启动服务器
app.listen(PORT, HOST, () => {
    console.log(`服务器已启动，运行在 http://${HOST}:${PORT}`);
    console.log(`环境: ${config.server.env}`);
    console.log(`API 前缀: ${config.api.prefix}`);
});

// 进程管理
process.on('SIGINT', () => {
    console.log('正在关闭服务器...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('正在关闭服务器...');
    process.exit(0);
});

// 未捕获异常处理
process.on('uncaughtException', (err) => {
    console.error('未捕获异常:', err);
    process.exit(1);
});

// 未处理的Promise拒绝处理
process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的Promise拒绝:', reason);
});
