<template>
	<view class="container">
		<view class="header">
			<text class="title">账号注册</text>
			<text class="subtitle">创建子女守护端账号</text>
		</view>

		<view class="form-section">
			<input v-model="form.username" placeholder="请输入用户名/手机号" class="input-field" />
			<input v-model="form.password" type="password" placeholder="请输入密码" class="input-field" />
			<input v-model="form.nickname" placeholder="请输入您的称呼 (如: 小明)" class="input-field" />
			<input v-model="form.phone" placeholder="请输入您的手机号" class="input-field" />
			
			<view class="role-selection">
				<text class="role-text">账号类型：</text>
				<view class="role-btns">
					<view :class="['role-btn', form.role === 'child' ? 'active' : '']" @click="form.role = 'child'">我是子女</view>
					<view :class="['role-btn', form.role === 'elder' ? 'active' : '']" @click="form.role = 'elder'">我是老人</view>
				</view>
			</view>

			<button class="register-btn" @click="handleRegister">立即注册</button>
			<view class="footer-links">
				<text class="link" @click="goToLogin">已有账号？去登录</text>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref } from 'vue';
import { request } from '../../utils/request';

const form = ref({
	username: '',
	password: '',
	nickname: '',
	phone: '',
	role: 'child'
});

const handleRegister = async () => {
	if (!form.value.username || !form.value.password || !form.value.nickname) {
		uni.showToast({ title: '请填写完整信息', icon: 'none' });
		return;
	}

	try {
		await request('/user/register', 'POST', form.value);
		uni.showToast({ title: '注册成功' });
		setTimeout(() => {
			uni.navigateTo({ url: '/pages/login/login' });
		}, 1500);
	} catch (err) {
		uni.showToast({ title: err.message || '注册失败', icon: 'none' });
	}
};

const goToLogin = () => {
	uni.navigateTo({ url: '/pages/login/login' });
};
</script>

<style scoped>
.container {
	padding: 40px 20px;
	background-color: #ffffff;
	min-height: 100vh;
}

.header {
	margin-bottom: 40px;
}

.title {
	font-size: 28px;
	font-weight: bold;
	color: #333;
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

.role-selection {
	margin: 20px 0;
}

.role-text {
	font-size: 16px;
	color: #666;
}

.role-btns {
	display: flex;
	gap: 15px;
	margin-top: 10px;
}

.role-btn {
	flex: 1;
	height: 44px;
	line-height: 44px;
	text-align: center;
	border: 1px solid #4A90E2;
	color: #4A90E2;
	border-radius: 8px;
	font-size: 14px;
	
	&.active {
		background-color: #4A90E2;
		color: white;
	}
}

.register-btn {
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
