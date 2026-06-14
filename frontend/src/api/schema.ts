import api from './axios'
import type { ScreenSchema, ScreenListItem } from '@/types/schema'

export const schemaApi = {
  getSchema: (screenId: string) =>
    api.get<{ data: ScreenSchema }>(`/schema/${screenId}`).then((r) => r.data.data),

  getAllScreens: () =>
    api.get<{ data: ScreenListItem[] }>('/schema').then((r) => r.data.data),
}
