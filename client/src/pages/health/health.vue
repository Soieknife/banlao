<template>
	<view class="page-container">
		<!-- 服药记录卡片 -->
		<view class="card-elder medicine-card">
			<view class="text-title">服药记录</view>
			<view v-if="healthRecord.medication_taken === 0" class="medicine-status">
				<text class="text-content">今天还没记录服药哦</text>
				<button class="btn-elder" @click="takeMedicine">我已服药</button>
			</view>
			<view v-else class="medicine-status success">
				<text class="text-content">今日已服药，保持健康！</text>
				<view class="check-icon">✓</view>
			</view>
		</view>

		<view class="card-elder ocr-card" @click="openOcrTodo">
			<view class="text-title">拍照识别药品说明书</view>
			<view class="text-helper">拍照后自动提取：用法用量 / 功能主治 / 注意事项（开发中）</view>
			<button class="btn-elder ghost-btn">开始拍照</button>
		</view>

		<!-- 子女同步提示 -->
		<view class="card-elder info-card">
			<view class="text-content">💡 服药记录会同步给您的子女，方便他们及时提醒您</view>
		</view>
	</view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { request } from '../../utils/request';
import { speak } from '../../utils/voice';

const healthRecord = ref({});

const fetchRecord = async () => {
	try {
		const res = await request('/health_record/today');
		healthRecord.value = res.data;
	} catch (err) {
		console.error('获取记录失败', err);
	}
};

const takeMedicine = async () => {
	try {
		await request('/health_record/take_medicine', 'POST');
		healthRecord.value.medication_taken = 1;
		speak('已为您记录今日服药，请按医嘱按时吃药。');
		uni.showToast({ title: '记录成功', icon: 'success' });
	} catch (err) {
		console.error('操作失败', err);
	}
};

const openOcrTodo = () => {
	uni.navigateTo({ url: '/pages/medication-ocr/medication-ocr' });
};

onMounted(() => {
	fetchRecord();
	speak('这里可以记录您是否已经按时服药。');
});
</script>

<style lang="scss" scoped>
.medicine-card {
	padding: 50rpx 40rpx;
}

.ocr-card {
	margin-top: 30rpx;
	padding: 50rpx 40rpx;
	background-color: #EBF3FF;
	border: none;
	.text-title, .text-helper {
		color: $main-color;
	}
}

.ghost-btn {
	margin-top: 30rpx;
	background-color: #FFFFFF;
	color: $main-color;
}

.medicine-status {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 30rpx;
	margin-top: 30rpx;

	&.success {
		color: #4CD964;
		.text-content {
			color: #4CD964;
			font-weight: bold;
		}
	}
}

.check-icon {
	font-size: 100rpx;
	color: #4CD964;
	font-weight: bold;
}

.info-card {
	background-color: #EBF3FF;
	border: none;
}
</style>
