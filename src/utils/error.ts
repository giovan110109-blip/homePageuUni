export enum ErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface AppError {
  code: ErrorCode
  message: string
  originalError?: any
  showToast?: boolean
}

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.NETWORK_ERROR]: '网络连接失败，请检查网络',
  [ErrorCode.SERVER_ERROR]: '服务器错误，请稍后重试',
  [ErrorCode.UNAUTHORIZED]: '登录已过期，请重新登录',
  [ErrorCode.FORBIDDEN]: '没有权限访问',
  [ErrorCode.NOT_FOUND]: '请求的资源不存在',
  [ErrorCode.VALIDATION_ERROR]: '请求参数错误',
  [ErrorCode.UNKNOWN_ERROR]: '未知错误，请稍后重试',
}

export class ErrorHandler {
  private static instance: ErrorHandler

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler()
    }
    return ErrorHandler.instance
  }

  handle(error: any, showToast = true): AppError {
    let appError: AppError

    if (this.isNetworkError(error)) {
      appError = {
        code: ErrorCode.NETWORK_ERROR,
        message: ERROR_MESSAGES[ErrorCode.NETWORK_ERROR],
        originalError: error,
        showToast,
      }
    }
    else if (this.isHttpError(error)) {
      appError = this.handleHttpError(error, showToast)
    }
    else if (this.isAppError(error)) {
      appError = error
    }
    else {
      appError = {
        code: ErrorCode.UNKNOWN_ERROR,
        message: error?.message || ERROR_MESSAGES[ErrorCode.UNKNOWN_ERROR],
        originalError: error,
        showToast,
      }
    }

    if (showToast && appError.showToast !== false) {
      this.showToast(appError.message)
    }

    return appError
  }

  private isNetworkError(error: any): boolean {
    return (
      error?.errMsg?.includes('request:fail')
      || error?.errMsg?.includes('network')
      || error?.errno === 600001
      || error?.errno === 600003
    )
  }

  private isHttpError(error: any): boolean {
    return error?.statusCode !== undefined || error?.code !== undefined
  }

  private isAppError(error: any): boolean {
    return error?.code !== undefined && Object.values(ErrorCode).includes(error.code)
  }

  private handleHttpError(error: any, showToast: boolean): AppError {
    const statusCode = error?.statusCode || error?.code
    let code: ErrorCode
    let message: string

    switch (statusCode) {
      case 401:
        code = ErrorCode.UNAUTHORIZED
        message = ERROR_MESSAGES[ErrorCode.UNAUTHORIZED]
        this.handleUnauthorized()
        break
      case 403:
        code = ErrorCode.FORBIDDEN
        message = ERROR_MESSAGES[ErrorCode.FORBIDDEN]
        break
      case 404:
        code = ErrorCode.NOT_FOUND
        message = ERROR_MESSAGES[ErrorCode.NOT_FOUND]
        break
      case 422:
        code = ErrorCode.VALIDATION_ERROR
        message = error?.message || ERROR_MESSAGES[ErrorCode.VALIDATION_ERROR]
        break
      case 500:
      case 502:
      case 503:
        code = ErrorCode.SERVER_ERROR
        message = ERROR_MESSAGES[ErrorCode.SERVER_ERROR]
        break
      default:
        code = ErrorCode.UNKNOWN_ERROR
        message = error?.message || ERROR_MESSAGES[ErrorCode.UNKNOWN_ERROR]
    }

    return {
      code,
      message,
      originalError: error,
      showToast,
    }
  }

  private handleUnauthorized(): void {
    uni.removeStorageSync('token')
    setTimeout(() => {
      uni.navigateTo({ url: '/subpackages/auth/login/index' })
    }, 1500)
  }

  private showToast(message: string): void {
    uni.showToast({
      title: message,
      icon: 'none',
      duration: 2000,
    })
  }
}

export const errorHandler = ErrorHandler.getInstance()

export function handleError(error: any, showToast = true): AppError {
  return errorHandler.handle(error, showToast)
}
