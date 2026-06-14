import React, { useState } from 'react'
import { Table, Button, Modal, Form, Input, Select, Space, Tag, Popconfirm, message, Typography } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/axios'

const { Title } = Typography

const UserManagementPage: React.FC = () => {
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/admin/users').then(r => r.data.data),
  })

  const saveMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => api.post('/admin/users', values),
    onSuccess: () => { message.success('저장되었습니다.'); setOpen(false); form.resetFields(); queryClient.invalidateQueries({ queryKey: ['users'] }) },
    onError: () => message.error('저장 중 오류가 발생했습니다.'),
  })

  const columns = [
    { title: '아이디', dataIndex: 'userId', width: 120 },
    { title: '이름', dataIndex: 'userNm' },
    { title: '이메일', dataIndex: 'email' },
    { title: '부서', dataIndex: 'deptNm' },
    { title: '사용여부', dataIndex: 'useYn', width: 90, render: (v: string) => <Tag color={v === 'Y' ? 'green' : 'red'}>{v === 'Y' ? '사용' : '미사용'}</Tag> },
    {
      title: '작업', width: 80,
      render: (_: unknown, r: Record<string, string>) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => { form.setFieldsValue(r); setOpen(true) }}>편집</Button>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>사용자 관리</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setOpen(true) }}>사용자 등록</Button>
      </div>
      <Table dataSource={data ?? []} columns={columns} rowKey="userId" loading={isLoading} size="middle" />
      <Modal title="사용자 등록/수정" open={open} onOk={() => form.submit()} onCancel={() => setOpen(false)} okText="저장">
        <Form form={form} layout="vertical" onFinish={saveMutation.mutate}>
          <Form.Item name="userId" label="아이디" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="userNm" label="이름" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="password" label="비밀번호"><Input.Password placeholder="변경 시에만 입력" /></Form.Item>
          <Form.Item name="email" label="이메일"><Input /></Form.Item>
          <Form.Item name="deptNm" label="부서"><Input /></Form.Item>
          <Form.Item name="useYn" label="사용여부" initialValue="Y">
            <Select options={[{ value: 'Y', label: '사용' }, { value: 'N', label: '미사용' }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default UserManagementPage
