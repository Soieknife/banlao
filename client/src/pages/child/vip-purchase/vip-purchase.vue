<template>
	<view class="page-container">
		<view class="card-elder header-card">
			<view class="text-title">会员开通</view>
			<view class="text-helper">为 {{ elderName }} 开通 AI 陪聊会员</view>
		</view>

		<view class="card-elder vip-card">
			<view class="row">
				<view class="text-title">当前状态</view>
				<view class="pill" :class="profile.is_vip ? 'vip' : 'free'">{{ profile.is_vip ? 'VIP' : '未开通' }}</view>
			</view>
			<view v-if="profile.vip_expire" class="text-helper">到期：{{ formatDate(profile.vip_expire) }}</view>
			<view class="text-content">开通后，老人端可使用 AI 陪聊功能（需后端配置 AI_KEY 才能调用大模型）。</view>
		</view>

		<view class="card-elder">
			<view class="plans">
				<view :class="['plan', plan==='month' ? 'active' : '']" @click="plan='month'">
					<view class="text-title">月度会员</view>
					<view class="price">¥ 19.9 / 月</view>
				</view>
				<view :class="['plan', plan==='year' ? 'active' : '']" @click="plan='year'">
					<view class="text-title">年度会员</view>
					<view class="price">¥ 168 / 年</view>
					<view class="badge">更划算</view>
				</view>
			</view>
			<button class="btn-elder buy-btn" @click="pay">模拟支付并开通</button>
		</view>
	</view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { request } from '../../../utils/request';

const elderId = ref('');
const elderName = ref('');
const plan = ref('month');
const profile = ref({ is_vip: 0, vip_expire: '' });

onLoad((opt) => {
	elderId.value = opt.id;
	elderName.value = decodeURIComponent(opt.name || '');
});

const fetchProfile = async () => {
	try {
		const res = await request(`/relation/elder_profile/${elderId.value}`);
		profile.value = res.data || { is_vip: 0, vip_expire: '' };
	} catch (err) {
		uni.showToast({ title: err.message || '加载失败', icon: 'none' });
	}
};

const formatDate = (iso) => {
	if (!iso) return '';
	const d = new Date(iso);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const pay = () => {
	uni.showModal({
		title: '模拟支付',
		content: plan.value === 'year' ? '确认支付 168 元开通年度会员？' : '确认支付 19.9 元开通月度会员？',
		confirmText: '确认支付',
		confirmColor: '#4A90E2',
		success: async (res) => {
			if (!res.confirm) return;
			try {
				const r = await request('/relation/purchase_vip', 'POST', { elder_id: elderId.value, plan: plan.value });
				uni.showToast({ title: '开通成功', icon: 'success' });
				profile.value.is_vip = 1;
				profile.value.vip_expire = r.data.vip_expire;
			} catch (err) {
				uni.showToast({ title: err.message || '开通失败', icon: 'none' });
			}
		}
	});
};

onMounted(() => {
	fetchProfile();
});
</script>

<style lang="scss" scoped>
.header-card {
	border-left: 10rpx solid $secondary-color;
}

.vip-card {
	background: linear-gradient(135deg, #F5A623, #FFD93D);
	.text-title, .text-helper, .text-content {
		color: #fff;
	}
}

.row {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.pill {
	font-size: 24rpx;
	padding: 6rpx 14rpx;
	border-radius: 14rpx;
	background-color: rgba(255, 255, 255, 0.25);
	color: #fff;
}

.plans {
	display: flex;
	gap: 20rpx;
}

.plan {
	flex: 1;
	position: relative;
	background-color: #F5F7FA;
	border-radius: 20rpx;
	padding: 30rpx;
	border: 2rpx solid transparent;
}

.plan.active {
	border-color: #F5A623;
	background-color: #FFF9F0;
}

.price {
	margin-top: 10rpx;
	font-size: 30rpx;
	color: $secondary-color;
	font-weight: bold;
}

.badge {
	position: absolute;
	top: -16rpx;
	right: -10rpx;
	background-color: $warning-color;
	color: #fff;
	font-size: 20rpx;
	padding: 4rpx 10rpx;
	border-radius: 10rpx;
}

.buy-btn {
	margin-top: 24rpx;
	background-color: #F5A623;
}
</style>

