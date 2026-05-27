<template>
	<view class="page-container detail-page senior-high-contrast senior-large-font">
		<view v-if="loading" class="loading-state">
			<text class="senior-text-body">加载中...</text>
		</view>

		<view v-else-if="!detail.id" class="empty-state">
			<text class="empty-emoji">🛡️</text>
			<text class="senior-text-body">未找到该文章</text>
		</view>

		<template v-else>
			<!-- 文章内容卡片 -->
			<view class="detail-card senior-card">
				<view v-if="detail.category" class="detail-category">{{ detail.category }}</view>
				<text class="detail-title">{{ detail.title }}</text>
				<view class="detail-meta">
					<text class="detail-time">{{ formatDate(detail.created_at) }}</text>
					<text class="detail-views">{{ detail.view_count || 0 }} 人阅读</text>
				</view>

				<view class="divider"></view>

				<text class="detail-content">{{ detail.content }}</text>
			</view>

			<!-- 防骗小提示 -->
			<view v-if="detail.tips" class="tips-card senior-card">
				<view class="tips-header">
					<text class="tips-icon">⚠️</text>
					<text class="tips-title">防骗小提示</text>
				</view>
				<text class="tips-text">{{ detail.tips }}</text>
			</view>

			<!-- 底部紧急热线 -->
			<view class="bottom-action senior-card">
				<text class="bottom-text">遇到可疑情况？立即拨打</text>
				<view class="call-btn" @click="callAntiFraud">
					<text class="call-icon">📞</text>
					<text class="call-number">96110</text>
				</view>
			</view>
		</template>
	</view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { request } from '../../utils/request';

const detail = ref({});
const loading = ref(false);

const formatDate = (dateStr) => {
	if (!dateStr) return '';
	const d = new Date(dateStr);
	if (isNaN(d.getTime())) return dateStr;
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const callAntiFraud = () => {
	uni.makePhoneCall({
		phoneNumber: '96110',
		fail: () => {
			uni.showToast({ title: '拨打失败，请手动拨打 96110', icon: 'none' });
		}
	});
};

const loadDetail = async (id) => {
	loading.value = true;
	try {
		const res = await request(`/anti-fraud/detail/${id}`, 'GET', {}, { showLoading: false });
		detail.value = res.data || {};
		if (detail.value.title) {
			uni.setNavigationBarTitle({ title: detail.value.title });
		}
	} catch (err) {
		uni.showToast({ title: '加载失败', icon: 'none' });
	} finally {
		loading.value = false;
	}
};

onMounted(() => {
	const pages = getCurrentPages();
	const currentPage = pages[pages.length - 1];
	const id = currentPage?.options?.id;
	if (id) {
		loadDetail(id);
	}
});
</script>

<style lang="scss" scoped>
.detail-page {
	background-color: $bg-primary;
	min-height: 100vh;
	padding: $spacing-md;
}

.detail-card {
	padding: $spacing-lg;
	border-radius: $radius-lg;
	background-color: $card-bg;
	box-shadow: $shadow-sm;
	margin-bottom: $spacing-md;
}

.detail-category {
	display: inline-block;
	font-size: $fs-12;
	color: #E65100;
	background: #FFF3E0;
	padding: 6rpx 20rpx;
	border-radius: $radius-full;
	margin-bottom: $spacing-md;
	font-weight: $fw-bold;
}

.detail-title {
	font-size: $fs-22;
	font-weight: $fw-bold;
	color: $text-primary;
	display: block;
	margin-bottom: $spacing-md;
	line-height: $line-height-relaxed;
}

.detail-meta {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: $spacing-sm;
}

.detail-time {
	font-size: $fs-12;
	color: $text-tertiary;
}

.detail-views {
	font-size: $fs-12;
	color: $text-tertiary;
}

.divider {
	height: 2rpx;
	background-color: $border-light;
	margin: $spacing-lg 0;
}

.detail-content {
	font-size: $fs-16;
	color: $text-secondary;
	line-height: 2.2;
	text-align: justify;
	white-space: pre-wrap;
}

.tips-card {
	padding: $spacing-lg;
	border-radius: $radius-lg;
	background: linear-gradient(135deg, #FFF3E0, #FFECB3);
	border: 2rpx solid #FFB74D;
	margin-bottom: $spacing-md;
}

.tips-header {
	display: flex;
	align-items: center;
	margin-bottom: $spacing-md;
}

.tips-icon {
	font-size: 40rpx;
	margin-right: $spacing-sm;
}

.tips-title {
	font-size: $fs-18;
	font-weight: $fw-bold;
	color: #E65100;
}

.tips-text {
	font-size: $fs-16;
	color: #BF360C;
	line-height: 2;
	white-space: pre-wrap;
}

.bottom-action {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: $spacing-md $spacing-lg;
	border-radius: $radius-lg;
	background-color: $card-bg;
	box-shadow: $shadow-sm;
}

.bottom-text {
	font-size: $fs-16;
	color: $text-secondary;
}

.call-btn {
	display: flex;
	align-items: center;
	background-color: #E65100;
	padding: $spacing-sm $spacing-lg;
	border-radius: $radius-full;
}

.call-icon {
	font-size: 28rpx;
	margin-right: $spacing-xs;
}

.call-number {
	font-size: $fs-18;
	font-weight: $fw-bold;
	color: #fff;
}

.loading-state,
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 200rpx 0;
}

.empty-emoji {
	font-size: 100rpx;
	margin-bottom: $spacing-md;
}
</style>
