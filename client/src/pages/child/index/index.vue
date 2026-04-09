<template>
	<view class="page-container">
		<view class="card-elder header-card">
			<view class="row">
				<view>
					<view class="text-title">子女守护端</view>
					<view class="text-helper">已守护 {{ elders.length }} 位长辈</view>
				</view>
				<button class="btn-elder small-btn" @click="openBind">绑定长辈</button>
			</view>
		</view>

		<view v-if="loading" class="card-elder">
			<view class="text-content">加载中...</view>
		</view>

		<view v-else>
			<view v-if="elders.length === 0" class="card-elder empty-card">
				<view class="text-content">还没有绑定长辈</view>
				<view class="text-helper">点击右上角“绑定长辈”，发起绑定申请后，让长辈输入验证码确认。</view>
			</view>

			<view v-for="elder in elders" :key="elder.id" class="card-elder elder-card" @click="goDetail(elder)">
				<view class="row">
					<view class="left">
						<view class="avatar">{{ (elder.nickname || '长辈').slice(0, 1) }}</view>
						<view>
							<view class="text-title">{{ elder.nickname || elder.username }}</view>
							<view class="text-helper">账号：{{ elder.username }}</view>
						</view>
					</view>
					<view class="tags">
						<view class="tag" :class="elder.is_vip ? 'vip' : 'free'">{{ elder.is_vip ? 'VIP' : '未开通' }}</view>
						<view class="tag info">待办 {{ elder.status?.reminders?.length || 0 }}</view>
						<view class="tag" :class="elder.status?.health?.medication_taken === 1 ? 'ok' : 'warn'">
							{{ elder.status?.health?.medication_taken === 1 ? '已服药' : '未服药' }}
						</view>
					</view>
				</view>
			</view>
		</view>

		<view v-if="showBindModal" class="modal-overlay">
			<view class="modal card-elder">
				<view class="text-title">绑定长辈账号</view>
				<view class="text-helper">输入长辈用户名，系统会生成验证码，长辈需在老人端输入验证码确认。</view>
				<input v-model="elderUsername" class="input" placeholder="请输入长辈用户名" />
				<view class="modal-actions">
					<button class="btn-elder ghost" @click="showBindModal=false">取消</button>
					<button class="btn-elder" @click="requestBind">发起绑定</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { request } from '../../../utils/request';

const elders = ref([]);
const loading = ref(false);
const showBindModal = ref(false);
const elderUsername = ref('');

const ensureChild = () => {
	const storedUser = uni.getStorageSync('user');
	if (!storedUser) {
		uni.redirectTo({ url: '/pages/login/login' });
		return false;
	}
	const u = JSON.parse(storedUser);
	if (u.role !== 'child') {
		uni.showModal({
			title: '账号类型不匹配',
			content: '当前账号不是子女账号，请切换账号登录。',
			confirmText: '去登录',
			success: () => uni.reLaunch({ url: '/pages/login/login' })
		});
		return false;
	}
	return true;
};

const fetchElders = async () => {
	loading.value = true;
	try {
		const res = await request('/relation/elders');
		elders.value = res.data || [];
		for (const elder of elders.value) {
			const statusRes = await request(`/relation/elder_status/${elder.id}`);
			elder.status = statusRes.data;
		}
	} catch (err) {
		uni.showToast({ title: err.message || '加载失败', icon: 'none' });
	} finally {
		loading.value = false;
	}
};

const openBind = () => {
	showBindModal.value = true;
};

const requestBind = async () => {
	if (!elderUsername.value) {
		uni.showToast({ title: '请输入长辈用户名', icon: 'none' });
		return;
	}
	try {
		const res = await request('/relation/request_bind', 'POST', { elder_username: elderUsername.value });
		showBindModal.value = false;
		elderUsername.value = '';
		uni.showModal({
			title: '绑定申请已发送',
			content: `请让长辈输入验证码：${res.data.verify_code}\n有效期至：${res.data.expires_at}`,
			confirmText: '我知道了'
		});
	} catch (err) {
		uni.showToast({ title: err.message || '发起绑定失败', icon: 'none' });
	}
};

const goDetail = (elder) => {
	uni.navigateTo({
		url: `/pages/child/elder-status/elder-status?id=${elder.id}&name=${encodeURIComponent(elder.nickname || elder.username)}`
	});
};

onMounted(() => {
	if (!ensureChild()) return;
	fetchElders();
});
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

.elder-card {
	margin-top: 24rpx;
}

.left {
	display: flex;
	align-items: center;
	gap: 20rpx;
}

.avatar {
	width: 88rpx;
	height: 88rpx;
	border-radius: 44rpx;
	background-color: #EBF3FF;
	color: $main-color;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 36rpx;
	font-weight: bold;
}

.tags {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 10rpx;
}

.tag {
	font-size: 22rpx;
	padding: 6rpx 14rpx;
	border-radius: 14rpx;
	background-color: #F5F7FA;
	color: #666;
}

.tag.vip {
	background-color: #FFF5E6;
	color: $secondary-color;
	border: 1rpx solid #FFD9A3;
}

.tag.free {
	background-color: #F0F0F0;
	color: #999;
}

.tag.info {
	background-color: #EBF3FF;
	color: $main-color;
}

.tag.ok {
	background-color: #E7F9EE;
	color: #2ECC71;
}

.tag.warn {
	background-color: #FFF5F5;
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
}

.modal-actions {
	display: flex;
	gap: 20rpx;
	margin-top: 24rpx;
}

.ghost {
	background-color: #F5F7FA;
	color: #333;
}
</style>

