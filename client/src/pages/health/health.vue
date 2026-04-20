<template>
	<view class="page-container medication-page">
		<AppSidebar active-path="/pages/health/health" />

		<view class="hero card-elder">
			<view class="row-head">
				<view>
					<view class="text-title">用药管理</view>
					<view class="text-helper">按不同药品分别查看提醒、服用说明和完成状态</view>
				</view>
				<view class="status-pill" :class="healthRecord.medication_taken === 1 ? 'done' : 'pending'">
					{{ healthRecord.medication_taken === 1 ? '今日已记录' : '待记录' }}
				</view>
			</view>

			<view v-if="healthRecord.medication_taken === 0" class="medicine-status">
				<text class="text-content">今天还没完成全部服药记录哦</text>
				<button class="btn-elder" @click="takeMedicine()">全部已服药</button>
			</view>
			<view v-else class="medicine-status success">
				<text class="text-content">今日服药记录已完成，保持健康！</text>
				<view class="check-icon">✓</view>
			</view>
		</view>

		<view class="card-elder">
			<view class="section-head">
				<view>
					<view class="text-title">按药品管理</view>
					<view class="text-helper">每种药单独一张卡片，方便精确管理</view>
				</view>
				<button class="mini-btn" @click="goReminderPage">新增药品提醒</button>
			</view>

			<view v-if="medicineGroups.length === 0" class="empty-block">
				<view class="text-helper">还没有药品提醒，可以去提醒事项里新增。</view>
			</view>

			<view v-else class="drug-group-list">
				<view v-for="group in medicineGroups" :key="group.key" class="drug-card">
					<view class="drug-head">
						<view>
							<view class="drug-name">{{ group.name }}</view>
							<view v-if="group.dosageNote" class="drug-note">服用说明：{{ group.dosageNote }}</view>
							<view class="drug-stats">今日 {{ group.completedCount }}/{{ group.totalCount }} 次已完成</view>
						</view>
						<view class="drug-status" :class="group.completedCount === group.totalCount ? 'done' : 'pending'">
							{{ group.completedCount === group.totalCount ? '已完成' : '待服用' }}
						</view>
					</view>

					<view class="task-list">
						<view v-for="item in group.items" :key="item.id" class="task-row">
							<view class="task-main">
								<view class="task-title">{{ item.title }}</view>
								<view class="task-meta">{{ formatRule(item) }} · {{ Number(item.created_by) === Number(currentUser.id) ? '我创建的' : '家人创建的' }}</view>
							</view>
							<button
								v-if="item.status === 0"
								class="mini-btn primary"
								@click="completeMedicineReminder(item)"
							>
								完成本次
							</button>
							<view v-else class="done-pill">已完成</view>
						</view>
					</view>
				</view>
			</view>
		</view>

		<view class="card-elder ocr-card">
			<view class="text-title">识药助手</view>
			<view class="text-helper">拍照识别说明书，再一键生成对应药品提醒。</view>
			<button class="btn-elder ghost-btn" @click="openOcr">去识别说明书</button>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { request } from '../../utils/request';
import { speak } from '../../utils/voice';
import AppSidebar from '../../components/AppSidebar.vue';

const healthRecord = ref({});
const reminders = ref([]);
const currentUser = ref({});

const medicineGroups = computed(() => {
	const groups = new Map();
	for (const item of reminders.value.filter((row) => row.type === 'medicine')) {
		const key = String(item.medication_name || item.title || '未命名药品').trim();
		const existing = groups.get(key) || {
			key,
			name: key,
			dosageNote: item.dosage_note || '',
			items: []
		};
		if (!existing.dosageNote && item.dosage_note) {
			existing.dosageNote = item.dosage_note;
		}
		existing.items.push(item);
		groups.set(key, existing);
	}

	return Array.from(groups.values()).map((group) => ({
		...group,
		totalCount: group.items.length,
		completedCount: group.items.filter((item) => Number(item.status) === 1).length
	}));
});

const fetchRecord = async () => {
	try {
		const res = await request('/health_record/today');
		healthRecord.value = res.data || {};
	} catch (err) {
		console.error('获取记录失败', err);
	}
};

const fetchReminders = async () => {
	try {
		const res = await request('/reminder/list');
		reminders.value = Array.isArray(res.data) ? res.data : [];
	} catch (err) {
		reminders.value = [];
	}
};

const extractFirstTime = (item) => {
	try {
		const list = JSON.parse(item.repeat_times || '[]');
		return Array.isArray(list) && list.length ? list[0] : '';
	} catch (e) {
		return '';
	}
};

const formatRule = (item) => {
	const time = extractFirstTime(item) || item.remind_time || '';
	if (item.repeat_type === 'daily') return `${time} · 每天`;
	if (item.repeat_type === 'weekly') return `${time} · 每周提醒`;
	return `${time} · 单次提醒`;
};

const takeMedicine = async (options = {}) => {
	try {
		await request('/health_record/take_medicine', 'POST');
		healthRecord.value.medication_taken = 1;
		if (!options.silent) {
			speak('已为您记录今日服药，请按医嘱按时吃药。');
			uni.showToast({ title: '记录成功', icon: 'success' });
		}
	} catch (err) {
		console.error('操作失败', err);
	}
};

const completeMedicineReminder = async (item) => {
	try {
		await request(`/reminder/complete/${item.id}`, 'POST');
		item.status = 1;
		const pendingMedicine = reminders.value.filter((row) => row.type === 'medicine' && Number(row.status) === 0);
		if (!pendingMedicine.length) {
			await takeMedicine({ silent: true });
		}
		speak(`已完成${item.title}。`);
		uni.showToast({ title: '本次服药已记录', icon: 'success' });
	} catch (err) {
		uni.showToast({ title: err.message || '同步失败', icon: 'none' });
	}
};

const openOcr = () => {
	uni.navigateTo({ url: '/pages/medication-ocr/medication-ocr' });
};

const goReminderPage = () => {
	uni.navigateTo({ url: '/pages/reminders/reminders?tab=medicine' });
};

const refreshPage = async () => {
	const storedUser = uni.getStorageSync('user');
	if (storedUser) {
		currentUser.value = JSON.parse(storedUser);
	}
	await Promise.all([fetchRecord(), fetchReminders()]);
};

onMounted(() => {
	refreshPage();
	speak('这里可以按药品分别管理今天的服药任务。');
});

onShow(() => {
	refreshPage();
});
</script>

<style lang="scss" scoped>
.medication-page {
	padding-bottom: 60rpx;
}

.hero {
	background: linear-gradient(135deg, #ffffff 0%, #eef6ff 100%);
	border: 2rpx solid #d9e9ff;
}

.row-head,
.section-head,
.drug-head,
.task-row {
	display: flex;
	justify-content: space-between;
	gap: 20rpx;
}

.row-head,
.section-head,
.drug-head {
	align-items: flex-start;
}

.status-pill,
.done-pill,
.drug-status {
	padding: 10rpx 18rpx;
	border-radius: 999rpx;
	font-size: 24rpx;
	font-weight: bold;
	white-space: nowrap;
}

.status-pill.pending,
.drug-status.pending {
	background-color: #fff1f1;
	color: $warning-color;
}

.status-pill.done,
.done-pill,
.drug-status.done {
	background-color: #e7f9ee;
	color: #2ecc71;
}

.medicine-status {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 30rpx;
	margin-top: 36rpx;
}

.medicine-status.success .text-content {
	color: #4CD964;
	font-weight: bold;
}

.check-icon {
	font-size: 100rpx;
	color: #4CD964;
	font-weight: bold;
}

.drug-group-list {
	display: flex;
	flex-direction: column;
	gap: 22rpx;
	margin-top: 24rpx;
}

.drug-card {
	padding: 26rpx;
	border-radius: 22rpx;
	background: linear-gradient(135deg, #f8fbff 0%, #ffffff 100%);
	border: 2rpx solid #e5eefc;
}

.drug-name {
	font-size: 34rpx;
	font-weight: bold;
	color: #22324d;
}

.drug-note {
	margin-top: 8rpx;
	font-size: 28rpx;
	color: #4a5c73;
}

.drug-stats {
	margin-top: 10rpx;
	font-size: 24rpx;
	color: #6b7a90;
}

.task-list {
	display: flex;
	flex-direction: column;
	gap: 14rpx;
	margin-top: 20rpx;
}

.task-row {
	align-items: center;
	padding: 20rpx 0;
	border-top: 1rpx solid #edf2f7;
}

.task-row:first-child {
	border-top: none;
	padding-top: 8rpx;
}

.task-main {
	flex: 1;
}

.task-title {
	font-size: 30rpx;
	color: #1f2937;
}

.task-meta {
	margin-top: 8rpx;
	font-size: 24rpx;
	color: #7a889a;
}

.empty-block {
	padding: 30rpx 0 10rpx;
}

.mini-btn {
	height: 72rpx;
	line-height: 72rpx;
	padding: 0 24rpx;
	border-radius: 18rpx;
	background-color: #f1f5f9;
	color: #334155;
	font-size: 26rpx;
}

.mini-btn.primary {
	background-color: #ebf3ff;
	color: $main-color;
}

.ocr-card {
	margin-top: 30rpx;
	padding: 46rpx 40rpx;
	background: linear-gradient(135deg, #ebf3ff 0%, #f8fbff 100%);
	border: 2rpx solid #dbeafe;
}

.ocr-card .text-title,
.ocr-card .text-helper {
	color: $main-color;
}

.ghost-btn {
	margin-top: 30rpx;
	background-color: #FFFFFF;
	color: $main-color;
}
</style>
