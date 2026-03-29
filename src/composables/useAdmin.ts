import type { PhotoItem } from '@/api'
import { computed, ref } from 'vue'
import { adminPhotoApi } from '@/api'
import { useUploadQueueStore } from '@/stores/uploadQueue'
import { logger } from '@/utils/logger'
import http from '@/utils/request'

export function useAdminPhotos() {
  const photos = ref<PhotoItem[]>([])
  const loading = ref(false)
  const page = ref(1)
  const pageSize = 20
  const total = ref(0)
  const hasMore = ref(true)

  const photoCount = computed(() => photos.value.length)

  async function loadPhotos(reset = false): Promise<void> {
    if (reset) {
      page.value = 1
      photos.value = []
      hasMore.value = true
    }

    if (loading.value || !hasMore.value)
      return

    loading.value = true
    try {
      const res = await adminPhotoApi.getPhotos(page.value, pageSize)

      const newPhotos = res.data?.photos || []
      if (reset) {
        photos.value = newPhotos
      }
      else {
        photos.value.push(...newPhotos)
      }

      total.value = res.data?.pagination?.total || 0
      hasMore.value = photos.value.length < total.value

      if (newPhotos.length > 0) {
        page.value++
      }
    }
    catch (error) {
      logger.logError('loadPhotos', error)
    }
    finally {
      loading.value = false
    }
  }

  async function deletePhoto(photoId: string): Promise<boolean> {
    try {
      await adminPhotoApi.deletePhoto(photoId)
      photos.value = photos.value.filter(p => p._id !== photoId)
      total.value = Math.max(0, total.value - 1)
      return true
    }
    catch (error) {
      logger.logError('deletePhoto', error)
      return false
    }
  }

  async function batchDeletePhotos(photoIds: string[]): Promise<boolean> {
    try {
      await adminPhotoApi.batchDeletePhotos(photoIds)
      photos.value = photos.value.filter(p => !photoIds.includes(p._id))
      total.value = Math.max(0, total.value - photoIds.length)
      return true
    }
    catch (error) {
      logger.logError('batchDeletePhotos', error)
      return false
    }
  }

  async function updatePhotoVisibility(photoId: string, visibility: string): Promise<boolean> {
    try {
      await adminPhotoApi.updatePhoto(photoId, { visibility })
      const index = photos.value.findIndex(p => p._id === photoId)
      if (index > -1) {
        photos.value[index] = { ...photos.value[index], visibility }
      }
      return true
    }
    catch (error) {
      logger.logError('updatePhotoVisibility', error)
      return false
    }
  }

  return {
    photos,
    loading,
    page,
    total,
    hasMore,
    photoCount,
    loadPhotos,
    deletePhoto,
    batchDeletePhotos,
    updatePhotoVisibility,
  }
}

export function useAdminUpload() {
  const uploadQueueStore = useUploadQueueStore()

  const {
    taskStats,
    failedTasks,
    queuedCount,
    uploadingCount,
    uploadingFiles,
    MAX_RETRY_COUNT,
  } = uploadQueueStore

  const isUploading = computed(() => uploadingCount.value > 0)

  function handleFileSelect(): void {
    uni.chooseImage({
      count: 9,
      sizeType: ['original'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFiles = Array.isArray(res.tempFiles) ? res.tempFiles : [res.tempFiles]
        const files = tempFiles
          .map((file) => {
            const rawPath = 'path' in file
              ? file.path
              : 'tempFilePath' in file
                ? file.tempFilePath
                : ''
            const path = typeof rawPath === 'string' ? rawPath : ''

            if (!path)
              return null

            return {
              path,
              name: path.split('/').pop() || 'photo.jpg',
            }
          })
          .filter((file): file is { path: string, name: string } => file !== null)

        uploadQueueStore.enqueueFiles(files)
      },
      fail: (err) => {
        if (!err.errMsg?.includes('cancel')) {
          logger.logError('chooseImage', err)
        }
      },
    })
  }

  function retryFailedTask(taskId: string): void {
    uploadQueueStore.retryFailedTask(taskId)
  }

  function clearCompletedUploads(): void {
    uploadQueueStore.clearCompletedFiles()
  }

  return {
    taskStats,
    failedTasks,
    queuedCount,
    uploadingCount,
    uploadingFiles,
    maxRetryCount: MAX_RETRY_COUNT,
    isUploading,
    handleFileSelect,
    retryFailedTask,
    clearCompletedUploads,
  }
}

export function useAdminStats() {
  const stats = ref({
    totalPhotos: 0,
    totalMessages: 0,
    totalViews: 0,
  })
  const loading = ref(false)

  async function loadStats(): Promise<void> {
    loading.value = true
    try {
      const [photosRes, messagesRes] = await Promise.all([
        http.get<{ pagination: { total: number } }>('/photos', { page: 1, limit: 1 }),
        http.get<{ meta: { total: number } }>('/messages', { page: 1, pageSize: 1 }),
      ])

      stats.value = {
        totalPhotos: photosRes.data?.pagination?.total || 0,
        totalMessages: messagesRes.data?.meta?.total || 0,
        totalViews: 0,
      }
    }
    catch (error) {
      logger.logError('loadStats', error)
    }
    finally {
      loading.value = false
    }
  }

  return {
    stats,
    loading,
    loadStats,
  }
}
