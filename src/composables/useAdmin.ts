import { computed, ref } from 'vue'
import { useUploadQueueStore } from '@/stores/uploadQueue'
import { logger } from '@/utils/logger'
import http from '@/utils/request'
import type { PhotoItem } from '@/api'

export function useAdminPhotos() {
  const uploadQueueStore = useUploadQueueStore()

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

    if (loading.value || !hasMore.value) return

    loading.value = true
    try {
      const res = await http.get<{ photos: PhotoItem[], pagination: { total: number } }>('/photos', {
        page: page.value,
        limit: pageSize,
      })

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
      await http.delete(`/photos/${photoId}`)
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
      await http.post('/photos/batch-delete', { ids: photoIds })
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
      await http.put(`/photos/${photoId}`, { visibility })
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
        const files = res.tempFiles.map(file => ({
          path: file.path,
          name: file.path.split('/').pop() || 'photo.jpg',
        }))
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
    uploadQueueStore.clearCompleted()
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
