import apiConfig from '@/config/api'

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  header?: Record<string, string>
  showLoading?: boolean
  loadingText?: string
}

interface ResponseData<T = any> {
  code: number
  message: string
  data: T
}

class HttpRequest {
  private config = apiConfig

  request<T = any>(options: RequestOptions): Promise<ResponseData<T>> {
    const {
      url,
      method = 'GET',
      data,
      header = {},
      showLoading = false,
      loadingText = '加载中...',
    } = options

    if (showLoading) {
      uni.showLoading({
        title: loadingText,
        mask: true,
      })
    }

    return new Promise((resolve, reject) => {
      uni.request({
        url: this.config.baseURL + url,
        method,
        data,
        header: {
          ...this.config.headers,
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
          } else {
            uni.showToast({
              title: response.message || '请求失败',
              icon: 'none',
            })
            reject(response)
          }
        },
        fail: (err: any) => {
          if (showLoading) {
            uni.hideLoading()
          }

          uni.showToast({
            title: '网络请求失败',
            icon: 'none',
          })
          reject(err)
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
