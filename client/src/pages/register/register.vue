<template>
	<view class="page-container register-page">
		<view class="text-title">账号注册</view>
		<view class="text-helper">创建您的暖阳陪伴账号</view>

		<view class="form-area card-elder">
			<input v-model="form.username" placeholder="设置用户名" class="input-elder" />
			<input v-model="form.password" type="password" placeholder="设置密码" class="input-elder" />
			<input v-model="form.nickname" placeholder="您的称呼 (如: 张爷爷)" class="input-elder" />
			<input v-model="form.phone" placeholder="您的手机号" class="input-elder" />
			
			<view class="role-selection">
				<text class="text-content">账号类型：</text>
				<view class="role-btns">
					<view :class="['role-btn', form.role === 'elder' ? 'active' : '']" @click="form.role = 'elder'">我是老人</view>
					<view :class="['role-btn', form.role === 'child' ? 'active' : '']" @click="form.role = 'child'">我是子女</view>
				</view>
			</view>

			<button class="btn-elder register-btn" @click="handleRegister">立即注册</button>
			<view class="action-links">
				<text class="text-helper" @click="goToLogin">已有账号？去登录</text>
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
	password: '',
	nickname: '',
	phone: '',
	role: 'elder'
});

const handleRegister = async () => {
	if (!form.value.username || !form.value.password || !form.value.nickname) {
		speak('请填写完整注册信息');
		return;
	}

	try {
		await request('/user/register', 'POST', form.value);
		speak('注册成功，请登录');
		uni.showToast({ title: '注册成功' });
		setTimeout(() => {
			uni.navigateTo({ url: '/pages/login/login' });
		}, 1500);
	} catch (err) {
		speak(err.message || '注册失败');
		uni.showToast({ title: err.message || '注册失败', icon: 'none' });
	}
};

const goToLogin = () => {
	uni.navigateTo({ url: '/pages/login/login' });
};
</script>

<style lang="scss" scoped>
.register-page {
	padding-top: 60rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.form-area {
	width: 100%;
	padding: 40rpx;
	margin-top: 40rpx;
}

.input-elder {
	height: 100rpx;
	border: 2rpx solid #ddd;
	border-radius: 16rpx;
	margin-bottom: 30rpx;
	padding: 0 30rpx;
	font-size: 36rpx;
}

.role-selection {
	margin: 40rpx 0;
}

.role-btns {
	display: flex;
	gap: 20rpx;
	margin-top: 20rpx;
}

.role-btn {
	flex: 1;
	height: 80rpx;
	line-height: 80rpx;
	text-align: center;
	border: 2rpx solid $main-color;
	color: $main-color;
	border-radius: 12rpx;
	font-size: 32rpx;
	
	&.active {
		background-color: $main-color;
		color: #FFFFFF;
	}
}

.register-btn {
	width: 100%;
	margin-top: 20rpx;
}

.action-links {
	margin-top: 40rpx;
	text-align: center;
}
</style>
