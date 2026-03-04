<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()
const scrollHeight = ref('100vh')

onMounted(() => {
  const systemInfo = uni.getSystemInfoSync()
  const statusBarHeight = systemInfo.statusBarHeight || 44
  scrollHeight.value = `calc(100vh - ${statusBarHeight}px)`
})
</script>

<template>
  <view class="agreement-page" :style="{ backgroundColor: themeStore.colors.bgPrimary }">
    <scroll-view scroll-y :style="{ height: scrollHeight }">
      <view class="content" :style="{ color: themeStore.colors.textPrimary }">
        <text class="title">用户协议</text>
        <text class="update-time">更新日期：2024年3月1日</text>
        <text class="update-time">生效日期：2024年3月1日</text>

        <text class="section-title">引言</text>
        <text class="section-content">欢迎您使用"Giovan个人主页"小程序（以下简称"本小程序"）。本小程序是一款个人简介及画廊展示应用，由个人开发者独立开发运营。为使用本小程序服务，您应当阅读并遵守本用户协议。请您务必审慎阅读、充分理解各条款内容。</text>

        <text class="section-title">一、服务说明</text>
        <text class="section-content">1.1 本小程序为个人开发者开发的个人简介及画廊展示应用，主要功能包括：</text>
        <text class="section-content">- 个人照片/画廊展示</text>
        <text class="section-content">- 留言板功能</text>
        <text class="section-content">- 动态/说说分享</text>
        <text class="section-content">1.2 本小程序仅限管理员本人登录后台管理功能，普通访客可浏览公开内容。</text>
        <text class="section-content">1.3 本小程序保留随时修改或中断服务的权利，恕不另行通知。</text>

        <text class="section-title">二、账号管理</text>
        <text class="section-content">2.1 本小程序后台管理功能仅支持微信授权登录。</text>
        <text class="section-content">2.2 管理员账号仅限本人使用，不得转让、出借给他人。</text>
        <text class="section-content">2.3 管理员应妥善保管账号信息，因账号保管不当造成的损失由管理员自行承担。</text>

        <text class="section-title">三、用户行为规范</text>
        <text class="section-content">3.1 访客在使用留言板等功能时，应遵守法律法规，不得发布以下内容：</text>
        <text class="section-content">- 反对宪法所确定的基本原则的</text>
        <text class="section-content">- 危害国家安全，泄露国家秘密，颠覆国家政权的</text>
        <text class="section-content">- 损害国家荣誉和利益的</text>
        <text class="section-content">- 煽动民族仇恨、民族歧视，破坏民族团结的</text>
        <text class="section-content">- 侵犯他人知识产权、肖像权、隐私权等合法权益的</text>
        <text class="section-content">- 含有虚假、有害、胁迫、侵害他人隐私、骚扰、侵害、中伤、粗俗、猥亵或其它道德上令人反感的内容</text>
        <text class="section-content">3.2 管理员有权删除违规留言内容。</text>

        <text class="section-title">四、知识产权</text>
        <text class="section-content">4.1 本小程序展示的所有照片、图片、文字等内容，其知识产权归原作者或权利人所有。</text>
        <text class="section-content">4.2 未经权利人书面许可，任何人不得复制、修改、传播本小程序中的任何内容。</text>
        <text class="section-content">4.3 本小程序的软件代码、界面设计等归开发者所有。</text>

        <text class="section-title">五、免责声明</text>
        <text class="section-content">5.1 本小程序按"现状"提供服务，不保证服务不会中断，对服务的及时性、安全性不作担保。</text>
        <text class="section-content">5.2 因不可抗力（包括但不限于自然灾害、政府行为、网络攻击等）导致的服务中断，本小程序不承担责任。</text>
        <text class="section-content">5.3 访客留言内容仅代表其个人观点，与本小程序立场无关。</text>

        <text class="section-title">六、协议修改</text>
        <text class="section-content">6.1 本小程序有权随时修改本协议，修改后的协议将在小程序内公布。</text>
        <text class="section-content">6.2 如用户继续使用本小程序，即视为同意修改后的协议。</text>

        <text class="section-title">七、法律适用与争议解决</text>
        <text class="section-content">7.1 本协议的订立、执行、解释及争议解决均适用中华人民共和国法律。</text>
        <text class="section-content">7.2 如就本协议内容或其执行发生任何争议，双方应尽力友好协商解决；协商不成时，任何一方均可向开发者所在地有管辖权的人民法院提起诉讼。</text>

        <text class="section-title">八、联系我们</text>
        <text class="section-content">如您对本用户协议有任何疑问，请通过小程序内的联系方式与开发者联系。</text>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped>
.agreement-page {
  min-height: 100vh;
}

.content {
  padding: 40rpx 32rpx;
  padding-top: calc(44px + 40rpx);
  padding-bottom: 100rpx;
}

.title {
  display: block;
  font-size: 44rpx;
  font-weight: bold;
  text-align: center;
  margin-bottom: 24rpx;
}

.update-time {
  display: block;
  font-size: 24rpx;
  text-align: center;
  margin-bottom: 8rpx;
  opacity: 0.6;
}

.section-title {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  margin-top: 40rpx;
  margin-bottom: 20rpx;
}

.section-content {
  display: block;
  font-size: 28rpx;
  line-height: 1.8;
  margin-bottom: 16rpx;
  opacity: 0.85;
}
</style>
