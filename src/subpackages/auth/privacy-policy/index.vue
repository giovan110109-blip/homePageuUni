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
  <view class="policy-page" :style="{ backgroundColor: themeStore.colors.bgPrimary }">
    <scroll-view scroll-y :style="{ height: scrollHeight }">
      <view class="content" :style="{ color: themeStore.colors.textPrimary }">
        <text class="title">隐私政策</text>
        <text class="update-time">更新日期：2024年3月1日</text>
        <text class="update-time">生效日期：2024年3月1日</text>

        <text class="section-title">引言</text>
        <text class="section-content">"Giovan个人主页"小程序（以下简称"本小程序"）非常重视用户隐私保护。本隐私政策旨在向您说明本小程序如何收集、使用、存储和保护您的个人信息。请您在使用本小程序前仔细阅读本政策。</text>

        <text class="section-title">一、我们收集的信息</text>
        <text class="section-content">1.1 您主动提供的信息：</text>
        <text class="section-content">- 留言内容：当您在留言板发布留言时，我们会收集您填写的昵称、邮箱（可选）、留言内容</text>
        <text class="section-content">- 管理员信息：管理员登录时，我们会收集微信授权的基本信息（昵称、头像）</text>
        <text class="section-content">1.2 我们自动收集的信息：</text>
        <text class="section-content">- 设备信息：设备型号、操作系统版本</text>
        <text class="section-content">- 日志信息：操作记录、错误日志、IP地址</text>
        <text class="section-content">- 位置信息：留言时的城市信息（基于IP定位）</text>

        <text class="section-title">二、我们如何使用信息</text>
        <text class="section-content">2.1 我们使用收集的信息用于：</text>
        <text class="section-content">- 提供照片展示、留言板、动态分享等服务</text>
        <text class="section-content">- 展示留言者昵称和头像</text>
        <text class="section-content">- 改进产品功能和用户体验</text>
        <text class="section-content">- 保障服务安全稳定运行</text>
        <text class="section-content">- 防止违法违规行为</text>

        <text class="section-title">三、信息存储</text>
        <text class="section-content">3.1 您的信息存储在中华人民共和国境内的服务器。</text>
        <text class="section-content">3.2 我们采用业界标准的安全措施（如数据加密、访问控制等）保护您的信息。</text>
        <text class="section-content">3.3 我们会在实现目的所需的期限内保留您的信息，超出期限后删除或匿名化处理。</text>

        <text class="section-title">四、信息共享</text>
        <text class="section-content">4.1 我们不会向第三方出售您的个人信息。</text>
        <text class="section-content">4.2 未经您的同意，我们不会向第三方共享您的个人信息，但以下情况除外：</text>
        <text class="section-content">- 法律法规要求或政府部门依法要求</text>
        <text class="section-content">- 保护我们或用户的合法权益</text>
        <text class="section-content">- 经您同意的其他情况</text>

        <text class="section-title">五、您的权利</text>
        <text class="section-content">5.1 访问权：您有权访问我们持有的您的个人信息。</text>
        <text class="section-content">5.2 更正权：您有权要求更正不准确的个人信息。</text>
        <text class="section-content">5.3 删除权：您有权要求删除您的个人信息。</text>
        <text class="section-content">5.4 注销权：管理员有权注销账号，注销后我们将删除您的个人信息。</text>
        <text class="section-content">5.5 撤回同意：您有权撤回之前给予的授权同意。</text>

        <text class="section-title">六、Cookie和类似技术</text>
        <text class="section-content">6.1 我们使用微信小程序本地存储（Storage）技术保存您的登录状态和偏好设置。</text>
        <text class="section-content">6.2 您可以在小程序设置中清除本地存储数据。</text>

        <text class="section-title">七、未成年人保护</text>
        <text class="section-content">7.1 本小程序主要面向成年人提供服务。</text>
        <text class="section-content">7.2 如我们发现在未获得可证实的监护人同意的情况下收集了未成年人的个人信息，我们会尽快删除相关信息。</text>

        <text class="section-title">八、第三方服务</text>
        <text class="section-content">8.1 本小程序使用了微信开放平台提供的登录服务，微信可能会收集您的设备信息。</text>
        <text class="section-content">8.2 我们不对第三方的隐私政策负责，建议您阅读第三方的隐私政策。</text>

        <text class="section-title">九、政策更新</text>
        <text class="section-content">9.1 我们可能适时修订本政策，修订后的政策将在小程序内公布。</text>
        <text class="section-content">9.2 重大变更会通过弹窗等方式通知您。</text>
        <text class="section-content">9.3 如您继续使用本小程序，即表示您同意接受修订后的政策。</text>

        <text class="section-title">十、联系我们</text>
        <text class="section-content">如您对本隐私政策有任何疑问、意见或建议，请通过以下方式联系我们：</text>
        <text class="section-content">- 通过小程序内的联系方式与开发者联系</text>
        <text class="section-content">我们将在15个工作日内回复您的请求。</text>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped>
.policy-page {
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
