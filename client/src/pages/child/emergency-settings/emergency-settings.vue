<template>
	<view class="page-container">
		<view class="card-elder header-card">
			<view class="text-title">紧急联系人</view>
			<view class="text-helper">为 {{ elderName }} 配置紧急呼救拨打电话</view>
		</view>

		<view class="card-elder">
			<view class="field">
				<view class="label">联系人称呼</view>
				<input v-model="form.emergency_contact" class="input" placeholder="如：小明（儿子）" />
			</view>
			<view class="field">
				<view class="label">紧急电话</view>
				<input v-model="form.emergency_phone" class="input" placeholder="如：13800000000（多个用英文逗号分隔）" />
			</view>
			<button class="btn-elder save-btn" @click="save">保存</button>
		</view>

		<view class="card-elder tip-card">
			<view class="text-title">提示</view>
			<view class="text-content">老人端点击“紧急呼救”后，会自动拨打这里填写的电话，并同步定位与求助记录。</view>
		</view>
	</view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { request } from '../../../utils/request';

const elderId = ref('');
const elderName = ref('');

const form = ref({
	emergency_contact: '',
	emergency_phone: ''
});

onLoad((opt) => {
	elderId.value = opt.id;
	elderName.value = decodeURIComponent(opt.name || '');
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

onMounted(() => {
	fetchProfile();
});
</script>

<style lang="scss" scoped>
.header-card {
	border-left: 10rpx solid $main-color;
}

.field {
	margin-bottom: 24rpx;
}

.label {
	font-size: 28rpx;
	color: #666;
	margin-bottom: 10rpx;
}

.input {
	height: 90rpx;
	border-radius: 16rpx;
	background-color: #F5F7FA;
	padding: 0 20rpx;
	font-size: 32rpx;
}

.save-btn {
	width: 100%;
}

.tip-card {
	background-color: #EBF3FF;
	border: none;
	.text-title, .text-content {
		color: $main-color;
	}
}
</style>

