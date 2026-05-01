const db = require('../../db');
const dayjs = require('dayjs');

// 发送消息
async function sendMessage(sessionId, senderId, content, messageType = 'text', attachments = null) {
  return new Promise((resolve, reject) => {
    const now = dayjs().toISOString();
    const attachmentsStr = attachments ? JSON.stringify(attachments) : null;

    db.run(
      `INSERT INTO chat_messages (session_id, sender_id, message_type, content, attachments, is_read, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
      [sessionId, senderId, messageType, content, attachmentsStr, now, now],
      function(err) {
        if (err) return reject(err);

        // 更新会话的最后消息时间
        db.run(
          `UPDATE chat_sessions SET last_message_at = ? WHERE id = ?`,
          [now, sessionId],
          (updateErr) => {
            if (updateErr) return reject(updateErr);
            resolve({
              id: this.lastID,
              sessionId,
              senderId,
              content,
              messageType,
              attachments: attachments ? JSON.parse(attachmentsStr) : null,
              isRead: 0,
              createdAt: now
            });
          }
        );
      }
    );
  });
}

// 标记消息已读
async function markMessageAsRead(messageId, userId) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE chat_messages SET is_read = 1 WHERE id = ?`,
      [messageId],
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });
}

// 标记会话的消息已读
async function markSessionMessagesAsRead(sessionId, userId) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE chat_messages SET is_read = 1
       WHERE session_id = ? AND sender_id != ? AND is_read = 0`,
      [sessionId, userId],
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });
}

// 获取未读消息数
async function getUnreadMessageCount(sessionId, userId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT COUNT(*) as count FROM chat_messages
       WHERE session_id = ? AND sender_id != ? AND is_read = 0`,
      [sessionId, userId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row ? row.count : 0);
      }
    );
  });
}

// 撤回消息
async function recallMessage(messageId, recalledBy, reason = null) {
  return new Promise((resolve, reject) => {
    const now = dayjs().toISOString();

    // 1. 记录撤回
    db.run(
      `INSERT INTO chat_message_recalls (message_id, recalled_by, reason, created_at)
       VALUES (?, ?, ?, ?)`,
      [messageId, recalledBy, reason, now],
      (insertErr) => {
        if (insertErr) return reject(insertErr);

        // 2. 更新消息
        db.run(
          `UPDATE chat_messages SET content = '[已撤回]', message_type = 'recalled', updated_at = ? WHERE id = ?`,
          [now, messageId],
          (updateErr) => {
            if (updateErr) return reject(updateErr);
            resolve();
          }
        );
      }
    );
  });
}

// 删除消息
async function deleteMessage(messageId) {
  return new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM chat_messages WHERE id = ?`,
      [messageId],
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });
}

// 获取消息详情
async function getMessage(messageId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM chat_messages WHERE id = ?`,
      [messageId],
      (err, row) => {
        if (err) return reject(err);
        if (row) {
          row.attachments = row.attachments ? JSON.parse(row.attachments) : null;
        }
        resolve(row);
      }
    );
  });
}

// 搜索消息
async function searchMessages(sessionId, keyword, limit = 50) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT cm.* FROM chat_messages cm
       WHERE cm.session_id = ? AND cm.content LIKE ?
       ORDER BY cm.created_at DESC
       LIMIT ?`,
      [sessionId, `%${keyword}%`, limit],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });
}

module.exports = {
  sendMessage,
  markMessageAsRead,
  markSessionMessagesAsRead,
  getUnreadMessageCount,
  recallMessage,
  deleteMessage,
  getMessage,
  searchMessages
};
