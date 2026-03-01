<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  url: string
  size?: number
}

const props = withDefaults(defineProps<Props>(), {
  size: 48,
})

const currentUrl = ref(props.url)

function handleTap() {
  uni.previewImage({
    urls: [props.url],
    current: props.url,
  })
}
</script>

<template>
  <image
    :src="currentUrl"
    class="emote-image"
    :style="{ width: `${size}px`, height: `${size}px` }"
    mode="aspectFit"
    @click="handleTap"
  />
</template>

<style scoped>
.emote-image {
  vertical-align: middle;
  display: inline-block;
  cursor: pointer;
}
</style>
