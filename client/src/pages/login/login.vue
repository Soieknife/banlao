<template>
	<view class="page-container login-page">
		<view class="logo-area">
			<image src="/static/logo.png" class="logo"></image>
			<text class="text-title">暖阳陪伴</text>
			<text class="text-helper">老人陪伴与子女守护共用一个应用</text>
		</view>

		<view class="form-area card-elder">
			<input v-model="form.username" placeholder="请输入用户名" class="input-elder" />
			<input v-model="form.password" type="password" placeholder="请输入密码" class="input-elder" />
			
			<button class="btn-elder login-btn" @click="handleLogin">立即登录</button>
			<view class="action-links">
				<text class="text-helper" @click="goToRegister">没有账号？去注册</text>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref } from 'vue';
import { request } from '../../utils/request';
import { speak } from '../../utils/voice';
import config from '../../config';

const form = ref({
	username: '',
	password: ''
});

const handleLogin = async () => {
	if (!form.value.username || !form.value.password) {
		speak('请输入用户名和密码');
		return;
	}

	try {
		const res = await request('/user/login', 'POST', form.value);
		uni.setStorageSync('token', res.data.token);
		uni.setStorageSync('user', JSON.stringify(res.data.user));
		
		speak(`欢迎回来，${res.data.user.nickname || res.data.user.username}`);
		
		// 检查是否需要绑定
		if (res.data.user.role === 'child') {
			try {
				const eldersRes = await request('/relation/elders');
				const hasElders = Array.isArray(eldersRes.data) && eldersRes.data.length > 0;
				if (!hasElders) {
					uni.showModal({
						title: '未绑定长辈',
						content: '您还没有绑定长辈，绑定后可以查看长辈状态并提供守护。',
						confirmText: '去绑定',
						cancelText: '稍后',
						success: (modalRes) => {
							if (modalRes.confirm) {
								uni.reLaunch({ url: '/pages/index/index' });
							} else {
								uni.reLaunch({ url: '/pages/index/index' });
							}
						}
					});
				} else {
					uni.reLaunch({ url: '/pages/index/index' });
				}
			} catch (err) {
				// 如果检查失败，仍然跳转到首页
				uni.reLaunch({ url: '/pages/index/index' });
			}
		} else if (res.data.user.role === 'elder') {
			try {
				const [childrenRes, pendingRes] = await Promise.all([
					request('/relation/my_children'),
					request('/relation/pending_requests')
				]);
				const hasChildren = Array.isArray(childrenRes.data) && childrenRes.data.length > 0;
				const pendingCount = Array.isArray(pendingRes.data) ? pendingRes.data.length : 0;
				if (pendingCount > 0) {
					uni.showModal({
						title: '待处理绑定申请',
						content: `您有 ${pendingCount} 条家人绑定申请待确认，请进入首页查看。`,
						confirmText: '去查看',
						cancelText: '稍后',
						success: () => {
							uni.reLaunch({ url: '/pages/index/index' });
						}
					});
				} else if (!hasChildren) {
					uni.showModal({
						title: '未绑定子女',
						content: '您还没有绑定子女，绑定后子女可以远程守护您的健康。',
						confirmText: '去绑定',
						cancelText: '稍后',
						success: (modalRes) => {
							if (modalRes.confirm) {
								uni.reLaunch({ url: '/pages/index/index' });
							} else {
								uni.reLaunch({ url: '/pages/index/index' });
							}
						}
					});
				} else {
					uni.reLaunch({ url: '/pages/index/index' });
				}
			} catch (err) {
				// 如果检查失败，仍然跳转到首页
				uni.reLaunch({ url: '/pages/index/index' });
			}
		} else if (res.data.user.role === 'admin') {
				// 管理员直接跳转到前端管理后台
				uni.reLaunch({ url: '/pages/admin/index' });
		} else {
			uni.reLaunch({ url: '/pages/index/index' });
		}
	} catch (err) {
		speak(err.message || '登录失败');
		uni.showToast({ title: err.message || '登录失败', icon: 'none' });
	}
};

const goToRegister = () => {
	uni.navigateTo({ url: '/pages/register/register' });
};
</script>

<style lang="scss" scoped>
.login-page {
	padding-top: 100rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.logo-area {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-bottom: 80rpx;
	
	.logo {
		width: 160rpx;
		height: 160rpx;
		margin-bottom: 20rpx;
	}
}

.form-area {
	width: 100%;
	padding: 60rpx 40rpx;
}

.input-elder {
	height: 100rpx;
	border: 2rpx solid #ddd;
	border-radius: 16rpx;
	margin-bottom: 40rpx;
	padding: 0 30rpx;
	font-size: 36rpx;
}

.login-btn {
	width: 100%;
	margin-top: 20rpx;
}

.action-links {
	margin-top: 40rpx;
	text-align: center;
}
</style>
