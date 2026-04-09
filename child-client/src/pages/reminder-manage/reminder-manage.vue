<template>
	<view class="container">
		<view class="header">
			<view>
				<text class="title">提醒管理</text>
				<text class="subtitle">{{ elderName }} 的提醒设置</text>
			</view>
			<button class="add-btn" @click="openCreate">+ 新增</button>
		</view>

		<view v-if="loading" class="card">加载中...</view>
		<view v-else class="list">
			<view v-if="reminders.length === 0" class="card empty">暂无提醒</view>
			<view v-for="item in reminders" :key="item.id" class="card item">
				<view class="row">
					<view>
						<text class="name">{{ item.title }}</text>
						<text class="meta">{{ formatRule(item) }}</text>
					</view>
					<view class="tag" :class="item.type">{{ item.type === 'medicine' ? '用药' : '日常' }}</view>
				</view>
				<view class="row actions">
					<button class="btn" @click="toggleEnabled(item)">{{ Number(item.enabled) === 1 ? '启用中' : '已停用' }}</button>
					<button class="btn primary" @click="openEdit(item)">编辑</button>
					<button class="btn danger" @click="remove(item)">删除</button>
				</view>
			</view>
		</view>

		<view v-if="showModal" class="modal-overlay">
			<view class="modal">
				<view class="modal-title">{{ isEditing ? '编辑提醒' : '新增提醒' }}</view>

				<input v-model="form.title" class="input" placeholder="提醒标题（如：吃降压药）" />
				<input v-model="form.content" class="input" placeholder="备注（可选）" />

				<view class="row-inline">
					<text class="label">类型</text>
					<view class="seg">
						<view :class="['seg-item', form.type==='medicine' ? 'active' : '']" @click="form.type='medicine'">用药</view>
						<view :class="['seg-item', form.type==='daily' ? 'active' : '']" @click="form.type='daily'">日常</view>
					</view>
				</view>

				<view class="row-inline">
					<text class="label">时间</text>
					<picker mode="time" :value="form.time" @change="onTimeChange">
						<view class="picker">{{ form.time || '选择时间' }}</view>
					</picker>
				</view>

				<view class="row-inline">
					<text class="label">重复</text>
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

				<view class="footer">
					<button class="btn" @click="closeModal">取消</button>
					<button class="btn primary" @click="submit">{{ isEditing ? '保存' : '创建' }}</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { request } from '../../utils/request';

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
	type: 'medicine',
	time: '',
	repeat_type: 'daily',
	repeat_days: []
});

onLoad((opt) => {
	elderId.value = opt.id;
	elderName.value = opt.name;
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
	return String(daysStr)
		.split(',')
		.filter(Boolean)
		.map((d) => map[d] || d)
		.join(' ');
};

const openCreate = () => {
	isEditing.value = false;
	editingId.value = null;
	form.value = { title: '', content: '', type: 'medicine', time: '', repeat_type: 'daily', repeat_days: [] };
	showModal.value = true;
};

const openEdit = (item) => {
	isEditing.value = true;
	editingId.value = item.id;
	const t = extractFirstTime(item) || item.remind_time || '';
	form.value = {
		title: item.title || '',
		content: item.content || '',
		type: item.type || 'medicine',
		time: t,
		repeat_type: item.repeat_type || 'once',
		repeat_days: (item.repeat_days ? String(item.repeat_days).split(',').filter(Boolean) : [])
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

<style scoped>
.container {
	padding: 20px;
	background-color: #f5f7fa;
	min-height: 100vh;
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 16px;
}

.title {
	font-size: 22px;
	font-weight: bold;
	color: #333;
}

.subtitle {
	display: block;
	font-size: 14px;
	color: #999;
	margin-top: 4px;
}

.add-btn {
	height: 40px;
	line-height: 40px;
	border-radius: 10px;
	background-color: #4A90E2;
	color: #fff;
	font-size: 14px;
}

.card {
	background: #fff;
	border-radius: 12px;
	padding: 14px;
	margin-bottom: 12px;
	box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.empty {
	text-align: center;
	color: #999;
}

.row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 10px;
}

.name {
	font-size: 16px;
	font-weight: bold;
	color: #333;
	display: block;
}

.meta {
	display: block;
	font-size: 12px;
	color: #999;
	margin-top: 4px;
}

.tag {
	font-size: 12px;
	padding: 4px 8px;
	border-radius: 6px;
	background-color: #f5f7fa;
	color: #666;
}

.tag.medicine {
	background-color: #FFF5F5;
	color: #E74C3C;
}

.tag.daily {
	background-color: #EBF3FF;
	color: #4A90E2;
}

.actions {
	margin-top: 12px;
}

.btn {
	height: 36px;
	line-height: 36px;
	border-radius: 10px;
	font-size: 13px;
	background-color: #f5f7fa;
	border: 1px solid #eaeaea;
	color: #333;
}

.btn.primary {
	background-color: #EBF3FF;
	border-color: #BFD7FF;
	color: #4A90E2;
}

.btn.danger {
	background-color: #FFF5F5;
	border-color: #FFDCDC;
	color: #E74C3C;
}

.modal-overlay {
	position: fixed;
	top: 0; left: 0; right: 0; bottom: 0;
	background-color: rgba(0,0,0,0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 100;
}

.modal {
	width: 88%;
	background: #fff;
	border-radius: 12px;
	padding: 16px;
}

.modal-title {
	font-size: 18px;
	font-weight: bold;
	text-align: center;
	margin-bottom: 12px;
}

.input {
	height: 44px;
	border-radius: 10px;
	background-color: #f5f7fa;
	padding: 0 12px;
	margin-bottom: 10px;
	font-size: 14px;
}

.row-inline {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin: 10px 0;
	gap: 10px;
}

.label {
	font-size: 14px;
	color: #666;
	width: 44px;
	flex-shrink: 0;
}

.seg {
	flex: 1;
	display: flex;
	gap: 8px;
}

.seg-item {
	flex: 1;
	height: 36px;
	line-height: 36px;
	border-radius: 10px;
	text-align: center;
	font-size: 13px;
	background-color: #f5f7fa;
	border: 1px solid #eaeaea;
	color: #333;
}

.seg-item.active {
	background-color: #EBF3FF;
	border-color: #BFD7FF;
	color: #4A90E2;
	font-weight: bold;
}

.picker {
	flex: 1;
	height: 36px;
	line-height: 36px;
	border-radius: 10px;
	background-color: #f5f7fa;
	border: 1px solid #eaeaea;
	padding: 0 12px;
	font-size: 13px;
	color: #333;
}

.week {
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
	margin: 8px 0 12px;
}

.day {
	width: 36px;
	height: 36px;
	line-height: 36px;
	border-radius: 10px;
	text-align: center;
	background-color: #f5f7fa;
	border: 1px solid #eaeaea;
	color: #333;
	font-size: 13px;
}

.day.active {
	background-color: #4A90E2;
	border-color: #4A90E2;
	color: #fff;
}

.footer {
	display: flex;
	gap: 10px;
	margin-top: 12px;
}
</style>

