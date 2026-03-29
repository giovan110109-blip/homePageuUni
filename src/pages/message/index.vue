<script setup lang="ts">
import type { CommentItem, MessageItem } from '@/api'
import { onPageScroll, onReachBottom, onShow } from '@dcloudio/uni-app'
import { onMounted, ref } from 'vue'
import { commentApi, messageApi } from '@/api'
import AppHeader from '@/components/AppHeader.vue'
import CustomTabBar from '@/components/CustomTabBar.vue'
import EmoteImage from '@/components/EmoteImage.vue'
import Loading from '@/components/Loading.vue'
import { useScrollStore } from '@/stores/scroll'
import { useThemeStore } from '@/stores/theme'
import { getAvatarSrc, getInitial } from '@/utils/avatar'
import { formatRelativeTime } from '@/utils/format'
import { logger } from '@/utils/logger'

const themeStore = useThemeStore()
const scrollStore = useScrollStore()

const messages = ref<MessageItem[]>([])
const commentsMap = ref<Record<string, CommentItem[]>>({})
const loading = ref(true)
const loadingMore = ref(false)
const page = ref(1)
const pageSize = 10
const total = ref(0)
const hasMore = ref(true)
const expandedComments = ref<Set<string>>(new Set())

function formatDate(dateStr: string): string {
  return formatRelativeTime(dateStr)
}

function formatLocation(location: MessageItem['location']): string {
  if (!location)
    return ''
  const parts = [location.country, location.region, location.city].filter(Boolean)
  return parts.length ? parts.join(' ') : ''
}

function getNoteStyle(index: number): string {
  const isDark = themeStore.mode === 'dark'
  const map: Record<number, { light: string, dark: string }> = {
    0: {
      light: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
      dark: 'linear-gradient(135deg, #92400e 0%, #78350f 100%)',
    },
    1: {
      light: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
      dark: 'linear-gradient(135deg, #831843 0%, #500724 100%)',
    },
    2: {
      light: 'linear-gradient(135deg, #cffafe 0%, #a5f3fc 100%)',
      dark: 'linear-gradient(135deg, #164e63 0%, #0e3a47 100%)',
    },
    3: {
      light: 'linear-gradient(135deg, #c7d2fe 0%, #a5b4fc 100%)',
      dark: 'linear-gradient(135deg, #312e81 0%, #1e1b4b 100%)',
    },
    4: {
      light: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
      dark: 'linear-gradient(135deg, #064e3b 0%, #042f2e 100%)',
    },
  }
  const colors = map[index % 5]
  return isDark ? colors.dark : colors.light
}

function formatClientInfo(message: MessageItem): string {
  const parts = [message.os, message.browser, message.deviceType].filter(Boolean)
  return parts.join(' · ')
}

const emoteCache = new Map<string, any[]>()

function parseEmote(text: string): any[] {
  if (!text)
    return []

  if (emoteCache.has(text)) {
    return emoteCache.get(text)!
  }

  const result: any[] = []
  let lastIndex = 0
  const emoteRegex = /\{\{([^}]+)\}\}/g
  let match: RegExpExecArray | null = emoteRegex.exec(text)

  while (match !== null) {
    const textBefore = text.substring(lastIndex, match.index)
    if (textBefore) {
      result.push({ type: 'text', content: textBefore })
    }
    const emoteName = match[1]
    const emoteUrl = `https://serve.giovan.cn/uploads/emote/${emoteName}`
    result.push({ type: 'emote', url: emoteUrl })
    lastIndex = match.index + match[0].length
    match = emoteRegex.exec(text)
  }

  const textAfter = text.substring(lastIndex)
  if (textAfter) {
    result.push({ type: 'text', content: textAfter })
  }

  emoteCache.set(text, result)
  return result
}

async function fetchMessages(reset = false) {
  if (reset) {
    loading.value = true
    page.value = 1
  }
  else {
    loadingMore.value = true
  }

  try {
    const res = await messageApi.getMessages(page.value, pageSize, 'approved')
    const list = res.data || []
    const meta = res.meta || { total: 0 }

    if (reset) {
      messages.value = list
    }
    else {
      const existingIds = new Set(messages.value.map(m => m._id))
      const newList = list.filter((m: MessageItem) => !existingIds.has(m._id))
      messages.value = [...messages.value, ...newList]
    }

    total.value = meta.total
    hasMore.value = messages.value.length < meta.total

    if (list.length > 0) {
      page.value++
    }
  }
  catch (error) {
    logger.logError('loadMessages', error)
  }
  finally {
    loading.value = false
    loadingMore.value = false
  }
}

async function fetchComments(messageId: string) {
  try {
    const res = await commentApi.getComments(messageId)
    commentsMap.value[messageId] = res.data || []
  }
  catch (error) {
    logger.logError('fetchComments', error)
  }
}

function toggleComments(messageId: string) {
  if (expandedComments.value.has(messageId)) {
    expandedComments.value.delete(messageId)
  }
  else {
    expandedComments.value.clear()
    expandedComments.value.add(messageId)
    if (!commentsMap.value[messageId]) {
      fetchComments(messageId)
    }
  }
}

function getComments(messageId: string): CommentItem[] {
  return commentsMap.value[messageId] || []
}

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

onMounted(() => {
  fetchMessages(true)
})

onReachBottom(() => {
  if (!loadingMore.value && hasMore.value) {
    fetchMessages()
  }
})
</script>

<template>
  <view
    relative
    min-h-screen
    pb-20
    :style="{ color: themeStore.colors.textPrimary }"
  >
    <view
      absolute
      top-0
      left-0
      right-0
      h="1/2"
      z-0
      :style="{
        background: `linear-gradient(180deg, ${themeStore.colors.secondary}20 0%, ${themeStore.colors.secondary}10 40%, transparent 100%)`,
      }"
    />
    <view
      absolute
      top-0
      left-0
      right-0
      bottom-0
      z--1
      :style="{ backgroundColor: themeStore.colors.bgPrimary }"
    />

    <AppHeader title="留言板" />

    <view relative z-1 px-4 py-4>
      <view v-if="loading" flex flex-col items-center justify-center py-12>
        <Loading />
      </view>

      <view v-else-if="messages.length === 0" flex flex-col items-center justify-center py-12>
        <text text-base :style="{ color: themeStore.colors.textTertiary }">暂无留言</text>
      </view>

      <view v-else flex flex-col gap-4>
        <view
          v-for="(msg, index) in messages"
          :key="msg._id"
          p-5
          rounded-3xl
          :style="{
            background: getNoteStyle(index),
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
          }"
        >
          <view class="message-card-head">
            <view
              class="message-avatar"
              w-10
              h-10
              rounded-full
              flex-center
              overflow-hidden
              :style="{ backgroundColor: `${themeStore.colors.primary}20` }"
            >
              <image
                v-if="getAvatarSrc(msg.avatar)"
                :src="getAvatarSrc(msg.avatar)"
                w-full
                h-full
                mode="aspectFill"
                lazy-load
              />
              <text
                v-else
                text-base
                font-bold
                :style="{ color: themeStore.colors.primary }"
              >
                {{ getInitial(msg.name) }}
              </text>
            </view>
            <view class="message-card-main">
              <view class="message-title-row">
                <text text-base font-semibold :style="{ color: themeStore.colors.textPrimary }">
                  {{ msg.name }}
                </text>
                <text text-xs :style="{ color: themeStore.colors.textTertiary }">
                  {{ formatDate(msg.createdAt) }}
                </text>
              </view>
              <view
                class="message-content"
                block
                text-sm
                leading-relaxed
                :style="{ color: themeStore.colors.textSecondary }"
              >
                <template v-for="(item, contentIndex) in parseEmote(msg.content)" :key="contentIndex">
                  <text v-if="item.type === 'text'">{{ item.content }}</text>
                  <EmoteImage v-else-if="item.type === 'emote'" :url="item.url" />
                </template>
              </view>
              <view flex items-center gap-2 flex-wrap>
                <view
                  v-if="msg.os || msg.browser || msg.deviceType"
                  flex
                  items-center
                  gap-1
                  px-2
                  py-0.5
                  rounded-full
                  :style="{ backgroundColor: themeStore.colors.bgPrimary }"
                >
                  <text text-xs :style="{ color: themeStore.colors.textTertiary }">
                    {{ formatClientInfo(msg) }}
                  </text>
                </view>
                <view
                  v-if="msg.location && formatLocation(msg.location)"
                  flex
                  items-center
                  gap-1
                  px-2
                  py-0.5
                  rounded-full
                  :style="{ backgroundColor: themeStore.colors.bgPrimary }"
                >
                  <text text-xs :style="{ color: themeStore.colors.textTertiary }">
                    来源：{{ formatLocation(msg.location) }}
                  </text>
                </view>
              </view>
            </view>
          </view>

          <view
            v-if="(msg.commentCount && msg.commentCount > 0) || expandedComments.has(msg._id)"
            mt-3
            pt-3
            border-t
            :style="{ borderColor: themeStore.colors.border }"
          >
            <view
              flex
              items-center
              justify-between
              mb-2
              @click="toggleComments(msg._id)"
            >
              <text text-xs font-medium :style="{ color: themeStore.colors.textTertiary }">
                {{ msg.commentCount || getComments(msg._id).length }} 条回复
              </text>
              <text text-xs :style="{ color: themeStore.colors.primary }">
                {{ expandedComments.has(msg._id) ? '收起' : '展开' }}
              </text>
            </view>

            <view v-if="expandedComments.has(msg._id)" flex flex-col gap-3>
              <view
                v-for="comment in getComments(msg._id)"
                :key="comment._id"
                flex
                items-start
                gap-2
                pl-2
              >
                <view
                  w-6
                  h-6
                  rounded-full
                  flex-center
                  overflow-hidden
                  :style="{ backgroundColor: `${themeStore.colors.secondary}20` }"
                >
                  <image
                    v-if="getAvatarSrc(comment.avatar)"
                    :src="getAvatarSrc(comment.avatar)"
                    w-full
                    h-full
                    mode="aspectFill"
                    lazy-load
                  />
                  <text
                    v-else
                    text-xs
                    font-bold
                    :style="{ color: themeStore.colors.secondary }"
                  >
                    {{ getInitial(comment.name) }}
                  </text>
                </view>
                <view flex-1>
                  <view flex items-center gap-2>
                    <text text-xs font-medium :style="{ color: themeStore.colors.textPrimary }">
                      {{ comment.name }}
                    </text>
                    <text text-xs :style="{ color: themeStore.colors.textTertiary }">
                      {{ formatDate(comment.createdAt) }}
                    </text>
                  </view>
                  <view text-xs leading-relaxed :style="{ color: themeStore.colors.textSecondary }">
                    <template v-for="(item, contentIndex) in parseEmote(comment.content)" :key="contentIndex">
                      <text v-if="item.type === 'text'">{{ item.content }}</text>
                      <EmoteImage v-else-if="item.type === 'emote'" :url="item.url" />
                    </template>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view v-if="loadingMore" flex items-center justify-center py-4>
          <Loading />
        </view>

        <view v-else-if="!hasMore && messages.length > 0" flex items-center justify-center py-4>
          <text text-sm :style="{ color: themeStore.colors.textTertiary }">已加载全部留言</text>
        </view>
      </view>
    </view>

    <CustomTabBar />
  </view>
</template>

<style scoped>
.message-card-head {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
}

.message-avatar {
  flex-shrink: 0;
}

.message-card-main {
  flex: 1;
  min-width: 0;
}

.message-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.message-content {
  margin-bottom: 14rpx;
}
</style>
