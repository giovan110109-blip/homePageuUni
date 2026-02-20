import envConfig from './env.json'

export interface ApiConfig {
  baseURL: string
  timeout: number
  headers?: Record<string, string>
}

const env = process.env.NODE_ENV || 'development'

const config: ApiConfig = {
  baseURL: envConfig[env as keyof typeof envConfig]?.baseURL || '',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
}

export const setBaseURL = (url: string) => {
  config.baseURL = url
}

export const getBaseURL = () => {
  return config.baseURL
}

export default config
