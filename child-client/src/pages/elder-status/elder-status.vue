<template>
	<view class="container">
		<view class="header">
			<text class="title">{{ elderName }} 的状态</text>
		</view>

		<!-- 概览 -->
		<view class="card section">
			<view class="section-title">概览</view>
			<view class="health-grid">
				<view class="health-item">
					<text class="label">服药状态</text>
					<text :class="['value', status.health?.medication_taken ? 'success' : 'warning']">
						{{ status.health?.medication_taken ? '已服药' : '未服药' }}
					</text>
				</view>
				<view class="health-item">
					<text class="label">待办提醒</text>
					<text class="value">{{ status.reminders?.length || 0 }}</text>
				</view>
			</view>
			<view class="action-grid">
				<button class="action-btn" @click="goToLogs">活动记录</button>
				<button class="action-btn primary" @click="goToReminderManage">提醒管理</button>
				<button class="action-btn" @click="goToEmergencySettings">紧急联系人</button>
				<button class="action-btn vip" @click="goToVipPurchase">开通会员</button>
			</view>
		</view>

		<!-- 待办提醒（只展示概览） -->
		<view class="card section">
			<view class="section-title">待办提醒</view>
			<view v-if="status.reminders?.length === 0" class="empty">暂无待办</view>
			<view v-for="item in status.reminders" :key="item.id" class="reminder-item">
				<view>
					<text class="rem-title">{{ item.title }}</text>
					<text class="rem-time">{{ item.remind_time }}</text>
				</view>
				<text class="rem-status">待完成</text>
			</view>
			<button class="add-rem-btn" @click="goToReminderManage">进入提醒管理</button>
		</view>
	</view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { request } from '../../utils/request';

const elderId = ref('');
const elderName = ref('');
const status = ref({});

onLoad((options) => {
	elderId.value = options.id;
	elderName.value = options.name;
});

const fetchStatus = async () => {
	try {
		const res = await request(`/relation/elder_status/${elderId.value}`);
		status.value = res.data;
	} catch (err) {
		console.error('获取状态失败', err);
	}
};
const goToReminderManage = () => {
	uni.navigateTo({
		url: `/pages/reminder-manage/reminder-manage?id=${elderId.value}&name=${elderName.value}`
	});
};

const goToEmergencySettings = () => {
	uni.navigateTo({
		url: `/pages/emergency-settings/emergency-settings?id=${elderId.value}&name=${elderName.value}`
	});
};

const goToVipPurchase = () => {
	uni.navigateTo({
		url: `/pages/vip-purchase/vip-purchase?id=${elderId.value}&name=${elderName.value}`
	});
};

onMounted(() => {
	fetchStatus();
});
</script>

<style scoped>
.container {
	padding: 20px;
	background-color: #f5f7fa;
	min-height: 100vh;
}

.card {
	background-color: white;
	border-radius: 12px;
	padding: 20px;
	margin-bottom: 20px;
	box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.section-title {
	font-size: 18px;
	font-weight: bold;
	margin-bottom: 15px;
	color: #333;
}

.health-grid {
	display: flex;
	justify-content: space-around;
}

.health-item {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.label {
	font-size: 14px;
	color: #999;
	margin-bottom: 5px;
}

.value {
	font-size: 24px;
	font-weight: bold;
	color: #333;
}

.value.success { color: #2ECC71; }
.value.warning { color: #E74C3C; }

.action-grid {
	margin-top: 20px;
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 12px;
}

.action-btn {
	height: 44px;
	line-height: 44px;
	border-radius: 10px;
	font-size: 14px;
	background-color: #f5f7fa;
	color: #333;
	border: 1px solid #ddd;
}

.action-btn.primary {
	background-color: #EBF3FF;
	color: #4A90E2;
	border-color: #BFD7FF;
}

.action-btn.vip {
	background-color: #FFF5E6;
	color: #F5A623;
	border-color: #FFD9A3;
}

.reminder-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 12px 0;
	border-bottom: 1px solid #eee;
}

.rem-title {
	font-size: 16px;
	display: block;
}

.rem-time {
	font-size: 12px;
	color: #999;
}

.rem-status {
	font-size: 12px;
	color: #F5A623;
}

.add-rem-btn {
	margin-top: 15px;
	background-color: #EBF3FF;
	color: #4A90E2;
	border: none;
	font-size: 14px;
}
</style>
