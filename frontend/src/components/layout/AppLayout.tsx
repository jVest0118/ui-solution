import React, { useState, useEffect } from 'react'
import { Layout, Menu, Button, Avatar, Dropdown, Typography, Tag, Select, Tabs, ConfigProvider, Grid, Drawer } from 'antd'
import {
  MenuFoldOutlined, MenuUnfoldOutlined, LogoutOutlined, UserOutlined, ProjectOutlined,
  DownOutlined, MenuOutlined,
} from '@ant-design/icons'
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import * as Icons from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'
import { useTabStore } from '@/store/tabStore'
import type { MenuDto } from '@/types/auth'

const { Header, Sider, Content } = Layout
const { Text } = Typography

const SIDEBAR_BG = 'linear-gradient(170deg, #0e0c22 0%, #1a1535 55%, #1c1042 100%)'

const buildMenuItems = (menus: MenuDto[]): import('antd').MenuProps['items'] => {
  return menus.map((m) => {
    const IconComp = m.menuIcon ? (Icons as unknown as Record<string, React.FC>)[m.menuIcon] : null
    if (m.children && m.children.length > 0) {
      return {
        key: m.menuId,
        icon: IconComp ? <IconComp /> : null,
        label: m.menuNm,
        children: buildMenuItems(m.children),
      }
    }
    const url = m.menuUrl ?? `/${m.menuId}`
    return {
      key: url,
      icon: IconComp ? <IconComp /> : null,
      label: <Link to={url}>{m.menuNm}</Link>,
    }
  })
}

const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const { userNm, roles, menus, projects, currentProject, setCurrentProject, logout } = useAuthStore()
  const { tabs, removeTab } = useTabStore()
  const navigate = useNavigate()
  const location = useLocation()

  const screens = Grid.useBreakpoint()
  const isMobile = screens.md === false

  // 라우트 변경 시 모바일 드로어 닫기
  useEffect(() => {
    setMobileDrawerOpen(false)
  }, [location.pathname])

  // 데스크탑 전환 시 드로어 닫기
  useEffect(() => {
    if (!isMobile) setMobileDrawerOpen(false)
  }, [isMobile])

  const openKeys = menus
    .filter(m => m.children?.length > 0)
    .map(m => m.menuId)

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '로그아웃',
      onClick: () => { logout(); window.location.href = '/login' },
    },
  ]

  // 사이드바 내부 컨텐츠 (Sider와 Drawer 공용)
  const sidebarContent = (
    <>
      {/* 로고 영역 */}
      <div style={{
        height: 64,
        display: 'flex', alignItems: 'center',
        padding: collapsed && !isMobile ? '0 24px' : '0 20px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        gap: 10, overflow: 'hidden',
        justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
          border: '2px solid rgba(129,140,248,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 14px rgba(129,140,248,0.25)',
        }}>
          <span style={{
            fontSize: 17, fontWeight: 900, lineHeight: 1,
            fontFamily: 'Georgia, serif', color: '#818cf8',
          }}>Q</span>
        </div>
        {(!collapsed || isMobile) && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 700, lineHeight: '18px', whiteSpace: 'nowrap' }}>
              UI Solution
            </div>
            <div style={{ color: '#4f4b7a', fontSize: 10, letterSpacing: '1.2px', fontWeight: 600, lineHeight: '14px' }}>
              PLATFORM
            </div>
          </div>
        )}
      </div>

      {/* 메뉴 */}
      <ConfigProvider theme={{
        components: {
          Menu: {
            darkItemBg: 'transparent',
            darkItemHoverBg: 'rgba(129,140,248,0.12)',
            darkItemSelectedBg: 'rgba(129,140,248,0.2)',
            darkSubMenuItemBg: 'rgba(0,0,0,0.2)',
            darkItemColor: '#94a3b8',
            darkItemHoverColor: '#e2e8f0',
            darkItemSelectedColor: '#a5b4fc',
            itemHeight: 42,
            iconSize: 15,
            collapsedIconSize: 16,
          },
        },
      }}>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={openKeys}
          items={buildMenuItems(menus)}
          style={{ background: 'transparent', border: 'none', marginTop: 8 }}
        />
      </ConfigProvider>

      {/* 접기 버튼 (데스크탑 전용) */}
      {!isMobile && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '12px 16px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ color: '#4f4b7a', width: '100%', textAlign: 'left', padding: '0 8px' }}
          />
        </div>
      )}
    </>
  )

  return (
    <Layout style={{ minHeight: '100vh' }}>

      {/* ── 데스크탑 사이드바 ── */}
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={240}
          style={{
            background: SIDEBAR_BG,
            boxShadow: '4px 0 24px rgba(0,0,0,0.35)',
            position: 'relative', zIndex: 10,
          }}
        >
          {sidebarContent}
        </Sider>
      )}

      {/* ── 모바일 사이드바 (Drawer) ── */}
      {isMobile && (
        <Drawer
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          placement="left"
          width={240}
          styles={{
            header: { display: 'none' },
            body: { padding: 0, background: SIDEBAR_BG, position: 'relative' },
          }}
          style={{ padding: 0 }}
        >
          {sidebarContent}
        </Drawer>
      )}

      <Layout style={{ background: '#ffffff', minWidth: 0 }}>

        {/* ── 헤더 ── */}
        <Header style={{
          background: '#ffffff',
          padding: isMobile ? '0 12px' : '0 20px 0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 1px 0 rgba(0,0,0,0.08)',
          height: 56, lineHeight: '56px',
          position: 'sticky', top: 0, zIndex: 9,
        }}>
          {/* 좌측 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            {/* 모바일 햄버거 버튼 */}
            {isMobile && (
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setMobileDrawerOpen(true)}
                style={{ color: '#475569', flexShrink: 0 }}
              />
            )}
            {/* 프로젝트 선택 */}
            {projects.length > 0 && (
              <Select
                value={currentProject?.projectId}
                onChange={(val) => {
                  const found = projects.find(p => p.projectId === val)
                  if (found) setCurrentProject(found)
                }}
                options={projects.map(p => ({ value: p.projectId, label: p.projectNm }))}
                style={{ width: isMobile ? 130 : 180 }}
                prefix={<ProjectOutlined style={{ color: '#6366f1' }} />}
                variant="borderless"
                suffixIcon={<DownOutlined style={{ fontSize: 11, color: '#94a3b8' }} />}
              />
            )}
          </div>

          {/* 우측: 사용자 정보 */}
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div style={{
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 8px', borderRadius: 8,
              transition: 'background 0.15s', flexShrink: 0,
            }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Avatar
                size={30}
                style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)', fontSize: 13, fontWeight: 700 }}
              >
                {userNm?.slice(0, 1)}
              </Avatar>
              {!isMobile && (
                <>
                  <Text style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{userNm}</Text>
                  {roles.includes('SYSTEM_ADMIN') && (
                    <Tag style={{
                      fontSize: 10, padding: '0 6px', lineHeight: '18px', height: 18,
                      background: 'rgba(99,102,241,0.1)', color: '#6366f1',
                      border: '1px solid rgba(99,102,241,0.3)', borderRadius: 4,
                    }}>관리자</Tag>
                  )}
                </>
              )}
            </div>
          </Dropdown>
        </Header>

        {/* 탭 바 */}
        {tabs.length > 0 && (
          <div style={{
            background: '#ffffff',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            padding: '0 8px',
            overflowX: 'auto',
          }}>
            <Tabs
              type="editable-card"
              hideAdd
              size="small"
              activeKey={location.pathname.replace('/app/', '')}
              onTabClick={(key) => navigate(`/app/${key}`)}
              onEdit={(key, action) => { if (action === 'remove') removeTab(String(key)) }}
              items={tabs.map(t => ({ key: t.screenId, label: t.title, closable: true }))}
              style={{ marginBottom: 0 }}
            />
          </div>
        )}

        {/* 컨텐츠 — 사이드바 오른쪽 전체 채움 */}
        <Content style={{
          background: '#ffffff',
          overflowY: 'auto',
          overflowX: 'hidden',
          flex: 1,
        }}>
          <Outlet />
        </Content>

      </Layout>
    </Layout>
  )
}

export default AppLayout
