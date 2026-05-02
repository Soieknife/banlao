<template>
  <view class="chat-list-page page-container">
    <AppSidebar active-path="/pages/chat/chat-list" />

    <!-- 标题栏 -->
    <view class="title-bar card-elder">
      <view>
        <text class="title">家人聊天</text>
        <view class="title-helper">给已绑定的家人发送消息</view>
      </view>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="loading-container">
      <text>加载中...</text>
    </view>

    <view v-if="contacts.length > 0" class="contacts-card card-elder">
      <view class="section-title">可聊天的家人</view>
      <view class="contacts-list">
        <view
          v-for="contact in contacts"
          :key="contact.id"
          class="contact-item"
          @tap="startChat(contact)"
        >
          <view class="contact-avatar">{{ (contact.nickname || contact.username || '家').slice(0, 1) }}</view>
          <view class="contact-content">
            <text class="contact-name">{{ contact.nickname || contact.username }}</text>
            <text class="contact-desc">{{ contact.roleLabel }}</text>
          </view>
          <text class="contact-action">去聊天</text>
        </view>
      </view>
    </view>

    <!-- 会话列表 -->
    <view v-if="sessions.length > 0" class="card-elder sessions-card">
      <view class="section-head">
        <view>
          <view class="section-title">最近消息</view>
          <view class="text-helper">看看家人最近给您发来的内容</view>
        </view>
        <view class="session-count">{{ sessions.length }} 个会话</view>
      </view>

      <scroll-view class="sessions-list" scroll-y>
      <view
        v-for="session in sessions"
        :key="session.id"
        class="session-item"
        @tap="goToChat(session)"
      >
        <!-- 头像 -->
        <view class="session-avatar">
          <text class="session-avatar-text">{{ getOtherUserName(session).slice(0, 1) }}</text>
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
          <text class="session-message">{{ formatSessionPreview(session) }}</text>
        </view>

      </view>
      </scroll-view>
    </view>

    <!-- 空状态 -->
    <view v-else-if="!loading" class="empty-container card-elder">
      <text class="empty-text">还没有聊天记录</text>
      <text class="empty-helper">从上面的家人列表里选一个，就能开始对话。</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useChatStore } from '@/stores/chat'
import { request } from '@/utils/request'
import dayjs from 'dayjs'
import AppSidebar from '@/components/AppSidebar.vue'

const chatStore = useChatStore()

const loading = ref(false)
const sessions = ref([])
const contacts = ref([])
const targetUserId = ref('')
const targetName = ref('')
const currentUser = ref({})

const loadCurrentUser = () => {
  try {
    currentUser.value = JSON.parse(uni.getStorageSync('user') || '{}')
  } catch (error) {
    currentUser.value = {}
  }
}

const loadContacts = async () => {
  loadCurrentUser()
  if (currentUser.value.role === 'elder') {
    const res = await request('/relation/my_children', 'GET', {}, { showLoading: false })
    contacts.value = (Array.isArray(res.data) ? res.data : []).map(item => ({
      ...item,
      roleLabel: '已绑定家人'
    }))
    return
  }

  const res = await request('/relation/elders', 'GET', {}, { showLoading: false })
  contacts.value = (Array.isArray(res.data) ? res.data : []).map(item => ({
    ...item,
    roleLabel: '守护中的长辈'
  }))
}

const loadPage = async () => {
  loading.value = true
  try {
    await chatStore.loadSessions()
    sessions.value = [...chatStore.sessions]
    await loadContacts()
    if (targetUserId.value) {
      const matched = contacts.value.find(item => String(item.id) === String(targetUserId.value))
      if (matched) {
        await startChat(matched, false)
        targetUserId.value = ''
      }
    }
  } catch (error) {
    console.error('加载会话失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

onLoad((options) => {
  targetUserId.value = String(options.targetUserId || '')
  targetName.value = decodeURIComponent(options.targetName || '')
})

onShow(() => {
  loadPage()
})

const getOtherUserName = (session) => {
  const userId = Number(uni.getStorageSync('userId'))
  if (Number(session.elder_id) === userId) {
    return session.child_name || '用户'
  }
  return session.elder_name || '用户'
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

const formatVoiceDuration = (duration) => {
  const seconds = Math.max(1, Math.round(Number(duration || 0) / 1000))
  return `${seconds}″`
}

const formatSessionPreview = (session) => {
  if (!session) return '[暂无消息]'
  if (session.last_message_type === 'voice') {
    return `[语音] ${formatVoiceDuration(session.last_message_attachments?.duration)}`
  }
  if (session.last_message_type === 'image') {
    return '图片'
  }
  if (session.last_message_type === 'recalled') {
    return '[已撤回]'
  }
  return session.last_message || '[暂无消息]'
}

const goToChat = (session) => {
  const userId = Number(uni.getStorageSync('userId'))
  const name = Number(session.elder_id) === userId ? session.child_name : session.elder_name
  uni.navigateTo({
    url: `/pages/chat/chat-detail?sessionId=${session.id}&targetName=${encodeURIComponent(name || '聊天')}`
  })
}

const startChat = async (contact, navigate = true) => {
  const session = await chatStore.createOrGetSession(contact.id)
  sessions.value = [...chatStore.sessions]
  if (!navigate) return session
  uni.navigateTo({
    url: `/pages/chat/chat-detail?sessionId=${session.id}&targetName=${encodeURIComponent(contact.nickname || contact.username || targetName.value || '聊天')}`
  })
  return session
}
</script>

<style scoped lang="scss">
.chat-list-page {
  min-height: 100%;
  background: linear-gradient(180deg, $bg-color 0%, $primary-lighter 100%);
  padding-bottom: 40rpx;
}

.title-bar {
  margin-bottom: 24rpx;
  background: linear-gradient(135deg, $card-bg 0%, $primary-lighter 100%);
  border: 1rpx solid $border-light;
}

.title {
  font-size: $font-size-lg;
  font-weight: $font-weight-bold;
  color: $text-primary;
}

.title-helper {
  margin-top: 10rpx;
  font-size: $font-size-sm;
  color: $text-tertiary;
}

.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  color: $text-tertiary;
  min-height: 240rpx;
  background-color: $card-bg;
  border-radius: $radius-lg;
}

.sessions-list {
  max-height: 880rpx;
}

.sessions-card {
  background-color: rgba(255, 255, 255, 0.96);
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: $spacing-sm;
  margin-bottom: $spacing-sm;
}

.contacts-card {
  margin-bottom: 24rpx;
  background-color: rgba(255, 255, 255, 0.96);
}

.section-title {
  font-size: $font-size-base;
  font-weight: $font-weight-bold;
  color: $text-primary;
  margin-bottom: 10rpx;
}

.session-count {
  padding: 10rpx 18rpx;
  border-radius: $radius-full;
  background-color: $primary-lighter;
  color: $primary-color;
  font-size: $font-size-xs;
  font-weight: $font-weight-bold;
}

.contacts-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.contact-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  border-radius: $radius-lg;
  background: linear-gradient(135deg, $card-bg 0%, $primary-lighter 100%);
  border: 1rpx solid $border-light;
  box-shadow: $shadow-xs;

  &:active {
    transform: scale(0.98);
    box-shadow: $shadow-sm;
  }
}

.contact-avatar {
  width: 78rpx;
  height: 78rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, $primary-light 0%, $primary-lighter 100%);
  color: $primary-color;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $font-size-base;
  font-weight: $font-weight-bold;
  margin-right: 18rpx;
  box-shadow: $shadow-xs;
}

.contact-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.contact-name {
  font-size: $font-size-base;
  color: $text-primary;
  font-weight: $font-weight-bold;
}

.contact-desc {
  margin-top: 6rpx;
  font-size: $font-size-xs;
  color: $text-tertiary;
}

.contact-action {
  font-size: $font-size-sm;
  color: $primary-color;
  font-weight: $font-weight-bold;
}

.session-item {
  display: flex;
  align-items: center;
  padding: 18rpx 20rpx;
  border: 1rpx solid $border-light;
  background: $card-bg;
  border-radius: $radius-lg;
  margin-bottom: 14rpx;
  box-shadow: $shadow-xs;

  &:active {
    background: $card-bg-hover;
    transform: scale(0.99);
    box-shadow: $shadow-sm;
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
  background: linear-gradient(135deg, $primary-light 0%, $primary-lighter 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: $shadow-xs;
}

.session-avatar-text {
  font-size: $font-size-base;
  font-weight: $font-weight-bold;
  color: $primary-color;
}

.unread-badge {
  position: absolute;
  right: 0;
  top: 0;
  background: $error-color;
  color: $text-inverse;
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
  font-size: $font-size-base;
  font-weight: $font-weight-bold;
  color: $text-primary;
}

.session-time {
  font-size: $font-size-xs;
  color: $text-tertiary;
}

.session-message {
  font-size: $font-size-sm;
  color: $text-secondary;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: $text-tertiary;
  min-height: 240rpx;
  background-color: rgba(255, 255, 255, 0.96);
}

.empty-text {
  font-size: $font-size-base;
  color: $text-primary;
  font-weight: $font-weight-bold;
}

.empty-helper {
  margin-top: 8rpx;
  font-size: $font-size-sm;
  color: $text-tertiary;
}
</style>
