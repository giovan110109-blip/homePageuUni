<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { onMounted, ref } from 'vue'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()

const tabs = [
  {
    pagePath: '/pages/message/index',
    text: '留言板',
    icon: 'i-tabler-message-2',
    activeIcon: 'i-tabler-message-2-filled',
  },
  {
    pagePath: '/pages/index',
    text: '主页',
    icon: 'i-tabler-home',
    activeIcon: 'i-tabler-home-filled',
    isCenter: true,
  },
  {
    pagePath: '/pages/gallery/index',
    text: '画廊',
    icon: 'i-tabler-photo',
    activeIcon: 'i-tabler-photo-filled',
  },
]

const currentPath = ref('/pages/index')
const safeAreaBottom = ref(0)

onMounted(() => {
  try {
    const systemInfo = uni.getSystemInfoSync()
    if (systemInfo.safeArea && systemInfo.screenHeight) {
      safeAreaBottom.value = systemInfo.screenHeight - systemInfo.safeArea.bottom
    }
    else if (systemInfo.safeAreaInsets?.bottom) {
      safeAreaBottom.value = systemInfo.safeAreaInsets.bottom
    }
  }
  catch (e) {
    console.warn('Failed to get system info:', e)
  }
})

function switchTab(tab: typeof tabs[0]) {
  if (currentPath.value === tab.pagePath) {
    return
  }
  currentPath.value = tab.pagePath

  // #ifdef H5
  uni.navigateTo({
    url: tab.pagePath,
    fail: () => {
      uni.redirectTo({ url: tab.pagePath })
    },
  })
  // #endif

  // #ifndef H5
  uni.switchTab({
    url: tab.pagePath,
    fail: (err) => {
      console.error('switchTab failed:', err)
    },
  })
  // #endif
}

function isActive(tab: typeof tabs[0]) {
  return currentPath.value === tab.pagePath
}

onShow(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  if (currentPage?.route) {
    currentPath.value = `/${currentPage.route}`
  }
})
</script>

<template>
  <view
    class="custom-tabbar"
    :style="{
      backgroundColor: themeStore.colors.bgCard,
      paddingBottom: `${safeAreaBottom - 10}px`,
    }"
  >
    <view
      flex
      items-center
      justify-around
      py-1
      pb-2
    >
      <view
        v-for="tab in tabs"
        :key="tab.pagePath"
        flex
        flex-col
        items-center
        justify-center
        px-3
        py-1
        :class="tab.isCenter ? 'relative -mt-4' : ''"
        @click="switchTab(tab)"
      >
        <view
          v-if="tab.isCenter"
          w-11
          h-11
          rounded-full
          flex-center
          transition-transform
          duration-200
          active:scale-90
          :style="{
            backgroundColor: themeStore.colors.primary,
            boxShadow: `0 4px 16px ${themeStore.colors.primary}40`,
          }"
        >
          <view
            :class="isActive(tab) ? tab.activeIcon : tab.icon"
            text-xl
            text-white
          />
        </view>
        <template v-else>
          <view
            px-2
            py-1
            rounded-lg
            transition-transform
            duration-200
            active:scale-90
            :style="{
              backgroundColor: isActive(tab) ? `${themeStore.colors.primary}15` : 'transparent',
            }"
          >
            <view
              :class="isActive(tab) ? tab.activeIcon : tab.icon"
              text-xl
              transition-colors
              duration-200
              :style="{
                color: isActive(tab)
                  ? themeStore.colors.primary
                  : themeStore.colors.textMuted,
              }"
            />
          </view>
          <text
            text-xs
            mt-0.5
            font-medium
            transition-colors
            duration-200
            :style="{
              color: isActive(tab)
                ? themeStore.colors.primary
                : themeStore.colors.textMuted,
            }"
          >
            {{ tab.text }}
          </text>
        </template>
      </view>
    </view>
  </view>
</template>

<style scoped>
.custom-tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 50;
  padding-top: 10px;
}
</style>
