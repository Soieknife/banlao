<template>
	<view class="page-container home-page">
		<AppSidebar active-path="/pages/index/index" />

		<view class="hero card-elder">
			<view class="hero-top">
				<view>
					<view class="text-title">{{ greetingTitle }}</view>
					<view class="text-helper">{{ isChild ? '看看今天家人的状态' : '常用功能已经为您排好，轻松一点就能用' }}</view>
				</view>
				<view v-if="isChild" class="hero-chip">守护中</view>
			</view>
			<view class="hero-actions">
				<button
					v-if="isChild"
					class="btn-elder small-btn"
					@click="primaryElder ? goElderDetail(primaryElder) : openBind()"
				>
					{{ primaryElder ? '查看守护详情' : '去绑定长辈' }}
				</button>
				<button class="btn-elder light-btn small-btn" @click="handleLogout">退出登录</button>
			</view>
		</view>



		<view v-if="isChild" class="card-elder">
			<view class="section-head">
				<view>
					<view class="text-title">守护中的长辈</view>
					<view class="text-helper">随时看看家人的提醒、紧急联系人和会员情况</view>
				</view>
				<button class="btn-elder compact-btn" @click="openBind">绑定长辈</button>
			</view>

			<view v-if="loading" class="text-helper">加载中...</view>
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

		<view v-else class="grid-container">
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

		<view v-if="showBindModal" class="modal-overlay">
			<view class="modal card-elder">
				<view class="text-title">绑定长辈账号</view>
				<view class="text-helper">输入长辈用户名，系统会生成验证码，长辈在同一个应用里确认即可。</view>
				<input v-model="elderUsername" class="bind-input" placeholder="请输入长辈用户名" />
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
const showBindModal = ref(false);
const elderUsername = ref('');

const isChild = computed(() => user.value.role === 'child');
const primaryElder = computed(() => elders.value[0] || null);
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
	user.value = JSON.parse(storedUser);
	return true;
};

const fetchElders = async () => {
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
		uni.showToast({ title: err.message || '加载失败', icon: 'none' });
	} finally {
		loading.value = false;
	}
};

const refreshHome = async () => {
	if (!loadUser()) return;
	if (isChild.value) {
		await fetchElders();
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
		fetchElders();
	} catch (err) {
		uni.showToast({ title: err.message || '发起绑定失败', icon: 'none' });
	}
};

const navigateTo = (url) => {
	uni.navigateTo({ url });
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
	refreshHome();
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
	background: linear-gradient(135deg, #ffffff 0%, #eef6ff 100%);
	border: 2rpx solid #d9e9ff;
}

.hero-top,
.section-head,
.bind-row,
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
	gap: 16rpx;
	margin-top: 26rpx;
}

.small-btn {
	height: 84rpx;
	line-height: 84rpx;
	font-size: 30rpx;
}

.compact-btn {
	height: 82rpx;
	line-height: 82rpx;
	font-size: 28rpx;
	padding: 0 28rpx;
}

.light-btn {
	background-color: #f2f6fb;
	color: #345;
	box-shadow: none;
}

.hero-chip {
	padding: 10rpx 20rpx;
	border-radius: 999rpx;
	font-size: 24rpx;
	font-weight: bold;
	background-color: #fff5e6;
	color: $secondary-color;
}

.bind-card {
	border-left: 10rpx solid $secondary-color;
}

.bind-row,
.modal-actions,
.elder-main {
	gap: 16rpx;
}

.bind-input {
	flex: 1;
	height: 90rpx;
	border-radius: 16rpx;
	border: 2rpx solid #d7deea;
	background-color: #fff;
	padding: 0 20rpx;
	font-size: 32rpx;
}

.inline-link {
	margin-top: 16rpx;
	display: inline-block;
	font-size: 26rpx;
	color: $main-color;
	text-decoration: underline;
}

.empty-state {
	padding: 30rpx 0 10rpx;
	text-align: center;
}

.elder-list {
	gap: 18rpx;
	margin-top: 24rpx;
}

.elder-card {
	padding: 26rpx;
	border-radius: 20rpx;
	background-color: #f8fbff;
	gap: 20rpx;
}

.avatar {
	width: 88rpx;
	height: 88rpx;
	border-radius: 44rpx;
	background-color: #ebf3ff;
	color: $main-color;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 36rpx;
	font-weight: bold;
}

.elder-info {
	flex: 1;
}

.elder-name {
	font-size: 34rpx;
	font-weight: bold;
	color: #333;
	margin-bottom: 8rpx;
}

.elder-tags {
	gap: 10rpx;
	align-items: flex-end;
}

.tag {
	font-size: 22rpx;
	padding: 6rpx 14rpx;
	border-radius: 14rpx;
	background-color: #f5f7fa;
	color: #666;
}

.tag.vip {
	background-color: #fff5e6;
	color: $secondary-color;
}

.tag.free {
	background-color: #f0f0f0;
	color: #999;
}

.tag.info {
	background-color: #ebf3ff;
	color: $main-color;
}

.tag.ok {
	background-color: #e7f9ee;
	color: #2ecc71;
}

.tag.warn {
	background-color: #fff1f1;
	color: $warning-color;
}

.grid-container {
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
	gap: 22rpx 0;
}

.grid-item {
	width: 48%;
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	padding: 40rpx 20rpx;
	box-sizing: border-box;
}

.icon-wrap {
	width: 120rpx;
	height: 120rpx;
	background-color: #ebf3ff;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 20rpx;
}

.grid-emoji {
	font-size: 60rpx;
	line-height: 1;
}

.emergency-btn {
	width: 100%;
	background-color: #fff5f5;
	border: 2rpx solid #ffdcdc;
}

.emergency-btn .icon-wrap {
	background-color: #ffe5e5;
}

.emergency-btn .text-title {
	color: $warning-color;
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
</style>
