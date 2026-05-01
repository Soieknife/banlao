import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import dayjs from 'dayjs'
import { request } from '@/utils/request'
import { speak, stop as stopSpeech } from '@/utils/voice'
import { AUTHENTICATED_STORAGE_KEY } from '@/utils/auth'

export const useChatStore = defineStore('chat', () => {
  const PLAYED_MESSAGE_STORAGE_KEY = 'chatAutoPlayedMessageIds'
  // 状态
  const sessions = ref([]) // 会话列表
  const messages = ref({}) // 消息字典 { sessionId: [...messages] }
  const currentSessionId = ref(null) // 当前会话ID
  const unreadCounts = ref({}) // 未读计数 { sessionId: count }
  const socket = ref(null) // WebSocket连接
  const isConnected = ref(false) // 是否已连接
  const loading = ref(false) // 加载状态
  const typingUsers = ref({}) // 正在输入的用户 { sessionId: [userIds] }
  const playedMessageIds = ref({})
  const isAnnouncerRunning = ref(false)
  let announcerTimer = null
  let announcementAudio = null

  // 计算属性
  const currentSession = computed(() => {
    return sessions.value.find(s => s.id === currentSessionId.value)
  })

  const currentMessages = computed(() => {
    return messages.value[currentSessionId.value] || []
  })

  const totalUnread = computed(() => {
    return Object.values(unreadCounts.value).reduce((sum, count) => sum + count, 0)
  })

  const hydratePlayedMessageIds = () => {
    try {
      const raw = uni.getStorageSync(PLAYED_MESSAGE_STORAGE_KEY)
      const parsed = raw ? JSON.parse(raw) : {}
      playedMessageIds.value = parsed && typeof parsed === 'object' ? parsed : {}
    } catch (error) {
      playedMessageIds.value = {}
    }
  }

  const persistPlayedMessageIds = () => {
    try {
      uni.setStorageSync(PLAYED_MESSAGE_STORAGE_KEY, JSON.stringify(playedMessageIds.value))
    } catch (error) {
      console.error('[Chat] Persist played message ids error:', error)
    }
  }

  const getCurrentUserId = () => Number(uni.getStorageSync('userId') || 0)
  const getCurrentUserRole = () => uni.getStorageSync('userRole') || ''
  const isAuthenticated = () => uni.getStorageSync(AUTHENTICATED_STORAGE_KEY) === '1'

  const hasMessageBeenPlayed = (messageId) => {
    return Boolean(playedMessageIds.value[String(messageId)])
  }

  const markMessageAsPlayed = (messageId) => {
    if (messageId === undefined || messageId === null) return
    playedMessageIds.value[String(messageId)] = dayjs().toISOString()
    persistPlayedMessageIds()
  }

  const markMessagesAsPlayed = (messageList = []) => {
    let changed = false
    messageList.forEach((message) => {
      if (message?.id === undefined || message?.id === null) return
      const key = String(message.id)
      if (!playedMessageIds.value[key]) {
        playedMessageIds.value[key] = dayjs().toISOString()
        changed = true
      }
    })
    if (changed) {
      persistPlayedMessageIds()
    }
  }

  const stopAnnouncementAudio = () => {
    if (announcementAudio) {
      announcementAudio.stop()
      announcementAudio.destroy()
      announcementAudio = null
    }
  }

  const autoPlayVoiceMessage = (message) => {
    if (!message?.content) return
    stopAnnouncementAudio()
    announcementAudio = uni.createInnerAudioContext()
    announcementAudio.autoplay = true
    announcementAudio.src = message.content
    announcementAudio.onEnded(() => {
      stopAnnouncementAudio()
    })
    announcementAudio.onError((error) => {
      console.error('[Chat] Global voice auto play error:', error)
      stopAnnouncementAudio()
    })
  }

  const announceMessages = (messageList = []) => {
    const token = uni.getStorageSync('token')
    const currentUserId = getCurrentUserId()
    const currentUserRole = getCurrentUserRole()
    if (!isAuthenticated() || !token || !currentUserId || currentUserRole !== 'elder') return

    const incomingMessages = messageList
      .filter((message) => Number(message.sender_id) !== currentUserId)
      .filter((message) => !hasMessageBeenPlayed(message.id))
      .sort((a, b) => dayjs(a.created_at).valueOf() - dayjs(b.created_at).valueOf())

    incomingMessages.forEach((message) => {
      const senderName = message.sender_name || '家人'
      markMessageAsPlayed(message.id)
      if (message.message_type === 'voice') {
        speak(`${senderName}说：发来了一条语音消息`, { immediate: false })
        autoPlayVoiceMessage(message)
        return
      }
      if (message.message_type === 'text' && message.content) {
        speak(`${senderName}说：${message.content}`, { immediate: false })
      }
    })
  }

  const pollAnnouncements = async () => {
    try {
      if (!isAuthenticated() || !uni.getStorageSync('token') || !getCurrentUserId() || getCurrentUserRole() !== 'elder') {
        stopGlobalAnnouncer()
        return
      }
      const latestSessions = await loadSessions()
      for (const session of latestSessions) {
        const sessionMessages = await loadMessages(session.id, 20, 0, { markPlayedOnLoad: false })
        const unreadIncomingMessages = sessionMessages.filter((message) => (
          Number(message.sender_id) !== getCurrentUserId() &&
          Number(message.is_read) === 0
        ))
        announceMessages(unreadIncomingMessages)
      }
    } catch (error) {
      console.error('[Chat] Poll announcements error:', error)
    }
  }

  const startGlobalAnnouncer = () => {
    if (isAnnouncerRunning.value) return
    if (!isAuthenticated() || !uni.getStorageSync('token') || !getCurrentUserId() || getCurrentUserRole() !== 'elder') return
    hydratePlayedMessageIds()
    isAnnouncerRunning.value = true
    pollAnnouncements()
    announcerTimer = setInterval(() => {
      pollAnnouncements()
    }, 5000)
  }

  const stopGlobalAnnouncer = () => {
    isAnnouncerRunning.value = false
    if (announcerTimer) {
      clearInterval(announcerTimer)
      announcerTimer = null
    }
    stopSpeech()
    stopAnnouncementAudio()
  }

  const normalizeMessage = (message = {}) => ({
    ...message,
    session_id: message.session_id ?? message.sessionId ?? null,
    sender_id: message.sender_id ?? message.senderId ?? null,
    message_type: message.message_type ?? message.messageType ?? 'text',
    attachments: typeof message.attachments === 'string'
      ? (() => {
          try {
            return JSON.parse(message.attachments)
          } catch (error) {
            return null
          }
        })()
      : (message.attachments ?? null),
    is_read: message.is_read ?? message.isRead ?? 0,
    created_at: message.created_at ?? message.createdAt ?? dayjs().toISOString(),
    updated_at: message.updated_at ?? message.updatedAt ?? message.created_at ?? message.createdAt ?? dayjs().toISOString()
  })

  // 初始化WebSocket连接
  const initSocket = () => {
    // 先使用 HTTP 轮询方案，避免多端环境下 Socket 协议兼容问题
    isConnected.value = true
  }

  // 处理WebSocket消息
  const handleSocketMessage = (data) => {
    switch (data.type) {
      case 'receive_message':
        addMessage(data.sessionId, data.message)
        updateLastMessage(data.sessionId, data.message)
        break
      case 'message_read':
        // 更新消息阅读状态
        for (const sessionId in messages.value) {
          const msgs = messages.value[sessionId]
          const msg = msgs.find(m => m.id === data.messageId)
          if (msg) {
            msg.isRead = 1
          }
        }
        break
      case 'message_recalled':
        // 处理消息撤回
        for (const sessionId in messages.value) {
          const msgs = messages.value[sessionId]
          const msg = msgs.find(m => m.id === data.messageId)
            if (msg) {
              msg.content = '[已撤回]'
              msg.type = 'recalled'
            }
          }
        break
      case 'user_typing':
        if (!typingUsers.value[data.sessionId]) {
          typingUsers.value[data.sessionId] = []
        }
        if (data.isTyping) {
          if (!typingUsers.value[data.sessionId].includes(data.userId)) {
            typingUsers.value[data.sessionId].push(data.userId)
          }
        } else {
          const idx = typingUsers.value[data.sessionId].indexOf(data.userId)
          if (idx > -1) {
            typingUsers.value[data.sessionId].splice(idx, 1)
          }
        }
        break
      default:
        console.log('[Chat] Unknown message type:', data.type)
    }
  }

  // 加载会话列表
  const loadSessions = async (limit = 50, offset = 0) => {
    try {
      loading.value = true
      const res = await request('/chat/sessions', 'GET', { limit, offset }, { showLoading: false })
      sessions.value = Array.isArray(res.data) ? res.data : []
      return sessions.value
    } catch (error) {
      console.error('[Chat] Load sessions error:', error)
      sessions.value = []
      throw error
    } finally {
      loading.value = false
    }
  }

  // 加载消息历史
  const loadMessages = async (sessionId, limit = 50, offset = 0, options = {}) => {
    const { markPlayedOnLoad = true } = options
    try {
      const res = await request(`/chat/messages/${sessionId}`, 'GET', { limit, offset }, { showLoading: false })
      messages.value[sessionId] = Array.isArray(res.data) ? res.data.map(normalizeMessage) : []
      if (markPlayedOnLoad) {
        const visibleIncomingMessages = messages.value[sessionId].filter((message) => Number(message.sender_id) !== getCurrentUserId())
        markMessagesAsPlayed(visibleIncomingMessages)
      }
      unreadCounts.value[sessionId] = 0
      return messages.value[sessionId]
    } catch (error) {
      console.error('[Chat] Load messages error:', error)
      throw error
    }
  }

  // 发送消息
  const sendMessage = async (sessionId, content, type = 'text', attachments = null) => {
    try {
      const res = await request('/chat/send', 'POST', {
        sessionId,
        content,
        messageType: type,
        attachments
      }, { showLoading: false })

      const message = normalizeMessage(res.data)
      addMessage(sessionId, message)
      updateLastMessage(sessionId, message)
      return true
    } catch (error) {
      console.error('[Chat] Send message error:', error)
      return false
    }
  }

  // 添加消息到列表
  const addMessage = (sessionId, message) => {
    if (!messages.value[sessionId]) {
      messages.value[sessionId] = []
    }
    const normalized = normalizeMessage(message)
    const exists = messages.value[sessionId].some(item => item.id === normalized.id)
    if (!exists) {
      messages.value[sessionId].push(normalized)
    }
  }

  // 更新会话的最后消息
  const updateLastMessage = (sessionId, message) => {
    const session = sessions.value.find(s => String(s.id) === String(sessionId))
    if (session) {
      session.last_message_at = message.created_at || message.createdAt || message.timestamp || dayjs().toISOString()
      session.last_message = message.content
    }
  }

  // 标记会话为已读
  const markSessionAsRead = async (sessionId) => {
    try {
      await request('/chat/mark-read', 'POST', { sessionId }, { showLoading: false })
      unreadCounts.value[sessionId] = 0
    } catch (error) {
      console.error('[Chat] Mark as read error:', error)
    }
  }

  // 创建或获取会话
  const createOrGetSession = async (targetUserId) => {
    try {
      const res = await request('/chat/create-session', 'POST', { targetUserId }, { showLoading: false })
      const session = res.data
      const existing = sessions.value.find(s => s.id === session.id)
      if (!existing) {
        sessions.value.unshift(session)
      } else {
        Object.assign(existing, session)
      }
      return session
    } catch (error) {
      console.error('[Chat] Create session error:', error)
      throw error
    }
  }

  // 撤回消息
  const recallMessage = async (messageId, sessionId) => {
    try {
      await request(`/chat/messages/${messageId}`, 'DELETE', {}, { showLoading: false })
      const msgs = messages.value[sessionId] || []
      const msg = msgs.find(m => m.id === messageId)
      if (msg) {
        msg.content = '[已撤回]'
        msg.message_type = 'recalled'
      }
      return true
    } catch (error) {
      console.error('[Chat] Recall message error:', error)
    }
    return false
  }

  // 加入会话房间
  const joinSession = (sessionId) => {
    currentSessionId.value = sessionId
    markSessionAsRead(sessionId)
  }

  // 离开会话房间
  const leaveSession = (sessionId) => {
    currentSessionId.value = null
  }

  // 发送正在输入状态
  const sendTyping = (sessionId, isTyping) => {
    return { sessionId, isTyping }
  }

  // 清空所有数据
  const clear = () => {
    sessions.value = []
    messages.value = {}
    currentSessionId.value = null
    unreadCounts.value = {}
    typingUsers.value = {}
    playedMessageIds.value = {}
    uni.removeStorageSync(AUTHENTICATED_STORAGE_KEY)
    stopGlobalAnnouncer()
  }

  return {
    // 状态
    sessions,
    messages,
    currentSessionId,
    unreadCounts,
    socket,
    isConnected,
    loading,
    typingUsers,
    // 计算属性
    currentSession,
    currentMessages,
    totalUnread,
    // 方法
    initSocket,
    loadSessions,
    loadMessages,
    hydratePlayedMessageIds,
    hasMessageBeenPlayed,
    markMessageAsPlayed,
    markMessagesAsPlayed,
    announceMessages,
    startGlobalAnnouncer,
    stopGlobalAnnouncer,
    sendMessage,
    addMessage,
    updateLastMessage,
    markSessionAsRead,
    createOrGetSession,
    recallMessage,
    joinSession,
    leaveSession,
    sendTyping,
    clear
  }
})
