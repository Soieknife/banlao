<template>
	<view class="page-container">
		<view class="card-elder header-card">
			<view class="text-title">活动日志</view>
			<view class="text-helper">{{ elderName }} 的最近动态</view>
		</view>

		<view v-if="loading" class="card-elder">
			<view class="text-content">加载中...</view>
		</view>

		<view v-else class="card-elder">
			<view v-if="logs.length === 0" class="text-helper empty">暂无活动记录</view>
			<view v-for="log in logs" :key="log.id" class="log-item">
				<view class="icon">
					<text v-if="log.action_type === 'medicine_taken'">💊</text>
					<text v-else-if="log.action_type === 'emergency_call'">🚨</text>
					<text v-else-if="log.action_type === 'reminder_pushed'">🔔</text>
					<text v-else>📱</text>
				</view>
				<view class="content">
					<view class="text-content">{{ log.action_desc }}</view>
					<view class="text-helper">{{ formatTime(log.created_at) }}</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { request } from '../../../utils/request';

const elderId = ref('');
const elderName = ref('');
const logs = ref([]);
const loading = ref(false);

onLoad((opt) => {
	elderId.value = opt.id;
	elderName.value = decodeURIComponent(opt.name || '');
});

const fetchLogs = async () => {
	loading.value = true;
	try {
		const res = await request(`/relation/elder_logs/${elderId.value}`);
		logs.value = res.data || [];
	} catch (err) {
		uni.showToast({ title: err.message || '加载失败', icon: 'none' });
	} finally {
		loading.value = false;
	}
};

const formatTime = (timeStr) => {
	if (!timeStr) return '';
	const date = new Date(timeStr);
	return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

onMounted(() => {
	fetchLogs();
});
</script>

<style lang="scss" scoped>
.header-card {
	border-left: 10rpx solid $main-color;
}

.log-item {
	display: flex;
	gap: 20rpx;
	padding: 24rpx 0;
	border-bottom: 1rpx solid #eee;
}

.icon {
	width: 88rpx;
	height: 88rpx;
	border-radius: 44rpx;
	background-color: #F5F7FA;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 40rpx;
	flex-shrink: 0;
}

.content {
	flex: 1;
}

.empty {
	text-align: center;
	padding: 40rpx 0;
}
</style>

