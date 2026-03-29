const isDev = import.meta.env.DEV

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const logPrefix = '[App]'

function formatMessage(level: LogLevel): string {
  const timestamp = new Date().toISOString()
  return `${logPrefix} [${timestamp}] [${level.toUpperCase()}]`
}

function writeLog(level: LogLevel, ...args: unknown[]): void {
  if (level === 'error') {
    console.error(formatMessage(level), ...args)
    return
  }

  console.warn(formatMessage(level), ...args)
}

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDev) {
      writeLog('debug', ...args)
    }
  },

  info: (...args: unknown[]) => {
    writeLog('info', ...args)
  },

  warn: (...args: unknown[]) => {
    writeLog('warn', ...args)
  },

  error: (...args: unknown[]) => {
    writeLog('error', ...args)
  },

  logError: (context: string, error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(`[${context}]`, message)
    if (isDev && error instanceof Error && error.stack) {
      console.error(error.stack)
    }
  },
}

export function handleError(context: string, error: unknown, showToast = false): void {
  logger.logError(context, error)

  if (showToast) {
    const message = error instanceof Error ? error.message : '操作失败'
    uni.showToast({
      title: message,
      icon: 'none',
      duration: 2000,
    })
  }
}
