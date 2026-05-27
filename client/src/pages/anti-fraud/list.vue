<template>
  <view class="anti-fraud-container">
    <view class="page-title">防诈骗专区</view>
    <scroll-view scroll-y class="article-list">
      <view 
        class="article-item" 
        v-for="(item, index) in articleList" 
        :key="index"
        @click="goToDetail(item)"
      >
        <view class="article-info">
          <text class="article-title">{{ item.title }}</text>
          <text class="article-time">{{ item.time }}</text>
          <text class="article-preview">{{ item.preview }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      articleList: [
        {
          id: 1,
          title: "警惕“养老保健品”诈骗！",
          time: "2026-05-27",
          preview: "骗子常打着“免费体检”的旗号推销高价保健品..."
        },
        {
          id: 2,
          title: "电信诈骗常见套路，老年人必看",
          time: "2026-05-26",
          preview: "冒充公检法、客服退款、中奖诈骗，这些套路要认清..."
        },
        {
          id: 3,
          title: "“冒充熟人借钱”诈骗如何防范？",
          time: "2026-05-25",
          preview: "骗子伪装成子女或亲友借钱，如何快速识破？..."
        }
      ]
    }
  },
  methods: {
    goToDetail(item) {
      uni.navigateTo({
        url: `/pages/anti-fraud/detail?id=${item.id}`
      })
    }
  }
}
</script>

<style scoped>
.anti-fraud-container {
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
.article-list {
  height: calc(100vh - 120rpx);
}
.article-item {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05);
}
.article-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 12rpx;
}
.article-time {
  font-size: 24rpx;
  color: #999;
  display: block;
  margin-bottom: 16rpx;
}
.article-preview {
  font-size: 26rpx;
  color: #666;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>