import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider } from 'antd'
import koKR from 'antd/locale/ko_KR'
import 'dayjs/locale/ko'
import dayjs from 'dayjs'
import { AgGridProvider } from 'ag-grid-react'
import { AllCommunityModule } from 'ag-grid-community'
import AppLayout from '@/components/layout/AppLayout'
import LoginPage from '@/pages/auth/LoginPage'
import ScreenListPage from '@/pages/admin/ScreenListPage'
import UserManagementPage from '@/pages/admin/UserManagementPage'
import RoleManagementPage from '@/pages/admin/RoleManagementPage'
import MenuManagementPage from '@/pages/admin/MenuManagementPage'
import CodeManagementPage from '@/pages/admin/CodeManagementPage'
import ProjectManagementPage from '@/pages/admin/ProjectManagementPage'
import ScreenDesignPage from '@/pages/admin/ScreenDesignPage'
import { ScreenRenderer } from '@/components/renderer/ScreenRenderer'
import { useAuthStore } from '@/store/authStore'

dayjs.locale('ko')

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

const ScreenRendererPage: React.FC = () => {
  const { screenId } = useParams<{ screenId: string }>()
  return <ScreenRenderer screenId={screenId!} />
}

const App: React.FC = () => (
  <AgGridProvider modules={[AllCommunityModule]}>
  <QueryClientProvider client={queryClient}>
    <ConfigProvider locale={koKR}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <AppLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/admin/screens" replace />} />

            {/* 시스템관리 */}
            <Route path="admin/users"    element={<UserManagementPage />} />
            <Route path="admin/roles"    element={<RoleManagementPage />} />
            <Route path="admin/menus"    element={<MenuManagementPage />} />
            <Route path="admin/projects" element={<ProjectManagementPage />} />

            {/* 화면설계 */}
            <Route path="admin/screens"              element={<ScreenListPage />} />
            <Route path="admin/screens/new"          element={<ScreenDesignPage />} />
            <Route path="admin/screens/:screenId"    element={<ScreenDesignPage />} />
            <Route path="admin/codes"                element={<CodeManagementPage />} />

            {/* 업무화면 - 런타임 렌더러 */}
            <Route path="app/:screenId" element={<ScreenRendererPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  </QueryClientProvider>
  </AgGridProvider>
)

export default App
