import React, { useState } from 'react'
import { Table, Button, Modal, Form, Input, InputNumber, Select, Tag, message, Typography } from 'antd'
import { PlusOutlined, EditOutlined } from '@ant-design/icons'
import { ResizableModal } from '@/components/ui/ResizableModal'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/axios'

const { Title } = Typography

const ProjectManagementPage: React.FC = () => {
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/admin/projects').then(r => r.data.data),
  })

  const saveMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => api.post('/admin/projects', values),
    onSuccess: () => {
      message.success('저장되었습니다.')
      setOpen(false)
      form.resetFields()
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: () => message.error('저장 중 오류가 발생했습니다.'),
  })

  const columns = [
    { title: '프로젝트ID', dataIndex: 'projectId', width: 150 },
    { title: '프로젝트명', dataIndex: 'projectNm' },
    { title: '설명', dataIndex: 'description', ellipsis: true },
    { title: '순서', dataIndex: 'sortOrder', width: 70 },
    {
      title: '사용여부', dataIndex: 'useYn', width: 90,
      render: (v: string) => <Tag color={v === 'Y' ? 'green' : 'red'}>{v === 'Y' ? '사용' : '미사용'}</Tag>,
    },
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
        <Title level={4} style={{ margin: 0 }}>프로젝트 관리</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setOpen(true) }}>프로젝트 등록</Button>
      </div>
      <Table dataSource={data ?? []} columns={columns} rowKey="projectId" loading={isLoading} size="middle" />

      <ResizableModal title="프로젝트 등록/수정" open={open} onOk={() => form.submit()} onCancel={() => setOpen(false)} okText="저장">
        <Form form={form} layout="vertical" onFinish={saveMutation.mutate}>
          <Form.Item name="projectId" label="프로젝트ID" rules={[{ required: true, message: '프로젝트ID를 입력하세요' }]}>
            <Input placeholder="예: HR_SYSTEM" style={{ textTransform: 'uppercase' }} />
          </Form.Item>
          <Form.Item name="projectNm" label="프로젝트명" rules={[{ required: true, message: '프로젝트명을 입력하세요' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="설명">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="sortOrder" label="순서" initialValue={0}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="useYn" label="사용여부" initialValue="Y">
            <Select options={[{ value: 'Y', label: '사용' }, { value: 'N', label: '미사용' }]} />
          </Form.Item>
        </Form>
      </ResizableModal>
    </div>
  )
}

export default ProjectManagementPage
