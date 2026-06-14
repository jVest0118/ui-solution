export interface LoginRequest {
  userId: string
  password: string
}

export interface MenuDto {
  menuId: string
  parentId?: string
  menuNm: string
  menuUrl?: string
  menuIcon?: string
  sortOrder: number
  children: MenuDto[]
}

export interface ProjectDto {
  projectId: string
  projectNm: string
  description?: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  userId: string
  userNm: string
  roles: string[]
  menus: MenuDto[]
  projects: ProjectDto[]
}
