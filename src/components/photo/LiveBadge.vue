<script setup lang="ts">
interface Props {
  canPlay?: boolean
  isPlaying?: boolean
}

withDefaults(defineProps<Props>(), {
  canPlay: false,
  isPlaying: false,
})
</script>

<template>
  <view
    class="live-badge"
    :class="isPlaying ? 'live-badge-playing' : ''"
  >
    <view
      :class="!canPlay ? 'i-tabler-live-photo live-icon-spin' : 'i-tabler-live-photo'"
      class="live-icon"
    />
    <text class="live-text">LIVE</text>
  </view>
</template>

<style scoped>
.live-badge {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 8rpx 12rpx;
  border-radius: 100rpx;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(12px);
  transition: all 0.3s ease;
}

.live-badge-playing {
  background: rgba(255, 214, 0, 0.1);
  transform: scale(1.06);
}

.live-badge-playing .live-text {
  color: #ffd600;
}

.live-badge-playing .live-icon {
  color: #ffd600;
}

.live-icon {
  width: 40rpx;
  height: 40rpx;
  color: #fff;
}

.live-icon-spin {
  animation: live-spin 1s linear infinite;
}

@keyframes live-spin {
  to {
    transform: rotate(360deg);
  }
}

.live-text {
  font-size: 26rpx;
  font-weight: bold;
  color: #fff;
}
</style>
