<template>
  <view class="detail-container">
    <view class="detail-content">
      <text class="detail-title">{{ detail.title }}</text>
      <text class="detail-time">{{ detail.time }}</text>
      <text class="detail-content-text">{{ detail.content }}</text>
      <view class="detail-tips">
        <text class="tips-title">防骗小提示</text>
        <text class="tips-text">{{ detail.tips }}</text>
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
    this.getArticleDetail()
  },
  methods: {
    getArticleDetail() {
      // 模拟数据，后续对接后端接口时可以替换
      const allArticles = [
        {
          id: 1,
          title: "警惕“养老保健品”诈骗！",
          time: "2026-05-27",
          content: "很多骗子会打着“免费体检”“专家义诊”“健康讲座”的旗号，向老年人推销高价保健品，声称能治病、延年益寿。他们通常会夸大保健品功效，甚至伪造病历、夸大病情，让老年人产生恐慌心理，从而购买昂贵的产品。",
          tips: "⚠️ 保健品不是药品，不能治疗疾病！遇到推销高价保健品的情况，一定要和子女商量，不要轻易掏钱购买，也不要相信所谓的“专家”。"
        },
        {
          id: 2,
          title: "电信诈骗常见套路，老年人必看",
          time: "2026-05-26",
          content: "1. 冒充公检法诈骗：骗子自称警察、检察官，说你涉嫌犯罪，让你把钱转到“安全账户”。\n2. 客服退款诈骗：骗子冒充客服，说你购买的商品有问题，要给你退款，诱导你点击陌生链接或下载APP。\n3. 中奖诈骗：骗子说你中了大奖，要你先交“手续费”“税费”才能领奖。",
          tips: "⚠️ 公检法机关不会通过电话办案，更不会让你转账！凡是要求你转账、透露验证码的，一律是诈骗！"
        },
        {
          id: 3,
          title: "“冒充熟人借钱”诈骗如何防范？",
          time: "2026-05-25",
          content: "骗子会通过盗号、换头像昵称等方式，伪装成你的子女、亲友，以“急事用钱”“生病住院”等理由向你借钱。很多老年人因为担心亲人，来不及核实就转了账，导致被骗。",
          tips: "⚠️ 凡是亲友在微信/QQ上借钱，一定要打电话或视频核实身份！不要仅凭文字消息就转账！"
        }
      ]
      this.detail = allArticles.find(item => item.id == this.id) || {}
    }
  }
}
</script>

<style scoped>
.detail-container {
  background-color: #f5f5f5;
  min-height: 100vh;
  padding: 20rpx;
}
.detail-content {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
}
.detail-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 20rpx;
}
.detail-time {
  font-size: 24rpx;
  color: #999;
  display: block;
  margin-bottom: 30rpx;
}
.detail-content-text {
  font-size: 28rpx;
  color: #444;
  line-height: 1.8;
  display: block;
  margin-bottom: 30rpx;
}
.detail-tips {
  background-color: #fff5f5;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-top: 30rpx;
}
.tips-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #e64340;
  display: block;
  margin-bottom: 12rpx;
}
.tips-text {
  font-size: 26rpx;
  color: #e64340;
  line-height: 1.6;
}
</style>