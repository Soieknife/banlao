<template>
	<view class="page-container opera-page senior-high-contrast senior-large-font">
		<view class="opera-header">
			<text class="senior-text-title">🎭 戏曲天地</text>
			<text class="senior-text-helper">国粹经典，品味传统文化之美</text>
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
		<view v-else-if="operaList.length === 0" class="empty-state">
			<text class="empty-emoji">🎭</text>
			<text class="senior-text-body">暂无戏曲内容</text>
		</view>

		<!-- 戏曲列表 -->
		<scroll-view v-else scroll-y class="opera-list">
			<view
				class="opera-item senior-card"
				v-for="item in operaList"
				:key="item.id"
				@click="goToDetail(item)"
			>
				<view class="opera-cover-box" :style="getCoverStyle(item)">
					<text class="opera-cover-emoji">🎵</text>
					<view v-if="item.category" class="opera-category-badge">{{ item.category }}</view>
				</view>
				<view class="opera-info">
					<text class="opera-name senior-text-body">{{ item.name }}</text>
					<text class="opera-intro senior-text-helper">{{ item.intro }}</text>
				</view>
				<text class="opera-arrow">›</text>
			</view>
		</scroll-view>
	</view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { request } from '../../utils/request';

const operaList = ref([]);
const categories = ref([]);
const activeCategory = ref('');
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

const setCategory = (cat) => {
	activeCategory.value = cat;
	loadOperaList();
};

const loadOperaList = async () => {
	loading.value = true;
	try {
		const params = {};
		if (activeCategory.value) params.category = activeCategory.value;
		const res = await request('/opera/list', 'GET', params, { showLoading: false });
		operaList.value = res.data?.list || [];
	} catch (err) {
		uni.showToast({ title: '加载失败', icon: 'none' });
	} finally {
		loading.value = false;
	}
};

const loadCategories = async () => {
	try {
		const res = await request('/opera/categories', 'GET', {}, { showLoading: false });
		categories.value = res.data || [];
	} catch (err) {
		// 静默失败
	}
};

const goToDetail = (item) => {
	uni.navigateTo({
		url: `/pages/opera/detail?id=${item.id}`
	});
};

onMounted(() => {
	loadCategories();
	loadOperaList();
});
</script>

<style lang="scss" scoped>
.opera-page {
	padding: $spacing-md;
	background-color: $bg-primary;
	min-height: 100vh;
}

.opera-header {
	padding: $spacing-lg $spacing-md;
	text-align: center;
	margin-bottom: $spacing-sm;
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
		background-color: $primary-color;
		color: $text-inverse;
		border-color: $primary-color;
		box-shadow: $shadow-sm;
	}
}

.opera-list {
	height: calc(100vh - 340rpx);
}

.opera-item {
	display: flex;
	align-items: center;
	padding: $spacing-md;
	margin-bottom: $spacing-md;
	border-radius: $radius-lg;
	background-color: $card-bg;
	box-shadow: $shadow-sm;
	border: 2rpx solid $border-light;
	transition: all $transition-base;

	&:active {
		background-color: $card-bg-hover;
		transform: translateY(-2rpx);
		box-shadow: $shadow-md;
	}
}

.opera-cover-box {
	width: 140rpx;
	height: 140rpx;
	border-radius: $radius-base;
	margin-right: $spacing-md;
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
	flex-shrink: 0;
}

.opera-cover-emoji {
	font-size: 56rpx;
}

.opera-category-badge {
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	background: rgba(0, 0, 0, 0.55);
	color: #fff;
	font-size: 20rpx;
	text-align: center;
	padding: 4rpx 0;
	border-radius: 0 0 $radius-base $radius-base;
}

.opera-info {
	flex: 1;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.opera-name {
	font-size: $fs-18;
	font-weight: $fw-bold;
	color: $text-primary;
	margin-bottom: $spacing-xs;
}

.opera-intro {
	font-size: $fs-14;
	color: $text-secondary;
	line-height: $line-height-relaxed;
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
}

.opera-arrow {
	font-size: 48rpx;
	color: $text-tertiary;
	margin-left: $spacing-sm;
	flex-shrink: 0;
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
