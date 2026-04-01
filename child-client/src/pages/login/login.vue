<template>
	<view class="container">
		<view class="logo-section">
			<text class="logo-text">暖阳陪伴</text>
			<text class="subtitle">子女守护端</text>
		</view>

		<view class="form-section">
			<input v-model="form.username" placeholder="请输入手机号/用户名" class="input-field" />
			<input v-model="form.password" type="password" placeholder="请输入密码" class="input-field" />
			
			<button class="login-btn" @click="handleLogin">登录</button>
			<view class="footer-links">
				<text class="link" @click="goToRegister">新用户注册</text>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref } from 'vue';
import { request } from '../../utils/request';

const form = ref({
	username: '',
	password: ''
});

const handleLogin = async () => {
	if (!form.value.username || !form.value.password) return;
	try {
		const res = await request('/user/login', 'POST', form.value);
		uni.setStorageSync('token', res.data.token);
		uni.setStorageSync('user', JSON.stringify(res.data.user));
		uni.reLaunch({ url: '/pages/index/index' });
	} catch (err) {
		uni.showToast({ title: err.message || '登录失败', icon: 'none' });
	}
};

const goToRegister = () => {
	uni.navigateTo({ url: '/pages/register/register' });
};
</script>

<style scoped>
.container {
	padding: 40px 20px;
	background-color: #ffffff;
	min-height: 100vh;
}

.logo-section {
	text-align: center;
	margin-bottom: 60px;
}

.logo-text {
	font-size: 32px;
	font-weight: bold;
	color: #4A90E2;
	display: block;
}

.subtitle {
	font-size: 16px;
	color: #999;
	margin-top: 10px;
}

.input-field {
	background-color: #f5f7fa;
	height: 50px;
	border-radius: 8px;
	margin-bottom: 20px;
	padding: 0 15px;
	font-size: 16px;
}

.login-btn {
	background-color: #4A90E2;
	color: white;
	height: 50px;
	border-radius: 8px;
	font-size: 18px;
	font-weight: bold;
	margin-top: 20px;
}

.footer-links {
	margin-top: 30px;
	text-align: center;
}

.link {
	color: #4A90E2;
	font-size: 14px;
}
</style>
