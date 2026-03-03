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
  close: []
}>()

const instance = getCurrentInstance()

const isGenerating = ref(false)
const generatedImage = ref('')
const canvasWidth = ref(2160)
const canvasHeight = ref(3840)

function formatShutterSpeed(speed: string | number | undefined): string {
  if (!speed || speed === '0')
    return ''
  const num = typeof speed === 'string' ? Number.parseFloat(speed) : speed
  if (Number.isNaN(num) || num <= 0)
    return ''
  // 如果小于1秒，显示为分数形式 1/x
  if (num < 1) {
    const denominator = Math.round(1 / num)
    return `1/${denominator}s`
  }
  // 大于等于1秒，显示为整数或一位小数
  return num % 1 === 0 ? `${Math.round(num)}s` : `${num.toFixed(1)}s`
}

const lensInfo = computed(() => {
  const camera = props.photo.camera
  if (!camera)
    return { focalLength: '', aperture: '', shutterSpeed: '', iso: '' }
  return {
    focalLength: camera.focalLength ? `${camera.focalLength}mm` : '',
    aperture: camera.aperture || '',
    shutterSpeed: formatShutterSpeed(camera.shutterSpeed),
    iso: camera.iso ? `ISO${camera.iso}` : '',
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

    const logoWidth = 160
    const logoHeight = 50
    const qrSize = 80
    const padding = 30
    const watermarkCenterY = canvasHeight.value + 60

    // 准备镜头参数（分为两组）
    const lens = lensInfo.value
    const iconSize = 22
    ctx.font = '18px sans-serif'

    // 第一组：焦距、光圈
    const topRowItems: Array<{ type: string, value: string, width: number }> = []
    // 第二组：快门、ISO、地点（但地点只有在有镜头参数时才显示）
    const bottomRowItems: Array<{ type: string, value: string, width: number }> = []

    if (lens.focalLength) {
      const width = ctx.measureText(lens.focalLength).width + iconSize + 6
      topRowItems.push({ type: 'focalLength', value: lens.focalLength, width })
    }
    if (lens.aperture) {
      const width = ctx.measureText(lens.aperture).width + iconSize + 6
      topRowItems.push({ type: 'aperture', value: lens.aperture, width })
    }
    if (lens.shutterSpeed) {
      const width = ctx.measureText(lens.shutterSpeed).width + iconSize + 6
      bottomRowItems.push({ type: 'shutterSpeed', value: lens.shutterSpeed, width })
    }
    if (lens.iso) {
      const width = ctx.measureText(lens.iso).width + iconSize + 6
      bottomRowItems.push({ type: 'iso', value: lens.iso, width })
    }

    // 地点只有在有镜头参数（焦距或光圈）时才显示
    const hasCameraInfo = topRowItems.length > 0
    const city = props.photo.geoinfo?.city || props.photo.geoinfo?.region || ''
    if (hasCameraInfo && city) {
      const width = ctx.measureText(city).width + iconSize + 6
      bottomRowItems.push({ type: 'city', value: city, width })
    }

    // 计算左侧内容的起始位置
    const leftStartX = padding
    const logoY = watermarkCenterY - logoHeight / 2

    // 绘制 Logo
    try {
      const logoImg = canvas.createImage()
      logoImg.src = props.logo
      await new Promise<void>((resolve) => {
        logoImg.onload = () => resolve()
        logoImg.onerror = () => resolve()
      })
      if (logoImg.complete) {
        ctx.drawImage(logoImg, leftStartX, logoY, logoWidth, logoHeight)
      }
    }
    catch {
      console.error('绘制 logo 失败')
    }

    // 绘制二维码（右侧居中）
    try {
      const qrImg = canvas.createImage()
      qrImg.src = props.qrCode
      await new Promise<void>((resolve) => {
        qrImg.onload = () => resolve()
        qrImg.onerror = () => resolve()
      })
      if (qrImg.complete) {
        ctx.drawImage(qrImg, canvasWidth.value - padding - qrSize, watermarkCenterY - qrSize / 2, qrSize, qrSize)
      }
    }
    catch {
      console.error('绘制二维码失败')
    }

    // 绘制镜头参数（两组上下布局）
    ctx.fillStyle = '#333333'
    ctx.textAlign = 'left'

    const infoStartX = leftStartX + logoWidth + 20
    // 信息栏整体在水印区域垂直居中
    // 水印高度 120px，信息栏总高度约 50px
    // 居中意味着上下留白相等：(120 - 50) / 2 = 35px
    const topRowY = canvasHeight.value + 45
    const bottomRowY = canvasHeight.value + 85

    // 绘制第一行（焦距、光圈）
    let topX = infoStartX
    for (let i = 0; i < topRowItems.length; i++) {
      const item = topRowItems[i]
      const iconPathMap: Record<string, string> = {
        focalLength: '/static/icons/focal-length.png',
        aperture: '/static/icons/aperture.png',
        shutterSpeed: '/static/icons/shutter.png',
        iso: '/static/icons/iso.png',
        city: '/static/icons/location.png',
      }
      await drawIcon(ctx, canvas, iconPathMap[item.type], topX, topRowY - 16, iconSize)
      ctx.fillText(item.value, topX + iconSize + 6, topRowY)
      const spacing = i === topRowItems.length - 1 ? 0 : 10
      topX += item.width + spacing
    }

    // 绘制第二行（快门、ISO、地点）
    let bottomX = infoStartX
    for (let i = 0; i < bottomRowItems.length; i++) {
      const item = bottomRowItems[i]
      const iconPathMap: Record<string, string> = {
        focalLength: '/static/icons/focal-length.png',
        aperture: '/static/icons/aperture.png',
        shutterSpeed: '/static/icons/shutter.png',
        iso: '/static/icons/iso.png',
        city: '/static/icons/location.png',
      }
      await drawIcon(ctx, canvas, iconPathMap[item.type], bottomX, bottomRowY - 16, iconSize)
      ctx.fillText(item.value, bottomX + iconSize + 6, bottomRowY)
      const spacing = i === bottomRowItems.length - 1 ? 0 : 10
      bottomX += item.width + spacing
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
  justify-content: center;
  max-height: 60vh;
  overflow: hidden;
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
