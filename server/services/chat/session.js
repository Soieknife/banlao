const db = require('../../db');
const dayjs = require('dayjs');

// 获取或创建会话
async function getOrCreateSession(elderId, childId) {
  return new Promise((resolve, reject) => {
    // 先查询是否存在
    db.get(
      `SELECT * FROM chat_sessions WHERE (elder_id = ? AND child_id = ?) OR (elder_id = ? AND child_id = ?)`,
      [elderId, childId, childId, elderId],
      (err, row) => {
        if (err) return reject(err);
        if (row) return resolve(row);

        // 不存在则创建
        const now = dayjs().toISOString();
        db.run(
          `INSERT INTO chat_sessions (elder_id, child_id, created_at, last_message_at)
           VALUES (?, ?, ?, ?)`,
          [elderId, childId, now, now],
          function(err) {
            if (err) return reject(err);
            resolve({
              id: this.lastID,
              elder_id: elderId,
              child_id: childId,
              created_at: now,
              last_message_at: now
            });
          }
        );
      }
    );
  });
}

// 获取用户的所有会话
async function getUserSessions(userId, limit = 50, offset = 0) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT cs.*,
              u1.nickname as elder_name, u1.role as elder_role,
              u2.nickname as child_name, u2.role as child_role,
              (SELECT COUNT(*) FROM chat_messages WHERE session_id = cs.id AND sender_id != ? AND is_read = 0) as unread_count,
              (SELECT content FROM chat_messages WHERE session_id = cs.id ORDER BY created_at DESC LIMIT 1) as last_message,
              (SELECT message_type FROM chat_messages WHERE session_id = cs.id ORDER BY created_at DESC LIMIT 1) as last_message_type,
              (SELECT attachments FROM chat_messages WHERE session_id = cs.id ORDER BY created_at DESC LIMIT 1) as last_message_attachments
       FROM chat_sessions cs
       LEFT JOIN users u1 ON cs.elder_id = u1.id
       LEFT JOIN users u2 ON cs.child_id = u2.id
       WHERE cs.elder_id = ? OR cs.child_id = ?
       ORDER BY cs.last_message_at DESC
       LIMIT ? OFFSET ?`,
      [userId, userId, userId, limit, offset],
      (err, rows) => {
        if (err) return reject(err);
        resolve((rows || []).map((row) => ({
          ...row,
          last_message_attachments: row?.last_message_attachments
            ? (() => {
                try {
                  return JSON.parse(row.last_message_attachments);
                } catch (error) {
                  return null;
                }
              })()
            : null
        })));
      }
    );
  });
}

// 获取会话消息历史
async function getSessionMessages(sessionId, limit = 50, offset = 0) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT cm.*,
              u.nickname as sender_name, u.avatar,
              (SELECT 1 FROM chat_message_recalls WHERE message_id = cm.id LIMIT 1) as is_recalled
       FROM chat_messages cm
       LEFT JOIN users u ON cm.sender_id = u.id
       WHERE cm.session_id = ?
       ORDER BY cm.created_at DESC
       LIMIT ? OFFSET ?`,
      [sessionId, limit, offset],
      (err, rows) => {
        if (err) return reject(err);
        // 反转顺序以确保时间轴正确
        resolve((rows || []).reverse());
      }
    );
  });
}

// 获取会话详情
async function getSessionDetail(sessionId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT cs.*,
              u1.nickname as elder_name, u1.id as elder_id,
              u2.nickname as child_name, u2.id as child_id
       FROM chat_sessions cs
       LEFT JOIN users u1 ON cs.elder_id = u1.id
       LEFT JOIN users u2 ON cs.child_id = u2.id
       WHERE cs.id = ?`,
      [sessionId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row);
      }
    );
  });
}

// 获取未读计数
async function getUnreadCount(userId, sessionId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT unread_count FROM chat_unread_count WHERE user_id = ? AND session_id = ?`,
      [userId, sessionId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row ? row.unread_count : 0);
      }
    );
  });
}

// 更新未读计数
async function updateUnreadCount(userId, sessionId, count) {
  return new Promise((resolve, reject) => {
    // 先查询是否存在
    db.get(
      `SELECT id FROM chat_unread_count WHERE user_id = ? AND session_id = ?`,
      [userId, sessionId],
      (err, row) => {
        if (err) return reject(err);

        if (row) {
          // 更新
          db.run(
            `UPDATE chat_unread_count SET unread_count = ? WHERE user_id = ? AND session_id = ?`,
            [count, userId, sessionId],
            (err) => {
              if (err) return reject(err);
              resolve();
            }
          );
        } else {
          // 插入
          db.run(
            `INSERT INTO chat_unread_count (user_id, session_id, unread_count) VALUES (?, ?, ?)`,
            [userId, sessionId, count],
            (err) => {
              if (err) return reject(err);
              resolve();
            }
          );
        }
      }
    );
  });
}

// 清除会话未读计数
async function clearUnreadCount(userId, sessionId) {
  return updateUnreadCount(userId, sessionId, 0);
}

module.exports = {
  getOrCreateSession,
  getUserSessions,
  getSessionMessages,
  getSessionDetail,
  getUnreadCount,
  updateUnreadCount,
  clearUnreadCount
};
