<script setup lang="ts">
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()
</script>

<template>
  <view
    w-10
    h-10
    rounded-xl
    flex-center
    cursor-pointer
    transition-all
    duration-300
    active:scale-90
    :style="{
      backgroundColor: `${themeStore.colors.primary}15`,
    }"
    @click="themeStore.toggleTheme"
  >
    <view
      v-if="themeStore.mode === 'light'"
      i-tabler-sun
      text-xl
      transition-transform
      duration-500
      :style="{ color: themeStore.colors.primary }"
    />
    <view
      v-else
      i-tabler-moon
      text-xl
      transition-transform
      duration-500
      :style="{ color: themeStore.colors.primary }"
    />
  </view>
</template>
