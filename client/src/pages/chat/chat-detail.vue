<template>
  <view class="chat-detail-page" :style="pageStyle">
    <view class="status-bar-spacer" :style="statusBarSpacerStyle"></view>

    <!-- 标题栏 -->
    <view class="title-bar">
      <button class="back-btn" @tap="goBack">‹</button>
      <view class="title-center">
        <text class="title">{{ sessionName }}</text>
        <text class="title-helper">和家人慢慢聊，消息会自动刷新</text>
      </view>
      <view class="title-badge">聊天中</view>
    </view>

    <!-- 消息列表 -->
    <scroll-view
      class="messages-list"
      scroll-y
      :scroll-top="initialScrollTop"
      @scrolltoupper="loadMoreMessages"
    >
      <view v-if="loading" class="loading-hint">正在加载聊天记录...</view>

      <view v-for="(msg, index) in currentMessages" :id="`message-${msg.id}-${index}`" :key="`${msg.id}-${index}`">
        <!-- 显示时间戳 -->
        <view v-if="shouldShowTimestamp(index)" class="message-time-divider">
          {{ formatTime(msg.created_at) }}
        </view>

        <!-- 消息 -->
        <ChatMessage
          :message="msg"
          :current-user-id="currentUserId"
          :current-user-avatar="userAvatar"
          :show-timestamp="false"
        />
      </view>

      <!-- 底部占位符 -->
      <view id="chat-bottom-anchor" class="bottom-anchor"></view>
      <view class="bottom-space"></view>
    </scroll-view>

    <!-- 输入框 -->
    <ChatInput @send="handleSendMessage" />
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useChatStore } from '@/stores/chat'
import ChatMessage from '@/components/ChatMessage.vue'
import ChatInput from '@/components/ChatInput.vue'
import config from '@/config'
import dayjs from 'dayjs'

const chatStore = useChatStore()
const sessionId = ref('')
const loading = ref(false)
const initialScrollTop = ref(999999)
const currentUserId = ref(0)
const userAvatar = ref('')
const sessionName = ref('聊天')
const statusBarHeight = ref(0)
const windowHeight = ref(0)
const lastMessageCount = ref(0)
const hasInitializedAnnouncements = ref(false)
const hasLoadedSessionMeta = ref(false)
let sendScrollTimer = null

const currentMessages = computed(() => {
  return chatStore.messages[sessionId.value] || []
})

const currentUserRole = computed(() => {
  return uni.getStorageSync('userRole') || ''
})

const statusBarSpacerStyle = computed(() => ({
  height: `${statusBarHeight.value}px`
}))

const pageStyle = computed(() => ({
  height: windowHeight.value ? `${windowHeight.value}px` : '100vh'
}))

const syncSessionName = () => {
  const session = chatStore.sessions.find(s => String(s.id) === String(sessionId.value))
  if (!session) return
  const otherUserName = Number(session.elder_id) === currentUserId.value
    ? session.child_name
    : session.elder_name
  sessionName.value = otherUserName || sessionName.value
}

const uploadVoiceFile = (tempFilePath) => {
  const token = uni.getStorageSync('token')
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${config.api.baseUrl}/chat/upload-voice`,
      filePath: tempFilePath,
      name: 'file',
      header: {
        Authorization: token ? `Bearer ${token}` : ''
      },
      success: (res) => {
        try {
          const parsed = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
          if (res.statusCode >= 200 && res.statusCode < 300 && parsed?.data?.url) {
            resolve(parsed.data.url)
            return
          }
          reject(new Error(parsed?.message || '语音上传失败'))
        } catch (error) {
          reject(error)
        }
      },
      fail: (error) => {
        reject(error)
      }
    })
  })
}

const uploadImageFile = (tempFilePath) => {
  const token = uni.getStorageSync('token')
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${config.api.baseUrl}/chat/upload-image`,
      filePath: tempFilePath,
      name: 'file',
      header: {
        Authorization: token ? `Bearer ${token}` : ''
      },
      success: (res) => {
        try {
          const parsed = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
          if (res.statusCode >= 200 && res.statusCode < 300 && parsed?.data?.url) {
            resolve(parsed.data.url)
            return
          }
          reject(new Error(parsed?.message || '图片上传失败'))
        } catch (error) {
          reject(error)
        }
      },
      fail: (error) => {
        reject(error)
      }
    })
  })
}

const loadChat = async (showLoading = true) => {
  if (!sessionId.value) return
  loading.value = showLoading
  try {
    if (!hasLoadedSessionMeta.value) {
      await chatStore.loadSessions()
      syncSessionName()
      hasLoadedSessionMeta.value = true
    }
    const latestMessages = await chatStore.loadMessages(sessionId.value, 50, 0, { markPlayedOnLoad: false })
    chatStore.joinSession(sessionId.value)
    const nextCount = latestMessages.length
    if (currentUserRole.value === 'elder' && nextCount > 0 && !hasInitializedAnnouncements.value) {
      const visibleIncomingMessages = latestMessages.filter((message) => Number(message.sender_id) !== currentUserId.value)
      chatStore.markMessagesAsPlayed(visibleIncomingMessages)
      hasInitializedAnnouncements.value = true
    } else if (currentUserRole.value === 'elder' && nextCount > 0) {
      const startIndex = Math.max(0, lastMessageCount.value)
      const latestIncomingMessages = latestMessages.slice(startIndex)
      chatStore.announceMessages(latestIncomingMessages)
    }
    lastMessageCount.value = nextCount
  } catch (error) {
    console.error('加载消息失败:', error)
  } finally {
    loading.value = false
  }
}

onLoad((options) => {
  sessionId.value = String(options.sessionId || '')
  sessionName.value = decodeURIComponent(options.targetName || '聊天')
})

onMounted(async () => {
  const systemInfo = uni.getSystemInfoSync()
  statusBarHeight.value = Number(systemInfo.statusBarHeight || 0)
  windowHeight.value = Number(systemInfo.windowHeight || 0)
  // #ifdef APP-PLUS
  if (typeof plus !== 'undefined' && plus.navigator && typeof plus.navigator.getStatusbarHeight === 'function') {
    statusBarHeight.value = Number(plus.navigator.getStatusbarHeight() || statusBarHeight.value || 0)
  }
  // #endif
  currentUserId.value = Number(uni.getStorageSync('userId'))
  userAvatar.value = uni.getStorageSync('userAvatar') || ''
  chatStore.stopGlobalAnnouncer()
  await loadChat(true)
})

onUnmounted(() => {
  if (sendScrollTimer) {
    clearTimeout(sendScrollTimer)
    sendScrollTimer = null
  }
  chatStore.leaveSession(sessionId.value)
  if (currentUserRole.value === 'elder') {
    chatStore.startGlobalAnnouncer()
  }
})

const scrollToBottomAfterSend = () => {
  nextTick(() => {
    initialScrollTop.value += 100000
    if (sendScrollTimer) {
      clearTimeout(sendScrollTimer)
    }
    sendScrollTimer = setTimeout(() => {
      initialScrollTop.value += 100000
      sendScrollTimer = null
    }, 80)
  })
}

const shouldShowTimestamp = (index) => {
  if (index === 0) return true

  const current = currentMessages.value[index]
  const prev = currentMessages.value[index - 1]

  if (!prev || !current) return true

  const diff = dayjs(current.created_at).diff(dayjs(prev.created_at), 'minute')
  return Math.abs(diff) > 5
}

const formatTime = (timestamp) => {
  const date = dayjs(timestamp)
  const now = dayjs()

  if (date.format('YYYY-MM-DD') === now.format('YYYY-MM-DD')) {
    return date.format('HH:mm')
  }

  if (date.format('YYYY-MM-DD') === now.subtract(1, 'day').format('YYYY-MM-DD')) {
    return '昨天 ' + date.format('HH:mm')
  }

  return date.format('MM-DD HH:mm')
}

const handleSendMessage = async (payload) => {
  const type = payload?.type || 'text'
  let content = payload?.content || ''
  const attachments = payload?.attachments ? { ...payload.attachments } : null
  if (type === 'voice') {
    const tempFilePath = attachments?.tempFilePath
    if (!tempFilePath) {
      uni.showToast({
        title: '未找到语音文件',
        icon: 'none'
      })
      return
    }

    try {
      uni.showLoading({ title: '上传语音中...', mask: true })
      content = await uploadVoiceFile(tempFilePath)
      delete attachments.tempFilePath
    } catch (error) {
      console.error('上传语音失败:', error)
      uni.hideLoading()
      uni.showToast({
        title: error?.message || '语音上传失败',
        icon: 'none'
      })
      return
    } finally {
      uni.hideLoading()
    }
  } else if (type === 'image') {
    const tempFilePath = attachments?.tempFilePath
    if (!tempFilePath) {
      uni.showToast({
        title: '未找到图片文件',
        icon: 'none'
      })
      return
    }

    try {
      uni.showLoading({ title: '上传图片中...', mask: true })
      content = await uploadImageFile(tempFilePath)
      delete attachments.tempFilePath
    } catch (error) {
      console.error('上传图片失败:', error)
      uni.hideLoading()
      uni.showToast({
        title: error?.message || '图片上传失败',
        icon: 'none'
      })
      return
    } finally {
      uni.hideLoading()
    }
  }

  const success = await chatStore.sendMessage(sessionId.value, content, type, attachments)
  if (!success) {
    uni.showToast({
      title: '发送失败',
      icon: 'none'
    })
  } else {
    lastMessageCount.value = currentMessages.value.length
    scrollToBottomAfterSend()
  }
}

const loadMoreMessages = () => {
  // 实现加载更多消息的逻辑
  console.log('加载更多消息')
}

const goBack = () => {
  uni.navigateBack()
}
</script>

<style scoped lang="scss">
.chat-detail-page {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: linear-gradient(180deg, $bg-color 0%, $primary-lighter 100%);
}

.status-bar-spacer {
  flex-shrink: 0;
  background: linear-gradient(135deg, $card-bg 0%, $primary-lighter 100%);
}

.title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 18rpx 20rpx 16rpx;
  background: linear-gradient(135deg, $card-bg 0%, $primary-lighter 100%);
  border-bottom: 1rpx solid $border-light;
  box-shadow: $shadow-xs;
}

.back-btn {
  width: 72rpx;
  height: 72rpx;
  background: $card-bg;
  border: 1rpx solid $border-light;
  border-radius: $radius-full;
  font-size: 44rpx;
  color: $text-primary;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: $shadow-xs;
}

.title-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.title {
  font-size: $font-size-base;
  font-weight: $font-weight-bold;
  color: $text-primary;
  text-align: center;
}

.title-helper {
  margin-top: 6rpx;
  font-size: $font-size-xs;
  color: $text-tertiary;
  text-align: center;
}

.title-badge {
  padding: 10rpx 18rpx;
  border-radius: $radius-full;
  background-color: $success-light;
  color: $success-color;
  font-size: $font-size-xs;
  font-weight: $font-weight-bold;
}

.messages-list {
  flex: 1;
  min-height: 0;
  padding: 20rpx 0 0;
  overflow-y: auto;
}

.loading-hint {
  text-align: center;
  padding: 24rpx;
  color: $text-tertiary;
  font-size: $font-size-sm;
}

.message-time-divider {
  text-align: center;
  color: $text-tertiary;
  font-size: $font-size-xs;
  margin: 24rpx 0 14rpx;
}

.bottom-space {
  height: 24rpx;
}

.bottom-anchor {
  height: 2rpx;
}
</style>
