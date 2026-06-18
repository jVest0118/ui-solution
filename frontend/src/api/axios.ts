import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let isRefreshing = false
let isRedirectingToLogin = false
let pendingQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = []

const drainQueue = (err: unknown, token: string | null) => {
  pendingQueue.forEach(p => (err ? p.reject(err) : p.resolve(token!)))
  pendingQueue = []
}

// 세션 만료 처리: auth 상태 초기화 후 로그인 페이지로 이동
const handleSessionExpired = () => {
  if (isRedirectingToLogin) return
  isRedirectingToLogin = true
  useAuthStore.getState().logout()
  window.location.href = '/login?expired=1'
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('refreshToken')

      if (!refreshToken) {
        handleSessionExpired()
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject })
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const res = await axios.post('/api/auth/refresh', { refreshToken })
        const newToken: string = res.data.data.accessToken

        localStorage.setItem('accessToken', newToken)
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`
        originalRequest.headers.Authorization = `Bearer ${newToken}`

        drainQueue(null, newToken)
        return api(originalRequest)
      } catch (refreshErr) {
        drainQueue(refreshErr, null)
        handleSessionExpired()
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api
