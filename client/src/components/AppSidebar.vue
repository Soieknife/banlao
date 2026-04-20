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
import { ref, computed } from 'vue';

const props = defineProps({
	activePath: {
		type: String,
		default: ''
	}
});

const visible = ref(false);

// 导航项配置
const navItems = [
	{ path: '/pages/index/index', icon: '🏠', label: '首页', desc: '回到主功能入口' },
	{ path: '/pages/ai/ai', icon: '🤖', label: '暖阳陪聊', desc: '随时说说话' },
	{ path: '/pages/reminders/reminders', icon: '🔔', label: '提醒事项', desc: '管理日常和用药提醒' },
	{ path: '/pages/health/health', icon: '💊', label: '用药管理', desc: '服药记录和识药助手' },
	{ path: '/pages/medication-ocr/medication-ocr', icon: '📷', label: '识药助手', desc: '拍照识别说明书' },
	{ path: '/pages/life/life', icon: '☀️', label: '生活查询', desc: '天气和常用电话' },
	{ path: '/pages/profile/profile', icon: '👤', label: '个人信息', desc: '修改手机号和查看家人' }
];

// 切换侧边栏
const toggleDrawer = () => {
	visible.value = !visible.value;
};

// 关闭侧边栏
const closeDrawer = () => {
	visible.value = false;
};

// 跳转到指定页面
const goTo = (path) => {
	closeDrawer();
	if (path === props.activePath) return;
	
	try {
		if (path === '/pages/index/index') {
			uni.reLaunch({ url: path });
		} else {
			uni.navigateTo({ url: path });
		}
	} catch (error) {
		console.error('导航失败:', error);
		uni.showToast({ title: '导航失败', icon: 'none' });
	}
};
</script>

<style lang="scss" scoped>
.sidebar-trigger {
	position: fixed;
	right: 24rpx;
	top: 120rpx;
	width: 92rpx;
	height: 92rpx;
	border-radius: $radius-btn;
	background: linear-gradient(135deg, $main-color, #6FAEF2);
	box-shadow: $shadow-lg;
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 90;
	transition: all $transition-base;
	
	&:active {
		transform: scale(0.95);
		box-shadow: $shadow-base;
	}
}

.trigger-icon {
	font-size: 42rpx;
	color: $text-inverse;
	font-weight: $font-weight-bold;
}

.sidebar-mask {
	position: fixed;
	inset: 0;
	background-color: rgba(15, 23, 42, 0.32);
	z-index: 98;
	transition: background-color $transition-base;
}

.sidebar-panel {
	position: fixed;
	top: 0;
	right: 0;
	bottom: 0;
	width: 560rpx;
	background: linear-gradient(180deg, $card-bg-alt 0%, $card-bg 100%);
	padding: 48rpx 28rpx 32rpx;
	box-shadow: -18rpx 0 48rpx rgba(15, 23, 42, 0.12);
	transform: translateX(100%);
	transition: transform $transition-base;
	z-index: 99;
	overflow-y: auto;
	
	// 滚动条样式
	&::-webkit-scrollbar {
		width: 6rpx;
	}
	
	&::-webkit-scrollbar-track {
		background: $input-bg;
		border-radius: $radius-circle;
	}
	
	&::-webkit-scrollbar-thumb {
		background: $border-color;
		border-radius: $radius-circle;
	}
	
	&::-webkit-scrollbar-thumb:hover {
		background: $text-tertiary;
	}
}

.sidebar-panel.visible {
	transform: translateX(0);
}

.sidebar-header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	margin-bottom: $spacing-base;
	padding-bottom: $spacing-sm;
	border-bottom: $border-width solid $border-color;
}

.title {
	font-size: $font-size-lg;
	font-weight: $font-weight-bold;
	color: $text-primary;
}

.subtitle {
	margin-top: $spacing-xs;
	font-size: $font-size-sm;
	color: $text-tertiary;
}

.close-icon {
	width: 64rpx;
	height: 64rpx;
	line-height: 64rpx;
	text-align: center;
	font-size: 48rpx;
	color: $text-tertiary;
	transition: all $transition-base;
	
	&:active {
		transform: scale(0.9);
		color: $text-secondary;
	}
}

.nav-list {
	display: flex;
	flex-direction: column;
	gap: $spacing-sm;
}

.nav-item {
	display: flex;
	align-items: center;
	gap: 18rpx;
	padding: $spacing-base $spacing-sm;
	border-radius: $radius-base;
	background-color: rgba(255, 255, 255, 0.9);
	border: $border-width solid $border-color;
	transition: all $transition-base;
	
	&:active {
		transform: scale(0.98);
		background-color: $input-bg;
	}
}

.nav-item.active {
	background: linear-gradient(135deg, $main-color-light 0%, $secondary-color-light 100%);
	border-color: $main-color-light;
}

.nav-emoji {
	width: 76rpx;
	height: 76rpx;
	border-radius: $radius-base;
	background-color: $main-color-light;
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
	font-size: $font-size-base;
	font-weight: $font-weight-bold;
	color: $text-primary;
}

.nav-desc {
	margin-top: $spacing-xs;
	font-size: $font-size-xs;
	color: $text-tertiary;
}
</style>
