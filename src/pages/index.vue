<script setup lang="ts">
import { onPageScroll, onShow } from '@dcloudio/uni-app'
import { onMounted, ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import CustomTabBar from '@/components/CustomTabBar.vue'
import { useScrollStore } from '@/stores/scroll'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()
const scrollStore = useScrollStore()

const avatarLoaded = ref(false)
const textVisible = ref(false)

const particles = ref<Array<{ x: number, y: number, size: number, speedX: number, speedY: number, opacity: number }>>([])

onShow(() => {
  const query = uni.createSelectorQuery()
  query.selectViewport().scrollOffset()
  query.exec((res) => {
    const scrollTop = res[0]?.scrollTop || 0
    scrollStore.setScrolled(scrollTop > 10)
  })
})

onPageScroll((e) => {
  scrollStore.setScrolled(e.scrollTop > 10)
})

onMounted(() => {
  for (let i = 0; i < 40; i++) {
    particles.value.push({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      speedX: (Math.random() - 0.5) * 0.3,
      speedY: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.4 + 0.1,
    })
  }

  setTimeout(() => {
    avatarLoaded.value = true
  }, 300)
  setTimeout(() => {
    textVisible.value = true
  }, 600)
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
      from-f5f7fa
      via-e8ecf3
      to-dce3f0
    />

    <view absolute top-0 left-0 right-0 bottom-0 z-0 overflow-hidden>
      <view
        v-for="(particle, index) in particles"
        :key="index"
        absolute
        rounded-full
        :style="{
          left: `${particle.x}%`,
          top: `${particle.y}%`,
          width: `${particle.size}px`,
          height: `${particle.size}px`,
          opacity: particle.opacity,
          animationDelay: `${index * 0.1}s`,
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.5) 0%, rgba(139, 92, 246, 0.2) 50%, transparent 100%)',
          animation: 'particleFloat 20s linear infinite',
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
            borderColor: themeStore.colors.primary,
            background: `linear-gradient(135deg, ${themeStore.colors.primary}, ${themeStore.colors.secondary})`,
            boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3), 0 8px 40px rgba(139, 92, 246, 0.2), inset 0 0 15px rgba(255, 255, 255, 0.3)',
            animation: 'avatarFloat 4s ease-in-out infinite',
          }"
        >
          <text
            text-4xl
            text-white
            font-bold
          >
            G
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
          <text text-2xl font-semibold text-dark tracking-wide>你好，</text>
          <text text-2xl font-bold tracking-wide :style="{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }">我是 Giovan</text>
        </view>

        <view mb-5>
          <text text-lg text-gray tracking-normal>一名热爱创造的</text>
          <text text-lg font-semibold text-primary-color tracking-normal relative>开发者<view absolute bottom--0.5 left-0 right-0 h-[3px] bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] rounded-[2px] /></text>
        </view>

        <view mb-7>
          <text text-base text-light tracking-tight>专注于构建优雅、高效的数字产品</text>
        </view>

        <view w-full mb-8>
          <view text-center mb-4>
            <text text-base font-semibold text-gray tracking-wide>技术栈</text>
          </view>
          <view w-full overflow-hidden py-2>
            <view flex gap-4 :style="{ animation: 'autoScroll 20s linear infinite' }">
              <view flex flex-col items-center gap-2>
                <image w-12 h-12 p-2 class="bg-white-80" rounded-xl transition-transform duration-300 active:scale-95 src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vuejs/vuejs-original.svg" mode="aspectFit" />
              </view>
              <view flex flex-col items-center gap-2>
                <image w-12 h-12 p-2 class="bg-white-80" rounded-xl transition-transform duration-300 active:scale-95 src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" mode="aspectFit" />
              </view>
              <view flex flex-col items-center gap-2>
                <image w-12 h-12 p-2 class="bg-white-80" rounded-xl transition-transform duration-300 active:scale-95 src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg" mode="aspectFit" />
              </view>
              <view flex flex-col items-center gap-2>
                <image w-12 h-12 p-2 class="bg-white-80" rounded-xl transition-transform duration-300 active:scale-95 src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" mode="aspectFit" />
              </view>
              <view flex flex-col items-center gap-2>
                <image w-12 h-12 p-2 class="bg-white-80" rounded-xl transition-transform duration-300 active:scale-95 src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg" mode="aspectFit" />
              </view>
              <view flex flex-col items-center gap-2>
                <image w-12 h-12 p-2 class="bg-white-80" rounded-xl transition-transform duration-300 active:scale-95 src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg" mode="aspectFit" />
              </view>
              <view flex flex-col items-center gap-2>
                <image w-12 h-12 p-2 class="bg-white-80" rounded-xl transition-transform duration-300 active:scale-95 src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg" mode="aspectFit" />
              </view>
              <view flex flex-col items-center gap-2>
                <image w-12 h-12 p-2 class="bg-white-80" rounded-xl transition-transform duration-300 active:scale-95 src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/git/git-original.svg" mode="aspectFit" />
              </view>
              <view flex flex-col items-center gap-2>
                <image w-12 h-12 p-2 class="bg-white-80" rounded-xl transition-transform duration-300 active:scale-95 src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg" mode="aspectFit" />
              </view>
              <view flex flex-col items-center gap-2>
                <image w-12 h-12 p-2 class="bg-white-80" rounded-xl transition-transform duration-300 active:scale-95 src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg" mode="aspectFit" />
              </view>
              <view flex flex-col items-center gap-2>
                <image w-12 h-12 p-2 class="bg-white-80" rounded-xl transition-transform duration-300 active:scale-95 src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg" mode="aspectFit" />
              </view>
              <view flex flex-col items-center gap-2>
                <image w-12 h-12 p-2 class="bg-white-80" rounded-xl transition-transform duration-300 active:scale-95 src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg" mode="aspectFit" />
              </view>
              <view flex flex-col items-center gap-2>
                <image w-12 h-12 p-2 class="bg-white-80" rounded-xl transition-transform duration-300 active:scale-95 src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vuejs/vuejs-original.svg" mode="aspectFit" />
              </view>
              <view flex flex-col items-center gap-2>
                <image w-12 h-12 p-2 class="bg-white-80" rounded-xl transition-transform duration-300 active:scale-95 src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" mode="aspectFit" />
              </view>
              <view flex flex-col items-center gap-2>
                <image w-12 h-12 p-2 class="bg-white-80" rounded-xl transition-transform duration-300 active:scale-95 src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg" mode="aspectFit" />
              </view>
              <view flex flex-col items-center gap-2>
                <image w-12 h-12 p-2 class="bg-white-80" rounded-xl transition-transform duration-300 active:scale-95 src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" mode="aspectFit" />
              </view>
              <view flex flex-col items-center gap-2>
                <image w-12 h-12 p-2 class="bg-white-80" rounded-xl transition-transform duration-300 active:scale-95 src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg" mode="aspectFit" />
              </view>
              <view flex flex-col items-center gap-2>
                <image w-12 h-12 p-2 class="bg-white-80" rounded-xl transition-transform duration-300 active:scale-95 src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg" mode="aspectFit" />
              </view>
              <view flex flex-col items-center gap-2>
                <image w-12 h-12 p-2 class="bg-white-80" rounded-xl transition-transform duration-300 active:scale-95 src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg" mode="aspectFit" />
              </view>
              <view flex flex-col items-center gap-2>
                <image w-12 h-12 p-2 class="bg-white-80" rounded-xl transition-transform duration-300 active:scale-95 src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/git/git-original.svg" mode="aspectFit" />
              </view>
              <view flex flex-col items-center gap-2>
                <image w-12 h-12 p-2 class="bg-white-80" rounded-xl transition-transform duration-300 active:scale-95 src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg" mode="aspectFit" />
              </view>
              <view flex flex-col items-center gap-2>
                <image w-12 h-12 p-2 class="bg-white-80" rounded-xl transition-transform duration-300 active:scale-95 src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg" mode="aspectFit" />
              </view>
              <view flex flex-col items-center gap-2>
                <image w-12 h-12 p-2 class="bg-white-80" rounded-xl transition-transform duration-300 active:scale-95 src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg" mode="aspectFit" />
              </view>
              <view flex flex-col items-center gap-2>
                <image w-12 h-12 p-2 class="bg-white-80" rounded-xl transition-transform duration-300 active:scale-95 src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg" mode="aspectFit" />
              </view>
            </view>
          </view>
        </view>

        <view p-5 px-6 mb-10px class="bg-white" rounded-[16px] border border-primary-super-light>
          <text text-sm text-gray italic tracking-normal>"用代码创造美好，让技术更有温度"</text>
        </view>

        <view w-full mb-6 flex flex-col gap-3>
          <view flex items-center gap-3 p-3 px-4 class="bg-white active:bg-white-80" rounded-xl border border-primary-ultra-light transition-all duration-300 active:scale-98>
            <view w-10 h-10 flex items-center justify-center bg-primary-ultra-light rounded-[10px] text-xl>
              <text>📍</text>
            </view>
            <view flex-1 flex flex-col gap-0.5>
              <text text-sm text-dark font-medium>中国 · 北京</text>
            </view>
          </view>
          <view flex items-center gap-3 p-3 px-4 class="bg-white active:bg-white-80" rounded-xl border border-primary-ultra-light transition-all duration-300 active:scale-98>
            <view w-10 h-10 flex items-center justify-center bg-primary-ultra-light rounded-[10px] text-xl>
              <text>📱</text>
            </view>
            <view flex-1 flex flex-col gap-0.5>
              <text text-sm text-dark font-medium>138-xxxx-xxxx</text>
            </view>
          </view>
          <view flex items-center gap-3 p-3 px-4 class="bg-white active:bg-white-80" rounded-xl border border-primary-ultra-light transition-all duration-300 active:scale-98>
            <view w-10 h-10 flex items-center justify-center bg-primary-ultra-light rounded-[10px] text-xl>
              <text>📧</text>
            </view>
            <view flex-1 flex flex-col gap-0.5>
              <text text-sm text-dark font-medium>giovan@example.com</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <CustomTabBar />
  </view>
</template>

<style>
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
