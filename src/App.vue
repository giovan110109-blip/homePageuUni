<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()

onLaunch(() => {
  themeStore.initTheme()
})
</script>

<style>
page {
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-tertiary: #f1f5f9;
  --bg-card: #ffffff;
  --bg-elevated: #ffffff;
  --text-primary: #0f172a;
  --text-secondary: #334155;
  --text-tertiary: #64748b;
  --text-muted: #94a3b8;
  --text-inverse: #ffffff;
  --border-color: #e2e8f0;
  --border-light: #f1f5f9;
  --border-dark: #cbd5e1;
  --primary: #6366f1;
  --primary-hover: #4f46e5;
  --primary-light: #a5b4fc;
  --secondary: #8b5cf6;
  --secondary-hover: #7c3aed;
  --accent: #06b6d4;
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
}

@media (prefers-color-scheme: dark) {
  page {
    --bg-primary: #0f172a;
    --bg-secondary: #1e293b;
    --bg-tertiary: #334155;
    --bg-card: #1e293b;
    --bg-elevated: #334155;
    --text-primary: #f8fafc;
    --text-secondary: #e2e8f0;
    --text-tertiary: #cbd5e1;
    --text-muted: #64748b;
    --text-inverse: #0f172a;
    --border-color: #334155;
    --border-light: #1e293b;
    --border-dark: #475569;
    --primary: #818cf8;
    --primary-hover: #a5b4fc;
    --primary-light: #6366f1;
    --secondary: #a78bfa;
    --secondary-hover: #c4b5fd;
    --accent: #22d3ee;
    --success: #34d399;
    --warning: #fbbf24;
    --error: #f87171;
  }
}
</style>
