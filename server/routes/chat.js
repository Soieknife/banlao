const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const sessionService = require('../services/chat/session');
const messageService = require('../services/chat/message');
const authMiddleware = require('../middleware/auth');

// 所有聊天路由都需要认证
router.use(authMiddleware);

const voiceUploadDir = path.join(__dirname, '..', 'static', 'chat-voice');
const imageUploadDir = path.join(__dirname, '..', 'static', 'chat-images');
fs.mkdirSync(voiceUploadDir, { recursive: true });
fs.mkdirSync(imageUploadDir, { recursive: true });

const voiceStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, voiceUploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '') || '.wav';
    cb(null, `voice-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  }
});

const voiceUpload = multer({
  storage: voiceStorage,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, imageUploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '') || '.jpg';
    cb(null, `image-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  }
});

const imageUpload = multer({
  storage: imageStorage,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

router.post('/upload-voice', voiceUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ code: 400, message: '缺少语音文件', data: null });
    }

    const host = req.headers.host;
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const relativePath = `/static/chat-voice/${req.file.filename}`;

    res.json({
      code: 200,
      message: '语音上传成功',
      data: {
        url: `${protocol}://${host}${relativePath}`,
        path: relativePath,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('上传语音失败:', error);
    res.status(500).json({ code: 500, message: '上传语音失败', data: null });
  }
});

router.post('/upload-image', imageUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ code: 400, message: '缺少图片文件', data: null });
    }

    const host = req.headers.host;
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const relativePath = `/static/chat-images/${req.file.filename}`;

    res.json({
      code: 200,
      message: '图片上传成功',
      data: {
        url: `${protocol}://${host}${relativePath}`,
        path: relativePath,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('上传图片失败:', error);
    res.status(500).json({ code: 500, message: '上传图片失败', data: null });
  }
});

// POST /api/chat/send - 发送消息
router.post('/send', async (req, res) => {
  try {
    const { sessionId, content, messageType = 'text', attachments } = req.body;
    const userId = req.user.id;

    if (!sessionId || !content) {
      return res.status(400).json({ code: 400, message: '缺少必要参数', data: null });
    }

    const message = await messageService.sendMessage(sessionId, userId, content, messageType, attachments);

    res.json({
      code: 200,
      message: '消息发送成功',
      data: message
    });
  } catch (error) {
    console.error('发送消息失败:', error);
    res.status(500).json({ code: 500, message: '发送消息失败', data: null });
  }
});

// GET /api/chat/sessions - 获取会话列表
router.get('/sessions', async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const sessions = await sessionService.getUserSessions(userId, limit, offset);

    res.json({
      code: 200,
      message: '获取会话列表成功',
      data: sessions
    });
  } catch (error) {
    console.error('获取会话列表失败:', error);
    res.status(500).json({ code: 500, message: '获取会话列表失败', data: null });
  }
});

// GET /api/chat/session/:sessionId - 获取会话详情
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await sessionService.getSessionDetail(sessionId);

    if (!session) {
      return res.status(404).json({ code: 404, message: '会话不存在', data: null });
    }

    res.json({
      code: 200,
      message: '获取会话详情成功',
      data: session
    });
  } catch (error) {
    console.error('获取会话详情失败:', error);
    res.status(500).json({ code: 500, message: '获取会话详情失败', data: null });
  }
});

// GET /api/chat/messages/:sessionId - 获取消息历史
router.get('/messages/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const messages = await sessionService.getSessionMessages(sessionId, limit, offset);

    // 标记这些消息已读
    if (messages && messages.length > 0) {
      await messageService.markSessionMessagesAsRead(sessionId, userId);
    }

    res.json({
      code: 200,
      message: '获取消息历史成功',
      data: messages
    });
  } catch (error) {
    console.error('获取消息历史失败:', error);
    res.status(500).json({ code: 500, message: '获取消息历史失败', data: null });
  }
});

// POST /api/chat/mark-read - 标记消息已读
router.post('/mark-read', async (req, res) => {
  try {
    const { messageId, sessionId } = req.body;
    const userId = req.user.id;

    if (sessionId) {
      await messageService.markSessionMessagesAsRead(sessionId, userId);
    } else if (messageId) {
      await messageService.markMessageAsRead(messageId, userId);
    }

    res.json({
      code: 200,
      message: '标记成功',
      data: null
    });
  } catch (error) {
    console.error('标记消息失败:', error);
    res.status(500).json({ code: 500, message: '标记消息失败', data: null });
  }
});

// DELETE /api/chat/messages/:messageId - 撤回消息
router.delete('/messages/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;
    const reason = req.body.reason || 'user_recalled';

    await messageService.recallMessage(messageId, userId, reason);

    res.json({
      code: 200,
      message: '消息已撤回',
      data: null
    });
  } catch (error) {
    console.error('撤回消息失败:', error);
    res.status(500).json({ code: 500, message: '撤回消息失败', data: null });
  }
});

// GET /api/chat/unread-count - 获取未读计数
router.get('/unread-count', async (req, res) => {
  try {
    const userId = req.user.id;
    const sessions = await sessionService.getUserSessions(userId);

    let totalUnread = 0;
    const sessionUnreadMap = {};

    for (const session of sessions) {
      const count = await messageService.getUnreadMessageCount(session.id, userId);
      sessionUnreadMap[session.id] = count;
      totalUnread += count;
    }

    res.json({
      code: 200,
      message: '获取未读计数成功',
      data: {
        total: totalUnread,
        sessions: sessionUnreadMap
      }
    });
  } catch (error) {
    console.error('获取未读计数失败:', error);
    res.status(500).json({ code: 500, message: '获取未读计数失败', data: null });
  }
});

// POST /api/chat/create-session - 创建或获取会话
router.post('/create-session', async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ code: 400, message: '缺少 targetUserId', data: null });
    }

    const session = await sessionService.getOrCreateSession(userId, targetUserId);

    res.json({
      code: 200,
      message: '会话获取/创建成功',
      data: session
    });
  } catch (error) {
    console.error('创建会话失败:', error);
    res.status(500).json({ code: 500, message: '创建会话失败', data: null });
  }
});

// GET /api/chat/search - 搜索消息
router.get('/search', async (req, res) => {
  try {
    const { sessionId, keyword } = req.query;

    if (!sessionId || !keyword) {
      return res.status(400).json({ code: 400, message: '缺少 sessionId 或 keyword', data: null });
    }

    const messages = await messageService.searchMessages(sessionId, keyword);

    res.json({
      code: 200,
      message: '搜索成功',
      data: messages
    });
  } catch (error) {
    console.error('搜索消息失败:', error);
    res.status(500).json({ code: 500, message: '搜索消息失败', data: null });
  }
});

module.exports = router;
