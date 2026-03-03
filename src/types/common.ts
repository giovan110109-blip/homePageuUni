export interface ApiError {
  code: number
  message: string
  data?: any
  statusCode?: number
}

export interface TaskInfo {
  taskId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number
  error?: string
  createdAt?: string
  updatedAt?: string
}

export interface AlbumInfo {
  _id: string
  name: string
  description?: string
  cover?: string
  photoCount: number
  createdAt: string
  updatedAt: string
}

export interface UploadTaskStats {
  pending: number
  processing: number
  completed: number
  failed: number
}

export interface FailedTasksResponse {
  tasks: TaskInfo[]
}

export interface ScrollOffsetResult {
  id?: string
  dataset?: Record<string, any>
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
  scrollLeft: number
  scrollTop: number
}

export interface VideoErrorEvent {
  detail: {
    errMsg: string
    errCode: number
  }
  target: {
    id: string
    dataset?: Record<string, any>
  }
}

export type NetworkType = 'wifi' | '2g' | '3g' | '4g' | '5g' | 'unknown' | 'none'

export interface NetworkStatusResult {
  isConnected: boolean
  networkType: NetworkType
}
