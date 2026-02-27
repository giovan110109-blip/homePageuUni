<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  url: string
}

const props = defineProps<Props>()

const currentUrl = ref(props.url)
</script>

<template>
  <image
    :src="currentUrl"
    style="width: 24px; height: 24px; vertical-align: middle; display: inline-block;"
    mode="aspectFit"
  />
</template>
