import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LoginResponse, MenuDto, ProjectDto } from '@/types/auth'

interface AuthState {
  accessToken: string | null
  userId: string | null
  userNm: string | null
  deptNm: string | null
  profileImgUrl: string | null
  roles: string[]
  menus: MenuDto[]
  projects: ProjectDto[]
  currentProject: ProjectDto | null
  isAuthenticated: boolean
  login: (response: LoginResponse) => void
  logout: () => void
  setCurrentProject: (project: ProjectDto) => void
  hasRole: (role: string) => boolean
  isAdmin: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      userId: null,
      userNm: null,
      deptNm: null,
      profileImgUrl: null,
      roles: [],
      menus: [],
      projects: [],
      currentProject: null,
      isAuthenticated: false,

      login: (response) => {
        localStorage.setItem('accessToken', response.accessToken)
        localStorage.setItem('refreshToken', response.refreshToken)
        const projects = response.projects ?? []
        set({
          accessToken: response.accessToken,
          userId: response.userId,
          userNm: response.userNm,
          deptNm: response.deptNm ?? null,
          profileImgUrl: response.profileImgUrl ?? null,
          roles: response.roles,
          menus: response.menus,
          projects,
          currentProject: projects.length > 0 ? projects[0] : null,
          isAuthenticated: true,
        })
      },

      logout: () => {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        set({
          accessToken: null,
          userId: null,
          userNm: null,
          deptNm: null,
          profileImgUrl: null,
          roles: [],
          menus: [],
          projects: [],
          currentProject: null,
          isAuthenticated: false,
        })
      },

      setCurrentProject: (project) => set({ currentProject: project }),

      hasRole: (role) => get().roles.includes(role),

      isAdmin: () =>
        get().roles.some((r) => ['SYSTEM_ADMIN', 'SCREEN_ADMIN'].includes(r)),
    }),
    {
      name: 'auth-storage',
      partialize: (s) => ({
        accessToken: s.accessToken,
        userId: s.userId,
        userNm: s.userNm,
        deptNm: s.deptNm,
        profileImgUrl: s.profileImgUrl,
        roles: s.roles,
        menus: s.menus,
        projects: s.projects,
        currentProject: s.currentProject,
        isAuthenticated: s.isAuthenticated,
      }),
    }
  )
)
