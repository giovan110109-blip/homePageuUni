<script setup lang="ts">
import { computed, getCurrentInstance, onMounted, onUnmounted, ref, watch } from 'vue'

interface Props {
  src: string
  thumbnailUrl?: string
  aspectRatio?: number
  width?: number
  height?: number
}

const props = withDefaults(defineProps<Props>(), {
  thumbnailUrl: undefined,
  aspectRatio: undefined,
  width: undefined,
  height: undefined,
})

const imageLoaded = ref(false)
const showImage = ref(false)
const isVisible = ref(false)
const cachedImageUrl = ref('')
const isLoadingImage = ref(false)
const requestId = ref(0)

let intersectionObserver: UniApp.IntersectionObserver | null = null

const computedAspectRatio = computed(() => {
  if (props.aspectRatio)
    return props.aspectRatio
  if (props.width && props.height)
    return props.width / props.height
  return 16 / 9
})

const wrapperStyle = computed(() => {
  const paddingBottom = (1 / computedAspectRatio.value) * 100
  return `padding-bottom: ${paddingBottom}%`
})

const rawWebpUrl = computed(() => {
  const url = props.src

  if (url.toLowerCase().endsWith('.webp')) {
    return url
  }

  const lastDot = url.lastIndexOf('.')
  if (lastDot > 0) {
    return `${url.substring(0, lastDot)}.webp`
  }
  return `${url}.webp`
})

const webpSrc = computed(() => {
  return cachedImageUrl.value || rawWebpUrl.value
})

async function preloadWebpImage() {
  if (!props.src)
    return

  const currentId = ++requestId.value
  const webpUrl = rawWebpUrl.value

  isLoadingImage.value = true

  try {
    const result = await new Promise<string>((resolve, reject) => {
      uni.downloadFile({
        url: webpUrl,
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.tempFilePath)
          }
          else {
            reject(new Error(`下载失败: ${res.statusCode}`))
          }
        },
        fail: reject,
      })
    })

    if (currentId !== requestId.value)
      return

    cachedImageUrl.value = result
  }
  catch {
    if (currentId !== requestId.value)
      return
    cachedImageUrl.value = webpUrl
  }
  finally {
    if (currentId !== requestId.value)
      return
    isLoadingImage.value = false
    showImage.value = true
  }
}

function onImageLoad() {
  imageLoaded.value = true
}

function onImageError() {
  showImage.value = true
  imageLoaded.value = false
}

watch(
  () => props.src,
  () => {
    cachedImageUrl.value = ''
    imageLoaded.value = false
    showImage.value = false
    if (isVisible.value) {
      preloadWebpImage()
    }
  },
  { immediate: true },
)

onMounted(() => {
  intersectionObserver = uni.createIntersectionObserver(getCurrentInstance()?.proxy)

  intersectionObserver.relativeToViewport({ bottom: 200 }).observe('.lazy-image-wrapper', (res) => {
    if (res.intersectionRatio > 0) {
      isVisible.value = true
      if (!isLoadingImage.value && !imageLoaded.value) {
        preloadWebpImage()
      }
      if (intersectionObserver) {
        intersectionObserver.disconnect()
      }
    }
  })
})

onUnmounted(() => {
  if (intersectionObserver) {
    intersectionObserver.disconnect()
    intersectionObserver = null
  }
})
</script>

<template>
  <view class="lazy-image-wrapper" :style="wrapperStyle">
    <image
      v-if="thumbnailUrl"
      :src="thumbnailUrl"
      class="lazy-image-placeholder"
      mode="aspectFill"
      lazy-load
    />

    <view v-else class="lazy-image-bg" />

    <image
      v-if="isVisible && showImage"
      :src="webpSrc"
      class="lazy-image-main"
      :class="{ 'image-loaded': imageLoaded }"
      mode="aspectFill"
      lazy-load
      @load="onImageLoad"
      @error="onImageError"
    />
  </view>
</template>

<style scoped>
.lazy-image-wrapper {
  position: relative;
  width: 100%;
  height: 0;
  overflow: hidden;
  background: #f5f5f5;
}

.lazy-image-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #f5f5f5;
}

.lazy-image-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  filter: blur(10px);
  transform: scale(1.1);
  transform-origin: center;
}

.lazy-image-main {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 0.4s ease-in-out;
}

.lazy-image-main.image-loaded {
  opacity: 1;
}
</style>
