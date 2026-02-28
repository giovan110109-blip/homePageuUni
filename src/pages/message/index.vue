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
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (24 * 60 * 60 * 1000))

  if (days === 0) {
    const hours = Math.floor(diff / (60 * 60 * 1000))
    if (hours === 0) {
      const minutes = Math.floor(diff / (60 * 1000))
      return minutes <= 1 ? '刚刚' : `${minutes}分钟前`
    }
    return `${hours}小时前`
  }
  else if (days === 1) {
    return '昨天'
  }
  else if (days < 7) {
    return `${days}天前`
  }
  else {
    return date.toLocaleDateString('zh-CN')
  }
}

function formatLocation(location: MessageItem['location']): string {
  if (!location)
    return ''
  const parts = [location.country, location.region, location.city].filter(Boolean)
  return parts.length ? parts.join(' ') : ''
}

function getAvatarSrc(avatar: string | undefined): string {
  if (!avatar)
    return ''
  if (avatar.startsWith('http'))
    return avatar
  if (avatar.startsWith('<svg')) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(avatar)}`
  }
  if (avatar.startsWith('data:'))
    return avatar
  return ''
}

function getInitial(name: string): string {
  return name?.charAt(0)?.toUpperCase() || '?'
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
      messages.value = [...messages.value, ...list]
    }

    total.value = meta.total
    hasMore.value = messages.value.length < meta.total

    if (list.length > 0) {
      page.value++
    }
  }
  catch {
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
  catch {
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

function hasComments(messageId: string): boolean {
  const comments = getComments(messageId)
  return comments.length > 0
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
          v-for="msg in messages"
          :key="msg._id"
          p-4
          rounded-2xl
          :style="{
            backgroundColor: themeStore.colors.bgCard,
            border: `1px solid ${themeStore.colors.border}`,
          }"
        >
          <view flex items-start gap-3>
            <view
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
            <view flex-1>
              <view flex items-center gap-2 mb-1>
                <text text-base font-semibold :style="{ color: themeStore.colors.textPrimary }">
                  {{ msg.name }}
                </text>
                <text text-xs :style="{ color: themeStore.colors.textTertiary }">
                  {{ formatDate(msg.createdAt) }}
                </text>
              </view>
              <view
                block
                text-sm
                leading-relaxed
                mb-2
                :style="{ color: themeStore.colors.textSecondary }"
              >
                <template v-for="(item, index) in parseEmote(msg.content)" :key="index">
                  <text v-if="item.type === 'text'">{{ item.content }}</text>
                  <EmoteImage v-else-if="item.type === 'emote'" :url="item.url" />
                </template>
              </view>
              <view flex items-center gap-2 flex-wrap>
                <view
                  v-if="msg.os || msg.browser"
                  flex
                  items-center
                  gap-1
                  px-2
                  py-0.5
                  rounded-full
                  :style="{ backgroundColor: themeStore.colors.bgPrimary }"
                >
                  <text text-xs :style="{ color: themeStore.colors.textTertiary }">
                    {{ msg.os || '' }}{{ msg.os && msg.browser ? ' · ' : '' }}{{ msg.browser || '' }}
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
                    {{ formatLocation(msg.location) }}
                  </text>
                </view>
              </view>
            </view>
          </view>

          <view
            v-if="hasComments(msg._id) || expandedComments.has(msg._id)"
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
                {{ getComments(msg._id).length }} 条回复
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
                    <template v-for="(item, index) in parseEmote(comment.content)" :key="index">
                      <text v-if="item.type === 'text'">{{ item.content }}</text>
                      <EmoteImage v-else-if="item.type === 'emote'" :url="item.url" />
                    </template>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <view
            v-else-if="!expandedComments.has(msg._id)"
            mt-2
            flex
            justify-end
          >
            <text
              text-xs
              :style="{ color: themeStore.colors.primary }"
              @click="toggleComments(msg._id)"
            >
              查看回复
            </text>
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
