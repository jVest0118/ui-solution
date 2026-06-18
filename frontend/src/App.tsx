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
import SiteLayout from '@/components/layout/SiteLayout'
import LoginPage from '@/pages/auth/LoginPage'
import ScreenListPage from '@/pages/admin/ScreenListPage'
import UserManagementPage from '@/pages/admin/UserManagementPage'
import RoleManagementPage from '@/pages/admin/RoleManagementPage'
import MenuManagementPage from '@/pages/admin/MenuManagementPage'
import CodeManagementPage from '@/pages/admin/CodeManagementPage'
import ProjectManagementPage from '@/pages/admin/ProjectManagementPage'
import ScreenDesignPage from '@/pages/admin/ScreenDesignPage'
import CanvasDesignerPage from '@/pages/admin/CanvasDesignerPage'
import UploadSettingsPage from '@/pages/admin/UploadSettingsPage'
import SiteMenuDesignerPage from '@/pages/admin/SiteMenuDesignerPage'
import DbConnectionPage from '@/pages/admin/DbConnectionPage'
import SiteRoleManagementPage from '@/pages/admin/SiteRoleManagementPage'
import SiteHomePage from '@/pages/site/SiteHomePage'
import SitePage from '@/pages/site/SitePage'
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

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, roles } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  const isAdmin = roles.some(r => ['SYSTEM_ADMIN', 'SCREEN_ADMIN', 'DEVELOPER'].includes(r))
  if (!isAdmin) return <Navigate to="/site" replace />
  return <>{children}</>
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

          {/* ─ 관리자 영역 ─ */}
          <Route
            path="/"
            element={
              <AdminRoute>
                <AppLayout />
              </AdminRoute>
            }
          >
            <Route index element={<Navigate to="/admin/screens" replace />} />

            {/* 시스템관리 */}
            <Route path="admin/users"           element={<UserManagementPage />} />
            <Route path="admin/roles"           element={<RoleManagementPage />} />
            <Route path="admin/menus"           element={<MenuManagementPage />} />
            <Route path="admin/projects"        element={<ProjectManagementPage />} />
            <Route path="admin/upload-settings" element={<UploadSettingsPage />} />
            <Route path="admin/site/menus"      element={<SiteMenuDesignerPage />} />
            <Route path="admin/site/users"      element={<UserManagementPage />} />
            <Route path="admin/site/roles"      element={<SiteRoleManagementPage />} />
            <Route path="admin/datasource"      element={<DbConnectionPage />} />

            {/* 화면설계 */}
            <Route path="admin/screens"              element={<ScreenListPage />} />
            <Route path="admin/screens/new"          element={<ScreenDesignPage />} />
            <Route path="admin/screens/:screenId"    element={<ScreenDesignPage />} />
            <Route path="admin/codes"                element={<CodeManagementPage />} />

            {/* 업무화면 - 런타임 렌더러 (관리자 레이아웃) */}
            <Route path="app/:screenId" element={<ScreenRendererPage />} />
          </Route>

          {/* ─ 캔버스 디자이너 (풀스크린, AppLayout 밖) ─ */}
          <Route
            path="/admin/screens/:screenId/canvas"
            element={
              <AdminRoute>
                <CanvasDesignerPage />
              </AdminRoute>
            }
          />

          {/* ─ 사이트 영역 ─ */}
          <Route
            path="/site"
            element={
              <PrivateRoute>
                <SiteLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<SiteHomePage />} />
            <Route path="screen/:screenId" element={<SitePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  </QueryClientProvider>
  </AgGridProvider>
)

export default App
