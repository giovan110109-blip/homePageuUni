<script setup lang="ts">
import type { PhotoItem } from '@/api'
import { computed, ref, watch } from 'vue'

interface Props {
  photo: PhotoItem
  logo?: string
  visible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  logo: '',
  visible: false,
})

const emit = defineEmits<{
  generated: [imagePath: string]
  save: [imagePath: string]
  share: [imagePath: string]
  close: []
}>()

const isGenerating = ref(false)
const generatedImage = ref('')

const cameraInfo = computed(() => {
  const camera = props.photo.camera
  if (!camera)
    return ''
  const parts = []
  if (camera.make)
    parts.push(camera.make)
  if (camera.model)
    parts.push(camera.model)
  return parts.join(' ')
})

const lensInfo = computed(() => {
  const camera = props.photo.camera
  if (!camera)
    return ''
  const parts = []
  if (camera.lens)
    parts.push(camera.lens)
  if (camera.focalLength)
    parts.push(camera.focalLength)
  if (camera.aperture)
    parts.push(camera.aperture)
  if (camera.shutterSpeed)
    parts.push(camera.shutterSpeed)
  if (camera.iso)
    parts.push(`ISO ${camera.iso}`)
  return parts.join(' | ')
})

const dateInfo = computed(() => {
  if (!props.photo.dateTaken)
    return ''
  const date = new Date(props.photo.dateTaken)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
})

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      isGenerating.value = true
      setTimeout(() => {
        generatedImage.value = props.photo.originalFileUrl || props.photo.originalUrl
        emit('generated', generatedImage.value)
        isGenerating.value = false
      }, 500)
    }
  },
)

function handleClose() {
  emit('close')
}

function handleSave() {
  if (generatedImage.value) {
    emit('save', generatedImage.value)
  }
}

function handleShare() {
  if (generatedImage.value) {
    emit('share', generatedImage.value)
  }
}
</script>

<template>
  <view
    v-if="visible"
    class="photo-share-generator"
    @click="handleClose"
  >
    <view
      class="generator-modal"
      @click.stop
    >
      <view class="modal-header">
        <text class="modal-title">分享图片</text>
        <view
          class="close-btn"
          @click="handleClose"
        >
          <view i-tabler-x text-white text-xl />
        </view>
      </view>

      <view
        v-if="isGenerating"
        class="loading-container"
      >
        <view class="loading-spinner" />
        <text class="loading-text">加载中...</text>
      </view>

      <view
        v-else
        class="preview-container"
      >
        <view class="preview-content">
          <image
            v-if="generatedImage"
            :src="generatedImage"
            class="preview-image"
            mode="aspectFit"
          />
          <view class="info-bar">
            <view class="info-left">
              <text v-if="props.photo.title" class="info-title">{{ props.photo.title }}</text>
              <text v-if="cameraInfo" class="info-camera">{{ cameraInfo }}</text>
              <text v-if="lensInfo" class="info-lens">{{ lensInfo }}</text>
            </view>
            <view class="info-right">
              <text v-if="dateInfo" class="info-date">{{ dateInfo }}</text>
              <text
                v-if="props.photo.tags && props.photo.tags.length > 0"
                class="info-tags"
              >
                {{ props.photo.tags.slice(0, 3).map(tag => `#${tag}`).join(' ') }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <view
        v-if="!isGenerating && generatedImage"
        class="modal-actions"
      >
        <view
          class="action-btn save-btn"
          @click="handleSave"
        >
          <view i-tabler-download text-white text-xl />
          <text class="action-text">保存到相册</text>
        </view>
        <view
          class="action-btn share-btn"
          @click="handleShare"
        >
          <view i-tabler-share text-white text-xl />
          <text class="action-text">分享给好友</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.photo-share-generator {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.generator-modal {
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  background: #1a1a1a;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-title {
  color: white;
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:active {
  transform: scale(0.9);
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 40px;
  gap: 20px;
}

.loading-spinner {
  width: 60px;
  height: 60px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-text {
  color: white;
  font-size: 16px;
}

.preview-container {
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  max-height: 50vh;
  overflow: hidden;
}

.preview-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.preview-image {
  width: 100%;
  border-radius: 8px;
  background: #000;
}

.info-bar {
  background: #1a1a1a;
  padding: 15px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.info-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.info-right {
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: flex-end;
}

.info-title {
  color: white;
  font-size: 16px;
  font-weight: 600;
}

.info-camera {
  color: #999;
  font-size: 14px;
}

.info-lens {
  color: #999;
  font-size: 14px;
}

.info-date {
  color: #666;
  font-size: 12px;
}

.info-tags {
  color: #666;
  font-size: 12px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  transition: all 0.2s;
}

.action-btn:active {
  transform: scale(0.95);
}

.save-btn {
  background: #007aff;
}

.share-btn {
  background: #34c759;
}

.action-text {
  color: white;
  font-size: 14px;
  font-weight: 500;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
