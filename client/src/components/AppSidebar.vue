<template>
	<view>
		<view class="sidebar-trigger" @click="toggleDrawer">
			<text class="trigger-icon">☰</text>
		</view>

		<view v-if="visible" class="sidebar-mask" @click="closeDrawer"></view>

		<view class="sidebar-panel" :class="{ visible }">
			<view class="sidebar-header">
				<view>
					<view class="title">暖阳陪伴</view>
					<view class="subtitle">常用功能导航</view>
				</view>
				<text class="close-icon" @click="closeDrawer">×</text>
			</view>

			<view class="nav-list">
				<view
					v-for="item in navItems"
					:key="item.path"
					class="nav-item"
					:class="{ active: item.path === activePath }"
					@click="goTo(item.path)"
				>
					<text class="nav-emoji">{{ item.icon }}</text>
					<view class="nav-text">
						<view class="nav-title">{{ item.label }}</view>
						<view class="nav-desc">{{ item.desc }}</view>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
	activePath: {
		type: String,
		default: ''
	}
});

const visible = ref(false);

const navItems = [
	{ path: '/pages/index/index', icon: '🏠', label: '首页', desc: '回到主功能入口' },
	{ path: '/pages/ai/ai', icon: '🤖', label: '暖阳陪聊', desc: '随时说说话' },
	{ path: '/pages/reminders/reminders', icon: '🔔', label: '提醒事项', desc: '管理日常和用药提醒' },
	{ path: '/pages/health/health', icon: '💊', label: '用药管理', desc: '服药记录和识药助手' },
	{ path: '/pages/medication-ocr/medication-ocr', icon: '📷', label: '识药助手', desc: '拍照识别说明书' },
	{ path: '/pages/life/life', icon: '☀️', label: '生活查询', desc: '天气和常用电话' },
	{ path: '/pages/profile/profile', icon: '👤', label: '个人信息', desc: '修改手机号和查看家人' }
];

const toggleDrawer = () => {
	visible.value = !visible.value;
};

const closeDrawer = () => {
	visible.value = false;
};

const goTo = (path) => {
	closeDrawer();
	if (path === props.activePath) return;
	if (path === '/pages/index/index') {
		uni.reLaunch({ url: path });
		return;
	}
	uni.navigateTo({ url: path });
};
</script>

<style lang="scss" scoped>
.sidebar-trigger {
	position: fixed;
	right: 24rpx;
	top: 120rpx;
	width: 92rpx;
	height: 92rpx;
	border-radius: 28rpx;
	background: linear-gradient(135deg, #4A90E2, #6FAEF2);
	box-shadow: 0 12rpx 36rpx rgba(74, 144, 226, 0.25);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 90;
}

.trigger-icon {
	font-size: 42rpx;
	color: #fff;
	font-weight: bold;
}

.sidebar-mask {
	position: fixed;
	inset: 0;
	background-color: rgba(15, 23, 42, 0.32);
	z-index: 98;
}

.sidebar-panel {
	position: fixed;
	top: 0;
	right: 0;
	bottom: 0;
	width: 560rpx;
	background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
	padding: 48rpx 28rpx 32rpx;
	box-shadow: -18rpx 0 48rpx rgba(15, 23, 42, 0.12);
	transform: translateX(100%);
	transition: transform 0.25s ease;
	z-index: 99;
}

.sidebar-panel.visible {
	transform: translateX(0);
}

.sidebar-header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	margin-bottom: 30rpx;
}

.title {
	font-size: 40rpx;
	font-weight: bold;
	color: #22324d;
}

.subtitle {
	margin-top: 8rpx;
	font-size: 26rpx;
	color: #6b7a90;
}

.close-icon {
	width: 64rpx;
	height: 64rpx;
	line-height: 64rpx;
	text-align: center;
	font-size: 48rpx;
	color: #7b8798;
}

.nav-list {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

.nav-item {
	display: flex;
	align-items: center;
	gap: 18rpx;
	padding: 22rpx 20rpx;
	border-radius: 24rpx;
	background-color: rgba(255, 255, 255, 0.9);
	border: 2rpx solid #e7eef8;
}

.nav-item.active {
	background: linear-gradient(135deg, #edf5ff 0%, #fff8ea 100%);
	border-color: #bed7ff;
}

.nav-emoji {
	width: 76rpx;
	height: 76rpx;
	border-radius: 22rpx;
	background-color: #eef5ff;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 38rpx;
	flex-shrink: 0;
}

.nav-text {
	flex: 1;
}

.nav-title {
	font-size: 30rpx;
	font-weight: bold;
	color: #1f2937;
}

.nav-desc {
	margin-top: 6rpx;
	font-size: 24rpx;
	color: #708090;
}
</style>
