<script>
import { createPinia } from 'pinia'
import { useChatStore } from '@/stores/chat'
import { useThemeStore } from '@/stores/theme'

export default {
	setup() {
		const pinia = createPinia()
		const themeStore = useThemeStore()

		// 初始化主题
		themeStore.initTheme()

		return {
			pinia,
			themeStore
		}
	},
	onLaunch: function() {
		console.log('App Launch')

		// 初始化Pinia
		const pinia = createPinia()
		uni.setStorageSync('pinia', pinia)

		// 初始化主题
		const themeStore = useThemeStore()
		themeStore.initTheme()
	},
	onShow: function() {
		console.log('App Show')

		// 检查用户是否已登录，如果已登录则初始化聊天连接
		const token = uni.getStorageSync('token')
		const userId = uni.getStorageSync('userId')

		if (token && userId) {
			const chatStore = useChatStore()
			if (!chatStore.isConnected) {
				// 初始化WebSocket连接
				const apiUrl = process.env.VUE_APP_API_URL || 'http://localhost:3000'
				const wsUrl = apiUrl.replace('http://', 'ws://').replace('https://', 'wss://')

				chatStore.initSocket(wsUrl, userId, token)
				chatStore.loadSessions()
			}
		}
	},
	onHide: function() {
		console.log('App Hide')
	}
}
</script>

<style lang="scss">
	/* ==================== 全局基础样式 ==================== */

	body {
		background-color: $bg-color;
		font-family: $font-family;
		font-size: $font-size-base;
		color: $text-primary;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	.page-container {
		padding: $spacing-base;
		min-height: 100vh;
		background-color: $bg-color;
	}

	/* ==================== 页面标题 ==================== */

	.page-title {
		font-size: $font-size-lg;
		font-weight: $font-weight-bold;
		color: $text-primary;
		margin-bottom: $spacing-md;
		line-height: $line-height-tight;
	}

	/* ==================== 适老化按钮 ==================== */

	.btn-elder {
		height: 100rpx;
		line-height: 100rpx;
		border-radius: $radius-xl;
		font-size: $font-size-base;
		font-weight: $font-weight-bold;
		text-align: center;
		min-width: 200rpx;
		background: linear-gradient(135deg, $primary-color 0%, $secondary-color 100%);
		color: $text-inverse;
		box-shadow: $shadow-base;
		transition: all $transition-base;
		border: none;
		outline: none;
		cursor: pointer;
		user-select: none;

		&:active {
			opacity: 0.9;
			transform: scale(0.96);
			box-shadow: $shadow-md;
		}

		&.light-btn {
			background-color: $card-bg-alt;
			background: none;
			color: $text-primary;
			box-shadow: $shadow-xs;
			border: 2rpx solid $border-light;

			&:active {
				background-color: $card-bg-hover;
				box-shadow: $shadow-sm;
			}
		}

		&.small-btn {
			height: 84rpx;
			line-height: 84rpx;
			font-size: $font-size-sm;
		}

		&.compact-btn {
			height: 82rpx;
			line-height: 82rpx;
			font-size: $font-size-sm;
			padding: 0 28rpx;
		}
	}

	/* ==================== 适老化卡片 ==================== */

	.card-elder {
		background-color: $card-bg;
		border-radius: $radius-lg;
		padding: $spacing-lg;
		margin-bottom: $spacing-base;
		box-shadow: $shadow-sm;
		transition: all $transition-base;
		border: 1rpx solid $border-light;

		&:active {
			box-shadow: $shadow-md;
			transform: translateY(-2rpx);
		}
	}

	/* ==================== 适老化文本 ==================== */

	.text-title {
		font-size: $font-size-lg;
		font-weight: $font-weight-bold;
		color: $text-primary;
		margin-bottom: $spacing-sm;
		line-height: $line-height-tight;
	}

	.text-content {
		font-size: $font-size-base;
		color: $text-primary;
		line-height: $line-height-normal;
		margin-bottom: $spacing-sm;
	}

	.text-helper {
		font-size: $font-size-sm;
		color: $text-tertiary;
		line-height: $line-height-normal;
	}

	/* ==================== 适老化输入框 ==================== */

	.input-elder {
		height: 90rpx;
		border-radius: $radius-base;
		border: 2rpx solid $border-light;
		background-color: $bg-secondary;
		padding: 0 $spacing-sm;
		font-size: $font-size-base;
		color: $text-primary;
		transition: all $transition-base;

		&:focus {
			border-color: $primary-color;
			background-color: $card-bg;
			box-shadow: 0 0 0 4rpx $primary-light;
		}

		&::placeholder {
			color: $text-tertiary;
			font-size: $font-size-sm;
		}
	}

	/* ==================== 适老化列表项 ==================== */

	.list-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: $spacing-base;
		background-color: $card-bg;
		border-radius: $radius-base;
		margin-bottom: $spacing-sm;
		transition: all $transition-base;
		border: 1rpx solid $border-light;

		&:active {
			background-color: $card-bg-hover;
			box-shadow: $shadow-xs;
		}
	}

	/* ==================== 适老化标签 ==================== */

	.tag {
		font-size: $font-size-xs;
		padding: 8rpx 16rpx;
		border-radius: $radius-sm;
		background-color: $bg-secondary;
		color: $text-secondary;
		font-weight: $font-weight-medium;
		display: inline-block;

		&.vip {
			background-color: $secondary-light;
			color: $secondary-color;
		}

		&.free {
			background-color: $bg-secondary;
			color: $text-tertiary;
		}

		&.info {
			background-color: $info-light;
			color: $info-color;
		}

		&.ok {
			background-color: $success-light;
			color: $success-color;
		}

		&.warn {
			background-color: $warning-light;
			color: $warning-color;
		}

		&.error {
			background-color: $error-light;
			color: $error-color;
		}
	}

	/* ==================== 适老化网格布局 ==================== */

	.grid-container {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: $spacing-sm 0;
	}

	.grid-item {
		width: 48%;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: $spacing-lg $spacing-sm;
		box-sizing: border-box;
		transition: all $transition-base;
		background-color: $card-bg;
		border-radius: $radius-lg;
		box-shadow: $shadow-xs;
		margin-bottom: $spacing-md;

		&:active {
			transform: scale(0.97);
			box-shadow: $shadow-md;
		}
	}

	/* ==================== 适老化图标容器 ==================== */

	.icon-wrap {
		width: 120rpx;
		height: 120rpx;
		background: linear-gradient(135deg, $primary-light 0%, $primary-lighter 100%);
		border-radius: $radius-full;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: $spacing-sm;
		transition: all $transition-base;
		box-shadow: $shadow-xs;
	}

	.grid-emoji {
		font-size: 60rpx;
		line-height: 1;
	}

	/* ==================== 适老化紧急按钮 ==================== */

	.emergency-btn {
		width: 100%;
		background: linear-gradient(135deg, $warning-light 0%, $error-light 100%) !important;
		border: 2rpx solid $warning-light !important;
		box-shadow: $shadow-md !important;

		.icon-wrap {
			background: linear-gradient(135deg, $warning-light 0%, $error-light 100%);
		}

		.text-title {
			color: $warning-color;
			font-weight: $font-weight-bold;
		}

		.text-helper {
			color: $error-color;
		}
	}

	/* ==================== 适老化模态框 ==================== */

	.modal-overlay {
		position: fixed;
		inset: 0;
		background-color: rgba(0, 0, 0, 0.45);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: $spacing-base;
		z-index: 100;
	}

	.modal {
		width: 100%;
		max-width: 600rpx;
		background-color: $card-bg;
		border-radius: $radius-lg;
		padding: $spacing-lg;
		box-shadow: $shadow-lg;
	}

	.modal-actions {
		display: flex;
		gap: $spacing-sm;
		margin-top: $spacing-base;

		.btn-elder {
			flex: 1;
		}
	}

	/* ==================== 适老化空状态 ==================== */

	.empty-state {
		padding: $spacing-lg 0 $spacing-md;
		text-align: center;
		color: $text-tertiary;
		background-color: $card-bg;
		border-radius: $radius-lg;
		margin: $spacing-base 0;
	}

	/* ==================== 适老化加载状态 ==================== */

	.loading-state {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: $spacing-lg;
		color: $text-tertiary;
		background-color: $card-bg;
		border-radius: $radius-lg;
		animation: pulse 1.5s ease-in-out infinite;
	}

	/* ==================== 适老化分割线 ==================== */

	.divider {
		height: 2rpx;
		background-color: $border-light;
		margin: $spacing-base 0;
	}

	/* ==================== 辅助类 ==================== */

	.text-center {
		text-align: center;
	}

	.text-right {
		text-align: right;
	}

	.mt-sm {
		margin-top: $spacing-sm;
	}

	.mt-base {
		margin-top: $spacing-base;
	}

	.mb-sm {
		margin-bottom: $spacing-sm;
	}

	.mb-base {
		margin-bottom: $spacing-base;
	}

	.p-sm {
		padding: $spacing-sm;
	}

	.p-base {
		padding: $spacing-base;
	}

	/* ==================== 动画 ==================== */

	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	@keyframes slideIn {
		from {
			transform: translateY(20rpx);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
