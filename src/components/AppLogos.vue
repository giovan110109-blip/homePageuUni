<script setup lang="ts">
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()
</script>

<template>
  <view
    inline-flex
    cursor-default
    text-2xl
    font-300
  >
    <view
      flex
      flex-col
      items-center
      hover-class="drop-shadow-md"
    >
      <image
        inline-block
        h-16
        w-16
        src="/static/logo.svg"
      />
      <text
        mt-1
        text-sm
        font-medium
        :style="{ color: themeStore.colors.primary }"
      >
        uni-helper
      </text>
    </view>
    <view
      m="x-3 y-auto"
      i-tabler-plus
      text-2xl
      transform
      transition-all-500
      hover:rotate-135
      :style="{ color: themeStore.colors.textMuted }"
    />
    <view
      flex
      flex-col
      items-center
      hover-class="drop-shadow-md"
    >
      <image
        inline-block
        h-16
        w-16
        src="/static/vite.png"
      />
      <text
        mt-1
        text-sm
        font-medium
        :style="{ color: themeStore.colors.secondary }"
      >
        Vite
      </text>
    </view>
  </view>
</template>
