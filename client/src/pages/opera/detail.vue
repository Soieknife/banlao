<template>
	<view class="page-container detail-page senior-high-contrast senior-large-font">
		<view v-if="loading" class="loading-state">
			<text class="senior-text-body">加载中...</text>
		</view>

		<view v-else-if="!detail.id" class="empty-state">
			<text class="empty-emoji">🎭</text>
			<text class="senior-text-body">未找到该戏曲信息</text>
		</view>

		<template v-else>
			<!-- 封面区域 -->
			<view class="detail-hero" :style="getCoverStyle(detail)">
				<text class="hero-emoji">🎵</text>
				<view v-if="detail.category" class="hero-category">{{ detail.category }}</view>
			</view>

			<!-- 播放器卡片 -->
			<view v-if="detail.audio_url" class="player-card senior-card">
				<view class="player-info">
					<text class="player-icon">{{ playing ? '🔊' : '🎵' }}</text>
					<view class="player-text">
						<text class="player-title senior-text-body">{{ detail.name }}</text>
						<text class="player-status senior-text-helper">{{ playing ? '正在播放...' : '点击播放经典唱段' }}</text>
					</view>
				</view>
				<view class="player-controls">
					<view class="play-btn" :class="{ playing: playing }" @click="togglePlay">
						<text class="play-icon">{{ playing ? '⏸' : '▶' }}</text>
					</view>
				</view>
				<!-- 进度条 -->
				<view class="progress-bar">
					<view class="progress-track">
						<view class="progress-fill" :style="{ width: progress + '%' }"></view>
					</view>
					<view class="progress-time">
						<text class="time-text">{{ formatTime(currentTime) }}</text>
						<text class="time-text">{{ formatTime(duration) }}</text>
					</view>
				</view>
			</view>

			<!-- 内容卡片 -->
			<view class="detail-card senior-card">
				<text class="detail-name">{{ detail.name }}</text>
				<text class="detail-intro senior-text-helper">{{ detail.intro }}</text>

				<view class="divider"></view>

				<view class="section">
					<view class="section-header">
						<text class="section-icon">📖</text>
						<text class="section-title">剧情简介</text>
					</view>
					<text class="section-text senior-text-body">{{ detail.story }}</text>
				</view>
			</view>
		</template>
	</view>
</template>

<script setup>
import { ref, onUnmounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { request } from '../../utils/request';
import { speak } from '../../utils/voice';

const detail = ref({});
const loading = ref(false);
const playing = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const progress = ref(0);

let audioContext = null;

const categoryColors = {
	'豫剧': ['#E74C3C', '#FADBD8'],
	'京剧': ['#D4AC0D', '#FEF9E7'],
	'黄梅戏': ['#27AE60', '#D5F5E3'],
	'越剧': ['#8E44AD', '#E8DAEF'],
	'评剧': ['#2980B9', '#D6EAF8'],
	'昆曲': ['#E67E22', '#FDEBD0']
};

const getCoverStyle = (item) => {
	const colors = categoryColors[item.category] || ['#667eea', '#e8eaf6'];
	return {
		background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`
	};
};

const formatTime = (seconds) => {
	if (!seconds || isNaN(seconds)) return '00:00';
	const min = Math.floor(seconds / 60);
	const sec = Math.floor(seconds % 60);
	return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

const initAudio = (url) => {
	if (audioContext) {
		audioContext.destroy();
	}
	audioContext = uni.createInnerAudioContext();
	audioContext.src = url;

	audioContext.onCanplay(() => {
		// duration 可能在此时还不可用，需要在 onTimeUpdate 中获取
	});

	audioContext.onTimeUpdate(() => {
		if (audioContext.duration && isFinite(audioContext.duration)) {
			duration.value = audioContext.duration;
			currentTime.value = audioContext.currentTime;
			progress.value = (audioContext.currentTime / audioContext.duration) * 100;
		}
	});

	audioContext.onEnded(() => {
		playing.value = false;
		progress.value = 0;
		currentTime.value = 0;
	});

	audioContext.onError((err) => {
		console.error('音频播放错误:', err);
		playing.value = false;
		uni.showToast({ title: '音频播放失败', icon: 'none' });
	});
};

const togglePlay = () => {
	if (!audioContext || !detail.value.audio_url) return;

	if (playing.value) {
		audioContext.pause();
		playing.value = false;
	} else {
		audioContext.play();
		playing.value = true;
	}
};

const loadDetail = async (id) => {
	loading.value = true;
	try {
		const res = await request(`/opera/detail/${id}`, 'GET', {}, { showLoading: false });
		detail.value = res.data || {};
		if (detail.value.name) {
			uni.setNavigationBarTitle({ title: detail.value.name });
		}
		// 语音提示：播报戏曲名称和简介
		speak(`正在为您介绍${detail.value.name}。${detail.value.intro}`);
		// 如果有音频，初始化播放器
		if (detail.value.audio_url) {
			initAudio(detail.value.audio_url);
		}
	} catch (err) {
		uni.showToast({ title: '加载失败', icon: 'none' });
	} finally {
		loading.value = false;
	}
};

onLoad((options) => {
	if (options && options.id) {
		loadDetail(options.id);
	}
});

// 页面卸载时销毁音频
onUnmounted(() => {
	if (audioContext) {
		audioContext.stop();
		audioContext.destroy();
		audioContext = null;
	}
});
</script>

<style lang="scss" scoped>
.detail-page {
	background-color: $bg-primary;
	min-height: 100vh;
}

.detail-hero {
	width: 100%;
	height: 360rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
}

.hero-emoji {
	font-size: 120rpx;
}

.hero-category {
	position: absolute;
	bottom: $spacing-md;
	right: $spacing-lg;
	background: rgba(255, 255, 255, 0.85);
	padding: $spacing-xs $spacing-md;
	border-radius: $radius-full;
	font-size: $fs-14;
	font-weight: $fw-bold;
	color: $text-primary;
}

/* 播放器卡片 */
.player-card {
	margin: $spacing-md;
	padding: $spacing-lg;
	border-radius: $radius-lg;
	background: linear-gradient(135deg, #1a1a2e, #16213e);
	color: #fff;
}

.player-info {
	display: flex;
	align-items: center;
	margin-bottom: $spacing-md;
}

.player-icon {
	font-size: 48rpx;
	margin-right: $spacing-md;
}

.player-text {
	flex: 1;
}

.player-title {
	font-size: $fs-18;
	font-weight: $fw-bold;
	color: #fff;
	display: block;
}

.player-status {
	font-size: $fs-12;
	color: rgba(255, 255, 255, 0.7);
	display: block;
	margin-top: $spacing-xs;
}

.player-controls {
	display: flex;
	justify-content: center;
	margin-bottom: $spacing-md;
}

.play-btn {
	width: 100rpx;
	height: 100rpx;
	border-radius: 50%;
	background: linear-gradient(135deg, #E74C3C, #C0392B);
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all $transition-base;
	box-shadow: 0 4rpx 16rpx rgba(231, 76, 60, 0.4);

	&:active {
		transform: scale(0.95);
	}

	&.playing {
		background: linear-gradient(135deg, #27AE60, #229954);
		box-shadow: 0 4rpx 16rpx rgba(39, 174, 96, 0.4);
	}
}

.play-icon {
	font-size: 44rpx;
	color: #fff;
}

.progress-bar {
	padding: 0 $spacing-xs;
}

.progress-track {
	height: 8rpx;
	background: rgba(255, 255, 255, 0.2);
	border-radius: 4rpx;
	overflow: hidden;
}

.progress-fill {
	height: 100%;
	background: linear-gradient(90deg, #E74C3C, #F39C12);
	border-radius: 4rpx;
	transition: width 0.3s linear;
}

.progress-time {
	display: flex;
	justify-content: space-between;
	margin-top: $spacing-xs;
}

.time-text {
	font-size: 20rpx;
	color: rgba(255, 255, 255, 0.6);
}

/* 内容卡片 */
.detail-card {
	margin: -$spacing-lg $spacing-md 0;
	padding: $spacing-lg;
	border-radius: $radius-lg;
	background-color: $card-bg;
	box-shadow: $shadow-md;
	position: relative;
	z-index: 1;
}

.detail-name {
	font-size: $fs-22;
	font-weight: $fw-bold;
	color: $text-primary;
	display: block;
	margin-bottom: $spacing-sm;
}

.detail-intro {
	font-size: $fs-16;
	color: $text-secondary;
	line-height: $line-height-relaxed;
	display: block;
	margin-bottom: $spacing-md;
}

.divider {
	height: 2rpx;
	background-color: $border-light;
	margin: $spacing-lg 0;
}

.section {
	margin-top: $spacing-sm;
}

.section-header {
	display: flex;
	align-items: center;
	margin-bottom: $spacing-md;
}

.section-icon {
	font-size: 40rpx;
	margin-right: $spacing-sm;
}

.section-title {
	font-size: $fs-18;
	font-weight: $fw-bold;
	color: $text-primary;
}

.section-text {
	font-size: $fs-16;
	color: $text-secondary;
	line-height: 2;
	text-align: justify;
}

.loading-state,
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 200rpx 0;
}

.empty-emoji {
	font-size: 100rpx;
	margin-bottom: $spacing-md;
}
</style>
