import React, { useState } from 'react'
import {
  Table, Button, Space, Typography, Popconfirm, message,
  Modal, Form, Input, Select, InputNumber, Switch, Tag, Tooltip,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ApiOutlined,
  CheckCircleOutlined, ReloadOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/axios'
import { useAuthStore } from '@/store/authStore'
import type { ColumnType } from 'antd/es/table'

const { Title } = Typography

interface ApiConn {
  id: number
  connNm: string
  baseUrl: string
  healthUrl: string | null
  method: string
  reqHeaders: string | null
  timeoutMs: number
  description: string | null
  useYn: string
  createdAt: string | null
}

const MethodTag: React.FC<{ method: string }> = ({ method }) => (
  <Tag color={method === 'GET' ? 'green' : 'blue'} style={{ fontSize: 11 }}>{method}</Tag>
)

const ApiConnectionPage: React.FC = () => {
  const { currentProject } = useAuthStore()
  const queryClient = useQueryClient()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ApiConn | null>(null)
  const [form] = Form.useForm()
  const [testResults, setTestResults] = useState<Record<number, { status: string; ms: number; code: number | null }>>({})
  const [testing, setTesting] = useState<number | null>(null)

  const { data: list = [], isLoading } = useQuery<ApiConn[]>({
    queryKey: ['apiConnections', currentProject?.projectId],
    queryFn: () => api.get('/api-conn', {
      params: { projectId: currentProject?.projectId },
    }).then(r => r.data.data ?? []),
  })

  const saveMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      editing
        ? api.put(`/api-conn/${editing.id}`, values).then(r => r.data.data)
        : api.post('/api-conn', { ...values, projectId: currentProject?.projectId }).then(r => r.data.data),
    onSuccess: () => {
      message.success(editing ? '저장되었습니다.' : '등록되었습니다.')
      setModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['apiConnections'] })
    },
    onError: () => message.error('저장 중 오류가 발생했습니다.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api-conn/${id}`),
    onSuccess: () => { message.success('삭제되었습니다.'); queryClient.invalidateQueries({ queryKey: ['apiConnections'] }) },
    onError: () => message.error('삭제 중 오류가 발생했습니다.'),
  })

  const openNew = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ method: 'GET', timeoutMs: 5000, useYn: true })
    setModalOpen(true)
  }

  const openEdit = (row: ApiConn) => {
    setEditing(row)
    form.setFieldsValue({
      ...row,
      useYn: row.useYn === 'Y',
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    saveMutation.mutate({ ...values, useYn: values.useYn ? 'Y' : 'N' })
  }

  const testConnection = async (row: ApiConn) => {
    setTesting(row.id)
    try {
      const res = await api.get(`/api-conn/${row.id}/status`)
      const d = res.data.data
      setTestResults(prev => ({ ...prev, [row.id]: { status: d.status, ms: d.responseTimeMs, code: d.statusCode } }))
    } catch {
      setTestResults(prev => ({ ...prev, [row.id]: { status: 'ERROR', ms: 0, code: null } }))
    } finally {
      setTesting(null)
    }
  }

  const statusColor = (s?: string) => ({ UP: '#22c55e', DOWN: '#ef4444', TIMEOUT: '#f59e0b', ERROR: '#ef4444' }[s ?? ''] ?? '#94a3b8')

  const columns: ColumnType<ApiConn>[] = [
    { title: '이름', dataIndex: 'connNm', width: 150, ellipsis: true, render: (v, r) => (
      <Space>
        <ApiOutlined style={{ color: '#6366f1' }} />
        <span style={{ fontWeight: 600 }}>{v}</span>
        {r.useYn !== 'Y' && <Tag color="default" style={{ fontSize: 10 }}>비활성</Tag>}
      </Space>
    )},
    { title: '메서드', dataIndex: 'method', width: 80, render: v => <MethodTag method={v} /> },
    { title: '기본 URL', dataIndex: 'baseUrl', ellipsis: true, width: 240,
      render: v => <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#334155' }}>{v}</span> },
    { title: '상태확인 URL', dataIndex: 'healthUrl', ellipsis: true, width: 200,
      render: (v, r) => <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#64748b' }}>{v ?? r.baseUrl}</span> },
    { title: '타임아웃', dataIndex: 'timeoutMs', width: 90, align: 'center' as const,
      render: v => <span style={{ fontSize: 12 }}>{(v/1000).toFixed(1)}s</span> },
    { title: '설명', dataIndex: 'description', ellipsis: true, width: 160,
      render: v => <span style={{ fontSize: 12, color: '#64748b' }}>{v ?? '-'}</span> },
    {
      title: '연결 테스트', width: 130, align: 'center' as const,
      render: (_: unknown, r: ApiConn) => {
        const res = testResults[r.id]
        return (
          <Space>
            {res && (
              <Tooltip title={res.code != null ? `HTTP ${res.code} · ${res.ms}ms` : `${res.ms}ms`}>
                <span style={{ fontSize: 11, fontWeight: 600, color: statusColor(res.status) }}>
                  {res.status === 'UP' ? '●' : '●'} {res.status} {res.ms > 0 ? `${res.ms}ms` : ''}
                </span>
              </Tooltip>
            )}
            <Button size="small" icon={<ReloadOutlined />}
              loading={testing === r.id}
              onClick={() => testConnection(r)}>테스트</Button>
          </Space>
        )
      },
    },
    {
      title: '작업', width: 110, fixed: 'right' as const,
      render: (_: unknown, r: ApiConn) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>편집</Button>
          <Popconfirm title="삭제하시겠습니까?" onConfirm={() => deleteMutation.mutate(r.id)}
            okText="삭제" cancelText="취소" okButtonProps={{ danger: true }}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Space>
          <Title level={4} style={{ margin: 0 }}>연계API 설정</Title>
          {currentProject && <Tag color="blue">{currentProject.projectNm}</Tag>}
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>API 연결 등록</Button>
      </div>

      <div style={{ marginBottom: 12, padding: '10px 16px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, fontSize: 13, color: '#0369a1' }}>
        <ApiOutlined style={{ marginRight: 6 }} />
        외부 시스템과 연동하는 API 연결 정보를 관리합니다. 등록된 연결은 <strong>API 상태조회</strong> 메뉴에서 실시간 통신 상태를 확인할 수 있습니다.
      </div>

      <Table
        dataSource={list} columns={columns} rowKey="id"
        loading={isLoading} size="middle" tableLayout="fixed"
        scroll={{ x: 1200 }}
        pagination={{ pageSize: 20, showTotal: t => `총 ${t}개`, showSizeChanger: false }}
      />

      {/* 등록/수정 모달 */}
      <Modal
        title={editing ? 'API 연결 수정' : 'API 연결 등록'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText="저장" cancelText="취소"
        confirmLoading={saveMutation.isPending}
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="connNm" label="연결 이름" rules={[{ required: true, message: '이름을 입력하세요.' }]}>
            <Input placeholder="예: 결제 게이트웨이, 사용자 인증 서버" />
          </Form.Item>

          <Form.Item name="method" label="HTTP 메서드" rules={[{ required: true }]}>
            <Select options={[{ value: 'GET', label: 'GET' }, { value: 'POST', label: 'POST' }]} style={{ width: 120 }} />
          </Form.Item>

          <Form.Item name="baseUrl" label="기본 URL" rules={[{ required: true, message: 'URL을 입력하세요.' }]}>
            <Input placeholder="https://api.example.com" />
          </Form.Item>

          <Form.Item name="healthUrl" label="상태확인 URL" extra="비워두면 기본 URL로 상태를 확인합니다.">
            <Input placeholder="https://api.example.com/health" />
          </Form.Item>

          <Form.Item name="timeoutMs" label="타임아웃 (ms)" rules={[{ required: true }]}>
            <InputNumber min={500} max={30000} step={500} style={{ width: 160 }} addonAfter="ms" />
          </Form.Item>

          <Form.Item name="reqHeaders" label="요청 헤더 (JSON)" extra='예: {"Authorization": "Bearer TOKEN", "X-API-Key": "KEY"}'>
            <Input.TextArea rows={3} placeholder='{"Authorization": "Bearer your-token"}' />
          </Form.Item>

          <Form.Item name="description" label="설명">
            <Input.TextArea rows={2} placeholder="이 API 연결에 대한 설명" />
          </Form.Item>

          <Form.Item name="useYn" label="사용여부" valuePropName="checked">
            <Switch checkedChildren="사용" unCheckedChildren="미사용" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default ApiConnectionPage
