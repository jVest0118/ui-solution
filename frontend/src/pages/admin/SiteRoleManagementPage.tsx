import React, { useState } from 'react'
import {
  Table, Button, Modal, Form, Input, Select, Space, Tag, message,
  Typography, Tabs, Checkbox, Tooltip, Popconfirm, Row, Col, Card,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, UserAddOutlined, LockOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/axios'

const { Title } = Typography

type Role = { roleId: string; projectId: string; roleNm: string; roleDesc?: string; sortOrder: number; useYn: string }
type RoleUser = { userId: string; userNm: string; email: string; grantedAt: string }
type RoleScreen = { screenId: string; screenNm: string; canRead: string; canCreate: string; canUpdate: string; canDelete: string; canExcel: string }
type Screen = { screenId: string; screenNm: string; screenType: string }

const SiteRoleManagementPage: React.FC = () => {
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [roleModalOpen, setRoleModalOpen] = useState(false)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('users')
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  // ─── 프로젝트 목록 ────────────────────────────────────────────
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/admin/projects').then(r => r.data.data ?? []),
  })

  // ─── 역할 목록 ────────────────────────────────────────────────
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['site-roles', selectedProject],
    queryFn: () => api.get('/admin/site/roles', { params: { projectId: selectedProject } }).then(r => r.data.data ?? []),
    enabled: !!selectedProject,
  })

  // ─── 역할 사용자 목록 ─────────────────────────────────────────
  const { data: roleUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ['site-role-users', selectedProject, selectedRole?.roleId],
    queryFn: () => api.get(`/admin/site/roles/${selectedRole!.roleId}/users`, { params: { projectId: selectedProject } }).then(r => r.data.data ?? []),
    enabled: !!selectedRole && !!selectedProject,
  })

  // ─── 역할 화면 권한 ───────────────────────────────────────────
  const { data: roleScreens = [], isLoading: screensLoading } = useQuery({
    queryKey: ['site-role-screens', selectedProject, selectedRole?.roleId],
    queryFn: () => api.get(`/admin/site/roles/${selectedRole!.roleId}/screens`, { params: { projectId: selectedProject } }).then(r => r.data.data ?? []),
    enabled: !!selectedRole && !!selectedProject,
  })

  // ─── 프로젝트 화면 전체 목록 ──────────────────────────────────
  const { data: allScreens = [] } = useQuery({
    queryKey: ['project-screens', selectedProject],
    queryFn: () => api.get('/admin/site/roles/screens', { params: { projectId: selectedProject } }).then(r => r.data.data ?? []),
    enabled: !!selectedProject,
  })

  // ─── 플랫폼 사용자 목록 (배정용) ─────────────────────────────
  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/admin/users').then(r => r.data.data ?? []),
  })

  // ─── Mutations ────────────────────────────────────────────────
  const saveRoleMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      api.post('/admin/site/roles', values, { params: { projectId: selectedProject } }),
    onSuccess: () => {
      message.success('저장되었습니다.')
      setRoleModalOpen(false)
      form.resetFields()
      queryClient.invalidateQueries({ queryKey: ['site-roles', selectedProject] })
    },
    onError: () => message.error('저장 중 오류가 발생했습니다.'),
  })

  const deleteRoleMutation = useMutation({
    mutationFn: (roleId: string) =>
      api.delete(`/admin/site/roles/${roleId}`, { params: { projectId: selectedProject } }),
    onSuccess: () => {
      message.success('삭제되었습니다.')
      if (selectedRole?.roleId === deleteRoleMutation.variables) setSelectedRole(null)
      queryClient.invalidateQueries({ queryKey: ['site-roles', selectedProject] })
    },
  })

  const grantUserMutation = useMutation({
    mutationFn: (userId: string) =>
      api.post(`/admin/site/roles/${selectedRole!.roleId}/users/${userId}`, null, { params: { projectId: selectedProject } }),
    onSuccess: () => {
      message.success('사용자를 배정했습니다.')
      setUserModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['site-role-users', selectedProject, selectedRole?.roleId] })
    },
  })

  const revokeUserMutation = useMutation({
    mutationFn: (userId: string) =>
      api.delete(`/admin/site/roles/${selectedRole!.roleId}/users/${userId}`, { params: { projectId: selectedProject } }),
    onSuccess: () => {
      message.success('배정이 해제되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['site-role-users', selectedProject, selectedRole?.roleId] })
    },
  })

  const saveScreenPermMutation = useMutation({
    mutationFn: (req: Record<string, string>) =>
      api.post(`/admin/site/roles/${selectedRole!.roleId}/screens`, req, { params: { projectId: selectedProject } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['site-role-screens', selectedProject, selectedRole?.roleId] }),
  })

  const deleteScreenPermMutation = useMutation({
    mutationFn: (screenId: string) =>
      api.delete(`/admin/site/roles/${selectedRole!.roleId}/screens/${screenId}`, { params: { projectId: selectedProject } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['site-role-screens', selectedProject, selectedRole?.roleId] }),
  })

  // ─── Helpers ──────────────────────────────────────────────────
  const openAdd = () => {
    form.resetFields()
    setRoleModalOpen(true)
  }
  const openEdit = (role: Role) => {
    form.setFieldsValue(role)
    setRoleModalOpen(true)
  }

  const grantedUserIds = new Set(roleUsers.map((u: RoleUser) => u.userId))
  const grantedScreenIds = new Set(roleScreens.map((s: RoleScreen) => s.screenId))

  const getScreenPerm = (screenId: string) =>
    roleScreens.find((s: RoleScreen) => s.screenId === screenId)

  const toggleScreenPerm = (screen: Screen, enabled: boolean) => {
    if (enabled) {
      saveScreenPermMutation.mutate({ screenId: screen.screenId, canRead: 'Y', canCreate: 'N', canUpdate: 'N', canDelete: 'N', canExcel: 'N' })
    } else {
      deleteScreenPermMutation.mutate(screen.screenId)
    }
  }

  const updatePerm = (screenId: string, field: string, checked: boolean) => {
    const cur = getScreenPerm(screenId) ?? { screenId, canRead: 'Y', canCreate: 'N', canUpdate: 'N', canDelete: 'N', canExcel: 'N' }
    saveScreenPermMutation.mutate({ ...cur, [field]: checked ? 'Y' : 'N' } as Record<string, string>)
  }

  // ─── Role columns ─────────────────────────────────────────────
  const roleColumns = [
    { title: '역할 ID', dataIndex: 'roleId', width: 130 },
    { title: '역할명', dataIndex: 'roleNm' },
    {
      title: '사용', dataIndex: 'useYn', width: 70,
      render: (v: string) => <Tag color={v === 'Y' ? 'green' : 'red'}>{v === 'Y' ? '사용' : '미사용'}</Tag>,
    },
    {
      title: '', width: 80,
      render: (_: unknown, r: Role) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={e => { e.stopPropagation(); openEdit(r) }} />
          <Popconfirm title="삭제하시겠습니까?" onConfirm={() => deleteRoleMutation.mutate(r.roleId)}>
            <Button size="small" danger icon={<DeleteOutlined />} onClick={e => e.stopPropagation()} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  // ─── User columns ─────────────────────────────────────────────
  const userColumns = [
    { title: '아이디', dataIndex: 'userId', width: 120 },
    { title: '이름', dataIndex: 'userNm' },
    { title: '이메일', dataIndex: 'email' },
    {
      title: '', width: 80,
      render: (_: unknown, r: RoleUser) => (
        <Popconfirm title="배정을 해제하시겠습니까?" onConfirm={() => revokeUserMutation.mutate(r.userId)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ]

  // ─── Screen permission columns ─────────────────────────────────
  const permColumns = [
    { title: '화면명', dataIndex: 'screenNm', ellipsis: true },
    { title: '화면 ID', dataIndex: 'screenId', width: 120 },
    {
      title: '접근', width: 60,
      render: (_: unknown, s: Screen) => (
        <Checkbox
          checked={grantedScreenIds.has(s.screenId)}
          onChange={e => toggleScreenPerm(s, e.target.checked)}
        />
      ),
    },
    ...(['canRead', 'canCreate', 'canUpdate', 'canDelete', 'canExcel'] as const).map(field => ({
      title: { canRead: '조회', canCreate: '등록', canUpdate: '수정', canDelete: '삭제', canExcel: 'Excel' }[field],
      width: 55,
      render: (_: unknown, s: Screen) => {
        const perm = getScreenPerm(s.screenId)
        return (
          <Checkbox
            checked={perm ? perm[field] === 'Y' : false}
            disabled={!grantedScreenIds.has(s.screenId)}
            onChange={e => updatePerm(s.screenId, field, e.target.checked)}
          />
        )
      },
    })),
  ]

  return (
    <div style={{ padding: 24 }}>
      <Title level={4} style={{ marginBottom: 16 }}>사이트 역할 관리</Title>

      {/* 프로젝트 선택 */}
      <div style={{ marginBottom: 16 }}>
        <Select
          style={{ width: 240 }}
          placeholder="프로젝트 선택"
          value={selectedProject || undefined}
          onChange={v => { setSelectedProject(v); setSelectedRole(null) }}
          options={(projects as { projectId: string; projectNm: string }[]).map(p => ({
            value: p.projectId, label: p.projectNm,
          }))}
        />
      </div>

      {selectedProject && (
        <Row gutter={16}>
          {/* 역할 목록 */}
          <Col span={10}>
            <Card
              size="small"
              title="역할 목록"
              extra={<Button size="small" type="primary" icon={<PlusOutlined />} onClick={openAdd}>역할 추가</Button>}
              style={{ marginBottom: 0 }}
            >
              <Table
                dataSource={roles}
                columns={roleColumns}
                rowKey="roleId"
                loading={rolesLoading}
                size="small"
                pagination={false}
                rowClassName={r => r.roleId === selectedRole?.roleId ? 'ant-table-row-selected' : ''}
                onRow={r => ({ onClick: () => { setSelectedRole(r); setActiveTab('users') } })}
                style={{ cursor: 'pointer' }}
              />
            </Card>
          </Col>

          {/* 역할 상세 */}
          <Col span={14}>
            {selectedRole ? (
              <Card
                size="small"
                title={
                  <Space>
                    <LockOutlined />
                    {selectedRole.roleNm}
                    <Tag>{selectedRole.roleId}</Tag>
                  </Space>
                }
              >
                <Tabs
                  activeKey={activeTab}
                  onChange={setActiveTab}
                  items={[
                    {
                      key: 'users',
                      label: '사용자 배정',
                      children: (
                        <>
                          <div style={{ marginBottom: 8, textAlign: 'right' }}>
                            <Button
                              size="small"
                              type="primary"
                              icon={<UserAddOutlined />}
                              onClick={() => setUserModalOpen(true)}
                            >
                              사용자 추가
                            </Button>
                          </div>
                          <Table
                            dataSource={roleUsers}
                            columns={userColumns}
                            rowKey="userId"
                            loading={usersLoading}
                            size="small"
                            pagination={false}
                          />
                        </>
                      ),
                    },
                    {
                      key: 'screens',
                      label: '화면 권한',
                      children: (
                        <Table
                          dataSource={allScreens}
                          columns={permColumns}
                          rowKey="screenId"
                          loading={screensLoading}
                          size="small"
                          pagination={{ pageSize: 15, size: 'small' }}
                          scroll={{ x: 500 }}
                        />
                      ),
                    },
                  ]}
                />
              </Card>
            ) : (
              <Card size="small" style={{ textAlign: 'center', color: '#999', paddingTop: 40, paddingBottom: 40 }}>
                왼쪽에서 역할을 선택하면 상세 정보가 표시됩니다.
              </Card>
            )}
          </Col>
        </Row>
      )}

      {/* 역할 등록/수정 모달 */}
      <Modal
        title="역할 설정"
        open={roleModalOpen}
        onOk={() => form.submit()}
        onCancel={() => setRoleModalOpen(false)}
        okText="저장"
        confirmLoading={saveRoleMutation.isPending}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={saveRoleMutation.mutate}>
          <Form.Item name="roleId" label="역할 ID" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="roleNm" label="역할명" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="roleDesc" label="설명">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="sortOrder" label="정렬순서" initialValue={0}>
            <Input type="number" />
          </Form.Item>
          <Form.Item name="useYn" label="사용여부" initialValue="Y">
            <Select options={[{ value: 'Y', label: '사용' }, { value: 'N', label: '미사용' }]} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 사용자 배정 모달 */}
      <Modal
        title="사용자 배정"
        open={userModalOpen}
        footer={null}
        onCancel={() => setUserModalOpen(false)}
        width={480}
      >
        <Table
          dataSource={(allUsers as { userId: string; userNm: string; email: string }[]).filter(u => !grantedUserIds.has(u.userId))}
          rowKey="userId"
          size="small"
          pagination={false}
          columns={[
            { title: '아이디', dataIndex: 'userId', width: 120 },
            { title: '이름', dataIndex: 'userNm' },
            { title: '이메일', dataIndex: 'email' },
            {
              title: '',
              width: 70,
              render: (_: unknown, u: { userId: string }) => (
                <Tooltip title="배정">
                  <Button
                    size="small"
                    type="primary"
                    icon={<UserAddOutlined />}
                    loading={grantUserMutation.isPending}
                    onClick={() => grantUserMutation.mutate(u.userId)}
                  />
                </Tooltip>
              ),
            },
          ]}
        />
      </Modal>
    </div>
  )
}

export default SiteRoleManagementPage
