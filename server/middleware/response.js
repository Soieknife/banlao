/**
 * 统一响应中间件
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
const responseHandler = (req, res, next) => {
    res.success = (data = null, message = '请求成功', code = 200) => {
        res.status(200).json({
            code,
            message,
            data
        });
    };

    res.error = (message = '请求失败', code = 500, status = null) => {
        const finalStatus = Number.isInteger(status) ? status : code;
        res.status(finalStatus).json({
            code,
            message,
            data: null
        });
    };

    next();
};

module.exports = responseHandler;
