import React, { useState, useEffect } from 'react'
import {
  Button, Input, Select, Form, Space, Typography, Card, Row, Col,
  message, Popconfirm, Divider, Tag, Tooltip, Radio
} from 'antd'
import {
  PlusOutlined, DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined,
  SaveOutlined, GlobalOutlined, SettingOutlined, MenuOutlined
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { nanoid } from 'nanoid'
import { useAuthStore } from '@/store/authStore'
import api from '@/api/axios'

const { Title, Text } = Typography

interface SiteMenuItem {
  menuId: string
  projectId: string
  parentId?: string
  menuNm: string
  screenId?: string
  menuUrl?: string
  icon?: string
  sortOrder: number
}

interface SiteConfig {
  projectId: string
  siteNm: string
  navStyle: 'top-dropdown' | 'top-side'
}

interface ScreenOption {
  screenId: string
  screenNm: string
}

const ICON_OPTIONS = [
  'HomeOutlined', 'DashboardOutlined', 'TableOutlined', 'FormOutlined',
  'FileTextOutlined', 'BarChartOutlined', 'SettingOutlined', 'UserOutlined',
  'TeamOutlined', 'ShopOutlined', 'BankOutlined', 'CalendarOutlined',
  'MessageOutlined', 'BellOutlined', 'StarOutlined', 'HeartOutlined',
]

export const SiteMenuDesignerPage: React.FC = () => {
  const { currentProject } = useAuthStore()
  const projectId = currentProject?.projectId ?? 'DEMO'
  const queryClient = useQueryClient()

  const [configForm] = Form.useForm()
  const [menuForm] = Form.useForm()
  const [editingMenu, setEditingMenu] = useState<SiteMenuItem | null>(null)
  const [showMenuForm, setShowMenuForm] = useState(false)

  // 사이트 설정 조회
  const { data: config } = useQuery<SiteConfig>({
    queryKey: ['siteConfig', projectId],
    queryFn: () => api.get('/site/config', { params: { projectId } }).then(r => r.data.data),
  })

  // 메뉴 목록 조회
  const { data: menus = [] } = useQuery<SiteMenuItem[]>({
    queryKey: ['siteMenus', projectId],
    queryFn: () => api.get('/site/menus', { params: { projectId } }).then(r => r.data.data ?? []),
  })

  // 화면 목록 (연결할 화면 선택용)
  const { data: screens = [] } = useQuery<ScreenOption[]>({
    queryKey: ['adminScreens', projectId],
    queryFn: () => api.get('/schema/admin/screens', { params: { projectId } }).then(r => r.data.data ?? []),
  })

  useEffect(() => {
    if (config) configForm.setFieldsValue(config)
  }, [config, configForm])

  // 설정 저장
  const saveConfigMutation = useMutation({
    mutationFn: (v: SiteConfig) => api.post('/site/config', { ...v, projectId }),
    onSuccess: () => { message.success('사이트 설정이 저장되었습니다.'); queryClient.invalidateQueries({ queryKey: ['siteConfig'] }) },
    onError: () => message.error('저장 중 오류가 발생했습니다.'),
  })

  // 메뉴 저장
  const saveMenuMutation = useMutation({
    mutationFn: (v: Partial<SiteMenuItem>) => api.post('/site/menus', { ...v, projectId }),
    onSuccess: () => {
      message.success('메뉴가 저장되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['siteMenus'] })
      setShowMenuForm(false)
      setEditingMenu(null)
      menuForm.resetFields()
    },
    onError: () => message.error('저장 중 오류가 발생했습니다.'),
  })

  // 메뉴 삭제
  const deleteMenuMutation = useMutation({
    mutationFn: (menuId: string) => api.delete(`/site/menus/${menuId}`),
    onSuccess: () => { message.success('메뉴가 삭제되었습니다.'); queryClient.invalidateQueries({ queryKey: ['siteMenus'] }) },
  })

  // 순서 변경 저장
  const saveOrderMutation = useMutation({
    mutationFn: (items: { menuId: string; parentId?: string }[]) => api.post('/site/menus/order', items),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['siteMenus'] }),
  })

  const topMenus = menus.filter(m => !m.parentId).sort((a, b) => a.sortOrder - b.sortOrder)
  const subMenusOf = (parentId: string) => menus.filter(m => m.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder)

  const moveMenu = (items: SiteMenuItem[], idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= items.length) return
    const reordered = [...items]
    ;[reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]]
    const orderItems = reordered.map((m, i) => ({ menuId: m.menuId, parentId: m.parentId, sortOrder: i }))
    saveOrderMutation.mutate(orderItems)
  }

  const openAddMenu = (parentId?: string) => {
    setEditingMenu(null)
    menuForm.resetFields()
    menuForm.setFieldsValue({ parentId: parentId ?? '', sortOrder: menus.length })
    setShowMenuForm(true)
  }

  const openEditMenu = (m: SiteMenuItem) => {
    setEditingMenu(m)
    menuForm.setFieldsValue(m)
    setShowMenuForm(true)
  }

  const handleSaveMenu = (v: Partial<SiteMenuItem>) => {
    saveMenuMutation.mutate({
      ...v,
      menuId: editingMenu?.menuId ?? `SMNU_${nanoid(8)}`,
    })
  }

  const renderMenuRow = (m: SiteMenuItem, list: SiteMenuItem[], idx: number, isChild = false) => (
    <div key={m.menuId}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
        background: isChild ? '#f9f9f9' : '#fff',
        borderLeft: isChild ? '3px solid #d9d9d9' : 'none',
        marginLeft: isChild ? 24 : 0,
        border: '1px solid #f0f0f0', borderRadius: 6, marginBottom: 4,
      }}>
        <MenuOutlined style={{ color: '#aaa', cursor: 'grab' }} />
        <div style={{ flex: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button size="small" icon={<ArrowUpOutlined />} disabled={idx === 0}
            onClick={() => moveMenu(list, idx, -1)} style={{ height: 18, padding: '0 4px' }} />
          <Button size="small" icon={<ArrowDownOutlined />} disabled={idx === list.length - 1}
            onClick={() => moveMenu(list, idx, 1)} style={{ height: 18, padding: '0 4px' }} />
        </div>

        <div style={{ flex: 1 }}>
          <Text strong>{m.menuNm}</Text>
          {m.screenId && <Tag color="blue" style={{ marginLeft: 6, fontSize: 11 }}>{m.screenId}</Tag>}
          {m.menuUrl && <Tag color="cyan" style={{ marginLeft: 6, fontSize: 11 }}>{m.menuUrl}</Tag>}
          {m.icon && <Tag style={{ marginLeft: 4, fontSize: 11 }}>{m.icon}</Tag>}
        </div>

        <Space size={4}>
          {!isChild && (
            <Tooltip title="하위 메뉴 추가">
              <Button size="small" icon={<PlusOutlined />} onClick={() => openAddMenu(m.menuId)}>
                하위
              </Button>
            </Tooltip>
          )}
          <Button size="small" onClick={() => openEditMenu(m)}>편집</Button>
          <Popconfirm
            title="메뉴를 삭제하시겠습니까?"
            description={isChild ? '' : '하위 메뉴도 함께 삭제됩니다.'}
            onConfirm={() => deleteMenuMutation.mutate(m.menuId)}
            okText="삭제" cancelText="취소" okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      </div>

      {/* 하위 메뉴 */}
      {!isChild && subMenusOf(m.menuId).map((sub, si, subList) =>
        renderMenuRow(sub, subList, si, true)
      )}
    </div>
  )

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <Title level={4} style={{ marginBottom: 24 }}>사이트 메뉴 설정</Title>

      {/* 사이트 기본 설정 */}
      <Card
        size="small"
        title={<Space><SettingOutlined />사이트 기본 설정</Space>}
        style={{ marginBottom: 20 }}
        extra={
          <Button type="primary" icon={<SaveOutlined />}
            loading={saveConfigMutation.isPending}
            onClick={() => configForm.submit()}>
            설정 저장
          </Button>
        }
      >
        <Form form={configForm} layout="inline" onFinish={v => saveConfigMutation.mutate(v as SiteConfig)}>
          <Form.Item name="siteNm" label="사이트 이름" rules={[{ required: true }]}>
            <Input placeholder="내 사이트" style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="navStyle" label="메뉴 레이아웃" initialValue="top-side">
            <Radio.Group>
              <Radio.Button value="top-dropdown">
                상단 전용 (드롭다운)
              </Radio.Button>
              <Radio.Button value="top-side">
                상단 + 좌측 사이드바
              </Radio.Button>
            </Radio.Group>
          </Form.Item>
        </Form>

        <div style={{ marginTop: 12, padding: 10, background: '#f5f5f5', borderRadius: 6, fontSize: 12, color: '#666' }}>
          <b>상단 전용:</b> 1단계 메뉴가 상단에, 2단계 메뉴는 드롭다운으로 표시<br />
          <b>상단 + 좌측:</b> 1단계 메뉴가 상단 탭으로, 선택하면 2단계 메뉴가 좌측 사이드바에 표시
        </div>
      </Card>

      {/* 메뉴 구성 */}
      <Card
        size="small"
        title={<Space><GlobalOutlined />메뉴 구성</Space>}
        extra={
          <Button icon={<PlusOutlined />} type="primary" onClick={() => openAddMenu()}>
            1단계 메뉴 추가
          </Button>
        }
      >
        {topMenus.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: '#aaa' }}>
            메뉴가 없습니다. 상단의 "1단계 메뉴 추가" 버튼으로 추가해주세요.
          </div>
        ) : (
          <div style={{ marginBottom: 8 }}>
            {topMenus.map((m, idx) => renderMenuRow(m, topMenus, idx, false))}
          </div>
        )}

        {/* 메뉴 추가/편집 인라인 폼 */}
        {showMenuForm && (
          <>
            <Divider />
            <Card size="small" title={editingMenu ? '메뉴 편집' : '메뉴 추가'} style={{ background: '#f0f5ff' }}>
              <Form form={menuForm} layout="vertical" onFinish={handleSaveMenu}>
                <Row gutter={12}>
                  <Col span={8}>
                    <Form.Item name="menuNm" label="메뉴명" rules={[{ required: true }]}>
                      <Input placeholder="예: 대시보드" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="screenId" label="연결 화면">
                      <Select
                        allowClear placeholder="화면 선택"
                        showSearch
                        optionFilterProp="label"
                        options={screens.map((s: ScreenOption) => ({ value: s.screenId, label: `[${s.screenId}] ${s.screenNm}` }))}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="menuUrl" label="외부 URL (직접 입력)">
                      <Input placeholder="예: /app/SCR_001 또는 https://..." />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="icon" label="아이콘">
                      <Select allowClear placeholder="아이콘 선택" options={ICON_OPTIONS.map(i => ({ value: i, label: i }))} />
                    </Form.Item>
                  </Col>
                  <Form.Item name="parentId" hidden><Input /></Form.Item>
                  <Form.Item name="sortOrder" hidden><Input /></Form.Item>
                </Row>
                <Space>
                  <Button type="primary" htmlType="submit" loading={saveMenuMutation.isPending}>저장</Button>
                  <Button onClick={() => { setShowMenuForm(false); setEditingMenu(null) }}>취소</Button>
                </Space>
              </Form>
            </Card>
          </>
        )}
      </Card>

      {/* 사이트 접속 안내 */}
      <Card size="small" style={{ marginTop: 16, background: '#f6ffed', borderColor: '#b7eb8f' }}>
        <Text style={{ fontSize: 13 }}>
          <b>사이트 접속 URL:</b>{' '}
          <Text code>http://localhost:3000/site</Text>
          {' '}— 설정한 메뉴와 로그인 기능이 제공됩니다.
        </Text>
      </Card>
    </div>
  )
}

export default SiteMenuDesignerPage
