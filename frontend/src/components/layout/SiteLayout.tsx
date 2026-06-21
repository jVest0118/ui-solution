import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { Layout, Menu, Button, Avatar, Dropdown, Typography, ConfigProvider, Grid, Drawer } from 'antd'
import { QSpinner } from '@/components/QSpinner'
import { UserOutlined, LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined, MenuOutlined } from '@ant-design/icons'
import * as Icons from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import api from '@/api/axios'

const { Header, Sider, Content } = Layout
const { Text } = Typography

const HEADER_BG = 'linear-gradient(135deg, #0c1225 0%, #162040 50%, #0f2850 100%)'

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

const UserInfo: React.FC<{ userNm: string | null; items: import('antd').MenuProps['items'] }> = ({ userNm, items }) => (
  <Dropdown menu={{ items }} placement="bottomRight">
    <div style={{
      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
      padding: '5px 10px', borderRadius: 8,
      transition: 'background 0.15s', flexShrink: 0,
    }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <Avatar size={28} style={{ background: 'rgba(129,140,248,0.35)', fontSize: 12, fontWeight: 700 }}>
        {userNm?.slice(0, 1)}
      </Avatar>
      <Text className="rsp-hide-mobile" style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 500 }}>{userNm}</Text>
    </div>
  </Dropdown>
)

const SiteLayout: React.FC = () => {
  const { userNm, currentProject, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  const screens = Grid.useBreakpoint()
  const isMobile = screens.md === false

  const projectId = currentProject?.projectId ?? 'DEMO'

  const { data: config, isLoading: cfgLoading } = useQuery<SiteConfig>({
    queryKey: ['siteConfig', projectId],
    queryFn: () => api.get('/site/config', { params: { projectId } }).then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
  })

  const { data: menus = [], isLoading: menuLoading } = useQuery<SiteMenuItem[]>({
    queryKey: ['siteMenus', projectId],
    queryFn: () => api.get('/site/menus', { params: { projectId } }).then(r => r.data.data ?? []),
  })

  const isLoading = cfgLoading || menuLoading

  const topMenus = menus.filter(m => !m.parentId).sort((a, b) => a.sortOrder - b.sortOrder)
  const subMenusOf = useCallback((parentId: string) =>
    menus.filter(m => m.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder),
  [menus])

  const [activeTopKey, setActiveTopKey] = useState<string | null>(null)

  const currentTopKey = useMemo(() => {
    const inSection = (topMenuId: string) => {
      const top = topMenus.find(t => t.menuId === topMenuId)
      if (!top) return false
      if (location.pathname === buildUrl(top)) return true
      return subMenusOf(topMenuId).some(s => location.pathname === buildUrl(s))
    }
    if (activeTopKey && inSection(activeTopKey)) return activeTopKey
    for (const top of topMenus) {
      if (inSection(top.menuId)) return top.menuId
    }
    return topMenus[0]?.menuId ?? null
  }, [location.pathname, topMenus, activeTopKey, subMenusOf])

  // 라우트 변경 시 모바일 드로어 닫기
  useEffect(() => {
    setMobileDrawerOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!isMobile) setMobileDrawerOpen(false)
  }, [isMobile])

  const userMenuItems = [
    { key: 'logout', icon: <LogoutOutlined />, label: '로그아웃', onClick: () => { logout(); window.location.href = '/login' } },
  ]

  if (isLoading) return <QSpinner fullscreen />

  const navStyle = config?.navStyle ?? 'top-side'
  const siteNm = config?.siteNm ?? '내 사이트'

  /* ─── top-dropdown 모드 ──────────────────────────────────── */
  if (navStyle === 'top-dropdown') {
    const topMenuItems = topMenus.map(top => {
      const subs = subMenusOf(top.menuId)
      if (subs.length > 0) {
        return {
          key: top.menuId,
          icon: getIcon(top.icon),
          label: top.menuNm,
          children: subs.map(s => ({
            key: buildUrl(s), icon: getIcon(s.icon), label: s.menuNm,
            onClick: () => navigate(buildUrl(s)),
          })),
        }
      }
      return { key: buildUrl(top), icon: getIcon(top.icon), label: top.menuNm, onClick: () => navigate(buildUrl(top)) }
    })

    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{
          display: 'flex', alignItems: 'center', gap: 0,
          background: HEADER_BG, padding: isMobile ? '0 12px' : '0 24px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
        }}>
          {/* 사이트명 */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            marginRight: isMobile ? 8 : 32, flexShrink: 0,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              border: '1.5px solid rgba(129,140,248,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 13, fontWeight: 900, fontFamily: 'Georgia, serif', color: '#818cf8' }}>Q</span>
            </div>
            {!isMobile && (
              <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap' }}>{siteNm}</span>
            )}
          </div>

          {/* 모바일: Drawer 트리거 */}
          {isMobile ? (
            <>
              <Button
                type="text"
                icon={<MenuOutlined style={{ color: 'rgba(255,255,255,0.8)' }} />}
                onClick={() => setMobileDrawerOpen(true)}
                style={{ background: 'transparent', border: 'none', marginRight: 8 }}
              />
              <Drawer
                open={mobileDrawerOpen}
                onClose={() => setMobileDrawerOpen(false)}
                placement="left"
                width={240}
                title={<span style={{ color: '#e2e8f0' }}>{siteNm}</span>}
                styles={{ body: { padding: 0 }, header: { background: '#0c1225', borderBottom: '1px solid rgba(255,255,255,0.08)' } }}
              >
                <ConfigProvider theme={{ components: { Menu: {
                  itemHoverBg: 'rgba(99,102,241,0.08)',
                  itemSelectedBg: 'rgba(99,102,241,0.1)',
                  itemSelectedColor: '#6366f1',
                  itemColor: '#475569',
                } } }}>
                  <Menu
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    items={topMenuItems}
                    style={{ border: 'none' }}
                  />
                </ConfigProvider>
              </Drawer>
              <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 14, flex: 1 }}>{siteNm}</span>
            </>
          ) : (
            <ConfigProvider theme={{ components: { Menu: {
              darkItemBg: 'transparent', darkSubMenuItemBg: 'rgba(12,18,37,0.95)',
              darkItemHoverBg: 'rgba(255,255,255,0.08)', darkItemSelectedBg: 'rgba(129,140,248,0.2)',
              darkItemColor: 'rgba(255,255,255,0.75)', darkItemHoverColor: '#ffffff',
              darkItemSelectedColor: '#a5b4fc',
            } } }}>
              <Menu
                theme="dark" mode="horizontal"
                selectedKeys={[location.pathname]}
                items={topMenuItems}
                style={{ flex: 1, minWidth: 0, background: 'transparent', borderBottom: 'none' }}
              />
            </ConfigProvider>
          )}

          <UserInfo userNm={userNm} items={userMenuItems} />
        </Header>
        <Content style={{ background: '#ffffff', minHeight: 'calc(100vh - 64px)', overflowY: 'auto', overflowX: 'hidden' }}>
          <div style={{ padding: isMobile ? 12 : 24, minHeight: '100%' }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    )
  }

  /* ─── top-side 모드 ──────────────────────────────────── */
  const activeSubs = currentTopKey ? subMenusOf(currentTopKey) : []
  const hasSidebar = activeSubs.length > 0
  const sideMenuItems = activeSubs.map(s => ({
    key: buildUrl(s), icon: getIcon(s.icon), label: s.menuNm, onClick: () => navigate(buildUrl(s)),
  }))

  const sidebarMenuContent = (
    <ConfigProvider theme={{ components: { Menu: {
      itemHoverBg: 'rgba(99,102,241,0.08)',
      itemSelectedBg: 'rgba(99,102,241,0.1)',
      itemSelectedColor: '#6366f1',
      itemColor: '#475569',
      itemHeight: 38,
      iconSize: 14,
    } } }}>
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={sideMenuItems}
        style={{ borderRight: 'none', paddingTop: 4 }}
      />
    </ConfigProvider>
  )

  return (
    <Layout style={{ minHeight: '100vh' }}>

      {/* ── 상단 헤더 (1단계 메뉴) ── */}
      <Header style={{
        display: 'flex', alignItems: 'center', gap: 0,
        background: HEADER_BG, padding: isMobile ? '0 12px' : '0 24px',
        zIndex: 10, position: 'sticky', top: 0,
        boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
        height: 56, lineHeight: '56px',
      }}>
        {/* 모바일: 사이드바 열기 버튼 */}
        {isMobile && hasSidebar && (
          <Button
            type="text"
            icon={<MenuOutlined style={{ color: 'rgba(255,255,255,0.8)' }} />}
            onClick={() => setMobileDrawerOpen(true)}
            style={{ background: 'transparent', border: 'none', marginRight: 8, flexShrink: 0 }}
          />
        )}

        {/* 사이트명 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: isMobile ? 8 : 28, flexShrink: 0 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            border: '1.5px solid rgba(129,140,248,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 13, fontWeight: 900, fontFamily: 'Georgia, serif', color: '#818cf8' }}>Q</span>
          </div>
          <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: isMobile ? 13 : 15, whiteSpace: 'nowrap' }}>{siteNm}</span>
        </div>

        {/* 1단계 탭 메뉴 */}
        <div style={{
          flex: 1, display: 'flex', gap: 2, alignItems: 'center', height: '100%',
          overflowX: 'auto', overflowY: 'hidden',
        }}>
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
                  background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                  border: 'none', color: isActive ? '#ffffff' : 'rgba(255,255,255,0.6)',
                  padding: isMobile ? '0 10px' : '0 14px', height: '100%', cursor: 'pointer', borderRadius: 6,
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: isMobile ? 12 : 13, fontWeight: isActive ? 600 : 400,
                  borderBottom: isActive ? '2px solid #818cf8' : '2px solid transparent',
                  transition: 'all 0.18s',
                  position: 'relative', whiteSpace: 'nowrap', flexShrink: 0,
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'rgba(255,255,255,0.9)' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
              >
                {getIcon(top.icon)}
                {top.menuNm}
              </button>
            )
          })}
        </div>

        <UserInfo userNm={userNm} items={userMenuItems} />
      </Header>

      <Layout style={{ background: '#ffffff' }}>

        {/* ── 데스크탑 사이드바 (2단계 메뉴) ── */}
        {hasSidebar && !isMobile && (
          <Sider
            trigger={null} collapsible collapsed={collapsed} width={200}
            style={{
              background: '#ffffff',
              borderRight: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '2px 0 8px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ padding: '10px 8px 4px' }}>
              <Button
                type="text" size="small"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(c => !c)}
                style={{ width: '100%', color: '#94a3b8' }}
              />
            </div>
            {sidebarMenuContent}
          </Sider>
        )}

        {/* ── 모바일 사이드바 (Drawer) ── */}
        {hasSidebar && isMobile && (
          <Drawer
            open={mobileDrawerOpen}
            onClose={() => setMobileDrawerOpen(false)}
            placement="left"
            width={220}
            title={<span style={{ fontSize: 14 }}>메뉴</span>}
            styles={{ body: { padding: 0 } }}
          >
            {sidebarMenuContent}
          </Drawer>
        )}

        {/* ── 컨텐츠 — 전체 너비 채움 ── */}
        <Content style={{
          background: '#ffffff',
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}>
          <div style={{ padding: isMobile ? 12 : 24, minHeight: 'calc(100vh - 56px)' }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

export default SiteLayout
