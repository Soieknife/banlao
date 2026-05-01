/**
 * AI 聊天会话管理服务
 */

const db = require('../../db');

// 获取或创建AI会话（每个用户一个默认会话）
async function getOrCreateAISession(userId) {
    if (!userId) throw new Error('userId 必须提供');

    try {
        // 查找用户的默认AI会话
        const result = await db.get(
            `SELECT * FROM ai_chat_sessions WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1`,
            [userId]
        );

        if (result) {
            return result;
        }

        // 创建新会话
        const sessionName = `AI助手-${new Date().toLocaleDateString('zh-CN')}`;
        const insertResult = await db.run(
            `INSERT INTO ai_chat_sessions (user_id, session_name) VALUES (?, ?)`,
            [userId, sessionName]
        );

        return {
            id: insertResult.lastID,
            user_id: userId,
            session_name: sessionName,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
    } catch (error) {
        console.error('[AI Session] 创建会话失败:', error.message);
        throw error;
    }
}

// 获取用户所有AI会话列表
async function getAISessions(userId, limit = 20, offset = 0) {
    if (!userId) throw new Error('userId 必须提供');

    try {
        const sessions = await db.all(
            `SELECT * FROM ai_chat_sessions WHERE user_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
            [userId, limit, offset]
        );

        // 获取每个会话的最后一条消息
        const sessionsWithPreview = await Promise.all(
            sessions.map(async (session) => {
                const lastMessage = await db.get(
                    `SELECT content FROM ai_chat_messages WHERE session_id = ? ORDER BY created_at DESC LIMIT 1`,
                    [session.id]
                );
                return {
                    ...session,
                    last_message: lastMessage ? lastMessage.content : null
                };
            })
        );

        return sessionsWithPreview;
    } catch (error) {
        console.error('[AI Session] 获取会话列表失败:', error.message);
        throw error;
    }
}

// 获取会话内的消息（分页）
async function getAIMessages(sessionId, limit = 50, offset = 0) {
    if (!sessionId) throw new Error('sessionId 必须提供');

    try {
        const messages = await db.all(
            `SELECT id, sender_type, content, created_at
             FROM ai_chat_messages
             WHERE session_id = ?
             ORDER BY created_at ASC
             LIMIT ? OFFSET ?`,
            [sessionId, limit, offset]
        );

        return messages.map((msg) => ({
            ...msg,
            sender_role: msg.sender_type // 保持命名统一
        }));
    } catch (error) {
        console.error('[AI Session] 获取消息失败:', error.message);
        throw error;
    }
}

// 保存AI消息到会话
async function saveAIMessage(sessionId, senderType, content) {
    if (!sessionId || !senderType || !content) {
        throw new Error('sessionId, senderType, content 都必须提供');
    }

    try {
        const result = await db.run(
            `INSERT INTO ai_chat_messages (session_id, sender_type, content) VALUES (?, ?, ?)`,
            [sessionId, senderType, content]
        );

        // 更新会话的 updated_at
        await db.run(
            `UPDATE ai_chat_sessions SET updated_at = ? WHERE id = ?`,
            [new Date().toISOString(), sessionId]
        );

        return {
            id: result.lastID,
            session_id: sessionId,
            sender_type: senderType,
            content: content,
            created_at: new Date().toISOString()
        };
    } catch (error) {
        console.error('[AI Session] 保存消息失败:', error.message);
        throw error;
    }
}

// 删除会话（可选）
async function deleteAISession(sessionId) {
    if (!sessionId) throw new Error('sessionId 必须提供');

    try {
        // 先删除会话内的所有消息
        await db.run(`DELETE FROM ai_chat_messages WHERE session_id = ?`, [sessionId]);

        // 再删除会话
        await db.run(`DELETE FROM ai_chat_sessions WHERE id = ?`, [sessionId]);

        return { success: true };
    } catch (error) {
        console.error('[AI Session] 删除会话失败:', error.message);
        throw error;
    }
}

module.exports = {
    getOrCreateAISession,
    getAISessions,
    getAIMessages,
    saveAIMessage,
    deleteAISession
};
