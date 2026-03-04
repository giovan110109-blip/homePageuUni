<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { useUserStore } from '@/stores/user'

const themeStore = useThemeStore()
const userStore = useUserStore()
const showNetworkError = ref(false)
const isOnline = ref(true)
let lastScene = ''

function handleQrCodeScene(query: Record<string, any> = {}) {
  const scene = query?.scene
  if (scene && scene !== lastScene) {
    lastScene = scene
    const qrToken = decodeURIComponent(scene)
    if (userStore.isLoggedIn) {
      uni.navigateTo({ url: `/subpackages/auth/qr-auth/index?qrToken=${qrToken}` })
    }
    else {
      uni.navigateTo({ url: `/subpackages/auth/login/index?qrToken=${qrToken}` })
    }
  }
}

onLaunch(async (options) => {
  themeStore.initTheme()
  await userStore.init()
  checkUpdate()
  initNetworkListener()
  handleQrCodeScene(options?.query)
})

function initNetworkListener() {
  uni.onNetworkStatusChange((res) => {
    isOnline.value = res.isConnected
    if (!res.isConnected) {
      showNetworkError.value = true
      uni.showToast({
        title: '网络已断开',
        icon: 'none',
        duration: 2000,
      })
    }
    else {
      showNetworkError.value = false
      uni.showToast({
        title: '网络已恢复',
        icon: 'success',
        duration: 1500,
      })
    }
  })

  uni.getNetworkType({
    success: (res) => {
      isOnline.value = res.networkType !== 'none'
      if (!isOnline.value) {
        showNetworkError.value = true
      }
    },
  })
}

onShow((options) => {
  uni.getNetworkType({
    success: (res) => {
      const wasOffline = !isOnline.value
      isOnline.value = res.networkType !== 'none'
      if (wasOffline && isOnline.value) {
        uni.showToast({
          title: '网络已恢复',
          icon: 'success',
          duration: 1500,
        })
      }
    },
  })
  handleQrCodeScene(options?.query)
})

function checkUpdate() {
  const updateManager = uni.getUpdateManager()
  updateManager.onCheckForUpdate((res) => {
    if (res.hasUpdate) {
      uni.showLoading({ title: '更新中...', mask: true })
    }
  })
  updateManager.onUpdateReady(() => {
    uni.hideLoading()
    uni.showModal({
      title: '更新提示',
      content: '新版本已准备好，是否重启应用？',
      success: (res) => {
        if (res.confirm) {
          updateManager.applyUpdate()
        }
      },
    })
  })
  updateManager.onUpdateFailed(() => {
    uni.hideLoading()
    uni.showModal({
      title: '更新失败',
      content: '新版本下载失败，请删除当前小程序后重新搜索打开',
      showCancel: false,
    })
  })
}
</script>

<style>
page {
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-tertiary: #f1f5f9;
  --bg-card: #ffffff;
  --bg-elevated: #ffffff;
  --text-primary: #0f172a;
  --text-secondary: #334155;
  --text-tertiary: #64748b;
  --text-muted: #94a3b8;
  --text-inverse: #ffffff;
  --border-color: #e2e8f0;
  --border-light: #f1f5f9;
  --border-dark: #cbd5e1;
  --primary: #6366f1;
  --primary-hover: #4f46e5;
  --primary-light: #a5b4fc;
  --secondary: #8b5cf6;
  --secondary-hover: #7c3aed;
  --accent: #06b6d4;
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
}

@media (prefers-color-scheme: dark) {
  page {
    --bg-primary: #0f172a;
    --bg-secondary: #1e293b;
    --bg-tertiary: #334155;
    --bg-card: #1e293b;
    --bg-elevated: #334155;
    --text-primary: #f8fafc;
    --text-secondary: #e2e8f0;
    --text-tertiary: #cbd5e1;
    --text-muted: #64748b;
    --text-inverse: #0f172a;
    --border-color: #334155;
    --border-light: #1e293b;
    --border-dark: #475569;
    --primary: #818cf8;
    --primary-hover: #a5b4fc;
    --primary-light: #6366f1;
    --secondary: #a78bfa;
    --secondary-hover: #c4b5fd;
    --accent: #22d3ee;
    --success: #34d399;
    --warning: #fbbf24;
    --error: #f87171;
  }
}
</style>
