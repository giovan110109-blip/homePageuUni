<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import LiveBadge from './LiveBadge.vue'
import PhotoViewer from './photoViewer.vue'

interface Props {
  imageUrl: string
  thumbnailUrl?: string
  videoUrl?: string
  isLive?: boolean
  aspectRatio?: number
  width?: number
  height?: number
  photoId?: string
}

const props = withDefaults(defineProps<Props>(), {
  thumbnailUrl: undefined,
  videoUrl: undefined,
  isLive: false,
  aspectRatio: 1,
  width: 1,
  height: 1,
  photoId: undefined,
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const videoId = computed(() => `live-video-${props.photoId || Date.now()}`)

const wrapperStyle = computed(() => {
  const paddingBottom = (1 / props.aspectRatio) * 100
  return `padding-bottom: ${paddingBottom}%`
})

const isPlaying = ref(false)
const videoCanPlay = ref(false)
const isMuted = ref(true)
const videoContext = ref<UniApp.VideoContext | null>(null)
const localVideoPath = ref('')
const isDownloading = ref(false)
const showVideo = ref(false)

function getCacheKey() {
  return `live_video_${props.photoId || ''}`
}

async function preloadVideo() {
  if (!props.videoUrl || localVideoPath.value || isDownloading.value)
    return

  const cacheKey = getCacheKey()
  const cachedPath = uni.getStorageSync(cacheKey)
  if (cachedPath) {
    localVideoPath.value = cachedPath
    videoCanPlay.value = true
    return
  }

  isDownloading.value = true

  uni.downloadFile({
    url: props.videoUrl,
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
      console.error('[LivePhoto] 视频下载失败:', err)
    },
    complete: () => {
      isDownloading.value = false
    },
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
  if (!props.isLive || !props.videoUrl)
    return

  if (!videoCanPlay.value) {
    uni.showToast({ title: '视频加载中', icon: 'none' })
    return
  }

  isPlaying.value = true
  showVideo.value = false // 先不隐藏封面
  uni.vibrateShort({ success: () => {}, fail: () => {} })
}

function onVideoPlay() {
  // 视频开始播放后才隐藏封面
  showVideo.value = true
}

function onVideoEnded() {
  isPlaying.value = false
  showVideo.value = false
}

function onVideoError(e: any) {
  console.error('[LivePhoto] 视频播放错误:', e)
  isPlaying.value = false
  showVideo.value = false
}

function handleClick(e: any) {
  if (isPlaying.value) {
    isPlaying.value = false
    return
  }
  emit('click', e)
}

function toggleMute() {
  isMuted.value = !isMuted.value
}

watch(
  () => props.videoUrl,
  (newUrl) => {
    if (newUrl && props.isLive) {
      localVideoPath.value = ''
      videoCanPlay.value = false
      preloadVideo()
    }
  },
  { immediate: true },
)

onMounted(() => {
  if (props.isLive && props.videoUrl) {
    preloadVideo()
  }
})

onUnmounted(() => {
  videoContext.value?.pause()
})
</script>

<template>
  <view
    class="live-photo-wrapper"
    :style="wrapperStyle"
    @click="handleClick"
    @touchend="handleTouchEnd"
    @longpress="handleLongPress"
  >
    <!-- 视频：长按时创建，autoplay 播放，poster 显示封面 -->
    <video
      v-if="isPlaying && localVideoPath"
      :id="videoId"
      class="live-video"
      :src="localVideoPath"
      :poster="imageUrl"
      :muted="isMuted"
      :show-center-play-btn="false"
      :show-play-btn="false"
      :show-fullscreen-btn="false"
      :show-progress="false"
      :enable-progress-gesture="false"
      :show-loading="false"
      object-fit="cover"
      :autoplay="true"
      :loop="false"
      @play="onVideoPlay"
      @ended="onVideoEnded"
      @error="onVideoError"
    />

    <!-- 封面图：视频开始播放后才隐藏 -->
    <view
      class="photo-cover"
      :class="{ 'photo-fade': showVideo }"
    >
      <PhotoViewer
        :src="imageUrl"
        :thumbnail-url="thumbnailUrl"
        :aspect-ratio="aspectRatio"
      />
    </view>

    <view class="live-badge-wrapper">
      <LiveBadge
        v-if="isLive"
        :can-play="videoCanPlay"
        :is-playing="isPlaying"
      />
    </view>

    <view
      v-if="isLive"
      class="mute-btn"
      @click.stop="toggleMute"
    >
      <view :class="isMuted ? 'i-tabler-volume-off' : 'i-tabler-volume'" />
    </view>
  </view>
</template>

<style scoped>
.live-photo-wrapper {
  position: relative;
  width: 100%;
  height: 0;
  overflow: hidden;
  background: #f5f5f5;
}

.live-video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
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

.photo-fade {
  opacity: 0;
  pointer-events: none;
}

.live-badge-wrapper {
  position: absolute;
  top: 16rpx;
  left: 16rpx;
  z-index: 10;
}

.mute-btn {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  z-index: 10;
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(12px);
  color: #fff;
  font-size: 36rpx;
}

.mute-btn:active {
  transform: scale(0.9);
}
</style>
