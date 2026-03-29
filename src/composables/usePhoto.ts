import type { PhotoItem } from '@/api'
import { computed, ref } from 'vue'
import { logger } from '@/utils/logger'

interface LivePhotoSource {
  _id?: string
  videoUrl?: string
}

interface LivePhotoPreloadOptions {
  force?: boolean
}

interface LiveVideoCacheEntry {
  photoId: string
  savedFilePath: string
  updatedAt: number
}

interface DownloadFileResult {
  statusCode: number
  tempFilePath: string
}

const LIVE_VIDEO_CACHE_INDEX_KEY = 'live_video_cache_index'
const LIVE_VIDEO_CACHE_LIMIT = 12
const MAX_CONCURRENT_LIVE_VIDEO_DOWNLOADS = 2

let activeLiveVideoDownloads = 0
const queuedLiveVideoDownloads: Array<() => void> = []
const pendingLiveVideoDownloads = new Map<string, Promise<string>>()

function getLiveVideoCacheKey(photoId: string): string {
  return `live_video_${photoId}`
}

function getLiveVideoCacheIndex(): LiveVideoCacheEntry[] {
  try {
    const index = uni.getStorageSync(LIVE_VIDEO_CACHE_INDEX_KEY)
    return Array.isArray(index) ? index : []
  }
  catch (error) {
    logger.logError('getLiveVideoCacheIndex', error)
    return []
  }
}

function setLiveVideoCacheIndex(entries: LiveVideoCacheEntry[]): void {
  try {
    uni.setStorageSync(LIVE_VIDEO_CACHE_INDEX_KEY, entries)
  }
  catch (error) {
    logger.logError('setLiveVideoCacheIndex', error)
  }
}

async function removeSavedVideoFile(filePath?: string): Promise<void> {
  if (!filePath)
    return

  try {
    await uni.removeSavedFile({ filePath })
  }
  catch (error) {
    logger.warn('[LivePhoto] remove saved video failed', filePath, error)
  }
}

async function pruneLiveVideoCache(limit = LIVE_VIDEO_CACHE_LIMIT): Promise<void> {
  const index = getLiveVideoCacheIndex()
  if (index.length <= limit)
    return

  const sortedEntries = [...index].sort((a, b) => b.updatedAt - a.updatedAt)
  const keepEntries = sortedEntries.slice(0, limit)
  const removeEntries = sortedEntries.slice(limit)

  for (const entry of removeEntries) {
    await removeSavedVideoFile(entry.savedFilePath)
    try {
      uni.removeStorageSync(getLiveVideoCacheKey(entry.photoId))
    }
    catch (error) {
      logger.logError('removeLiveVideoCacheKey', error)
    }
  }

  setLiveVideoCacheIndex(keepEntries)
}

async function trackLiveVideoCache(photoId: string, savedFilePath: string): Promise<void> {
  const nextEntries = [
    {
      photoId,
      savedFilePath,
      updatedAt: Date.now(),
    },
    ...getLiveVideoCacheIndex().filter(entry => entry.photoId !== photoId && entry.savedFilePath !== savedFilePath),
  ]

  setLiveVideoCacheIndex(nextEntries)
  await pruneLiveVideoCache()
}

async function persistLiveVideo(photoId: string, tempFilePath: string): Promise<string> {
  try {
    const saveRes = await uni.saveFile({ tempFilePath })
    uni.setStorageSync(getLiveVideoCacheKey(photoId), saveRes.savedFilePath)
    await trackLiveVideoCache(photoId, saveRes.savedFilePath)
    return saveRes.savedFilePath
  }
  catch (error) {
    await pruneLiveVideoCache(Math.max(0, LIVE_VIDEO_CACHE_LIMIT - 1))

    const saveRes = await uni.saveFile({ tempFilePath })
    uni.setStorageSync(getLiveVideoCacheKey(photoId), saveRes.savedFilePath)
    await trackLiveVideoCache(photoId, saveRes.savedFilePath)

    logger.warn('[LivePhoto] save video retried after cache prune', photoId, error)
    return saveRes.savedFilePath
  }
}

function getCachedLiveVideoPath(photoId: string): string {
  try {
    const cachedPath = uni.getStorageSync(getLiveVideoCacheKey(photoId))
    return typeof cachedPath === 'string' ? cachedPath : ''
  }
  catch (error) {
    logger.logError('getCachedLiveVideoPath', error)
    return ''
  }
}

async function withLiveVideoQueue<T>(task: () => Promise<T>): Promise<T> {
  return await new Promise<T>((resolve, reject) => {
    const runTask = () => {
      activeLiveVideoDownloads++
      task()
        .then(resolve)
        .catch(reject)
        .finally(() => {
          activeLiveVideoDownloads = Math.max(0, activeLiveVideoDownloads - 1)
          const nextTask = queuedLiveVideoDownloads.shift()
          nextTask?.()
        })
    }

    if (activeLiveVideoDownloads < MAX_CONCURRENT_LIVE_VIDEO_DOWNLOADS) {
      runTask()
      return
    }

    queuedLiveVideoDownloads.push(runTask)
  })
}

async function downloadLiveVideo(photoId: string, videoUrl: string): Promise<string> {
  const pendingKey = `${photoId}:${videoUrl}`
  const pendingTask = pendingLiveVideoDownloads.get(pendingKey)
  if (pendingTask) {
    return pendingTask
  }

  const downloadTask = withLiveVideoQueue(async () => {
    logger.debug('[LivePhoto] start download', photoId)

    const downloadRes = await new Promise<DownloadFileResult>((resolve, reject) => {
      uni.downloadFile({
        url: videoUrl,
        success: (res) => {
          resolve({
            statusCode: res.statusCode,
            tempFilePath: res.tempFilePath,
          })
        },
        fail: reject,
      })
    })

    if (downloadRes.statusCode !== 200) {
      throw new Error(`实况视频下载失败(${downloadRes.statusCode})`)
    }

    try {
      return await persistLiveVideo(photoId, downloadRes.tempFilePath)
    }
    catch (error) {
      logger.warn('[LivePhoto] fallback to temp file', photoId, error)
      return downloadRes.tempFilePath
    }
  })

  pendingLiveVideoDownloads.set(pendingKey, downloadTask)

  try {
    return await downloadTask
  }
  finally {
    pendingLiveVideoDownloads.delete(pendingKey)
  }
}

export async function invalidateLiveVideoCache(photoId: string, filePath?: string): Promise<void> {
  try {
    uni.removeStorageSync(getLiveVideoCacheKey(photoId))
  }
  catch (error) {
    logger.logError('invalidateLiveVideoCache', error)
  }

  const nextEntries = getLiveVideoCacheIndex().filter(entry => entry.photoId !== photoId)
  setLiveVideoCacheIndex(nextEntries)
  await removeSavedVideoFile(filePath)
}

export async function ensureLiveVideoFile(
  source: LivePhotoSource,
  options: LivePhotoPreloadOptions = {},
): Promise<string> {
  const photoId = source._id
  const videoUrl = source.videoUrl

  if (!photoId || !videoUrl) {
    throw new Error('缺少实况视频信息')
  }

  if (!options.force) {
    const cachedPath = getCachedLiveVideoPath(photoId)
    if (cachedPath) {
      await trackLiveVideoCache(photoId, cachedPath)
      return cachedPath
    }
  }

  return await downloadLiveVideo(photoId, videoUrl)
}

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
    if (!photoId)
      return

    if (downloadedImages.value[photoId] || downloadingProgress.value[photoId]) {
      return
    }

    const url = getOptimizedImageUrl(photo)
    if (!url)
      return

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
  const videoLoadError = ref('')
  const currentPhotoId = ref('')
  const requestId = ref(0)

  function getCacheKey(photoId: string): string {
    return getLiveVideoCacheKey(photoId)
  }

  async function preloadVideo(
    photo: LivePhotoSource,
    options: LivePhotoPreloadOptions = {},
  ): Promise<void> {
    if (!photo?._id || !photo.videoUrl) {
      return
    }

    const samePhoto = currentPhotoId.value === photo._id
    if (!options.force && samePhoto && (localVideoPath.value || isVideoDownloading.value || videoCanPlay.value)) {
      return
    }

    currentPhotoId.value = photo._id
    const currentRequestId = ++requestId.value

    isVideoDownloading.value = true
    videoLoadError.value = ''

    if (options.force) {
      localVideoPath.value = ''
      videoCanPlay.value = false
    }

    try {
      const videoPath = await ensureLiveVideoFile(photo, options)

      if (currentRequestId !== requestId.value || currentPhotoId.value !== photo._id) {
        return
      }

      localVideoPath.value = videoPath
      videoCanPlay.value = true
    }
    catch (error) {
      if (currentRequestId !== requestId.value || currentPhotoId.value !== photo._id) {
        return
      }

      localVideoPath.value = ''
      videoCanPlay.value = false
      videoLoadError.value = error instanceof Error ? error.message : '实况加载失败'
      logger.logError('preloadVideo', error)
    }
    finally {
      if (currentRequestId === requestId.value && currentPhotoId.value === photo._id) {
        isVideoDownloading.value = false
      }
    }
  }

  async function retryVideo(photo: LivePhotoSource): Promise<void> {
    if (!photo?._id || !photo.videoUrl) {
      return
    }

    await preloadVideo(photo, { force: true })
  }

  async function handlePlaybackError(photo: LivePhotoSource): Promise<void> {
    if (!photo?._id) {
      return
    }

    await invalidateLiveVideoCache(photo._id, localVideoPath.value)
    localVideoPath.value = ''
    videoCanPlay.value = false
    videoLoadError.value = '实况播放失败，请重试'
  }

  function resetVideo(): void {
    requestId.value++
    currentPhotoId.value = ''
    localVideoPath.value = ''
    isVideoDownloading.value = false
    videoCanPlay.value = false
    videoLoadError.value = ''
  }

  return {
    localVideoPath,
    isVideoDownloading,
    videoCanPlay,
    videoLoadError,
    preloadVideo,
    retryVideo,
    handlePlaybackError,
    resetVideo,
    getCacheKey,
  }
}

export function usePhotoInfo(photo: { value: PhotoItem | null }) {
  const formattedDate = computed(() => {
    if (!photo.value?.dateTaken)
      return ''
    const date = new Date(photo.value.dateTaken)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  })

  const locationText = computed(() => {
    const geo = photo.value?.geoinfo
    if (!geo)
      return ''
    return geo.formatted || `${geo.city || ''} ${geo.region || ''} ${geo.country || ''}`.trim()
  })

  const cameraInfo = computed(() => {
    const camera = photo.value?.camera
    if (!camera)
      return null
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
