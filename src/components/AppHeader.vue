<script setup lang="ts">
import { onPageScroll } from '@dcloudio/uni-app'
import { onMounted, ref } from 'vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { useScrollStore } from '@/stores/scroll'
import { useThemeStore } from '@/stores/theme'

defineProps<{
  title?: string
}>()

const themeStore = useThemeStore()
const scrollStore = useScrollStore()

const statusBarHeight = ref(0)

onMounted(() => {
  const systemInfo = uni.getSystemInfoSync()
  statusBarHeight.value = systemInfo.statusBarHeight || 0
})
</script>

<template>
  <view
    sticky
    top-0
    left-0
    right-0
    z-50
    transition-colors
    duration-300
    rounded-bl-[15px]
    rounded-br-[15px]
    :style="{
      height: `${statusBarHeight + 48}px`,
      backgroundColor: scrollStore.isScrolled ? themeStore.colors.bgPrimary : 'transparent',
    }"
  >
    <view
      absolute
      top-0
      left-0
      right-0
      bottom-0
      px-4
      flex
      items-center
      justify-between
      transition-all
      duration-300
      rounded-bl-[15px]
      rounded-br-[15px]
      :style="{
        backgroundColor: scrollStore.isScrolled ? themeStore.colors.bgCard : 'transparent',
        boxShadow: scrollStore.isScrolled ? `0 2px 12px ${themeStore.colors.primary}15` : 'none',
        paddingTop: `${statusBarHeight}px`,
      }"
    >
      <view
        flex
        items-center
        gap-3
      >
        <view
          w-full
          h-[30px]
          flex-center
          transition-transform
          duration-300
          active:scale-90
        >
          <image
            w-[110px]
            h-[30px]
            src="/src/assets/logo/logo-dark.png"
          />
        </view>
      </view>

      <!-- <ThemeToggle />  -->
    </view>
  </view>
</template>
