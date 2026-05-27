<template>
	<view class="page-container detail-page senior-high-contrast senior-large-font">
		<view v-if="loading" class="loading-state">
			<text class="senior-text-body">加载中...</text>
		</view>

		<view v-else-if="!detail.id" class="empty-state">
			<text class="empty-emoji">🎭</text>
			<text class="senior-text-body">未找到该戏曲信息</text>
		</view>

		<template v-else>
			<!-- 封面区域 -->
			<view class="detail-hero" :style="getCoverStyle(detail)">
				<text class="hero-emoji">🎵</text>
				<view v-if="detail.category" class="hero-category">{{ detail.category }}</view>
			</view>

			<!-- 内容卡片 -->
			<view class="detail-card senior-card">
				<text class="detail-name">{{ detail.name }}</text>
				<text class="detail-intro senior-text-helper">{{ detail.intro }}</text>

				<view class="divider"></view>

				<view class="section">
					<view class="section-header">
						<text class="section-icon">📖</text>
						<text class="section-title">剧情简介</text>
					</view>
					<text class="section-text senior-text-body">{{ detail.story }}</text>
				</view>
			</view>
		</template>
	</view>
</template>

<script setup>
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { request } from '../../utils/request';

const detail = ref({});
const loading = ref(false);

const categoryColors = {
	'豫剧': ['#E74C3C', '#FADBD8'],
	'京剧': ['#D4AC0D', '#FEF9E7'],
	'黄梅戏': ['#27AE60', '#D5F5E3'],
	'越剧': ['#8E44AD', '#E8DAEF'],
	'评剧': ['#2980B9', '#D6EAF8'],
	'昆曲': ['#E67E22', '#FDEBD0']
};

const getCoverStyle = (item) => {
	const colors = categoryColors[item.category] || ['#667eea', '#e8eaf6'];
	return {
		background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`
	};
};

const loadDetail = async (id) => {
	loading.value = true;
	try {
		const res = await request(`/opera/detail/${id}`, 'GET', {}, { showLoading: false });
		detail.value = res.data || {};
		if (detail.value.name) {
			uni.setNavigationBarTitle({ title: detail.value.name });
		}
	} catch (err) {
		uni.showToast({ title: '加载失败', icon: 'none' });
	} finally {
		loading.value = false;
	}
};

onLoad((options) => {
	if (options && options.id) {
		loadDetail(options.id);
	}
});
</script>

<style lang="scss" scoped>
.detail-page {
	background-color: $bg-primary;
	min-height: 100vh;
}

.detail-hero {
	width: 100%;
	height: 360rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
}

.hero-emoji {
	font-size: 120rpx;
}

.hero-category {
	position: absolute;
	bottom: $spacing-md;
	right: $spacing-lg;
	background: rgba(255, 255, 255, 0.85);
	padding: $spacing-xs $spacing-md;
	border-radius: $radius-full;
	font-size: $fs-14;
	font-weight: $fw-bold;
	color: $text-primary;
}

.detail-card {
	margin: -$spacing-lg $spacing-md 0;
	padding: $spacing-lg;
	border-radius: $radius-lg;
	background-color: $card-bg;
	box-shadow: $shadow-md;
	position: relative;
	z-index: 1;
}

.detail-name {
	font-size: $fs-22;
	font-weight: $fw-bold;
	color: $text-primary;
	display: block;
	margin-bottom: $spacing-sm;
}

.detail-intro {
	font-size: $fs-16;
	color: $text-secondary;
	line-height: $line-height-relaxed;
	display: block;
	margin-bottom: $spacing-md;
}

.divider {
	height: 2rpx;
	background-color: $border-light;
	margin: $spacing-lg 0;
}

.section {
	margin-top: $spacing-sm;
}

.section-header {
	display: flex;
	align-items: center;
	margin-bottom: $spacing-md;
}

.section-icon {
	font-size: 40rpx;
	margin-right: $spacing-sm;
}

.section-title {
	font-size: $fs-18;
	font-weight: $fw-bold;
	color: $text-primary;
}

.section-text {
	font-size: $fs-16;
	color: $text-secondary;
	line-height: 2;
	text-align: justify;
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
