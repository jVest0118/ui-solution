import React, { useState } from 'react'
import { Layout, Menu, Button, Avatar, Dropdown, Typography, Tag, Select } from 'antd'
import {
  MenuFoldOutlined, MenuUnfoldOutlined, LogoutOutlined, UserOutlined, ProjectOutlined
} from '@ant-design/icons'
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import * as Icons from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'
import type { MenuDto } from '@/types/auth'

const { Header, Sider, Content } = Layout
const { Text } = Typography

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
  const { userNm, roles, menus, projects, currentProject, setCurrentProject, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const openKeys = menus
    .filter(m => m.children?.length > 0)
    .map(m => m.menuId)

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '로그아웃',
      onClick: () => { logout(); navigate('/login') },
    },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={240}
        style={{ background: '#001529' }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: collapsed ? 14 : 16,
          fontWeight: 700,
          padding: '0 16px',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}>
          {collapsed ? 'UIS' : 'UI Solution'}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={openKeys}
          items={buildMenuItems(menus)}
        />
      </Sider>

      <Layout>
        <Header style={{
          background: '#fff',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: 18 }}
            />
            {projects.length > 0 && (
              <Select
                value={currentProject?.projectId}
                onChange={(val) => {
                  const found = projects.find(p => p.projectId === val)
                  if (found) setCurrentProject(found)
                }}
                options={projects.map(p => ({ value: p.projectId, label: p.projectNm }))}
                style={{ width: 180 }}
                prefix={<ProjectOutlined />}
                variant="borderless"
              />
            )}
          </div>

          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserOutlined />} size="small" />
              <Text strong>{userNm}</Text>
              {roles.includes('SYSTEM_ADMIN') && <Tag color="red">관리자</Tag>}
            </div>
          </Dropdown>
        </Header>

        <Content style={{ margin: 16, background: '#fff', borderRadius: 8, minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default AppLayout
