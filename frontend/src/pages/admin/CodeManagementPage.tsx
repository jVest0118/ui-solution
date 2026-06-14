import React, { useState } from 'react'
import { Table, Button, Modal, Form, Input, InputNumber, Select, Tag, message, Typography, Row, Col, Card } from 'antd'
import { PlusOutlined, EditOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/axios'

const { Title } = Typography

const CodeManagementPage: React.FC = () => {
  const [groupOpen, setGroupOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [groupForm] = Form.useForm()
  const [detailForm] = Form.useForm()
  const queryClient = useQueryClient()

  const { data: groups, isLoading: groupLoading } = useQuery({
    queryKey: ['codeGroups'],
    queryFn: () => api.get('/admin/codes/groups').then(r => r.data.data),
  })

  const { data: details, isLoading: detailLoading } = useQuery({
    queryKey: ['codeDetails', selectedGroup],
    queryFn: () => api.get(`/admin/codes/groups/${selectedGroup}/details`).then(r => r.data.data),
    enabled: !!selectedGroup,
  })

  const saveGroupMutation = useMutation({
    mutationFn: (v: Record<string, unknown>) => api.post('/admin/codes/groups', v),
    onSuccess: () => { message.success('저장되었습니다.'); setGroupOpen(false); groupForm.resetFields(); queryClient.invalidateQueries({ queryKey: ['codeGroups'] }) },
  })

  const saveDetailMutation = useMutation({
    mutationFn: (v: Record<string, unknown>) => api.post(`/admin/codes/groups/${selectedGroup}/details`, v),
    onSuccess: () => { message.success('저장되었습니다.'); setDetailOpen(false); detailForm.resetFields(); queryClient.invalidateQueries({ queryKey: ['codeDetails', selectedGroup] }) },
  })

  const groupColumns = [
    { title: '그룹코드', dataIndex: 'groupCd', width: 130 },
    { title: '그룹명', dataIndex: 'groupNm' },
    { title: '사용여부', dataIndex: 'useYn', width: 90, render: (v: string) => <Tag color={v === 'Y' ? 'green' : 'red'}>{v === 'Y' ? '사용' : '미사용'}</Tag> },
    {
      title: '선택', width: 80,
      render: (_: unknown, r: Record<string, string>) => (
        <Button size="small" type={selectedGroup === r.groupCd ? 'primary' : 'default'} onClick={() => setSelectedGroup(r.groupCd)}>상세보기</Button>
      ),
    },
  ]

  const detailColumns = [
    { title: '코드값', dataIndex: 'codeVal', width: 120 },
    { title: '코드명', dataIndex: 'codeNm' },
    { title: '순서', dataIndex: 'sortOrder', width: 70 },
    { title: '사용여부', dataIndex: 'useYn', width: 90, render: (v: string) => <Tag color={v === 'Y' ? 'green' : 'red'}>{v === 'Y' ? '사용' : '미사용'}</Tag> },
    {
      title: '작업', width: 80,
      render: (_: unknown, r: Record<string, unknown>) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => { detailForm.setFieldsValue(r); setDetailOpen(true) }}>편집</Button>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Title level={4} style={{ marginBottom: 16 }}>공통코드 관리</Title>
      <Row gutter={16}>
        <Col span={10}>
          <Card title="코드 그룹" extra={<Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => { groupForm.resetFields(); setGroupOpen(true) }}>등록</Button>}>
            <Table dataSource={groups ?? []} columns={groupColumns} rowKey="groupCd" loading={groupLoading} size="small" pagination={false} scroll={{ y: 500 }} />
          </Card>
        </Col>
        <Col span={14}>
          <Card
            title={selectedGroup ? `코드 상세 — ${selectedGroup}` : '코드 상세 (그룹 선택)'}
            extra={selectedGroup && <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => { detailForm.resetFields(); setDetailOpen(true) }}>등록</Button>}
          >
            <Table dataSource={details ?? []} columns={detailColumns} rowKey="codeVal" loading={detailLoading} size="small" pagination={false} scroll={{ y: 500 }} />
          </Card>
        </Col>
      </Row>

      <Modal title="코드그룹 등록/수정" open={groupOpen} onOk={() => groupForm.submit()} onCancel={() => setGroupOpen(false)} okText="저장">
        <Form form={groupForm} layout="vertical" onFinish={saveGroupMutation.mutate}>
          <Form.Item name="groupCd" label="그룹코드" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="groupNm" label="그룹명" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="설명"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="useYn" label="사용여부" initialValue="Y"><Select options={[{ value: 'Y', label: '사용' }, { value: 'N', label: '미사용' }]} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="코드상세 등록/수정" open={detailOpen} onOk={() => detailForm.submit()} onCancel={() => setDetailOpen(false)} okText="저장">
        <Form form={detailForm} layout="vertical" onFinish={saveDetailMutation.mutate}>
          <Form.Item name="codeVal" label="코드값" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="codeNm" label="코드명" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="sortOrder" label="순서" initialValue={0}><InputNumber style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="useYn" label="사용여부" initialValue="Y"><Select options={[{ value: 'Y', label: '사용' }, { value: 'N', label: '미사용' }]} /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default CodeManagementPage
