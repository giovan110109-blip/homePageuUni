import http from '@/utils/request'

export interface UserInfo {
  id: string
  name: string
  avatar: string
}

export interface Message {
  id: string
  content: string
  createTime: string
}

export const userApi = {
  getUserInfo: () => {
    return http.get<UserInfo>('/user/info')
  },
  
  updateUserInfo: (data: Partial<UserInfo>) => {
    return http.post<UserInfo>('/user/update', data)
  },
}

export const messageApi = {
  getMessageList: (page: number = 1, size: number = 10) => {
    return http.get<Message[]>('/message/list', { page, size })
  },
  
  addMessage: (content: string) => {
    return http.post<Message>('/message/add', { content })
  },
  
  deleteMessage: (id: string) => {
    return http.delete(`/message/delete/${id}`)
  },
}
