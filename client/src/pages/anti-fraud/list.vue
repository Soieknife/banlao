<template>
	<view class="page-container fraud-page senior-high-contrast senior-large-font">
		<view class="fraud-header">
			<text class="senior-text-title">🛡️ 防诈骗专区</text>
			<text class="senior-text-helper">提高警惕，守护您的财产安全</text>
		</view>

		<!-- 紧急提醒 -->
		<view class="alert-banner senior-card">
			<text class="alert-icon">⚠️</text>
			<view class="alert-content">
				<text class="alert-title">全国反诈热线</text>
				<text class="alert-phone" @click="callAntiFraud">96110</text>
			</view>
			<view class="alert-btn" @click="callAntiFraud">拨打</view>
		</view>

		<!-- 分类筛选 -->
		<scroll-view scroll-x class="category-bar">
			<view
				class="category-tag"
				:class="{ active: activeCategory === '' }"
				@click="setCategory('')"
			>全部</view>
			<view
				v-for="cat in categories"
				:key="cat"
				class="category-tag"
				:class="{ active: activeCategory === cat }"
				@click="setCategory(cat)"
			>{{ cat }}</view>
		</scroll-view>

		<!-- 加载状态 -->
		<view v-if="loading" class="loading-state">
			<text class="senior-text-body">加载中...</text>
		</view>

		<!-- 空状态 -->
		<view v-else-if="articleList.length === 0" class="empty-state">
			<text class="empty-emoji">🛡️</text>
			<text class="senior-text-body">暂无防诈知识</text>
		</view>

		<!-- 文章列表 -->
		<scroll-view v-else scroll-y class="article-list">
			<view
				class="article-item senior-card"
				v-for="item in articleList"
				:key="item.id"
				@click="goToDetail(item)"
			>
				<view v-if="item.is_top" class="top-badge">置顶</view>
				<text class="article-title senior-text-body">{{ item.title }}</text>
				<text class="article-preview senior-text-helper">{{ item.preview }}</text>
				<view class="article-meta">
					<text class="article-category">{{ item.category || '防诈知识' }}</text>
					<text class="article-time">{{ formatDate(item.created_at) }}</text>
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { request } from '../../utils/request';

const articleList = ref([]);
const categories = ref([]);
const activeCategory = ref('');
const loading = ref(false);

const setCategory = (cat) => {
	activeCategory.value = cat;
	loadArticleList();
};

const callAntiFraud = () => {
	uni.makePhoneCall({
		phoneNumber: '96110',
		fail: () => {
			uni.showToast({ title: '拨打失败，请手动拨打 96110', icon: 'none' });
		}
	});
};

const formatDate = (dateStr) => {
	if (!dateStr) return '';
	const d = new Date(dateStr);
	if (isNaN(d.getTime())) return dateStr;
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const loadArticleList = async () => {
	loading.value = true;
	try {
		const params = {};
		if (activeCategory.value) params.category = activeCategory.value;
		const res = await request('/anti-fraud/list', 'GET', params, { showLoading: false });
		articleList.value = res.data?.list || [];
	} catch (err) {
		uni.showToast({ title: '加载失败', icon: 'none' });
	} finally {
		loading.value = false;
	}
};

const loadCategories = async () => {
	try {
		const res = await request('/anti-fraud/categories', 'GET', {}, { showLoading: false });
		categories.value = res.data || [];
	} catch (err) {
		// 静默失败
	}
};

const goToDetail = (item) => {
	uni.navigateTo({
		url: `/pages/anti-fraud/detail?id=${item.id}`
	});
};

onMounted(() => {
	loadCategories();
	loadArticleList();
});
</script>

<style lang="scss" scoped>
.fraud-page {
	padding: $spacing-md;
	background-color: $bg-primary;
	min-height: 100vh;
}

.fraud-header {
	padding: $spacing-lg $spacing-md;
	text-align: center;
	margin-bottom: $spacing-sm;
}

.alert-banner {
	display: flex;
	align-items: center;
	padding: $spacing-md $spacing-lg;
	margin-bottom: $spacing-md;
	background: linear-gradient(135deg, #FFF3E0, #FFE0B2);
	border: 2rpx solid #FFB74D;
	border-radius: $radius-lg;
}

.alert-icon {
	font-size: 56rpx;
	margin-right: $spacing-md;
}

.alert-content {
	flex: 1;
}

.alert-title {
	font-size: $fs-14;
	color: $text-secondary;
	display: block;
}

.alert-phone {
	font-size: $fs-28;
	font-weight: $fw-bold;
	color: #E65100;
	letter-spacing: 4rpx;
	display: block;
}

.alert-btn {
	background-color: #E65100;
	color: #fff;
	padding: $spacing-sm $spacing-lg;
	border-radius: $radius-full;
	font-size: $fs-16;
	font-weight: $fw-bold;
}

.category-bar {
	white-space: nowrap;
	margin-bottom: $spacing-md;
	padding: 0 $spacing-xs;
}

.category-tag {
	display: inline-block;
	padding: $spacing-xs $spacing-lg;
	margin-right: $spacing-sm;
	border-radius: $radius-full;
	font-size: $fs-14;
	color: $text-secondary;
	background-color: $card-bg;
	border: 2rpx solid $border-light;
	transition: all $transition-base;

	&.active {
		background-color: #E65100;
		color: #fff;
		border-color: #E65100;
		box-shadow: $shadow-sm;
	}
}

.article-list {
	height: calc(100vh - 540rpx);
}

.article-item {
	padding: $spacing-lg;
	margin-bottom: $spacing-md;
	border-radius: $radius-lg;
	background-color: $card-bg;
	box-shadow: $shadow-sm;
	border: 2rpx solid $border-light;
	position: relative;
	transition: all $transition-base;

	&:active {
		background-color: $card-bg-hover;
		transform: translateY(-2rpx);
		box-shadow: $shadow-md;
	}
}

.top-badge {
	position: absolute;
	top: $spacing-md;
	right: $spacing-md;
	background-color: $error-color;
	color: #fff;
	font-size: 20rpx;
	padding: 4rpx 16rpx;
	border-radius: $radius-full;
	font-weight: $fw-bold;
}

.article-title {
	font-size: $fs-18;
	font-weight: $fw-bold;
	color: $text-primary;
	display: block;
	margin-bottom: $spacing-sm;
	padding-right: 80rpx;
}

.article-preview {
	font-size: $fs-16;
	color: $text-secondary;
	line-height: $line-height-relaxed;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
	margin-bottom: $spacing-md;
}

.article-meta {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.article-category {
	font-size: $fs-12;
	color: #E65100;
	background: #FFF3E0;
	padding: 4rpx 16rpx;
	border-radius: $radius-full;
}

.article-time {
	font-size: $fs-12;
	color: $text-tertiary;
}

.loading-state,
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 120rpx 0;
}

.empty-emoji {
	font-size: 100rpx;
	margin-bottom: $spacing-md;
}
</style>
