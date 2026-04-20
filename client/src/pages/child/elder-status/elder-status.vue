<template>
	<view class="page-container">
		<view class="card-elder header-card">
			<view class="text-title">{{ elderName }}</view>
			<view class="text-helper">长辈状态与管理</view>
		</view>

		<view class="card-elder">
			<view class="section-title">概览</view>
			<view class="grid">
				<view class="grid-item">
					<view class="label">服药状态</view>
					<view :class="['value', status.health?.medication_taken ? 'ok' : 'warn']">
						{{ status.health?.medication_taken ? '已服药' : '未服药' }}
					</view>
				</view>
				<view class="grid-item">
					<view class="label">待办提醒</view>
					<view class="value">{{ status.reminders?.length || 0 }}</view>
				</view>
			</view>
		</view>

		<view class="card-elder">
			<view class="section-title">管理功能</view>
			<view class="menu">
				<view class="menu-item" @click="goReminderManage">
					<view class="menu-left">
						<view class="menu-title">提醒管理</view>
						<view class="menu-desc">设置用药/日常提醒与重复规则</view>
					</view>
					<view class="menu-right">›</view>
				</view>
				<view class="menu-item" @click="goEmergencySettings">
					<view class="menu-left">
						<view class="menu-title">紧急联系人</view>
						<view class="menu-desc">{{ profile.emergency_phone ? '已设置紧急电话' : '未设置紧急电话' }}</view>
					</view>
					<view class="menu-right">›</view>
				</view>
				<view class="menu-item" @click="goVipPurchase">
					<view class="menu-left">
						<view class="menu-title">会员开通</view>
						<view class="menu-desc">{{ profile.is_vip ? '已开通（可续费）' : '未开通（可开通 AI 陪聊）' }}</view>
					</view>
					<view class="menu-right">›</view>
				</view>
				<view class="menu-item" @click="goLogs">
					<view class="menu-left">
						<view class="menu-title">活动记录</view>
						<view class="menu-desc">查看长辈近期动态</view>
					</view>
					<view class="menu-right">›</view>
				</view>
				<view class="menu-item danger" @click="unbind">
					<view class="menu-left">
						<view class="menu-title">解绑该长辈</view>
						<view class="menu-desc">解除守护关系（可重新绑定）</view>
					</view>
					<view class="menu-right">›</view>
				</view>
			</view>
		</view>

		<view class="card-elder">
			<view class="section-title">待办提醒</view>
			<view v-if="status.reminders?.length === 0" class="text-helper">暂无待办</view>
			<view v-for="item in status.reminders" :key="item.id" class="rem-item">
				<view>
					<view class="text-content">{{ item.title }}</view>
					<view class="text-helper">{{ item.remind_time }}</view>
				</view>
				<view class="pill">待完成</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { request } from '../../../utils/request';

const elderId = ref('');
const elderName = ref('');
const status = ref({ health: {}, reminders: [] });
const profile = ref({ is_vip: 0, vip_expire: '', emergency_phone: '', emergency_contact: '' });

onLoad((opt) => {
	elderId.value = opt.id;
	elderName.value = decodeURIComponent(opt.name || '');
});

const fetchStatus = async () => {
	try {
		const res = await request(`/relation/elder_status/${elderId.value}`);
		status.value = res.data || { health: {}, reminders: [] };
	} catch (err) {
		uni.showToast({ title: err.message || '加载失败', icon: 'none' });
	}
};

const fetchProfile = async () => {
	try {
		const res = await request(`/relation/elder_profile/${elderId.value}`);
		profile.value = res.data || { is_vip: 0, vip_expire: '', emergency_phone: '', emergency_contact: '' };
	} catch (err) {
		profile.value = { is_vip: 0, vip_expire: '', emergency_phone: '', emergency_contact: '' };
	}
};

const goReminderManage = () => {
	uni.navigateTo({ url: `/pages/child/reminder-manage/reminder-manage?id=${elderId.value}&name=${encodeURIComponent(elderName.value)}` });
};

const goEmergencySettings = () => {
	uni.navigateTo({ url: `/pages/child/emergency-settings/emergency-settings?id=${elderId.value}&name=${encodeURIComponent(elderName.value)}` });
};

const goVipPurchase = () => {
	uni.navigateTo({ url: `/pages/child/vip-purchase/vip-purchase?id=${elderId.value}&name=${encodeURIComponent(elderName.value)}` });
};

const goLogs = () => {
	uni.navigateTo({ url: `/pages/child/activity-logs/activity-logs?id=${elderId.value}&name=${encodeURIComponent(elderName.value)}` });
};

const unbind = () => {
	uni.showModal({
		title: '解绑长辈',
		content: '确定要解除与该长辈的绑定关系吗？解绑后将无法查看其信息与设置提醒。',
		confirmText: '确定解绑',
		confirmColor: '#E74C3C',
		success: async (res) => {
			if (!res.confirm) return;
			try {
				await request('/relation/unbind', 'POST', { elder_id: elderId.value });
				uni.showToast({ title: '解绑成功', icon: 'success' });
				setTimeout(() => {
					uni.reLaunch({ url: '/pages/index/index' });
				}, 800);
			} catch (err) {
				uni.showToast({ title: err.message || '解绑失败', icon: 'none' });
			}
		}
	});
};

onMounted(() => {
	fetchStatus();
	fetchProfile();
});
</script>

<style lang="scss" scoped>
.header-card {
	border-left: 10rpx solid $main-color;
}

.section-title {
	font-size: 34rpx;
	font-weight: bold;
	margin-bottom: 20rpx;
	color: #333;
}

.grid {
	display: flex;
	justify-content: space-between;
	gap: 20rpx;
}

.grid-item {
	flex: 1;
	background-color: #F5F7FA;
	border-radius: 16rpx;
	padding: 24rpx;
}

.label {
	font-size: 28rpx;
	color: #666;
	margin-bottom: 10rpx;
}

.value {
	font-size: 40rpx;
	font-weight: bold;
	color: #333;
}

.ok {
	color: #2ECC71;
}

.warn {
	color: $warning-color;
}

.menu {
	display: flex;
	flex-direction: column;
}

.menu-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 24rpx 0;
	border-bottom: 1rpx solid #eee;
}

.menu-item:last-child {
	border-bottom: none;
}

.menu-left {
	display: flex;
	flex-direction: column;
	gap: 6rpx;
}

.menu-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
}

.menu-desc {
	font-size: 26rpx;
	color: #999;
}

.menu-right {
	font-size: 44rpx;
	color: #bbb;
	padding-left: 20rpx;
}

.menu-item.danger .menu-title {
	color: $warning-color;
}

.rem-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 20rpx 0;
	border-bottom: 1rpx solid #eee;
}

.pill {
	font-size: 24rpx;
	padding: 6rpx 14rpx;
	border-radius: 14rpx;
	background-color: #FFF5E6;
	color: $secondary-color;
}
</style>
