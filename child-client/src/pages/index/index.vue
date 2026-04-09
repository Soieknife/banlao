<template>
	<view class="container">
		<view class="header">
			<view>
				<text class="title">我的长辈</text>
				<text class="subtitle">您正在守护 {{ elders.length }} 位长辈</text>
			</view>
			<view class="header-btns">
				<button class="add-btn" @click="showBindModal = true">+</button>
				<button class="logout-btn" @click="handleLogout">退出</button>
			</view>
		</view>

		<!-- 老人列表 -->
		<view class="elder-list">
			<view v-for="elder in elders" :key="elder.id" class="elder-card" @click="viewElderStatus(elder)">
				<view class="elder-info">
					<view class="avatar">{{ elder.nickname?.[0] || '老' }}</view>
					<view class="details">
						<view class="name-row">
							<text class="name">{{ elder.nickname }}</text>
							<text v-if="elder.is_vip" class="vip-tag">VIP</text>
						</view>
						<text class="id">账号: {{ elder.username }}</text>
					</view>
				</view>
				<view class="status-tags">
					<text v-if="elder.status?.health?.medication_taken === 1" class="tag success">今日已服药</text>
					<text v-else class="tag warning">今日未服药</text>
					<text class="tag info">待办提醒 {{ elder.status?.reminders?.length || 0 }}</text>
				</view>
			</view>
		</view>

		<!-- 绑定弹窗 -->
		<view v-if="showBindModal" class="modal-overlay">
			<view class="modal">
				<view class="modal-header">绑定长辈账号</view>
				<input v-model="elderUsername" placeholder="请输入老人的用户名" class="modal-input" />
				<view class="modal-footer">
					<button @click="showBindModal = false">取消</button>
					<button class="confirm" @click="bindElder">确定</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { request } from '../../utils/request';

const elders = ref([]);
const showBindModal = ref(false);
const elderUsername = ref('');
const user = ref({});

const checkLogin = () => {
	const storedUser = uni.getStorageSync('user');
	if (!storedUser) {
		uni.redirectTo({ url: '/pages/login/login' });
		return false;
	}
	user.value = JSON.parse(storedUser);
	return true;
};

const handleLogout = () => {
	uni.showModal({
		title: '退出登录',
		content: '确定要退出当前账号吗？',
		success: (res) => {
			if (res.confirm) {
				uni.removeStorageSync('token');
				uni.removeStorageSync('user');
				uni.reLaunch({ url: '/pages/login/login' });
			}
		}
	});
};

const bindElder = async () => {
	if (!elderUsername.value) return;
	try {
		const res = await request('/relation/request_bind', 'POST', { elder_username: elderUsername.value });
		showBindModal.value = false;
		const code = res.data.verify_code;
		const expiresAt = res.data.expires_at;
		elderUsername.value = '';
		uni.showModal({
			title: '绑定申请已发送',
			content: `请让老人打开“绑定确认”，输入验证码：${code}\n有效期至：${expiresAt}`,
			confirmText: '我知道了'
		});
	} catch (err) {
		uni.showToast({ title: err.message || '绑定失败', icon: 'none' });
	}
};

const viewElderStatus = (elder) => {
	uni.navigateTo({
		url: `/pages/elder-status/elder-status?id=${elder.id}&name=${elder.nickname}`
	});
};

const fetchElders = async () => {
	try {
		const res = await request('/relation/elders');
		elders.value = res.data;
		
		// 循环获取每个老人的实时状态
		for (let elder of elders.value) {
			const statusRes = await request(`/relation/elder_status/${elder.id}`);
			elder.status = statusRes.data;
		}
	} catch (err) {
		console.error('获取老人列表失败', err);
	}
};

onMounted(() => {
	if (checkLogin()) {
		fetchElders();
	}
});
</script>

<style scoped>
.container {
	padding: 20px;
	background-color: #f5f7fa;
	min-height: 100vh;
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20px;
}

.header-btns {
	display: flex;
	gap: 10px;
}

.title {
	font-size: 24px;
	font-weight: bold;
	color: #333;
}

.subtitle {
	font-size: 14px;
	color: #999;
	display: block;
}

.add-btn {
	width: 40px;
	height: 40px;
	line-height: 36px;
	border-radius: 20px;
	background-color: #4A90E2;
	color: white;
	font-size: 24px;
	padding: 0;
	margin: 0;
}

.logout-btn {
	height: 40px;
	line-height: 40px;
	border-radius: 20px;
	background-color: #f5f7fa;
	color: #666;
	font-size: 14px;
	border: 1px solid #ddd;
}

.name-row {
	display: flex;
	align-items: center;
	gap: 8px;
}

.vip-tag {
	font-size: 10px;
	background-color: #FFF5E6;
	color: #F5A623;
	padding: 2px 6px;
	border-radius: 4px;
	border: 1px solid #F5A623;
}

.elder-card {
	background-color: white;
	border-radius: 12px;
	padding: 15px;
	margin-bottom: 15px;
	box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.elder-info {
	display: flex;
	align-items: center;
	margin-bottom: 10px;
}

.avatar {
	width: 50px;
	height: 50px;
	border-radius: 25px;
	background-color: #EBF3FF;
	color: #4A90E2;
	text-align: center;
	line-height: 50px;
	font-size: 20px;
	font-weight: bold;
	margin-right: 15px;
}

.details {
	display: flex;
	flex-direction: column;
}

.name {
	font-size: 18px;
	font-weight: bold;
	color: #333;
}

.id {
	font-size: 14px;
	color: #999;
}

.status-tags {
	display: flex;
	gap: 10px;
}

.tag {
	font-size: 12px;
	padding: 4px 8px;
	border-radius: 4px;
}

.tag.success {
	background-color: #E7F9EE;
	color: #2ECC71;
}

.tag.warning {
	background-color: #FFF5F5;
	color: #E74C3C;
}

.tag.info {
	background-color: #EBF3FF;
	color: #4A90E2;
}

.modal-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: rgba(0,0,0,0.5);
	display: flex;
	justify-content: center;
	align-items: center;
	z-index: 100;
}

.modal {
	background-color: white;
	width: 80%;
	border-radius: 12px;
	padding: 20px;
}

.modal-header {
	font-size: 18px;
	font-weight: bold;
	margin-bottom: 15px;
	text-align: center;
}

.modal-input {
	border: 1px solid #ddd;
	padding: 10px;
	border-radius: 6px;
	margin-bottom: 20px;
	width: 100%;
	box-sizing: border-box;
}

.modal-footer {
	display: flex;
	gap: 10px;
}

.modal-footer button {
	flex: 1;
	border-radius: 6px;
}

.modal-footer .confirm {
	background-color: #4A90E2;
	color: white;
}
</style>
