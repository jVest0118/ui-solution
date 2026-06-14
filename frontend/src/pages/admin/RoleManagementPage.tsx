import React, { useState } from 'react'
import { Table, Button, Modal, Form, Input, InputNumber, Select, Tag, message, Typography } from 'antd'
import { PlusOutlined, EditOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/axios'

const { Title } = Typography

const RoleManagementPage: React.FC = () => {
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.get('/admin/roles').then(r => r.data.data),
  })

  const saveMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => api.post('/admin/roles', values),
    onSuccess: () => { message.success('저장되었습니다.'); setOpen(false); form.resetFields(); queryClient.invalidateQueries({ queryKey: ['roles'] }) },
    onError: () => message.error('저장 중 오류가 발생했습니다.'),
  })

  const columns = [
    { title: '롤ID', dataIndex: 'roleId', width: 150 },
    { title: '롤명', dataIndex: 'roleNm' },
    { title: '설명', dataIndex: 'roleDesc', ellipsis: true },
    { title: '레벨', dataIndex: 'roleLevel', width: 80 },
    { title: '사용여부', dataIndex: 'useYn', width: 90, render: (v: string) => <Tag color={v === 'Y' ? 'green' : 'red'}>{v === 'Y' ? '사용' : '미사용'}</Tag> },
    {
      title: '작업', width: 80,
      render: (_: unknown, r: Record<string, unknown>) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => { form.setFieldsValue(r); setOpen(true) }}>편집</Button>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>롤 관리</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setOpen(true) }}>롤 등록</Button>
      </div>
      <Table dataSource={data ?? []} columns={columns} rowKey="roleId" loading={isLoading} size="middle" />
      <Modal title="롤 등록/수정" open={open} onOk={() => form.submit()} onCancel={() => setOpen(false)} okText="저장">
        <Form form={form} layout="vertical" onFinish={saveMutation.mutate}>
          <Form.Item name="roleId" label="롤ID" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="roleNm" label="롤명" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="roleDesc" label="설명"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="roleLevel" label="레벨" initialValue={10}><InputNumber min={1} max={99} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="useYn" label="사용여부" initialValue="Y">
            <Select options={[{ value: 'Y', label: '사용' }, { value: 'N', label: '미사용' }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default RoleManagementPage
