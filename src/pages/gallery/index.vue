<script setup lang="ts">
import type { PhotoItem } from '@/api'
import { onPageScroll, onReachBottom, onShareAppMessage, onShow } from '@dcloudio/uni-app'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { photoApi } from '@/api'
import AppHeader from '@/components/AppHeader.vue'
import CustomTabBar from '@/components/CustomTabBar.vue'
import Loading from '@/components/Loading.vue'
import LivePhoto from '@/components/photo/livePhoto.vue'
import PhotoViewer from '@/components/photo/photoViewer.vue'
import { useScrollStore } from '@/stores/scroll'
import { useThemeStore } from '@/stores/theme'
import { formatDateShort } from '@/utils/format'
import { logger } from '@/utils/logger'

const themeStore = useThemeStore()
const scrollStore = useScrollStore()

const photos = ref<PhotoItem[]>([])
const loading = ref(true)
const loadingMore = ref(false)
const page = ref(1)
const pageSize = 20
const hasMore = ref(true)
const statusBarHeight = ref(0)
const scrolledBeyondTop = ref(false)
const visiblePhotoIds = ref<string[]>([])
const summarySyncTimer = ref<number | null>(null)

const leftColumn = ref<PhotoItem[]>([])
const rightColumn = ref<PhotoItem[]>([])
let leftHeight = 0
let rightHeight = 0

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '')
  if (!/^[\da-f]{6}$/i.test(normalized))
    return hex

  const value = Number.parseInt(normalized, 16)
  const red = (value >> 16) & 255
  const green = (value >> 8) & 255
  const blue = value & 255

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

const isDarkTheme = computed(() => themeStore.mode === 'dark')
const summaryTop = computed(() => `${statusBarHeight.value + 60}px`)
const summaryCardStyle = computed(() => {
  if (isDarkTheme.value) {
    return {
      background: `linear-gradient(135deg, ${hexToRgba(themeStore.colors.bgElevated, 0.82)} 0%, ${hexToRgba(themeStore.colors.bgSecondary, 0.68)} 100%)`,
      boxShadow: `0 24rpx 72rpx ${hexToRgba('#020617', 0.34)}`,
    }
  }

  return {
    background: `linear-gradient(135deg, ${hexToRgba(themeStore.colors.bgCard, 0.96)} 0%, ${hexToRgba(themeStore.colors.bgSecondary, 0.88)} 100%)`,
    boxShadow: `0 24rpx 72rpx ${hexToRgba('#94a3b8', 0.24)}`,
  }
})
const summaryContentStyle = computed(() => {
  if (isDarkTheme.value) {
    return {
      borderColor: hexToRgba(themeStore.colors.borderDark, 0.6),
      background: `linear-gradient(180deg, ${hexToRgba(themeStore.colors.bgCard, 0.5)} 0%, ${hexToRgba(themeStore.colors.bgSecondary, 0.36)} 100%)`,
    }
  }

  return {
    borderColor: hexToRgba(themeStore.colors.border, 0.72),
    background: `linear-gradient(180deg, ${hexToRgba(themeStore.colors.bgCard, 0.8)} 0%, ${hexToRgba(themeStore.colors.bgSecondary, 0.72)} 100%)`,
  }
})
const summaryItemStyle = computed(() => {
  if (isDarkTheme.value) {
    return {
      borderColor: hexToRgba(themeStore.colors.border, 0.55),
      backgroundColor: hexToRgba(themeStore.colors.bgElevated, 0.48),
      boxShadow: `inset 0 1px 0 ${hexToRgba('#ffffff', 0.06)}`,
    }
  }

  return {
    borderColor: hexToRgba(themeStore.colors.border, 0.58),
    backgroundColor: hexToRgba(themeStore.colors.bgCard, 0.82),
    boxShadow: `inset 0 1px 0 ${hexToRgba('#ffffff', 0.62)}`,
  }
})
const summaryIconStyle = computed(() => {
  return {
    color: themeStore.colors.primary,
    borderColor: hexToRgba(themeStore.colors.primary, isDarkTheme.value ? 0.28 : 0.18),
    background: `linear-gradient(135deg, ${hexToRgba(themeStore.colors.primary, isDarkTheme.value ? 0.22 : 0.14)} 0%, ${hexToRgba(themeStore.colors.accent, isDarkTheme.value ? 0.18 : 0.12)} 100%)`,
  }
})
const summaryTextStyle = computed(() => ({
  color: themeStore.colors.textSecondary,
}))
const summaryStrongTextStyle = computed(() => ({
  color: themeStore.colors.textPrimary,
}))
const summaryDisplayPhotos = computed(() => {
  if (visiblePhotoIds.value.length > 0) {
    const photoMap = new Map(photos.value.map(photo => [photo._id, photo]))
    return visiblePhotoIds.value
      .map(photoId => photoMap.get(photoId))
      .filter((photo): photo is PhotoItem => Boolean(photo))
  }

  return photos.value.slice(0, Math.min(12, photos.value.length))
})
const viewportDateRangeText = computed(() => {
  const timestamps = summaryDisplayPhotos.value
    .map((photo) => {
      const value = photo.dateTaken ? new Date(photo.dateTaken).getTime() : Number.NaN
      return Number.isFinite(value) ? value : null
    })
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b)

  if (timestamps.length === 0)
    return ''

  const start = formatViewportDate(timestamps[0])
  const end = formatViewportDate(timestamps[timestamps.length - 1])

  return start === end ? start : `${start} 到 ${end}`
})
const viewportLocationText = computed(() => {
  const locationMeta = new Map<string, { count: number, firstIndex: number }>()

  summaryDisplayPhotos.value.forEach((photo, index) => {
    const label = getPhotoLocationLabel(photo)
    if (!label)
      return

    const existing = locationMeta.get(label)
    if (existing) {
      existing.count += 1
      return
    }

    locationMeta.set(label, { count: 1, firstIndex: index })
  })

  if (locationMeta.size === 0)
    return ''

  const sortedLocations = Array.from(locationMeta.entries())
    .sort((a, b) => {
      if (b[1].count !== a[1].count) {
        return b[1].count - a[1].count
      }

      return a[1].firstIndex - b[1].firstIndex
    })
    .map(([label]) => label)

  const topLocations = sortedLocations.slice(0, 4)
  if (sortedLocations.length <= topLocations.length)
    return topLocations.join(' · ')

  return `${topLocations.join(' · ')} 等 ${sortedLocations.length} 地`
})
const showViewportSummary = computed(() => {
  return scrolledBeyondTop.value
    && photos.value.length > 0
    && Boolean(viewportDateRangeText.value || viewportLocationText.value)
})

function formatViewportDate(timestamp: number): string {
  return formatDateShort(new Date(timestamp)).replace(/\//g, '-')
}

function getPhotoLocationLabel(photo: PhotoItem): string {
  return photo.geoinfo?.city
    || photo.geoinfo?.region
    || photo.geoinfo?.country
    || photo.geoinfo?.locationName
    || ''
}

function clearSummarySyncTimer() {
  if (summarySyncTimer.value !== null) {
    clearTimeout(summarySyncTimer.value)
    summarySyncTimer.value = null
  }
}

function syncVisiblePhotos() {
  const query = uni.createSelectorQuery()
  const viewportHeight = uni.getSystemInfoSync().windowHeight || 667

  query.selectAll('.gallery-photo-card').fields({ rect: true, size: true, dataset: true }, (result: any) => {
    const rects = Array.isArray(result) ? result : result ? [result] : []

    if (!Array.isArray(rects) || rects.length === 0) {
      if (!scrolledBeyondTop.value) {
        visiblePhotoIds.value = []
      }
      return
    }

    const nextVisibleEntries = rects
      .map((rect) => {
        const photoId = rect?.dataset?.photoId
        const rectHeight = Number(rect?.height) || 0
        const visibleHeight = Math.min(Number(rect?.bottom) || 0, viewportHeight) - Math.max(Number(rect?.top) || 0, 0)
        const threshold = Math.min(120, Math.max(72, rectHeight * 0.12))
        const isVisible = visibleHeight > threshold

        if (!photoId || !isVisible) {
          return null
        }

        return {
          photoId,
          top: Number(rect?.top) || 0,
          left: Number(rect?.left) || 0,
        }
      })
      .filter((item): item is { photoId: string, top: number, left: number } => item !== null)
      .sort((a, b) => {
        if (Math.abs(a.top - b.top) > 12) {
          return a.top - b.top
        }
        return a.left - b.left
      })

    if (nextVisibleEntries.length > 0) {
      const nextVisibleIds = nextVisibleEntries.map(item => item.photoId)
      const hasChanged = nextVisibleIds.length !== visiblePhotoIds.value.length
        || nextVisibleIds.some((photoId, index) => visiblePhotoIds.value[index] !== photoId)

      if (hasChanged) {
        visiblePhotoIds.value = nextVisibleIds
      }
      return
    }

    if (!scrolledBeyondTop.value) {
      visiblePhotoIds.value = []
    }
  }).exec()
}

function scheduleVisiblePhotoSync(delay = 24) {
  clearSummarySyncTimer()
  summarySyncTimer.value = setTimeout(() => {
    summarySyncTimer.value = null
    syncVisiblePhotos()
  }, delay) as unknown as number
}

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
  const sortedPhotos = [...newPhotos].sort((a, b) => {
    const dateA = a.dateTaken ? new Date(a.dateTaken).getTime() : 0
    const dateB = b.dateTaken ? new Date(b.dateTaken).getTime() : 0
    return dateB - dateA
  })

  for (const photo of sortedPhotos) {
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
    logger.logError('loadPhotos', error)
  }
  finally {
    loading.value = false
    loadingMore.value = false
    await nextTick()
    scheduleVisiblePhotoSync()
  }
}

function _previewImage(photo: PhotoItem) {
  const index = photos.value.findIndex(p => p._id === photo._id)
  const photosJson = encodeURIComponent(JSON.stringify(photos.value))
  uni.navigateTo({
    url: `/pages/photo-viewer/index?photos=${photosJson}&index=${index}`,
  })
}

onShow(() => {
  const systemInfo = uni.getSystemInfoSync()
  statusBarHeight.value = systemInfo.statusBarHeight || 0
  const query = uni.createSelectorQuery()
  query.selectViewport().scrollOffset((res: any) => {
    const scrollTop = res?.scrollTop || 0
    scrollStore.setScrolled(scrollTop > 10)
    scrolledBeyondTop.value = scrollTop > 56
    scheduleVisiblePhotoSync()
  })
  query.exec()
})

onPageScroll((e) => {
  scrollStore.setScrolled(e.scrollTop > 10)
  scrolledBeyondTop.value = e.scrollTop > 56
  scheduleVisiblePhotoSync()
})

onMounted(() => {
  const systemInfo = uni.getSystemInfoSync()
  statusBarHeight.value = systemInfo.statusBarHeight || 0
  void fetchPhotos(true)
})

onReachBottom(() => {
  if (!loadingMore.value && hasMore.value) {
    fetchPhotos()
  }
})

onShareAppMessage(() => {
  return {
    title: '画廊 - 精选作品展示',
    path: '/pages/gallery/index',
    imageUrl: photos.value[0]?.thumbnailUrl || '',
  }
})

watch(
  () => photos.value.length,
  async () => {
    await nextTick()
    scheduleVisiblePhotoSync(48)
  },
  { flush: 'post' },
)

onUnmounted(() => {
  clearSummarySyncTimer()
  visiblePhotoIds.value = []
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
      v-if="showViewportSummary"
      class="viewport-summary"
      :style="{ top: summaryTop }"
    >
      <view
        class="viewport-summary-card"
        :style="summaryCardStyle"
      >
        <view
          class="viewport-summary-content"
          :style="summaryContentStyle"
        >
          <view
            v-if="viewportDateRangeText"
            class="viewport-summary-item"
            :style="summaryItemStyle"
          >
            <view
              class="viewport-summary-icon"
              :style="summaryIconStyle"
            >
              <view i-tabler-calendar />
            </view>
            <text
              class="viewport-summary-text viewport-summary-text-strong"
              :style="summaryStrongTextStyle"
            >
              {{ viewportDateRangeText }}
            </text>
          </view>

          <view
            v-if="viewportLocationText"
            class="viewport-summary-item"
            :style="summaryItemStyle"
          >
            <view
              class="viewport-summary-icon"
              :style="summaryIconStyle"
            >
              <view i-tabler-map-pin />
            </view>
            <text
              class="viewport-summary-text"
              :style="summaryTextStyle"
            >
              {{ viewportLocationText }}
            </text>
          </view>
        </view>
      </view>
    </view>

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
        <Loading />
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
            class="gallery-photo-card"
            :data-photo-id="photo._id"
            relative
            rounded-sm
            overflow-hidden
            :style="{
              backgroundColor: themeStore.colors.bgTertiary,
            }"
            @tap="_previewImage(photo)"
          >
            <LivePhoto
              v-if="photo.isLive"
              :image-url="photo.originalUrl"
              :thumbnail-url="photo.thumbnailUrl"
              :video-url="photo.videoUrl"
              :is-live="true"
              :aspect-ratio="photo.aspectRatio || 1"
              :photo-id="photo._id"
            />
            <PhotoViewer
              v-else
              :src="photo.originalUrl"
              :thumbnail-url="photo.thumbnailUrl"
              :aspect-ratio="photo.aspectRatio || 1"
            />
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
            class="gallery-photo-card"
            :data-photo-id="photo._id"
            relative
            rounded-sm
            overflow-hidden
            :style="{
              backgroundColor: themeStore.colors.bgTertiary,
            }"
            @tap="_previewImage(photo)"
          >
            <LivePhoto
              v-if="photo.isLive"
              :image-url="photo.originalUrl"
              :thumbnail-url="photo.thumbnailUrl"
              :video-url="photo.videoUrl"
              :is-live="true"
              :aspect-ratio="photo.aspectRatio || 1"
              :photo-id="photo._id"
            />
            <PhotoViewer
              v-else
              :src="photo.originalUrl"
              :thumbnail-url="photo.thumbnailUrl"
              :aspect-ratio="photo.aspectRatio || 1"
            />
          </view>
        </view>
      </view>

      <view
        v-if="loadingMore"
        flex
        justify-center
        py-4
      >
        <Loading />
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

<style scoped>
.viewport-summary {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  z-index: 45;
  pointer-events: none;
}

.viewport-summary-card {
  max-width: 620rpx;
  border-radius: 32rpx;
  padding: 4rpx;
}

.viewport-summary-content {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 22rpx;
  border-radius: 28rpx;
  border-width: 1px;
  border-style: solid;
  backdrop-filter: blur(28px);
}

.viewport-summary-item {
  display: flex;
  align-items: center;
  gap: 18rpx;
  min-width: 0;
  padding: 18rpx 20rpx;
  border-radius: 24rpx;
  border-width: 1px;
  border-style: solid;
}

.viewport-summary-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
  flex-shrink: 0;
  border-radius: 999rpx;
  border-width: 1px;
  border-style: solid;
  font-size: 30rpx;
}

.viewport-summary-text {
  min-width: 0;
  flex: 1;
  font-size: 28rpx;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.viewport-summary-text-strong {
  font-weight: 600;
}
 </style>
