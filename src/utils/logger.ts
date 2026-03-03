const isDev = process.env.NODE_ENV === 'development'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const logPrefix = '[App]'

function formatMessage(level: LogLevel, ...args: any[]): string {
  const timestamp = new Date().toISOString()
  return `${logPrefix} [${timestamp}] [${level.toUpperCase()}]`
}

export const logger = {
  debug: (...args: any[]) => {
    if (isDev) {
      console.log(formatMessage('debug'), ...args)
    }
  },
  
  info: (...args: any[]) => {
    console.info(formatMessage('info'), ...args)
  },
  
  warn: (...args: any[]) => {
    console.warn(formatMessage('warn'), ...args)
  },
  
  error: (...args: any[]) => {
    console.error(formatMessage('error'), ...args)
  },
  
  logError: (context: string, error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(`[${context}]`, message)
    if (isDev && error instanceof Error && error.stack) {
      console.error(error.stack)
    }
  }
}

export function handleError(context: string, error: unknown, showToast = false): void {
  logger.logError(context, error)
  
  if (showToast) {
    const message = error instanceof Error ? error.message : '操作失败'
    uni.showToast({
      title: message,
      icon: 'none',
      duration: 2000
    })
  }
}
