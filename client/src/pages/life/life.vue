<template>
	<view class="page-container">
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

const weather = ref({});
const contacts = ref([]);

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
