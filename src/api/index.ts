import http from '@/utils/request'

export interface SocialLink {
  platform: string
  url: string
  icon: string
}

export interface FooterContact {
  email: string
  phone: string
  wechat: string
  address: string
}

export interface SiteInfo {
  _id?: string
  name: string
  title: string
  bio: string
  avatar: string
  email: string
  wechat: string
  location: string
  website: string
  socialLinks: SocialLink[]
  siteName: string
  siteLogo: string
  siteTitle: string
  siteDescription: string
  icp: string
  icpLink: string
  publicSecurity: string
  publicSecurityLink: string
  footerContact: FooterContact
  createdAt?: string
  updatedAt?: string
}

export interface Location {
  city: string
  region: string
  country: string
  countryCode: string
  isp: string
  org: string
  lat: number
  lon: number
}

export interface MessageItem {
  _id: string
  name: string
  email: string
  website?: string
  avatar?: string
  content: string
  status: 'pending' | 'approved'
  browser?: string
  os?: string
  deviceType?: string
  location?: Location | null
  reactions?: Record<string, number>
  createdAt: string
  updatedAt: string
}

export interface CommentItem {
  _id: string
  targetId: string
  parentId?: string | null
  name: string
  email: string
  website?: string
  avatar?: string
  content: string
  status: string
  browser?: string
  os?: string
  deviceType?: string
  location?: Location | null
  createdAt: string
  updatedAt: string
}

export interface PaginatedResponse<T> {
  code: number
  message: string
  data: T[]
  meta: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface PhotoItem {
  _id: string
  title?: string
  description?: string
  originalFileName: string
  storageKey: string
  width: number
  height: number
  aspectRatio: number
  originalUrl: string
  originalFileUrl?: string
  thumbnailUrl?: string
  thumbnailHash?: string
  isLive?: boolean
  videoUrl?: string
  dateTaken?: string
  location?: {
    latitude: number
    longitude: number
    coordinates?: number[]
  }
  geoinfo?: {
    country?: string
    region?: string
    city?: string
    locationName?: string
    formatted?: string
  }
  camera?: {
    make?: string
    model?: string
    lens?: string
    focalLength?: string
    aperture?: string
    shutterSpeed?: string
    iso?: number
  }
  tags?: string[]
  views?: number
  createdAt: string
  updatedAt: string
}

export interface UserInfo {
  _id: string
  nickname?: string
  avatar?: string
  role: 'admin' | 'user'
  wechatNickname?: string
  wechatAvatar?: string
}

export interface WechatLoginResult {
  token: string
  user: UserInfo
}

export const siteInfoApi = {
  getSiteInfo: () => {
    return http.get<SiteInfo>('/site-info')
  },
}

export const messageApi = {
  getMessages: (page: number = 1, pageSize: number = 10, status: string = 'approved') => {
    return http.get<MessageItem[]>('/messages', { page, pageSize, status })
  },
}

export const commentApi = {
  getComments: (targetId: string) => {
    return http.get<CommentItem[]>('/comments', { targetId })
  },
}

export const photoApi = {
  getPhotos: (page: number = 1, limit: number = 20, visibility: string = 'public') => {
    return http.get<{ photos: PhotoItem[], pagination: { total: number, page: number, limit: number, pages: number } }>('/photos', { page, limit, visibility })
  },
  getPhotoDetail: (id: string) => {
    return http.get<PhotoItem>(`/photos/${id}`)
  },
}

export const authApi = {
  wechatLogin: (code: string, userInfo?: { nickName: string, avatarUrl: string }) => {
    return http.post<WechatLoginResult>('/auth/wechat-login', { code, userInfo })
  },
  getMe: () => {
    return http.get<UserInfo>('/auth/me')
  },
  updateUserInfo: (userInfo: { nickName: string, avatarUrl: string }) => {
    return http.post<UserInfo>('/auth/update-userinfo', { userInfo })
  },
  bindAccount: (username: string, password: string, code: string) => {
    return http.post<WechatLoginResult>('/auth/bind-account', { username, password, code })
  },
  scanQrLogin: (qrToken: string) => {
    return http.post<{ status: string, message: string }>('/auth/scan-qr', { qrToken })
  },
  confirmQrLogin: (qrToken: string) => {
    return http.post<{ status: string, message: string }>('/auth/confirm-qr', { qrToken })
  },
}
