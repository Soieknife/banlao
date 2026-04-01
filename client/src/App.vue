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
		background-color: #F8F9FA;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
	}

	.page-container {
		padding: 30rpx;
	}

	/* 适老化按钮 */
	.btn-elder {
		height: 100rpx;
		line-height: 100rpx;
		border-radius: 32rpx;
		font-size: 36rpx;
		font-weight: bold;
		text-align: center;
		min-width: 200rpx;
		background-color: #4A90E2;
		color: #FFFFFF;
		box-shadow: 0 4rpx 12rpx rgba(74, 144, 226, 0.3);
		
		&:active {
			opacity: 0.8;
			transform: scale(0.98);
		}
	}

	/* 适老化卡片 */
	.card-elder {
		background-color: #FFFFFF;
		border-radius: 24rpx;
		padding: 40rpx;
		margin-bottom: 30rpx;
		box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);
	}

	/* 适老化文本 */
	.text-title {
		font-size: 44rpx;
		font-weight: bold;
		color: #333333;
		margin-bottom: 20rpx;
	}

	.text-content {
		font-size: 36rpx;
		color: #666666;
		line-height: 1.6;
	}

	.text-helper {
		font-size: 28rpx;
		color: #999999;
	}
</style>
