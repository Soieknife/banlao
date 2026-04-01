<template>
	<view class="container">
		<view class="header">
			<text class="title">活动日志</text>
			<text class="subtitle">{{ elderName }} 的最近动态</text>
		</view>

		<view class="log-list">
			<view v-if="logs.length === 0" class="empty">暂无活动记录</view>
			<view v-for="log in logs" :key="log.id" class="log-item">
				<view class="log-icon" :class="log.action_type">
					<text v-if="log.action_type === 'medicine_taken'">💊</text>
					<text v-else-if="log.action_type === 'emergency_call'">🚨</text>
					<text v-else-if="log.action_type === 'reminder_pushed'">🔔</text>
					<text v-else>📱</text>
				</view>
				<view class="log-content">
					<text class="log-desc">{{ log.action_desc }}</text>
					<text class="log-time">{{ formatTime(log.created_at) }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { request } from '../../utils/request';

const elderId = ref('');
const elderName = ref('');
const logs = ref([]);

onLoad((options) => {
	elderId.value = options.id;
	elderName.value = options.name;
});

const fetchLogs = async () => {
	try {
		const res = await request(`/relation/elder_logs/${elderId.value}`);
		logs.value = res.data;
	} catch (err) {
		console.error('获取日志失败', err);
	}
};

const formatTime = (timeStr) => {
	const date = new Date(timeStr);
	return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
};

onMounted(() => {
	fetchLogs();
});
</script>

<style scoped>
.container {
	padding: 20px;
	background-color: #f5f7fa;
	min-height: 100vh;
}

.header {
	margin-bottom: 25px;
}

.title {
	font-size: 24px;
	font-weight: bold;
	color: #333;
}

.subtitle {
	font-size: 14px;
	color: #999;
	margin-top: 5px;
	display: block;
}

.log-list {
	background-color: white;
	border-radius: 12px;
	padding: 15px;
}

.log-item {
	display: flex;
	padding: 15px 0;
	border-bottom: 1px solid #f0f0f0;
	
	&:last-child {
		border-bottom: none;
	}
}

.log-icon {
	width: 40px;
	height: 40px;
	border-radius: 20px;
	background-color: #f0f4f8;
	display: flex;
	justify-content: center;
	align-items: center;
	font-size: 20px;
	margin-right: 15px;
	flex-shrink: 0;
}

.log-icon.emergency_call {
	background-color: #FFF5F5;
}

.log-content {
	display: flex;
	flex-direction: column;
	justify-content: center;
}

.log-desc {
	font-size: 16px;
	color: #333;
	margin-bottom: 4px;
}

.log-time {
	font-size: 12px;
	color: #999;
}

.empty {
	text-align: center;
	padding: 40px 0;
	color: #999;
}
</style>
