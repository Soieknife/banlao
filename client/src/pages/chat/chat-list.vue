<template>
  <view class="chat-list-page">
    <!-- 标题栏 -->
    <view class="title-bar">
      <text class="title">消息</text>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="loading-container">
      <text>加载中...</text>
    </view>

    <!-- 会话列表 -->
    <scroll-view v-else-if="sessions.length > 0" class="sessions-list" scroll-y>
      <view
        v-for="session in sessions"
        :key="session.id"
        class="session-item"
        @tap="goToChat(session)"
      >
        <!-- 头像 -->
        <view class="session-avatar">
          <image
            :src="getOtherUserAvatar(session)"
            mode="aspectFill"
          />
          <!-- 未读角标 -->
          <view v-if="session.unread_count > 0" class="unread-badge">
            {{ session.unread_count > 99 ? '99+' : session.unread_count }}
          </view>
        </view>

        <!-- 内容 -->
        <view class="session-content">
          <view class="session-header">
            <text class="session-name">{{ getOtherUserName(session) }}</text>
            <text class="session-time">{{ formatTime(session.last_message_at) }}</text>
          </view>
          <text class="session-message">{{ session.last_message || '[暂无消息]' }}</text>
        </view>

        <!-- 删除按钮 -->
        <view class="session-actions">
          <button class="delete-btn" @tap.stop="deleteSession(session.id)">删除</button>
        </view>
      </view>
    </scroll-view>

    <!-- 空状态 -->
    <view v-else class="empty-container">
      <text class="empty-text">还没有任何消息</text>
    </view>

    <!-- 底部浮动按钮 -->
    <view class="fab-button" @tap="showNewChat">
      <text class="fab-icon">+</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useChatStore } from '@/stores/chat'
import dayjs from 'dayjs'

const chatStore = useChatStore()

const loading = ref(false)
const sessions = ref([])

onMounted(async () => {
  loading.value = true
  try {
    await chatStore.loadSessions()
    sessions.value = chatStore.sessions
  } catch (error) {
    console.error('加载会话失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
})

const getOtherUserName = (session) => {
  // 获取不是当前用户的那个人的名字
  const userId = uni.getStorageSync('userId')
  if (session.elder_id === userId) {
    return session.child_name || '用户'
  }
  return session.elder_name || '用户'
}

const getOtherUserAvatar = (session) => {
  return '/static/default-avatar.png'
}

const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = dayjs(timestamp)
  const now = dayjs()

  if (date.format('YYYY-MM-DD') === now.format('YYYY-MM-DD')) {
    return date.format('HH:mm')
  }

  if (date.format('YYYY-MM-DD') === now.subtract(1, 'day').format('YYYY-MM-DD')) {
    return '昨天'
  }

  return date.format('MM-DD')
}

const goToChat = (session) => {
  uni.navigateTo({
    url: `/pages/chat/chat-detail?sessionId=${session.id}`
  })
}

const deleteSession = (sessionId) => {
  uni.showModal({
    title: '删除会话',
    content: '确定要删除这个会话吗？',
    success: (res) => {
      if (res.confirm) {
        sessions.value = sessions.value.filter(s => s.id !== sessionId)
        uni.showToast({
          title: '已删除',
          icon: 'success'
        })
      }
    }
  })
}

const showNewChat = () => {
  // 弹出选择联系人的对话框
  uni.showToast({
    title: '选择联系人功能开发中',
    icon: 'none'
  })
}
</script>

<style scoped lang="scss">
.chat-list-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #fff;
}

.title-bar {
  padding: 20rpx;
  padding-top: calc(20rpx + env(safe-area-inset-top));
  background: #f8f9fa;
  border-bottom: 1px solid #eee;
}

.title {
  font-size: 44rpx;
  font-weight: bold;
  color: #333;
}

.loading-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
}

.sessions-list {
  flex: 1;
}

.session-item {
  display: flex;
  align-items: center;
  padding: 16rpx 20rpx;
  border-bottom: 1px solid #f0f0f0;
  background: #fff;

  &:active {
    background: #f5f5f5;
  }
}

.session-avatar {
  position: relative;
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 16rpx;
  flex-shrink: 0;

  image {
    width: 100%;
    height: 100%;
  }
}

.unread-badge {
  position: absolute;
  right: 0;
  top: 0;
  background: #e74c3c;
  color: white;
  border-radius: 50%;
  min-width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: bold;
}

.session-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.session-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.session-name {
  font-size: 32rpx;
  font-weight: 500;
  color: #333;
}

.session-time {
  font-size: 28rpx;
  color: #999;
}

.session-message {
  font-size: 28rpx;
  color: #999;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-actions {
  margin-left: 16rpx;
  flex-shrink: 0;
}

.delete-btn {
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 4rpx;
  padding: 8rpx 16rpx;
  font-size: 24rpx;
}

.empty-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
}

.empty-text {
  font-size: 32rpx;
}

.fab-button {
  position: absolute;
  right: 30rpx;
  bottom: calc(30rpx + env(safe-area-inset-bottom));
  width: 100rpx;
  height: 100rpx;
  background: #4a90e2;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);

  &:active {
    transform: scale(0.95);
  }
}

.fab-icon {
  color: white;
  font-size: 56rpx;
  line-height: 56rpx;
}
</style>
