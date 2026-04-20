<template>
	<view class="page-container profile-page">
		<AppSidebar active-path="/pages/profile/profile" />

		<view class="hero card-elder">
			<view class="text-title">个人信息</view>
			<view class="text-helper">查看账号信息、修改手机号，也能管理紧急联系人和已绑定家人</view>
		</view>

		<view class="card-elder">
			<view class="section-title">基础信息</view>
			<view class="field">
				<view class="label">账号</view>
				<view class="value">{{ profile.username || '-' }}</view>
			</view>
			<view class="field">
				<view class="label">昵称</view>
				<input v-model="form.nickname" class="input" placeholder="请输入昵称" />
			</view>
			<view class="field">
				<view class="label">手机号</view>
				<input v-model="form.phone" class="input" placeholder="请输入手机号" />
			</view>
			<view class="field">
				<view class="label">新密码</view>
				<input v-model="form.password" class="input" password placeholder="不修改可留空" />
			</view>
		</view>

		<view class="card-elder">
			<view class="section-title">紧急联系人</view>
			<view class="field">
				<view class="label">联系人</view>
				<input v-model="form.emergency_contact" class="input" placeholder="请输入紧急联系人称呼" />
			</view>
			<view class="field">
				<view class="label">联系电话</view>
				<input v-model="form.emergency_phone" class="input" placeholder="请输入联系电话" />
			</view>
		</view>

		<view v-if="isElder" class="card-elder">
			<view class="section-head">
				<view>
					<view class="section-title">已绑定家人</view>
					<view class="text-helper">这些家人可以查看状态并帮助您设置提醒</view>
				</view>
				<button class="mini-btn" @click="fetchChildren">刷新</button>
			</view>

			<view v-if="children.length === 0" class="text-helper">暂时还没有绑定的家人</view>
			<view v-else class="family-list">
				<view v-for="child in children" :key="child.id" class="family-item">
					<view>
						<view class="family-name">{{ child.nickname || child.username }}</view>
						<view class="text-helper">{{ child.phone || '未填写手机号' }}</view>
					</view>
					<button class="mini-btn danger" @click="removeChild(child)">解绑</button>
				</view>
			</view>
		</view>

		<view v-else class="card-elder">
			<view class="section-title">守护说明</view>
			<view class="text-helper">您当前是家人账号，可通过首页和侧边栏进入各项守护功能。</view>
		</view>

		<button class="btn-elder save-btn" @click="saveProfile">保存修改</button>
	</view>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { request } from '../../utils/request';
import AppSidebar from '../../components/AppSidebar.vue';

const profile = ref({});
const children = ref([]);
const form = ref({
	nickname: '',
	phone: '',
	password: '',
	emergency_contact: '',
	emergency_phone: ''
});

const isElder = computed(() => profile.value.role === 'elder');

const syncForm = () => {
	form.value = {
		nickname: profile.value.nickname || '',
		phone: profile.value.phone || '',
		password: '',
		emergency_contact: profile.value.emergency_contact || '',
		emergency_phone: profile.value.emergency_phone || ''
	};
};

const fetchProfile = async () => {
	try {
		const res = await request('/user/profile');
		profile.value = res.data || {};
		syncForm();
	} catch (err) {
		uni.showToast({ title: err.message || '加载个人信息失败', icon: 'none' });
	}
};

const fetchChildren = async () => {
	if (!isElder.value) return;
	try {
		const res = await request('/relation/my_children');
		children.value = Array.isArray(res.data) ? res.data : [];
	} catch (err) {
		children.value = [];
	}
};

const saveProfile = async () => {
	try {
		const payload = {
			nickname: form.value.nickname,
			phone: form.value.phone,
			emergency_contact: form.value.emergency_contact,
			emergency_phone: form.value.emergency_phone
		};
		if (form.value.password) {
			payload.password = form.value.password;
		}
		const res = await request('/user/profile/update', 'POST', payload);
		profile.value = res.data || {};
		syncForm();
		const storedUser = uni.getStorageSync('user');
		if (storedUser) {
			const parsed = JSON.parse(storedUser);
			parsed.nickname = profile.value.nickname;
			uni.setStorageSync('user', JSON.stringify(parsed));
		}
		uni.showToast({ title: '保存成功', icon: 'success' });
	} catch (err) {
		uni.showToast({ title: err.message || '保存失败', icon: 'none' });
	}
};

const removeChild = (child) => {
	uni.showModal({
		title: '解绑家人',
		content: `确定要解绑 ${child.nickname || child.username} 吗？`,
		confirmText: '解绑',
		confirmColor: '#E74C3C',
		success: async (res) => {
			if (!res.confirm) return;
			try {
				await request('/relation/remove_child', 'POST', { child_id: child.id });
				uni.showToast({ title: '已解绑', icon: 'success' });
				fetchChildren();
			} catch (err) {
				uni.showToast({ title: err.message || '解绑失败', icon: 'none' });
			}
		}
	});
};

const refreshPage = async () => {
	await fetchProfile();
	await fetchChildren();
};

onMounted(() => {
	refreshPage();
});

onShow(() => {
	refreshPage();
});
</script>

<style lang="scss" scoped>
.profile-page {
	padding-bottom: 120rpx;
}

.hero {
	background: linear-gradient(135deg, #ffffff 0%, #eef6ff 100%);
	border: 2rpx solid #d9e9ff;
}

.section-title {
	font-size: 34rpx;
	font-weight: bold;
	color: #22324d;
	margin-bottom: 18rpx;
}

.section-head,
.field,
.family-item {
	display: flex;
	justify-content: space-between;
	gap: 20rpx;
}

.section-head {
	align-items: flex-start;
}

.field {
	align-items: center;
	margin-top: 18rpx;
}

.label {
	width: 140rpx;
	flex-shrink: 0;
	font-size: 28rpx;
	color: #6b7a90;
}

.value {
	flex: 1;
	font-size: 30rpx;
	color: #1f2937;
}

.input {
	flex: 1;
	height: 86rpx;
	border-radius: 16rpx;
	border: 2rpx solid #dbe3ef;
	padding: 0 20rpx;
	font-size: 30rpx;
	background-color: #fff;
}

.family-list {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
	margin-top: 18rpx;
}

.family-item {
	align-items: center;
	padding: 22rpx;
	border-radius: 18rpx;
	background-color: #f8fbff;
}

.family-name {
	font-size: 30rpx;
	font-weight: bold;
	color: #22324d;
}

.mini-btn {
	height: 68rpx;
	line-height: 68rpx;
	padding: 0 22rpx;
	border-radius: 16rpx;
	background-color: #f1f5f9;
	font-size: 26rpx;
	color: #334155;
}

.mini-btn.danger {
	background-color: #fff1f1;
	color: $warning-color;
}

.save-btn {
	width: 100%;
}
</style>
