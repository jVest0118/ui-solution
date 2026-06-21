import { useQuery } from '@tanstack/react-query'
import api from '@/api/axios'

export interface ScreenPermission {
  screenId: string
  canRead: string
  canCreate: string
  canUpdate: string
  canDelete: string
  canExcel: string
}

interface PermissionsData {
  isPrivileged: boolean
  screens: ScreenPermission[]
}

export function useSitePermissions(projectId: string) {
  return useQuery<PermissionsData>({
    queryKey: ['site-permissions', projectId],
    queryFn: () => api.get('/site/my-permissions', { params: { projectId } }).then(r => r.data.data),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useScreenAccess(projectId: string, screenId: string) {
  const { data, isLoading } = useSitePermissions(projectId)

  if (isLoading) return { isLoading: true, allowed: false, perm: null as ScreenPermission | null }
  if (!data) return { isLoading: false, allowed: false, perm: null as ScreenPermission | null }
  if (data.isPrivileged) {
    const fullPerm: ScreenPermission = { screenId, canRead: 'Y', canCreate: 'Y', canUpdate: 'Y', canDelete: 'Y', canExcel: 'Y' }
    return { isLoading: false, allowed: true, perm: fullPerm }
  }

  const perm = data.screens.find(s => s.screenId === screenId) ?? null
  return {
    isLoading: false,
    allowed: perm?.canRead === 'Y',
    perm,
  }
}
