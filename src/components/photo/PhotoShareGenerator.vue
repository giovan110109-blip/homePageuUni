<script setup lang="ts">
import type { PhotoItem } from '@/api'
import { computed, getCurrentInstance, nextTick, ref, watch } from 'vue'
import Loading from '@/components/Loading.vue'

interface Props {
  photo: PhotoItem
  logo?: string
  qrCode?: string
  visible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  logo: '/static/logo-dark.png',
  qrCode: '/static/code.png',
  visible: false,
})

const emit = defineEmits<{
  generated: [imagePath: string]
  save: [imagePath: string]
  share: [imagePath: string]
  close: []
}>()

const instance = getCurrentInstance()

const isGenerating = ref(false)
const generatedImage = ref('')
const canvasWidth = ref(2160)
const canvasHeight = ref(3840)

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
    return { focalLength: '--', aperture: '--', shutterSpeed: '--', iso: '--' }
  return {
    focalLength: camera.focalLength || '--',
    aperture: camera.aperture || '--',
    shutterSpeed: camera.shutterSpeed || '--',
    iso: camera.iso || '--',
  }
})

interface DownloadResult {
  statusCode: number
  tempFilePath: string
}

interface ImageInfoResult {
  width: number
  height: number
  path: string
}

interface CanvasExportResult {
  tempFilePath: string
}

async function drawIcon(ctx: any, canvas: any, iconPath: string, x: number, y: number, size: number) {
  try {
    const img = canvas.createImage()
    img.src = iconPath
    await new Promise<void>((resolve) => {
      img.onload = () => resolve()
      img.onerror = () => resolve()
    })
    if (img.complete) {
      ctx.drawImage(img, x, y, size, size)
    }
  }
  catch {
    console.error('绘制图标失败:', iconPath)
  }
}

async function generateWatermarkedImage() {
  isGenerating.value = true

  try {
    const downloadRes = await new Promise<DownloadResult>((resolve, reject) => {
      uni.downloadFile({
        url: props.photo.originalFileUrl || props.photo.originalUrl,
        success: res => resolve({ statusCode: res.statusCode, tempFilePath: res.tempFilePath }),
        fail: err => reject(err),
      })
    })

    if (downloadRes.statusCode !== 200) {
      throw new Error('下载图片失败')
    }

    const tempFilePath = downloadRes.tempFilePath

    const imageInfo = await new Promise<ImageInfoResult>((resolve, reject) => {
      uni.getImageInfo({
        src: tempFilePath,
        success: res => resolve({ width: res.width, height: res.height, path: res.path }),
        fail: err => reject(err),
      })
    })

    const maxWidth = 1080
    const ratio = imageInfo.width / imageInfo.height
    canvasWidth.value = maxWidth
    canvasHeight.value = Math.round(maxWidth / ratio)

    const watermarkHeight = 120
    const totalHeight = canvasHeight.value + watermarkHeight

    await nextTick()
    await new Promise<void>(resolve => setTimeout(resolve, 100))

    const query = uni.createSelectorQuery().in(instance)
    const canvasNode = await new Promise<any>((resolve, reject) => {
      query.select('#watermarkCanvas')
        .fields({ node: true, size: true }, () => {})
        .exec((res) => {
          if (res && res[0] && res[0].node) {
            resolve(res[0])
          }
          else {
            reject(new Error('获取 canvas 节点失败'))
          }
        })
    })

    const canvas = canvasNode.node
    const ctx = canvas.getContext('2d')

    const dpr = uni.getSystemInfoSync().pixelRatio || 1
    canvas.width = canvasWidth.value * dpr
    canvas.height = totalHeight * dpr
    ctx.scale(dpr, dpr)

    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, canvasWidth.value, totalHeight)

    const img = canvas.createImage()
    img.src = tempFilePath
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('图片加载失败'))
    })
    ctx.drawImage(img, 0, 0, canvasWidth.value, canvasHeight.value)

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, canvasHeight.value, canvasWidth.value, watermarkHeight)

    const logoWidth = 110
    const logoHeight = 30
    const qrSize = 80
    const padding = 30

    try {
      const logoImg = canvas.createImage()
      logoImg.src = props.logo
      await new Promise<void>((resolve) => {
        logoImg.onload = () => resolve()
        logoImg.onerror = () => resolve()
      })
      if (logoImg.complete) {
        ctx.drawImage(logoImg, padding, canvasHeight.value + 45, logoWidth, logoHeight)
      }
    }
    catch {
      console.error('绘制 logo 失败')
    }

    try {
      const qrImg = canvas.createImage()
      qrImg.src = props.qrCode
      await new Promise<void>((resolve) => {
        qrImg.onload = () => resolve()
        qrImg.onerror = () => resolve()
      })
      if (qrImg.complete) {
        ctx.drawImage(qrImg, canvasWidth.value - padding - qrSize, canvasHeight.value + 20, qrSize, qrSize)
      }
    }
    catch {
      console.error('绘制二维码失败')
    }

    const textX = padding + logoWidth + 20
    const textY = canvasHeight.value + 35
    const iconSize = 24

    ctx.fillStyle = '#333333'
    ctx.font = '20px sans-serif'
    ctx.textAlign = 'left'

    if (cameraInfo.value) {
      ctx.fillText(`📷 ${cameraInfo.value}`, textX, textY + 25)
    }

    const lens = lensInfo.value
    let lensX = textX
    const lensY = textY + 60

    if (lens.focalLength) {
      await drawIcon(ctx, canvas, '/static/icons/focal-length.png', lensX, lensY - 18, iconSize)
      ctx.fillText(lens.focalLength, lensX + iconSize + 8, lensY)
      lensX += ctx.measureText(lens.focalLength).width + iconSize + 40
    }

    if (lens.aperture) {
      await drawIcon(ctx, canvas, '/static/icons/aperture.png', lensX, lensY - 18, iconSize)
      ctx.fillText(lens.aperture, lensX + iconSize + 8, lensY)
      lensX += ctx.measureText(lens.aperture).width + iconSize + 40
    }

    if (lens.shutterSpeed) {
      await drawIcon(ctx, canvas, '/static/icons/shutter.png', lensX, lensY - 18, iconSize)
      ctx.fillText(lens.shutterSpeed, lensX + iconSize + 8, lensY)
      lensX += ctx.measureText(lens.shutterSpeed).width + iconSize + 40
    }

    if (lens.iso) {
      await drawIcon(ctx, canvas, '/static/icons/iso.png', lensX, lensY - 18, iconSize)
      ctx.fillText(lens.iso, lensX + iconSize + 8, lensY)
      lensX += ctx.measureText(lens.iso).width + iconSize + 40
    }

    const city = props.photo.geoinfo?.city || props.photo.geoinfo?.region || ''
    if (city) {
      await drawIcon(ctx, canvas, '/static/icons/location.png', lensX, lensY - 18, iconSize)
      ctx.fillText(city, lensX + iconSize + 8, lensY)
    }

    const res = await new Promise<CanvasExportResult>((resolve, reject) => {
      uni.canvasToTempFilePath({
        canvas,
        x: 0,
        y: 0,
        width: canvasWidth.value,
        height: totalHeight,
        destWidth: canvasWidth.value * dpr,
        destHeight: totalHeight * dpr,
        fileType: 'png',
        quality: 1,
        success: (r: any) => resolve({ tempFilePath: r.tempFilePath }),
        fail: (err: any) => reject(err),
      } as any)
    })

    generatedImage.value = res.tempFilePath
    emit('generated', res.tempFilePath)
  }
  catch (err) {
    console.error('生成水印图片失败:', err)
    uni.showToast({ title: '生成失败', icon: 'none' })
  }
  finally {
    isGenerating.value = false
  }
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      generateWatermarkedImage()
    }
    else {
      generatedImage.value = ''
    }
  },
)

function handleClose() {
  emit('close')
}

async function handleSave() {
  if (!generatedImage.value)
    return
  emit('save', generatedImage.value)
}
</script>

<template>
  <view
    v-if="visible"
    class="photo-share-generator"
    @click="handleClose"
  >
    <canvas
      id="watermarkCanvas"
      type="2d"
      class="hidden-canvas"
      :style="{
        width: `${canvasWidth}px`,
        height: `${canvasHeight + 120}px`,
      }"
    />

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
          <view
            i-tabler-x
            text-white
            text-xl
          />
        </view>
      </view>

      <view
        v-if="isGenerating"
        class="loading-container"
      >
        <Loading />
        <text class="loading-text">正在生成图片...</text>
      </view>

      <view
        v-else-if="generatedImage"
        class="preview-container"
      >
        <image
          :src="generatedImage"
          class="preview-image"
          mode="widthFix"
        />
      </view>

      <view
        v-if="!isGenerating && generatedImage"
        class="modal-actions"
      >
        <view
          class="action-btn save-btn"
          @click="handleSave"
        >
          <view
            i-tabler-download
            text-white
            text-xl
          />
          <text class="action-text">保存到相册</text>
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

.hidden-canvas {
  position: fixed;
  left: -9999px;
  top: -9999px;
}

.generator-modal {
  width: 90%;
  max-width: 600px;
  max-height: 85vh;
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
  padding: 10px 20px;
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

.loading-text {
  color: white;
  font-size: 16px;
}

.preview-container {
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  max-height: 60vh;
  overflow: hidden;
}

.preview-image {
  width: 100%;
  border-radius: 8px;
  background: #000;
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
</style>
