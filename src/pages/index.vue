<script setup lang="ts">
import type { SiteInfo } from '@/api'
import { onLoad, onPageScroll, onShareAppMessage, onShow } from '@dcloudio/uni-app'
import { onMounted, ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import CustomTabBar from '@/components/CustomTabBar.vue'
import { useScrollStore } from '@/stores/scroll'
import { useSiteInfoStore } from '@/stores/siteInfo'
import { useThemeStore } from '@/stores/theme'
import { useUserStore } from '@/stores/user'

const themeStore = useThemeStore()
const scrollStore = useScrollStore()
const userStore = useUserStore()
const siteInfoStore = useSiteInfoStore()

const avatarLoaded = ref(false)
const textVisible = ref(false)
const siteInfo = ref<SiteInfo | null>(null)
const loading = ref(true)

const particles = ref<Array<{ x: number, y: number, size: number, speedX: number, speedY: number, opacity: number }>>([])

const skillsList = [
  // 前端框架
  { name: 'Vue', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vuejs/vuejs-original.svg' },
  { name: 'TypeScript', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg' },
  { name: 'JavaScript', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg' },
  // 样式/CSS
  { name: 'CSS3', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg' },
  { name: 'HTML5', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg' },
  { name: 'SCSS', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/sass/sass-original.svg' },
  { name: 'TailwindCSS', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tailwindcss/tailwindcss-original.svg' },
  // 构建工具
  { name: 'Webpack', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/webpack/webpack-original.svg' },
  { name: 'Vite', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vitejs/vitejs-original.svg' },
  // 后端框架
  { name: 'Node.js', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg' },
  { name: 'Express', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/express/express-original.svg' },
  // 数据库
  { name: 'MongoDB', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg' },
  { name: 'MySQL', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg' },
  // 版本控制/部署
  { name: 'Git', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/git/git-original.svg' },
  { name: 'GitHub', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg' },
  { name: 'Docker', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg' },
  { name: 'Nginx', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nginx/nginx-original.svg' },
  { name: 'Linux', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/linux/linux-original.svg' },
  { name: 'Jenkins', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/jenkins/jenkins-original.svg' },
  // 其他工具
  { name: 'VS Code', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vscode/vscode-original.svg' },
]

async function fetchSiteInfo() {
  try {
    const data = await siteInfoStore.fetchSiteInfo()
    siteInfo.value = data
  }
  catch {
  }
  finally {
    loading.value = false
  }
}

onLoad((options) => {
  if (options?.scene) {
    const qrToken = decodeURIComponent(options.scene)
    uni.navigateTo({ url: `/subpackages/auth/qr-auth/index?qrToken=${qrToken}` })
  }
})

onShow(() => {
  const query = uni.createSelectorQuery()
  query.selectViewport().scrollOffset((res: any) => {
    const scrollTop = res?.scrollTop || 0
    scrollStore.setScrolled(scrollTop > 10)
  })
  query.exec()
})

onPageScroll((e) => {
  scrollStore.setScrolled(e.scrollTop > 10)
})

function handleAvatarClick() {
  if (userStore.isLoggedIn) {
    uni.navigateTo({ url: '/pages/admin/index' })
  }
  else {
    uni.navigateTo({ url: '/subpackages/auth/login/index' })
  }
}

function copyToClipboard(text: string, label: string) {
  uni.setClipboardData({
    data: text,
    success: () => {
      uni.showToast({ title: `${label}已复制`, icon: 'success' })
    },
  })
}

onMounted(() => {
  fetchSiteInfo()
  for (let i = 0; i < 15; i++) {
    particles.value.push({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      speedX: (Math.random() - 0.5) * 0.3,
      speedY: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.5 + 0.2,
    })
  }

  setTimeout(() => {
    avatarLoaded.value = true
  }, 300)
  setTimeout(() => {
    textVisible.value = true
  }, 600)
})

onShareAppMessage(() => {
  return {
    title: siteInfo.value?.title || '个人主页',
    path: '/pages/index',
    imageUrl: siteInfo.value?.avatar || '',
  }
})
</script>

<template>
  <view
    relative
    min-h-screen
    :style="{
      color: themeStore.colors.textPrimary,
    }"
  >
    <view
      absolute
      top-0
      left-0
      right-0
      bottom-0
      z-0
      bg-gradient-to-br
      from-indigo-100
      via-purple-50
      to-pink-100
    />

    <view absolute top-0 left-0 right-0 bottom-0 z-0 overflow-hidden>
      <view
        v-for="(particle, index) in particles"
        :key="index"
        absolute
        rounded-full
        particle-item
        :style="{
          left: `${particle.x}%`,
          top: `${particle.y}%`,
          width: `${particle.size}px`,
          height: `${particle.size}px`,
          opacity: particle.opacity,
          animationDelay: `${index * 0.15}s`,
        }"
      />
    </view>

    <view
      absolute
      top-0
      left-0
      right-0
      bottom-0
      z--1
      :style="{ backgroundColor: themeStore.colors.bgPrimary }"
    />

    <AppHeader title="主页" />

    <view
      relative
      z-1
      flex
      flex-col
      items-center
      px-6
      pt-20
      pb-24
    >
      <view
        relative
        mb-6
        overflow-visible
        :class="avatarLoaded ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-50 translate-y-5'"
        :style="{ transition: avatarLoaded ? 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none' }"
        @click="handleAvatarClick"
      >
        <view class="avatar-ring ring-1" />
        <view class="avatar-ring ring-2" />
        <view
          relative
          z-1
          w-24
          h-24
          rounded-full
          overflow-hidden
          border-3
          flex
          items-center
          justify-center
          :style="{
            borderColor: userStore.isLoggedIn ? themeStore.colors.success : themeStore.colors.primary,
            background: `linear-gradient(135deg, ${themeStore.colors.primary}, ${themeStore.colors.secondary})`,
            boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3), 0 8px 40px rgba(139, 92, 246, 0.2), inset 0 0 15px rgba(255, 255, 255, 0.3)',
            animation: 'avatarFloat 4s ease-in-out infinite',
          }"
        >
          <image
            v-if="siteInfo?.avatar"
            :src="siteInfo?.avatar"
            w-full
            h-full
            mode="aspectFill"
            lazy-load
          />
          <text
            v-else
            text-4xl
            text-white
            font-bold
          >
            {{ siteInfo?.name?.charAt(0) || 'G' }}
          </text>
        </view>
      </view>

      <view
        relative
        z-2
        w-full
        text-center
        pt-4
        :class="textVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'"
        :style="{ transition: textVisible ? 'all 0.6s ease-out 0.2s' : 'none' }"
      >
        <view mb-6>
          <text text-2xl font-semibold text-dark tracking-wide>{{ siteInfo?.title || '你好' }}，</text>
          <text text-2xl font-bold tracking-wide :style="{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }">我是 {{ siteInfo?.name || 'Giovan' }}</text>
        </view>

        <!-- <view mb-5>
          <text text-lg text-gray tracking-normal>{{ siteInfo?.title || '一名热爱创造的' }}</text>
          <text v-if="!siteInfo?.title" text-lg font-semibold text-primary-color tracking-normal relative>开发者<view absolute bottom--0.5 left-0 right-0 h-[3px] bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] rounded-[2px] /></text>
        </view> -->

        <view mb-7>
          <text text-base text-light tracking-tight>{{ siteInfo?.bio || '专注于构建优雅、高效的数字产品' }}</text>
        </view>

        <view w-full mb-8>
          <view text-center mb-4>
            <text text-base font-semibold text-gray tracking-wide>技术栈</text>
          </view>
          <swiper
            class="skills-swiper"
            :autoplay="true"
            :circular="true"
            :interval="1"
            :duration="3000"
            :display-multiple-items="4"
            easing-function="linear"
          >
            <swiper-item v-for="(skill, index) in skillsList" :key="index">
              <view flex flex-col items-center gap-2 px-2>
                <image w-12 h-12 p-2 class="bg-white-80" rounded-xl :src="skill.icon" mode="aspectFit" lazy-load />
              </view>
            </swiper-item>
          </swiper>
        </view>

        <view p-5 px-6 mb-10px class="bg-white" rounded-[16px] border border-primary-super-light>
          <text text-sm text-gray italic tracking-normal>"慢一点，再慢一点。"</text>
        </view>

        <view w-full mb-6 flex flex-col gap-3>
          <view v-if="siteInfo?.location" flex items-center gap-3 p-3 px-4 class="bg-white active:bg-white-80" rounded-xl border border-primary-ultra-light transition-all duration-300 active:scale-98>
            <view w-10 h-10 flex items-center justify-center bg-primary-ultra-light rounded-[10px] text-xl>
              <text>📍</text>
            </view>
            <view flex-1 flex flex-col gap-0.5>
              <text text-sm text-dark font-medium>{{ siteInfo.location }}</text>
            </view>
          </view>
          <view v-if="siteInfo?.footerContact?.phone" flex items-center gap-3 p-3 px-4 class="bg-white active:bg-white-80" rounded-xl border border-primary-ultra-light transition-all duration-300 active:scale-98 @click="copyToClipboard(siteInfo.footerContact.phone, '电话')">
            <view w-10 h-10 flex items-center justify-center bg-primary-ultra-light rounded-[10px] text-xl>
              <text>📱</text>
            </view>
            <view flex-1 flex flex-col gap-0.5>
              <text text-sm text-dark font-medium>{{ siteInfo.footerContact.phone }}</text>
            </view>
          </view>
          <view v-if="siteInfo?.email || siteInfo?.footerContact?.email" flex items-center gap-3 p-3 px-4 class="bg-white active:bg-white-80" rounded-xl border border-primary-ultra-light transition-all duration-300 active:scale-98 @click="copyToClipboard(siteInfo?.email || siteInfo?.footerContact?.email, '邮箱')">
            <view w-10 h-10 flex items-center justify-center bg-primary-ultra-light rounded-[10px] text-xl>
              <text>📧</text>
            </view>
            <view flex-1 flex flex-col gap-0.5>
              <text text-sm text-dark font-medium>{{ siteInfo?.email || siteInfo?.footerContact?.email }}</text>
            </view>
          </view>
          <view v-if="siteInfo?.wechat || siteInfo?.footerContact?.wechat" flex items-center gap-3 p-3 px-4 class="bg-white active:bg-white-80" rounded-xl border border-primary-ultra-light transition-all duration-300 active:scale-98 @click="copyToClipboard(siteInfo?.wechat || siteInfo?.footerContact?.wechat, '微信号')">
            <view w-10 h-10 flex items-center justify-center rounded-[10px] text-xl style="background-color: rgba(7, 193, 96, 0.1)">
              <view
                i-tabler-brand-wechat
                text-xl
                style="color: #07C160"
              />
            </view>
            <view flex-1 flex flex-col gap-0.5>
              <text text-sm text-dark font-medium>{{ siteInfo?.wechat || siteInfo?.footerContact?.wechat }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <CustomTabBar />
  </view>
</template>

<style>
.particle-item {
  will-change: transform, opacity;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.5) 0%, rgba(139, 92, 246, 0.2) 50%, transparent 100%);
  animation: particleFloat 20s linear infinite;
}

@keyframes particleFloat {
  0% {
    transform: translate(0, 0) scale(1);
  }
  25% {
    transform: translate(30px, -30px) scale(1.1);
  }
  50% {
    transform: translate(-20px, 20px) scale(0.9);
  }
  75% {
    transform: translate(20px, 30px) scale(1.05);
  }
  100% {
    transform: translate(0, 0) scale(1);
  }
}

@keyframes ringPulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.1);
    opacity: 1;
  }
}

@keyframes avatarFloat {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

@keyframes autoScroll {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}

.skills-scroll-container {
  width: 100%;
  overflow: hidden;
  padding: 8px 0;
}

.skills-scroll {
  display: flex;
  gap: 16px;
  animation: autoScroll 30s linear infinite;
}

.skills-swiper {
  width: 100%;
  height: 120rpx;
}

.avatar-ring {
  position: absolute;
  border-radius: 9999px;
  border: 2px solid;
  animation: ringPulse 3s ease-in-out infinite;
  z-index: 0;
}

.ring-1 {
  top: -24rpx;
  left: -24rpx;
  right: -24rpx;
  bottom: -24rpx;
  border-color: rgba(99, 102, 241, 0.3);
  animation-delay: 0s;
}

.ring-2 {
  top: -40rpx;
  left: -40rpx;
  right: -40rpx;
  bottom: -40rpx;
  border-color: rgba(139, 92, 246, 0.2);
  animation-delay: 0.5s;
}
</style>
