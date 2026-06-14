import api from './axios'
import type { LoginRequest, LoginResponse } from '@/types/auth'

export const authApi = {
  login: (data: LoginRequest) =>
    api.post<{ data: LoginResponse }>('/auth/login', data).then((r) => r.data.data),
}
