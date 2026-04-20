<template>
	<view class="page-container">
		<view class="card-elder">
			<view class="text-title">正在进入统一首页</view>
			<view class="text-helper">子女守护功能已并入主应用，马上为您跳转。</view>
		</view>
	</view>
</template>

<script setup>
import { onMounted } from 'vue';

onMounted(() => {
	uni.reLaunch({ url: '/pages/index/index' });
});
</script>
