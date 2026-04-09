<template>
	<view class="page-container">
		<view class="card-elder header-card">
			<view class="text-title">说明书拍照识别</view>
			<view class="text-helper">拍照或选择图片后，系统会提取说明书要点，并用通俗的话告诉您。</view>
		</view>

		<view class="card-elder">
			<button class="btn-elder" @click="chooseImage">拍照/选择图片</button>
			<view v-if="imagePath" class="preview">
				<image :src="imagePath" class="img" mode="widthFix"></image>
			</view>
			<button v-if="imagePath" class="btn-elder ghost-btn" :disabled="loading" @click="analyze">开始识别</button>
			<view v-if="loading" class="text-helper">识别中，请稍候...</view>
		</view>

		<view v-if="result" class="card-elder result-card">
			<view class="text-title">给您一句话说明</view>
			<view class="text-content">{{ result.elder_summary || '暂无' }}</view>
		</view>

		<view v-if="result && result.extracted" class="card-elder">
			<view class="text-title">关键信息</view>
			<view class="kv"><text class="k">药品名称</text><text class="v">{{ result.extracted.drug_name || '—' }}</text></view>
			<view class="kv"><text class="k">功能主治</text><text class="v">{{ result.extracted.indications || '—' }}</text></view>
			<view class="kv"><text class="k">用法用量</text><text class="v">{{ result.extracted.dosage || '—' }}</text></view>
			<view class="kv"><text class="k">注意事项</text><text class="v">{{ result.extracted.warnings || '—' }}</text></view>
			<view class="kv"><text class="k">禁忌</text><text class="v">{{ result.extracted.contraindications || '—' }}</text></view>
			<view class="kv"><text class="k">不良反应</text><text class="v">{{ result.extracted.adverse_reactions || '—' }}</text></view>
			<view class="kv"><text class="k">成分</text><text class="v">{{ result.extracted.ingredients || '—' }}</text></view>
			<view class="kv"><text class="k">贮藏</text><text class="v">{{ result.extracted.storage || '—' }}</text></view>
		</view>
	</view>
</template>

<script setup>
import { ref } from 'vue';
import { BASE_URL } from '../../utils/request';
import { speak } from '../../utils/voice';

const imagePath = ref('');
const loading = ref(false);
const result = ref(null);

const chooseImage = () => {
	uni.chooseImage({
		count: 1,
		sizeType: ['compressed'],
		sourceType: ['camera', 'album'],
		success: (res) => {
			imagePath.value = res.tempFilePaths[0];
			result.value = null;
			speak('已选择图片，点击开始识别即可。');
		}
	});
};

const analyze = () => {
	if (!imagePath.value) return;
	loading.value = true;
	const token = uni.getStorageSync('token');
	uni.uploadFile({
		url: `${BASE_URL}/medication/analyze_upload`,
		filePath: imagePath.value,
		name: 'image',
		header: {
			'Authorization': token ? `Bearer ${token}` : ''
		},
		success: (uploadRes) => {
			try {
				const data = JSON.parse(uploadRes.data);
				if (data.code !== 200) {
					uni.showToast({ title: data.message || '识别失败', icon: 'none' });
					return;
				}
				result.value = data.data;
				if (result.value && result.value.elder_summary) {
					speak(result.value.elder_summary);
				}
			} catch (e) {
				uni.showToast({ title: '解析失败', icon: 'none' });
			}
		},
		fail: (err) => {
			uni.showToast({ title: err.errMsg || '上传失败', icon: 'none' });
		},
		complete: () => {
			loading.value = false;
		}
	});
};
</script>

<style lang="scss" scoped>
.header-card {
	border-left: 10rpx solid $main-color;
}

.preview {
	margin-top: 20rpx;
	border-radius: 20rpx;
	overflow: hidden;
	border: 2rpx solid #EBF3FF;
}

.img {
	width: 100%;
}

.ghost-btn {
	margin-top: 20rpx;
	background-color: #F5F7FA;
	color: #333;
}

.result-card {
	background-color: #EBF3FF;
	border: none;
	.text-title, .text-content {
		color: $main-color;
	}
}

.kv {
	margin-top: 18rpx;
	display: flex;
	gap: 20rpx;
}

.k {
	width: 160rpx;
	flex-shrink: 0;
	color: #666;
	font-size: 28rpx;
}

.v {
	color: #333;
	font-size: 30rpx;
	line-height: 1.6;
}
</style>

