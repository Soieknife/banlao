<template>
	<view class="container">
		<view class="header">
			<text class="title">紧急联系人</text>
			<text class="subtitle">{{ elderName }} 的紧急呼救设置</text>
		</view>

		<view class="card">
			<view class="field">
				<text class="label">联系人称呼</text>
				<input v-model="form.emergency_contact" class="input" placeholder="如：小明（儿子）" />
			</view>
			<view class="field">
				<text class="label">紧急电话</text>
				<input v-model="form.emergency_phone" class="input" placeholder="如：13800000000（多个用英文逗号分隔）" />
			</view>
			<button class="save-btn" @click="save">保存</button>
		</view>

		<view class="card tip">
			<text class="tip-title">提示</text>
			<text class="tip-text">老人端点击“紧急呼救”后，会自动拨打这里填写的电话，并同步定位与求助记录。</text>
		</view>
	</view>
</template>

<script setup>
import { ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { request } from '../../utils/request';

const elderId = ref('');
const elderName = ref('');

const form = ref({
	emergency_contact: '',
	emergency_phone: ''
});

onLoad((opt) => {
	elderId.value = opt.id;
	elderName.value = opt.name;
});

const fetchProfile = async () => {
	try {
		const res = await request(`/relation/elder_profile/${elderId.value}`);
		form.value.emergency_contact = res.data.emergency_contact || '';
		form.value.emergency_phone = res.data.emergency_phone || '';
	} catch (err) {
		uni.showToast({ title: err.message || '加载失败', icon: 'none' });
	}
};

onShow(() => {
	fetchProfile();
});

const save = async () => {
	if (!form.value.emergency_phone) {
		uni.showToast({ title: '请填写紧急电话', icon: 'none' });
		return;
	}
	try {
		await request('/relation/update_emergency', 'POST', {
			elder_id: elderId.value,
			emergency_contact: form.value.emergency_contact,
			emergency_phone: form.value.emergency_phone
		});
		uni.showToast({ title: '保存成功', icon: 'success' });
	} catch (err) {
		uni.showToast({ title: err.message || '保存失败', icon: 'none' });
	}
};
</script>

<style scoped>
.container {
	padding: 20px;
	background-color: #f5f7fa;
	min-height: 100vh;
}

.header {
	margin-bottom: 16px;
}

.title {
	font-size: 22px;
	font-weight: bold;
	color: #333;
}

.subtitle {
	display: block;
	font-size: 14px;
	color: #999;
	margin-top: 4px;
}

.card {
	background: #fff;
	border-radius: 12px;
	padding: 16px;
	margin-bottom: 12px;
	box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.field {
	margin-bottom: 12px;
}

.label {
	display: block;
	font-size: 14px;
	color: #666;
	margin-bottom: 6px;
}

.input {
	height: 44px;
	border-radius: 10px;
	background-color: #f5f7fa;
	padding: 0 12px;
	font-size: 14px;
}

.save-btn {
	height: 44px;
	line-height: 44px;
	border-radius: 10px;
	background-color: #4A90E2;
	color: #fff;
	font-size: 16px;
	font-weight: bold;
	margin-top: 8px;
}

.tip {
	background-color: #EBF3FF;
}

.tip-title {
	display: block;
	font-size: 16px;
	font-weight: bold;
	color: #4A90E2;
	margin-bottom: 8px;
}

.tip-text {
	font-size: 14px;
	color: #4A90E2;
	line-height: 1.6;
}
</style>

