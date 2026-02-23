<script setup lang="ts">
import type { PhotoItem } from '@/api'
import { onLoad, onPageScroll } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()

const photos = ref<PhotoItem[]>([])
const currentIndex = ref(0)
const showInfo = ref(false)
const showActions = ref(false)
const imageLoaded = ref<Set<number>>(new Set())
const scale = ref(1)
const lastScale = ref(1)

const statusBarHeight = ref(0)

const currentPhoto = computed(() => photos.value[currentIndex.value])

const progressText = computed(() => `${currentIndex.value + 1} / ${photos.value.length}`)

const formattedDate = computed(() => {
  if (!currentPhoto.value?.dateTaken) return ''
  const date = new Date(currentPhoto.value.dateTaken)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
})

const locationText = computed(() => {
  const geo = currentPhoto.value?.geoinfo
  if (!geo) return ''
  return geo.formatted || `${geo.city || ''} ${geo.region || ''} ${geo.country || ''}`.trim()
})

const cameraInfo = computed(() => {
  const camera = currentPhoto.value?.camera
  if (!camera) return null
  return {
    model: camera.model || camera.make || '',
    lens: camera.lens || '',
    settings: [
      camera.focalLength && `${camera.focalLength}mm`,
      camera.aperture && `f/${camera.aperture}`,
      camera.shutterSpeed && `${camera.shutterSpeed}s`,
      camera.iso && `ISO ${camera.iso}`,
    ].filter(Boolean).join(' · '),
  }
})

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
})

onPageScroll(() => {})

function handleSwiperChange(e: any) {
  currentIndex.value = e.detail.current
  scale.value = 1
}

function handleImageLoad(index: number) {
  imageLoaded.value.add(index)
}

function toggleInfo() {
  showInfo.value = !showInfo.value
  showActions.value = false
}

function toggleActions() {
  showActions.value = !showActions.value
  showInfo.value = false
}

function closePanels() {
  showInfo.value = false
  showActions.value = false
}

function goBack() {
  uni.navigateBack()
}

async function handleShare() {
  if (!currentPhoto.value) return
  
  try {
    const res = await uni.showActionSheet({
      itemList: ['保存图片', '分享给好友'],
    })
    
    if (res.tapIndex === 0) {
      uni.showLoading({ title: '保存中...' })
      const url = currentPhoto.value.originalFileUrl || currentPhoto.value.originalUrl
      const downloadRes = await uni.downloadFile({ url })
      
      if (downloadRes.statusCode === 200) {
        await uni.saveImageToPhotosAlbum({ filePath: downloadRes.tempFilePath })
        uni.showToast({ title: '保存成功', icon: 'success' })
      }
    }
    else if (res.tapIndex === 1) {
      uni.share({
        type: 'image',
        imageUrl: currentPhoto.value.originalFileUrl || currentPhoto.value.originalUrl,
      })
    }
  }
  catch (error: any) {
    if (error.errMsg?.includes('auth deny')) {
      uni.showModal({
        title: '提示',
        content: '需要授权保存图片到相册',
        success: (res) => {
          if (res.confirm) {
            uni.openSetting()
          }
        },
      })
    }
  }
  finally {
    uni.hideLoading()
  }
}

function handleDoubleTap() {
  if (scale.value > 1) {
    scale.value = 1
  }
  else {
    scale.value = 2
  }
}
</script>

<template>
  <view
    class="photo-viewer"
    relative
    w-full
    h-screen
    overflow-hidden
    :style="{ backgroundColor: '#000' }"
    @tap="closePanels"
  >
    <!-- 顶部导航栏 -->
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
      
      <text
        text-white
        text-sm
        font-medium
      >
        {{ progressText }}
      </text>
      
      <view
        flex
        items-center
        gap-4
      >
        <view
          i-tabler-info-circle
          text-xl
          text-white
          @tap.stop="toggleInfo"
        />
        <view
          i-tabler-share
          text-xl
          text-white
          @tap.stop="handleShare"
        />
      </view>
    </view>

    <!-- 图片轮播 -->
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
        :key="photo._id"
        flex
        items-center
        justify-center
      >
        <image
          :src="photo.originalFileUrl || photo.originalUrl"
          mode="aspectFit"
          w-full
          h-full
          :style="{ transform: `scale(${index === currentIndex ? scale : 1})` }"
          @load="handleImageLoad(index)"
          @dblclick="handleDoubleTap"
        />
      </swiper-item>
    </swiper>

    <!-- 底部信息栏 -->
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
      >
        <text
          text-white
          text-base
          font-medium
        >
          {{ currentPhoto.title }}
        </text>
      </view>
      
      <view
        v-if="currentPhoto.description"
        mb-2
      >
        <text
          text-white
          text-sm
          class="opacity-80"
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
      >
        <view
          v-if="formattedDate"
          flex
          items-center
          gap-1
        >
          <view i-tabler-calendar />
          <text>{{ formattedDate }}</text>
        </view>
        
        <view
          v-if="locationText"
          flex
          items-center
          gap-1
        >
          <view i-tabler-map-pin />
          <text>{{ locationText }}</text>
        </view>
      </view>
      
      <!-- 标签 -->
      <view
        v-if="currentPhoto.tags?.length"
        flex
        flex-wrap
        gap-2
        mt-2
      >
        <text
          v-for="tag in currentPhoto.tags"
          :key="tag"
          class="px-2 py-0.5 rounded-full text-xs text-white bg-white/20"
        >
          {{ '#' + tag }}
        </text>
      </view>
    </view>

    <!-- 图片信息面板 -->
    <view
      v-if="showInfo && currentPhoto"
      class="info-panel"
      absolute
      top-0
      right-0
      bottom-0
      w-72
      z-20
      px-4
      py-6
      overflow-y-auto
      :style="{
        backgroundColor: 'rgba(0,0,0,0.9)',
        paddingTop: `${statusBarHeight + 60}px`,
        paddingBottom: 'env(safe-area-inset-bottom, 12px)',
      }"
      @tap.stop
    >
      <text
        text-white
        text-lg
        font-medium
        block
        mb-4
      >
        图片信息
      </text>
      
      <!-- 基本信息 -->
      <view mb-4>
        <text
          text-white
          text-sm
          class="opacity-60"
          block
          mb-2
        >
          基本信息
        </text>
        <view
          v-if="currentPhoto.originalFileName"
          flex
          justify-between
          py-2
          border-b
          class="border-white/10"
        >
          <text
            text-white
            text-xs
            class="opacity-70"
          >
            文件名
          </text>
          <text
            text-white
            text-xs
            max-w-40
            truncate
          >
            {{ currentPhoto.originalFileName }}
          </text>
        </view>
        <view
          flex
          justify-between
          py-2
          border-b
          class="border-white/10"
        >
          <text
            text-white
            text-xs
            class="opacity-70"
          >
            尺寸
          </text>
          <text
            text-white
            text-xs
          >
            {{ currentPhoto.width }} × {{ currentPhoto.height }}
          </text>
        </view>
        <view
          v-if="currentPhoto.views"
          flex
          justify-between
          py-2
          border-b
          class="border-white/10"
        >
          <text
            text-white
            text-xs
            class="opacity-70"
          >
            浏览量
          </text>
          <text
            text-white
            text-xs
          >
            {{ currentPhoto.views }}
          </text>
        </view>
      </view>
      
      <!-- 拍摄信息 -->
      <view
        v-if="cameraInfo"
        mb-4
      >
        <text
          text-white
          text-sm
          class="opacity-60"
          block
          mb-2
        >
          拍摄信息
        </text>
        <view
          v-if="cameraInfo.model"
          flex
          justify-between
          py-2
          border-b
          class="border-white/10"
        >
          <text
            text-white
            text-xs
            class="opacity-70"
          >
            相机
          </text>
          <text
            text-white
            text-xs
          >
            {{ cameraInfo.model }}
          </text>
        </view>
        <view
          v-if="cameraInfo.lens"
          flex
          justify-between
          py-2
          border-b
          class="border-white/10"
        >
          <text
            text-white
            text-xs
            class="opacity-70"
          >
            镜头
          </text>
          <text
            text-white
            text-xs
          >
            {{ cameraInfo.lens }}
          </text>
        </view>
        <view
          v-if="cameraInfo.settings"
          flex
          justify-between
          py-2
          border-b
          class="border-white/10"
        >
          <text
            text-white
            text-xs
            class="opacity-70"
          >
            参数
          </text>
          <text
            text-white
            text-xs
          >
            {{ cameraInfo.settings }}
          </text>
        </view>
      </view>
      
      <!-- 位置信息 -->
      <view
        v-if="locationText"
        mb-4
      >
        <text
          text-white
          text-sm
          class="opacity-60"
          block
          mb-2
        >
          拍摄地点
        </text>
        <view
          flex
          items-start
          gap-2
          py-2
        >
          <view
            i-tabler-map-pin
            text-white
            text-sm
            mt-0.5
          />
          <text
            text-white
            text-xs
            leading-relaxed
          >
            {{ locationText }}
          </text>
        </view>
      </view>
    </view>

    <!-- 关闭信息面板按钮 -->
    <view
      v-if="showInfo"
      absolute
      top-4
      right-76
      z-21
      w-8
      h-8
      flex
      items-center
      justify-center
      rounded-full
      class="bg-black/50"
      :style="{ marginTop: `${statusBarHeight}px` }"
      @tap.stop="toggleInfo"
    >
      <view
        i-tabler-x
        text-white
        text-lg
      />
    </view>
  </view>
</template>

<style scoped>
.photo-viewer {
  touch-action: pan-x pan-y;
}

.swiper {
  touch-action: pan-x pan-y;
}

.info-panel {
  animation: slideIn 0.2s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}
</style>
