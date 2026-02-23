import type { UserInfo } from '@/api'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { authApi } from '@/api'

export const useUserStore = defineStore('user', () => {
  const token = ref<string | null>(uni.getStorageSync('token') || null)
  const userInfo = ref<UserInfo | null>(null)

  const isLoggedIn = computed(() => !!token.value && !!userInfo.value)

  function setToken(newToken: string) {
    token.value = newToken
    uni.setStorageSync('token', newToken)
  }

  function setUserInfo(info: UserInfo) {
    userInfo.value = info
  }

  async function wechatLogin() {
    try {
      const loginRes = await new Promise<UniApp.LoginRes>((resolve, reject) => {
        uni.login({
          success: resolve,
          fail: reject,
        })
      })

      const code = loginRes.code
      if (!code) {
        throw new Error('获取登录code失败')
      }

      let wechatUserInfo: { nickName: string, avatarUrl: string } | undefined

      try {
        const userProfile = await new Promise<UniApp.GetUserProfileRes>((resolve, reject) => {
          uni.getUserProfile({
            desc: '用于完善用户资料',
            success: resolve,
            fail: reject,
          })
        })
        wechatUserInfo = {
          nickName: userProfile.userInfo.nickName,
          avatarUrl: userProfile.userInfo.avatarUrl,
        }
      }
      catch {
        console.warn('用户拒绝授权用户信息')
      }

      const res = await authApi.wechatLogin(code, wechatUserInfo)

      setToken(res.data.token)
      setUserInfo(res.data.user)

      uni.showToast({ title: '登录成功', icon: 'success' })

      return true
    }
    catch (error) {
      console.error('微信登录失败:', error)
      uni.showToast({ title: '登录失败', icon: 'none' })
      return false
    }
  }

  async function fetchUserInfo() {
    if (!token.value)
      return

    try {
      const res = await authApi.getMe()
      setUserInfo(res.data)
    }
    catch (error) {
      console.error('获取用户信息失败:', error)
      logout()
    }
  }

  function logout() {
    token.value = null
    userInfo.value = null
    uni.removeStorageSync('token')
  }

  function init() {
    if (token.value) {
      fetchUserInfo()
    }
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    setToken,
    setUserInfo,
    wechatLogin,
    fetchUserInfo,
    logout,
    init,
  }
})
