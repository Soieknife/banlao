<template>
	<view class="page-container ai-chat-page">
		<AppSidebar active-path="/pages/ai/ai" />

		<!-- 聊天记录 -->
		<scroll-view scroll-y class="chat-history" :scroll-into-view="lastMsgId">
			<view v-for="(msg, index) in messages" :key="index" :id="'msg-' + index" class="chat-item" :class="msg.sender_type">
				<view class="avatar">
					<view class="avatar-circle">
						<text v-if="msg.sender_type === 'ai'">🤖</text>
						<text v-else>🙂</text>
					</view>
				</view>
				<view class="content card-elder">
					<text class="text-content">{{ msg.content }}</text>
					<view class="msg-time">{{ formatTime(msg.created_at) }}</view>
				</view>
			</view>
			<view v-if="loading" class="loading-indicator">
				<text>正在思考...</text>
			</view>
		</scroll-view>

		<!-- 输入区 -->
		<view class="input-container card-elder">
			<view class="voice-btn-wrap" @touchstart="startVoice" @touchend="stopVoice">
				<view class="btn-elder voice-btn" :class="{ active: isRecording }">
					<text v-if="!isRecording">按住 说话</text>
					<text v-else>正在听...</text>
				</view>
			</view>
			<view class="text-helper">💡 您可以对我说“你好”、“今天天气怎么样”</view>
		</view>
	</view>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { request } from '../../utils/request';
import { speak } from '../../utils/voice';
import { speechToText, textToSpeech, playAudio, VoiceRecorder } from '../../utils/baidu-ai';
import AppSidebar from '../../components/AppSidebar.vue';

const messages = ref([]);
const lastMsgId = ref('');
const isRecording = ref(false);
const loading = ref(false);
const user = ref({});
let currentSessionId = null;
let voiceRecorder = new VoiceRecorder();

/**
 * 格式化时间
 */
const formatTime = (iso) => {
	if (!iso) return '';
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return iso;
	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');
	return `${hours}:${minutes}`;
};

/**
 * 初始化 AI 会话
 */
const initAISession = async () => {
	try {
		// 获取或创建会话
		const sessionRes = await request('/ai/session', 'POST', {});
		currentSessionId = sessionRes.data.id;

		// 加载消息历史
		const messagesRes = await request(`/ai/messages/${currentSessionId}?limit=50&offset=0`);
		messages.value = messagesRes.data || [];

		// 如果没有消息，添加欢迎语
		if (messages.value.length === 0) {
			const welcomeMsg = { sender_type: 'ai', content: '您好，我是暖阳，您可以随时跟我聊天。', created_at: new Date().toISOString() };
			messages.value.push(welcomeMsg);
		}

		nextTick(() => {
			lastMsgId.value = 'msg-' + (messages.value.length - 1);
		});
	} catch (err) {
		console.error('[AI] 初始化会话失败:', err);
		uni.showToast({ title: '初始化失败，请重试', icon: 'none' });
	}
};

/**
 * 开始录音
 */
const startVoice = () => {
	if (!user.value.is_vip) {
		speak('AI 陪聊需要由子女为您开通会员。');
		uni.showModal({
			title: '需要子女开通',
			content: 'AI 陪聊是会员功能，请让家人为您开通会员后再使用。',
			confirmText: '我知道了'
		});
		return;
	}

	isRecording.value = true;

	// 开始录音
	voiceRecorder.startRecording(async (audioBase64) => {
		try {
			// 语音识别
			const recognizedText = await speechToText(audioBase64);
			console.log('语音识别结果:', recognizedText);

			// 发送识别到的文本
			await sendMessage(recognizedText);
		} catch (error) {
			console.error('语音识别失败:', error);
			uni.showToast({ title: '语音识别失败，请重试', icon: 'none' });
		}
	});
};

/**
 * 停止录音
 */
const stopVoice = () => {
	if (isRecording.value) {
		isRecording.value = false;
		voiceRecorder.stopRecording();
	}
};

/**
 * 发送消息
 */
const sendMessage = async (text) => {
	if (!currentSessionId) {
		uni.showToast({ title: '会话未初始化', icon: 'none' });
		return;
	}

	// 立即显示用户消息
	const userMsg = {
		sender_type: 'user',
		content: text,
		created_at: new Date().toISOString()
	};
	messages.value.push(userMsg);

	loading.value = true;
	try {
		const res = await request('/ai/chat', 'POST', {
			message: text,
			sessionId: currentSessionId
		});

		// 保存返回的两条消息（如果API返回了）
		if (res.data.messages && Array.isArray(res.data.messages)) {
			// 如果用户消息已经添加，只添加AI消息
			const aiMsgFromApi = res.data.messages.find(m => m.sender_type === 'ai');
			if (aiMsgFromApi && !messages.value.some(m => m.id === aiMsgFromApi.id)) {
				messages.value.push(aiMsgFromApi);
			}
		}

		// 滚动到底部
		nextTick(() => {
			lastMsgId.value = 'msg-' + (messages.value.length - 1);
		});

		// 获取AI回复内容
		const aiResponse = res.data.messages?.find(m => m.sender_type === 'ai')?.content || res.data.response;
		if (aiResponse) {
			// 语音合成并播放
			try {
				const audioData = await textToSpeech(aiResponse);
				await playAudio(audioData);
			} catch (ttsError) {
				console.error('语音合成失败:', ttsError);
				// 如果语音合成失败，仍使用原有语音播报
				speak(aiResponse);
			}
		}
	} catch (err) {
		console.error('[AI] 聊天失败:', err);
		uni.showToast({ title: '发送失败，请重试', icon: 'none' });
	} finally {
		loading.value = false;
	}
};

onMounted(() => {
	const storedUser = uni.getStorageSync('user');
	if (storedUser) {
		user.value = JSON.parse(storedUser);
	}

	// 初始化 AI 会话
	initAISession();

	speak('欢迎来到暖阳陪聊，想跟我聊点什么吗？您可以按住屏幕下方的按钮对我说话。');
});
</script>

<style lang="scss" scoped>
.ai-chat-page {
	display: flex;
	flex-direction: column;
	height: 100vh;
	padding-bottom: 200rpx;
	background-color: $bg-color;
}

.chat-history {
	flex: 1;
	padding: 20rpx;
	overflow-y: auto;
}

.chat-item {
	display: flex;
	margin-bottom: 40rpx;
	animation: slideIn $transition-base ease;

	&.ai {
		flex-direction: row;
		.content {
			background-color: $card-bg;
			margin-left: 20rpx;
			border: 1rpx solid $border-light;
			color: $text-primary;
		}
	}

	&.user {
		flex-direction: row-reverse;
		.content {
			background: linear-gradient(135deg, $primary-color 0%, $secondary-color 100%);
			margin-right: 20rpx;
			.text-content {
				color: $text-inverse;
			}
			.msg-time {
				color: rgba(255, 255, 255, 0.7);
			}
		}
	}
}

.avatar {
	width: 100rpx;
	height: 100rpx;
	flex-shrink: 0;
}

.avatar-circle {
	width: 100rpx;
	height: 100rpx;
	border-radius: $radius-full;
	background: linear-gradient(135deg, $primary-light 0%, $primary-lighter 100%);
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 48rpx;
	box-shadow: $shadow-xs;
}

.content {
	max-width: 70%;
	padding: 20rpx 30rpx;
	margin-bottom: 0;
	box-shadow: $shadow-sm;
	border-radius: $radius-lg;
}

.text-content {
	display: block;
	margin-bottom: 8rpx;
	line-height: 1.6;
	color: $text-primary;
}

.msg-time {
	font-size: 24rpx;
	color: $text-tertiary;
	margin-top: 8rpx;
	text-align: right;
}

.loading-indicator {
	padding: 20rpx;
	text-align: center;
	color: $text-tertiary;
	font-size: 28rpx;
}

.input-container {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	margin: 20rpx;
	padding: 40rpx;
	text-align: center;
	box-shadow: $shadow-lg;
	background-color: $card-bg;
	border-radius: $radius-lg;
	border-top: 1rpx solid $border-light;
}

.voice-btn {
	width: 100%;
	height: 120rpx;
	line-height: 120rpx;
	font-size: 44rpx;
	margin-bottom: 20rpx;
	transition: all $transition-base;
	background: linear-gradient(135deg, $primary-color 0%, $secondary-color 100%);
	border-radius: $radius-xl;
	color: $text-inverse;
	font-weight: $font-weight-bold;
	box-shadow: $shadow-base;

	&.active {
		background: linear-gradient(135deg, $primary-dark 0%, $secondary-color 100%);
		transform: scale(0.95);
		box-shadow: $shadow-lg;
	}
}

@keyframes slideIn {
	from {
		opacity: 0;
		transform: translateY(10rpx);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}
</style>

