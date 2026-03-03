import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import http from '@/utils/request'
import { logger } from '@/utils/logger'
import type { TaskInfo, UploadTaskStats } from '@/types/common'

export interface UploadingFile {
  id: string
  name: string
  tempFilePath: string
  taskId?: string
  status: 'queued' | 'uploading' | 'processing' | 'completed' | 'error'
  progress: number
  stage?: string
  error?: string
  createdTime?: number
  retryCount: number
}

interface FailedTask {
  taskId: string
  originalFileName: string
  status: string
  stage?: string
  progress?: number
  error?: { message?: string }
  attempts: number
  maxAttempts: number
  createdAt?: string
  updatedAt?: string
}

const MAX_VISIBLE_UPLOADS = 5
const MAX_RETRY_COUNT = 3

function checkNetwork(): Promise<boolean> {
  return new Promise((resolve) => {
    uni.getNetworkType({
      success: (res) => {
        if (res.networkType === 'none') {
          resolve(false)
        }
        else {
          resolve(true)
        }
      },
      fail: () => {
        resolve(false)
      },
    })
  })
}

function showNetworkError() {
  uni.showModal({
    title: '网络异常',
    content: '当前网络不可用，请检查网络连接后重试',
    showCancel: false,
  })
}

export const useUploadQueueStore = defineStore('uploadQueue', () => {
  const uploadingFiles = ref<UploadingFile[]>([])
  const uploadQueue = ref<UploadingFile[]>([])
  const isUploading = ref(false)
  const taskPoller = ref<ReturnType<typeof setInterval> | null>(null)

  const taskStats = ref({
    total: 0,
    completed: 0,
    processing: 0,
    failed: 0,
  })

  const failedTasks = ref<FailedTask[]>([])
  const failedLoading = ref(false)

  const activeUploads = computed(() => uploadingFiles.value.slice(0, MAX_VISIBLE_UPLOADS))
  const queuedCount = computed(() => uploadingFiles.value.filter(f => f.status === 'queued').length)
  const uploadingCount = computed(() => uploadingFiles.value.filter(f => f.status === 'uploading').length)

  function loadTaskStats() {
    http.get<{ pending: number, processing: number, completed: number, failed: number }>('/photos/tasks/stats')
      .then((res) => {
        if (res.data) {
          taskStats.value = {
            total: (res.data.pending || 0) + (res.data.processing || 0) + (res.data.completed || 0) + (res.data.failed || 0),
            completed: res.data.completed || 0,
            processing: res.data.processing || 0,
            failed: res.data.failed || 0,
          }
        }
      })
      .catch((error) => {
        console.error('加载任务统计失败:', error)
      })
  }

  function loadFailedTasks() {
    failedLoading.value = true
    http.get<{ tasks: FailedTask[] }>('/photos/tasks/failed', { page: 1, limit: 50 })
      .then((res) => {
        if (res.data) {
          failedTasks.value = res.data.tasks || []
        }
      })
      .catch((error) => {
        console.error('加载失败任务列表失败:', error)
      })
      .finally(() => {
        failedLoading.value = false
      })
  }

  function startTaskPolling() {
    if (taskPoller.value)
      return

    taskPoller.value = setInterval(async () => {
      const pending = uploadingFiles.value.filter(file => file.taskId && file.status === 'processing')
      if (pending.length === 0) {
        if (taskPoller.value) {
          clearInterval(taskPoller.value)
          taskPoller.value = null
        }
        return
      }

      try {
        const taskIds = pending.map(file => file.taskId)
        const res = await http.post<{ tasks: TaskInfo[] }>('/photos/tasks/batch', { taskIds })
        if (!res.data)
          return

        const tasks = res.data.tasks || []
        const taskMap = new Map(tasks.map((t: TaskInfo) => [t.taskId, t]))

        for (const uploadFile of pending) {
          const task = taskMap.get(uploadFile.taskId)
          if (!task)
            continue

          const { status, stage, progress, error } = task
          uploadFile.status = status === 'completed' ? 'completed' : status === 'failed' ? 'error' : 'processing'
          uploadFile.stage = stage
          uploadFile.progress = Math.max(uploadFile.progress, Math.min(Math.max(progress || 0, 0), 100))

          if (status === 'completed') {
            uploadFile.progress = 100
            uploadFile.createdTime = Date.now()
            loadTaskStats()
            setTimeout(() => {
              const index = uploadingFiles.value.findIndex(f => f.id === uploadFile.id)
              if (index > -1)
                uploadingFiles.value.splice(index, 1)
            }, 3000)
          }
          else if (status === 'failed') {
            uploadFile.error = error?.message || '处理失败'
            uploadFile.createdTime = Date.now()
            loadFailedTasks()
            loadTaskStats()
          }
        }
      }
      catch (error) {
        console.error('轮询任务状态失败:', error)
      }
    }, 1000)
  }

  function uploadSingleFile(uploadFile: UploadingFile): Promise<void> {
    const token = uni.getStorageSync('token') || ''

    return new Promise((resolve, reject) => {
      const uploadTask = uni.uploadFile({
        url: `${http.getBaseURL()}/photos/upload`,
        filePath: uploadFile.tempFilePath,
        name: 'file',
        header: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 15 * 60 * 1000,
        success: (res) => {
          try {
            const data = JSON.parse(res.data)
            if (data.success || data.code === 200 || data.code === 0) {
              uploadFile.taskId = data.data?.taskId || data.data?.task?.taskId
              uploadFile.status = 'processing'
              uploadFile.progress = 0
              uploadFile.retryCount = 0
              startTaskPolling()
              resolve()
            }
            else {
              throw new Error(data.message || '上传失败')
            }
          }
          catch (e: any) {
            uploadFile.status = 'error'
            uploadFile.stage = 'upload'
            uploadFile.error = e.message || '上传失败'
            uploadFile.createdTime = Date.now()
            uni.showToast({ title: `${uploadFile.name}: ${uploadFile.error}`, icon: 'none' })
            reject(e)
          }
        },
        fail: (err) => {
          uploadFile.status = 'error'
          uploadFile.stage = 'upload'
          if (err.errMsg?.includes('timeout')) {
            uploadFile.error = '请求超时，请检查网络后重试'
          }
          else if (err.errMsg?.includes('abort')) {
            uploadFile.error = '上传已取消'
          }
          else if (err.errMsg?.includes('network') || err.errMsg?.includes('fail')) {
            uploadFile.error = '网络连接失败，请检查网络后重试'
          }
          else {
            uploadFile.error = '上传失败，请重试'
          }
          uploadFile.createdTime = Date.now()
          uni.showToast({ title: `${uploadFile.name}: ${uploadFile.error}`, icon: 'none' })
          reject(new Error(uploadFile.error))
        },
      })

      uploadTask.onProgressUpdate((res) => {
        uploadFile.progress = res.progress
      })
    })
  }

  async function processUploadQueue() {
    if (isUploading.value || uploadQueue.value.length === 0)
      return

    const hasNetwork = await checkNetwork()
    if (!hasNetwork) {
      showNetworkError()
      return
    }

    isUploading.value = true
    const uploadFile = uploadQueue.value.shift()!

    try {
      uploadFile.status = 'uploading'
      await uploadSingleFile(uploadFile)
    }
    catch (error) {
      logger.logError('processUploadQueue', error)
    }
    finally {
      isUploading.value = false
      if (uploadQueue.value.length > 0) {
        setTimeout(() => {
          processUploadQueue()
        }, 500)
      }
    }
  }

  async function enqueueFiles(files: { path: string, name: string }[]) {
    const hasNetwork = await checkNetwork()
    if (!hasNetwork) {
      showNetworkError()
      return
    }

    for (const file of files) {
      const uploadFile: UploadingFile = {
        id: `${Date.now()}_${Math.random()}`,
        name: file.name,
        tempFilePath: file.path,
        status: 'queued',
        progress: 0,
        createdTime: Date.now(),
        retryCount: 0,
      }

      uploadingFiles.value.push(uploadFile)
      uploadQueue.value.push(uploadFile)
    }

    if (!isUploading.value) {
      processUploadQueue()
    }
  }

  async function retryFailedTask(taskId: string) {
    const hasNetwork = await checkNetwork()
    if (!hasNetwork) {
      showNetworkError()
      return
    }

    http.post<{ success: boolean, message?: string }>(`/photos/tasks/${taskId}/retry`)
      .then((res) => {
        if (res.data || res.code === 200 || res.code === 0) {
          uni.showToast({ title: '已重试', icon: 'success' })
          loadFailedTasks()
          loadTaskStats()
          startTaskPolling()
        }
        else {
          throw new Error((res as any).message || '重试失败')
        }
      })
      .catch((error: any) => {
        uni.showToast({ title: error.message || '重试失败', icon: 'none' })
      })
  }

  async function retryTaskFromUpload(uploadFile: UploadingFile) {
    if (!uploadFile.taskId)
      return

    if (uploadFile.retryCount >= MAX_RETRY_COUNT) {
      uploadFile.error = `已达到最大重试次数(${MAX_RETRY_COUNT}次)`
      uni.showToast({ title: `已达到最大重试次数`, icon: 'none' })
      return
    }

    const hasNetwork = await checkNetwork()
    if (!hasNetwork) {
      showNetworkError()
      return
    }

    uploadFile.retryCount++

    http.post<{ success: boolean, message?: string }>(`/photos/tasks/${uploadFile.taskId}/retry`)
      .then((res) => {
        if (res.data || res.code === 200 || res.code === 0) {
          uploadFile.status = 'processing'
          uploadFile.progress = 0
          uploadFile.stage = 'upload'
          uploadFile.error = undefined
          uni.showToast({ title: `已重试 (${uploadFile.retryCount}/${MAX_RETRY_COUNT})`, icon: 'success' })
          loadFailedTasks()
          loadTaskStats()
          startTaskPolling()
        }
        else {
          throw new Error((res as any).message || '重试失败')
        }
      })
      .catch((error: any) => {
        uploadFile.error = error.message || '重试失败'
        uni.showToast({ title: error.message || '重试失败', icon: 'none' })
      })
  }

  function clearCompletedFiles() {
    uploadingFiles.value = uploadingFiles.value.filter(f => f.status !== 'completed')
  }

  function clearAllFiles() {
    uploadingFiles.value = []
    uploadQueue.value = []
  }

  return {
    uploadingFiles,
    activeUploads,
    queuedCount,
    uploadingCount,
    taskStats,
    failedTasks,
    failedLoading,
    enqueueFiles,
    loadTaskStats,
    loadFailedTasks,
    retryFailedTask,
    retryTaskFromUpload,
    clearCompletedFiles,
    clearAllFiles,
    MAX_RETRY_COUNT,
  }
})
