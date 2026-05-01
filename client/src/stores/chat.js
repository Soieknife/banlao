import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import dayjs from 'dayjs'

export const useChatStore = defineStore('chat', () => {
  // 状态
  const sessions = ref([]) // 会话列表
  const messages = ref({}) // 消息字典 { sessionId: [...messages] }
  const currentSessionId = ref(null) // 当前会话ID
  const unreadCounts = ref({}) // 未读计数 { sessionId: count }
  const socket = ref(null) // WebSocket连接
  const isConnected = ref(false) // 是否已连接
  const loading = ref(false) // 加载状态
  const typingUsers = ref({}) // 正在输入的用户 { sessionId: [userIds] }

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

  // 初始化WebSocket连接
  const initSocket = (url, userId, token) => {
    // 使用uni-app的WebSocket API
    socket.value = uni.connectSocket({
      url: url,
      header: {
        'content-type': 'application/json'
      },
      protocols: ['chat'],
      success: () => {
        console.log('[Chat] WebSocket connecting...')
      },
      fail: (error) => {
        console.error('[Chat] WebSocket connect failed:', error)
      }
    })

    // 监听连接成功
    uni.onSocketOpen(() => {
      console.log('[Chat] WebSocket connected')
      isConnected.value = true

      // 发送认证信息
      uni.sendSocketMessage({
        data: JSON.stringify({
          type: 'auth',
          userId: userId,
          token: token
        })
      })
    })

    // 监听连接断开
    uni.onSocketClose(() => {
      console.log('[Chat] WebSocket disconnected')
      isConnected.value = false
    })

    // 监听消息
    uni.onSocketMessage((res) => {
      try {
        const data = JSON.parse(res.data)
        handleSocketMessage(data)
      } catch (error) {
        console.error('[Chat] Parse socket message error:', error)
      }
    })

    // 监听错误
    uni.onSocketError((error) => {
      console.error('[Chat] Socket error:', error)
    })
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
      const response = await uni.request({
        url: `${process.env.VUE_APP_API_URL}/api/chat/sessions`,
        method: 'GET',
        data: { limit, offset }
      })

      if (response[1].data.code === 200) {
        sessions.value = response[1].data.data
      }
    } catch (error) {
      console.error('[Chat] Load sessions error:', error)
    } finally {
      loading.value = false
    }
  }

  // 加载消息历史
  const loadMessages = async (sessionId, limit = 50, offset = 0) => {
    try {
      const response = await uni.request({
        url: `${process.env.VUE_APP_API_URL}/api/chat/messages/${sessionId}`,
        method: 'GET',
        data: { limit, offset }
      })

      if (response[1].data.code === 200) {
        if (!messages.value[sessionId]) {
          messages.value[sessionId] = []
        }
        messages.value[sessionId] = response[1].data.data
      }
    } catch (error) {
      console.error('[Chat] Load messages error:', error)
    }
  }

  // 发送消息
  const sendMessage = async (sessionId, content, type = 'text') => {
    try {
      if (!isConnected.value) {
        uni.showToast({
          title: '连接已断开，请重新连接',
          icon: 'none'
        })
        return false
      }

      // 通过WebSocket发送消息
      uni.sendSocketMessage({
        data: JSON.stringify({
          type: 'send_message',
          sessionId,
          content,
          messageType: type
        }),
        success: () => {
          console.log('[Chat] Message sent via WebSocket')
        },
        fail: (error) => {
          console.error('[Chat] Send message failed:', error)
          uni.showToast({
            title: '发送失败',
            icon: 'none'
          })
        }
      })

      // 同时通过HTTP API发送，确保消息被保存
      const response = await uni.request({
        url: `${process.env.VUE_APP_API_URL}/api/chat/send`,
        method: 'POST',
        data: {
          sessionId,
          content,
          messageType: type
        }
      })

      if (response.data.code === 200) {
        const message = response.data.data
        // 乐观更新：本地先添加消息
        if (!messages.value[sessionId]) {
          messages.value[sessionId] = []
        }
        messages.value[sessionId].push(message)
        updateLastMessage(sessionId, message)
        return true
      }
      return false
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
    messages.value[sessionId].push(message)
  }

  // 更新会话的最后消息
  const updateLastMessage = (sessionId, message) => {
    const session = sessions.value.find(s => s.id === sessionId)
    if (session) {
      session.last_message_at = message.createdAt || message.timestamp || dayjs().toISOString()
      session.last_message = message.content
    }
  }

  // 标记会话为已读
  const markSessionAsRead = async (sessionId) => {
    try {
      await uni.request({
        url: `${process.env.VUE_APP_API_URL}/api/chat/mark-read`,
        method: 'POST',
        data: { sessionId }
      })

      unreadCounts.value[sessionId] = 0
    } catch (error) {
      console.error('[Chat] Mark as read error:', error)
    }
  }

  // 创建或获取会话
  const createOrGetSession = async (targetUserId) => {
    try {
      const response = await uni.request({
        url: `${process.env.VUE_APP_API_URL}/api/chat/create-session`,
        method: 'POST',
        data: { targetUserId }
      })

      if (response[1].data.code === 200) {
        const session = response[1].data.data
        // 检查是否已存在
        const existing = sessions.value.find(s => s.id === session.id)
        if (!existing) {
          sessions.value.unshift(session)
        }
        return session
      }
    } catch (error) {
      console.error('[Chat] Create session error:', error)
    }
  }

  // 撤回消息
  const recallMessage = async (messageId, sessionId) => {
    try {
      const response = await uni.request({
        url: `${process.env.VUE_APP_API_URL}/api/chat/messages/${messageId}`,
        method: 'DELETE',
        data: {}
      })

      if (response[1].data.code === 200) {
        // 更新本地消息
        const msgs = messages.value[sessionId] || []
        const msg = msgs.find(m => m.id === messageId)
        if (msg) {
          msg.content = '[已撤回]'
          msg.type = 'recalled'
        }
        return true
      }
    } catch (error) {
      console.error('[Chat] Recall message error:', error)
    }
    return false
  }

  // 加入会话房间
  const joinSession = (sessionId) => {
    currentSessionId.value = sessionId
    if (socket.value && socket.value.connected) {
      socket.value.emit('join_session', { sessionId }, (response) => {
        if (response.success) {
          markSessionAsRead(sessionId)
        }
      })
    }
  }

  // 离开会话房间
  const leaveSession = (sessionId) => {
    if (socket.value && socket.value.connected) {
      socket.value.emit('leave_session', { sessionId })
    }
    currentSessionId.value = null
  }

  // 发送正在输入状态
  const sendTyping = (sessionId, isTyping) => {
    if (socket.value && socket.value.connected) {
      socket.value.emit('typing', {
        sessionId,
        isTyping
      })
    }
  }

  // 清空所有数据
  const clear = () => {
    sessions.value = []
    messages.value = {}
    currentSessionId.value = null
    unreadCounts.value = {}
    typingUsers.value = {}
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
