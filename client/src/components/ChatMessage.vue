<template>
  <view class="chat-message-item">
    <!-- 时间戳 -->
    <view v-if="showTimestamp" class="message-time">
      {{ formatTime(message.created_at) }}
    </view>

    <!-- 消息气泡 -->
    <view :class="['message-bubble-wrapper', isMine ? 'own' : 'other']">
      <!-- 头像 -->
      <view v-if="!isMine" class="message-avatar">
        <image v-if="message.avatar" :src="message.avatar" mode="aspectFill" />
        <text v-else class="avatar-fallback">{{ (message.sender_name || '家').slice(0, 1) }}</text>
      </view>

      <!-- 消息内容 -->
      <view :class="['message-bubble', isMine ? 'bubble-own' : 'bubble-other', `type-${message.message_type}`]">
        <!-- 发送者名称（仅非自己的消息显示） -->
        <view v-if="!isMine && message.sender_name" class="sender-name">
          {{ message.sender_name }}
        </view>

        <!-- 文本消息 -->
        <text v-if="message.message_type === 'text'" class="message-content">
          {{ message.content }}
        </text>

        <view v-if="message.message_type === 'voice'" class="voice-message" @tap="playVoiceMessage">
          <text class="voice-icon">{{ isPlaying ? '⏸' : '▶' }}</text>
          <text class="voice-label">{{ isMine ? '我的语音' : '语音消息' }}</text>
          <text class="voice-duration">{{ formatDuration(message.attachments?.duration) }}</text>
        </view>

        <!-- 已撤回消息 -->
        <text v-if="message.message_type === 'recalled'" class="message-recalled">
          {{ message.content }}
        </text>

        <!-- 图片消息 -->
        <image v-if="message.message_type === 'image'" :src="message.content" class="message-image" mode="widthFix" @tap="previewImage(message.content)" />

        <!-- 已读状态 -->
        <text v-if="isMine && message.is_read === 1" class="read-status">✓✓</text>
      </view>

      <!-- 头像（自己的消息） -->
      <view v-if="isMine" class="message-avatar">
        <image v-if="currentUserAvatar" :src="currentUserAvatar" mode="aspectFill" />
        <text v-else class="avatar-fallback">我</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref, onUnmounted } from 'vue'
import dayjs from 'dayjs'

const props = defineProps({
  message: {
    type: Object,
    required: true
  },
  currentUserId: {
    type: Number,
    required: true
  },
  currentUserAvatar: {
    type: String,
    default: ''
  },
  showTimestamp: {
    type: Boolean,
    default: true
  }
})

const isMine = computed(() => {
  return props.message.sender_id === props.currentUserId
})
const isPlaying = ref(false)
let audioContext = null

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

const previewImage = (src) => {
  uni.previewImage({
    urls: [src]
  })
}

const formatDuration = (duration) => {
  const seconds = Math.max(1, Math.round((Number(duration || 0) / 1000)))
  return `${seconds}″`
}

const stopAudio = () => {
  if (audioContext) {
    audioContext.stop()
    audioContext.destroy()
    audioContext = null
  }
  isPlaying.value = false
}

const playVoiceMessage = () => {
  if (!props.message.content) return

  if (isPlaying.value) {
    stopAudio()
    return
  }

  stopAudio()
  audioContext = uni.createInnerAudioContext()
  audioContext.src = props.message.content
  audioContext.autoplay = true
  isPlaying.value = true

  audioContext.onEnded(() => {
    stopAudio()
  })

  audioContext.onError((error) => {
    console.error('播放语音消息失败:', error)
    stopAudio()
    uni.showToast({ title: '语音播放失败', icon: 'none' })
  })
}

onUnmounted(() => {
  stopAudio()
})
</script>

<style scoped lang="scss">
.chat-message-item {
  margin-bottom: 24rpx;
  animation: fadeIn $transition-base ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-time {
  text-align: center;
  color: $text-tertiary;
  font-size: $font-size-xs;
  margin: $spacing-md 0 $spacing-sm;
  padding: $spacing-sm 0;
}

.message-bubble-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 16rpx;
  margin: 0 24rpx;

  &.own {
    justify-content: flex-end;
  }

  &.other {
    justify-content: flex-start;
  }
}

.message-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: $radius-full;
  overflow: hidden;
  flex-shrink: 0;
  background: linear-gradient(135deg, $primary-light 0%, $primary-lighter 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: $shadow-xs;
  color: $primary-color;
  font-weight: $font-weight-bold;
  font-size: $font-size-base;

  image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.avatar-fallback {
  font-size: $font-size-base;
  font-weight: $font-weight-bold;
  color: $primary-color;
}

.message-bubble {
  max-width: 68%;
  padding: 18rpx 24rpx;
  border-radius: $radius-lg;
  word-wrap: break-word;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8rpx;

  &.bubble-own {
    background: linear-gradient(135deg, $primary-color 0%, $secondary-color 100%);
    color: $text-inverse;
    border-bottom-right-radius: $radius-sm;
    box-shadow: $shadow-md;
  }

  &.bubble-other {
    background: linear-gradient(180deg, $card-bg 0%, $card-bg-alt 100%);
    color: $text-primary;
    border-bottom-left-radius: $radius-sm;
    box-shadow: $shadow-sm;
    border: 1rpx solid $border-light;
  }

  &.type-recalled {
    opacity: 0.6;
    font-style: italic;
    background-color: $bg-secondary;
  }
}

.sender-name {
  font-size: $font-size-xs;
  color: $text-tertiary;
  margin-bottom: 2rpx;
}

.message-content {
  font-size: $font-size-base;
  line-height: $line-height-normal;
  word-break: break-word;
}

.message-recalled {
  font-size: $font-size-sm;
  color: $text-tertiary;
}

.voice-message {
  display: flex;
  align-items: center;
  gap: 12rpx;
  min-width: 220rpx;
}

.voice-icon {
  font-size: $font-size-sm;
}

.voice-label {
  flex: 1;
  font-size: $font-size-base;
  line-height: $line-height-normal;
}

.voice-duration {
  font-size: $font-size-xs;
  opacity: 0.8;
}

.message-image {
  border-radius: $radius-base;
  max-width: 300rpx;
  box-shadow: $shadow-sm;
}

.read-status {
  position: absolute;
  right: 8rpx;
  bottom: 4rpx;
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.8);
  font-weight: $font-weight-bold;
}
</style>
