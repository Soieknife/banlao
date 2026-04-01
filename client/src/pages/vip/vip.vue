<template>
	<view class="page-container vip-page">
		<view class="vip-header card-elder">
			<text class="text-title">💎 暖阳 VIP 会员</text>
			<text class="text-content">开通会员，解锁无限次 AI 智能陪聊</text>
		</view>

		<view class="privileges card-elder">
			<view class="text-title">会员特权</view>
			<view class="privilege-item">
				<text class="icon">🤖</text>
				<view class="desc">
					<text class="text-content">无限次 AI 陪聊</text>
					<text class="text-helper">基于先进大模型的智能对话</text>
				</view>
			</view>
			<view class="privilege-item">
				<text class="icon">👨‍👩‍👧‍👦</text>
				<view class="desc">
					<text class="text-content">多子女共同守护</text>
					<text class="text-helper">支持绑定无限个子女账号</text>
				</view>
			</view>
			<view class="privilege-item">
				<text class="icon">📈</text>
				<view class="desc">
					<text class="text-content">健康趋势分析</text>
					<text class="text-helper">子女可查看长辈月度健康报告</text>
				</view>
			</view>
		</view>

		<view class="pricing">
			<view class="price-card card-elder active">
				<text class="text-title">月度会员</text>
				<text class="price">¥ 19.9 / 月</text>
			</view>
			<view class="price-card card-elder">
				<text class="text-title">年度会员</text>
				<text class="price">¥ 168 / 年</text>
				<text class="badge">更划算</text>
			</view>
		</view>

		<button class="btn-elder buy-btn" @click="handleBuy">立即开通</button>
		<text class="text-helper disclaimer">点击立即开通即表示同意《暖阳陪伴会员协议》</text>
	</view>
</template>

<script setup>
import { speak } from '../../utils/voice';

const handleBuy = () => {
	speak('正在为您调起支付，感谢支持暖阳陪伴。');
	uni.showModal({
		title: '模拟支付',
		content: '这是一个商业演示，点击确定模拟支付成功。',
		success: (res) => {
			if (res.confirm) {
				uni.showToast({ title: '支付成功！' });
				// 实际应请求后端更新 VIP 状态
				setTimeout(() => {
					uni.navigateBack();
				}, 1500);
			}
		}
	});
};
</script>

<style lang="scss" scoped>
.vip-header {
	background: linear-gradient(135deg, #F5A623, #FFD93D);
	color: #FFFFFF;
	text-align: center;
	padding: 60rpx;
	
	.text-title, .text-content { color: #FFFFFF; }
}

.privileges {
	margin-top: 30rpx;
}

.privilege-item {
	display: flex;
	align-items: center;
	margin-top: 30rpx;
	gap: 20rpx;
	
	.icon { font-size: 60rpx; }
	.desc { display: flex; flex-direction: column; }
}

.pricing {
	display: flex;
	gap: 20rpx;
	margin-top: 30rpx;
}

.price-card {
	flex: 1;
	text-align: center;
	position: relative;
	border: 2rpx solid transparent;
	
	&.active {
		border-color: #F5A623;
		background-color: #FFF9F0;
	}
	
	.price {
		font-size: 44rpx;
		color: $warning-color;
		font-weight: bold;
		display: block;
		margin-top: 10rpx;
	}
	
	.badge {
		position: absolute;
		top: -20rpx;
		right: -10rpx;
		background-color: $warning-color;
		color: #FFFFFF;
		font-size: 20rpx;
		padding: 4rpx 10rpx;
		border-radius: 10rpx;
	}
}

.buy-btn {
	width: 100%;
	background-color: #F5A623;
	margin-top: 40rpx;
}

.disclaimer {
	display: block;
	text-align: center;
	margin-top: 20rpx;
}
</style>
