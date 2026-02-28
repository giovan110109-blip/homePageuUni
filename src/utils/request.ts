import apiConfig from '@/config/api'
import { handleError } from '@/utils/error'

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  header?: Record<string, string>
  showLoading?: boolean
  loadingText?: string
  showError?: boolean
  retryCount?: number
  retryDelay?: number
}

interface ResponseData<T = any> {
  code: number
  message: string
  data: T
  meta?: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

class HttpRequest {
  private config = apiConfig

  private getToken(): string | null {
    return uni.getStorageSync('token') || null
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private shouldRetry(error: any): boolean {
    if (error?.code === 'NETWORK_ERROR') {
      return true
    }
    const statusCode = error?.originalError?.statusCode || error?.statusCode
    return statusCode >= 500 && statusCode < 600
  }

  async request<T = any>(options: RequestOptions): Promise<ResponseData<T>> {
    const {
      url,
      method = 'GET',
      data,
      header = {},
      showLoading = false,
      loadingText = '加载中...',
      showError = true,
      retryCount = 3,
      retryDelay = 1000,
    } = options

    let lastError: any = null

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      if (attempt > 0) {
        await this.sleep(retryDelay * attempt)
      }

      try {
        const result = await this.doRequest<T>({
          url,
          method,
          data,
          header,
          showLoading: showLoading && attempt === 0,
          loadingText,
          showError: showError && attempt === retryCount,
        })
        return result
      }
      catch (error) {
        lastError = error

        if (!this.shouldRetry(error) || attempt === retryCount) {
          throw error
        }
      }
    }

    throw lastError
  }

  private doRequest<T = any>(options: RequestOptions): Promise<ResponseData<T>> {
    const {
      url,
      method = 'GET',
      data,
      header = {},
      showLoading = false,
      loadingText = '加载中...',
      showError = true,
    } = options

    if (showLoading) {
      uni.showLoading({
        title: loadingText,
        mask: true,
      })
    }

    const token = this.getToken()
    const authHeader = token ? { Authorization: `Bearer ${token}` } : {}

    return new Promise((resolve, reject) => {
      uni.request({
        url: this.config.baseURL + url,
        method,
        data,
        header: {
          ...this.config.headers,
          'x-request-timestamp': Date.now().toString(),
          ...authHeader,
          ...header,
        },
        timeout: this.config.timeout,
        success: (res: any) => {
          if (showLoading) {
            uni.hideLoading()
          }

          const response = res.data as ResponseData<T>

          if (response.code === 200 || response.code === 0) {
            resolve(response)
          }
          else {
            const error = handleError(
              { ...response, statusCode: res.statusCode },
              showError,
            )
            reject(error)
          }
        },
        fail: (err: any) => {
          if (showLoading) {
            uni.hideLoading()
          }

          const error = handleError(err, showError)
          reject(error)
        },
      })
    })
  }

  get<T = any>(url: string, data?: any, options?: Omit<RequestOptions, 'url' | 'method' | 'data'>) {
    return this.request<T>({
      url,
      method: 'GET',
      data,
      ...options,
    })
  }

  post<T = any>(url: string, data?: any, options?: Omit<RequestOptions, 'url' | 'method' | 'data'>) {
    return this.request<T>({
      url,
      method: 'POST',
      data,
      ...options,
    })
  }

  put<T = any>(url: string, data?: any, options?: Omit<RequestOptions, 'url' | 'method' | 'data'>) {
    return this.request<T>({
      url,
      method: 'PUT',
      data,
      ...options,
    })
  }

  delete<T = any>(url: string, data?: any, options?: Omit<RequestOptions, 'url' | 'method' | 'data'>) {
    return this.request<T>({
      url,
      method: 'DELETE',
      data,
      ...options,
    })
  }
}

const http = new HttpRequest()

export default http
