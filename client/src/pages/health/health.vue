<template>
	<view class="page-container">
		<!-- 步数统计卡片 -->
		<view class="card-elder steps-card">
			<view class="text-title">今日步数</view>
			<view class="steps-main">
				<text class="steps-num">{{ healthRecord.steps || 0 }}</text>
				<text class="steps-unit">步</text>
			</view>
			<view class="steps-progress">
				<progress :percent="progress" stroke-width="20" activeColor="#4A90E2" backgroundColor="#EBF3FF" />
				<view class="text-helper">目标：6000 步</view>
			</view>
		</view>

		<!-- 服药记录卡片 -->
		<view class="card-elder medicine-card">
			<view class="text-title">今日服药</view>
			<view v-if="healthRecord.medication_taken === 0" class="medicine-status">
				<text class="text-content">今天还没记录服药哦</text>
				<button class="btn-elder" @click="takeMedicine">我已服药</button>
			</view>
			<view v-else class="medicine-status success">
				<text class="text-content">今日已服药，保持健康！</text>
				<view class="check-icon">✓</view>
			</view>
		</view>

		<!-- 子女同步提示 -->
		<view class="card-elder info-card">
			<view class="text-content">💡 您的步数和服药记录会自动同步给您的子女</view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { request } from '../../utils/request';
import { speak } from '../../utils/voice';

const healthRecord = ref({});
const targetSteps = 6000;

/**
 * 获取今日记录
 */
const fetchRecord = async () => {
	try {
		const res = await request('/health_record/today');
		healthRecord.value = res.data;
		
		if (healthRecord.value.steps < 3000) {
			speak('您今天走得有点少，有空可以出去散散步。');
		} else if (healthRecord.value.steps >= targetSteps) {
			speak('太棒了，您已达到今日步数目标！');
		}
	} catch (err) {
		console.error('获取记录失败', err);
	}
};

/**
 * 进度条百分比
 */
const progress = computed(() => {
	const steps = healthRecord.value.steps || 0;
	return Math.min(Math.round((steps / targetSteps) * 100), 100);
});

/**
 * 标记已服药
 */
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

onMounted(() => {
	fetchRecord();
	// 实际开发可调用 uni.getWeRunData 获取真实步数
});
</script>

<style lang="scss" scoped>
.steps-card {
	text-align: center;
	padding: 60rpx 40rpx;
}

.steps-main {
	margin: 30rpx 0;
}

.steps-num {
	font-size: 120rpx;
	font-weight: bold;
	color: $main-color;
}

.steps-unit {
	font-size: 36rpx;
	color: #666666;
	margin-left: 10rpx;
}

.steps-progress {
	margin-top: 40rpx;
	.text-helper {
		margin-top: 20rpx;
		display: block;
	}
}

.medicine-card {
	padding: 50rpx 40rpx;
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
