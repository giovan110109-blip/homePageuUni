<script setup lang="ts">
import { onPageScroll, onShow } from '@dcloudio/uni-app'
import AppHeader from '@/components/AppHeader.vue'
import CustomTabBar from '@/components/CustomTabBar.vue'
import { useThemeStore } from '@/stores/theme'
import { useScrollStore } from '@/stores/scroll'

const themeStore = useThemeStore()
const scrollStore = useScrollStore()

const messages = [
  { id: 1, icon: 'i-tabler-message-2', title: '欢迎留言', desc: '分享你的想法', color: 'primary' },
  { id: 2, icon: 'i-tabler-heart', title: '感谢支持', desc: '你的反馈对我们很重要', color: 'secondary' },
  { id: 3, icon: 'i-tabler-star', title: '精选留言', desc: '优质内容展示', color: 'accent' },
  { id: 4, icon: 'i-tabler-bulb', title: '功能建议', desc: '帮助我们改进产品', color: 'primary' },
  { id: 5, icon: 'i-tabler-bug', title: '问题反馈', desc: '报告遇到的问题', color: 'secondary' },
  { id: 6, icon: 'i-tabler-users', title: '社区交流', desc: '与其他用户互动', color: 'accent' },
]

function getColor(color: string) {
  if (color === 'primary')
    return themeStore.colors.primary
  if (color === 'secondary')
    return themeStore.colors.secondary
  return themeStore.colors.accent
}

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
        background: `linear-gradient(180deg, ${themeStore.colors.secondary}20 0%, ${themeStore.colors.secondary}10 40%, transparent 100%)`,
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

    <AppHeader title="留言板" />

    <view
      relative
      z-1
      px-6
      py-6
    >
      <view
        v-for="msg in messages"
        :key="msg.id"
        mb-4
        p-6
        rounded-2xl
        :style="{
          backgroundColor: themeStore.colors.bgCard,
          border: `1px solid ${themeStore.colors.border}`,
        }"
      >
        <view
          flex
          items-center
          gap-3
        >
          <view
            w-12
            h-12
            rounded-full
            flex-center
            :style="{ backgroundColor: `${getColor(msg.color)}20` }"
          >
            <view
              :class="msg.icon"
              text-2xl
              :style="{ color: getColor(msg.color) }"
            />
          </view>
          <view flex-1>
            <text
              block
              text-base
              font-medium
              :style="{ color: themeStore.colors.textPrimary }"
            >
              {{ msg.title }}
            </text>
            <text
              block
              text-sm
              mt-1
              :style="{ color: themeStore.colors.textTertiary }"
            >
              {{ msg.desc }}
            </text>
          </view>
        </view>
      </view>
    </view>

    <CustomTabBar />
  </view>
</template>
