<template>
	<view class="page-container login-page">
		<view class="logo-area">
			<image src="/static/logo.png" class="logo"></image>
			<text class="text-title">暖阳陪伴</text>
			<text class="text-helper">让关爱随时随地</text>
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
		uni.reLaunch({ url: '/pages/index/index' });
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
