import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface TabItem {
  screenId: string
  title: string
  path: string
}

interface TabState {
  tabs: TabItem[]
  addTab: (item: TabItem) => void
  removeTab: (screenId: string) => void
  updateTitle: (screenId: string, title: string) => void
  clearAll: () => void
}

export const useTabStore = create<TabState>()(
  persist(
    (set, get) => ({
      tabs: [],
      addTab: (item) => {
        const exists = get().tabs.find(t => t.screenId === item.screenId)
        if (exists) {
          set(s => ({ tabs: s.tabs.map(t => t.screenId === item.screenId ? { ...t, title: item.title } : t) }))
        } else {
          set(s => ({ tabs: [...s.tabs, item] }))
        }
      },
      removeTab: (screenId) => set(s => ({ tabs: s.tabs.filter(t => t.screenId !== screenId) })),
      updateTitle: (screenId, title) => set(s => ({ tabs: s.tabs.map(t => t.screenId === screenId ? { ...t, title } : t) })),
      clearAll: () => set({ tabs: [] }),
    }),
    {
      name: 'tab-store',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
)
