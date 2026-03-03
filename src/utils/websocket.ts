import config from '@/config/api'

type Handler = (data: any) => void

class WsService {
  private socketTask: UniApp.SocketTask | null = null
  private url: string
  private handlers = new Map<string, Set<Handler>>()
  private connected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 3
  private manualClose = false

  constructor() {
    const baseUrl = config.baseURL || 'https://serve.giovan.cn'
    const protocol = baseUrl.startsWith('https') ? 'wss' : 'ws'
    const host = baseUrl.replace(/^https?:\/\//, '').replace(/\/api$/, '')
    this.url = `${protocol}://${host}`
  }

  connect(): Promise<void> {
    if (this.connected && this.socketTask) {
      return Promise.resolve()
    }

    this.manualClose = false

    return new Promise((resolve, reject) => {
      this.socketTask = uni.connectSocket({
        url: this.url,
        success: () => {},
        fail: (err) => {
          console.error('[WS] Connect failed:', err)
          reject(err)
        }
      })

      if (!this.socketTask) {
        reject(new Error('Failed to create socket'))
        return
      }

      this.socketTask.onOpen(() => {
        this.connected = true
        this.reconnectAttempts = 0
        resolve()
      })

      this.socketTask.onMessage((res) => {
        try {
          const msg = JSON.parse(res.data as string)
          this.handlers.get(msg.type)?.forEach(h => h(msg.data ?? msg))
        } catch (e) {
          console.error('[WS] Parse error:', e)
        }
      })

      this.socketTask.onClose(() => {
        this.connected = false
        this.socketTask = null
        if (!this.manualClose) {
          this.reconnect()
        }
      })

      this.socketTask.onError((err) => {
        console.error('[WS] Error:', err)
        reject(err)
      })
    })
  }

  private reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return
    if (this.manualClose) return

    this.reconnectAttempts++
    const delay = 1000 * this.reconnectAttempts

    setTimeout(() => {
      this.connect().catch(() => {})
    }, delay)
  }

  send(type: string, data?: any) {
    if (this.socketTask && this.connected) {
      this.socketTask.send({
        data: JSON.stringify({ type, data })
      })
    }
  }

  on(type: string, h: Handler) {
    const set = this.handlers.get(type) || new Set()
    set.add(h)
    this.handlers.set(type, set)
    return () => set.delete(h)
  }

  subscribe(token: string, cb: Handler) {
    this.send('subscribe:tasks', { token })
    return this.on('task:update', cb)
  }

  close() {
    this.manualClose = true
    if (this.socketTask) {
      this.socketTask.close({})
      this.socketTask = null
    }
    this.connected = false
  }

  get isConnected() {
    return this.connected
  }
}

export const wsService = new WsService()
