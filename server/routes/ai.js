const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const aiService = require('../services/ai');
const aiSessionService = require('../services/chat/ai-session');

/**
 * 获取或创建 AI 会话
 * @route POST /api/ai/session
 */
router.post('/session', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const session = await aiSessionService.getOrCreateAISession(userId);
        res.success(session);
    } catch (error) {
        console.error('[AI] 创建会话失败:', error.message);
        res.error(error.message || '创建会话失败', 500);
    }
});

/**
 * 获取 AI 会话列表
 * @route GET /api/ai/sessions
 */
router.get('/sessions', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const offset = parseInt(req.query.offset) || 0;

        const sessions = await aiSessionService.getAISessions(userId, limit, offset);
        res.success(sessions);
    } catch (error) {
        console.error('[AI] 获取会话列表失败:', error.message);
        res.error(error.message || '获取会话列表失败', 500);
    }
});

/**
 * 获取 AI 会话的消息历史
 * @route GET /api/ai/messages/:sessionId
 */
router.get('/messages/:sessionId', auth, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        const offset = parseInt(req.query.offset) || 0;

        const messages = await aiSessionService.getAIMessages(sessionId, limit, offset);
        res.success(messages);
    } catch (error) {
        console.error('[AI] 获取消息失败:', error.message);
        res.error(error.message || '获取消息失败', 500);
    }
});

/**
 * AI 陪聊接口（带会话持久化）
 * @route POST /api/ai/chat
 */
router.post('/chat', auth, async (req, res) => {
    try {
        const { message, sessionId } = req.body;
        const userId = req.user.id;

        if (!message) {
            return res.error('消息不能为空', 400);
        }

        // 获取或创建会话
        let session = sessionId ? { id: sessionId } : null;
        if (!session) {
            session = await aiSessionService.getOrCreateAISession(userId);
        }

        // 保存用户消息
        const userMsg = await aiSessionService.saveAIMessage(
            session.id,
            'user',
            message
        );

        // 调用 AI 服务获取回复
        let aiResponse = '我暂时无法回复，请稍后重试。';
        try {
            const response = await aiService.chat(message);
            if (typeof response === 'string' && response.trim()) {
                aiResponse = response.trim();
            } else if (response && typeof response.response === 'string' && response.response.trim()) {
                aiResponse = response.response.trim();
            }
        } catch (aiError) {
            console.error('[AI] AI 服务调用失败:', aiError.message);
            // 使用默认回复，但继续处理
        }

        // 保存 AI 回复
        const aiMsg = await aiSessionService.saveAIMessage(
            session.id,
            'ai',
            aiResponse
        );

        res.success({
            session_id: session.id,
            messages: [userMsg, aiMsg]
        });
    } catch (error) {
        console.error('[AI] 聊天失败:', error.message);
        res.error(error.message || '聊天失败', 500);
    }
});

module.exports = router;
