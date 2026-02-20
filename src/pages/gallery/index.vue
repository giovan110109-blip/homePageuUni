<script setup lang="ts">
import { onPageScroll, onShow } from '@dcloudio/uni-app'
import AppHeader from '@/components/AppHeader.vue'
import CustomTabBar from '@/components/CustomTabBar.vue'
import { useThemeStore } from '@/stores/theme'
import { useScrollStore } from '@/stores/scroll'

const themeStore = useThemeStore()
const scrollStore = useScrollStore()

const galleryItems = [
  { id: 1, title: '风景', desc: '自然之美', icon: 'i-tabler-mountain' },
  { id: 2, title: '人物', desc: '生活瞬间', icon: 'i-tabler-user' },
  { id: 3, title: '建筑', desc: '城市印象', icon: 'i-tabler-building' },
  { id: 4, title: '艺术', desc: '创意作品', icon: 'i-tabler-palette' },
  { id: 5, title: '美食', desc: '味蕾之旅', icon: 'i-tabler-tools-kitchen-2' },
  { id: 6, title: '旅行', desc: '探索世界', icon: 'i-tabler-plane' },
  { id: 7, title: '动物', desc: '萌宠乐园', icon: 'i-tabler-paw' },
  { id: 8, title: '科技', desc: '未来世界', icon: 'i-tabler-cpu' },
]

onShow(() => {
  const query = uni.createSelectorQuery()
  query.selectViewport().scrollOffset()
  query.exec((res) => {
    const scrollTop = res[0]?.scrollTop || 0
    scrollStore.setScrolled(scrollTop > 10)
  })
})

onPageScroll((e) => {
  scrollStore.setScrolled(e.scrollTop > 10)
})
</script>

<template>
  <view
    relative
    min-h-screen
    pb-20
    :style="{
      color: themeStore.colors.textPrimary,
    }"
  >
    <view
      absolute
      top-0
      left-0
      right-0
      h="1/2"
      z-0
      :style="{
        background: `linear-gradient(180deg, ${themeStore.colors.accent}20 0%, ${themeStore.colors.accent}10 40%, transparent 100%)`,
      }"
    />
    <view
      absolute
      top-0
      left-0
      right-0
      bottom-0
      z--1
      :style="{ backgroundColor: themeStore.colors.bgPrimary }"
    />

    <AppHeader title="画廊" />

    <view
      relative
      z-1
      px-6
      py-6
    >
      <view
        grid
        grid-cols-2
        gap-4
      >
        <view
          v-for="item in galleryItems"
          :key="item.id"
          p-4
          rounded-2xl
          :style="{
            backgroundColor: themeStore.colors.bgCard,
            border: `1px solid ${themeStore.colors.border}`,
          }"
        >
          <view
            w-full
            h-24
            rounded-xl
            mb-3
            flex-center
            :style="{ backgroundColor: themeStore.colors.bgTertiary }"
          >
            <view
              :class="item.icon"
              text-3xl
              :style="{ color: themeStore.colors.textMuted }"
            />
          </view>
          <text
            block
            text-sm
            font-medium
            :style="{ color: themeStore.colors.textPrimary }"
          >
            {{ item.title }}
          </text>
          <text
            block
            text-xs
            mt-1
            :style="{ color: themeStore.colors.textTertiary }"
          >
            {{ item.desc }}
          </text>
        </view>
      </view>
    </view>

    <CustomTabBar />
  </view>
</template>
