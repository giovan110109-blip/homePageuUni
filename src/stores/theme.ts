import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type ThemeMode = 'light' | 'dark'

interface ThemeColors {
  bgPrimary: string
  bgSecondary: string
  bgTertiary: string
  bgCard: string
  bgElevated: string
  textPrimary: string
  textSecondary: string
  textTertiary: string
  textMuted: string
  textInverse: string
  border: string
  borderLight: string
  borderDark: string
  primary: string
  primaryHover: string
  primaryLight: string
  secondary: string
  secondaryHover: string
  accent: string
  success: string
  warning: string
  error: string
}

const lightTheme: ThemeColors = {
  bgPrimary: '#f5f5f5',
  bgSecondary: '#f8fafc',
  bgTertiary: '#f1f5f9',
  bgCard: '#ffffff',
  bgElevated: '#ffffff',
  textPrimary: '#0f172a',
  textSecondary: '#334155',
  textTertiary: '#64748b',
  textMuted: '#94a3b8',
  textInverse: '#ffffff',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  borderDark: '#cbd5e1',
  primary: '#6366f1',
  primaryHover: '#4f46e5',
  primaryLight: '#a5b4fc',
  secondary: '#8b5cf6',
  secondaryHover: '#7c3aed',
  accent: '#06b6d4',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
}

const darkTheme: ThemeColors = {
  bgPrimary: '#0f172a',
  bgSecondary: '#1e293b',
  bgTertiary: '#334155',
  bgCard: '#1e293b',
  bgElevated: '#334155',
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textTertiary: '#cbd5e1',
  textMuted: '#64748b',
  textInverse: '#0f172a',
  border: '#334155',
  borderLight: '#1e293b',
  borderDark: '#475569',
  primary: '#818cf8',
  primaryHover: '#a5b4fc',
  primaryLight: '#6366f1',
  secondary: '#a78bfa',
  secondaryHover: '#c4b5fd',
  accent: '#22d3ee',
  success: '#34d399',
  warning: '#fbbf24',
  error: '#f87171',
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>('light')
  const colors = ref<ThemeColors>(lightTheme)

  function getStoredTheme(): ThemeMode {
    try {
      const stored = uni.getStorageSync('theme-mode')
      if (stored === 'light' || stored === 'dark') {
        return stored
      }
    }
    catch (e) {
      console.warn('Failed to get stored theme:', e)
    }
    return 'light'
  }

  function setTheme(newMode: ThemeMode) {
    mode.value = newMode
    colors.value = newMode === 'dark' ? darkTheme : lightTheme

    try {
      uni.setStorageSync('theme-mode', newMode)
    }
    catch (e) {
      console.warn('Failed to store theme:', e)
    }

    applyTheme(newMode)
  }

  function applyTheme(themeMode: ThemeMode) {
    // #ifdef MP-WEIXIN
    try {
      if (themeMode === 'dark') {
        uni.setNavigationBarColor({
          frontColor: '#ffffff',
          backgroundColor: '#0f172a',
        })
      }
      else {
        uni.setNavigationBarColor({
          frontColor: '#000000',
          backgroundColor: '#ffffff',
        })
      }
    }
    catch (e) {
      console.warn('Failed to set navigation bar color:', e)
    }
    // #endif
  }

  function toggleTheme() {
    setTheme(mode.value === 'light' ? 'dark' : 'light')
  }

  function initTheme() {
    const storedTheme = getStoredTheme()
    setTheme(storedTheme)
  }

  watch(mode, (newMode) => {
    colors.value = newMode === 'dark' ? darkTheme : lightTheme
  })

  return {
    mode,
    colors,
    setTheme,
    toggleTheme,
    initTheme,
  }
})
