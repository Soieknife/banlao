<template>
	<view class="page-container" :class="{ 'high-contrast': highContrast, 'large-font': largeFont }">
		<AppSidebar active-path="/pages/medication-ocr/medication-ocr" />

		<view class="card-elder header-card">
			<view class="header-top">
				<view class="text-title">识药助手</view>
				<view class="elder-tools">
					<button class="tool-btn" @click="toggleFontSize" :class="{ active: largeFont }">
						<text class="tool-icon">🔍</text>
						<text>大字体</text>
					</button>
					<button class="tool-btn" @click="toggleContrast" :class="{ active: highContrast }">
						<text class="tool-icon">⚡</text>
						<text>高对比</text>
					</button>
					<button class="tool-btn" @click="readInstructions">
						<text class="tool-icon">🔊</text>
						<text>语音</text>
					</button>
				</view>
			</view>
			<view class="text-helper">拍照后自动提取药名、用法用量、风险提醒，并把重点用更好懂的话讲给您。</view>
			<view class="tips">
				<text class="tip-item">请拍摄药品说明书正面，确保文字清晰</text>
				<text class="tip-item">尽量保持画面平整，避免反光和阴影</text>
				<text class="tip-item">可从相册选择已保存的说明书照片</text>
			</view>
		</view>

		<view class="card-elder">
			<view class="btn-group">
				<button class="btn-elder" @click="chooseImage('camera')">📷 拍照</button>
				<button class="btn-elder ghost-btn" @click="chooseImage('album')">📁 从相册选择</button>
				<button class="btn-elder ghost-btn" @click="scanBarcode">📱 扫码</button>
			</view>
			<view v-if="imagePath" class="preview">
				<image :src="imagePath" class="img" mode="widthFix"></image>
				<view class="preview-actions">
					<button class="btn-elder small-btn" @click="retryImage">重新选择</button>
				</view>
			</view>
			<button v-if="imagePath" class="btn-elder" :disabled="loading" @click="analyze">
				<text v-if="loading">识别中，请稍候...</text>
				<text v-else>开始识别</text>
			</button>
			<view v-if="result?.extracted?.completion_score" class="completion-score">
				<view class="score-bar">
					<view class="score-fill" :style="{ width: result.extracted.completion_score + '%' }"></view>
				</view>
				<text class="score-text">识别完整度：{{ result.extracted.completion_score }}%</text>
			</view>
		</view>

		<view v-if="result" class="card-elder result-card">
		<view class="text-title">给您一句话说明</view>
		<view class="text-content">{{ result.elder_summary || '暂无' }}</view>
		<view class="result-actions">
			<button class="btn-elder small-btn" @click="shareResult">分享药品信息</button>
			<button class="btn-elder small-btn ghost-btn" @click="speakSummary">语音朗读</button>
		</view>
		<view class="result-meta">
			<text class="meta-tag">{{ result.parse_status === 'success' ? '智能整理完成' : '规则兜底整理' }}</text>
			<text class="meta-tag subtle">来源：{{ result.ocr_provider || 'OCR' }}</text>
		</view>
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
			<view class="kv"><text class="k">规格</text><text class="v">{{ result.extracted.specification || '—' }}</text></view>
			<view class="kv"><text class="k">包装</text><text class="v">{{ result.extracted.package || '—' }}</text></view>
			<view class="kv"><text class="k">有效期</text><text class="v">{{ result.extracted.validity_period || '—' }}</text></view>
		</view>

		<view v-if="result?.extracted?.safety_alerts?.length" class="card-elder alert-card">
			<view class="text-title">重点风险提醒</view>
			<view v-for="(item, index) in result.extracted.safety_alerts" :key="index" class="list-row">
				<text class="dot warning-dot"></text>
				<text class="list-text">{{ item }}</text>
			</view>
		</view>

		<view v-if="result?.extracted?.usage_tips?.length" class="card-elder">
		<view class="text-title">服用与保存提示</view>
		<view v-for="(item, index) in result.extracted.usage_tips" :key="index" class="list-row">
			<text class="dot"></text>
			<text class="list-text">{{ item }}</text>
		</view>
		<button v-if="result?.extracted?.dosage" class="btn-elder small-btn" @click="setReminder">设置用药提醒</button>
	</view>

		<view v-if="result?.extracted?.missing_fields?.length" class="card-elder missing-card">
			<view class="text-title">识别不足的部分</view>
			<view class="text-helper">这几项在图片里没有可靠识别出来，建议重新拍一张更完整、更清晰的说明书正面：</view>
			<view class="chips">
				<text v-for="item in result.extracted.missing_fields" :key="item" class="chip">{{ fieldNameMap[item] || item }}</text>
			</view>
		</view>

		<view v-if="result?.raw_text" class="card-elder">
			<view class="row-head">
				<view class="text-title">原始识别文字</view>
				<text class="toggle-link" @click="showRawText = !showRawText">{{ showRawText ? '收起' : '展开' }}</text>
			</view>
			<view v-if="showRawText" class="raw-text">{{ result.raw_text }}</view>
		</view>

		<view class="card-elder">
			<view class="row-head">
				<view class="text-title">最近识别记录</view>
				<text class="toggle-link" @click="fetchRecords">刷新</text>
			</view>
			<view v-if="recordsLoading" class="text-helper">加载中...</view>
			<view v-else-if="records.length === 0" class="text-helper">还没有识别记录</view>
			<view v-else>
				<view v-for="record in records" :key="record.id" class="record-item" @click="openRecord(record.id)">
					<view class="record-main">
						<view class="record-title">{{ record.elder_summary || '识别记录' }}</view>
						<view class="record-time">{{ formatTime(record.created_at) }}</view>
					</view>
					<view class="record-tags">
						<text class="meta-tag">{{ record.parse_status === 'success' ? '智能整理' : '兜底整理' }}</text>
						<text class="meta-tag subtle">{{ record.parse_method || 'rule' }}</text>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { request } from '../../utils/request';
import { speak } from '../../utils/voice';
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
	indications: '功能主治',
	dosage: '用法用量',
	warnings: '注意事项',
	contraindications: '禁忌',
	adverse_reactions: '不良反应',
	storage: '贮藏',
	specification: '规格',
	package: '包装',
	validity_period: '有效期'
};

const chooseImage = (sourceType = 'both') => {
	uni.chooseImage({
		count: 1,
		sizeType: ['compressed'],
		sourceType: sourceType === 'camera' ? ['camera'] : sourceType === 'album' ? ['album'] : ['camera', 'album'],
		success: (res) => {
			imagePath.value = res.tempFilePaths[0];
			result.value = null;
			showRawText.value = false;
			speak('已选择图片，点击开始识别即可。');
		}
	});
};

const retryImage = () => {
	imagePath.value = '';
	result.value = null;
	showRawText.value = false;
};

const setReminder = () => {
	if (!result.value?.extracted?.drug_name) {
		uni.showToast({ title: '药品名称识别不完整', icon: 'none' });
		return;
	}
	
	uni.navigateTo({
		url: `/pages/reminders/reminders?prefill=medicine&drugName=${encodeURIComponent(result.value.extracted.drug_name)}&dosage=${encodeURIComponent(result.value.extracted.dosage || '')}`
	});
};

const shareResult = () => {
	if (!result.value) {
		uni.showToast({ title: '暂无药品信息', icon: 'none' });
		return;
	}
	
	const shareContent = `药品名称：${result.value.extracted?.drug_name || '未知'}\n` +
		`功能主治：${result.value.extracted?.indications || '未知'}\n` +
		`用法用量：${result.value.extracted?.dosage || '未知'}\n` +
		`注意事项：${result.value.extracted?.warnings || '未知'}\n` +
		`一句话说明：${result.value.elder_summary || '暂无'}`;
	
	uni.showActionSheet({
		itemList: ['分享到微信', '分享到QQ', '复制文本'],
		success: (res) => {
			switch (res.tapIndex) {
				case 0:
				case 1:
					uni.showToast({ title: '分享功能开发中', icon: 'none' });
					break;
				case 2:
					uni.setClipboardData({
						data: shareContent,
						success: () => {
							uni.showToast({ title: '已复制到剪贴板', icon: 'success' });
						}
					});
					break;
			}
		}
	});
};

const speakSummary = () => {
	if (result.value?.elder_summary) {
		speak(result.value.elder_summary);
	} else {
		speak('暂无药品信息');
	}
};

const toggleFontSize = () => {
	largeFont.value = !largeFont.value;
	speak(largeFont.value ? '已切换到大字体模式' : '已切换到标准字体模式');
};

const toggleContrast = () => {
	highContrast.value = !highContrast.value;
	speak(highContrast.value ? '已切换到高对比度模式' : '已切换到标准模式');
};

const readInstructions = () => {
	speak('识药助手使用说明：第一步，点击拍照或从相册选择按钮，拍摄药品说明书。第二步，点击开始识别按钮。第三步，查看识别结果，重点关注用法用量和注意事项。如果需要，可以点击语音朗读按钮听取药品信息。');
};

const readResult = () => {
	if (!result.value) {
		speak('暂无药品信息');
		return;
	}
	
	let content = '';
	if (result.value.elder_summary) {
		content += result.value.elder_summary + '。';
	}
	if (result.value.extracted?.dosage) {
		content += '用法用量：' + result.value.extracted.dosage + '。';
	}
	if (result.value.extracted?.warnings) {
		content += '注意事项：' + result.value.extracted.warnings + '。';
	}
	if (result.value.extracted?.contraindications) {
		content += '禁忌：' + result.value.extracted.contraindications + '。';
	}
	
	if (content) {
		speak(content);
	} else {
		speak('药品信息不完整');
	}
};

const scanBarcode = () => {
	uni.scanCode({
		onlyFromCamera: true,
		scanType: ['barCode'],
		success: (res) => {
			const barcode = res.result;
			speak('扫码成功，正在查询药品信息');
			// 模拟药品信息查询
			queryDrugByBarcode(barcode);
		},
		fail: (err) => {
			speak('扫码失败，请重试');
			uni.showToast({ title: '扫码失败，请重试', icon: 'none' });
		}
	});
};

const queryDrugByBarcode = async (barcode) => {
	// 调用后端API查询药品信息
	uni.showLoading({ title: '查询中...' });
	
	try {
		const res = await request(`/medication/barcode/${barcode}`);
		result.value = res.data;
		
		speak(`查询到药品信息：${res.data.extracted.drug_name}，规格${res.data.extracted.specification}，主要用于${res.data.extracted.indications}`);
		uni.showToast({ title: '查询成功', icon: 'success' });
	} catch (err) {
		speak('查询失败，请重试');
		uni.showToast({ title: err.message || '查询失败，请重试', icon: 'none' });
	} finally {
		uni.hideLoading();
	}
};

const fetchRecords = async () => {
	recordsLoading.value = true;
	try {
		const res = await request('/medication/records');
		records.value = Array.isArray(res.data) ? res.data : [];
	} catch (err) {
		records.value = [];
	} finally {
		recordsLoading.value = false;
	}
};

const openRecord = async (id) => {
	try {
		loading.value = true;
		const res = await request(`/medication/record/${id}`);
		result.value = res.data;
		showRawText.value = false;
		uni.pageScrollTo({ scrollTop: 0, duration: 200 });
		if (result.value?.elder_summary) {
			speak(result.value.elder_summary);
		}
	} catch (err) {
		uni.showToast({ title: err.message || '加载记录失败', icon: 'none' });
	} finally {
		loading.value = false;
	}
};

const analyze = () => {
	if (!imagePath.value) return;
	loading.value = true;
	const token = uni.getStorageSync('token');
	uni.uploadFile({
		url: `${config.api.baseUrl}/medication/analyze_upload`,
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
				showRawText.value = false;
				if (result.value && result.value.elder_summary) {
					speak(result.value.elder_summary);
				}
				fetchRecords();
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

const formatTime = (timeStr) => {
	if (!timeStr) return '';
	const date = new Date(timeStr);
	return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

onMounted(() => {
	fetchRecords();
});
</script>

<style lang="scss" scoped>
.header-card {
	border-left: 10rpx solid $main-color;
}

.tips {
	margin-top: 16rpx;
	padding: 16rpx;
	background-color: #F8FAFC;
	border-radius: 12rpx;
	border-left: 4rpx solid $main-color;
}

.tip-item {
	display: block;
	margin-top: 8rpx;
	font-size: 26rpx;
	color: #4B5563;
	line-height: 1.5;
}

.tip-item:first-child {
	margin-top: 0;
}

.btn-group {
	display: flex;
	gap: 16rpx;
	margin-bottom: 20rpx;
}

.btn-group button {
	flex: 1;
}

.preview {
	margin-top: 20rpx;
	border-radius: 20rpx;
	overflow: hidden;
	border: 2rpx solid #EBF3FF;
	position: relative;
}

.img {
	width: 100%;
}

.preview-actions {
	position: absolute;
	bottom: 20rpx;
	right: 20rpx;
}

.small-btn {
	height: 72rpx;
	line-height: 72rpx;
	font-size: 26rpx;
	padding: 0 24rpx;
}

.ghost-btn {
	background-color: #F5F7FA;
	color: #333;
}

.completion-score {
	margin-top: 20rpx;
}

.score-bar {
	height: 12rpx;
	background-color: #E5E7EB;
	border-radius: 6rpx;
	overflow: hidden;
	margin-bottom: 8rpx;
}

.score-fill {
	height: 100%;
	background: linear-gradient(90deg, #4A90E2, #667eea);
	border-radius: 6rpx;
	transition: width 0.3s ease;
}

.score-text {
	font-size: 26rpx;
	color: #4B5563;
	text-align: center;
}

.result-actions {
	display: flex;
	gap: 12rpx;
	margin: 20rpx 0;
}

.result-actions button {
	flex: 1;
}

/* 适老功能样式 */
.header-top {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 16rpx;
}

.elder-tools {
	display: flex;
	gap: 8rpx;
}

.tool-btn {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 12rpx 16rpx;
	background-color: #F5F7FA;
	border: 1rpx solid #E5E7EB;
	border-radius: 12rpx;
	font-size: 20rpx;
	color: #4B5563;
	min-width: 90rpx;
}

.tool-btn.active {
	background-color: #EBF3FF;
	border-color: #4A90E2;
	color: #4A90E2;
}

.tool-icon {
	font-size: 28rpx;
	margin-bottom: 4rpx;
}

/* 大字体模式 */
.large-font {
	font-size: 120%;
}

.large-font .text-title {
	font-size: 36rpx;
}

.large-font .text-content {
	font-size: 34rpx;
}

.large-font .text-helper {
	font-size: 30rpx;
}

.large-font .kv .k,
.large-font .kv .v {
	font-size: 32rpx;
}

.large-font .list-text {
	font-size: 32rpx;
}

/* 高对比度模式 */
.high-contrast {
	background-color: #000;
	color: #fff;
}

.high-contrast .card-elder {
	background-color: #1a1a1a;
	border-color: #333;
}

.high-contrast .header-card {
	background-color: #2a2a2a;
	border-color: #4A90E2;
}

.high-contrast .result-card {
	background-color: #1a3a5a;
}

.high-contrast .alert-card {
	background-color: #5a1a1a;
	border-color: #ff6b6b;
}

.high-contrast .missing-card {
	background-color: #5a4a1a;
	border-color: #ffd93d;
}

.high-contrast .text-title,
.high-contrast .text-content {
	color: #fff;
}

.high-contrast .text-helper {
	color: #ccc;
}

.high-contrast .kv .k {
	color: #aaa;
}

.high-contrast .kv .v {
	color: #fff;
}

.high-contrast .list-text {
	color: #fff;
}

.high-contrast .meta-tag {
	background-color: #333;
	color: #4A90E2;
}

.high-contrast .meta-tag.subtle {
	background-color: rgba(255, 255, 255, 0.1);
	color: #aaa;
}

.high-contrast .chip {
	background-color: #5a4a1a;
	color: #ffd93d;
}

.high-contrast .dot {
	background-color: #4A90E2;
}

.high-contrast .warning-dot {
	background-color: #ff6b6b;
}

.high-contrast .btn-elder {
	background-color: #4A90E2;
	color: #fff;
}

.high-contrast .btn-elder.ghost-btn {
	background-color: #333;
	color: #fff;
	border-color: #555;
}

.high-contrast .tool-btn {
	background-color: #333;
	color: #ccc;
	border-color: #555;
}

.high-contrast .tool-btn.active {
	background-color: #1a3a5a;
	border-color: #4A90E2;
	color: #4A90E2;
}

.high-contrast .score-bar {
	background-color: #333;
}

.high-contrast .score-fill {
	background: linear-gradient(90deg, #667eea, #4A90E2);
}

.high-contrast .score-text {
	color: #ccc;
}

.high-contrast .tips {
	background-color: #2a2a2a;
	border-color: #4A90E2;
}

.high-contrast .tip-item {
	color: #ccc;
}

.high-contrast .raw-text {
	background-color: #2a2a2a;
	color: #ccc;
}

.high-contrast .record-item {
	border-color: #333;
}

.high-contrast .record-title {
	color: #fff;
}

.high-contrast .record-time {
	color: #aaa;
}

.result-card {
	background-color: #EBF3FF;
	border: none;
	.text-title, .text-content {
		color: $main-color;
	}
}

.result-meta,
.chips,
.record-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
}

.result-meta {
	margin-top: 20rpx;
}

.meta-tag,
.chip {
	display: inline-flex;
	align-items: center;
	padding: 8rpx 16rpx;
	border-radius: 999rpx;
	font-size: 24rpx;
}

.meta-tag {
	background-color: #FFFFFF;
	color: $main-color;
}

.meta-tag.subtle {
	background-color: rgba(255, 255, 255, 0.7);
	color: #5f6b7a;
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

.alert-card {
	background-color: #FFF8F6;
	border: 2rpx solid #FFE0D8;
}

.missing-card {
	background-color: #FFFDF4;
	border: 2rpx solid #FFE8A3;
}

.list-row,
.row-head,
.record-main,
.record-item {
	display: flex;
}

.list-row {
	gap: 16rpx;
	margin-top: 18rpx;
	align-items: flex-start;
}

.dot {
	width: 14rpx;
	height: 14rpx;
	border-radius: 7rpx;
	background-color: $main-color;
	margin-top: 14rpx;
	flex-shrink: 0;
}

.warning-dot {
	background-color: $warning-color;
}

.list-text {
	font-size: 30rpx;
	color: #444;
	line-height: 1.7;
}

.chips {
	margin-top: 18rpx;
}

.chip {
	background-color: #FFF3BF;
	color: #7A5C00;
}

.row-head,
.record-main,
.record-item {
	align-items: center;
	justify-content: space-between;
}

.toggle-link {
	font-size: 26rpx;
	color: $main-color;
}

.raw-text {
	margin-top: 18rpx;
	padding: 24rpx;
	background-color: #F8FAFC;
	border-radius: 18rpx;
	font-size: 28rpx;
	color: #4B5563;
	line-height: 1.8;
	white-space: pre-wrap;
	word-break: break-all;
}

.record-item {
	padding: 24rpx 0;
	border-bottom: 1rpx solid #EDF1F5;
	gap: 20rpx;
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
	color: #333;
	line-height: 1.6;
}

.record-time {
	font-size: 24rpx;
	color: #8893A1;
}
</style>
