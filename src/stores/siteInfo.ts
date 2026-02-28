import type { SiteInfo } from '@/api'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { siteInfoApi } from '@/api'

const CACHE_KEY = 'site_info_cache'
const CACHE_EXPIRY = 1000 * 60 * 60

interface CachedSiteInfo {
  data: SiteInfo
  timestamp: number
}

export const useSiteInfoStore = defineStore('siteInfo', () => {
  const siteInfo = ref<SiteInfo | null>(null)
  const loading = ref(false)

  async function fetchSiteInfo(forceRefresh = false) {
    if (!forceRefresh && siteInfo.value) {
      return siteInfo.value
    }

    if (!forceRefresh) {
      const cached = uni.getStorageSync(CACHE_KEY) as CachedSiteInfo | null
      if (cached && cached.data && Date.now() - cached.timestamp < CACHE_EXPIRY) {
        siteInfo.value = cached.data
        return cached.data
      }
    }

    loading.value = true
    try {
      const res = await siteInfoApi.getSiteInfo()
      siteInfo.value = res.data

      const cacheData: CachedSiteInfo = {
        data: res.data,
        timestamp: Date.now(),
      }
      uni.setStorageSync(CACHE_KEY, cacheData)

      return res.data
    }
    finally {
      loading.value = false
    }
  }

  function clearCache() {
    uni.removeStorageSync(CACHE_KEY)
    siteInfo.value = null
  }

  return {
    siteInfo,
    loading,
    fetchSiteInfo,
    clearCache,
  }
})
