<template>
	<view class="container">
		<view class="header">
			<text class="title">{{ elderName }} 的状态</text>
		</view>

		<!-- 健康概览 -->
		<view class="card section">
			<view class="section-title">健康概览</view>
			<view class="health-grid">
				<view class="health-item">
					<text class="label">今日步数</text>
					<text class="value">{{ status.health?.steps || 0 }}</text>
				</view>
				<view class="health-item">
					<text class="label">服药状态</text>
					<text :class="['value', status.health?.medication_taken ? 'success' : 'warning']">
						{{ status.health?.medication_taken ? '已服药' : '未服药' }}
					</text>
				</view>
			</view>
			<button class="logs-btn" @click="goToLogs">查看详细活动记录</button>
		</view>

		<!-- 提醒管理 -->
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
			<button class="add-rem-btn" @click="showAddModal = true">+ 为 TA 设置提醒</button>
		</view>

		<!-- 远程设置弹窗 -->
		<view v-if="showAddModal" class="modal-overlay">
			<view class="modal">
				<view class="modal-header">新增提醒</view>
				<input v-model="newReminder.title" placeholder="提醒标题 (如: 吃降压药)" class="modal-input" />
				<input v-model="newReminder.content" placeholder="详细内容" class="modal-input" />
				<input v-model="newReminder.remind_time" placeholder="时间 (如: 08:30)" class="modal-input" />
				<view class="modal-footer">
					<button @click="showAddModal = false">取消</button>
					<button class="confirm" @click="addReminder">保存</button>
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
const status = ref({});
const showAddModal = ref(false);
const newReminder = ref({ title: '', content: '', remind_time: '', type: 'daily' });

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

const goToLogs = () => {
	uni.navigateTo({
		url: `/pages/activity-logs/activity-logs?id=${elderId.value}&name=${elderName.value}`
	});
};

const addReminder = async () => {
	if (!newReminder.value.title || !newReminder.value.remind_time) return;
	try {
		// 注意：这里的后端接口需要支持为指定用户添加提醒，或者在后端根据权限判断
		// 简化版直接调用之前的 add 接口，但需要后端支持 user_id 参数
		await request('/reminder/add', 'POST', {
			...newReminder.value,
			user_id: elderId.value // 后端需处理此参数
		});
		uni.showToast({ title: '设置成功' });
		showAddModal.value = false;
		newReminder.value = { title: '', content: '', remind_time: '', type: 'daily' };
		fetchStatus();
	} catch (err) {
		uni.showToast({ title: '设置失败', icon: 'none' });
	}
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

.logs-btn {
	margin-top: 20px;
	background-color: #f5f7fa;
	color: #666;
	font-size: 14px;
	border: 1px solid #ddd;
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

.modal-overlay {
	position: fixed;
	top: 0; left: 0; right: 0; bottom: 0;
	background-color: rgba(0,0,0,0.5);
	display: flex; justify-content: center; align-items: center;
	z-index: 100;
}

.modal {
	background-color: white; width: 85%; border-radius: 12px; padding: 20px;
}

.modal-header { font-size: 18px; font-weight: bold; margin-bottom: 15px; text-align: center; }

.modal-input {
	border: 1px solid #ddd; padding: 10px; border-radius: 6px; margin-bottom: 15px; width: 100%; box-sizing: border-box;
}

.modal-footer { display: flex; gap: 10px; }
.modal-footer button { flex: 1; }
.confirm { background-color: #4A90E2; color: white; }
</style>
