<template>
	<view class="page-container home-page">
		<!-- 头部信息 -->
		<view class="header card-elder">
			<view class="user-info">
				<view class="text-title">下午好，{{ user.nickname || '长辈' }}</view>
				<view v-if="user.is_vip" class="vip-badge">💎 暖阳 VIP 会员</view>
				<view v-else class="vip-badge-none" @click="navigateTo('/pages/vip/vip')">开通会员 享受 AI 陪聊</view>
			</view>
			<view class="text-content">今天是 2026年4月1日 星期三</view>
			<view class="text-helper">当前天气：晴，22℃</view>
		</view>

		<!-- 核心功能区 (大图标网格) -->
		<view class="grid-container">
			<view class="grid-item card-elder emergency-btn" @click="handleEmergency">
				<view class="icon-wrap"><image src="/static/emergency.png" class="grid-icon"></image></view>
				<view class="text-title">紧急呼救</view>
				<view class="text-helper">一键联系子女</view>
			</view>
			
			<view class="grid-item card-elder" @click="navigateTo('/pages/reminders/reminders')">
				<view class="icon-wrap"><image src="/static/reminder.png" class="grid-icon"></image></view>
				<view class="text-title">提醒事项</view>
				<view class="text-helper">用药、日常提醒</view>
			</view>

			<view class="grid-item card-elder" @click="navigateTo('/pages/health/health')">
				<view class="icon-wrap"><image src="/static/health.png" class="grid-icon"></image></view>
				<view class="text-title">健康记录</view>
				<view class="text-helper">今日步数、用药</view>
			</view>

			<view class="grid-item card-elder" @click="navigateTo('/pages/life/life')">
				<view class="icon-wrap"><image src="/static/life.png" class="grid-icon"></image></view>
				<view class="text-title">生活查询</view>
				<view class="text-helper">天气、常用电话</view>
			</view>

			<view class="grid-item card-elder" @click="navigateTo('/pages/ai/ai')">
				<view class="icon-wrap"><image src="/static/chat.png" class="grid-icon"></image></view>
				<view class="text-title">暖阳陪聊</view>
				<view class="text-helper">AI 语音智能对话</view>
			</view>
			
			<view class="grid-item card-elder" @click="handleLogout">
				<view class="icon-wrap"><image src="/static/logout.png" class="grid-icon"></image></view>
				<view class="text-title">退出登录</view>
				<view class="text-helper">切换账号</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { speak } from '../../utils/voice';
import { request } from '../../utils/request';

const user = ref({});

/**
 * 首页逻辑
 */
onMounted(() => {
	const storedUser = uni.getStorageSync('user');
	if (storedUser) {
		user.value = JSON.parse(storedUser);
	} else {
		uni.redirectTo({ url: '/pages/login/login' });
		return;
	}
	speak(`欢迎使用暖阳陪伴助手，祝您心情愉快`);
});

/**
 * 退出登录
 */
const handleLogout = () => {
	uni.showModal({
		title: '退出登录',
		content: '确定要退出当前账号吗？',
		success: (res) => {
			if (res.confirm) {
				uni.removeStorageSync('token');
				uni.removeStorageSync('user');
				uni.reLaunch({ url: '/pages/login/login' });
			}
		}
	});
};

/**
 * 导航跳转
 * @param {string} url - 目标页面路径
 */
const navigateTo = (url) => {
	uni.navigateTo({ url });
};

/**
 * 紧急呼助处理
 */
const handleEmergency = () => {
	speak('正在为您发起紧急呼救');
	uni.showModal({
		title: '紧急呼救',
		content: '确定要发起紧急呼救吗？系统将立即通知您的子女并发送定位。',
		confirmText: '立即发送',
		confirmColor: '#E74C3C',
		success: async (res) => {
			if (res.confirm) {
				console.log('正在发送紧急求助信号');
				
				// 获取当前位置
				uni.getLocation({
					type: 'wgs84',
					success: async (locRes) => {
						try {
							const result = await request('/emergency/call', 'POST', {
								lat: locRes.latitude,
								lng: locRes.longitude,
								address: '正在通过定位获取具体地址...' // 实际开发可集成逆地理编码
							});
							
							speak(result.message);
							uni.showToast({ title: '已发送求助信号', icon: 'success' });
						} catch (err) {
							console.error('求助失败', err);
							uni.showToast({ title: '求助发送失败，请直接拨打电话', icon: 'none' });
						}
					},
					fail: (err) => {
						console.error('定位失败', err);
						uni.showToast({ title: '无法获取位置，请直接拨打电话', icon: 'none' });
					}
				});
			}
		}
	});
};
</script>

<style lang="scss" scoped>
.home-page {
	padding-top: 60rpx;
}

.header {
	margin-bottom: 40rpx;
	border-left: 10rpx solid $main-color;
	display: flex;
	flex-direction: column;
	gap: 10rpx;
}

.user-info {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 10rpx;
}

.vip-badge {
	font-size: 24rpx;
	background-color: #FFF5E6;
	color: #F5A623;
	padding: 4rpx 16rpx;
	border-radius: 20rpx;
	border: 1rpx solid #F5A623;
}

.vip-badge-none {
	font-size: 24rpx;
	background-color: #F0F0F0;
	color: #999;
	padding: 4rpx 16rpx;
	border-radius: 20rpx;
	text-decoration: underline;
}

.grid-container {
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
}

.grid-item {
	width: 48%;
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	padding: 40rpx 20rpx;
	box-sizing: border-box;

	.icon-wrap {
		width: 120rpx;
		height: 120rpx;
		background-color: #EBF3FF;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 20rpx;
	}

	.grid-icon {
		width: 80rpx;
		height: 80rpx;
	}

	.text-title {
		font-size: 38rpx;
		margin-bottom: 10rpx;
	}

	.text-helper {
		font-size: 26rpx;
	}
}

.emergency-btn {
	width: 100%;
	background-color: #FFF5F5;
	border: 2rpx solid #FFDCDC;
	
	.icon-wrap {
		background-color: #FFE5E5;
	}
	
	.text-title {
		color: $warning-color;
	}
}
</style>
