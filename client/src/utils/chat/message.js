import dayjs from 'day.js'

/**
 * 消息处理工具
 */

// 格式化消息时间
export function formatMessageTime(timestamp) {
  const date = dayjs(timestamp)
  const now = dayjs()

  // 如果是今天
  if (date.format('YYYY-MM-DD') === now.format('YYYY-MM-DD')) {
    return date.format('HH:mm')
  }

  // 如果是昨天
  const yesterday = now.subtract(1, 'day').format('YYYY-MM-DD')
  if (date.format('YYYY-MM-DD') === yesterday) {
    return '昨天 ' + date.format('HH:mm')
  }

  // 如果是今年
  if (date.format('YYYY') === now.format('YYYY')) {
    return date.format('MM-DD HH:mm')
  }

  // 其他
  return date.format('YYYY-MM-DD HH:mm')
}

// 分组消息（按时间分组）
export function groupMessagesByTime(messages, groupIntervalMinutes = 5) {
  if (!messages || messages.length === 0) return []

  const grouped = []
  let currentGroup = null

  messages.forEach((msg) => {
    if (!currentGroup) {
      currentGroup = {
        timestamp: msg.created_at || msg.createdAt,
        messages: [msg]
      }
    } else {
      const timeDiff = dayjs(msg.created_at || msg.createdAt).diff(
        dayjs(currentGroup.timestamp),
        'minute'
      )

      if (Math.abs(timeDiff) > groupIntervalMinutes) {
        grouped.push(currentGroup)
        currentGroup = {
          timestamp: msg.created_at || msg.createdAt,
          messages: [msg]
        }
      } else {
        currentGroup.messages.push(msg)
      }
    }
  })

  if (currentGroup) {
    grouped.push(currentGroup)
  }

  return grouped
}

// 检查消息是否需要显示时间戳
export function shouldShowTimestamp(messages, index, groupIntervalMinutes = 5) {
  if (index === 0) return true

  const current = messages[index]
  const prev = messages[index - 1]

  const timeDiff = dayjs(current.created_at || current.createdAt).diff(
    dayjs(prev.created_at || prev.createdAt),
    'minute'
  )

  return Math.abs(timeDiff) > groupIntervalMinutes
}

// 处理消息内容（例如：链接识别、表情识别等）
export function processMessageContent(content, type = 'text') {
  if (type !== 'text') return content

  // URL识别
  const urlRegex = /(https?:\/\/[^\s]+)/g
  let processed = content.replace(urlRegex, '<a href="$1" target="_blank">$1</a>')

  // 换行处理
  processed = processed.replace(/\n/g, '<br/>')

  return processed
}

// 获取消息气泡位置（左/右）
export function getMessageBubblePosition(message, currentUserId) {
  return message.sender_id === currentUserId ? 'right' : 'left'
}

// 获取消息样式类
export function getMessageStyleClass(message, currentUserId) {
  const position = getMessageBubblePosition(message, currentUserId)
  const type = message.message_type || 'text'

  return {
    'message-bubble': true,
    [`message-${position}`]: true,
    [`message-${type}`]: true,
    'message-recalled': type === 'recalled'
  }
}

// 检查消息是否来自当前用户
export function isOwnMessage(message, currentUserId) {
  return message.sender_id === currentUserId
}

// 获取消息的发送者信息
export function getSenderInfo(message) {
  return {
    id: message.sender_id,
    name: message.sender_name || '用户',
    avatar: message.avatar,
    role: message.sender_role
  }
}

// 格式化会话最后消息
export function formatLastMessage(session) {
  if (!session.last_message) return '[暂无消息]'

  const content = session.last_message
  if (content === '[已撤回]') {
    return '[消息已撤回]'
  }

  return content.length > 50 ? content.substring(0, 50) + '...' : content
}

// 创建消息对象
export function createMessageObject(sessionId, senderId, content, type = 'text') {
  return {
    session_id: sessionId,
    sender_id: senderId,
    message_type: type,
    content: content,
    attachments: null,
    is_read: 0,
    created_at: dayjs().toISOString()
  }
}

export default {
  formatMessageTime,
  groupMessagesByTime,
  shouldShowTimestamp,
  processMessageContent,
  getMessageBubblePosition,
  getMessageStyleClass,
  isOwnMessage,
  getSenderInfo,
  formatLastMessage,
  createMessageObject
}
