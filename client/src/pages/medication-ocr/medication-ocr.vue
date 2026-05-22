<template>
	<view class="page-container" :class="{ 'large-font': largeFont, 'high-contrast': highContrast }">
		<AppSidebar active-path="/pages/medication-ocr/medication-ocr" />

		<view class="card-elder hero-card">
			<view class="hero-head">
				<view>
					<view class="text-title">识药助手</view>
					<view class="text-helper">拍一张药品说明书，系统会自动识别并整理重点信息。</view>
				</view>
				<view class="toolbar">
					<button class="tool-btn" :class="{ active: largeFont }" @click="toggleFontSize">大字</button>
					<button class="tool-btn" :class="{ active: highContrast }" @click="toggleContrast">高对比</button>
					<button class="tool-btn" @click="readInstructions">语音说明</button>
				</view>
			</view>
			<view class="tips">
				<text class="tip-item">1. 拍摄说明书正面，尽量完整包含药名、用法用量、注意事项。</text>
				<text class="tip-item">2. 保持光线充足，避免反光、阴影和严重倾斜。</text>
				<text class="tip-item">3. 如果识别不完整，可以重新拍一张更清晰的图片。</text>
			</view>
		</view>

		<view class="card-elder">
			<view class="action-grid">
				<button class="btn-elder" @click="chooseImage('camera')">拍照</button>
				<button class="btn-elder ghost-btn" @click="chooseImage('album')">相册选择</button>
			</view>

			<view v-if="imagePath" class="preview-box">
				<image class="preview-image" :src="imagePath" mode="widthFix" @click="previewSelectedImage" />
				<view class="preview-footer">
					<text class="text-helper">已选择图片，确认无误后开始识别。</text>
					<button class="btn-elder small-btn ghost-btn" @click="resetImage">重新选择</button>
				</view>
			</view>

			<button v-if="imagePath" class="btn-elder analyze-btn" :disabled="loading" @click="analyze">
				{{ loading ? '识别中，请稍候...' : '开始识别' }}
			</button>

			<view v-if="loading" class="loading-note text-helper">
				正在执行图片上传、OCR 识别和药品信息整理，请稍候。
			</view>
		</view>

		<view v-if="result" class="card-elder summary-card">
			<view class="row-head">
				<view class="text-title">给老人看的简化说明</view>
				<view class="tag-group">
					<text class="meta-tag">{{ parseStatusText }}</text>
					<text class="meta-tag subtle">{{ result.ocr_provider || 'OCR' }}</text>
				</view>
			</view>
			<view class="summary-text">{{ result.elder_summary || '暂无简化说明' }}</view>
			<view v-if="showFallbackHint" class="fallback-hint">
				<text class="text-helper">本次结果包含规则兜底整理，建议重点核对药名、用法用量和注意事项。</text>
			</view>
			<view class="result-actions">
				<button class="btn-elder small-btn" @click="speakSummary">语音朗读</button>
				<button class="btn-elder small-btn ghost-btn" @click="shareResult">复制结果</button>
				<button
					v-if="result.extracted && result.extracted.drug_name"
					class="btn-elder small-btn ghost-btn"
					@click="setReminder"
				>
					设置提醒
				</button>
			</view>
		</view>

		<view v-if="result && result.extracted" class="card-elder">
			<view class="row-head">
				<view class="text-title">关键信息</view>
				<text v-if="completionScoreText" class="score-text">{{ completionScoreText }}</text>
			</view>

			<view v-if="hasCompletionScore" class="score-bar">
				<view class="score-fill" :style="{ width: `${result.extracted.completion_score}%` }"></view>
			</view>

			<view v-for="item in infoFields" :key="item.key" class="info-row">
				<text class="info-key">{{ item.label }}</text>
				<text class="info-value">{{ result.extracted[item.key] || '未识别到' }}</text>
			</view>
		</view>

		<view v-if="safetyAlerts.length" class="card-elder alert-card">
			<view class="text-title">重点风险提醒</view>
			<view v-for="(item, index) in safetyAlerts" :key="`alert-${index}`" class="list-row">
				<text class="dot warning-dot"></text>
				<text class="list-text">{{ item }}</text>
			</view>
		</view>

		<view v-if="usageTips.length" class="card-elder">
			<view class="text-title">服用与保存提示</view>
			<view v-for="(item, index) in usageTips" :key="`tip-${index}`" class="list-row">
				<text class="dot"></text>
				<text class="list-text">{{ item }}</text>
			</view>
		</view>

		<view v-if="missingFields.length" class="card-elder missing-card">
			<view class="text-title">未完整识别的字段</view>
			<view class="text-helper">这些内容没有稳定识别出来，建议重新拍摄更清晰、范围更完整的说明书。</view>
			<view class="chip-list">
				<text v-for="item in missingFields" :key="item" class="chip">{{ fieldNameMap[item] || item }}</text>
			</view>
		</view>

		<view v-if="result && result.raw_text" class="card-elder">
			<view class="row-head">
				<view class="text-title">原始 OCR 文本</view>
				<text class="toggle-link" @click="showRawText = !showRawText">{{ showRawText ? '收起' : '展开' }}</text>
			</view>
			<view v-if="result.parse_error && showFallbackHint" class="text-helper parse-error">
				结构化提取提示：{{ result.parse_error }}
			</view>
			<view v-if="showRawText" class="raw-text">{{ result.raw_text }}</view>
		</view>

		<view class="card-elder">
			<view class="row-head">
				<view class="text-title">最近识别记录</view>
				<button class="mini-link" :disabled="recordsLoading" @click="fetchRecords">刷新</button>
			</view>

			<view v-if="recordsLoading" class="text-helper">加载中...</view>
			<view v-else-if="records.length === 0" class="text-helper">还没有识别记录。</view>
			<view v-else class="record-list">
				<view v-for="record in records" :key="record.id" class="record-item" @click="openRecord(record.id)">
					<view class="record-main">
						<view class="record-title">{{ record.elder_summary || '识别记录' }}</view>
						<view class="record-time">{{ formatTime(record.created_at) }}</view>
					</view>
					<view class="tag-group">
						<text class="meta-tag">{{ record.parse_status === 'success' ? '智能整理' : '规则兜底' }}</text>
						<text class="meta-tag subtle">{{ record.parse_method || 'rule' }}</text>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { request } from '../../utils/request';
import { speak, stop } from '../../utils/voice';
import config from '../../config';
import AppSidebar from '../../components/AppSidebar.vue';

const imagePath = ref('');
const loading = ref(false);
const result = ref(null);
const showRawText = ref(false);
const records = ref([]);
const recordsLoading = ref(false);
const largeFont = ref(false);
const highContrast = ref(false);

const fieldNameMap = {
	drug_name: '药品名称',
	ingredients: '成分',
	indications: '适应症',
	dosage: '用法用量',
	warnings: '注意事项',
	contraindications: '禁忌',
	adverse_reactions: '不良反应',
	storage: '贮藏',
	specification: '规格',
	package: '包装',
	validity_period: '有效期'
};

const infoFields = [
	{ key: 'drug_name', label: '药品名称' },
	{ key: 'ingredients', label: '成分' },
	{ key: 'indications', label: '适应症' },
	{ key: 'dosage', label: '用法用量' },
	{ key: 'warnings', label: '注意事项' },
	{ key: 'contraindications', label: '禁忌' },
	{ key: 'adverse_reactions', label: '不良反应' },
	{ key: 'storage', label: '贮藏' },
	{ key: 'specification', label: '规格' },
	{ key: 'package', label: '包装' },
	{ key: 'validity_period', label: '有效期' }
];

const parseStatusText = computed(() => {
	if (!result.value) return '';
	return result.value.parse_status === 'success' ? '智能整理完成' : '规则兜底整理';
});

const hasCompletionScore = computed(() => Number.isFinite(Number(result.value?.extracted?.completion_score)));
const showFallbackHint = computed(() => result.value?.parse_status && result.value.parse_status !== 'success');

const completionScoreText = computed(() => {
	if (!hasCompletionScore.value) return '';
	return `完整度 ${Number(result.value.extracted.completion_score)}%`;
});

const safetyAlerts = computed(() => {
	const list = result.value?.extracted?.safety_alerts;
	return Array.isArray(list) ? list : [];
});

const usageTips = computed(() => {
	const list = result.value?.extracted?.usage_tips;
	return Array.isArray(list) ? list : [];
});

const missingFields = computed(() => {
	const list = result.value?.extracted?.missing_fields;
	return Array.isArray(list) ? list : [];
});

const chooseImage = (sourceType) => {
	uni.chooseImage({
		count: 1,
		sizeType: ['compressed'],
		sourceType: sourceType === 'camera' ? ['camera'] : ['album'],
		success: (res) => {
			imagePath.value = res.tempFilePaths[0] || '';
			result.value = null;
			showRawText.value = false;
			if (imagePath.value) {
				speak('已选择图片，可以开始识别。');
			}
		}
	});
};

const previewSelectedImage = () => {
	if (!imagePath.value) return;
	uni.previewImage({
		urls: [imagePath.value],
		current: imagePath.value
	});
};

const resetImage = () => {
	imagePath.value = '';
	result.value = null;
	showRawText.value = false;
};

const toggleFontSize = () => {
	largeFont.value = !largeFont.value;
	speak(largeFont.value ? '已切换为大字模式。' : '已恢复标准字号。');
};

const toggleContrast = () => {
	highContrast.value = !highContrast.value;
	speak(highContrast.value ? '已切换为高对比模式。' : '已恢复标准对比模式。');
};

const readInstructions = () => {
	speak('先拍摄或选择药品说明书图片，再点击开始识别。识别完成后，系统会整理药名、适应症、用法用量和注意事项。');
};

const speakSummary = () => {
	const summary = result.value?.elder_summary;
	if (!summary) {
		speak('当前还没有可朗读的识别结果。');
		return;
	}
	speak(summary, { immediate: true });
};

const shareResult = () => {
	if (!result.value?.extracted) {
		uni.showToast({ title: '暂无可复制内容', icon: 'none' });
		return;
	}

	const shareContent = [
		`药品名称：${result.value.extracted.drug_name || '未识别到'}`,
		`适应症：${result.value.extracted.indications || '未识别到'}`,
		`用法用量：${result.value.extracted.dosage || '未识别到'}`,
		`注意事项：${result.value.extracted.warnings || '未识别到'}`,
		`简化说明：${result.value.elder_summary || '暂无'}`
	].join('\n');

	uni.setClipboardData({
		data: shareContent,
		success: () => {
			uni.showToast({ title: '已复制到剪贴板', icon: 'success' });
		}
	});
};

const setReminder = () => {
	const drugName = result.value?.extracted?.drug_name;
	if (!drugName) {
		uni.showToast({ title: '药品名称未识别完整', icon: 'none' });
		return;
	}

	const dosage = result.value?.extracted?.dosage || '';
	uni.navigateTo({
		url: `/pages/reminders/reminders?prefill=medicine&drugName=${encodeURIComponent(drugName)}&dosage=${encodeURIComponent(dosage)}`
	});
};

const fetchRecords = async () => {
	recordsLoading.value = true;
	try {
		const response = await request('/medication/records', 'GET', {}, { showLoading: false, showErrorToast: false });
		records.value = Array.isArray(response.data) ? response.data : [];
	} catch (error) {
		records.value = [];
	} finally {
		recordsLoading.value = false;
	}
};

const openRecord = async (id) => {
	loading.value = true;
	try {
		const response = await request(`/medication/record/${id}`, 'GET', {}, { showLoading: false });
		result.value = response.data || null;
		showRawText.value = false;
		uni.pageScrollTo({ scrollTop: 0, duration: 200 });
		if (result.value?.elder_summary) {
			speak(result.value.elder_summary, { immediate: true });
		}
	} catch (error) {
		uni.showToast({ title: error.message || '加载记录失败', icon: 'none' });
	} finally {
		loading.value = false;
	}
};

const analyze = () => {
	if (!imagePath.value || loading.value) return;

	const token = uni.getStorageSync('token');
	loading.value = true;
	stop();

	uni.uploadFile({
		url: `${config.api.baseUrl}/medication/analyze_upload`,
		filePath: imagePath.value,
		name: 'image',
		header: {
			Authorization: token ? `Bearer ${token}` : ''
		},
		success: (uploadResponse) => {
			try {
				const body = JSON.parse(uploadResponse.data || '{}');
				if (uploadResponse.statusCode !== 200 || body.code !== 200) {
					uni.showToast({ title: body.message || '识别失败', icon: 'none' });
					return;
				}

				result.value = body.data || null;
				showRawText.value = false;
				if (result.value?.elder_summary) {
					speak(result.value.elder_summary, { immediate: true });
				}
				fetchRecords();
			} catch (error) {
				uni.showToast({ title: '识别结果解析失败', icon: 'none' });
			}
		},
		fail: (error) => {
			uni.showToast({ title: error.errMsg || '图片上传失败', icon: 'none' });
		},
		complete: () => {
			loading.value = false;
		}
	});
};

const formatTime = (time) => {
	if (!time) return '';
	const date = new Date(time);
	if (Number.isNaN(date.getTime())) return String(time);

	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	const hour = String(date.getHours()).padStart(2, '0');
	const minute = String(date.getMinutes()).padStart(2, '0');
	return `${month}-${day} ${hour}:${minute}`;
};

onMounted(() => {
	fetchRecords();
});
</script>

<style lang="scss" scoped>
.hero-card {
	border-left: 10rpx solid $main-color;
}

.hero-head,
.row-head,
.preview-footer,
.result-actions,
.record-item,
.record-main {
	display: flex;
}

.hero-head,
.row-head,
.preview-footer,
.record-item {
	justify-content: space-between;
}

.hero-head,
.row-head,
.preview-footer,
.record-item,
.toolbar,
.tag-group {
	align-items: center;
}

.toolbar,
.tag-group,
.action-grid,
.tips,
.record-list,
.chip-list {
	display: flex;
	flex-wrap: wrap;
}

.toolbar,
.tag-group {
	gap: 12rpx;
}

.tips,
.record-list {
	flex-direction: column;
}

.tips,
.record-list,
.chip-list {
	gap: 12rpx;
}

.tool-btn {
	min-width: 110rpx;
	height: 72rpx;
	line-height: 72rpx;
	border-radius: 16rpx;
	background-color: #f5f7fa;
	color: #4b5563;
	font-size: 24rpx;
}

.tool-btn.active {
	background-color: #ebf3ff;
	color: $main-color;
}

.tip-item {
	display: block;
	font-size: 26rpx;
	color: #4b5563;
	line-height: 1.6;
}

.action-grid {
	gap: 16rpx;
}

.action-grid button {
	flex: 1;
}

.ghost-btn {
	background-color: #f5f7fa;
	color: #374151;
}

.preview-box {
	margin-top: 24rpx;
	border-radius: 24rpx;
	overflow: hidden;
	border: 2rpx solid #dbeafe;
	background-color: #fff;
}

.preview-image {
	width: 100%;
}

.preview-footer {
	padding: 20rpx 24rpx;
	gap: 16rpx;
}

.small-btn {
	height: 72rpx;
	line-height: 72rpx;
	padding: 0 24rpx;
	font-size: 26rpx;
}

.analyze-btn {
	margin-top: 24rpx;
}

.loading-note {
	margin-top: 16rpx;
}

.summary-card {
	background: linear-gradient(135deg, #ebf3ff 0%, #f8fbff 100%);
}

.summary-text {
	margin-top: 18rpx;
	font-size: 32rpx;
	line-height: 1.8;
	color: $main-color;
}

.fallback-hint {
	margin-top: 16rpx;
	padding: 18rpx 20rpx;
	border-radius: 16rpx;
	background-color: rgba(255, 255, 255, 0.7);
}

.result-actions {
	margin-top: 24rpx;
	gap: 16rpx;
	flex-wrap: wrap;
}

.result-actions button {
	flex: 1;
	min-width: 180rpx;
}

.meta-tag,
.chip {
	padding: 8rpx 16rpx;
	border-radius: 999rpx;
	font-size: 24rpx;
}

.meta-tag {
	background-color: #ffffff;
	color: $main-color;
}

.meta-tag.subtle {
	background-color: rgba(255, 255, 255, 0.7);
	color: #64748b;
}

.score-text {
	font-size: 24rpx;
	color: #64748b;
}

.score-bar {
	margin-top: 14rpx;
	height: 14rpx;
	background-color: #e5e7eb;
	border-radius: 999rpx;
	overflow: hidden;
}

.score-fill {
	height: 100%;
	background: linear-gradient(90deg, #4a90e2, #667eea);
}

.info-row {
	display: flex;
	gap: 20rpx;
	padding-top: 20rpx;
}

.info-key {
	width: 160rpx;
	flex-shrink: 0;
	font-size: 28rpx;
	color: #64748b;
}

.info-value {
	flex: 1;
	font-size: 30rpx;
	line-height: 1.7;
	color: #1f2937;
}

.alert-card {
	background-color: #fff8f6;
	border: 2rpx solid #ffe0d8;
}

.missing-card {
	background-color: #fffdf4;
	border: 2rpx solid #ffe8a3;
}

.list-row {
	display: flex;
	align-items: flex-start;
	gap: 16rpx;
	margin-top: 18rpx;
}

.dot {
	width: 14rpx;
	height: 14rpx;
	margin-top: 16rpx;
	border-radius: 50%;
	background-color: $main-color;
	flex-shrink: 0;
}

.warning-dot {
	background-color: $warning-color;
}

.list-text {
	flex: 1;
	font-size: 30rpx;
	line-height: 1.7;
	color: #374151;
}

.chip {
	background-color: #fff3bf;
	color: #7a5c00;
}

.toggle-link,
.mini-link {
	font-size: 26rpx;
	color: $main-color;
	background: none;
	padding: 0;
}

.raw-text {
	margin-top: 18rpx;
	padding: 24rpx;
	background-color: #f8fafc;
	border-radius: 18rpx;
	font-size: 28rpx;
	line-height: 1.8;
	color: #4b5563;
	white-space: pre-wrap;
	word-break: break-all;
}

.parse-error {
	margin-top: 16rpx;
}

.record-item {
	padding: 24rpx 0;
	border-bottom: 1rpx solid #edf1f5;
	gap: 16rpx;
}

.record-item:last-child {
	border-bottom: none;
}

.record-main {
	flex: 1;
	flex-direction: column;
	align-items: flex-start;
	gap: 8rpx;
}

.record-title {
	font-size: 30rpx;
	line-height: 1.6;
	color: #1f2937;
}

.record-time {
	font-size: 24rpx;
	color: #94a3b8;
}

.large-font .text-title {
	font-size: 38rpx;
}

.large-font .text-helper,
.large-font .tip-item,
.large-font .score-text,
.large-font .toggle-link {
	font-size: 30rpx;
}

.large-font .summary-text,
.large-font .info-value,
.large-font .list-text,
.large-font .record-title {
	font-size: 34rpx;
}

.high-contrast {
	background-color: #000;
	color: #fff;
}

.high-contrast .card-elder {
	background-color: #111;
	border-color: #333;
}

.high-contrast .tool-btn,
.high-contrast .ghost-btn {
	background-color: #222;
	color: #fff;
	border-color: #444;
}

.high-contrast .tool-btn.active {
	background-color: #123456;
	color: #8ec5ff;
}

.high-contrast .tip-item,
.high-contrast .text-helper,
.high-contrast .score-text,
.high-contrast .record-time,
.high-contrast .info-key {
	color: #cbd5e1;
}

.high-contrast .info-value,
.high-contrast .list-text,
.high-contrast .record-title,
.high-contrast .summary-text,
.high-contrast .text-title {
	color: #fff;
}

.high-contrast .meta-tag {
	background-color: #1e293b;
	color: #8ec5ff;
}

.high-contrast .meta-tag.subtle {
	background-color: #1f2937;
	color: #cbd5e1;
}

.high-contrast .raw-text {
	background-color: #1f2937;
	color: #e2e8f0;
}

.high-contrast .fallback-hint {
	background-color: #1f2937;
}

.high-contrast .score-bar {
	background-color: #1f2937;
}
</style>
