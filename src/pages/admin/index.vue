<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { onMounted, reactive, ref, watch } from 'vue'
import { adminPhotoApi } from '@/api'
import { useUploadQueueStore } from '@/stores/uploadQueue'
import { useUserStore } from '@/stores/user'
import { formatDate, formatFileSize } from '@/utils/format'

const userStore = useUserStore()
const uploadQueueStore = useUploadQueueStore()

const {
  taskStats,
  failedTasks,
  queuedCount,
  uploadingCount,
  uploadingFiles,
} = storeToRefs(uploadQueueStore)

const { isAdmin } = storeToRefs(userStore)

const maxRetryCount = uploadQueueStore.MAX_RETRY_COUNT

const activeTab = ref<'upload' | 'photos'>('upload')

const photoTableData = ref<any[]>([])
const photoLoading = ref(false)
const photoPagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

const selectedPhotos = ref<any[]>([])

const mobileUploadProgress = ref(0)

onLoad(() => {
  if (!userStore.isLoggedIn || !isAdmin.value) {
    uni.showToast({ title: '无权访问', icon: 'none' })
    uni.redirectTo({ url: '/pages/index' })
  }
})

onMounted(() => {
  uploadQueueStore.loadTaskStats()
  uploadQueueStore.loadFailedTasks()
})

watch(
  () => uploadingFiles.value.length,
  (current, previous) => {
    if (previous > 0 && current === 0) {
      mobileUploadProgress.value = 0
      loadPhotos()
      uni.showToast({ title: '上传完成，已刷新列表', icon: 'success' })
    }
  },
)

watch(
  uploadingFiles,
  (files) => {
    if (!files || files.length === 0) {
      mobileUploadProgress.value = 0
      return
    }

    const total = files.length || 1
    const sum = files.reduce((acc, file) => {
      if (file.status === 'completed')
        return acc + 100
      if (file.status === 'processing')
        return acc + Math.max(file.progress || 0, 80)
      if (file.status === 'uploading')
        return acc + (file.progress || 0)
      return acc + 0
    }, 0)

    const avg = Math.min(99, Math.round(sum / total))
    mobileUploadProgress.value = Math.max(mobileUploadProgress.value, avg)
  },
  { deep: true },
)

function handleSelectImages() {
  uni.chooseImage({
    count: 9,
    sizeType: ['original'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      const paths = Array.isArray(res.tempFilePaths) ? res.tempFilePaths : [res.tempFilePaths]
      const files = paths.map((path: string) => ({
        path,
        name: path.split('/').pop() || `图片${Date.now()}`,
      }))
      uploadQueueStore.enqueueFiles(files)
    },
  })
}

function handleClearQueue() {
  uploadQueueStore.clearAllFiles()
}

function handleRemoveItem(id: string) {
  const index = uploadingFiles.value.findIndex(item => item.id === id)
  if (index > -1) {
    uploadingFiles.value.splice(index, 1)
  }
}

function handleRetryItem(item: any) {
  if (item.taskId) {
    uploadQueueStore.retryTaskFromUpload(item)
  }
}

function goBack() {
  uni.navigateBack()
}

function handleLogout() {
  userStore.logout()
  uni.showToast({ title: '已退出登录', icon: 'success' })
  uni.reLaunch({ url: '/pages/index' })
}

function handleClearCache() {
  uni.showModal({
    title: '清空缓存',
    content: '确定要清空所有缓存数据吗？这将退出登录。',
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
        uni.clearStorage()
        uni.showToast({ title: '缓存已清空', icon: 'success' })
        uni.reLaunch({ url: '/pages/index' })
      }
    },
  })
}

async function loadPhotos() {
  photoLoading.value = true
  try {
    const res = await adminPhotoApi.getPhotos(photoPagination.page, photoPagination.pageSize)
    if (res.data) {
      photoTableData.value = res.data.photos || []
      photoPagination.total = res.data.pagination?.total || 0
    }
  }
  catch (error: any) {
    uni.showToast({ title: error?.message || '加载图片失败', icon: 'none' })
  }
  finally {
    photoLoading.value = false
  }
}

async function deletePhoto(row: any) {
  uni.showModal({
    title: '删除图片',
    content: `确认删除图片"${row.title || row.originalFileName || '未命名'}"吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await adminPhotoApi.deletePhoto(row._id)
          uni.showToast({ title: '删除成功', icon: 'success' })
          await loadPhotos()
        }
        catch (error: any) {
          uni.showToast({ title: error?.message || '删除失败', icon: 'none' })
        }
      }
    },
  })
}

async function batchDeletePhotos() {
  if (selectedPhotos.value.length === 0) {
    uni.showToast({ title: '请先选择要删除的图片', icon: 'none' })
    return
  }

  uni.showModal({
    title: '批量删除图片',
    content: `确认删除选中的 ${selectedPhotos.value.length} 张图片吗？此操作不可恢复。`,
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '删除中...' })
        try {
          const ids = selectedPhotos.value.map(photo => photo._id)
          await adminPhotoApi.batchDeletePhotos(ids)
          uni.hideLoading()
          uni.showToast({ title: `成功删除 ${selectedPhotos.value.length} 张图片`, icon: 'success' })
          selectedPhotos.value = []
          await loadPhotos()
        }
        catch (error: any) {
          uni.hideLoading()
          uni.showToast({ title: error?.message || '批量删除失败', icon: 'none' })
        }
      }
    },
  })
}

async function setVisibility(row: any, visibility: string) {
  try {
    await adminPhotoApi.updatePhoto(row._id, { visibility })
    uni.showToast({ title: '更新成功', icon: 'success' })
    await loadPhotos()
  }
  catch (error: any) {
    uni.showToast({ title: error?.message || '更新失败', icon: 'none' })
  }
}

async function handleChooseLocation(photo: any) {
  try {
    const res = await new Promise<UniApp.ChooseLocationSuccess>((resolve, reject) => {
      uni.chooseLocation({
        success: resolve,
        fail: reject,
      })
    })

    await adminPhotoApi.updatePhotoLocation(photo._id, {
      latitude: res.latitude,
      longitude: res.longitude,
    })
    uni.showToast({ title: '位置已更新', icon: 'success' })
    await loadPhotos()
  }
  catch (error: any) {
    if (error.errMsg?.includes('cancel')) {
      return
    }
    uni.showToast({ title: error?.message || '选择位置失败', icon: 'none' })
  }
}

watch(activeTab, (newTab) => {
  if (newTab === 'photos' && photoTableData.value.length === 0) {
    loadPhotos()
  }
})

function getPhotoImageUrl(photo: any) {
  return photo.originalUrl
}
</script>

<template>
  <view class="admin-page">
    <view class="header">
      <view class="back-btn" @click="goBack">
        <view i-tabler-chevron-left text-xl text-white />
      </view>
      <text class="header-title">管理后台</text>
      <view class="header-right" />
    </view>

    <view class="content">
      <view class="user-info">
        <image
          v-if="userStore.userInfo?.avatar"
          :src="userStore.userInfo.avatar"
          class="user-avatar"
          mode="aspectFill"
        />
        <view class="user-details">
          <text class="user-name">{{ userStore.userInfo?.nickname || '用户' }}</text>
          <text class="user-role">管理员</text>
        </view>
      </view>

      <view class="tabs">
        <view
          class="tab-item"
          :class="{ active: activeTab === 'upload' }"
          @click="activeTab = 'upload'"
        >
          <text>上传</text>
        </view>
        <view
          class="tab-item"
          :class="{ active: activeTab === 'photos' }"
          @click="activeTab = 'photos'"
        >
          <text>图片管理</text>
        </view>
      </view>

      <view v-if="activeTab === 'upload'" class="section">
        <view class="section-header">
          <text class="section-title">画廊上传</text>
          <text class="section-desc">仅限管理员上传图片到画廊</text>
        </view>

        <view class="admin-notice">
          <view i-tabler-shield-check text-lg text-primary />
          <text class="notice-text">此功能仅限管理员使用，用于管理个人作品展示</text>
        </view>

        <view class="upload-area">
          <view class="upload-btn" @click="handleSelectImages">
            <view i-tabler-photo-plus text-3xl text-primary />
            <text class="upload-btn-text">选择图片</text>
            <text class="upload-btn-hint">最多选择9张 · 失败最多重试{{ maxRetryCount }}次</text>
          </view>
        </view>

        <view v-if="uploadingFiles.length > 0" class="queue-section">
          <view class="queue-header">
            <text class="queue-title">上传队列 ({{ uploadingFiles.length }})</text>
            <view class="queue-actions">
              <view class="action-btn clear-btn" @click="handleClearQueue">
                <text>清空</text>
              </view>
            </view>
          </view>

          <view class="progress-summary">
            <view class="progress-item">
              <text class="progress-label">队列</text>
              <text class="progress-value">{{ queuedCount }}</text>
            </view>
            <view class="progress-item uploading">
              <text class="progress-label">上传</text>
              <text class="progress-value">{{ uploadingCount }}</text>
            </view>
            <view class="progress-item processing">
              <text class="progress-label">处理</text>
              <text class="progress-value">{{ taskStats.processing }}</text>
            </view>
            <view class="progress-item success">
              <text class="progress-label">完成</text>
              <text class="progress-value">{{ taskStats.completed }}</text>
            </view>
            <view class="progress-item error">
              <text class="progress-label">失败</text>
              <text class="progress-value">{{ taskStats.failed }}</text>
            </view>
          </view>

          <view class="queue-list">
            <view v-for="item in uploadingFiles" :key="item.id" class="queue-item">
              <view class="item-info">
                <view i-tabler-photo text-lg text-gray />
                <text class="item-name">{{ item.name }}</text>
              </view>
              <view class="item-status">
                <view v-if="item.status === 'queued'" class="status-badge pending">
                  <text>等待中</text>
                </view>
                <view v-else-if="item.status === 'uploading'" class="status-badge uploading">
                  <view class="progress-bar">
                    <view class="progress-fill" :style="{ width: `${item.progress}%` }" />
                  </view>
                  <text>{{ item.progress }}%</text>
                </view>
                <view v-else-if="item.status === 'processing'" class="status-badge processing">
                  <text>处理中 {{ item.progress }}%</text>
                </view>
                <view v-else-if="item.status === 'completed'" class="status-badge success">
                  <view i-tabler-check text-sm />
                  <text>成功</text>
                </view>
                <view v-else-if="item.status === 'error'" class="status-badge error">
                  <view i-tabler-x text-sm />
                  <text>{{ item.error || '失败' }}</text>
                </view>
                <view
                  v-if="item.status === 'queued' || item.status === 'error'"
                  class="remove-btn"
                  @click="handleRemoveItem(item.id)"
                >
                  <view i-tabler-trash text-sm />
                </view>
                <view
                  v-if="item.status === 'error' && item.taskId"
                  class="retry-btn"
                  @click="handleRetryItem(item)"
                >
                  <view i-tabler-refresh text-sm />
                </view>
              </view>
            </view>
          </view>
        </view>

        <view v-if="failedTasks.length > 0" class="failed-section">
          <view class="section-header">
            <text class="section-title">失败任务</text>
            <view class="action-btn refresh-btn" @click="uploadQueueStore.loadFailedTasks">
              <text>刷新</text>
            </view>
          </view>
          <view class="failed-list">
            <view v-for="task in failedTasks" :key="task.taskId" class="failed-item">
              <view class="failed-info">
                <text class="failed-name">{{ task.originalFileName }}</text>
                <text class="failed-error">{{ task.error?.message || '处理失败' }}</text>
              </view>
              <view class="action-btn retry-btn" @click="uploadQueueStore.retryFailedTask(task.taskId)">
                <text>重试</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view v-else-if="activeTab === 'photos'" class="section">
        <view class="section-header">
          <text class="section-title">图片列表</text>
          <view class="section-actions">
            <view
              v-if="selectedPhotos.length > 0"
              class="action-btn danger-btn"
              @click="batchDeletePhotos"
            >
              <text>批量删除 ({{ selectedPhotos.length }})</text>
            </view>
            <view class="action-btn refresh-btn" @click="loadPhotos">
              <text>刷新</text>
            </view>
          </view>
        </view>

        <view v-if="photoLoading" class="loading-container">
          <text>加载中...</text>
        </view>

        <view v-else-if="photoTableData.length === 0" class="empty-container">
          <text>暂无图片</text>
        </view>

        <view v-else class="photo-list">
          <view v-for="photo in photoTableData" :key="photo._id" class="photo-item">
            <image
              :src="getPhotoImageUrl(photo)"
              class="photo-thumb"
              mode="aspectFill"
            />
            <view class="photo-info">
              <text class="photo-title">{{ photo.title || photo.originalFileName }}</text>
              <text class="photo-meta">{{ photo.width }}×{{ photo.height }} · {{ formatFileSize(photo.fileSize) }}</text>
              <text v-if="photo.geoinfo || photo.location" class="photo-location">
                <view i-tabler-map-pin text-xs />
                {{ photo.geoinfo?.city }}
              </text>
              <text class="photo-date">{{ formatDate(photo.createdAt) }}</text>
            </view>
            <view class="photo-actions">
              <view
                class="action-btn icon-btn"
                :class="{ 'has-location': photo.geoinfo?.formatted }"
                @click="handleChooseLocation(photo)"
              >
                <view i-tabler-map-pin text-base />
              </view>
              <view
                class="action-btn small"
                @click="setVisibility(photo, photo.visibility === 'public' ? 'private' : 'public')"
              >
                <text>{{ photo.visibility === 'public' ? '私密' : '可见' }}</text>
              </view>
              <view class="action-btn small danger-btn" @click="deletePhoto(photo)">
                <text>删除</text>
              </view>
            </view>
          </view>
        </view>

        <view v-if="photoPagination.total > photoPagination.pageSize" class="pagination">
          <view
            class="page-btn"
            :class="{ disabled: photoPagination.page <= 1 }"
            @click="photoPagination.page > 1 && (photoPagination.page--, loadPhotos())"
          >
            <text>上一页</text>
          </view>
          <text class="page-info">{{ photoPagination.page }} / {{ Math.ceil(photoPagination.total / photoPagination.pageSize) }}</text>
          <view
            class="page-btn"
            :class="{ disabled: photoPagination.page >= Math.ceil(photoPagination.total / photoPagination.pageSize) }"
            @click="photoPagination.page < Math.ceil(photoPagination.total / photoPagination.pageSize) && (photoPagination.page++, loadPhotos())"
          >
            <text>下一页</text>
          </view>
        </view>
      </view>

      <view class="actions-section">
        <view class="action-item" @click="handleLogout">
          <view i-tabler-logout text-xl text-gray />
          <text class="action-text">退出登录</text>
          <view i-tabler-chevron-right text-lg text-gray />
        </view>
        <view class="action-item" @click="handleClearCache">
          <view i-tabler-trash text-xl text-gray />
          <text class="action-text">清空缓存</text>
          <view i-tabler-chevron-right text-lg text-gray />
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.admin-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  padding-top: 60px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
}

.back-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-title {
  color: white;
  font-size: 18px;
  font-weight: 600;
}

.header-right {
  width: 40px;
}

.content {
  padding: 20px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: white;
  border-radius: 16px;
  margin-bottom: 20px;
}

.user-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-name {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.user-role {
  font-size: 14px;
  color: #6366f1;
}

.tabs {
  display: flex;
  background: white;
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 20px;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  color: #6b7280;
  transition: all 0.2s;
}

.tab-item.active {
  background: #6366f1;
  color: white;
}

.section {
  background: white;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.section-desc {
  font-size: 14px;
  color: #9ca3af;
  margin-top: 4px;
}

.section-actions {
  display: flex;
  gap: 8px;
}

.admin-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f0f9ff;
  border-radius: 12px;
  margin-bottom: 16px;
  border: 1px solid #bae6fd;
}

.notice-text {
  font-size: 13px;
  color: #0369a1;
}

.upload-area {
  margin-bottom: 20px;
}

.upload-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
  border: 2px dashed #e5e7eb;
  border-radius: 16px;
  background: #f9fafb;
}

.upload-btn-text {
  font-size: 16px;
  font-weight: 500;
  color: #374151;
}

.upload-btn-hint {
  font-size: 12px;
  color: #9ca3af;
}

.queue-section {
  border-top: 1px solid #e5e7eb;
  padding-top: 20px;
}

.queue-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.queue-title {
  font-size: 16px;
  font-weight: 500;
  color: #374151;
}

.queue-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  background: #f3f4f6;
  color: #6b7280;
}

.action-btn.small {
  padding: 6px 12px;
  font-size: 12px;
}

.refresh-btn {
  background: #6366f1;
  color: white;
}

.danger-btn {
  background: #ef4444;
  color: white;
}

.icon-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #f3f4f6;
  color: #9ca3af;
}

.icon-btn.has-location {
  background: #d1fae5;
  color: #10b981;
}

.icon-btn:active {
  transform: scale(0.95);
}

.progress-summary {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 12px;
}

.progress-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.progress-label {
  font-size: 11px;
  color: #9ca3af;
}

.progress-value {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
}

.progress-item.uploading .progress-value {
  color: #3b82f6;
}

.progress-item.processing .progress-value {
  color: #f59e0b;
}

.progress-item.success .progress-value {
  color: #10b981;
}

.progress-item.error .progress-value {
  color: #ef4444;
}

.queue-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.queue-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: #f9fafb;
  border-radius: 12px;
}

.item-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 14px;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
}

.status-badge.pending {
  background: #fef3c7;
  color: #d97706;
}

.status-badge.uploading {
  background: #dbeafe;
  color: #3b82f6;
  flex-direction: column;
  gap: 8px;
  min-width: 100px;
}

.status-badge.processing {
  background: #fef3c7;
  color: #f59e0b;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #3b82f6;
  border-radius: 2px;
  transition: width 0.2s;
}

.status-badge.success {
  background: #d1fae5;
  color: #10b981;
}

.status-badge.error {
  background: #fee2e2;
  color: #ef4444;
}

.remove-btn,
.retry-btn {
  padding: 4px;
  color: #9ca3af;
}

.failed-section {
  border-top: 1px solid #e5e7eb;
  padding-top: 20px;
  margin-top: 20px;
}

.failed-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.failed-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: #fef2f2;
  border-radius: 12px;
  border: 1px solid #fecaca;
}

.failed-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.failed-name {
  font-size: 14px;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.failed-error {
  font-size: 12px;
  color: #ef4444;
}

.loading-container,
.empty-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #9ca3af;
}

.photo-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.photo-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 12px;
}

.photo-thumb {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  object-fit: cover;
}

.photo-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.photo-title {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.photo-meta,
.photo-date {
  font-size: 12px;
  color: #9ca3af;
}

.photo-location {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #10b981;
  margin-top: 2px;
}

.photo-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

.page-btn {
  padding: 8px 16px;
  border-radius: 8px;
  background: #6366f1;
  color: white;
  font-size: 14px;
}

.page-btn.disabled {
  background: #e5e7eb;
  color: #9ca3af;
}

.page-info {
  font-size: 14px;
  color: #6b7280;
}

.actions-section {
  background: white;
  border-radius: 16px;
  overflow: hidden;
}

.action-item {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f3f4f6;
}

.action-item:last-child {
  border-bottom: none;
}

.action-text {
  flex: 1;
  margin-left: 12px;
  font-size: 16px;
  color: #374151;
}
</style>
