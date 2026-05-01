const socketIO = require('socket.io');
const dayjs = require('dayjs');
const db = require('../../db');

// 存储在线用户的映射
const onlineUsers = new Map(); // userId -> socket
const userSessions = new Map(); // userId -> [sessionIds]

function initializeWebSocket(httpServer) {
  const io = socketIO(httpServer, {
    cors: {
      origin: '*',
      credentials: true
    }
  });

  io.use((socket, next) => {
    const token = socket.handshake.query.token;
    const userId = socket.handshake.query.userId;

    if (!userId) {
      return next(new Error('Unauthorized: Missing userId'));
    }

    socket.userId = parseInt(userId);
    next();
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    console.log(`[Chat] User ${userId} connected: ${socket.id}`);

    // 记录在线用户
    onlineUsers.set(userId, socket);

    // 广播用户上线
    io.emit('user_online', { userId, timestamp: dayjs().toISOString() });

    // 发送消息事件
    socket.on('send_message', async (data, callback) => {
      try {
        const { sessionId, content, type = 'text' } = data;

        if (!sessionId || !content) {
          return callback({ error: 'Missing sessionId or content' });
        }

        // 生成消息ID
        const messageId = `msg_${Date.now()}_${userId}`;
        const now = dayjs().toISOString();

        // 保存消息到数据库
        const result = await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO chat_messages (session_id, sender_id, sender_role, message_type, content, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [sessionId, userId, 'unknown', type, content, now, now],
            function(err) {
              if (err) reject(err);
              else resolve({ id: this.lastID });
            }
          );
        });

        const chatMessage = {
          id: result.id,
          messageId,
          sessionId,
          senderId: userId,
          content,
          type,
          timestamp: now,
          isRead: 0
        };

        // 更新会话时间戳
        await new Promise((resolve, reject) => {
          db.run(
            `UPDATE chat_sessions SET last_message_at = ? WHERE id = ?`,
            [now, sessionId],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });

        // 广播消息给会话中的两个用户
        io.to(`session_${sessionId}`).emit('receive_message', chatMessage);

        callback({ success: true, message: chatMessage });
      } catch (error) {
        console.error('[Chat] Send message error:', error);
        callback({ error: error.message });
      }
    });

    // 标记已读事件
    socket.on('mark_read', async (data, callback) => {
      try {
        const { messageId } = data;
        if (!messageId) {
          return callback({ error: 'Missing messageId' });
        }

        await new Promise((resolve, reject) => {
          db.run(
            `UPDATE chat_messages SET is_read = 1 WHERE id = ?`,
            [messageId],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });

        io.emit('message_read', { messageId, userId });
        callback({ success: true });
      } catch (error) {
        console.error('[Chat] Mark read error:', error);
        callback({ error: error.message });
      }
    });

    // 加入会话房间
    socket.on('join_session', async (data, callback) => {
      try {
        const { sessionId } = data;
        if (!sessionId) {
          return callback({ error: 'Missing sessionId' });
        }

        // 加入房间
        socket.join(`session_${sessionId}`);

        // 记录用户的会话
        if (!userSessions.has(userId)) {
          userSessions.set(userId, []);
        }
        if (!userSessions.get(userId).includes(sessionId)) {
          userSessions.get(userId).push(sessionId);
        }

        // 标记该会话的消息为已读（针对该用户）
        await new Promise((resolve, reject) => {
          db.run(
            `UPDATE chat_messages SET is_read = 1
             WHERE session_id = ? AND sender_id != ? AND is_read = 0`,
            [sessionId, userId],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });

        // 清除未读计数
        await new Promise((resolve, reject) => {
          db.run(
            `UPDATE chat_unread_count SET unread_count = 0 WHERE user_id = ? AND session_id = ?`,
            [userId, sessionId],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });

        console.log(`[Chat] User ${userId} joined session ${sessionId}`);
        callback({ success: true });
      } catch (error) {
        console.error('[Chat] Join session error:', error);
        callback({ error: error.message });
      }
    });

    // 离开会话房间
    socket.on('leave_session', (data) => {
      try {
        const { sessionId } = data;
        if (sessionId) {
          socket.leave(`session_${sessionId}`);
          const sessions = userSessions.get(userId) || [];
          const idx = sessions.indexOf(sessionId);
          if (idx > -1) {
            sessions.splice(idx, 1);
          }
          console.log(`[Chat] User ${userId} left session ${sessionId}`);
        }
      } catch (error) {
        console.error('[Chat] Leave session error:', error);
      }
    });

    // 撤回消息
    socket.on('recall_message', async (data, callback) => {
      try {
        const { messageId, sessionId } = data;
        if (!messageId) {
          return callback({ error: 'Missing messageId' });
        }

        // 记录撤回
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO chat_message_recalls (message_id, recalled_by, reason, created_at)
             VALUES (?, ?, ?, ?)`,
            [messageId, userId, 'user_recalled', dayjs().toISOString()],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });

        // 从消息表中删除或标记
        await new Promise((resolve, reject) => {
          db.run(
            `UPDATE chat_messages SET content = '[已撤回]', message_type = 'recalled' WHERE id = ?`,
            [messageId],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });

        // 通知会话中的用户
        if (sessionId) {
          io.to(`session_${sessionId}`).emit('message_recalled', { messageId, userId });
        }

        callback({ success: true });
      } catch (error) {
        console.error('[Chat] Recall message error:', error);
        callback({ error: error.message });
      }
    });

    // 正在输入事件
    socket.on('typing', (data) => {
      const { sessionId, isTyping } = data;
      if (sessionId) {
        socket.to(`session_${sessionId}`).emit('user_typing', {
          userId,
          sessionId,
          isTyping
        });
      }
    });

    // 断开连接
    socket.on('disconnect', () => {
      console.log(`[Chat] User ${userId} disconnected`);
      onlineUsers.delete(userId);
      userSessions.delete(userId);
      io.emit('user_offline', { userId, timestamp: dayjs().toISOString() });
    });
  });

  return io;
}

module.exports = { initializeWebSocket, onlineUsers, userSessions };
