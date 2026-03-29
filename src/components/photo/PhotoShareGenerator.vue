<script setup lang="ts">
import type { PhotoItem } from '@/api'
import { getCurrentInstance, nextTick, ref, watch } from 'vue'
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
  close: []
}>()

const instance = getCurrentInstance()

const isGenerating = ref(false)
const generatedImage = ref('')
const canvasWidth = ref(2160)
const canvasHeight = ref(3840)

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

async function generateWatermarkedImage() {
  isGenerating.value = true

  try {
    const downloadRes = await new Promise<DownloadResult>((resolve, reject) => {
      uni.downloadFile({
        url: props.photo.originalFileUrl as any,
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

    // 底部水印区域高度
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

    // 透明背景
    ctx.clearRect(0, 0, canvasWidth.value, totalHeight)

    const img = canvas.createImage()
    img.src = tempFilePath
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('图片加载失败'))
    })
    ctx.drawImage(img, 0, 0, canvasWidth.value, canvasHeight.value)

    // 绘制白色背景
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, canvasHeight.value, canvasWidth.value, watermarkHeight)

    // 尺寸设置：左侧小，中间和右侧大
    const leftLogoHeight = 50
    const centerLogoHeight = 80
    const qrSize = 100
    const padding = 30

    // 辅助函数：计算等比例缩放后的尺寸
    function calculateLogoSize(imgWidth: number, imgHeight: number, maxHeight: number) {
      const ratio = imgWidth / imgHeight
      const height = maxHeight
      const width = height * ratio
      return { width, height }
    }

    // 绘制左侧 Logo (使用 logo.png)
    try {
      const logoImg = canvas.createImage()
      logoImg.src = '/static/logo.png'
      await new Promise<void>((resolve) => {
        logoImg.onload = () => resolve()
        logoImg.onerror = () => resolve()
      })
      if (logoImg.complete) {
        const size = calculateLogoSize(logoImg.width, logoImg.height, leftLogoHeight)
        const leftLogoX = padding
        const leftLogoY = canvasHeight.value + (watermarkHeight - size.height) / 2
        ctx.drawImage(logoImg, leftLogoX, leftLogoY, size.width, size.height)
      }
    }
    catch {
      console.error('绘制左侧 logo 失败')
    }

    // 绘制中间 Logo
    try {
      const logoImg = canvas.createImage()
      logoImg.src = props.logo
      await new Promise<void>((resolve) => {
        logoImg.onload = () => resolve()
        logoImg.onerror = () => resolve()
      })
      if (logoImg.complete) {
        const size = calculateLogoSize(logoImg.width, logoImg.height, centerLogoHeight)
        const centerLogoX = (canvasWidth.value - size.width) / 2
        const centerLogoY = canvasHeight.value + (watermarkHeight - size.height) / 2
        ctx.drawImage(logoImg, centerLogoX, centerLogoY, size.width, size.height)
      }
    }
    catch {
      console.error('绘制中间 logo 失败')
    }

    // 绘制二维码
    try {
      const qrImg = canvas.createImage()
      qrImg.src = props.qrCode
      await new Promise<void>((resolve) => {
        qrImg.onload = () => resolve()
        qrImg.onerror = () => resolve()
      })
      if (qrImg.complete) {
        const qrX = canvasWidth.value - padding - qrSize
        const qrY = canvasHeight.value + (watermarkHeight - qrSize) / 2
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize)
      }
    }
    catch {
      console.error('绘制二维码失败')
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

function handlePreviewImage() {
  if (!generatedImage.value)
    return
  uni.previewImage({
    urls: [generatedImage.value],
    current: generatedImage.value,
  })
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
        height: `${canvasHeight + 100}px`,
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
          @longpress="handlePreviewImage"
        />
        <text class="long-press-hint">长按图片可保存到相册</text>
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
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  max-height: calc(85vh - 60px);
  overflow-y: auto;
  flex: 1;
}

.preview-image {
  width: 100%;
  border-radius: 8px;
  background: #000;
}

.long-press-hint {
  margin-top: 12px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}
</style>
