<template>
  <view class="chat-input-area">
    <view v-if="showRecordingOverlay" class="recording-overlay">
      <view class="recording-panel">
        <view class="recording-mic">🎤</view>
        <text class="recording-title">正在录音</text>
        <text class="recording-time">{{ formattedRecordingTime }}</text>
        <text class="recording-helper">松开后自动发送语音消息</text>
      </view>
    </view>

    <view class="input-wrapper">
      <!-- 语音按钮 -->
      <button
        class="voice-btn"
        :class="{ 'recording': isRecording }"
        @touchstart="startVoiceRecord"
        @touchend="stopVoiceRecord"
        @touchcancel="cancelVoiceRecord"
      >
        <text class="voice-icon">{{ isRecording ? '🎤' : '🎙️' }}</text>
        <text class="voice-text">{{ isRecording ? '松开结束' : '按住说话' }}</text>
      </button>

      <!-- 输入框 -->
      <textarea
        v-model="messageContent"
        class="message-textarea"
        :placeholder="inputMode === 'voice' ? '按住左侧按钮开始录音' : '输入消息...'"
        auto-height
        :maxlength="500"
        @blur="isTyping = false"
        @focus="isTyping = true"
        :disabled="isRecording"
      />

      <!-- 发送按钮 -->
      <button
        class="send-btn"
        :disabled="(!messageContent.trim() && inputMode !== 'voice') || isSending || inputMode === 'voice'"
        @tap="sendMessage"
      >
        {{ isSending ? '发送中...' : '发送' }}
      </button>
    </view>

    <!-- 输入模式切换 -->
    <view class="input-mode-switch">
      <button
        class="mode-btn"
        :class="{ active: inputMode === 'text' }"
        @tap="switchInputMode('text')"
      >
        文字
      </button>
      <button
        class="mode-btn"
        :class="{ active: inputMode === 'voice' }"
        @tap="switchInputMode('voice')"
      >
        语音
      </button>
    </view>

    <!-- 字数提示 -->
    <view class="char-count">
      {{ messageContent.length }}/500
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { VoiceRecorder } from '../utils/baidu-ai'

defineProps({
  placeholder: {
    type: String,
    default: '输入消息...'
  }
})

const emit = defineEmits(['send', 'typing'])

const messageContent = ref('')
const isSending = ref(false)
const isTyping = ref(false)
const inputMode = ref('text')
const isRecording = ref(false)
const recordingDuration = ref(0)
const showRecordingOverlay = ref(false)
let recordingTimer = null
let voiceRecorder = new VoiceRecorder()

const formattedRecordingTime = computed(() => {
  const seconds = Math.floor(recordingDuration.value / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainSeconds = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainSeconds).padStart(2, '0')}`
})

const startRecordingTimer = () => {
  clearRecordingTimer()
  recordingDuration.value = 0
  recordingTimer = setInterval(() => {
    recordingDuration.value += 200
  }, 200)
}

const clearRecordingTimer = () => {
  if (recordingTimer) {
    clearInterval(recordingTimer)
    recordingTimer = null
  }
}

const switchInputMode = (mode) => {
  inputMode.value = mode
  if (mode === 'voice') {
    messageContent.value = ''
  }
}

const startVoiceRecord = () => {
  if (inputMode.value !== 'voice' || isRecording.value) return

  isRecording.value = true
  showRecordingOverlay.value = true
  startRecordingTimer()
  voiceRecorder.startRecording(
    ({ duration, format, tempFilePath }) => {
      try {
        if (!tempFilePath) {
          uni.showToast({ title: '录音失败，请重试', icon: 'none' })
          return
        }
        if (duration < 200) {
          uni.showToast({ title: '说话时间太短了', icon: 'none' })
          return
        }
        emit('send', {
          type: 'voice',
          content: '',
          attachments: {
            duration,
            format: format || 'wav',
            tempFilePath
          }
        })
      } catch (error) {
        console.error('发送语音消息失败:', error)
        uni.showToast({ title: '发送语音失败，请重试', icon: 'none' })
      } finally {
        isRecording.value = false
        showRecordingOverlay.value = false
        clearRecordingTimer()
        recordingDuration.value = 0
        isSending.value = false
      }
    },
    () => {
      isRecording.value = false
      showRecordingOverlay.value = false
      clearRecordingTimer()
      recordingDuration.value = 0
      isSending.value = false
      uni.showToast({ title: '录音失败，请重试', icon: 'none' })
    }
  )
}

const stopVoiceRecord = () => {
  if (isRecording.value) {
    isRecording.value = false
    showRecordingOverlay.value = false
    clearRecordingTimer()
    voiceRecorder.stopRecording()
  }
}

const cancelVoiceRecord = () => {
  if (isRecording.value) {
    isRecording.value = false
    showRecordingOverlay.value = false
    clearRecordingTimer()
    voiceRecorder.stopRecording()
  }
}

const sendMessage = async () => {
  const content = messageContent.value.trim()
  if (!content) {
    uni.showToast({
      title: '请输入内容',
      icon: 'none'
    })
    return
  }

  isSending.value = true
  emit('send', {
    type: 'text',
    content
  })

  messageContent.value = ''
  isTyping.value = false
  isSending.value = false
}
</script>

<style scoped lang="scss">
.chat-input-area {
  position: relative;
  background: rgba(255, 255, 255, 0.96);
  border-top: 1rpx solid $border-light;
  padding: 16rpx 20rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -8rpx 24rpx rgba(15, 23, 42, 0.05);
}

.recording-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.recording-panel {
  width: 360rpx;
  padding: 40rpx 32rpx;
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.96);
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 18rpx 48rpx rgba(15, 23, 42, 0.18);
}

.recording-mic {
  width: 120rpx;
  height: 120rpx;
  border-radius: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, $warning-color 0%, $error-color 100%);
  color: $text-inverse;
  font-size: 54rpx;
  box-shadow: $shadow-md;
}

.recording-title {
  margin-top: 22rpx;
  font-size: $font-size-lg;
  font-weight: $font-weight-bold;
  color: $text-primary;
}

.recording-time {
  margin-top: 14rpx;
  font-size: 46rpx;
  font-weight: $font-weight-bold;
  color: $primary-color;
  letter-spacing: 2rpx;
}

.recording-helper {
  margin-top: 12rpx;
  font-size: $font-size-sm;
  color: $text-secondary;
}

.input-wrapper {
  display: flex;
  gap: 14rpx;
  align-items: flex-end;
}

.voice-btn {
  width: 132rpx;
  height: 92rpx;
  background: linear-gradient(135deg, $card-bg-alt 0%, $primary-lighter 100%);
  border: 1rpx solid $border-light;
  border-radius: $radius-base;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all $transition-base;
  box-shadow: $shadow-xs;

  &.recording {
    background: linear-gradient(135deg, $warning-color 0%, $error-color 100%);
    border-color: $warning-color;
    animation: pulse 1s infinite;
  }

  .voice-icon {
    font-size: 26rpx;
    margin-bottom: 4rpx;
  }

  .voice-text {
    font-size: $font-size-xs;
    color: $text-secondary;
  }

  &.recording .voice-text {
    color: $text-inverse;
  }
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.message-textarea {
  flex: 1;
  min-height: 92rpx;
  max-height: 220rpx;
  padding: 18rpx 18rpx;
  border: 1rpx solid $border-light;
  border-radius: $radius-base;
  font-size: $font-size-base;
  line-height: 1.4;
  background: $bg-secondary;
  color: $text-primary;

  &:disabled {
    background: $card-bg-hover;
    color: $text-tertiary;
  }
}

.send-btn {
  background: linear-gradient(135deg, $primary-color 0%, $secondary-color 100%);
  color: $text-inverse;
  border: none;
  border-radius: $radius-base;
  padding: 0 28rpx;
  font-size: $font-size-base;
  font-weight: $font-weight-bold;
  height: 92rpx;
  line-height: 92rpx;
  box-shadow: $shadow-sm;

  &:disabled {
    background: $border-light;
    color: $text-tertiary;
    box-shadow: none;
  }
}

.input-mode-switch {
  display: flex;
  gap: 16rpx;
  margin-top: 14rpx;
}

.mode-btn {
  min-width: 110rpx;
  padding: 10rpx 22rpx;
  border: 1rpx solid $border-light;
  border-radius: $radius-full;
  background: $card-bg;
  font-size: $font-size-sm;
  color: $text-secondary;

  &.active {
    background: $primary-lighter;
    color: $primary-color;
    border-color: $primary-light;
    font-weight: $font-weight-bold;
  }
}

.char-count {
  text-align: right;
  font-size: $font-size-xs;
  color: $text-tertiary;
  margin-top: 10rpx;
}
</style>
