import React, { useState } from 'react'
import {
  Table, Button, Modal, Form, Input, Select, Space, Tag, message,
  Typography, Avatar, Upload
} from 'antd'
import { ResizableModal } from '@/components/ui/ResizableModal'
import {
  PlusOutlined, EditOutlined, UserOutlined, CameraOutlined, LoadingOutlined
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/axios'

const { Title } = Typography

const UserManagementPage: React.FC = () => {
  const [open, setOpen] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/admin/users').then(r => r.data.data),
  })

  const saveMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => api.post('/admin/users', values),
    onSuccess: () => {
      message.success('저장되었습니다.')
      setOpen(false)
      form.resetFields()
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: () => message.error('저장 중 오류가 발생했습니다.'),
  })

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('screenId', 'PROFILE')
      const res = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const fileId = res.data.data?.fileId
      if (fileId) {
        const url = `/api/files/${fileId}/view`
        form.setFieldValue('profileImgUrl', url)
        message.success('이미지가 업로드되었습니다.')
      }
    } catch {
      message.error('이미지 업로드에 실패했습니다.')
    } finally {
      setUploading(false)
    }
    return false  // prevent antd auto-upload
  }

  const openAdd = () => {
    setEditingUserId(null)
    form.resetFields()
    setOpen(true)
  }

  const openEdit = (row: Record<string, unknown>) => {
    setEditingUserId(row.userId as string)
    form.setFieldsValue({ ...row, password: '' })
    setOpen(true)
  }

  const columns = [
    {
      title: '', width: 48,
      render: (_: unknown, r: Record<string, unknown>) => (
        <Avatar
          size={32}
          src={r.profileImgUrl as string | undefined}
          icon={<UserOutlined />}
          style={{ background: '#1677ff' }}
        />
      ),
    },
    { title: '아이디', dataIndex: 'userId', width: 120 },
    { title: '이름', dataIndex: 'userNm' },
    { title: '이메일', dataIndex: 'email' },
    { title: '부서', dataIndex: 'deptNm' },
    {
      title: '사용여부', dataIndex: 'useYn', width: 90,
      render: (v: string) => <Tag color={v === 'Y' ? 'green' : 'red'}>{v === 'Y' ? '사용' : '미사용'}</Tag>,
    },
    {
      title: '작업', width: 80,
      render: (_: unknown, r: Record<string, unknown>) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>편집</Button>
      ),
    },
  ]

  const profileImgUrl = Form.useWatch('profileImgUrl', form) as string | undefined

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>사용자 관리</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>사용자 등록</Button>
      </div>

      <Table dataSource={data ?? []} columns={columns} rowKey="userId" loading={isLoading} size="middle" />

      <ResizableModal
        title={editingUserId ? `사용자 수정 — ${editingUserId}` : '사용자 등록'}
        open={open}
        onOk={() => form.submit()}
        onCancel={() => setOpen(false)}
        okText="저장"
        confirmLoading={saveMutation.isPending}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={saveMutation.mutate}>

          {/* 프로필 이미지 */}
          <Form.Item label="프로필 이미지" style={{ marginBottom: 16 }}>
            <Space align="center">
              <Avatar
                size={72}
                src={profileImgUrl}
                icon={<UserOutlined />}
                style={{ background: '#1677ff', flexShrink: 0 }}
              />
              <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={handleUpload}
              >
                <Button icon={uploading ? <LoadingOutlined /> : <CameraOutlined />} disabled={uploading}>
                  {uploading ? '업로드 중...' : '이미지 변경'}
                </Button>
              </Upload>
            </Space>
          </Form.Item>

          {/* 숨겨진 profileImgUrl 필드 */}
          <Form.Item name="profileImgUrl" hidden><Input /></Form.Item>

          <Form.Item name="userId" label="아이디" rules={[{ required: true }]}>
            <Input disabled={!!editingUserId} />
          </Form.Item>
          <Form.Item name="userNm" label="이름" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="password" label="비밀번호">
            <Input.Password placeholder={editingUserId ? '변경 시에만 입력' : '초기 비밀번호'} />
          </Form.Item>
          <Form.Item name="email" label="이메일"><Input /></Form.Item>
          <Form.Item name="deptNm" label="부서"><Input /></Form.Item>
          <Form.Item name="useYn" label="사용여부" initialValue="Y">
            <Select options={[{ value: 'Y', label: '사용' }, { value: 'N', label: '미사용' }]} />
          </Form.Item>
        </Form>
      </ResizableModal>
    </div>
  )
}

export default UserManagementPage
