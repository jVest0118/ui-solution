import React, { useState, useMemo, useCallback } from 'react'
import { Layout, Menu, Button, Avatar, Dropdown, Typography, Spin } from 'antd'
import { UserOutlined, LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import * as Icons from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import api from '@/api/axios'

const { Header, Sider, Content } = Layout
const { Text } = Typography

interface SiteMenuItem {
  menuId: string
  parentId?: string
  menuNm: string
  screenId?: string
  menuUrl?: string
  icon?: string
  sortOrder: number
}

interface SiteConfig {
  siteNm: string
  navStyle: 'top-dropdown' | 'top-side'
}

function getIcon(iconName?: string): React.ReactNode {
  if (!iconName) return null
  const IconComp = (Icons as unknown as Record<string, React.FC<React.SVGProps<SVGSVGElement>>>)[iconName]
  return IconComp ? <IconComp /> : null
}

function buildUrl(m: SiteMenuItem) {
  if (m.screenId) return `/site/screen/${m.screenId}`
  if (m.menuUrl) return m.menuUrl
  return '#'
}

const SiteLayout: React.FC = () => {
  const { userNm, currentProject, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  const projectId = currentProject?.projectId ?? 'DEMO'

  const { data: config, isLoading: cfgLoading } = useQuery<SiteConfig>({
    queryKey: ['siteConfig', projectId],
    queryFn: () => api.get('/site/config', { params: { projectId } }).then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
  })

  // staleTime 제거: 메뉴 추가/변경 후 사이트 재방문 시 항상 최신 데이터 사용
  const { data: menus = [], isLoading: menuLoading } = useQuery<SiteMenuItem[]>({
    queryKey: ['siteMenus', projectId],
    queryFn: () => api.get('/site/menus', { params: { projectId } }).then(r => r.data.data ?? []),
  })

  const isLoading = cfgLoading || menuLoading

  const topMenus = menus.filter(m => !m.parentId).sort((a, b) => a.sortOrder - b.sortOrder)
  const subMenusOf = useCallback((parentId: string) =>
    menus.filter(m => m.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder),
  [menus])

  // 사용자가 탭을 명시적으로 클릭한 경우 기억
  const [activeTopKey, setActiveTopKey] = useState<string | null>(null)

  // currentTopKey 결정:
  // 1. activeTopKey가 있고 현재 URL이 그 섹션 안에 있으면 → activeTopKey 유지 (탭 클릭 우선)
  // 2. 그렇지 않으면 → URL로 소속 섹션 탐지 (첫 번째 매칭)
  // 이렇게 하면 두 메뉴가 동일한 screenId를 공유해도 탭 클릭이 정확하게 작동함
  const currentTopKey = useMemo(() => {
    const inSection = (topMenuId: string) => {
      const top = topMenus.find(t => t.menuId === topMenuId)
      if (!top) return false
      if (location.pathname === buildUrl(top)) return true
      return subMenusOf(topMenuId).some(s => location.pathname === buildUrl(s))
    }

    // 명시적으로 클릭한 탭이 현재 URL 섹션과 일치하면 그것을 유지
    if (activeTopKey && inSection(activeTopKey)) return activeTopKey

    // URL에서 소속 섹션 탐지
    for (const top of topMenus) {
      if (inSection(top.menuId)) return top.menuId
    }
    return topMenus[0]?.menuId ?? null
  }, [location.pathname, topMenus, activeTopKey, subMenusOf])

  const userMenuItems = [
    { key: 'logout', icon: <LogoutOutlined />, label: '로그아웃', onClick: () => { logout(); navigate('/site/login') } },
  ]

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />

  const navStyle = config?.navStyle ?? 'top-side'
  const siteNm = config?.siteNm ?? '내 사이트'

  // ─── top-dropdown 모드: 1단계 상단, 2단계 드롭다운 ────────
  if (navStyle === 'top-dropdown') {
    const topMenuItems = topMenus.map(top => {
      const subs = subMenusOf(top.menuId)
      if (subs.length > 0) {
        return {
          key: top.menuId,
          icon: getIcon(top.icon),
          label: top.menuNm,
          children: subs.map(s => ({
            key: buildUrl(s),
            icon: getIcon(s.icon),
            label: s.menuNm,
            onClick: () => navigate(buildUrl(s)),
          })),
        }
      }
      return {
        key: buildUrl(top),
        icon: getIcon(top.icon),
        label: top.menuNm,
        onClick: () => navigate(buildUrl(top)),
      }
    })

    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{
          display: 'flex', alignItems: 'center', gap: 0,
          background: '#001529', padding: '0 24px',
        }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, marginRight: 32, whiteSpace: 'nowrap' }}>
            {siteNm}
          </div>
          <Menu
            theme="dark"
            mode="horizontal"
            selectedKeys={[location.pathname]}
            items={topMenuItems}
            style={{ flex: 1, minWidth: 0, borderBottom: 'none' }}
          />
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: '#fff' }}>
              <Avatar icon={<UserOutlined />} size="small" />
              <Text style={{ color: '#fff' }}>{userNm}</Text>
            </div>
          </Dropdown>
        </Header>
        <Content style={{ margin: 0, padding: 24, background: '#f5f5f5', minHeight: 'calc(100vh - 64px)' }}>
          <div style={{ background: '#fff', borderRadius: 8, minHeight: '100%', padding: 24 }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    )
  }

  // ─── top-side 모드: 1단계 상단 탭, 2단계 좌측 사이드바 ────
  const activeSubs = currentTopKey ? subMenusOf(currentTopKey) : []
  const hasSidebar = activeSubs.length > 0

  const sideMenuItems = activeSubs.map(s => ({
    key: buildUrl(s),
    icon: getIcon(s.icon),
    label: s.menuNm,
    onClick: () => navigate(buildUrl(s)),
  }))

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 상단 헤더 (1단계 메뉴) */}
      <Header style={{
        display: 'flex', alignItems: 'center', gap: 0,
        background: '#001529', padding: '0 24px', zIndex: 10,
        position: 'sticky', top: 0,
      }}>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, marginRight: 32, whiteSpace: 'nowrap' }}>
          {siteNm}
        </div>
        <div style={{ flex: 1, display: 'flex', gap: 4 }}>
          {topMenus.map(top => {
            const isActive = top.menuId === currentTopKey
            const subs = subMenusOf(top.menuId)
            return (
              <button
                key={top.menuId}
                onClick={() => {
                  setActiveTopKey(top.menuId)
                  if (subs.length === 0) navigate(buildUrl(top))
                  else navigate(buildUrl(subs[0]))
                }}
                style={{
                  background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                  border: 'none', color: '#fff', padding: '0 16px', height: 48,
                  cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center',
                  gap: 6, fontSize: 14, fontWeight: isActive ? 600 : 400,
                  borderBottom: isActive ? '2px solid #1677ff' : '2px solid transparent',
                  transition: 'all 0.2s',
                }}
              >
                {getIcon(top.icon)}
                {top.menuNm}
              </button>
            )
          })}
        </div>
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: '#fff' }}>
            <Avatar icon={<UserOutlined />} size="small" />
            <Text style={{ color: '#fff' }}>{userNm}</Text>
          </div>
        </Dropdown>
      </Header>

      <Layout>
        {/* 좌측 사이드바 (2단계 메뉴) */}
        {hasSidebar && (
          <Sider
            trigger={null}
            collapsible
            collapsed={collapsed}
            width={200}
            style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}
          >
            <div style={{ padding: '8px 4px' }}>
              <Button
                type="text"
                size="small"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(c => !c)}
                style={{ width: '100%', marginBottom: 4 }}
              />
            </div>
            <Menu
              mode="inline"
              selectedKeys={[location.pathname]}
              items={sideMenuItems}
              style={{ borderRight: 'none' }}
            />
          </Sider>
        )}

        <Content style={{ padding: 24, background: '#f5f5f5', minHeight: 'calc(100vh - 64px)' }}>
          <div style={{ background: '#fff', borderRadius: 8, minHeight: '100%', padding: 24 }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

export default SiteLayout
