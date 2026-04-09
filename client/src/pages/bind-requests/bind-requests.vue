<template>
	<view class="page-container">
		<view class="card-elder header-card">
			<view class="text-title">绑定确认</view>
			<view class="text-content">子女绑定需要您本人确认，并输入验证码。</view>
			<view class="text-helper">验证码由子女手机端发起绑定申请后提供。</view>
		</view>

		<view v-if="loading" class="card-elder">
			<view class="text-content">正在加载...</view>
		</view>

		<view v-else>
			<view v-if="requests.length === 0" class="card-elder empty-card">
				<view class="text-content">暂无待确认的绑定申请</view>
			</view>

			<view v-for="item in requests" :key="item.id" class="card-elder request-card">
				<view class="row">
					<view class="text-title">{{ item.child_nickname || item.child_username }}</view>
					<view class="badge">待确认</view>
				</view>
				<view class="text-helper">账号：{{ item.child_username }}</view>
				<view class="text-helper">有效期至：{{ formatTime(item.expires_at) }}</view>

				<view class="code-row">
					<input v-model="codes[item.id]" class="code-input" placeholder="请输入 6 位验证码" maxlength="6" />
					<button class="btn-elder small-btn" @click="approve(item)">确认绑定</button>
				</view>

				<button class="danger-btn" @click="reject(item)">拒绝</button>
			</view>
		</view>
	</view>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue';
import { request } from '../../utils/request';
import { speak } from '../../utils/voice';

const loading = ref(false);
const requests = ref([]);
const codes = reactive({});

const formatTime = (iso) => {
	if (!iso) return '未知';
	const d = new Date(iso);
	return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const fetchRequests = async () => {
	loading.value = true;
	try {
		const res = await request('/relation/pending_requests');
		requests.value = res.data || [];
	} catch (err) {
		console.error(err);
		uni.showToast({ title: err.message || '加载失败', icon: 'none' });
	} finally {
		loading.value = false;
	}
};

const approve = async (item) => {
	const code = (codes[item.id] || '').trim();
	if (code.length !== 6) {
		speak('请输入 6 位验证码');
		return;
	}
	try {
		await request('/relation/approve_bind', 'POST', { request_id: item.id, verify_code: code });
		speak('绑定成功');
		uni.showToast({ title: '绑定成功', icon: 'success' });
		await fetchRequests();
	} catch (err) {
		uni.showToast({ title: err.message || '绑定失败', icon: 'none' });
	}
};

const reject = async (item) => {
	uni.showModal({
		title: '拒绝绑定',
		content: '确定要拒绝该绑定申请吗？',
		confirmText: '拒绝',
		confirmColor: '#E74C3C',
		success: async (res) => {
			if (!res.confirm) return;
			try {
				await request('/relation/reject_bind', 'POST', { request_id: item.id });
				uni.showToast({ title: '已拒绝', icon: 'success' });
				await fetchRequests();
			} catch (err) {
				uni.showToast({ title: err.message || '操作失败', icon: 'none' });
			}
		}
	});
};

onMounted(() => {
	fetchRequests();
	speak('这里可以确认子女的绑定申请。请核对信息后输入验证码。');
});
</script>

<style lang="scss" scoped>
.header-card {
	border-left: 10rpx solid $secondary-color;
}

.empty-card {
	text-align: center;
}

.request-card {
	margin-top: 30rpx;
}

.row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 10rpx;
}

.badge {
	font-size: 24rpx;
	background-color: #FFF5E6;
	color: $secondary-color;
	padding: 6rpx 16rpx;
	border-radius: 20rpx;
	border: 1rpx solid $secondary-color;
}

.code-row {
	display: flex;
	gap: 20rpx;
	align-items: center;
	margin-top: 20rpx;
}

.code-input {
	flex: 1;
	height: 90rpx;
	border: 2rpx solid #ddd;
	border-radius: 16rpx;
	padding: 0 20rpx;
	font-size: 34rpx;
	background-color: #fff;
}

.small-btn {
	height: 90rpx;
	line-height: 90rpx;
	padding: 0 30rpx;
	font-size: 32rpx;
}

.danger-btn {
	margin-top: 20rpx;
	height: 90rpx;
	line-height: 90rpx;
	border-radius: 16rpx;
	font-size: 32rpx;
	background-color: #FFF5F5;
	color: $warning-color;
	border: 1rpx solid #FFDCDC;
}
</style>

