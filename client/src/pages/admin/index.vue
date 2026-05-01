<template>
	<view class="admin-container">
		<!-- 顶部导航栏 -->
		<view class="topbar">
			<text class="brand">暖阳陪伴 · 管理后台</text>
			<view class="user-info">
				<text>{{ userInfo.nickname || userInfo.username }}</text>
				<button class="logout-btn" @click="handleLogout">退出</button>
			</view>
		</view>

		<!-- 主内容区域 -->
		<view class="main-content">
			<!-- 左侧菜单 -->
			<view class="sidebar">
				<view class="menu-item" :class="{ active: activeTab === 'overview' }" @click="activeTab = 'overview'">
					<text class="menu-icon">📊</text>
					<text class="menu-text">系统概览</text>
				</view>
				<view class="menu-item" :class="{ active: activeTab === 'users' }" @click="activeTab = 'users'">
					<text class="menu-icon">👥</text>
					<text class="menu-text">用户管理</text>
				</view>
				<view class="menu-item" :class="{ active: activeTab === 'relations' }" @click="activeTab = 'relations'">
					<text class="menu-icon">🔗</text>
					<text class="menu-text">绑定管理</text>
				</view>
				<view class="menu-item" :class="{ active: activeTab === 'settings' }" @click="activeTab = 'settings'">
					<text class="menu-icon">⚙️</text>
					<text class="menu-text">设置中心</text>
				</view>
				<view class="menu-item" :class="{ active: activeTab === 'services' }" @click="activeTab = 'services'">
					<text class="menu-icon">🔧</text>
					<text class="menu-text">服务状态</text>
				</view>
			</view>

			<!-- 右侧内容 -->
			<view class="content-area">
				<!-- 系统概览 -->
				<view v-if="activeTab === 'overview'" class="tab-content">
					<view class="card">
						<view class="card-header">
							<text class="card-title">系统概览</text>
							<button class="refresh-btn" @click="loadOverview">刷新</button>
						</view>
						<view v-if="loading.overview" class="loading">加载中...</view>
						<view v-else-if="overviewData" class="overview-data">
							<view class="overview-item">
								<text class="overview-label">总用户数</text>
								<text class="overview-value">{{ overviewData.total_users || 0 }}</text>
							</view>
							<view class="overview-item">
								<text class="overview-label">绑定关系数</text>
								<text class="overview-value">{{ overviewData.total_relations || 0 }}</text>
							</view>
							<view class="overview-item">
								<text class="overview-label">提醒总数</text>
								<text class="overview-value">{{ overviewData.total_reminders || 0 }}</text>
							</view>
							<view class="overview-item">
								<text class="overview-label">呼救记录</text>
								<text class="overview-value">{{ overviewData.total_emergency_calls || 0 }}</text>
							</view>
							<view class="overview-item">
								<text class="overview-label">OCR识别记录</text>
								<text class="overview-value">{{ overviewData.total_medication_ocr_records || 0 }}</text>
							</view>
						</view>
						<view v-else class="error">加载失败</view>
					</view>
				</view>

				<!-- 用户管理 -->
				<view v-if="activeTab === 'users'" class="tab-content">
					<view class="card">
						<view class="card-header">
							<text class="card-title">用户管理</text>
							<button class="refresh-btn" @click="loadUsers">刷新</button>
						</view>
						<view v-if="loading.users" class="loading">加载中...</view>
						<view v-else-if="usersData && usersData.length > 0" class="users-list">
							<view v-for="user in usersData" :key="user.id" class="user-item">
								<view class="user-info">
									<text class="user-name">{{ user.username }}</text>
									<text class="user-role">{{ user.role }}</text>
								</view>
								<view class="user-actions">
									<button class="action-btn" @click="setVip(user.id)">设置VIP</button>
								</view>
							</view>
						</view>
						<view v-else class="empty">暂无用户数据</view>
					</view>
				</view>

				<!-- 绑定管理 -->
				<view v-if="activeTab === 'relations'" class="tab-content">
					<view class="card">
						<view class="card-header">
							<text class="card-title">绑定管理</text>
							<button class="refresh-btn" @click="loadRelations">刷新</button>
						</view>
						<view v-if="loading.relations" class="loading">加载中...</view>
						<view v-else-if="relationsData && relationsData.length > 0" class="relations-list">
							<view v-for="relation in relationsData" :key="relation.id" class="relation-item">
								<view class="relation-info">
									<text class="relation-child">{{ relation.child_username }}</text>
									<text class="relation-arrow">→</text>
									<text class="relation-elder">{{ relation.elder_username }}</text>
								</view>
								<text class="relation-date">{{ formatDate(relation.created_at) }}</text>
							</view>
						</view>
						<view v-else class="empty">暂无绑定数据</view>
					</view>
				</view>

				<!-- 设置中心 -->
				<view v-if="activeTab === 'settings'" class="tab-content">
					<view class="card">
						<view class="card-header">
							<text class="card-title">设置中心</text>
							<button class="refresh-btn" @click="loadSettings">刷新</button>
						</view>
						<view class="settings-form">
							<input v-model="settingKey" placeholder="请输入设置键（如 AI_API_KEY）" class="setting-input" />
							<input v-model="settingValue" placeholder="请输入设置值" class="setting-input" />
							<button class="save-btn" @click="saveSetting">保存</button>
						</view>
						<view v-if="loading.settings" class="loading">加载中...</view>
						<view v-else-if="settingsData && settingsData.length > 0" class="settings-list">
							<view v-for="setting in settingsData" :key="setting.key" class="setting-item">
								<text class="setting-key">{{ setting.key }}</text>
								<text class="setting-value">已设置</text>
							</view>
						</view>
						<view v-else class="empty">暂无设置数据</view>
					</view>
				</view>

				<!-- 服务状态 -->
				<view v-if="activeTab === 'services'" class="tab-content">
					<view class="card">
						<view class="card-header">
							<text class="card-title">服务状态</text>
							<button class="refresh-btn" @click="checkServices">检查</button>
						</view>
						<view v-if="loading.services" class="loading">检查中...</view>
						<view v-else-if="servicesData" class="services-list">
							<view v-for="(status, service) in servicesData" :key="service" class="service-item">
								<text class="service-name">{{ service }}</text>
								<text :class="['service-status', status === '正常' ? 'status-normal' : 'status-warning']">{{ status }}</text>
							</view>
						</view>
						<view v-else class="error">检查失败</view>
					</view>
				</view>
			</view>
		</view>

		<!-- VIP设置弹窗 -->
		<view v-if="showVipModal" class="modal-overlay" @click="showVipModal = false">
			<view class="modal-content" @click.stop>
				<view class="modal-header">
					<text class="modal-title">设置VIP</text>
					<text class="modal-close" @click="showVipModal = false">×</text>
				</view>
				<view class="modal-body">
					<text class="modal-label">用户ID: {{ selectedUserId }}</text>
					<input v-model="vipDays" type="number" placeholder="请输入天数" class="modal-input" />
				</view>
				<view class="modal-footer">
					<button class="modal-btn cancel-btn" @click="showVipModal = false">取消</button>
					<button class="modal-btn confirm-btn" @click="confirmSetVip">确定</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { request } from '../../utils/request';
import { speak } from '../../utils/voice';

// 状态管理
const activeTab = ref('overview');
const userInfo = ref(JSON.parse(uni.getStorageSync('user') || '{}'));

// 数据状态
const overviewData = ref(null);
const usersData = ref(null);
const relationsData = ref(null);
const settingsData = ref(null);
const servicesData = ref(null);

// 加载状态
const loading = ref({
	overview: false,
	users: false,
	relations: false,
	settings: false,
	services: false
});

// 设置表单
const settingKey = ref('');
const settingValue = ref('');

// VIP设置
const showVipModal = ref(false);
const selectedUserId = ref('');
const vipDays = ref('');

// 格式化日期
const formatDate = (dateStr) => {
	if (!dateStr) return '';
	const date = new Date(dateStr);
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

// 加载系统概览
const loadOverview = async () => {
	loading.value.overview = true;
	try {
		const res = await request('/admin/overview');
		overviewData.value = res.data;
	} catch (err) {
		uni.showToast({ title: err.message || '加载失败', icon: 'none' });
	} finally {
		loading.value.overview = false;
	}
};

// 加载用户列表
const loadUsers = async () => {
	loading.value.users = true;
	try {
		const res = await request('/admin/users');
		usersData.value = res.data;
	} catch (err) {
		uni.showToast({ title: err.message || '加载失败', icon: 'none' });
	} finally {
		loading.value.users = false;
	}
};

// 加载绑定关系
const loadRelations = async () => {
	loading.value.relations = true;
	try {
		const res = await request('/admin/relations');
		relationsData.value = res.data;
	} catch (err) {
		uni.showToast({ title: err.message || '加载失败', icon: 'none' });
	} finally {
		loading.value.relations = false;
	}
};

// 加载设置
const loadSettings = async () => {
	loading.value.settings = true;
	try {
		const res = await request('/admin/settings');
		settingsData.value = res.data;
	} catch (err) {
		uni.showToast({ title: err.message || '加载失败', icon: 'none' });
	} finally {
		loading.value.settings = false;
	}
};

// 检查服务状态
const checkServices = async () => {
	loading.value.services = true;
	try {
		// 检查API状态
		await request('/admin/overview');
		servicesData.value = {
			api: '正常',
			database: '正常',
			ai: '未配置',
			ocr: '未配置'
		};

		// 检查设置中的服务配置
		const settings = await request('/admin/settings');
		const settingKeys = settings.data.map(s => s.key);
		
		if (settingKeys.includes('AI_API_KEY')) {
			servicesData.value.ai = '已配置';
		}
		
		if (settingKeys.includes('BAIDU_OCR_API_KEY')) {
			servicesData.value.ocr = '已配置';
		}
	} catch (err) {
		servicesData.value = {
			api: '异常',
			database: '未知',
			ai: '未知',
			ocr: '未知'
		};
		uni.showToast({ title: err.message || '检查失败', icon: 'none' });
	} finally {
		loading.value.services = false;
	}
};

// 保存设置
const saveSetting = async () => {
	if (!settingKey.value || !settingValue.value) {
		uni.showToast({ title: '请输入设置键和值', icon: 'none' });
		return;
	}

	try {
		await request('/admin/settings/set', 'POST', {
			key: settingKey.value,
			value: settingValue.value
		});
		uni.showToast({ title: '保存成功', icon: 'success' });
		settingValue.value = '';
		loadSettings();
	} catch (err) {
		uni.showToast({ title: err.message || '保存失败', icon: 'none' });
	}
};

// 设置VIP
const setVip = (userId) => {
	selectedUserId.value = userId;
	vipDays.value = '';
	showVipModal.value = true;
};

// 确认设置VIP
const confirmSetVip = async () => {
	if (!vipDays.value || isNaN(vipDays.value)) {
		uni.showToast({ title: '请输入有效的天数', icon: 'none' });
		return;
	}

	try {
		await request('/admin/set_vip', 'POST', {
			user_id: selectedUserId.value,
			days: vipDays.value
		});
		uni.showToast({ title: 'VIP设置成功', icon: 'success' });
		showVipModal.value = false;
		loadUsers();
	} catch (err) {
		uni.showToast({ title: err.message || '设置失败', icon: 'none' });
	}
};

// 退出登录
const handleLogout = () => {
	uni.removeStorageSync('token');
	uni.removeStorageSync('user');
	uni.reLaunch({ url: '/pages/login/login' });
};

// 初始化
onMounted(() => {
	loadOverview();
	checkServices();
});
</script>

<style lang="scss" scoped>
.admin-container {
	height: 100vh;
	display: flex;
	flex-direction: column;
	background: #f5f7fa;
}

.topbar {
	position: sticky;
	top: 0;
	background: #ffffff;
	border-bottom: 1px solid #eaeaea;
	padding: 14px 18px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	z-index: 10;

	.brand {
		font-weight: 800;
		font-size: 32rpx;
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 12px;

		.logout-btn {
			height: 36px;
			padding: 0 12px;
			border: 1px solid #e6e6e6;
			background: #f5f7fa;
			color: #333;
			border-radius: 8px;
		}
	}
}

.main-content {
	flex: 1;
	display: flex;
	overflow: hidden;
}

.sidebar {
	width: 200px;
	background: #ffffff;
	border-right: 1px solid #eaeaea;
	padding: 20px 0;

	.menu-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 16px 20px;
		cursor: pointer;
		transition: all 0.3s ease;

		.menu-icon {
			font-size: 24rpx;
		}

		.menu-text {
			font-size: 28rpx;
		}

		&.active {
			background: #f0f7ff;
			color: #4A90E2;
		}

		&:hover {
			background: #f9f9f9;
		}
	}
}

.content-area {
	flex: 1;
	padding: 20px;
	overflow-y: auto;
}

.tab-content {
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.card {
	background: #ffffff;
	border-radius: 14px;
	padding: 20px;
	box-shadow: 0 2px 10px rgba(0,0,0,0.06);

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;

		.card-title {
			font-weight: 800;
			font-size: 32rpx;
		}

		.refresh-btn {
			height: 36px;
			padding: 0 12px;
			border: 1px solid #4A90E2;
			background: #4A90E2;
			color: #fff;
			border-radius: 8px;
		}
	}

	.loading,
	.error,
	.empty {
		padding: 40px;
		text-align: center;
		color: #666;
	}
}

.overview-data {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	gap: 20px;

	.overview-item {
		background: #f9f9f9;
		padding: 20px;
		border-radius: 12px;
		text-align: center;

		.overview-label {
			display: block;
			font-size: 24rpx;
			color: #666;
			margin-bottom: 8px;
		}

		.overview-value {
			display: block;
			font-size: 40rpx;
			font-weight: 800;
			color: #4A90E2;
		}
	}
}

.users-list,
.relations-list {
	display: flex;
	flex-direction: column;
	gap: 12px;

	.user-item,
	.relation-item {
		background: #f9f9f9;
		padding: 16px;
		border-radius: 12px;
		display: flex;
		justify-content: space-between;
		align-items: center;

		.user-info {
			display: flex;
			align-items: center;
			gap: 12px;

			.user-name {
				font-weight: 600;
			}

			.user-role {
				font-size: 24rpx;
				color: #666;
				background: #f0f0f0;
				padding: 4px 8px;
				border-radius: 6px;
			}
		}

		.user-actions {
			.action-btn {
				height: 32px;
				padding: 0 12px;
				border: 1px solid #4A90E2;
				background: #4A90E2;
				color: #fff;
				border-radius: 6px;
				font-size: 24rpx;
			}
		}

		.relation-info {
			display: flex;
			align-items: center;
			gap: 12px;

			.relation-child,
			.relation-elder {
				font-weight: 600;
			}

			.relation-arrow {
				color: #999;
			}
		}

		.relation-date {
			font-size: 24rpx;
			color: #999;
		}
	}
}

.settings-form {
	display: flex;
	gap: 12px;
	margin-bottom: 20px;

	.setting-input {
		flex: 1;
		height: 40px;
		padding: 0 12px;
		border: 1px solid #e6e6e6;
		border-radius: 8px;
	}

	.save-btn {
		height: 40px;
		padding: 0 20px;
		border: 1px solid #4A90E2;
		background: #4A90E2;
		color: #fff;
		border-radius: 8px;
	}
}

.settings-list {
	display: flex;
	flex-direction: column;
	gap: 12px;

	.setting-item {
		background: #f9f9f9;
		padding: 16px;
		border-radius: 12px;
		display: flex;
		justify-content: space-between;
		align-items: center;

		.setting-key {
			font-weight: 600;
		}

		.setting-value {
			font-size: 24rpx;
			color: #666;
			background: #e8f0fe;
			padding: 4px 8px;
			border-radius: 6px;
		}
	}
}

.services-list {
	display: flex;
	flex-direction: column;
	gap: 12px;

	.service-item {
		background: #f9f9f9;
		padding: 16px;
		border-radius: 12px;
		display: flex;
		justify-content: space-between;
		align-items: center;

		.service-name {
			font-weight: 600;
		}

		.service-status {
			padding: 4px 12px;
			border-radius: 6px;
			font-size: 24rpx;

			&.status-normal {
				background: #e8f5e8;
				color: #2e7d32;
			}

			&.status-warning {
				background: #fff3e0;
				color: #ef6c00;
			}
		}
	}
}

.modal-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0,0,0,0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 1000;
}

.modal-content {
	background: #ffffff;
	border-radius: 16px;
	padding: 24px;
	width: 80%;
	max-width: 500px;

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;

		.modal-title {
			font-weight: 800;
			font-size: 32rpx;
		}

		.modal-close {
			font-size: 40rpx;
			cursor: pointer;
			color: #999;
		}
	}

	.modal-body {
		margin-bottom: 24px;

		.modal-label {
			display: block;
			margin-bottom: 12px;
			font-size: 28rpx;
		}

		.modal-input {
			width: 100%;
			height: 44px;
			padding: 0 12px;
			border: 1px solid #e6e6e6;
			border-radius: 8px;
		}
	}

	.modal-footer {
		display: flex;
		gap: 12px;
		justify-content: flex-end;

		.modal-btn {
			height: 40px;
			padding: 0 20px;
			border-radius: 8px;

			&.cancel-btn {
				border: 1px solid #e6e6e6;
				background: #f5f7fa;
				color: #333;
			}

			&.confirm-btn {
				border: 1px solid #4A90E2;
				background: #4A90E2;
				color: #fff;
			}
		}
	}
}
</style>