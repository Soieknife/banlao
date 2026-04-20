<template>
	<view class="page-container">
		<AppSidebar active-path="/pages/reminders/reminders" />

		<view class="card-elder header-card">
			<view class="row-head">
				<view>
					<view class="text-title">提醒事项</view>
					<view class="text-helper">您和家人都可以为这个账号添加自定义提醒</view>
				</view>
				<button class="btn-elder small-btn" @click="openCreate">新增提醒</button>
			</view>
		</view>

		<view class="tab-container">
			<view :class="['tab-item', currentTab === 'all' ? 'active' : '']" @click="currentTab = 'all'">全部</view>
			<view :class="['tab-item', currentTab === 'medicine' ? 'active' : '']" @click="currentTab = 'medicine'">用药</view>
			<view :class="['tab-item', currentTab === 'daily' ? 'active' : '']" @click="currentTab = 'daily'">日常</view>
		</view>

		<scroll-view scroll-y class="list-container">
			<view v-if="filteredReminders.length === 0" class="empty-state">
				<text class="text-helper">当前没有提醒事项</text>
			</view>
			<view v-for="item in filteredReminders" :key="item.id" class="card-elder reminder-card">
				<view class="reminder-info">
					<view class="top-line">
						<view class="text-title">{{ item.title }}</view>
						<view class="tag" :class="item.type">{{ item.type === 'medicine' ? '用药' : '日常' }}</view>
					</view>
					<view v-if="item.content" class="text-content">{{ item.content }}</view>
					<view v-if="item.type === 'medicine' && item.medication_name" class="text-helper med-name">药品：{{ item.medication_name }}</view>
					<view v-if="item.type === 'medicine' && item.dosage_note" class="text-helper">服用说明：{{ item.dosage_note }}</view>
					<view class="text-helper">提醒时间：{{ formatRule(item) }}</view>
					<view class="text-helper">创建人：{{ Number(item.created_by) === Number(currentUser.id) ? '我自己' : '家人' }}</view>
				</view>
				<view class="reminder-actions">
					<button v-if="item.status === 0" class="btn-elder small-btn" @click="completeReminder(item)">完成</button>
					<text v-else class="text-helper status-done">已完成</text>
					<button class="mini-btn" @click="openEdit(item)">编辑</button>
					<button class="mini-btn danger" @click="remove(item)">删除</button>
				</view>
			</view>
		</scroll-view>

		<view class="card-elder info-card">
			<view class="text-content">💡 新增后会立即同步，方便您和家人一起维护提醒</view>
		</view>

		<view v-if="showModal" class="modal-overlay">
			<view class="modal card-elder">
				<view class="text-title">{{ isEditing ? '编辑提醒' : '新增提醒' }}</view>
				<input v-model="form.title" class="input" placeholder="提醒标题（如：晚上吃降压药）" />
				<input v-model="form.content" class="input" placeholder="备注（可选）" />

				<view v-if="form.type === 'medicine'" class="medicine-fields">
					<input v-model="form.medication_name" class="input" placeholder="药品名称（如：阿司匹林）" />
					<input v-model="form.dosage_note" class="input" placeholder="服用说明（如：饭后 1 片）" />
				</view>

				<view class="row-inline">
					<view class="label">类型</view>
					<view class="seg">
						<view :class="['seg-item', form.type === 'medicine' ? 'active' : '']" @click="form.type = 'medicine'">用药</view>
						<view :class="['seg-item', form.type === 'daily' ? 'active' : '']" @click="form.type = 'daily'">日常</view>
					</view>
				</view>

				<view class="row-inline">
					<view class="label">时间</view>
					<view class="time-panel">
						<picker mode="time" :value="form.time" @change="onTimeChange">
							<view class="picker">{{ form.time || '选择时间' }}</view>
						</picker>
						<view class="time-preview">
							<text class="time-preview-label">当前选择</text>
							<text class="time-preview-value">{{ form.time || '--:--' }}</text>
						</view>
					</view>
				</view>

				<view class="row-inline">
					<view class="label">重复</view>
					<view class="seg">
						<view :class="['seg-item', form.repeat_type === 'once' ? 'active' : '']" @click="form.repeat_type = 'once'">一次</view>
						<view :class="['seg-item', form.repeat_type === 'daily' ? 'active' : '']" @click="form.repeat_type = 'daily'">每天</view>
						<view :class="['seg-item', form.repeat_type === 'weekly' ? 'active' : '']" @click="form.repeat_type = 'weekly'">每周</view>
					</view>
				</view>

				<view v-if="form.repeat_type === 'weekly'" class="week">
					<view v-for="d in weekDays" :key="d.value" :class="['day', form.repeat_days.includes(d.value) ? 'active' : '']" @click="toggleWeekDay(d.value)">
						{{ d.label }}
					</view>
				</view>

				<view class="modal-actions">
					<button class="mini-btn" @click="closeModal">取消</button>
					<button class="btn-elder compact-btn" @click="submit">{{ isEditing ? '保存' : '创建' }}</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { request } from '../../utils/request';
import { speak } from '../../utils/voice';
import AppSidebar from '../../components/AppSidebar.vue';

const reminders = ref([]);
const currentTab = ref('all');
const currentUser = ref({});
const showModal = ref(false);
const isEditing = ref(false);
const editingId = ref(null);

const weekDays = [
	{ label: '一', value: '1' },
	{ label: '二', value: '2' },
	{ label: '三', value: '3' },
	{ label: '四', value: '4' },
	{ label: '五', value: '5' },
	{ label: '六', value: '6' },
	{ label: '日', value: '0' }
];

const form = ref({
	title: '',
	content: '',
	medication_name: '',
	dosage_note: '',
	type: 'medicine',
	time: '',
	repeat_type: 'daily',
	repeat_days: []
});

onLoad((options) => {
	if (options?.tab) {
		currentTab.value = options.tab;
	}
	if (options?.prefill === 'medicine' || options?.drugName) {
		openCreate({
			type: 'medicine',
			title: options.drugName ? `${decodeURIComponent(options.drugName)} 用药提醒` : '',
			content: options.dosage ? decodeURIComponent(options.dosage) : '',
			medication_name: options.drugName ? decodeURIComponent(options.drugName) : '',
			dosage_note: options.dosage ? decodeURIComponent(options.dosage) : ''
		});
	}
});

const fetchReminders = async () => {
	try {
		const res = await request('/reminder/list');
		reminders.value = Array.isArray(res.data) ? res.data : [];
	} catch (err) {
		console.error('获取提醒失败', err);
	}
};

const filteredReminders = computed(() => {
	if (currentTab.value === 'all') return reminders.value;
	return reminders.value.filter((item) => item.type === currentTab.value);
});

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
	if (item.repeat_type === 'weekly') return `${time} · 每周`;
	return `${time} · 一次`;
};

const completeReminder = async (item) => {
	try {
		await request(`/reminder/complete/${item.id}`, 'POST');
		const remainingMedicine = reminders.value.filter((row) => row.type === 'medicine' && Number(row.status) === 0 && Number(row.id) !== Number(item.id));
		if (item.type === 'medicine' && remainingMedicine.length === 0) {
			await request('/health_record/take_medicine', 'POST');
		}
		item.status = 1;
		speak(item.type === 'medicine'
			? (remainingMedicine.length === 0 ? `您已完成${item.title}，今天的服药记录也已同步完成。` : `您已完成${item.title}，这次服药已经记下来了。`)
			: `您已完成${item.title}，真棒！`);
		uni.showToast({ title: item.type === 'medicine' ? (remainingMedicine.length === 0 ? '今日服药已全部完成' : '本次服药已记录') : '操作成功', icon: 'success' });
	} catch (err) {
		console.error('操作失败', err);
	}
};

const openCreate = (preset = {}) => {
	isEditing.value = false;
	editingId.value = null;
	form.value = {
		title: preset.title || '',
		content: preset.content || '',
		medication_name: preset.medication_name || '',
		dosage_note: preset.dosage_note || '',
		type: preset.type || 'medicine',
		time: preset.time || '',
		repeat_type: preset.repeat_type || 'daily',
		repeat_days: preset.repeat_days || []
	};
	showModal.value = true;
};

const openEdit = (item) => {
	isEditing.value = true;
	editingId.value = item.id;
	form.value = {
		title: item.title || '',
		content: item.content || '',
		medication_name: item.medication_name || '',
		dosage_note: item.dosage_note || '',
		type: item.type || 'medicine',
		time: extractFirstTime(item) || item.remind_time || '',
		repeat_type: item.repeat_type || 'once',
		repeat_days: item.repeat_days ? String(item.repeat_days).split(',').filter(Boolean) : []
	};
	showModal.value = true;
};

const closeModal = () => {
	showModal.value = false;
};

const onTimeChange = (e) => {
	form.value.time = e.detail.value;
};

const toggleWeekDay = (v) => {
	const set = new Set(form.value.repeat_days);
	if (set.has(v)) set.delete(v);
	else set.add(v);
	form.value.repeat_days = Array.from(set);
};

const submit = async () => {
	if (!form.value.title || !form.value.time) {
		uni.showToast({ title: '请填写标题与时间', icon: 'none' });
		return;
	}
	if (form.value.repeat_type === 'weekly' && form.value.repeat_days.length === 0) {
		uni.showToast({ title: '请选择每周提醒的星期', icon: 'none' });
		return;
	}

	const payload = {
		title: form.value.title,
		content: form.value.content,
		medication_name: form.value.type === 'medicine' ? form.value.medication_name : '',
		dosage_note: form.value.type === 'medicine' ? form.value.dosage_note : '',
		type: form.value.type,
		remind_time: form.value.time,
		repeat_type: form.value.repeat_type,
		repeat_days: form.value.repeat_type === 'weekly' ? form.value.repeat_days.join(',') : '',
		repeat_times: JSON.stringify([form.value.time]),
		enabled: 1
	};

	try {
		if (isEditing.value) {
			await request(`/reminder/update/${editingId.value}`, 'POST', payload);
		} else {
			await request('/reminder/add', 'POST', payload);
		}
		showModal.value = false;
		uni.showToast({ title: '保存成功', icon: 'success' });
		await fetchReminders();
	} catch (err) {
		uni.showToast({ title: err.message || '保存失败', icon: 'none' });
	}
};

const remove = (item) => {
	uni.showModal({
		title: '删除提醒',
		content: '确定要删除该提醒吗？',
		confirmText: '删除',
		confirmColor: '#E74C3C',
		success: async (res) => {
			if (!res.confirm) return;
			try {
				await request(`/reminder/delete/${item.id}`, 'POST');
				uni.showToast({ title: '已删除', icon: 'success' });
				await fetchReminders();
			} catch (err) {
				uni.showToast({ title: err.message || '删除失败', icon: 'none' });
			}
		}
	});
};

onMounted(() => {
	const storedUser = uni.getStorageSync('user');
	if (storedUser) {
		currentUser.value = JSON.parse(storedUser);
	}
	fetchReminders();
	speak('这里是提醒事项，您和家人都可以添加自定义提醒。');
});
</script>

<style lang="scss" scoped>
.header-card {
	border-left: 10rpx solid $main-color;
}

.row-head,
.top-line,
.modal-actions,
.row-inline {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 20rpx;
}

.small-btn,
.compact-btn {
	height: 80rpx;
	line-height: 80rpx;
	font-size: 30rpx;
	padding: 0 28rpx;
}

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
}

.tab-item.active {
	background-color: $main-color;
	color: #FFFFFF;
	font-weight: bold;
}

.list-container {
	height: calc(100vh - 520rpx);
}

.reminder-card {
	display: flex;
	justify-content: space-between;
	gap: 20rpx;
}

.reminder-info {
	flex: 1;
}

.reminder-actions {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 12rpx;
}

.mini-btn {
	min-width: 132rpx;
	height: 68rpx;
	line-height: 68rpx;
	border-radius: 14rpx;
	background-color: #F5F7FA;
	color: #333;
	font-size: 26rpx;
	text-align: center;
}

.mini-btn.danger {
	background-color: #FFF5F5;
	color: $warning-color;
}

.tag {
	font-size: 24rpx;
	padding: 6rpx 14rpx;
	border-radius: 14rpx;
	background-color: #F5F7FA;
	color: #666;
}

.tag.medicine {
	background-color: #FFF5F5;
	color: $warning-color;
}

.tag.daily {
	background-color: #EBF3FF;
	color: $main-color;
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

.modal-overlay {
	position: fixed;
	inset: 0;
	background-color: rgba(0, 0, 0, 0.45);
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 30rpx;
	z-index: 100;
}

.modal {
	width: 100%;
}

.input {
	height: 90rpx;
	border: 2rpx solid #ddd;
	border-radius: 16rpx;
	padding: 0 20rpx;
	font-size: 32rpx;
	margin-top: 20rpx;
	background-color: #fff;
}

.medicine-fields {
	margin-top: 2rpx;
}

.med-name {
	color: $main-color;
}

.label {
	width: 88rpx;
	flex-shrink: 0;
	color: #666;
	font-size: 28rpx;
}

.seg {
	flex: 1;
	display: flex;
	gap: 16rpx;
}

.seg-item {
	flex: 1;
	height: 72rpx;
	line-height: 72rpx;
	border-radius: 16rpx;
	text-align: center;
	font-size: 28rpx;
	background-color: #F5F7FA;
	border: 1rpx solid #EAEAEA;
	color: #333;
}

.seg-item.active {
	background-color: #EBF3FF;
	border-color: #BFD7FF;
	color: $main-color;
	font-weight: bold;
}

.picker {
	flex: 1;
	height: 72rpx;
	line-height: 72rpx;
	border-radius: 16rpx;
	background-color: #F5F7FA;
	border: 1rpx solid #EAEAEA;
	padding: 0 20rpx;
	font-size: 28rpx;
	color: #333;
}

.time-panel {
	flex: 1;
	display: flex;
	gap: 14rpx;
	align-items: center;
}

.time-preview {
	min-width: 150rpx;
	padding: 12rpx 16rpx;
	border-radius: 16rpx;
	background: linear-gradient(135deg, #edf5ff 0%, #fffaf0 100%);
	border: 1rpx solid #d9e8ff;
	text-align: center;
}

.time-preview-label {
	display: block;
	font-size: 20rpx;
	color: #789;
}

.time-preview-value {
	display: block;
	margin-top: 6rpx;
	font-size: 28rpx;
	font-weight: bold;
	color: #2c4d7f;
}

.week {
	display: flex;
	gap: 16rpx;
	flex-wrap: wrap;
	margin-top: 16rpx;
}

.day {
	width: 72rpx;
	height: 72rpx;
	line-height: 72rpx;
	border-radius: 16rpx;
	text-align: center;
	background-color: #F5F7FA;
	border: 1rpx solid #EAEAEA;
	color: #333;
	font-size: 28rpx;
}

.day.active {
	background-color: $main-color;
	border-color: $main-color;
	color: #fff;
}
</style>
