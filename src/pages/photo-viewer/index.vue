<script setup lang="ts">
import type { PhotoItem } from '@/api'
import { onLoad, onShareAppMessage, onShareTimeline, onShow } from '@dcloudio/uni-app'
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { photoApi } from '@/api'
import LiveBadge from '@/components/photo/LiveBadge.vue'
import PhotoShareGenerator from '@/components/photo/PhotoShareGenerator.vue'
import { useLivePhoto } from '@/composables/usePhoto'
import { formatYearMonth } from '@/utils/format'

const photos = ref<PhotoItem[]>([])
const currentIndex = ref(0)

const statusBarHeight = ref(0)

const currentPhoto = computed(() => photos.value[currentIndex.value])

const formattedDate = computed(() => {
  if (!currentPhoto.value?.dateTaken)
    return ''
  return formatYearMonth(currentPhoto.value.dateTaken)
})

const locationText = computed(() => {
  const geo = currentPhoto.value?.geoinfo
  if (!geo)
    return ''
  return geo.formatted || `${geo.city || ''} ${geo.region || ''} ${geo.country || ''}`.trim()
})

const downloadedImages = ref<Record<string, string>>({})
const downloadingProgress = ref<Record<string, { loaded: number, total: number }>>({})
const downloadTasks = ref<Record<string, UniApp.DownloadTask>>({})

const currentDownloadPercent = computed(() => {
  const photoId = currentPhoto.value?._id
  if (!photoId)
    return null
  const progress = downloadingProgress.value[photoId]
  if (!progress)
    return null
  if (!progress.total)
    return 0

  return Math.min(100, Math.max(0, Math.round((progress.loaded / progress.total) * 100)))
})

const currentDownloadProgress = computed(() => {
  if (currentDownloadPercent.value === null)
    return null
  return `${currentDownloadPercent.value}%`
})

const isDownloading = computed(() => {
  const photoId = currentPhoto.value?._id
  if (!photoId)
    return false
  return downloadingProgress.value[photoId] !== undefined
})

const currentImagePath = computed(() => {
  const photoId = currentPhoto.value?._id
  if (!photoId)
    return null
  return downloadedImages.value[photoId]
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
const isMuted = ref(true)
const showVideo = ref(false)
const showShareGenerator = ref(false)
const showLongPressMenu = ref(false)

const {
  localVideoPath,
  isVideoDownloading,
  videoCanPlay,
  videoLoadError,
  preloadVideo,
  handlePlaybackError,
  resetVideo,
} = useLivePhoto()

const shareTitle = 'Giovan｜把喜欢的瞬间分享给你'

function getWebpUrl(url?: string) {
  if (!url)
    return ''

  if (url.toLowerCase().endsWith('.webp')) {
    return url
  }

  const lastDot = url.lastIndexOf('.')
  if (lastDot > 0) {
    return `${url.substring(0, lastDot)}.webp`
  }

  return `${url}.webp`
}

const shareImageUrl = computed(() => {
  return getWebpUrl(currentPhoto.value?.originalUrl || currentPhoto.value?.originalFileUrl)
})

const sharePath = computed(() => {
  const photoId = currentPhoto.value?._id
  if (!photoId)
    return '/pages/gallery/index'
  return `/pages/photo-viewer/index?id=${photoId}`
})

function getOptimizedImageUrl(photo: PhotoItem) {
  const systemInfo = uni.getSystemInfoSync()
  const screenWidth = systemInfo.screenWidth || 375

  if (screenWidth <= 375) {
    return photo.originalFileUrl
  }
  else if (screenWidth <= 768) {
    return photo.originalFileUrl
  }
  return photo.originalFileUrl
}

const currentLivePhotoSource = computed(() => {
  if (!currentPhoto.value?.isLive || !currentPhoto.value.videoUrl) {
    return null
  }

  return {
    _id: currentPhoto.value._id,
    videoUrl: currentPhoto.value.videoUrl,
  }
})

function preloadCurrentVideo(force = false) {
  if (!currentLivePhotoSource.value)
    return

  preloadVideo(currentLivePhotoSource.value, { force })
}

function downloadImage(index: number) {
  const photo = photos.value[index]
  if (!photo)
    return

  const photoId = photo._id
  if (!photoId)
    return

  // 已经下载过或正在下载
  if (downloadedImages.value[photoId] || downloadingProgress.value[photoId])
    return

  const url = getOptimizedImageUrl(photo)
  if (!url)
    return

  downloadingProgress.value[photoId] = { loaded: 0, total: 0 }

  const downloadTask = uni.downloadFile({
    url,
    success: (res) => {
      if (res.statusCode === 200) {
        downloadedImages.value[photoId] = res.tempFilePath
        delete downloadingProgress.value[photoId]
        delete downloadTasks.value[photoId]
      }
    },
    fail: () => {
      delete downloadingProgress.value[photoId]
      delete downloadTasks.value[photoId]
    },
  })

  downloadTasks.value[photoId] = downloadTask

  downloadTask.onProgressUpdate((res) => {
    downloadingProgress.value[photoId] = { loaded: res.totalBytesWritten, total: res.totalBytesExpectedToWrite }
  })
}

function cancelDownload(photoId: string) {
  const task = downloadTasks.value[photoId]
  if (task) {
    task.abort()
    delete downloadTasks.value[photoId]
    delete downloadingProgress.value[photoId]
  }
}

function handleTouchEnd() {
  if (isPlaying.value) {
    isPlaying.value = false
    showVideo.value = false
  }
}

function handleLongPress() {
  if (currentPhoto.value?.isLive && currentPhoto.value.videoUrl) {
    if (!videoCanPlay.value) {
      if (!isVideoDownloading.value) {
        preloadCurrentVideo(!!videoLoadError.value)
      }
      uni.showToast({ title: isVideoDownloading.value ? '实况加载中' : '正在加载实况', icon: 'none' })
      return
    }

    if (!currentImagePath.value) {
      uni.showToast({ title: '图片加载中', icon: 'none' })
      return
    }

    isPlaying.value = true
    showVideo.value = false
    uni.vibrateShort({ success: () => {}, fail: () => {} })
    return
  }

  showLongPressMenu.value = true
  uni.vibrateShort({ success: () => {}, fail: () => {} })
}

function onVideoPlay() {
  showVideo.value = true
}

function onVideoEnded() {
  isPlaying.value = false
  showVideo.value = false
}

function onVideoError() {
  if (currentLivePhotoSource.value) {
    void handlePlaybackError(currentLivePhotoSource.value)
  }
  isPlaying.value = false
  showVideo.value = false
}

function toggleMute() {
  isMuted.value = !isMuted.value
}

async function loadSharedPhoto(photoId: string) {
  try {
    const res = await photoApi.getPhotoDetail(photoId)
    if (res.data) {
      photos.value = [res.data]
      currentIndex.value = 0
      await nextTick()
      downloadImage(0)
      if (res.data.isLive && res.data.videoUrl) {
        preloadCurrentVideo()
      }
    }
  }
  catch (error) {
    console.error('加载图片详情失败', error)
    uni.showToast({ title: '图片加载失败', icon: 'none' })
  }
}

function initShareMenu() {
  // #ifdef MP-WEIXIN
  uni.showShareMenu({
    menus: ['shareAppMessage', 'shareTimeline'],
  })
  // #endif
}

onLoad((options) => {
  const systemInfo = uni.getSystemInfoSync()
  statusBarHeight.value = systemInfo.statusBarHeight || 0
  initShareMenu()

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

  if (!photos.value.length && options?.id) {
    loadSharedPhoto(options.id)
    return
  }

  nextTick(() => {
    downloadImage(currentIndex.value)
    if (currentPhoto.value?.isLive && currentPhoto.value.videoUrl) {
      preloadCurrentVideo()
    }
  })
})

onShow(() => {
  initShareMenu()
})

watch(currentIndex, (newIndex, oldIndex) => {
  if (newIndex !== oldIndex) {
    // 取消上一张图片的下载
    if (oldIndex !== undefined) {
      const oldPhoto = photos.value[oldIndex]
      if (oldPhoto?._id) {
        cancelDownload(oldPhoto._id)
      }
    }

    isPlaying.value = false
    showVideo.value = false
    resetVideo()

    downloadImage(newIndex)

    if (currentPhoto.value?.isLive && currentPhoto.value.videoUrl) {
      preloadCurrentVideo()
    }
  }
})

onUnmounted(() => {
  resetVideo()
  // 取消所有下载
  Object.values(downloadTasks.value).forEach(task => task?.abort())
})

function handleSwiperChange(e: any) {
  currentIndex.value = e.detail.current
}

function goToGallery() {
  uni.switchTab({
    url: '/pages/gallery/index',
    fail: () => {
      uni.reLaunch({
        url: '/pages/gallery/index',
      })
    },
  })
}

function goBack() {
  const pages = getCurrentPages()

  if (pages.length > 1) {
    uni.navigateBack({
      fail: () => {
        goToGallery()
      },
    })
    return
  }

  goToGallery()
}

function handleShare() {
  if (!currentPhoto.value)
    return

  showShareGenerator.value = true
}

function onShareGeneratorClose() {
  showShareGenerator.value = false
}

async function saveCurrentImage() {
  showLongPressMenu.value = false

  const imageUrl = currentImagePath.value || currentPhoto.value?.originalFileUrl
  if (!imageUrl) {
    uni.showToast({ title: '图片未加载', icon: 'none' })
    return
  }

  uni.previewImage({
    urls: [currentPhoto.value?.originalFileUrl || imageUrl],
    current: currentPhoto.value?.originalFileUrl || imageUrl,
  })
}

function closeLongPressMenu() {
  showLongPressMenu.value = false
}

onShareAppMessage(() => {
  return {
    title: shareTitle,
    path: sharePath.value,
    imageUrl: shareImageUrl.value,
  }
})

onShareTimeline(() => {
  return {
    title: shareTitle,
    query: currentPhoto.value?._id ? `id=${currentPhoto.value._id}` : '',
    imageUrl: shareImageUrl.value,
  }
})
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
        gap-4
      >
        <view
          i-tabler-chevron-left
          text-2xl
          text-white
          @tap.stop="goBack"
        />
        <view
          i-tabler-share
          text-xl
          text-white
          @tap.stop="handleShare"
        />
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
        v-for="(photo, index) in photos"
        :key="`${photo._id}-${index}`"
        flex
        items-center
        justify-center
        @touchend="handleTouchEnd"
        @touchcancel="handleTouchEnd"
        @longpress="handleLongPress"
      >
        <!-- 只渲染当前图片 -->
        <template v-if="index === currentIndex">
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
              @play="onVideoPlay"
              @ended="onVideoEnded"
              @error="onVideoError"
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
                  v-if="isDownloading && currentDownloadPercent !== null"
                  class="download-progress-card"
                >
                  <view class="download-progress-head">
                    <text class="download-progress-label">
                      图片加载中
                    </text>
                    <text class="download-progress-value">
                      {{ currentDownloadProgress }}
                    </text>
                  </view>
                  <view class="download-progress-track">
                    <view
                      class="download-progress-fill"
                      :style="{ width: `${currentDownloadPercent}%` }"
                    >
                      <view class="download-progress-glow" />
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <view
            v-else
            class="photo-wrapper"
            w-full
            :style="{ height: containerHeight }"
            relative
          >
            <image
              :src="currentImagePath || photo.thumbnailUrl"
              mode="aspectFill"
              class="photo-image"
            />

            <view
              v-if="isDownloading && currentDownloadPercent !== null"
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
                <view class="download-progress-card">
                  <view class="download-progress-head">
                    <text class="download-progress-label">
                      图片加载中
                    </text>
                    <text class="download-progress-value">
                      {{ currentDownloadProgress }}
                    </text>
                  </view>
                  <view class="download-progress-track">
                    <view
                      class="download-progress-fill"
                      :style="{ width: `${currentDownloadPercent}%` }"
                    >
                      <view class="download-progress-glow" />
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </template>

        <!-- 非当前图片显示缩略图占位 -->
        <view
          v-else
          w-full
          h-full
          flex
          items-center
          justify-center
        >
          <image
            :src="photo.thumbnailUrl"
            mode="aspectFill"
            class="photo-image"
          />
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
        background: 'linear-gradient(0deg, rgba(0,0,0,0.66) 0%, rgba(0,0,0,0.18) 58%, transparent 100%)',
        paddingBottom: 'env(safe-area-inset-bottom, 12px)',
      }"
    >
      <view class="footer-content">
        <view
          v-if="currentPhoto.title"
          class="footer-title-wrap"
        >
          <text class="footer-title">
            {{ currentPhoto.title }}
          </text>
        </view>

        <view
          v-if="currentPhoto.description"
          class="footer-description-wrap"
        >
          <text class="footer-description">
            {{ currentPhoto.description }}
          </text>
        </view>

        <view
          v-if="formattedDate || locationText"
          class="footer-meta-list"
        >
          <view
            v-if="formattedDate"
            class="footer-meta-pill"
          >
            <view i-tabler-calendar class="footer-meta-glyph" />
            <text class="footer-meta-text">
              {{ formattedDate }}
            </text>
          </view>

          <view
            v-if="locationText"
            class="footer-meta-pill footer-meta-pill-wide"
          >
            <view i-tabler-map-pin class="footer-meta-glyph" />
            <text class="footer-meta-text truncate">
              {{ locationText }}
            </text>
          </view>
        </view>

        <view
          v-if="currentPhoto.tags?.length"
          class="footer-tags"
        >
          <text
            v-for="tag in currentPhoto.tags.slice(0, 5)"
            :key="tag"
            class="footer-tag"
          >
            {{ `#${tag}` }}
          </text>
          <text
            v-if="currentPhoto.tags.length > 5"
            class="footer-tag footer-tag-more"
          >
            +{{ currentPhoto.tags.length - 5 }}
          </text>
        </view>
      </view>
    </view>

    <PhotoShareGenerator
      v-if="currentPhoto"
      :photo="currentPhoto"
      :visible="showShareGenerator"
      @close="onShareGeneratorClose"
    />

    <view
      v-if="showLongPressMenu"
      class="long-press-menu"
      @click="closeLongPressMenu"
    >
      <view
        class="menu-content"
        @click.stop
      >
        <view
          class="menu-item"
          @click="saveCurrentImage"
        >
          <view i-tabler-zoom-in text-xl />
          <text>查看原图</text>
        </view>
        <view
          class="menu-item"
          @click="showLongPressMenu = false; showShareGenerator = true"
        >
          <view i-tabler-share text-xl />
          <text>生成分享图</text>
        </view>
        <view
          class="menu-item cancel"
          @click="closeLongPressMenu"
        >
          <text>取消</text>
        </view>
      </view>
    </view>
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
  filter: blur(20px);
  transform: scale(1.1);
  opacity: 0.5;
  z-index: 0;
  will-change: transform;
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

.footer-content {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.footer-title-wrap {
  max-width: 92%;
}

.footer-title {
  color: rgba(255, 255, 255, 0.98);
  font-size: 36rpx;
  font-weight: 600;
  line-height: 1.28;
  letter-spacing: 0.2rpx;
  display: -webkit-box;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-clamp: 2;
}

.footer-description-wrap {
  max-width: 96%;
}

.footer-description {
  color: rgba(255, 255, 255, 0.74);
  font-size: 25rpx;
  line-height: 1.55;
  display: -webkit-box;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-clamp: 2;
}

.footer-meta-list {
  display: flex;
  flex-wrap: wrap;
  gap: 18rpx;
  margin-top: 4rpx;
}

.footer-meta-pill {
  display: flex;
  align-items: center;
  gap: 8rpx;
  min-width: 0;
  max-width: 100%;
}

.footer-meta-pill-wide {
  flex: 1;
}

.footer-meta-glyph {
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.72);
  font-size: 24rpx;
}

.footer-meta-text {
  min-width: 0;
  color: rgba(255, 255, 255, 0.8);
  font-size: 23rpx;
  line-height: 1.4;
}

.footer-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-top: 6rpx;
}

.footer-tag {
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  color: rgba(255, 255, 255, 0.76);
  font-size: 21rpx;
  line-height: 1;
  background: rgba(255, 255, 255, 0.12);
}

.footer-tag-more {
  color: rgba(255, 255, 255, 0.58);
  background: transparent;
}

.download-progress-card {
  min-width: 240rpx;
  max-width: 320rpx;
  padding: 18rpx 20rpx 16rpx;
  border-radius: 24rpx;
  background: rgba(12, 17, 28, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(20px);
  box-shadow: 0 12rpx 36rpx rgba(0, 0, 0, 0.18);
}

.download-progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 12rpx;
}

.download-progress-label {
  color: rgba(255, 255, 255, 0.76);
  font-size: 22rpx;
  line-height: 1;
}

.download-progress-value {
  color: #fff;
  font-size: 24rpx;
  font-weight: 600;
  line-height: 1;
}

.download-progress-track {
  position: relative;
  width: 100%;
  height: 10rpx;
  overflow: hidden;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.16);
}

.download-progress-fill {
  position: relative;
  height: 100%;
  min-width: 12rpx;
  border-radius: 999rpx;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.48) 0%, #fff 100%);
  transition: width 0.24s ease-out;
}

.download-progress-glow {
  position: absolute;
  top: 0;
  right: -28rpx;
  width: 56rpx;
  height: 100%;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.9) 100%);
  animation: progress-glow 1.2s linear infinite;
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
  line-clamp: 2;
}

.long-press-menu {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  z-index: 100;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.menu-content {
  width: 100%;
  background: #fff;
  border-radius: 24px 24px 0 0;
  padding-bottom: env(safe-area-inset-bottom, 20px);
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 18px 20px;
  color: #333;
  font-size: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.menu-item:active {
  background: #f5f5f5;
}

.menu-item.cancel {
  margin-top: 8px;
  border-bottom: none;
  color: #999;
}

@keyframes progress-glow {
  0% {
    transform: translateX(-24rpx);
    opacity: 0.25;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translateX(24rpx);
    opacity: 0.25;
  }
}
</style>
