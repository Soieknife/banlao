const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const aiService = require('../services/ai');

/**
 * AI 陪聊接口
 * @route POST /api/ai/chat
 */
router.post('/chat', auth, async (req, res) => {
    const { message } = req.body;
    if (!message) {
        return res.error('消息不能为空', 400);
    }
    
    // 调用真实的 AI 服务
    const response = await aiService.chat(message);
    res.success({ response });
});

module.exports = router;
