<template>
  <view class="chat-detail-page">
    <!-- 标题栏 -->
    <view class="title-bar">
      <button class="back-btn" @tap="goBack">←</button>
      <text class="title">{{ sessionName }}</text>
      <view style="width: 40px;"></view>
    </view>

    <!-- 消息列表 -->
    <scroll-view
      class="messages-list"
      scroll-y
      :scroll-top="scrollTop"
      scroll-with-animation
      @scrolltoupper="loadMoreMessages"
    >
      <view v-if="loading" class="loading-hint">加载中...</view>

      <view v-for="(msg, index) in currentMessages" :key="`${msg.id}-${index}`">
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
      <view style="height: 20px;"></view>
    </scroll-view>

    <!-- 输入框 -->
    <ChatInput @send="handleSendMessage" />
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useChatStore } from '@/stores/chat'
import ChatMessage from '@/components/ChatMessage.vue'
import ChatInput from '@/components/ChatInput.vue'
import dayjs from 'dayjs'

const chatStore = useChatStore()

const props = defineProps({
  sessionId: {
    type: [String, Number],
    default: null
  }
})

const route = useRoute()
const sessionId = ref(props.sessionId || route.query.sessionId)
const loading = ref(false)
const scrollTop = ref(0)
const currentUserId = ref(0)
const userAvatar = ref('')
const sessionName = ref('聊天')

const currentMessages = computed(() => {
  return chatStore.messages[sessionId.value] || []
})

onMounted(async () => {
  // 获取当前用户信息
  currentUserId.value = Number(uni.getStorageSync('userId'))
  userAvatar.value = uni.getStorageSync('userAvatar') || ''

  // 加载会话信息
  try {
    const session = chatStore.sessions.find(s => s.id == sessionId.value)
    if (session) {
      const otherUserId = session.elder_id === currentUserId.value ? session.child_id : session.elder_id
      const otherUserName = session.elder_id === currentUserId.value
        ? session.child_name
        : session.elder_name
      sessionName.value = otherUserName || `用户${otherUserId}`
    }
  } catch (error) {
    console.error('加载会话信息失败:', error)
  }

  // 加载消息
  loading.value = true
  try {
    await chatStore.loadMessages(sessionId.value, 50, 0)
    // 加入会话房间
    chatStore.joinSession(sessionId.value)
    // 滚动到底部
    setTimeout(() => {
      scrollTop.value = 9999
    }, 100)
  } catch (error) {
    console.error('加载消息失败:', error)
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  // 离开会话
  chatStore.leaveSession(sessionId.value)
})

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

const handleSendMessage = async (content) => {
  const success = await chatStore.sendMessage(sessionId.value, content, 'text')
  if (!success) {
    uni.showToast({
      title: '发送失败',
      icon: 'none'
    })
  } else {
    // 滚动到底部
    setTimeout(() => {
      scrollTop.value = 9999
    }, 50)
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
  height: 100vh;
  background: #fff;
}

.title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 16rpx;
  padding-top: calc(12rpx + env(safe-area-inset-top));
  background: #f8f9fa;
  border-bottom: 1px solid #eee;
  height: 88rpx;
}

.back-btn {
  width: 40px;
  height: 40px;
  background: none;
  border: none;
  font-size: 32rpx;
  color: #333;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  flex: 1;
  text-align: center;
}

.messages-list {
  flex: 1;
  padding: 12rpx 0;
  overflow-y: auto;
}

.loading-hint {
  text-align: center;
  padding: 20rpx;
  color: #999;
  font-size: 28rpx;
}

.message-time-divider {
  text-align: center;
  color: #999;
  font-size: 24rpx;
  margin: 20rpx 0 12rpx;
}
</style>
