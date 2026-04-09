<template>
	<view class="page-container ai-chat-page">
		<!-- 聊天记录 -->
		<scroll-view scroll-y class="chat-history" :scroll-into-view="lastMsgId">
			<view v-for="(msg, index) in messages" :key="index" :id="'msg-' + index" class="chat-item" :class="msg.role">
				<view class="avatar">
					<view class="avatar-circle">
						<text v-if="msg.role === 'ai'">🤖</text>
						<text v-else>🙂</text>
					</view>
				</view>
				<view class="content card-elder">
					<text class="text-content">{{ msg.text }}</text>
				</view>
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

const messages = ref([
	{ role: 'ai', text: '您好，我是暖阳，您可以随时跟我聊天。' }
]);
const lastMsgId = ref('');
const isRecording = ref(false);
const user = ref({});

/**
 * 模拟开始录音
 */
const startVoice = () => {
	if (!user.value.is_vip) {
		speak('AI 陪聊需要由子女为您开通会员。');
		uni.showModal({
			title: '需要子女开通',
			content: 'AI 陪聊是会员功能，请让子女在子女端为您开通会员后再使用。',
			confirmText: '我知道了'
		});
		return;
	}
	isRecording.value = true;
	// 实际开发可集成 uni.getRecorderManager()
};

/**
 * 模拟停止录音并发送消息
 */
const stopVoice = async () => {
	if (!isRecording.value) return;
	isRecording.value = false;
	
	// 模拟录音识别结果
	const userText = "你好，暖阳";
	addMessage('user', userText);
	
	try {
		const res = await request('/ai/chat', 'POST', { message: userText });
		const aiResponse = res.data.response;
		addMessage('ai', aiResponse);
		speak(aiResponse);
	} catch (err) {
		console.error('聊天失败', err);
	}
};

/**
 * 添加消息并滚动到底部
 */
const addMessage = (role, text) => {
	messages.value.push({ role, text });
	nextTick(() => {
		lastMsgId.value = 'msg-' + (messages.value.length - 1);
	});
};

onMounted(() => {
	const storedUser = uni.getStorageSync('user');
	if (storedUser) {
		user.value = JSON.parse(storedUser);
	}
	
	speak('欢迎来到暖阳陪聊，想跟我聊点什么吗？您可以按住屏幕下方的按钮对我说话。');
});
</script>

<style lang="scss" scoped>
.ai-chat-page {
	display: flex;
	flex-direction: column;
	height: 100vh;
	padding-bottom: 200rpx;
}

.chat-history {
	flex: 1;
	padding: 20rpx;
}

.chat-item {
	display: flex;
	margin-bottom: 40rpx;
	
	&.ai {
		flex-direction: row;
		.content {
			background-color: #FFFFFF;
			margin-left: 20rpx;
		}
	}
	
	&.user {
		flex-direction: row-reverse;
		.content {
			background-color: $main-color;
			margin-right: 20rpx;
			.text-content {
				color: #FFFFFF;
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
	border-radius: 50%;
	background-color: #EBF3FF;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 48rpx;
}

.content {
	max-width: 70%;
	padding: 20rpx 30rpx;
	margin-bottom: 0;
	box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
}

.input-container {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	margin: 20rpx;
	padding: 40rpx;
	text-align: center;
	box-shadow: 0 -4rpx 20rpx rgba(0,0,0,0.1);
}

.voice-btn {
	width: 100%;
	height: 120rpx;
	line-height: 120rpx;
	font-size: 44rpx;
	margin-bottom: 20rpx;
	transition: all 0.2s;
	
	&.active {
		background-color: $warning-color;
		transform: scale(0.95);
	}
}
</style>
