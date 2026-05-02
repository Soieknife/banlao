<template>
  <view class="chat-input-area">
    <view v-if="showRecordingOverlay" class="recording-overlay">
      <view class="recording-panel" :class="{ canceling: isCancellingRecording }">
        <view class="recording-mic">{{ isCancellingRecording ? '✖' : '🎤' }}</view>
        <text class="recording-title">{{ isCancellingRecording ? '松手取消发送' : '正在录音' }}</text>
        <text class="recording-time">{{ formattedRecordingTime }}</text>
        <text class="recording-helper">{{ isCancellingRecording ? '手指下移可继续录音' : '上滑取消，松开发送语音' }}</text>
      </view>
    </view>

    <view class="input-wrapper">
      <view
        class="voice-btn"
        :class="{ 'recording': isRecording }"
        @touchstart.stop.prevent="startVoiceRecord"
        @touchmove.stop.prevent="handleVoiceRecordMove"
        @touchend.stop.prevent="stopVoiceRecord"
        @touchcancel.stop.prevent="cancelVoiceRecord"
      >
        <text class="voice-icon">{{ isRecording ? '🎤' : '🎙️' }}</text>
      </view>

      <textarea
        v-model="messageContent"
        class="message-textarea"
        placeholder="输入消息..."
        auto-height
        :maxlength="500"
        @blur="isTyping = false"
        @focus="isTyping = true"
        :disabled="isRecording"
      />

      <button
        v-if="!hasTextContent"
        class="action-btn plus-btn"
        :disabled="isRecording || isSending"
        @tap="openMoreActions"
      >
        +
      </button>

      <button
        v-else
        class="action-btn send-btn"
        :disabled="isSending || isRecording"
        @tap="sendMessage"
      >
        {{ isSending ? '发送中' : '发送' }}
      </button>
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
const isRecording = ref(false)
const isCancellingRecording = ref(false)
const recordingDuration = ref(0)
const showRecordingOverlay = ref(false)
const recordStartY = ref(0)
const hasTextContent = computed(() => Boolean(messageContent.value.trim()))
const CANCEL_RECORD_DISTANCE = 120
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

const startVoiceRecord = (event) => {
  if (isRecording.value || isSending.value) return

  isRecording.value = true
  isCancellingRecording.value = false
  showRecordingOverlay.value = true
  recordStartY.value = Number(event?.changedTouches?.[0]?.pageY || event?.touches?.[0]?.pageY || 0)
  startRecordingTimer()
  voiceRecorder.startRecording(
    ({ duration, format, tempFilePath }) => {
      try {
        if (isCancellingRecording.value) {
          uni.showToast({ title: '已取消发送', icon: 'none' })
          return
        }
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
        isCancellingRecording.value = false
        showRecordingOverlay.value = false
        clearRecordingTimer()
        recordingDuration.value = 0
        recordStartY.value = 0
        isSending.value = false
      }
    },
    () => {
      isRecording.value = false
      isCancellingRecording.value = false
      showRecordingOverlay.value = false
      clearRecordingTimer()
      recordingDuration.value = 0
      recordStartY.value = 0
      isSending.value = false
      uni.showToast({ title: '录音失败，请重试', icon: 'none' })
    }
  )
}

const handleVoiceRecordMove = (event) => {
  if (!isRecording.value) return
  const currentY = Number(event?.changedTouches?.[0]?.pageY || event?.touches?.[0]?.pageY || 0)
  if (!recordStartY.value || !currentY) return
  isCancellingRecording.value = currentY <= (recordStartY.value - CANCEL_RECORD_DISTANCE)
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
    isCancellingRecording.value = true
    showRecordingOverlay.value = false
    clearRecordingTimer()
    voiceRecorder.stopRecording()
  }
}

const chooseAndSendImage = (sourceType) => {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: [sourceType],
    success: (res) => {
      const tempFilePath = res.tempFilePaths?.[0]
      if (!tempFilePath) return
      emit('send', {
        type: 'image',
        content: '',
        attachments: {
          tempFilePath
        }
      })
    }
  })
}

const openMoreActions = () => {
  uni.showActionSheet({
    itemList: ['拍照', '从相册选择'],
    success: (res) => {
      if (res.tapIndex === 0) {
        chooseAndSendImage('camera')
        return
      }
      if (res.tapIndex === 1) {
        chooseAndSendImage('album')
      }
    }
  })
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
  pointer-events: none;
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

  &.canceling {
    background: rgba(255, 245, 245, 0.98);
  }
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

.recording-panel.canceling .recording-mic {
  background: linear-gradient(135deg, $error-color 0%, #b91c1c 100%);
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
  align-items: center;
}

.voice-btn {
  width: 92rpx;
  height: 92rpx;
  background: linear-gradient(135deg, $card-bg-alt 0%, $primary-lighter 100%);
  border: 1rpx solid $border-light;
  border-radius: $radius-base;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all $transition-base;
  box-shadow: $shadow-xs;
  flex-shrink: 0;

  &.recording {
    background: linear-gradient(135deg, $warning-color 0%, $error-color 100%);
    border-color: $warning-color;
    animation: pulse 1s infinite;
  }

  .voice-icon {
    font-size: 32rpx;
  }
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.message-textarea {
  flex: 1;
  min-height: 44rpx;
  max-height: 220rpx;
  padding: 22rpx 22rpx;
  border: 1rpx solid $border-light;
  border-radius: 28rpx;
  font-size: $font-size-base;
  line-height: 1.4;
  background: $bg-secondary;
  color: $text-primary;

  &:disabled {
    background: $card-bg-hover;
    color: $text-tertiary;
  }
}

.action-btn {
  width: 92rpx;
  height: 92rpx;
  border-radius: 50%;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $font-size-base;
  font-weight: $font-weight-bold;
  flex-shrink: 0;
}

.plus-btn {
  background: linear-gradient(135deg, $card-bg-alt 0%, $primary-lighter 100%);
  color: $primary-color;
  border: 1rpx solid $border-light;
  font-size: 52rpx;
  line-height: 1;
  box-shadow: $shadow-xs;
}

.send-btn {
  background: linear-gradient(135deg, $primary-color 0%, $secondary-color 100%);
  color: $text-inverse;
  border: none;
  box-shadow: $shadow-sm;

  &:disabled {
    background: $border-light;
    color: $text-tertiary;
    box-shadow: none;
  }
}
</style>
