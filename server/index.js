const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const responseHandler = require('./middleware/response');
const config = require('./config');

const app = express();
const PORT = config.server.port;

/**
 * 后端入口程序
 */
app.use(morgan('dev'));
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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

app.use('/admin', express.static(path.join(__dirname, 'admin-ui')));

// 测试接口
app.get('/api/health', (req, res) => {
    res.success(null, 'API 服务正常运行');
});

// 错误处理
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.error('服务器内部错误', 500);
});

app.listen(PORT, () => {
    console.log(`服务器已启动，运行在 http://localhost:${PORT}`);
});
