<script>
	export default {
		onLaunch: function() {
			console.log('App Launch')
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style lang="scss">
	/*每个页面公共css */
	body {
		background-color: $bg-color;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
		font-size: $font-size-base;
		color: $text-primary;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	.page-container {
		padding: $spacing-base;
		min-height: 100vh;
	}

	/* 适老化按钮 */
	.btn-elder {
		height: 100rpx;
		line-height: 100rpx;
		border-radius: $radius-btn;
		font-size: $font-size-base;
		font-weight: $font-weight-bold;
		text-align: center;
		min-width: 200rpx;
		background-color: $main-color;
		color: $text-inverse;
		box-shadow: $shadow-base;
		transition: all $transition-base;
		border: none;
		outline: none;
		cursor: pointer;
		user-select: none;
		
		&:active {
			opacity: 0.8;
			transform: scale(0.98);
			box-shadow: $shadow-sm;
		}
		
		&.light-btn {
			background-color: $card-bg-alt;
			color: $text-primary;
			box-shadow: none;
			border: $border-width solid $border-color;
			
			&:active {
				background-color: $input-bg;
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

	/* 适老化卡片 */
	.card-elder {
		background-color: $card-bg;
		border-radius: $radius-card;
		padding: $spacing-lg;
		margin-bottom: $spacing-base;
		box-shadow: $shadow-base;
		transition: box-shadow $transition-base;
		
		&:active {
			box-shadow: $shadow-sm;
		}
	}

	/* 适老化文本 */
	.text-title {
		font-size: $font-size-lg;
		font-weight: $font-weight-bold;
		color: $text-primary;
		margin-bottom: $spacing-sm;
		line-height: 1.3;
	}

	.text-content {
		font-size: $font-size-base;
		color: $text-secondary;
		line-height: 1.6;
		margin-bottom: $spacing-sm;
	}

	.text-helper {
		font-size: $font-size-sm;
		color: $text-tertiary;
		line-height: 1.4;
	}
	
	/* 适老化输入框 */
	.input-elder {
		height: 90rpx;
		border-radius: $radius-base;
		border: $border-width solid $border-color;
		background-color: $input-bg;
		padding: 0 $spacing-sm;
		font-size: $font-size-base;
		color: $text-primary;
		transition: all $transition-base;
		
		&:focus {
			border-color: $main-color;
			background-color: $card-bg;
			box-shadow: 0 0 0 4rpx $main-color-light;
		}
		
		&::placeholder {
			color: $text-tertiary;
			font-size: $font-size-sm;
		}
	}
	
	/* 适老化列表项 */
	.list-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: $spacing-base;
		background-color: $card-bg;
		border-radius: $radius-base;
		margin-bottom: $spacing-sm;
		transition: all $transition-base;
		
		&:active {
			background-color: $input-bg;
		}
	}
	
	/* 适老化标签 */
	.tag {
		font-size: $font-size-xs;
		padding: 6rpx 14rpx;
		border-radius: $radius-sm;
		background-color: $input-bg;
		color: $text-secondary;
		font-weight: $font-weight-medium;
		
		&.vip {
			background-color: $secondary-color-light;
			color: $secondary-color;
		}
		
		&.free {
			background-color: $input-bg;
			color: $text-tertiary;
		}
		
		&.info {
			background-color: $info-color-light;
			color: $info-color;
		}
		
		&.ok {
			background-color: $success-color-light;
			color: $success-color;
		}
		
		&.warn {
			background-color: $warning-color-light;
			color: $warning-color;
		}
	}
	
	/* 适老化网格布局 */
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
		
		&:active {
			transform: scale(0.98);
		}
	}
	
	/* 适老化图标容器 */
	.icon-wrap {
		width: 120rpx;
		height: 120rpx;
		background-color: $main-color-light;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: $spacing-sm;
		transition: all $transition-base;
	}
	
	.grid-emoji {
		font-size: 60rpx;
		line-height: 1;
	}
	
	/* 适老化紧急按钮 */
	.emergency-btn {
		width: 100%;
		background-color: $warning-color-light;
		border: $border-width solid $warning-color-light;
		
		.icon-wrap {
			background-color: $warning-color-light;
		}
		
		.text-title {
			color: $warning-color;
		}
	}
	
	/* 适老化模态框 */
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
	}
	
	.modal-actions {
		display: flex;
		gap: $spacing-sm;
		margin-top: $spacing-base;
	}
	
	/* 适老化空状态 */
	.empty-state {
		padding: $spacing-lg 0 $spacing-sm;
		text-align: center;
		color: $text-tertiary;
	}
	
	/* 适老化加载状态 */
	.loading-state {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: $spacing-lg;
		color: $text-tertiary;
	}
	
	/* 适老化分割线 */
	.divider {
		height: $border-width;
		background-color: $border-color;
		margin: $spacing-base 0;
	}
	
	/* 适老化辅助类 */
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
</style>
