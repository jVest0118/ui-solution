import React from 'react'
import { Table, Tag, Button, Space, Typography, Popconfirm, message } from 'antd'
import { PlusOutlined, EditOutlined, PlayCircleOutlined, DeleteOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import api from '@/api/axios'

const { Title } = Typography

const screenTypeLabel: Record<string, { label: string; color: string }> = {
  form:            { label: '입력폼',        color: 'blue' },
  grid:            { label: '그리드조회',    color: 'green' },
  'master-detail': { label: '마스터-디테일', color: 'purple' },
  popup:           { label: '팝업',          color: 'orange' },
  composite:       { label: '복합레이아웃',  color: 'cyan' },
  dashboard:       { label: '대시보드',      color: 'geekblue' },
  report:          { label: '리포트',        color: 'volcano' },
}

const ScreenListPage: React.FC = () => {
  const navigate = useNavigate()
  const { currentProject, roles } = useAuthStore()
  const queryClient = useQueryClient()
  const isSysAdmin = roles.includes('SYSTEM_ADMIN')

  const { data, isLoading } = useQuery<Record<string, unknown>[]>({
    queryKey: ['adminScreens', currentProject?.projectId],
    queryFn: () =>
      api.get('/schema/admin/screens', {
        params: { projectId: currentProject?.projectId },
      }).then(r => r.data.data ?? []),
  })

  const deleteMutation = useMutation({
    mutationFn: (screenId: string) => api.delete(`/schema/admin/screens/${screenId}`),
    onSuccess: () => {
      message.success('화면이 삭제되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['adminScreens'] })
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } }
      message.error(e.response?.data?.message ?? '삭제 중 오류가 발생했습니다.')
    },
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
      title: '작업', width: isSysAdmin ? 200 : 150,
      render: (_: unknown, r: Record<string, unknown>) => (
        <Space>
          <Button size="small" icon={<EditOutlined />}
            onClick={() => navigate(`/admin/screens/${r.screenId}`)}>설계</Button>
          <Button size="small" icon={<PlayCircleOutlined />}
            onClick={() => navigate(`/app/${r.screenId}`)}>실행</Button>
          {isSysAdmin && (
            <Popconfirm
              title="화면 삭제"
              description={`'${r.screenNm}'을(를) 삭제하시겠습니까? 모든 필드 정보도 함께 삭제됩니다.`}
              onConfirm={() => deleteMutation.mutate(r.screenId as string)}
              okText="삭제"
              cancelText="취소"
              okButtonProps={{ danger: true }}
            >
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                loading={deleteMutation.isPending && deleteMutation.variables === r.screenId}
              >
                삭제
              </Button>
            </Popconfirm>
          )}
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
