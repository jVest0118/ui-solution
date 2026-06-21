import React, { useState } from 'react'
import { Table, Button, Modal, Form, Input, InputNumber, Select, Tag, message, Typography } from 'antd'
import { PlusOutlined, EditOutlined } from '@ant-design/icons'
import { ResizableModal } from '@/components/ui/ResizableModal'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/axios'

const { Title } = Typography

const MenuManagementPage: React.FC = () => {
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['menus'],
    queryFn: () => api.get('/admin/menus').then(r => r.data.data),
  })

  const saveMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => api.post('/admin/menus', values),
    onSuccess: () => { message.success('저장되었습니다.'); setOpen(false); form.resetFields(); queryClient.invalidateQueries({ queryKey: ['menus'] }) },
    onError: () => message.error('저장 중 오류가 발생했습니다.'),
  })

  const menuOptions = (data ?? []).map((m: Record<string, string>) => ({ value: m.menuId, label: m.menuNm }))

  const columns = [
    { title: '메뉴ID', dataIndex: 'menuId', width: 120 },
    { title: '상위메뉴', dataIndex: 'parentId', width: 120 },
    { title: '메뉴명', dataIndex: 'menuNm' },
    { title: 'URL', dataIndex: 'menuUrl', ellipsis: true },
    { title: '순서', dataIndex: 'sortOrder', width: 70 },
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
        <Title level={4} style={{ margin: 0 }}>메뉴 관리</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setOpen(true) }}>메뉴 등록</Button>
      </div>
      <Table dataSource={data ?? []} columns={columns} rowKey="menuId" loading={isLoading} size="middle" />
      <ResizableModal title="메뉴 등록/수정" open={open} onOk={() => form.submit()} onCancel={() => setOpen(false)} okText="저장">
        <Form form={form} layout="vertical" onFinish={saveMutation.mutate}>
          <Form.Item name="menuId" label="메뉴ID" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="parentId" label="상위메뉴"><Select options={menuOptions} allowClear placeholder="최상위 메뉴" /></Form.Item>
          <Form.Item name="menuNm" label="메뉴명" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="menuUrl" label="URL"><Input placeholder="/admin/example" /></Form.Item>
          <Form.Item name="menuIcon" label="아이콘"><Input placeholder="HomeOutlined" /></Form.Item>
          <Form.Item name="sortOrder" label="순서" initialValue={0}><InputNumber style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="useYn" label="사용여부" initialValue="Y">
            <Select options={[{ value: 'Y', label: '사용' }, { value: 'N', label: '미사용' }]} />
          </Form.Item>
        </Form>
      </ResizableModal>
    </div>
  )
}

export default MenuManagementPage
