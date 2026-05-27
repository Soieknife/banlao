<template>
  <view class="detail-container">
    <image :src="detail.cover" class="detail-cover"></image>
    <view class="detail-content">
      <text class="detail-title">{{ detail.name }}</text>
      <text class="detail-intro">{{ detail.intro }}</text>
      <view class="detail-section">
        <text class="section-title">剧情简介</text>
        <text class="section-text">{{ detail.story }}</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      id: 0,
      detail: {}
    }
  },
  onLoad(options) {
    this.id = options.id
    this.getOperaDetail()
  },
  methods: {
    getOperaDetail() {
      // 模拟数据，后续对接后端接口时可以替换
      const allOpera = [
        {
          id: 1,
          name: "豫剧《穆桂英挂帅》",
          cover: "/static/opera/1.jpg",
          intro: "豫剧经典剧目，展现巾帼英雄的豪情壮志",
          story: "北宋时期，杨家将后代穆桂英，在国家危难之际，毅然挂帅出征，大败敌军，保卫家国的故事。全剧唱腔高亢激昂，人物形象鲜明，是豫剧的代表作之一。"
        },
        {
          id: 2,
          name: "京剧《霸王别姬》",
          cover: "/static/opera/2.jpg",
          intro: "京剧经典，千古绝唱的爱情悲剧",
          story: "楚汉相争末期，项羽被刘邦大军围困于垓下，四面楚歌。虞姬为不拖累项羽，拔剑自刎，项羽也最终乌江自刎。全剧唱腔凄美，是京剧艺术的巅峰之作。"
        },
        {
          id: 3,
          name: "黄梅戏《天仙配》",
          cover: "/static/opera/3.jpg",
          intro: "黄梅戏经典，讲述七仙女与董永的爱情传说",
          story: "七仙女下凡，与孝子董永相遇，两人结为夫妻，过着男耕女织的幸福生活。后被玉帝发现，强行拆散，留下一段凄美的爱情故事。"
        }
      ]
      this.detail = allOpera.find(item => item.id == this.id) || {}
    }
  }
}
</script>

<style scoped>
.detail-container {
  background-color: #f5f5f5;
  min-height: 100vh;
}
.detail-cover {
  width: 100%;
  height: 400rpx;
  object-fit: cover;
}
.detail-content {
  padding: 30rpx;
  background-color: #fff;
  margin: -40rpx 20rpx 0;
  border-radius: 24rpx;
  position: relative;
  z-index: 1;
}
.detail-title {
  font-size: 38rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 20rpx;
}
.detail-intro {
  font-size: 28rpx;
  color: #666;
  line-height: 1.6;
  display: block;
  margin-bottom: 30rpx;
}
.detail-section {
  margin-top: 30rpx;
}
.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 16rpx;
}
.section-text {
  font-size: 28rpx;
  color: #444;
  line-height: 1.8;
}
</style>