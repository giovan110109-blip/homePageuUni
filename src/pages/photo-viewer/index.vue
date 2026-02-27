<script setup lang="ts">
import type { PhotoItem } from '@/api'
import { onLoad } from '@dcloudio/uni-app'
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
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

const downloadedImages = ref<Record<string, string>>({})
const downloadingProgress = ref<Record<string, { loaded: number, total: number }>>({})
const downloadTasks = ref<Record<string, UniApp.DownloadTask>>({})

const currentDownloadProgress = computed(() => {
  const photoId = currentPhoto.value?._id
  if (!photoId)
    return null
  const progress = downloadingProgress.value[photoId]
  if (!progress)
    return null
  return `${formatBytes(progress.loaded)} / ${formatBytes(progress.total)}`
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
    console.error('[PhotoViewer] 使用缓存视频:', cachedPath)
    localVideoPath.value = cachedPath
    videoCanPlay.value = true
    return
  }

  console.error('[PhotoViewer] 开始下载视频:', currentPhoto.value.videoUrl)
  isVideoDownloading.value = true

  uni.downloadFile({
    url: currentPhoto.value.videoUrl,
    success: async (res) => {
      if (res.statusCode === 200) {
        console.error('[PhotoViewer] 视频下载完成:', res.tempFilePath)
        try {
          const saveRes = await uni.saveFile({ tempFilePath: res.tempFilePath })
          localVideoPath.value = saveRes.savedFilePath
          uni.setStorageSync(cacheKey, saveRes.savedFilePath)
          console.error('[PhotoViewer] 视频已保存:', saveRes.savedFilePath)
        }
        catch {
          localVideoPath.value = res.tempFilePath
        }
        videoCanPlay.value = true
        console.error('[PhotoViewer] videoCanPlay 设置为 true')
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
    videoContext.value = null
  }
}

function handleLongPress() {
  console.error('[PhotoViewer] handleLongPress', {
    isLive: currentPhoto.value?.isLive,
    videoUrl: currentPhoto.value?.videoUrl,
    videoCanPlay: videoCanPlay.value,
    localVideoPath: localVideoPath.value,
    currentImagePath: currentImagePath.value,
  })

  if (!currentPhoto.value?.isLive || !currentPhoto.value.videoUrl) {
    console.error('[PhotoViewer] 不是 Live 照片或没有视频 URL')
    return
  }

  // 图片必须加载完成
  if (!currentImagePath.value) {
    console.error('[PhotoViewer] 图片还未加载完成')
    uni.showToast({ title: '图片加载中', icon: 'none' })
    return
  }

  // 视频必须加载完成
  if (!videoCanPlay.value) {
    console.error('[PhotoViewer] 视频还未准备好')
    uni.showToast({ title: '视频加载中', icon: 'none' })
    return
  }

  console.error('[PhotoViewer] 开始播放视频')
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
    if (currentPhoto.value?.isLive && currentPhoto.value.videoUrl) {
      preloadVideo()
    }
  })
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

onUnmounted(() => {
  videoContext.value?.pause()
  // 取消所有下载
  Object.values(downloadTasks.value).forEach(task => task?.abort())
})

function handleSwiperChange(e: any) {
  currentIndex.value = e.detail.current
}

function goBack() {
  uni.navigateBack()
}

function handleShare() {
  if (!currentPhoto.value)
    return

  showShareGenerator.value = true
}

function onShareImageGenerated(imagePath: string) {
  generatedShareImage.value = imagePath
}

async function saveGeneratedImage() {
  if (!generatedShareImage.value)
    return

  console.warn('准备保存图片, 路径:', generatedShareImage.value)
  
  try {
    uni.showLoading({ title: '保存中...' })
    const result = await uni.saveImageToPhotosAlbum({ filePath: generatedShareImage.value })
    console.warn('保存结果:', result)
    uni.showToast({ title: '保存成功', icon: 'success' })
  }
  catch (err) {
    console.error('保存图片失败:', err)
    console.error('错误类型:', typeof err)
    console.error('错误信息:', (err as any)?.errMsg || (err as any)?.message || JSON.stringify(err))
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
    console.error('分享取消')
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
              v-if="isDownloading && currentDownloadProgress"
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
          <text class="truncate">
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
          <text class="truncate">
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
</style>
