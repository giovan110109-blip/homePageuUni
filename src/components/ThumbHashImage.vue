<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'

const props = defineProps<{
  src: string
  thumbHash?: string
  aspectRatio?: number
  width?: number
  height?: number
}>()

const thumbhashDataUrl = ref('')
const imageLoaded = ref(false)

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let result = ''
  const len = bytes.length

  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i]
    const b1 = i + 1 < len ? bytes[i + 1] : 0
    const b2 = i + 2 < len ? bytes[i + 2] : 0

    result += BASE64_CHARS[b0 >> 2]
    result += BASE64_CHARS[((b0 & 0x03) << 4) | (b1 >> 4)]
    result += i + 1 < len ? BASE64_CHARS[((b1 & 0x0F) << 2) | (b2 >> 6)] : '='
    result += i + 2 < len ? BASE64_CHARS[b2 & 0x3F] : '='
  }

  return result
}

function base64ToUint8Array(base64: string): Uint8Array {
  const cleanBase64 = base64.replace(/[^a-z0-9+/]/gi, '')
  const len = cleanBase64.length
  const bytesLength = Math.floor(len * 3 / 4)
  const bytes = new Uint8Array(bytesLength)

  let bytePos = 0
  for (let i = 0; i < len; i += 4) {
    const c0 = BASE64_CHARS.indexOf(cleanBase64[i])
    const c1 = BASE64_CHARS.indexOf(cleanBase64[i + 1])
    const c2 = BASE64_CHARS.indexOf(cleanBase64[i + 2])
    const c3 = BASE64_CHARS.indexOf(cleanBase64[i + 3])

    bytes[bytePos++] = (c0 << 2) | (c1 >> 4)
    if (c2 !== -1 && cleanBase64[i + 2] !== '=') {
      bytes[bytePos++] = ((c1 & 0x0F) << 4) | (c2 >> 2)
    }
    if (c3 !== -1 && cleanBase64[i + 3] !== '=') {
      bytes[bytePos++] = ((c2 & 0x03) << 6) | c3
    }
  }

  return bytes
}

function decodeThumbHashImpl(hash: Uint8Array): { w: number, h: number, rgba: Uint8Array } {
  const h0 = hash[0]
  const h1 = hash[1]
  const h2 = hash[2]
  const h3 = hash[3]
  const h4 = hash[4]

  const imgW = (h0 & 0x0F) + 1
  const imgH = (h0 >> 4) + 1
  const _hasAlpha = h4 & 0x80

  const lScale = (h4 & 0x7F) / 63
  const pScale = h3 / 63
  const qScale = h2 / 63

  const lArr = [0, 0, 0]
  const pArr = [0, 0, 0]
  const qArr = [0, 0, 0]

  for (let i = 0; i < 3; i++) {
    const v = hash[5 + i]
    lArr[i] = v * lScale / 255
  }

  if (hash.length > 8) {
    for (let i = 0; i < 3; i++) {
      const v = hash[8 + i]
      pArr[i] = (v - 127) * pScale / 127
    }
  }

  if (hash.length > 11) {
    for (let i = 0; i < 3; i++) {
      const v = hash[11 + i]
      qArr[i] = (v - 127) * qScale / 127
    }
  }

  const rgba = new Uint8Array(imgW * imgH * 4)

  const cx = imgW * 0.5
  const cy = imgH * 0.5
  const rx = imgW * 0.5
  const ry = imgH * 0.5

  for (let y = 0; y < imgH; y++) {
    for (let x = 0; x < imgW; x++) {
      const dx = (x - cx) / rx
      const dy = (y - cy) / ry
      const d = dx * dx + dy * dy

      const L = lArr[0] + d * lArr[1] + d * d * lArr[2]
      const P = pArr[0] + d * pArr[1] + d * d * pArr[2]
      const Q = qArr[0] + d * qArr[1] + d * d * qArr[2]

      const angle = Math.atan2(dy, dx)
      const cosA = Math.cos(angle)
      const sinA = Math.sin(angle)

      const r = L + cosA * P + sinA * Q
      const g = L - 0.5 * cosA * P - 0.866025404 * sinA * P + 0.866025404 * cosA * Q - 0.5 * sinA * Q
      const b = L - 0.5 * cosA * P + 0.866025404 * sinA * P - 0.866025404 * cosA * Q - 0.5 * sinA * Q

      const idx = (y * imgW + x) * 4
      rgba[idx] = Math.max(0, Math.min(255, Math.round((r + 0.5) * 255)))
      rgba[idx + 1] = Math.max(0, Math.min(255, Math.round((g + 0.5) * 255)))
      rgba[idx + 2] = Math.max(0, Math.min(255, Math.round((b + 0.5) * 255)))
      rgba[idx + 3] = 255
    }
  }

  return { w: imgW, h: imgH, rgba }
}

function rgbaToPNGDataURL(imgW: number, imgH: number, rgba: Uint8Array): string {
  const row = imgW * 4 + 1
  const idat = 6 + imgH * (5 + row)
  const bytes = new Uint8Array(8 + 18 + idat)

  bytes.set([137, 80, 78, 71, 13, 10, 26, 10], 0)

  let pos = 8

  function writeChunk(type: number[], data: Uint8Array | number[]) {
    const len = data.length
    const crc = [type[0], type[1], type[2], type[3], ...data]

    bytes[pos++] = (len >> 24) & 0xFF
    bytes[pos++] = (len >> 16) & 0xFF
    bytes[pos++] = (len >> 8) & 0xFF
    bytes[pos++] = len & 0xFF
    bytes[pos++] = type[0]
    bytes[pos++] = type[1]
    bytes[pos++] = type[2]
    bytes[pos++] = type[3]

    for (let i = 0; i < len; i++) {
      bytes[pos++] = data[i]
    }

    let c = 0xFFFFFFFF
    for (let i = 0; i < crc.length; i++) {
      c ^= crc[i]
      for (let j = 0; j < 8; j++) {
        c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
      }
    }
    c = (c ^ 0xFFFFFFFF) >>> 0

    bytes[pos++] = (c >> 24) & 0xFF
    bytes[pos++] = (c >> 16) & 0xFF
    bytes[pos++] = (c >> 8) & 0xFF
    bytes[pos++] = c & 0xFF
  }

  writeChunk([73, 72, 68, 82], [imgW >> 8, imgW & 0xFF, imgH >> 8, imgH & 0xFF, 8, 6, 0, 0, 0])

  const zlibData: number[] = [0x78, 0x9C]
  let crcVal = 1
  let lenVal = 0

  function writeBits(val: number, bits: number) {
    for (let i = bits - 1; i >= 0; i--) {
      if (val & (1 << i)) {
        crcVal = crcVal ^ 1 ? 0x82F63B78 : 1
        lenVal |= 1 << (lenVal & 7 ? 0 : 8)
      }
      if (lenVal & 0x80) {
        zlibData.push(lenVal & 0xFF)
        lenVal = 0
      }
      lenVal <<= 1
    }
  }

  for (let y = 0; y < imgH; y++) {
    writeBits(0, 8)
    for (let x = 0; x < imgW; x++) {
      const idx = (y * imgW + x) * 4
      writeBits(rgba[idx], 8)
      writeBits(rgba[idx + 1], 8)
      writeBits(rgba[idx + 2], 8)
      writeBits(rgba[idx + 3], 8)
    }
  }

  zlibData.push(lenVal & 0xFF)
  zlibData.push(crcVal >> 24 & 0xFF)
  zlibData.push(crcVal >> 16 & 0xFF)
  zlibData.push(crcVal >> 8 & 0xFF)
  zlibData.push(crcVal & 0xFF)

  writeChunk([73, 68, 65, 84], zlibData)
  writeChunk([73, 69, 78, 68], [])

  return `data:image/png;base64,${uint8ArrayToBase64(bytes)}`
}

function thumbHashToDataURL(hash: Uint8Array): string {
  const { w, h, rgba } = decodeThumbHashImpl(hash)
  return rgbaToPNGDataURL(w, h, rgba)
}

function decodeThumbHash(base64: string): string {
  try {
    const bytes = base64ToUint8Array(base64)
    return thumbHashToDataURL(bytes)
  }
  catch (e) {
    console.error('ThumbHash decode error:', e)
    return ''
  }
}

watchEffect(() => {
  if (props.thumbHash) {
    thumbhashDataUrl.value = decodeThumbHash(props.thumbHash)
  }
})

function onImageLoad() {
  imageLoaded.value = true
}

const computedAspectRatio = computed(() => {
  if (props.aspectRatio)
    return props.aspectRatio
  if (props.width && props.height)
    return props.width / props.height
  return 1
})
</script>

<template>
  <view
    relative
    w-full
    overflow-hidden
    :style="{ aspectRatio: computedAspectRatio }"
  >
    <image
      v-if="thumbhashDataUrl && !imageLoaded"
      :src="thumbhashDataUrl"
      mode="aspectFill"
      w-full
      h-full
      absolute
      top-0
      left-0
      :style="{ filter: 'blur(10px)', transform: 'scale(1.1)' }"
    />
    <image
      :src="src"
      mode="aspectFill"
      w-full
      h-full
      lazy-load
      :style="{
        opacity: imageLoaded ? 1 : 0,
        transition: 'opacity 0.3s ease-in-out',
      }"
      @load="onImageLoad"
    />
  </view>
</template>
