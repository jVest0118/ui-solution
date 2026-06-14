import React from 'react'
import { Table, Tag, Button, Space, Typography } from 'antd'
import { PlusOutlined, EditOutlined, PlayCircleOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import api from '@/api/axios'

const { Title } = Typography

const screenTypeLabel: Record<string, { label: string; color: string }> = {
  form:            { label: '입력폼',        color: 'blue' },
  grid:            { label: '그리드조회',    color: 'green' },
  'master-detail': { label: '마스터-디테일', color: 'purple' },
  popup:           { label: '팝업',          color: 'orange' },
}

const ScreenListPage: React.FC = () => {
  const navigate = useNavigate()
  const { currentProject } = useAuthStore()

  const { data, isLoading } = useQuery<Record<string, unknown>[]>({
    queryKey: ['adminScreens', currentProject?.projectId],
    queryFn: () =>
      api.get('/schema/admin/screens', {
        params: { projectId: currentProject?.projectId },
      }).then(r => r.data.data ?? []),
  })

  const columns = [
    { title: '화면ID',  dataIndex: 'screenId', width: 150 },
    { title: '화면명',  dataIndex: 'screenNm' },
    {
      title: '유형', dataIndex: 'screenType', width: 130,
      render: (type: string) => {
        const t = screenTypeLabel[type] ?? { label: type, color: 'default' }
        return <Tag color={t.color}>{t.label}</Tag>
      },
    },
    { title: '설명',    dataIndex: 'description', ellipsis: true },
    { title: '버전',    dataIndex: 'version', width: 60 },
    { title: '프로젝트', dataIndex: 'projectId', width: 110, render: (v: string) => v ?? <Tag>플랫폼</Tag> },
    {
      title: '작업', width: 150,
      render: (_: unknown, r: Record<string, unknown>) => (
        <Space>
          <Button size="small" icon={<EditOutlined />}
            onClick={() => navigate(`/admin/screens/${r.screenId}`)}>설계</Button>
          <Button size="small" icon={<PlayCircleOutlined />}
            onClick={() => navigate(`/app/${r.screenId}`)}>실행</Button>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <Title level={4} style={{ margin: 0 }}>화면 목록</Title>
          {currentProject && <Tag color="blue">{currentProject.projectNm}</Tag>}
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/admin/screens/new')}>
          화면 등록
        </Button>
      </div>
      <Table
        dataSource={data ?? []}
        columns={columns}
        rowKey="screenId"
        loading={isLoading}
        size="middle"
        pagination={{ pageSize: 20 }}
      />
    </div>
  )
}

export default ScreenListPage
