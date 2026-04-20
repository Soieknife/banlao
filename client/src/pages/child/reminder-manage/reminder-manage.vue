<template>
	<view class="page-container">
		<view class="card-elder header-card">
			<view class="row">
				<view>
					<view class="text-title">提醒管理</view>
					<view class="text-helper">{{ elderName }} 的提醒设置</view>
				</view>
				<button class="btn-elder small-btn" @click="openCreate">新增</button>
			</view>
		</view>

		<view v-if="loading" class="card-elder">
			<view class="text-content">加载中...</view>
		</view>

		<view v-else>
			<view v-if="reminders.length === 0" class="card-elder empty-card">
				<view class="text-content">暂无提醒</view>
			</view>

			<view v-for="item in reminders" :key="item.id" class="card-elder item-card">
				<view class="row">
					<view>
						<view class="text-title">{{ item.title }}</view>
						<view v-if="item.type === 'medicine' && item.medication_name" class="text-helper med-name">药品：{{ item.medication_name }}</view>
						<view v-if="item.type === 'medicine' && item.dosage_note" class="text-helper">服用说明：{{ item.dosage_note }}</view>
						<view class="text-helper">{{ formatRule(item) }}</view>
					</view>
					<view class="tag" :class="item.type">{{ item.type === 'medicine' ? '用药' : '日常' }}</view>
				</view>

				<view class="btn-row">
					<button class="btn-ghost" @click="toggleEnabled(item)">{{ Number(item.enabled) === 1 ? '启用中' : '已停用' }}</button>
					<button class="btn-primary" @click="openEdit(item)">编辑</button>
					<button class="btn-danger" @click="remove(item)">删除</button>
				</view>
			</view>
		</view>

		<view v-if="showModal" class="modal-overlay">
			<view class="modal card-elder">
				<view class="text-title">{{ isEditing ? '编辑提醒' : '新增提醒' }}</view>

				<input v-model="form.title" class="input" placeholder="提醒标题（如：吃降压药）" />
				<input v-model="form.content" class="input" placeholder="备注（可选）" />

				<view v-if="form.type==='medicine'">
					<input v-model="form.medication_name" class="input" placeholder="药品名称（如：阿托伐他汀）" />
					<input v-model="form.dosage_note" class="input" placeholder="服用说明（如：晚饭后 1 片）" />
				</view>

				<view class="row-inline">
					<view class="label">类型</view>
					<view class="seg">
						<view :class="['seg-item', form.type==='medicine' ? 'active' : '']" @click="form.type='medicine'">用药</view>
						<view :class="['seg-item', form.type==='daily' ? 'active' : '']" @click="form.type='daily'">日常</view>
					</view>
				</view>

				<view class="row-inline">
					<view class="label">时间</view>
					<picker mode="time" :value="form.time" @change="onTimeChange">
						<view class="picker">{{ form.time || '选择时间' }}</view>
					</picker>
				</view>

				<view class="row-inline">
					<view class="label">重复</view>
					<view class="seg">
						<view :class="['seg-item', form.repeat_type==='once' ? 'active' : '']" @click="form.repeat_type='once'">一次</view>
						<view :class="['seg-item', form.repeat_type==='daily' ? 'active' : '']" @click="form.repeat_type='daily'">每天</view>
						<view :class="['seg-item', form.repeat_type==='weekly' ? 'active' : '']" @click="form.repeat_type='weekly'">每周</view>
					</view>
				</view>

				<view v-if="form.repeat_type==='weekly'" class="week">
					<view v-for="d in weekDays" :key="d.value" :class="['day', form.repeat_days.includes(d.value) ? 'active' : '']" @click="toggleWeekDay(d.value)">
						{{ d.label }}
					</view>
				</view>

				<view class="modal-actions">
					<button class="btn-ghost" @click="closeModal">取消</button>
					<button class="btn-primary" @click="submit">{{ isEditing ? '保存' : '创建' }}</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { request } from '../../../utils/request';

const elderId = ref('');
const elderName = ref('');
const reminders = ref([]);
const loading = ref(false);

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

onLoad((opt) => {
	elderId.value = opt.id;
	elderName.value = decodeURIComponent(opt.name || '');
});

const fetchList = async () => {
	loading.value = true;
	try {
		const res = await request(`/reminder/elder_list/${elderId.value}`);
		reminders.value = res.data || [];
	} catch (err) {
		uni.showToast({ title: err.message || '加载失败', icon: 'none' });
	} finally {
		loading.value = false;
	}
};

onShow(() => {
	fetchList();
});

onMounted(() => {
	fetchList();
});

const formatRule = (item) => {
	const time = extractFirstTime(item) || item.remind_time || '';
	const rt = item.repeat_type || 'once';
	if (rt === 'daily') return `${time} · 每天`;
	if (rt === 'weekly') return `${time} · 每周(${formatWeekDays(item.repeat_days)})`;
	return `${time} · 一次`;
};

const extractFirstTime = (item) => {
	try {
		const list = JSON.parse(item.repeat_times || '[]');
		return Array.isArray(list) && list.length ? list[0] : '';
	} catch (e) {
		return '';
	}
};

const formatWeekDays = (daysStr) => {
	const map = { '1': '一', '2': '二', '3': '三', '4': '四', '5': '五', '6': '六', '0': '日' };
	if (!daysStr) return '';
	return String(daysStr).split(',').filter(Boolean).map((d) => map[d] || d).join(' ');
};

const openCreate = () => {
	isEditing.value = false;
	editingId.value = null;
	form.value = { title: '', content: '', medication_name: '', dosage_note: '', type: 'medicine', time: '', repeat_type: 'daily', repeat_days: [] };
	showModal.value = true;
};

const openEdit = (item) => {
	isEditing.value = true;
	editingId.value = item.id;
	const t = extractFirstTime(item) || item.remind_time || '';
	form.value = {
		title: item.title || '',
		content: item.content || '',
		medication_name: item.medication_name || '',
		dosage_note: item.dosage_note || '',
		type: item.type || 'medicine',
		time: t,
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
		user_id: elderId.value,
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
		uni.showToast({ title: '保存成功', icon: 'success' });
		showModal.value = false;
		await fetchList();
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
				await fetchList();
			} catch (err) {
				uni.showToast({ title: err.message || '删除失败', icon: 'none' });
			}
		}
	});
};

const toggleEnabled = async (item) => {
	const next = Number(item.enabled) === 1 ? 0 : 1;
	try {
		await request(`/reminder/update/${item.id}`, 'POST', {
			title: item.title,
			content: item.content,
			medication_name: item.medication_name || '',
			dosage_note: item.dosage_note || '',
			type: item.type,
			remind_time: item.remind_time,
			repeat_type: item.repeat_type || 'once',
			repeat_days: item.repeat_days || '',
			repeat_times: item.repeat_times || '',
			start_date: item.start_date || '',
			end_date: item.end_date || '',
			enabled: next
		});
		item.enabled = next;
	} catch (err) {
		uni.showToast({ title: err.message || '操作失败', icon: 'none' });
	}
};
</script>

<style lang="scss" scoped>
.header-card {
	border-left: 10rpx solid $main-color;
}

.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 20rpx;
}

.small-btn {
	height: 80rpx;
	line-height: 80rpx;
	padding: 0 28rpx;
	font-size: 30rpx;
}

.item-card {
	margin-top: 24rpx;
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

.med-name {
	color: $main-color;
}

.btn-row {
	display: flex;
	gap: 16rpx;
	margin-top: 20rpx;
}

.btn-ghost, .btn-primary, .btn-danger {
	flex: 1;
	height: 80rpx;
	line-height: 80rpx;
	border-radius: 16rpx;
	font-size: 28rpx;
}

.btn-ghost {
	background-color: #F5F7FA;
	border: 1rpx solid #EAEAEA;
	color: #333;
}

.btn-primary {
	background-color: #EBF3FF;
	border: 1rpx solid #BFD7FF;
	color: $main-color;
}

.btn-danger {
	background-color: #FFF5F5;
	border: 1rpx solid #FFDCDC;
	color: $warning-color;
}

.empty-card {
	text-align: center;
}

.modal-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 100;
}

.modal {
	width: 86%;
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

.row-inline {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 20rpx;
	margin-top: 20rpx;
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

.modal-actions {
	display: flex;
	gap: 20rpx;
	margin-top: 24rpx;
}
</style>
