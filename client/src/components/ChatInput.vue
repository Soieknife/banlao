<template>
  <view class="chat-input-area">
    <view class="input-wrapper">
      <!-- 语音按钮 -->
      <button
        class="voice-btn"
        :class="{ 'recording': isRecording }"
        @touchstart="startVoiceRecord"
        @touchend="stopVoiceRecord"
      >
        <text class="voice-icon">{{ isRecording ? '🎤' : '🎙️' }}</text>
        <text class="voice-text">{{ isRecording ? '松开结束' : '按住说话' }}</text>
      </button>

      <!-- 输入框 -->
      <textarea
        v-model="messageContent"
        class="message-textarea"
        :placeholder="inputMode === 'voice' ? '语音输入中...' : '输入消息...'"
        auto-height
        :maxlength="500"
        @blur="isTyping = false"
        @focus="isTyping = true"
        :disabled="isRecording"
      />

      <!-- 发送按钮 -->
      <button
        class="send-btn"
        :disabled="(!messageContent.trim() && inputMode !== 'voice') || isSending"
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
import { ref } from 'vue'
import { speechToText, VoiceRecorder } from '../utils/baidu-ai'

const props = defineProps({
  placeholder: {
    type: String,
    default: '输入消息...'
  }
})

const emit = defineEmits(['send', 'typing'])

const messageContent = ref('')
const isSending = ref(false)
const isTyping = ref(false)
const inputMode = ref('text') // 'text' 或 'voice'
const isRecording = ref(false)
let voiceRecorder = new VoiceRecorder()

const switchInputMode = (mode) => {
  inputMode.value = mode
  if (mode === 'voice') {
    messageContent.value = ''
  }
}

const startVoiceRecord = () => {
  if (inputMode.value !== 'voice') return

  isRecording.value = true
  voiceRecorder.startRecording(async (audioBase64) => {
    try {
      // 语音识别
      const recognizedText = await speechToText(audioBase64)
      console.log('语音识别结果:', recognizedText)

      // 将识别结果设置为消息内容
      messageContent.value = recognizedText

      // 自动发送
      if (recognizedText.trim()) {
        await sendMessage()
      }
    } catch (error) {
      console.error('语音识别失败:', error)
      uni.showToast({ title: '语音识别失败，请重试', icon: 'none' })
    }
  })
}

const stopVoiceRecord = () => {
  if (isRecording.value) {
    isRecording.value = false
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
  emit('send', content)

  // 发送后清空
  messageContent.value = ''
  isTyping.value = false
  isSending.value = false
}
</script>

<style scoped lang="scss">
.chat-input-area {
  background: #fff;
  border-top: 1px solid #eee;
  padding: 12rpx 20rpx;
  padding-bottom: calc(12rpx + env(safe-area-inset-bottom));
}

.input-wrapper {
  display: flex;
  gap: 12rpx;
  align-items: flex-end;
}

.voice-btn {
  width: 120rpx;
  height: 80rpx;
  background: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 8rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;

  &.recording {
    background: #ff4757;
    border-color: #ff3742;
    animation: pulse 1s infinite;
  }

  .voice-icon {
    font-size: 24rpx;
    margin-bottom: 4rpx;
  }

  .voice-text {
    font-size: 20rpx;
    color: #666;
  }

  &.recording .voice-text {
    color: white;
  }
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.message-textarea {
  flex: 1;
  min-height: 80rpx;
  max-height: 200rpx;
  padding: 12rpx 16rpx;
  border: 1px solid #ddd;
  border-radius: 8rpx;
  font-size: 32rpx;
  line-height: 1.4;
  background: #f5f5f5;

  &:disabled {
    background: #e0e0e0;
    color: #999;
  }
}

.send-btn {
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 8rpx;
  padding: 12rpx 28rpx;
  font-size: 32rpx;
  height: 80rpx;

  &:disabled {
    background: #ccc;
    color: #999;
  }
}

.input-mode-switch {
  display: flex;
  gap: 20rpx;
  margin-top: 12rpx;
  justify-content: center;
}

.mode-btn {
  padding: 8rpx 20rpx;
  border: 1px solid #ddd;
  border-radius: 6rpx;
  background: white;
  font-size: 28rpx;
  color: #666;

  &.active {
    background: #4a90e2;
    color: white;
    border-color: #4a90e2;
  }
}

.char-count {
  text-align: right;
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
}
</style>
  line-height: 80rpx;
  white-space: nowrap;
  flex-shrink: 0;

  &:disabled {
    background: #ccc;
    opacity: 0.6;
  }

  &:active {
    opacity: 0.8;
  }
}

.char-count {
  text-align: right;
  font-size: 24rpx;
  color: #999;
  margin-top: 6rpx;
  padding-right: 12rpx;
}
</style>
