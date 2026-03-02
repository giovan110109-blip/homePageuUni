import type { UserInfo } from '@/api'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { authApi } from '@/api'

export const useUserStore = defineStore('user', () => {
  const token = ref<string | null>(uni.getStorageSync('token') || null)
  const userInfo = ref<UserInfo | null>(null)

  const isLoggedIn = computed(() => !!token.value && !!userInfo.value)

  const isAdmin = computed(() => {
    if (!userInfo.value?.roles)
      return false
    return userInfo.value.roles.some(role => role.code === 'admin')
  })

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
      }

      const res = await authApi.wechatLogin(code, wechatUserInfo)

      setToken(res.data.token)
      setUserInfo(res.data.user)

      uni.showToast({ title: '登录成功', icon: 'success' })

      return true
    }
    catch (error: any) {
      const message = error?.data?.message || error?.message || ''
      const code = error?.data?.code || error?.code
      if (message.includes('绑定') || message.includes('未注册') || message.includes('不存在') || code === 400 || code === 401) {
        logout()
        uni.showModal({
          title: '需要绑定账号',
          content: '您的微信还未绑定账号，请使用"绑定已有账号"功能进行绑定',
          confirmText: '去绑定',
          showCancel: false,
          success: (modalRes) => {
            if (modalRes.confirm) {
              uni.navigateTo({ url: '/subpackages/auth/login/index?mode=bind' })
            }
          },
        })
      }
      else {
        uni.showToast({ title: message || '登录失败', icon: 'none' })
      }
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
    catch {
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
    isAdmin,
    setToken,
    setUserInfo,
    wechatLogin,
    fetchUserInfo,
    logout,
    init,
  }
})
