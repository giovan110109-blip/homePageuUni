import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useScrollStore = defineStore('scroll', () => {
  const isScrolled = ref(false)

  function setScrolled(value: boolean) {
    isScrolled.value = value
  }

  function reset() {
    isScrolled.value = false
  }

  return {
    isScrolled,
    setScrolled,
    reset,
  }
})
