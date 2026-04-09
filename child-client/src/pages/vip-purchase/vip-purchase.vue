<template>
	<view class="container">
		<view class="header">
			<text class="title">会员开通</text>
			<text class="subtitle">为 {{ elderName }} 开通 AI 陪聊会员</text>
		</view>

		<view class="card status">
			<text class="status-title">当前状态</text>
			<view class="status-row">
				<text class="chip" :class="profile.is_vip ? 'vip' : 'free'">{{ profile.is_vip ? 'VIP' : '未开通' }}</text>
				<text class="expire" v-if="profile.vip_expire">到期：{{ formatTime(profile.vip_expire) }}</text>
			</view>
			<text class="desc">会员开通后，老人端可使用 AI 陪聊功能（需配置 AI_KEY 才能调用大模型）。</text>
		</view>

		<view class="card">
			<view class="plans">
				<view :class="['plan', plan === 'month' ? 'active' : '']" @click="plan='month'">
					<text class="plan-title">月度会员</text>
					<text class="plan-price">¥ 19.9 / 月</text>
				</view>
				<view :class="['plan', plan === 'year' ? 'active' : '']" @click="plan='year'">
					<text class="plan-title">年度会员</text>
					<text class="plan-price">¥ 168 / 年</text>
					<text class="badge">更划算</text>
				</view>
			</view>
			<button class="pay-btn" @click="pay">模拟支付并开通</button>
		</view>
	</view>
</template>

<script setup>
import { ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { request } from '../../utils/request';

const elderId = ref('');
const elderName = ref('');
const plan = ref('month');
const profile = ref({ is_vip: 0, vip_expire: '' });

onLoad((opt) => {
	elderId.value = opt.id;
	elderName.value = opt.name;
});

const fetchProfile = async () => {
	try {
		const res = await request(`/relation/elder_profile/${elderId.value}`);
		profile.value = res.data || { is_vip: 0, vip_expire: '' };
	} catch (err) {
		uni.showToast({ title: err.message || '加载失败', icon: 'none' });
	}
};

onShow(() => {
	fetchProfile();
});

const formatTime = (iso) => {
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
</script>

<style scoped>
.container {
	padding: 20px;
	background-color: #f5f7fa;
	min-height: 100vh;
}

.header {
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

.card {
	background: #fff;
	border-radius: 12px;
	padding: 16px;
	margin-bottom: 12px;
	box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.status {
	background: linear-gradient(135deg, #F5A623, #FFD93D);
	color: #fff;
}

.status-title {
	display: block;
	font-size: 16px;
	font-weight: bold;
	margin-bottom: 10px;
}

.status-row {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-bottom: 10px;
}

.chip {
	font-size: 12px;
	padding: 4px 8px;
	border-radius: 8px;
	background-color: rgba(255,255,255,0.25);
	color: #fff;
}

.expire {
	font-size: 12px;
	opacity: 0.9;
}

.desc {
	font-size: 13px;
	line-height: 1.6;
	opacity: 0.95;
}

.plans {
	display: flex;
	gap: 12px;
}

.plan {
	flex: 1;
	border-radius: 12px;
	border: 2px solid transparent;
	padding: 14px;
	background-color: #f5f7fa;
	position: relative;
}

.plan.active {
	border-color: #F5A623;
	background-color: #FFF9F0;
}

.plan-title {
	display: block;
	font-size: 16px;
	font-weight: bold;
	color: #333;
}

.plan-price {
	display: block;
	margin-top: 6px;
	font-size: 14px;
	color: #F5A623;
	font-weight: bold;
}

.badge {
	position: absolute;
	top: -10px;
	right: -6px;
	background-color: #E74C3C;
	color: #fff;
	font-size: 10px;
	padding: 2px 6px;
	border-radius: 6px;
}

.pay-btn {
	height: 44px;
	line-height: 44px;
	border-radius: 10px;
	background-color: #F5A623;
	color: #fff;
	font-size: 16px;
	font-weight: bold;
	margin-top: 14px;
}
</style>

