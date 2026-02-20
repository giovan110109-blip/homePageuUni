<script setup lang="ts">
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()

function handleClickGithub() {
  if (window?.open) {
    window.open('https://github.com/uni-helper/create-uni')
  }
  else {
    uni.showToast({
      icon: 'none',
      title: '请使用浏览器打开',
    })
  }
}
</script>

<template>
  <view
    absolute
    bottom-1rem
    left="50%"
    translate-x="-50%"
    flex
    items-center
    justify-center
    w-10
    h-10
    rounded-full
    cursor-pointer
    transition-all
    duration-300
    active:scale-90
    :style="{
      backgroundColor: themeStore.colors.bgCard,
      border: `1px solid ${themeStore.colors.border}`,
    }"
    @click="handleClickGithub"
  >
    <view
      i-tabler-brand-github
      text-xl
      :style="{ color: themeStore.colors.textSecondary }"
    />
  </view>
</template>
