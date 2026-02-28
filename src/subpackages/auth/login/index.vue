<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { authApi } from '@/api'
import { useThemeStore } from '@/stores/theme'
import { useUserStore } from '@/stores/user'

const themeStore = useThemeStore()
const userStore = useUserStore()

const loading = ref(false)
const redirect = ref('')
const loginMode = ref<'wechat' | 'bind'>('wechat')

const username = ref('')
const password = ref('')

async function handleWechatLogin() {
  loading.value = true
  try {
    const success = await userStore.wechatLogin()
    if (success) {
      const qrToken = uni.getStorageSync('qrToken')
      if (qrToken) {
        uni.removeStorageSync('qrToken')
        uni.redirectTo({ url: `/subpackages/auth/qr-auth/index?qrToken=${qrToken}` })
        return
      }
      setTimeout(() => {
        if (redirect.value) {
          uni.redirectTo({ url: redirect.value })
        }
        else {
          uni.navigateBack()
        }
      }, 1000)
    }
  }
  finally {
    loading.value = false
  }
}

async function handleBindAccount() {
  if (!username.value.trim()) {
    uni.showToast({ title: '请输入用户名', icon: 'none' })
    return
  }
  if (!password.value) {
    uni.showToast({ title: '请输入密码', icon: 'none' })
    return
  }

  loading.value = true
  try {
    const loginRes = await new Promise<UniApp.LoginRes>((resolve, reject) => {
      uni.login({
        success: resolve,
        fail: reject,
      })
    })

    const code = loginRes.code
    if (!code) {
      uni.showToast({ title: '获取微信授权失败', icon: 'none' })
      return
    }

    const res = await authApi.bindAccount(username.value.trim(), password.value, code)

    userStore.setToken(res.data.token)
    userStore.setUserInfo(res.data.user)

    uni.showToast({ title: '绑定成功', icon: 'success' })

    const qrToken = uni.getStorageSync('qrToken')
    if (qrToken) {
      uni.removeStorageSync('qrToken')
      setTimeout(() => {
        uni.redirectTo({ url: `/subpackages/auth/qr-auth/index?qrToken=${qrToken}` })
      }, 1000)
      return
    }

    setTimeout(() => {
      if (redirect.value) {
        uni.redirectTo({ url: redirect.value })
      }
      else {
        uni.navigateBack()
      }
    }, 1000)
  }
  catch {
    uni.showToast({ title: '绑定失败，请检查账号密码', icon: 'none' })
  }
  finally {
    loading.value = false
  }
}

function goBack() {
  uni.navigateBack()
}

onLoad((options) => {
  redirect.value = options?.redirect || ''
})
</script>

<template>
  <view
    relative
    min-h-screen
    flex
    flex-col
    :style="{ backgroundColor: themeStore.colors.bgPrimary }"
  >
    <view
      absolute
      top-0
      left-0
      right-0
      h="1/2"
      z-0
      :style="{
        background: `linear-gradient(180deg, ${themeStore.colors.accent}30 0%, ${themeStore.colors.accent}10 50%, transparent 100%)`,
      }"
    />

    <view
      relative
      z-1
      flex
      flex-col
      items-center
      justify-center
      flex-1
      px-8
    >
      <view
        w-20
        h-20
        rounded-full
        mb-6
        overflow-hidden
        :style="{
          boxShadow: `0 4px 20px ${themeStore.colors.primary}40`,
        }"
      >
        <image
          src="/static/logo.png"
          w-full
          h-full
          mode="aspectFill"
        />
      </view>

      <text
        text-2xl
        font-bold
        mb-2
        :style="{ color: themeStore.colors.textPrimary }"
      >
        {{ loginMode === 'wechat' ? '微信登录' : '绑定账号' }}
      </text>

      <text
        text-sm
        mb-8
        :style="{ color: themeStore.colors.textTertiary }"
      >
        {{ loginMode === 'wechat' ? '登录后可同步您的数据' : '绑定已有账号到微信' }}
      </text>

      <view
        w-full
        max-w-300px
      >
        <template v-if="loginMode === 'wechat'">
          <view
            w-full
            h-12
            rounded-xl
            flex-center
            cursor-pointer
            active:scale-98
            :style="{
              background: `linear-gradient(135deg, #07c160, #06ad56)`,
              boxShadow: '0 4px 15px rgba(7, 193, 96, 0.3)',
            }"
            :class="{ 'opacity-60': loading }"
            @click="handleWechatLogin"
          >
            <view
              v-if="loading"
              i-tabler-loader-2
              text-xl
              text-white
              animate-spin
            />
            <template v-else>
              <view
                i-tabler-brand-wechat
                text-xl
                text-white
                mr-2
              />
              <text
                text-base
                font-medium
                text-white
              >
                微信一键登录
              </text>
            </template>
          </view>

          <view
            flex
            items-center
            justify-center
            my-4
          >
            <view
              flex-1
              h-px
              :style="{ backgroundColor: themeStore.colors.border }"
            />
            <text
              px-3
              text-xs
              :style="{ color: themeStore.colors.textTertiary }"
            >
              或
            </text>
            <view
              flex-1
              h-px
              :style="{ backgroundColor: themeStore.colors.border }"
            />
          </view>

          <view
            w-full
            h-12
            rounded-xl
            flex-center
            cursor-pointer
            active:scale-98
            :style="{
              backgroundColor: themeStore.colors.bgCard,
              border: `1px solid ${themeStore.colors.border}`,
            }"
            @click="loginMode = 'bind'"
          >
            <view
              i-tabler-link
              text-lg
              mr-2
              :style="{ color: themeStore.colors.primary }"
            />
            <text
              text-base
              :style="{ color: themeStore.colors.textSecondary }"
            >
              绑定已有账号
            </text>
          </view>
        </template>

        <template v-else>
          <view
            mb-4
          >
            <text
              text-xs
              mb-2
              block
              :style="{ color: themeStore.colors.textSecondary }"
            >
              用户名
            </text>
            <input
              v-model="username"
              type="text"
              placeholder="请输入用户名"
              h-12
              px-4
              rounded-xl
              :style="{
                backgroundColor: themeStore.colors.bgCard,
                border: `1px solid ${themeStore.colors.border}`,
                color: themeStore.colors.textPrimary,
              }"
            />
          </view>

          <view
            mb-6
          >
            <text
              text-xs
              mb-2
              block
              :style="{ color: themeStore.colors.textSecondary }"
            >
              密码
            </text>
            <input
              v-model="password"
              type="password"
              placeholder="请输入密码"
              h-12
              px-4
              rounded-xl
              :style="{
                backgroundColor: themeStore.colors.bgCard,
                border: `1px solid ${themeStore.colors.border}`,
                color: themeStore.colors.textPrimary,
              }"
            />
          </view>

          <view
            w-full
            h-12
            rounded-xl
            flex-center
            cursor-pointer
            active:scale-98
            :style="{
              background: `linear-gradient(135deg, ${themeStore.colors.primary}, ${themeStore.colors.secondary})`,
              boxShadow: `0 4px 15px ${themeStore.colors.primary}40`,
            }"
            :class="{ 'opacity-60': loading }"
            @click="handleBindAccount"
          >
            <view
              v-if="loading"
              i-tabler-loader-2
              text-xl
              text-white
              animate-spin
            />
            <text
              v-else
              text-base
              font-medium
              text-white
            >
              确认绑定
            </text>
          </view>

          <view
            w-full
            h-12
            mt-4
            rounded-xl
            flex-center
            cursor-pointer
            active:scale-98
            :style="{
              backgroundColor: themeStore.colors.bgCard,
              border: `1px solid ${themeStore.colors.border}`,
            }"
            @click="loginMode = 'wechat'"
          >
            <text
              text-base
              :style="{ color: themeStore.colors.textSecondary }"
            >
              返回微信登录
            </text>
          </view>
        </template>

        <view
          w-full
          h-12
          mt-4
          rounded-xl
          flex-center
          cursor-pointer
          active:scale-98
          :style="{
            backgroundColor: 'transparent',
          }"
          @click="goBack"
        >
          <text
            text-base
            :style="{ color: themeStore.colors.textTertiary }"
          >
            暂不登录
          </text>
        </view>
      </view>

      <view
        mt-8
        px-6
        text-center
      >
        <text
          text-xs
          :style="{ color: themeStore.colors.textTertiary }"
        >
          登录即表示同意用户协议和隐私政策
        </text>
      </view>
    </view>
  </view>
</template>
