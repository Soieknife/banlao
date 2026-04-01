<template>
	<view class="page-container">
		<!-- 提醒分类切换 -->
		<view class="tab-container">
			<view :class="['tab-item', currentTab === 'all' ? 'active' : '']" @click="currentTab = 'all'">全部</view>
			<view :class="['tab-item', currentTab === 'medicine' ? 'active' : '']" @click="currentTab = 'medicine'">用药</view>
			<view :class="['tab-item', currentTab === 'daily' ? 'active' : '']" @click="currentTab = 'daily'">日常</view>
		</view>

		<!-- 提醒列表 -->
		<scroll-view scroll-y class="list-container">
			<view v-if="filteredReminders.length === 0" class="empty-state">
				<text class="text-helper">当前没有提醒事项</text>
			</view>
			<view v-for="item in filteredReminders" :key="item.id" class="card-elder reminder-card">
				<view class="reminder-info">
					<view class="text-title">{{ item.title }}</view>
					<view class="text-content">{{ item.content }}</view>
					<view class="text-helper">提醒时间：{{ item.remind_time }}</view>
				</view>
				<view class="reminder-status">
					<button v-if="item.status === 0" class="btn-elder small-btn" @click="completeReminder(item)">完成</button>
					<text v-else class="text-helper status-done">已完成</text>
				</view>
			</view>
		</scroll-view>

		<!-- 子女远程设置提示 -->
		<view class="card-elder info-card">
			<view class="text-content">💡 您的子女也可以在手机上为您设置提醒哦</view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { request } from '../../utils/request';
import { speak } from '../../utils/voice';

const reminders = ref([]);
const currentTab = ref('all');

/**
 * 获取提醒列表
 */
const fetchReminders = async () => {
	try {
		const res = await request('/reminder/list');
		reminders.value = res.data;
	} catch (err) {
		console.error('获取提醒失败', err);
	}
};

/**
 * 过滤提醒
 */
const filteredReminders = computed(() => {
	if (currentTab.value === 'all') return reminders.value;
	return reminders.value.filter(item => item.type === currentTab.value);
});

/**
 * 完成提醒
 * @param {Object} item - 提醒对象
 */
const completeReminder = async (item) => {
	try {
		await request(`/reminder/complete/${item.id}`, 'POST');
		item.status = 1;
		speak(`您已完成${item.title}，真棒！`);
		uni.showToast({ title: '操作成功', icon: 'success' });
	} catch (err) {
		console.error('操作失败', err);
	}
};

onMounted(() => {
	fetchReminders();
	speak('这里是您的提醒事项，请按时完成哦');
});
</script>

<style lang="scss" scoped>
.tab-container {
	display: flex;
	background-color: #FFFFFF;
	border-radius: 20rpx;
	padding: 10rpx;
	margin-bottom: 30rpx;
}

.tab-item {
	flex: 1;
	text-align: center;
	padding: 20rpx;
	font-size: 34rpx;
	border-radius: 16rpx;
	
	&.active {
		background-color: $main-color;
		color: #FFFFFF;
		font-weight: bold;
	}
}

.list-container {
	height: calc(100vh - 400rpx);
}

.reminder-card {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.reminder-info {
	flex: 1;
	margin-right: 20rpx;
}

.small-btn {
	height: 80rpx;
	line-height: 80rpx;
	padding: 0 30rpx;
	font-size: 32rpx;
}

.status-done {
	color: #4CD964;
	font-weight: bold;
}

.empty-state {
	text-align: center;
	padding: 100rpx 0;
}

.info-card {
	background-color: #EBF3FF;
	border: none;
}
</style>
