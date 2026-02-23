<script setup lang="ts">
import type { PhotoItem } from '@/api'
import { onPageScroll, onReachBottom, onShow } from '@dcloudio/uni-app'
import { onMounted, ref } from 'vue'
import { photoApi } from '@/api'
import AppHeader from '@/components/AppHeader.vue'
import CustomTabBar from '@/components/CustomTabBar.vue'
import ThumbHashImage from '@/components/ThumbHashImage.vue'
import { useScrollStore } from '@/stores/scroll'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()
const scrollStore = useScrollStore()

const photos = ref<PhotoItem[]>([])
const loading = ref(true)
const loadingMore = ref(false)
const page = ref(1)
const pageSize = 20
const hasMore = ref(true)

const leftColumn = ref<PhotoItem[]>([])
const rightColumn = ref<PhotoItem[]>([])
let leftHeight = 0
let rightHeight = 0

function addToColumn(photo: PhotoItem) {
  const aspectRatio = photo.aspectRatio || (photo.width / photo.height) || 1
  const photoHeight = 1 / aspectRatio

  if (leftHeight <= rightHeight) {
    leftColumn.value.push(photo)
    leftHeight += photoHeight
  }
  else {
    rightColumn.value.push(photo)
    rightHeight += photoHeight
  }
}

function distributePhotos(newPhotos: PhotoItem[]) {
  for (const photo of newPhotos) {
    addToColumn(photo)
  }
}

async function fetchPhotos(reset = false) {
  if (reset) {
    loading.value = true
    page.value = 1
    leftColumn.value = []
    rightColumn.value = []
    leftHeight = 0
    rightHeight = 0
  }
  else {
    loadingMore.value = true
  }

  try {
    const res = await photoApi.getPhotos(page.value, pageSize, 'public')
    const list = res.data?.photos || []
    const pagination = res.data?.pagination || { total: 0 }

    if (reset) {
      photos.value = list
    }
    else {
      photos.value = [...photos.value, ...list]
    }

    distributePhotos(list)

    hasMore.value = photos.value.length < pagination.total

    if (list.length > 0) {
      page.value++
    }
  }
  catch (error) {
    console.error('获取照片失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
  finally {
    loading.value = false
    loadingMore.value = false
  }
}

function previewImage(photo: PhotoItem) {
  const index = photos.value.findIndex(p => p._id === photo._id)
  const photosJson = encodeURIComponent(JSON.stringify(photos.value))
  uni.navigateTo({
    url: `/pages/photo-viewer/index?photos=${photosJson}&index=${index}`,
  })
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

onMounted(() => {
  fetchPhotos(true)
})

onReachBottom(() => {
  if (!loadingMore.value && hasMore.value) {
    fetchPhotos()
  }
})
</script>

<template>
  <view
    relative
    min-h-screen
    pb-20
    :style="{ color: themeStore.colors.textPrimary }"
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
      px-2
      py-3
    >
      <view
        v-if="loading"
        flex
        justify-center
        items-center
        py-20
      >
        <view
          i-tabler-loader-2
          text-2xl
          animate-spin
          :style="{ color: themeStore.colors.textMuted }"
        />
      </view>

      <view
        v-else-if="photos.length === 0"
        flex
        flex-col
        items-center
        justify-center
        py-20
        gap-4
      >
        <view
          i-tabler-photo-off
          text-4xl
          :style="{ color: themeStore.colors.textMuted }"
        />
        <text :style="{ color: themeStore.colors.textMuted }">
          暂无照片
        </text>
      </view>

      <view
        v-else
        flex
        gap-1.5
      >
        <view
          flex-1
          flex
          flex-col
          gap-1.5
        >
          <view
            v-for="photo in leftColumn"
            :key="photo._id"
            relative
            rounded-sm
            overflow-hidden
            :style="{
              backgroundColor: themeStore.colors.bgTertiary,
            }"
            @click="previewImage(photo)"
          >
            <ThumbHashImage
              :src="photo.thumbnailUrl || photo.originalUrl"
              :thumb-hash="photo.thumbnailHash"
              :aspect-ratio="photo.aspectRatio || 1"
            />
            <view
              v-if="photo.isLive"
              absolute
              top-1
              left-1
              px-1.5
              py-0.5
              rounded
              text-xs
              z-2
              :style="{
                backgroundColor: 'rgba(0,0,0,0.5)',
                color: '#fff',
              }"
            >
              LIVE
            </view>
          </view>
        </view>

        <view
          flex-1
          flex
          flex-col
          gap-1.5
        >
          <view
            v-for="photo in rightColumn"
            :key="photo._id"
            relative
            rounded-sm
            overflow-hidden
            :style="{
              backgroundColor: themeStore.colors.bgTertiary,
            }"
            @click="previewImage(photo)"
          >
            <ThumbHashImage
              :src="photo.thumbnailUrl || photo.originalUrl"
              :thumb-hash="photo.thumbnailHash"
              :aspect-ratio="photo.aspectRatio || 1"
            />
            <view
              v-if="photo.isLive"
              absolute
              top-1
              left-1
              px-1.5
              py-0.5
              rounded
              text-xs
              z-2
              :style="{
                backgroundColor: 'rgba(0,0,0,0.5)',
                color: '#fff',
              }"
            >
              LIVE
            </view>
          </view>
        </view>
      </view>

      <view
        v-if="loadingMore"
        flex
        justify-center
        py-4
      >
        <view
          i-tabler-loader-2
          text-xl
          animate-spin
          :style="{ color: themeStore.colors.textMuted }"
        />
      </view>

      <view
        v-if="!hasMore && photos.length > 0"
        flex
        justify-center
        py-4
      >
        <text
          text-sm
          :style="{ color: themeStore.colors.textMuted }"
        >
          没有更多了
        </text>
      </view>
    </view>

    <CustomTabBar />
  </view>
</template>
