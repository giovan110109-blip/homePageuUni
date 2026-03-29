import config from '@/config/api'
import { logger } from '@/utils/logger'

type Handler = (data: any) => void

class WsService {
  private socketTask: UniApp.SocketTask | null = null
  private url: string
  private handlers = new Map<string, Set<Handler>>()
  private connected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private manualClose = false

  constructor() {
    const baseUrl = config.baseURL || 'https://serve.giovan.cn/api'
    const protocol = baseUrl.startsWith('https') ? 'wss' : 'ws'
    const host = baseUrl.replace(/^https?:\/\//, '').replace(/\/api$/i, '').replace(/\/$/, '')
    this.url = `${protocol}://${host}/ws`
    logger.debug('[WS] URL:', this.url)
  }

  connect(): Promise<void> {
    if (this.connected && this.socketTask) {
      return Promise.resolve()
    }

    this.manualClose = false
    logger.debug('[WS] 正在连接:', this.url)

    return new Promise((resolve, reject) => {
      this.socketTask = uni.connectSocket({
        url: this.url,
        success: () => {
          logger.debug('[WS] uni.connectSocket success')
        },
        fail: (err) => {
          logger.error('[WS] uni.connectSocket fail:', err)
          reject(err)
        },
      })

      if (!this.socketTask) {
        reject(new Error('Failed to create socket'))
        return
      }

      this.socketTask.onOpen(() => {
        logger.debug('[WS] onOpen: 连接成功')
        this.connected = true
        this.reconnectAttempts = 0
        resolve()
      })

      this.socketTask.onMessage((res) => {
        try {
          const msg = JSON.parse(res.data as string)
          logger.debug('[WS] 收到消息:', msg.type, msg)
          this.handlers.get(msg.type)?.forEach(h => h(msg.data ?? msg))
        }
        catch (e) {
          logger.error('[WS] Parse error:', e)
        }
      })

      this.socketTask.onClose(() => {
        logger.debug('[WS] onClose: 连接关闭')
        this.connected = false
        this.socketTask = null
        if (!this.manualClose) {
          this.reconnect()
        }
      })

      this.socketTask.onError((err) => {
        console.error('[WS] onError:', err)
        reject(err)
      })
    })
  }

  private reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts)
      return
    if (this.manualClose)
      return

    this.reconnectAttempts++
    const delay = 1000 * this.reconnectAttempts

    logger.debug(`[WS] 重连中... 第 ${this.reconnectAttempts} 次，延迟 ${delay}ms`)

    setTimeout(() => {
      this.connect().catch(() => {})
    }, delay)
  }

  send(type: string, data?: any) {
    if (this.socketTask && this.connected) {
      logger.debug('[WS] 发送消息:', type, data)
      this.socketTask.send({
        data: JSON.stringify({ type, data }),
      })
    }
    else {
      console.warn('[WS] 未连接，无法发送消息:', type)
    }
  }

  on(type: string, h: Handler) {
    const set = this.handlers.get(type) || new Set()
    set.add(h)
    this.handlers.set(type, set)
    return () => set.delete(h)
  }

  subscribe(token: string, cb: Handler) {
    logger.debug('[WS] 订阅任务更新')
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
