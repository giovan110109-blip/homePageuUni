import { onUnmounted, ref } from 'vue'
import http, { AbortController } from '@/utils/request'

export function useRequest() {
  const abortControllers = ref<Map<string, AbortController>>(new Map())
  const loading = ref(false)

  function createAbortController(key: string): AbortController {
    const controller = new AbortController()
    abortControllers.value.set(key, controller)
    return controller
  }

  function abort(key: string): void {
    const controller = abortControllers.value.get(key)
    if (controller) {
      controller.abort()
      abortControllers.value.delete(key)
    }
  }

  function abortAll(): void {
    abortControllers.value.forEach((controller) => {
      controller.abort()
    })
    abortControllers.value.clear()
  }

  async function request<T>(
    key: string,
    options: Parameters<typeof http.request>[0],
  ): Promise<T> {
    abort(key)
    const controller = createAbortController(key)
    
    loading.value = true
    try {
      const result = await http.request<T>({
        ...options,
        signal: controller,
      })
      return result
    }
    finally {
      loading.value = false
      abortControllers.value.delete(key)
    }
  }

  onUnmounted(() => {
    abortAll()
  })

  return {
    loading,
    request,
    abort,
    abortAll,
    createAbortController,
  }
}

export function useAbortController() {
  const controllers = ref<Map<string, AbortController>>(new Map())

  function create(key: string): AbortController {
    const controller = new AbortController()
    controllers.value.set(key, controller)
    return controller
  }

  function abort(key: string): void {
    const controller = controllers.value.get(key)
    if (controller) {
      controller.abort()
      controllers.value.delete(key)
    }
  }

  function abortAll(): void {
    controllers.value.forEach((controller) => {
      controller.abort()
    })
    controllers.value.clear()
  }

  function getSignal(key: string): AbortSignal | undefined {
    return controllers.value.get(key) as any
  }

  onUnmounted(() => {
    abortAll()
  })

  return {
    controllers,
    create,
    abort,
    abortAll,
    getSignal,
  }
}
