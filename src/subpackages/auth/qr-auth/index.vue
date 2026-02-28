<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { authApi } from '@/api'
import { useThemeStore } from '@/stores/theme'
import { useUserStore } from '@/stores/user'

const themeStore = useThemeStore()
const userStore = useUserStore()

const qrToken = ref('')
const loading = ref(true)
const status = ref<'loading' | 'confirm' | 'success' | 'error'>('loading')
const errorMessage = ref('')

async function handleScan() {
  if (!qrToken.value) {
    status.value = 'error'
    errorMessage.value = '无效的二维码'
    loading.value = false
    return
  }

  if (!userStore.isLoggedIn) {
    loading.value = false
    uni.setStorageSync('qrToken', qrToken.value)
    uni.redirectTo({ url: '/subpackages/auth/login/index?redirect=/subpackages/auth/qr-auth/index' })
    return
  }

  try {
    await authApi.scanQrLogin(qrToken.value)
    status.value = 'confirm'
  }
  catch {
    status.value = 'error'
    errorMessage.value = '二维码已过期或无效'
  }
  finally {
    loading.value = false
  }
}

async function handleConfirm() {
  loading.value = true
  try {
    await authApi.confirmQrLogin(qrToken.value)
    status.value = 'success'
    setTimeout(() => {
      uni.switchTab({ url: '/pages/index' })
    }, 2000)
  }
  catch {
    status.value = 'error'
    errorMessage.value = '授权失败，请重试'
  }
  finally {
    loading.value = false
  }
}

function handleCancel() {
  uni.switchTab({ url: '/pages/index' })
}

onLoad((options) => {
  qrToken.value = options?.qrToken || decodeURIComponent(options?.scene || '')
  handleScan()
})
</script>

<template>
  <view
    relative
    min-h-screen
    flex
    flex-col
    items-center
    justify-center
    px-8
    :style="{ backgroundColor: themeStore.colors.bgPrimary }"
  >
    <view
      v-if="loading"
      flex
      flex-col
      items-center
    >
      <view
        i-tabler-loader-2
        text-4xl
        animate-spin
        :style="{ color: themeStore.colors.primary }"
      />
      <text
        mt-4
        text-sm
        :style="{ color: themeStore.colors.textSecondary }"
      >
        正在验证...
      </text>
    </view>

    <view
      v-else-if="status === 'confirm'"
      w-full
      max-w-300px
      flex
      flex-col
      items-center
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
        text-xl
        font-bold
        mb-2
        :style="{ color: themeStore.colors.textPrimary }"
      >
        登录确认
      </text>

      <text
        text-sm
        mb-6
        text-center
        :style="{ color: themeStore.colors.textSecondary }"
      >
        是否授权登录 PC 端？
      </text>

      <view
        w-full
        p-4
        rounded-xl
        mb-6
        :style="{ backgroundColor: themeStore.colors.bgCard }"
      >
        <view
          flex
          items-center
          mb-3
        >
          <image
            v-if="userStore.userInfo?.avatar"
            :src="userStore.userInfo.avatar"
            w-10
            h-10
            rounded-full
            mode="aspectFill"
          />
          <view
            v-else
            w-10
            h-10
            rounded-full
            flex-center
            :style="{ backgroundColor: themeStore.colors.primary }"
          >
            <text text-white text-lg>{{ userStore.userInfo?.nickname?.charAt(0) || 'U' }}</text>
          </view>
          <view ml-3>
            <text
              text-base
              font-medium
              :style="{ color: themeStore.colors.textPrimary }"
            >
              {{ userStore.userInfo?.nickname || '用户' }}
            </text>
            <text
              block
              text-xs
              :style="{ color: themeStore.colors.textTertiary }"
            >
              {{ userStore.userInfo?.role === 'admin' ? '管理员' : '普通用户' }}
            </text>
          </view>
        </view>
      </view>

      <view
        w-full
        flex
        gap-3
      >
        <view
          flex-1
          h-12
          rounded-xl
          flex-center
          cursor-pointer
          active:scale-98
          :style="{
            backgroundColor: themeStore.colors.bgCard,
            border: `1px solid ${themeStore.colors.border}`,
          }"
          @click="handleCancel"
        >
          <text
            text-base
            :style="{ color: themeStore.colors.textSecondary }"
          >
            取消
          </text>
        </view>

        <view
          flex-1
          h-12
          rounded-xl
          flex-center
          cursor-pointer
          active:scale-98
          :style="{
            background: `linear-gradient(135deg, ${themeStore.colors.primary}, ${themeStore.colors.secondary})`,
            boxShadow: `0 4px 15px ${themeStore.colors.primary}40`,
          }"
          @click="handleConfirm"
        >
          <text
            text-base
            font-medium
            text-white
          >
            确认登录
          </text>
        </view>
      </view>
    </view>

    <view
      v-else-if="status === 'success'"
      flex
      flex-col
      items-center
    >
      <view
        w-16
        h-16
        rounded-full
        flex-center
        mb-4
        :style="{ backgroundColor: themeStore.colors.success }"
      >
        <view
          i-tabler-check
          text-3xl
          text-white
        />
      </view>
      <text
        text-xl
        font-bold
        mb-2
        :style="{ color: themeStore.colors.textPrimary }"
      >
        授权成功
      </text>
      <text
        text-sm
        :style="{ color: themeStore.colors.textSecondary }"
      >
        请在 PC 端完成操作
      </text>
    </view>

    <view
      v-else-if="status === 'error'"
      flex
      flex-col
      items-center
    >
      <view
        w-16
        h-16
        rounded-full
        flex-center
        mb-4
        :style="{ backgroundColor: themeStore.colors.error }"
      >
        <view
          i-tabler-x
          text-3xl
          text-white
        />
      </view>
      <text
        text-xl
        font-bold
        mb-2
        :style="{ color: themeStore.colors.textPrimary }"
      >
        授权失败
      </text>
      <text
        text-sm
        mb-6
        :style="{ color: themeStore.colors.textSecondary }"
      >
        {{ errorMessage }}
      </text>
      <view
        px-6
        h-10
        rounded-lg
        flex-center
        cursor-pointer
        :style="{ backgroundColor: themeStore.colors.primary }"
        @click="handleCancel"
      >
        <text
          text-sm
          text-white
        >
          返回首页
        </text>
      </view>
    </view>
  </view>
</template>
