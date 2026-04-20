<template>
	<view class="page-container">
		<AppSidebar active-path="/pages/life/life" />

		<!-- 天气卡片 -->
		<view class="card-elder weather-card">
			<view class="weather-header">
				<text class="city">{{ weather.city }}</text>
				<text class="date">今天</text>
			</view>
			<view class="weather-main">
				<text class="temp">{{ weather.temp }}°</text>
				<text class="weather-text">{{ weather.weather }}</text>
			</view>
			<view class="weather-info">
				<text>湿度 {{ weather.humidity }}</text>
				<text>风力 {{ weather.wind }}</text>
			</view>
			<view class="weather-advice">
				<text class="text-content">💡 温馨提示：{{ weather.advice }}</text>
			</view>
		</view>

		<view class="text-title">我的子女</view>
		<view v-if="childrenLoading" class="card-elder">
			<view class="text-content">正在加载...</view>
		</view>
		<view v-else>
			<view v-if="children.length === 0" class="card-elder">
				<view class="text-content">暂无绑定的子女</view>
				<view class="text-helper">请让家人发起绑定申请，然后在首页输入验证码确认。</view>
			</view>
			<view v-for="c in children" :key="c.id" class="card-elder child-card">
				<view class="contact-info" @click="c.phone ? makeCall(c.phone) : null">
					<text class="contact-name">{{ c.nickname || c.username }}</text>
					<text class="contact-phone">{{ c.phone || '未填写电话' }}</text>
				</view>
				<view class="child-actions">
					<view class="call-btn btn-elder small-btn" @click="c.phone ? makeCall(c.phone) : null">拨打</view>
					<view class="unbind-btn" @click="removeChild(c)">解绑</view>
				</view>
			</view>
		</view>

		<!-- 常用电话列表 -->
		<view class="text-title">常用电话</view>
		<view v-for="contact in contacts" :key="contact.phone" class="card-elder contact-card" @click="makeCall(contact.phone)">
			<view class="contact-info">
				<text class="contact-name">{{ contact.name }}</text>
				<text class="contact-phone">{{ contact.phone }}</text>
			</view>
			<view class="call-btn btn-elder small-btn">拨打</view>
		</view>
	</view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { request } from '../../utils/request';
import { speak } from '../../utils/voice';
import AppSidebar from '../../components/AppSidebar.vue';

const weather = ref({});
const contacts = ref([]);
const children = ref([]);
const childrenLoading = ref(false);

/**
 * 获取天气和联系人
 */
const fetchData = async () => {
	try {
		const [weatherRes, contactsRes] = await Promise.all([
			request('/life/weather'),
			request('/life/contacts')
		]);
		weather.value = weatherRes.data;
		contacts.value = contactsRes.data;
		
		speak(`今天天气${weather.value.weather}，气温${weather.value.temp}度。${weather.value.advice}`);
	} catch (err) {
		console.error('获取数据失败', err);
	}
};

const fetchChildren = async () => {
	childrenLoading.value = true;
	try {
		const res = await request('/relation/my_children');
		children.value = res.data || [];
	} catch (err) {
		children.value = [];
	} finally {
		childrenLoading.value = false;
	}
};

const removeChild = (c) => {
	uni.showModal({
		title: '解绑子女',
		content: '确定要解绑该子女账号吗？解绑后对方将无法再查看或管理您的信息。',
		confirmText: '确定解绑',
		confirmColor: '#E74C3C',
		success: async (res) => {
			if (!res.confirm) return;
			try {
				await request('/relation/remove_child', 'POST', { child_id: c.id });
				uni.showToast({ title: '解绑成功', icon: 'success' });
				fetchChildren();
			} catch (err) {
				uni.showToast({ title: err.message || '解绑失败', icon: 'none' });
			}
		}
	});
};

/**
 * 拨打电话
 * @param {string} phone - 电话号码
 */
const makeCall = (phone) => {
	uni.makePhoneCall({
		phoneNumber: phone,
		success: () => {
			console.log('拨打成功');
		}
	});
};

onMounted(() => {
	fetchData();
	fetchChildren();
});
</script>

<style lang="scss" scoped>
.weather-card {
	background: linear-gradient(135deg, #4A90E2, #67B0F0);
	color: #FFFFFF;
	padding: 50rpx;
}

.weather-header {
	display: flex;
	justify-content: space-between;
	font-size: 36rpx;
	margin-bottom: 20rpx;
}

.weather-main {
	display: flex;
	align-items: center;
	margin-bottom: 30rpx;
}

.temp {
	font-size: 100rpx;
	font-weight: bold;
	margin-right: 30rpx;
}

.weather-text {
	font-size: 48rpx;
}

.weather-info {
	display: flex;
	gap: 40rpx;
	font-size: 32rpx;
	margin-bottom: 30rpx;
}

.weather-advice {
	background-color: rgba(255, 255, 255, 0.2);
	padding: 20rpx;
	border-radius: 16rpx;
	.text-content {
		color: #FFFFFF;
		font-size: 32rpx;
	}
}

.contact-card {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.child-card {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.child-actions {
	display: flex;
	align-items: center;
	gap: 16rpx;
}

.unbind-btn {
	height: 80rpx;
	line-height: 80rpx;
	padding: 0 30rpx;
	font-size: 32rpx;
	border-radius: 16rpx;
	background-color: #FFF5F5;
	color: $warning-color;
	border: 1rpx solid #FFDCDC;
}

.contact-name {
	font-size: 38rpx;
	font-weight: bold;
	display: block;
	margin-bottom: 10rpx;
}

.contact-phone {
	font-size: 34rpx;
	color: #666666;
}

.small-btn {
	height: 80rpx;
	line-height: 80rpx;
	padding: 0 40rpx;
	font-size: 32rpx;
}
</style>
