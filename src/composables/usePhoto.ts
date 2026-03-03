import type { PhotoItem } from '@/api'
import { computed, ref } from 'vue'
import { logger } from '@/utils/logger'

export function usePhotoDownload() {
  const downloadedImages = ref<Record<string, string>>({})
  const downloadingProgress = ref<Record<string, { loaded: number, total: number }>>({})
  const downloadTasks = ref<Record<string, UniApp.DownloadTask>>({})

  function getOptimizedImageUrl(photo: PhotoItem): string | undefined {
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

  function downloadImage(photo: PhotoItem): void {
    const photoId = photo._id
    if (!photoId) return

    if (downloadedImages.value[photoId] || downloadingProgress.value[photoId]) {
      return
    }

    const url = getOptimizedImageUrl(photo)
    if (!url) return

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
      fail: (error) => {
        logger.logError('downloadImage', error)
        delete downloadingProgress.value[photoId]
        delete downloadTasks.value[photoId]
      },
    })

    downloadTasks.value[photoId] = downloadTask

    downloadTask.onProgressUpdate((res) => {
      downloadingProgress.value[photoId] = {
        loaded: res.totalBytesWritten,
        total: res.totalBytesExpectedToWrite,
      }
    })
  }

  function cancelDownload(photoId: string): void {
    const task = downloadTasks.value[photoId]
    if (task) {
      task.abort()
      delete downloadTasks.value[photoId]
      delete downloadingProgress.value[photoId]
    }
  }

  function cancelAllDownloads(): void {
    Object.values(downloadTasks.value).forEach((task) => {
      task.abort()
    })
    downloadTasks.value = {}
    downloadingProgress.value = {}
  }

  function getDownloadProgress(photoId: string) {
    return downloadingProgress.value[photoId]
  }

  function isDownloading(photoId: string): boolean {
    return downloadingProgress.value[photoId] !== undefined
  }

  function getDownloadedImage(photoId: string): string | undefined {
    return downloadedImages.value[photoId]
  }

  return {
    downloadedImages,
    downloadingProgress,
    downloadTasks,
    downloadImage,
    cancelDownload,
    cancelAllDownloads,
    getDownloadProgress,
    isDownloading,
    getDownloadedImage,
    getOptimizedImageUrl,
  }
}

export function useLivePhoto() {
  const localVideoPath = ref('')
  const isVideoDownloading = ref(false)
  const videoCanPlay = ref(false)

  function getCacheKey(photoId: string): string {
    return `live_video_${photoId}`
  }

  async function preloadVideo(photo: PhotoItem): Promise<void> {
    if (!photo?.videoUrl || localVideoPath.value || videoCanPlay.value) {
      return
    }

    const cacheKey = getCacheKey(photo._id)
    const cachedPath = uni.getStorageSync(cacheKey)
    if (cachedPath) {
      logger.debug('Using cached video:', cachedPath)
      localVideoPath.value = cachedPath
      videoCanPlay.value = true
      return
    }

    logger.debug('Downloading video:', photo.videoUrl)
    isVideoDownloading.value = true

    uni.downloadFile({
      url: photo.videoUrl,
      success: async (res) => {
        if (res.statusCode === 200) {
          logger.debug('Video downloaded:', res.tempFilePath)
          try {
            const saveRes = await uni.saveFile({ tempFilePath: res.tempFilePath })
            localVideoPath.value = saveRes.savedFilePath
            uni.setStorageSync(cacheKey, saveRes.savedFilePath)
            logger.debug('Video saved:', saveRes.savedFilePath)
          }
          catch {
            localVideoPath.value = res.tempFilePath
          }
          videoCanPlay.value = true
        }
      },
      fail: (err) => {
        logger.logError('preloadVideo', err)
      },
      complete: () => {
        isVideoDownloading.value = false
      },
    })
  }

  function resetVideo(): void {
    localVideoPath.value = ''
    isVideoDownloading.value = false
    videoCanPlay.value = false
  }

  return {
    localVideoPath,
    isVideoDownloading,
    videoCanPlay,
    preloadVideo,
    resetVideo,
    getCacheKey,
  }
}

export function usePhotoInfo(photo: { value: PhotoItem | null }) {
  const formattedDate = computed(() => {
    if (!photo.value?.dateTaken) return ''
    const date = new Date(photo.value.dateTaken)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  })

  const locationText = computed(() => {
    const geo = photo.value?.geoinfo
    if (!geo) return ''
    return geo.formatted || `${geo.city || ''} ${geo.region || ''} ${geo.country || ''}`.trim()
  })

  const cameraInfo = computed(() => {
    const camera = photo.value?.camera
    if (!camera) return null
    return {
      model: camera.model || camera.make || '',
      lens: camera.lens || '',
      settings: [
        camera.focalLength && `${camera.focalLength}mm`,
        camera.aperture && `f/${camera.aperture}`,
        camera.shutterSpeed && camera.shutterSpeed,
        camera.iso && `ISO ${camera.iso}`,
      ].filter(Boolean).join(' · '),
    }
  })

  return {
    formattedDate,
    locationText,
    cameraInfo,
  }
}
