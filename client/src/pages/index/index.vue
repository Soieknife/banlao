<template>
	<view class="page-container home-page">
		<view v-if="showBindTip" class="bind-tip">
			<view class="bind-tip-card">
				<view class="bind-tip-title">未绑定子女</view>
				<view class="bind-tip-text">请让子女在“子女守护端”发起绑定申请，然后在此输入 6 位验证码确认。</view>
				<view class="bind-tip-row">
					<input v-model="bindCode" class="bind-input" placeholder="输入 6 位验证码" maxlength="6" />
					<button class="btn-elder small-btn" @click="approveByCode">确认</button>
				</view>
				<view class="bind-tip-actions">
					<text class="bind-link" @click="refreshBindState">刷新</text>
				</view>
			</view>
		</view>

		<!-- 头部信息 -->
		<view class="header card-elder">
			<view class="user-info">
				<view class="text-title">下午好，{{ user.nickname || '长辈' }}</view>
				<view v-if="user.is_vip" class="vip-badge">💎 暖阳 VIP 会员</view>
				<view v-else class="vip-badge-none">会员由子女开通</view>
			</view>
			<view class="text-content">今天是 2026年4月1日 星期三</view>
			<view class="text-helper">当前天气：晴，22℃</view>
		</view>

		<!-- 核心功能区 (大图标网格) -->
		<view class="grid-container">
			<view class="grid-item card-elder emergency-btn" @click="handleEmergency">
				<view class="icon-wrap"><text class="grid-emoji">🚨</text></view>
				<view class="text-title">紧急呼救</view>
				<view class="text-helper">自动拨打紧急联系人</view>
			</view>
			
			<view class="grid-item card-elder" @click="navigateTo('/pages/reminders/reminders')">
				<view class="icon-wrap"><text class="grid-emoji">🔔</text></view>
				<view class="text-title">提醒事项</view>
				<view class="text-helper">用药、日常提醒</view>
			</view>

			<view class="grid-item card-elder" @click="navigateTo('/pages/health/health')">
				<view class="icon-wrap"><text class="grid-emoji">💊</text></view>
				<view class="text-title">服药记录</view>
				<view class="text-helper">一键标记已服药</view>
			</view>

			<view class="grid-item card-elder" @click="navigateTo('/pages/life/life')">
				<view class="icon-wrap"><text class="grid-emoji">☀️</text></view>
				<view class="text-title">生活查询</view>
				<view class="text-helper">天气、常用电话</view>
			</view>

			<view class="grid-item card-elder" @click="navigateTo('/pages/ai/ai')">
				<view class="icon-wrap"><text class="grid-emoji">🤖</text></view>
				<view class="text-title">暖阳陪聊</view>
				<view class="text-helper">AI 语音智能对话</view>
			</view>
			
			<view class="grid-item card-elder" @click="handleLogout">
				<view class="icon-wrap"><text class="grid-emoji">🚪</text></view>
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
const showBindTip = ref(false);
const bindCode = ref('');

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
	if (user.value.role === 'child') {
		uni.reLaunch({ url: '/pages/child/index/index' });
		return;
	}
	speak(`欢迎使用暖阳陪伴助手，祝您心情愉快`);
	refreshBindState();
});

const refreshBindState = async () => {
	try {
		const children = await request('/relation/my_children');
		showBindTip.value = Array.isArray(children.data) ? children.data.length === 0 : true;
	} catch (e) {
		showBindTip.value = true;
	}
};

const approveByCode = async () => {
	const code = String(bindCode.value || '').trim();
	if (code.length !== 6) {
		speak('请输入 6 位验证码');
		return;
	}
	try {
		await request('/relation/approve_by_code', 'POST', { verify_code: code });
		speak('绑定成功');
		uni.showToast({ title: '绑定成功', icon: 'success' });
		bindCode.value = '';
		refreshBindState();
	} catch (err) {
		uni.showToast({ title: err.message || '绑定失败', icon: 'none' });
	}
};

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

							try {
								const profile = await request('/user/profile');
								const phone = profile.data.emergency_phone;
								if (phone) {
									uni.makePhoneCall({ phoneNumber: String(phone).split(',')[0] });
								} else {
									uni.showToast({ title: '未设置紧急联系人，请让子女先设置', icon: 'none' });
								}
							} catch (e) {
								uni.showToast({ title: '无法获取紧急联系人', icon: 'none' });
							}
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

.bind-tip {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	padding: 20rpx;
	padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
	z-index: 50;
}

.bind-tip-card {
	background-color: #FFFFFF;
	border-radius: 20rpx;
	padding: 24rpx;
	box-shadow: 0 6rpx 30rpx rgba(0, 0, 0, 0.12);
	border: 2rpx solid #EBF3FF;
}

.bind-tip-title {
	font-size: 34rpx;
	font-weight: bold;
	color: #333;
	margin-bottom: 10rpx;
}

.bind-tip-text {
	font-size: 28rpx;
	color: #666;
	line-height: 1.6;
}

.bind-tip-row {
	display: flex;
	gap: 16rpx;
	margin-top: 16rpx;
	align-items: center;
}

.bind-input {
	flex: 1;
	height: 90rpx;
	border-radius: 16rpx;
	border: 2rpx solid #ddd;
	padding: 0 20rpx;
	font-size: 32rpx;
	background-color: #fff;
}

.bind-tip-actions {
	margin-top: 10rpx;
	text-align: right;
}

.bind-link {
	font-size: 26rpx;
	color: $main-color;
	text-decoration: underline;
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
	padding-bottom: 240rpx;
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

	.grid-emoji {
		font-size: 60rpx;
		line-height: 1;
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
