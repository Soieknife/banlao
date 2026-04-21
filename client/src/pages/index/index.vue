<template>
	<view class="page-container home-page">
		<AppSidebar active-path="/pages/index/index" />

		<view class="hero card-elder">
			<view class="hero-top">
				<view>
					<view class="text-title">{{ greetingTitle }}</view>
					<view class="text-helper">{{ isChild ? '看看今天家人的状态' : '常用功能已经为您排好，轻松一点就能用' }}</view>
				</view>
				<view v-if="heroChipText" class="hero-chip" :class="{ warning: !isChild && pendingRequests.length > 0 }">
					{{ heroChipText }}
				</view>
			</view>
			<view class="hero-actions">
				<button
					v-if="isChild"
					class="btn-elder small-btn"
					@click="primaryElder ? goElderDetail(primaryElder) : openBind()"
				>
					{{ primaryElder ? '查看守护详情' : '去绑定长辈' }}
				</button>
				<button v-else-if="pendingRequests.length > 0" class="btn-elder small-btn" @click="openPendingRequests">
					查看绑定申请
				</button>
				<button class="btn-elder light-btn small-btn" @click="handleLogout">退出登录</button>
			</view>
		</view>

		<template v-if="isChild">
			<view class="card-elder">
				<view class="section-head">
					<view>
						<view class="text-title">守护中的长辈</view>
						<view class="text-helper">随时看看家人的提醒、紧急联系人和会员情况</view>
					</view>
					<button class="btn-elder compact-btn" @click="openBind">绑定长辈</button>
				</view>

				<view v-if="loading" class="loading-state">
					<text>加载中...</text>
				</view>
				<view v-else-if="elders.length === 0" class="empty-state">
					<view class="text-content">还没有绑定长辈</view>
					<view class="text-helper">发起绑定申请后，让长辈输入验证码确认即可。</view>
				</view>
				<view v-else class="elder-list">
					<view v-for="elder in elders" :key="elder.id" class="elder-card" @click="goElderDetail(elder)">
						<view class="elder-main">
							<view class="avatar">{{ (elder.nickname || '长辈').slice(0, 1) }}</view>
							<view class="elder-info">
								<view class="elder-name">{{ elder.nickname || elder.username }}</view>
								<view class="text-helper">账号：{{ elder.username }}</view>
							</view>
						</view>
						<view class="elder-tags">
							<view class="tag" :class="elder.is_vip ? 'vip' : 'free'">{{ elder.is_vip ? 'VIP' : '未开通' }}</view>
							<view class="tag info">待办 {{ elder.status?.reminders?.length || 0 }}</view>
							<view class="tag" :class="elder.status?.health?.medication_taken === 1 ? 'ok' : 'warn'">
								{{ elder.status?.health?.medication_taken === 1 ? '已服药' : '未服药' }}
							</view>
						</view>
					</view>
				</view>
			</view>

			<view class="card-elder">
				<view class="section-head">
					<view>
						<view class="text-title">绑定申请进度</view>
						<view class="text-helper">发起后会保留在这里，方便随时查看验证码和处理结果</view>
					</view>
					<view v-if="childPendingCount > 0" class="hero-chip warning">{{ childPendingCount }} 条待确认</view>
				</view>

				<view v-if="bindRequestsLoading" class="loading-state">
					<text>加载中...</text>
				</view>
				<view v-else-if="bindRequests.length === 0" class="empty-state">
					<view class="text-content">还没有绑定申请记录</view>
					<view class="text-helper">您发起的绑定申请、验证码和处理状态都会显示在这里。</view>
				</view>
				<view v-else class="bind-request-list">
					<view v-for="item in bindRequests" :key="item.id" class="bind-request-card">
						<view class="bind-request-top">
							<view>
								<view class="elder-name">{{ item.elder_nickname || item.elder_username }}</view>
								<view class="text-helper">账号：{{ item.elder_username }}</view>
							</view>
							<view class="request-status" :class="getRequestStatusClass(item.status)">
								{{ formatRequestStatus(item.status) }}
							</view>
						</view>

						<view class="request-meta">
							<view v-if="item.verify_code" class="request-code">验证码：{{ item.verify_code }}</view>
							<view class="text-helper">
								{{ item.status === 'pending' ? `有效期至：${formatTime(item.expires_at)}` : `申请时间：${formatTime(item.created_at)}` }}
							</view>
							<view v-if="item.status === 'approved'" class="text-helper">长辈已确认绑定，可以在上方查看守护详情。</view>
							<view v-else-if="item.status === 'rejected'" class="text-helper">本次申请已被拒绝，如仍需绑定可重新发起。</view>
							<view v-else-if="item.status === 'expired'" class="text-helper">验证码已过期，需要重新发起绑定申请。</view>
							<view v-else class="text-helper">请让长辈在首页或绑定确认页输入验证码完成确认。</view>
						</view>

						<view v-if="item.status === 'expired' || item.status === 'rejected'" class="request-actions">
							<button class="btn-elder light-btn compact-btn" @click="reapplyBind(item)">重新发起</button>
						</view>
					</view>
				</view>
			</view>

		</template>

		<template v-else>
			<view class="card-elder bind-alert-card" :class="{ highlighted: pendingRequests.length > 0 }">
				<view class="section-head">
					<view>
						<view class="text-title">{{ pendingRequests.length > 0 ? `有 ${pendingRequests.length} 条绑定申请待处理` : '家人绑定入口' }}</view>
						<view class="text-helper">
							{{ pendingRequests.length > 0 ? '请核对家人信息后输入验证码确认绑定。' : '家人发起绑定后，这里会第一时间提醒您，也可以主动进入查看。' }}
						</view>
					</view>
					<button class="btn-elder compact-btn" @click="openPendingRequests">
						{{ pendingRequests.length > 0 ? '立即查看' : '查看申请' }}
					</button>
				</view>

				<view v-if="pendingRequests.length > 0" class="bind-alert-list">
					<view v-for="item in elderPendingPreview" :key="item.id" class="pending-brief">
						<view class="pending-brief-name">{{ item.child_nickname || item.child_username }}</view>
						<view class="text-helper">账号：{{ item.child_username }}</view>
						<view class="text-helper">有效期至：{{ formatTime(item.expires_at) }}</view>
					</view>
					<view v-if="pendingRequests.length > elderPendingPreview.length" class="text-helper">
						还有 {{ pendingRequests.length - elderPendingPreview.length }} 条申请待查看
					</view>
				</view>
			</view>

			<view class="grid-container">
				<view class="grid-item card-elder emergency-btn" @click="handleEmergency">
					<view class="icon-wrap"><text class="grid-emoji">🚨</text></view>
					<view class="text-title">紧急呼救</view>
					<view class="text-helper">自动通知子女并拨打紧急联系人</view>
				</view>
				<view class="grid-item card-elder" @click="navigateTo('/pages/ai/ai')">
					<view class="icon-wrap"><text class="grid-emoji">🤖</text></view>
					<view class="text-title">暖阳陪聊</view>
					<view class="text-helper">AI 语音智能对话</view>
				</view>
				<view class="grid-item card-elder" @click="navigateTo('/pages/reminders/reminders')">
					<view class="icon-wrap"><text class="grid-emoji">🔔</text></view>
					<view class="text-title">提醒事项</view>
					<view class="text-helper">老人和家人都能添加</view>
				</view>
				<view class="grid-item card-elder" @click="navigateTo('/pages/health/health')">
					<view class="icon-wrap"><text class="grid-emoji">💊</text></view>
					<view class="text-title">用药管理</view>
					<view class="text-helper">服药记录与识药助手</view>
				</view>
				<view class="grid-item card-elder" @click="navigateTo('/pages/life/life')">
					<view class="icon-wrap"><text class="grid-emoji">☀️</text></view>
					<view class="text-title">生活查询</view>
					<view class="text-helper">天气与常用电话</view>
				</view>
				<view class="grid-item card-elder" @click="navigateTo('/pages/profile/profile')">
					<view class="icon-wrap"><text class="grid-emoji">👤</text></view>
					<view class="text-title">个人信息</view>
					<view class="text-helper">手机号、家人和紧急联系人</view>
				</view>
			</view>
		</template>

		<view v-if="showBindModal" class="modal-overlay">
			<view class="modal card-elder">
				<view class="text-title">绑定长辈账号</view>
				<view class="text-helper">输入长辈用户名，系统会生成验证码，长辈在同一个应用里确认即可。</view>
				<input v-model="elderUsername" class="input-elder" placeholder="请输入长辈用户名" />
				<view class="modal-actions">
					<button class="btn-elder light-btn" @click="showBindModal = false">取消</button>
					<button class="btn-elder" @click="requestBind">发起绑定</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { request } from '../../utils/request';
import { speak } from '../../utils/voice';
import AppSidebar from '../../components/AppSidebar.vue';

const user = ref({});
const loading = ref(false);
const elders = ref([]);
const bindRequests = ref([]);
const bindRequestsLoading = ref(false);
const pendingRequests = ref([]);
const announcedPendingCount = ref(0);
const showBindModal = ref(false);
const elderUsername = ref('');

const isChild = computed(() => user.value.role === 'child');
const primaryElder = computed(() => elders.value[0] || null);
const childPendingCount = computed(() => bindRequests.value.filter((item) => item.status === 'pending').length);
const elderPendingPreview = computed(() => pendingRequests.value.slice(0, 3));
const heroChipText = computed(() => {
	if (isChild.value) return '守护中';
	return pendingRequests.value.length > 0 ? `待处理 ${pendingRequests.value.length}` : '安心中';
});
const greetingTitle = computed(() => {
	const name = user.value.nickname || user.value.username || (isChild.value ? '家人' : '长辈');
	return isChild.value ? `${name}，今天也在好好守护家人` : `${name}，愿您今天轻松顺心`;
});
const loadUser = () => {
	const storedUser = uni.getStorageSync('user');
	if (!storedUser) {
		uni.reLaunch({ url: '/pages/login/login' });
		return false;
	}
	try {
		user.value = JSON.parse(storedUser);
	} catch (error) {
		uni.removeStorageSync('user');
		uni.reLaunch({ url: '/pages/login/login' });
		return false;
	}
	return true;
};

const formatTime = (iso) => {
	if (!iso) return '未知';
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return iso;
	return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const formatRequestStatus = (status) => {
	if (status === 'approved') return '已通过';
	if (status === 'rejected') return '已拒绝';
	if (status === 'expired') return '已过期';
	return '待确认';
};

const getRequestStatusClass = (status) => {
	if (status === 'approved') return 'approved';
	if (status === 'rejected') return 'rejected';
	if (status === 'expired') return 'expired';
	return 'pending';
};

const fetchElders = async (showError = true) => {
	loading.value = true;
	try {
		const res = await request('/relation/elders');
		const rows = Array.isArray(res.data) ? res.data : [];
		for (const elder of rows) {
			try {
				const statusRes = await request(`/relation/elder_status/${elder.id}`);
				elder.status = statusRes.data || {};
			} catch (err) {
				elder.status = {};
			}
		}
		elders.value = rows;
	} catch (err) {
		elders.value = [];
		if (showError) {
			uni.showToast({ title: err.message || '加载失败', icon: 'none' });
		}
	} finally {
		loading.value = false;
	}
};

const fetchBindRequests = async (showError = true) => {
	if (!isChild.value) return;
	bindRequestsLoading.value = true;
	try {
		const res = await request('/relation/my_bind_requests');
		bindRequests.value = Array.isArray(res.data) ? res.data : [];
	} catch (err) {
		bindRequests.value = [];
		if (showError) {
			uni.showToast({ title: err.message || '加载绑定申请失败', icon: 'none' });
		}
	} finally {
		bindRequestsLoading.value = false;
	}
};

const fetchPendingRequests = async (showError = true) => {
	if (isChild.value) return;
	try {
		const res = await request('/relation/pending_requests');
		const rows = Array.isArray(res.data) ? res.data : [];
		pendingRequests.value = rows;
		if (rows.length > 0 && rows.length !== announcedPendingCount.value) {
			speak(`您有${rows.length}条待确认的绑定申请`);
			uni.showToast({ title: `您有${rows.length}条绑定申请`, icon: 'none' });
		}
		announcedPendingCount.value = rows.length;
	} catch (err) {
		pendingRequests.value = [];
		if (showError) {
			uni.showToast({ title: err.message || '加载绑定申请失败', icon: 'none' });
		}
	}
};

const refreshHome = async () => {
	if (!loadUser()) return;
	if (isChild.value) {
		pendingRequests.value = [];
		await Promise.all([fetchElders(false), fetchBindRequests(false)]);
		return;
	}
	bindRequests.value = [];
	await fetchPendingRequests(false);
};

const openBind = () => {
	showBindModal.value = true;
};

const sendBindRequest = async (username) => {
	const targetUsername = String(username || '').trim();
	if (!targetUsername) {
		uni.showToast({ title: '请输入长辈用户名', icon: 'none' });
		return null;
	}
	const res = await request('/relation/request_bind', 'POST', { elder_username: targetUsername });
	await Promise.all([fetchElders(false), fetchBindRequests(false)]);
	return res;
};

const requestBind = async () => {
	try {
		const res = await sendBindRequest(elderUsername.value);
		if (!res) return;
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

const reapplyBind = (item) => {
	uni.showModal({
		title: '重新发起绑定',
		content: `确认重新向 ${item.elder_nickname || item.elder_username} 发起绑定申请吗？`,
		success: async (res) => {
			if (!res.confirm) return;
			try {
				const result = await sendBindRequest(item.elder_username);
				if (!result) return;
				uni.showModal({
					title: '已重新发送',
					content: `新的验证码：${result.data.verify_code}\n有效期至：${result.data.expires_at}`,
					confirmText: '知道了'
				});
			} catch (err) {
				uni.showToast({ title: err.message || '重新发起失败', icon: 'none' });
			}
		}
	});
};

const navigateTo = (url) => {
	uni.navigateTo({ url });
};

const openPendingRequests = () => {
	uni.navigateTo({ url: '/pages/bind-requests/bind-requests' });
};

const goElderDetail = (elder) => {
	uni.navigateTo({
		url: `/pages/child/elder-status/elder-status?id=${elder.id}&name=${encodeURIComponent(elder.nickname || elder.username)}`
	});
};

const handleLogout = () => {
	uni.showModal({
		title: '退出登录',
		content: '确定要退出当前账号吗？',
		success: (res) => {
			if (res.confirm) {
				uni.removeStorageSync('token');
				uni.removeStorageSync('user');
				uni.reLaunch({ url: '/pages/login/login' });
			}
		}
	});
};

const handleEmergency = () => {
	speak('正在为您发起紧急呼救');
	uni.showModal({
		title: '紧急呼救',
		content: '确定要发起紧急呼救吗？系统将立即通知您的子女并发送定位。',
		confirmText: '立即发送',
		confirmColor: '#E74C3C',
		success: async (res) => {
			if (!res.confirm) return;
			uni.getLocation({
				type: 'wgs84',
				success: async (locRes) => {
					try {
						await request('/emergency/call', 'POST', {
							lat: locRes.latitude,
							lng: locRes.longitude,
							address: '正在通过定位获取具体地址...'
						});
						uni.showToast({ title: '已发送求助信号', icon: 'success' });
						const profile = await request('/user/profile');
						const phone = profile.data?.emergency_phone;
						if (phone) {
							uni.makePhoneCall({ phoneNumber: String(phone).split(',')[0] });
						}
					} catch (err) {
						uni.showToast({ title: '求助发送失败，请直接拨打电话', icon: 'none' });
					}
				},
				fail: () => {
					uni.showToast({ title: '无法获取位置，请直接拨打电话', icon: 'none' });
				}
			});
		}
	});
};

onMounted(() => {
	if (!loadUser()) return;
	speak(`欢迎回来，${user.value.nickname || user.value.username || '朋友'}`);
});

onShow(() => {
	if (!loadUser()) return;
	refreshHome();
});
</script>

<style lang="scss" scoped>
.home-page {
	padding-bottom: 60rpx;
}

.hero {
	background: linear-gradient(135deg, $card-bg 0%, $main-color-light 100%);
	border: $border-width solid $main-color-light;
}

.hero-top,
.section-head,
.modal-actions,
.elder-card,
.elder-main {
	display: flex;
	align-items: center;
}

.hero-top,
.section-head,
.elder-card {
	justify-content: space-between;
}

.hero-actions,
.elder-list,
.elder-tags {
	display: flex;
	flex-direction: column;
}

.hero-actions {
	gap: $spacing-sm;
	margin-top: $spacing-sm;
}

.hero-chip {
	padding: $spacing-xs $spacing-sm;
	border-radius: $radius-circle;
	font-size: $font-size-xs;
	font-weight: $font-weight-bold;
	background-color: $secondary-color-light;
	color: $secondary-color;
}

.hero-chip.warning {
	background-color: #FFF3E0;
	color: #C96B00;
}

.elder-list {
	gap: $spacing-sm;
	margin-top: $spacing-sm;
}

.elder-card,
.bind-request-top {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.elder-card {
	padding: $spacing-base;
	border-radius: $radius-base;
	background-color: $card-bg-alt;
	gap: $spacing-sm;
	transition: all $transition-base;
	
	&:active {
		background-color: $input-bg;
	}
}

.avatar {
	width: 88rpx;
	height: 88rpx;
	border-radius: 50%;
	background-color: $main-color-light;
	color: $main-color;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: $font-size-base;
	font-weight: $font-weight-bold;
}

.elder-info {
	flex: 1;
}

.elder-name {
	font-size: $font-size-base;
	font-weight: $font-weight-bold;
	color: $text-primary;
	margin-bottom: $spacing-xs;
}

.elder-tags {
	gap: $spacing-xs;
	align-items: flex-end;
}

.bind-request-list,
.request-meta,
.request-actions,
.bind-alert-list {
	display: flex;
	flex-direction: column;
}

.bind-request-list,
.bind-alert-list {
	gap: $spacing-sm;
	margin-top: $spacing-sm;
}

.bind-request-card,
.pending-brief {
	padding: $spacing-base;
	border-radius: $radius-base;
	background-color: $card-bg-alt;
}

.request-meta,
.request-actions {
	gap: $spacing-xs;
	margin-top: $spacing-sm;
}

.request-status {
	padding: $spacing-xs $spacing-sm;
	border-radius: $radius-circle;
	font-size: $font-size-xs;
	font-weight: $font-weight-bold;
}

.request-status.pending {
	background-color: #FFF5E6;
	color: $secondary-color;
}

.request-status.approved {
	background-color: #ECFDF3;
	color: #177245;
}

.request-status.rejected,
.request-status.expired {
	background-color: #FFF1F2;
	color: #C2410C;
}

.request-code {
	font-size: $font-size-base;
	font-weight: $font-weight-bold;
	color: $main-color;
	letter-spacing: 4rpx;
}

.bind-alert-card.highlighted {
	background: linear-gradient(135deg, #FFF9EE 0%, #FFFFFF 100%);
	border: 2rpx solid #F1D7A5;
}

.pending-brief-name {
	font-size: $font-size-base;
	font-weight: $font-weight-bold;
	color: $text-primary;
	margin-bottom: $spacing-xs;
}

.modal-actions {
	flex-direction: row;
	justify-content: space-between;
}

.modal-actions button {
	flex: 1;
}
</style>
