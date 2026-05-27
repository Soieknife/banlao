<template>
  <view class="opera-container">
    <view class="page-title">戏曲天地</view>
    <scroll-view scroll-y class="opera-list">
      <view 
        class="opera-item" 
        v-for="(item, index) in operaList" 
        :key="index"
        @click="goToDetail(item)"
      >
        <image :src="item.cover" class="opera-cover"></image>
        <view class="opera-info">
          <text class="opera-name">{{ item.name }}</text>
          <text class="opera-desc">{{ item.desc }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      operaList: [
        {
          id: 1,
          name: "豫剧《穆桂英挂帅》",
          desc: "巾帼英雄，保家卫国的经典故事",
          cover: "/static/opera/1.jpg"
        },
        {
          id: 2,
          name: "京剧《霸王别姬》",
          desc: "千古绝唱，项羽与虞姬的凄美爱情",
          cover: "/static/opera/2.jpg"
        },
        {
          id: 3,
          name: "黄梅戏《天仙配》",
          desc: "七仙女与董永的爱情传说",
          cover: "/static/opera/3.jpg"
        }
      ]
    }
  },
  methods: {
    goToDetail(item) {
      uni.navigateTo({
        url: `/pages/opera/detail?id=${item.id}`
      })
    }
  }
}
</script>

<style scoped>
.opera-container {
  padding: 20rpx;
  background-color: #f5f5f5;
  min-height: 100vh;
}
.page-title {
  font-size: 38rpx;
  font-weight: bold;
  margin: 20rpx 0;
  color: #333;
}
.opera-list {
  height: calc(100vh - 120rpx);
}
.opera-item {
  display: flex;
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05);
}
.opera-cover {
  width: 180rpx;
  height: 180rpx;
  border-radius: 12rpx;
  margin-right: 24rpx;
  object-fit: cover;
}
.opera-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex: 1;
}
.opera-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 12rpx;
}
.opera-desc {
  font-size: 26rpx;
  color: #666;
  line-height: 1.4;
}
</style>