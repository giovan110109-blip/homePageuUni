<script setup lang="ts">
import { computed, getCurrentInstance, onMounted, onUnmounted, ref, watch } from 'vue'
import { useLivePhoto } from '@/composables/usePhoto'
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

const fallbackVideoId = `live-video-${Math.random().toString(36).slice(2, 10)}`
const videoId = computed(() => `live-video-${props.photoId || fallbackVideoId}`)

const wrapperStyle = computed(() => {
  const paddingBottom = (1 / props.aspectRatio) * 100
  return `padding-bottom: ${paddingBottom}%`
})

const instance = getCurrentInstance()
const isPlaying = ref(false)
const isMuted = ref(true)
const showVideo = ref(false)
const isVisible = ref(false)

const {
  localVideoPath,
  isVideoDownloading: isDownloading,
  videoCanPlay,
  videoLoadError,
  preloadVideo,
  handlePlaybackError,
  resetVideo,
} = useLivePhoto()

let intersectionObserver: UniApp.IntersectionObserver | null = null

const livePhotoSource = computed(() => {
  if (!props.isLive || !props.videoUrl || !props.photoId)
    return null

  return {
    _id: props.photoId,
    videoUrl: props.videoUrl,
  }
})

function observeVisibility() {
  if (!props.isLive || !props.videoUrl)
    return

  intersectionObserver = uni.createIntersectionObserver(instance?.proxy)
  intersectionObserver.relativeToViewport({ bottom: 240 }).observe('.live-photo-wrapper', (res) => {
    if (res.intersectionRatio <= 0)
      return

    isVisible.value = true
    preloadCurrentVideo()
    intersectionObserver?.disconnect()
    intersectionObserver = null
  })
}

function preloadCurrentVideo(force = false) {
  if (!livePhotoSource.value)
    return

  if (!isVisible.value && !force)
    return

  preloadVideo(livePhotoSource.value, { force })
}

function handleTouchEnd() {
  if (isPlaying.value) {
    isPlaying.value = false
    showVideo.value = false
  }
}

function handleLongPress() {
  if (!livePhotoSource.value)
    return

  if (!videoCanPlay.value) {
    if (!isDownloading.value) {
      preloadCurrentVideo(!!videoLoadError.value)
    }
    uni.showToast({ title: isDownloading.value ? '实况加载中' : '正在加载实况', icon: 'none' })
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

function onVideoError() {
  if (livePhotoSource.value) {
    void handlePlaybackError(livePhotoSource.value)
  }
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
  () => [props.photoId, props.videoUrl, props.isLive],
  () => {
    resetVideo()
    isPlaying.value = false
    showVideo.value = false

    if (isVisible.value) {
      preloadCurrentVideo()
    }
  },
  { immediate: true },
)

onMounted(() => {
  observeVisibility()
})

onUnmounted(() => {
  intersectionObserver?.disconnect()
  resetVideo()
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
