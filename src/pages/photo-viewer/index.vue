<script setup lang="ts">
import type { PhotoItem } from '@/api'
import { onLoad } from '@dcloudio/uni-app'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import LiveBadge from '@/components/photo/LiveBadge.vue'
import PhotoShareGenerator from '@/components/photo/PhotoShareGenerator.vue'

const photos = ref<PhotoItem[]>([])
const currentIndex = ref(0)

const statusBarHeight = ref(0)

const currentPhoto = computed(() => photos.value[currentIndex.value])

const formattedDate = computed(() => {
  if (!currentPhoto.value?.dateTaken)
    return ''
  const date = new Date(currentPhoto.value.dateTaken)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
})

const locationText = computed(() => {
  const geo = currentPhoto.value?.geoinfo
  if (!geo)
    return ''
  return geo.formatted || `${geo.city || ''} ${geo.region || ''} ${geo.country || ''}`.trim()
})

const downloadedImages = ref<Record<number, string>>({})
const downloadingProgress = ref<Record<number, { loaded: number, total: number }>>({})

const currentDownloadProgress = computed(() => {
  const progress = downloadingProgress.value[currentIndex.value]
  if (!progress)
    return null
  return `${formatBytes(progress.loaded)} / ${formatBytes(progress.total)}`
})

const isDownloading = computed(() => downloadingProgress.value[currentIndex.value] !== undefined)

const currentImagePath = computed(() => {
  return downloadedImages.value[currentIndex.value]
})

const containerHeight = computed(() => {
  if (!currentPhoto.value?.aspectRatio || currentPhoto.value.aspectRatio === 0)
    return '100%'
  const systemInfo = uni.getSystemInfoSync()
  const screenWidth = systemInfo.screenWidth || 375
  const height = screenWidth / currentPhoto.value.aspectRatio
  return `${height}px`
})

const videoId = computed(() => `live-video-${currentIndex.value}-${currentPhoto.value?._id || ''}`)

const isPlaying = ref(false)
const videoCanPlay = ref(false)
const isMuted = ref(true)
const videoContext = ref<UniApp.VideoContext | null>(null)
const localVideoPath = ref('')
const isVideoDownloading = ref(false)
const showVideo = ref(false)
const showShareGenerator = ref(false)
const generatedShareImage = ref('')

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0 || Number.isNaN(bytes))
    return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
}

function getOptimizedImageUrl(photo: PhotoItem) {
  const systemInfo = uni.getSystemInfoSync()
  const screenWidth = systemInfo.screenWidth || 375

  if (screenWidth <= 375) {
    return photo.thumbnailUrl
  }
  else if (screenWidth <= 768) {
    return photo.originalFileUrl
  }
  return photo.originalFileUrl
}

function getCacheKey() {
  return `live_video_${currentPhoto.value?._id || ''}`
}

async function preloadVideo() {
  if (!currentPhoto.value?.videoUrl || localVideoPath.value || isVideoDownloading.value)
    return

  const cacheKey = getCacheKey()
  const cachedPath = uni.getStorageSync(cacheKey)
  if (cachedPath) {
    localVideoPath.value = cachedPath
    videoCanPlay.value = true
    return
  }

  isVideoDownloading.value = true

  uni.downloadFile({
    url: currentPhoto.value.videoUrl,
    success: async (res) => {
      if (res.statusCode === 200) {
        try {
          const saveRes = await uni.saveFile({ tempFilePath: res.tempFilePath })
          localVideoPath.value = saveRes.savedFilePath
          uni.setStorageSync(cacheKey, saveRes.savedFilePath)
        }
        catch {
          localVideoPath.value = res.tempFilePath
        }
        videoCanPlay.value = true
      }
    },
    fail: (err) => {
      console.error('[PhotoViewer] 视频下载失败:', err)
    },
    complete: () => {
      isVideoDownloading.value = false
    },
  })
}

function downloadImage(index: number) {
  if (downloadedImages.value[index] || downloadingProgress.value[index])
    return

  const photo = photos.value[index]
  if (!photo)
    return

  const url: any = getOptimizedImageUrl(photo)
  downloadingProgress.value[index] = { loaded: 0, total: 0 }

  const downloadTask = uni.downloadFile({
    url,
    success: (res) => {
      if (res.statusCode === 200) {
        downloadedImages.value[index] = res.tempFilePath
        delete downloadingProgress.value[index]
      }
    },
    fail: () => {
      delete downloadingProgress.value[index]
    },
  })

  downloadTask.onProgressUpdate((res) => {
    downloadingProgress.value[index] = { loaded: res.totalBytesWritten, total: res.totalBytesExpectedToWrite }
  })
}

function handleTouchEnd() {
  if (isPlaying.value) {
    isPlaying.value = false
    showVideo.value = false
    videoContext.value = null
  }
}

function handleLongPress() {
  if (!currentPhoto.value?.isLive || !currentPhoto.value.videoUrl)
    return

  if (!currentImagePath.value) {
    uni.showToast({ title: '图片加载中', icon: 'none' })
    return
  }

  if (!videoCanPlay.value) {
    uni.showToast({ title: '视频加载中', icon: 'none' })
    return
  }

  isPlaying.value = true
  showVideo.value = false
  uni.vibrateShort({ success: () => {}, fail: () => {} })
}

function onVideoPlay() {
  showVideo.value = true
}

function onVideoEnded() {
  isPlaying.value = false
  showVideo.value = false
}

function onVideoError(e: any) {
  console.error('[PhotoViewer] 视频播放错误:', e)
  isPlaying.value = false
  showVideo.value = false
}

function toggleMute() {
  isMuted.value = !isMuted.value
}

onLoad((options) => {
  const systemInfo = uni.getSystemInfoSync()
  statusBarHeight.value = systemInfo.statusBarHeight || 0

  if (options?.photos) {
    try {
      photos.value = JSON.parse(decodeURIComponent(options.photos))
    }
    catch {
      console.error('解析图片数据失败')
    }
  }
  if (options?.index !== undefined) {
    currentIndex.value = Number(options.index) || 0
  }

  nextTick(() => {
    downloadImage(currentIndex.value)
  })
})

onMounted(() => {
  if (currentPhoto.value?.isLive && currentPhoto.value.videoUrl) {
    preloadVideo()
  }
})

watch(currentIndex, (newIndex, oldIndex) => {
  if (newIndex !== oldIndex) {
    isPlaying.value = false
    showVideo.value = false
    videoContext.value?.pause()
    videoContext.value = null
    localVideoPath.value = ''
    videoCanPlay.value = false

    downloadImage(newIndex)

    if (currentPhoto.value?.isLive && currentPhoto.value.videoUrl) {
      preloadVideo()
    }
  }
})

watch(
  () => currentPhoto.value?.videoUrl,
  (newUrl) => {
    if (newUrl && currentPhoto.value?.isLive) {
      localVideoPath.value = ''
      videoCanPlay.value = false
      preloadVideo()
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  videoContext.value?.pause()
})

function handleSwiperChange(e: any) {
  currentIndex.value = e.detail.current
}

function goBack() {
  uni.navigateBack()
}

async function _handleShare() {
  if (!currentPhoto.value)
    return

  console.log('[PhotoViewer] 点击分享按钮')
  uni.showToast({
    title: '准备生成分享图片',
    icon: 'none',
  })

  showShareGenerator.value = true
}

function onShareImageGenerated(imagePath: string) {
  generatedShareImage.value = imagePath
}

async function saveGeneratedImage() {
  if (!generatedShareImage.value)
    return

  try {
    uni.showLoading({ title: '保存中...' })
    await uni.saveImageToPhotosAlbum({ filePath: generatedShareImage.value })
    uni.showToast({ title: '保存成功', icon: 'success' })
  }
  catch {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
  finally {
    uni.hideLoading()
  }
}

async function shareGeneratedImage() {
  if (!generatedShareImage.value)
    return

  try {
    await uni.share({
      type: 0,
      imageUrl: generatedShareImage.value,
    } as any)
  }
  catch {
    console.log('分享取消')
  }
}

function onShareGeneratorClose() {
  showShareGenerator.value = false
  generatedShareImage.value = ''
}
</script>

<template>
  <view
    class="photo-viewer"
    relative
    w-full
    h-screen
    overflow-hidden
  >
    <image
      v-if="currentPhoto?.thumbnailUrl"
      :src="currentPhoto.thumbnailUrl"
      class="bg-blur"
      mode="aspectFill"
    />
    <view
      v-else
      class="bg-solid"
    />

    <view
      class="header"
      absolute
      top-0
      left-0
      right-0
      z-10
      flex
      items-center
      justify-between
      px-4
      py-3
      :style="{
        background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)',
        paddingTop: `${statusBarHeight + 48}px`,
      }"
    >
      <view
        flex
        items-center
        gap-2
        @tap.stop="goBack"
      >
        <view
          i-tabler-chevron-left
          text-2xl
          text-white
        />
      </view>

      <view
        flex
        items-center
        gap-4
      >
        <!-- <view
          i-tabler-share
          text-xl
          text-white
          @tap.stop="handleShare"
        /> -->
      </view>
    </view>

    <swiper
      class="swiper"
      w-full
      h-full
      :current="currentIndex"
      :duration="200"
      :circular="false"
      @change="handleSwiperChange"
    >
      <swiper-item
        v-for="photo in photos"
        :key="photo._id"
        flex
        items-center
        justify-center
        @touchend="handleTouchEnd"
        @touchcancel="handleTouchEnd"
        @longpress="handleLongPress"
      >
        <view
          v-if="photo.isLive"
          class="live-photo-wrapper"
          w-full
          :style="{ height: containerHeight }"
          relative
        >
          <video
            v-if="isPlaying && localVideoPath"
            :id="videoId"
            :key="videoId"
            class="live-video"
            :src="localVideoPath"
            :muted="isMuted"
            :show-center-play-btn="false"
            :show-play-btn="false"
            :show-fullscreen-btn="false"
            :show-progress="false"
            :enable-progress-gesture="false"
            :show-loading="false"
            object-fit="contain"
            :autoplay="true"
            :loop="false"
            :stop="!isPlaying"
            @play="onVideoPlay"
            @ended="onVideoEnded"
            @error="onVideoError"
            @touchend="handleTouchEnd"
            @touchcancel="handleTouchEnd"
          />

          <view
            class="photo-cover"
            :class="{ fade: showVideo }"
          >
            <image
              :src="currentImagePath || photo.thumbnailUrl"
              mode="aspectFill"
              class="photo-image"
            />
          </view>

          <view
            class="photo-controls"
            absolute
            bottom-0
            left-0
            right-0
            px-4
            py-3
          >
            <view
              flex
              items-center
              justify-between
            >
              <view
                flex
                items-center
                gap-3
              >
                <LiveBadge
                  v-if="photo.isLive"
                  :can-play="videoCanPlay"
                  :is-playing="isPlaying"
                />
                <view
                  v-if="photo.isLive"
                  class="mute-btn"
                  @click.stop="toggleMute"
                >
                  <view
                    :class="isMuted ? 'i-tabler-volume-off' : 'i-tabler-volume'"
                    text-white
                    text-lg
                  />
                </view>
              </view>

              <view
                v-if="isDownloading && currentDownloadProgress"
                flex
                items-center
                gap-2
              >
                <text
                  text-white
                  text-sm
                  font-medium
                >
                  {{ currentDownloadProgress }}
                </text>
              </view>
            </view>
          </view>
        </view>

        <view
          v-if="!photo.isLive"
          class="photo-wrapper"
          w-full
          :style="{ height: containerHeight }"
          relative
        >
          <image
            v-if="!currentImagePath"
            :src="photo.thumbnailUrl"
            mode="aspectFill"
            class="photo-image"
          />
          <image
            v-if="currentImagePath"
            :src="currentImagePath"
            mode="aspectFill"
            class="photo-image"
          />

          <view
            class="photo-controls"
            absolute
            bottom-0
            left-0
            right-0
            px-4
            py-3
          >
            <view
              flex
              items-center
              justify-end
            >
              <view
                v-if="isDownloading && currentDownloadProgress"
                flex
                items-center
                gap-2
              >
                <text
                  text-white
                  text-sm
                  font-medium
                >
                  {{ currentDownloadProgress }}
                </text>
              </view>
            </view>
          </view>
        </view>
      </swiper-item>
    </swiper>

    <view
      v-if="currentPhoto"
      class="footer"
      absolute
      bottom-0
      left-0
      right-0
      z-10
      px-4
      py-3
      :style="{
        background: 'linear-gradient(0deg, rgba(0,0,0,0.6) 0%, transparent 100%)',
        paddingBottom: 'env(safe-area-inset-bottom, 12px)',
      }"
    >
      <view
        v-if="currentPhoto.title"
        mb-1
        overflow-hidden
      >
        <text
          text-white
          text-base
          font-medium
          class="truncate-1"
        >
          {{ currentPhoto.title }}
        </text>
      </view>

      <view
        v-if="currentPhoto.description"
        mb-2
        overflow-hidden
      >
        <text
          text-white
          text-sm
          class="opacity-80 truncate-2"
        >
          {{ currentPhoto.description }}
        </text>
      </view>

      <view
        flex
        items-center
        gap-3
        text-white
        text-xs
        class="opacity-70"
        overflow-hidden
      >
        <view
          v-if="formattedDate"
          flex
          items-center
          gap-1
          flex-shrink-0
        >
          <view i-tabler-calendar />
          <text
            class="truncate"
          >
            {{ formattedDate }}
          </text>
        </view>

        <view
          v-if="locationText"
          flex
          items-center
          gap-1
          flex-1
          overflow-hidden
        >
          <view
            i-tabler-map-pin
            flex-shrink-0
          />
          <text
            class="truncate"
          >
            {{ locationText }}
          </text>
        </view>
      </view>

      <view
        v-if="currentPhoto.tags?.length"
        flex
        flex-wrap
        gap-2
        mt-2
        overflow-hidden
      >
        <text
          v-for="tag in currentPhoto.tags.slice(0, 5)"
          :key="tag"
          class="px-2 py-0.5 rounded-full text-xs text-white bg-white/20"
        >
          {{ `#${tag}` }}
        </text>
        <text
          v-if="currentPhoto.tags.length > 5"
          text-white
          text-xs
          class="opacity-70"
        >
          +{{ currentPhoto.tags.length - 5 }}
        </text>
      </view>
    </view>

    <PhotoShareGenerator
      v-if="currentPhoto"
      :photo="currentPhoto"
      :visible="showShareGenerator"
      @generated="onShareImageGenerated"
      @save="saveGeneratedImage"
      @share="shareGeneratedImage"
      @close="onShareGeneratorClose"
    />
  </view>
</template>

<style scoped>
.photo-viewer {
  touch-action: pan-x pan-y;
}

.bg-blur {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  filter: blur(30px);
  transform: scale(1.2);
  opacity: 0.6;
  z-index: 0;
}

.bg-solid {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #000;
  z-index: 0;
}

.swiper {
  touch-action: pan-x pan-y;
  z-index: 1;
}

.photo-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.photo-cover {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
  transition: opacity 0.3s ease-out;
}

.photo-cover.fade {
  opacity: 0;
  pointer-events: none;
}

.live-photo-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
}

.photo-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
}

.photo-controls {
  z-index: 10;
}

.live-video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.mute-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
  border-radius: 100rpx;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(12px);
}

.mute-btn:active {
  transform: scale(0.9);
}

.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.truncate-1 {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.truncate-2 {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>
