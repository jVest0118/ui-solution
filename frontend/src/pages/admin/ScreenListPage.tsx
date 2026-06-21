import React, { useMemo, useState } from 'react'
import {
  Table, Tag, Button, Space, Typography, Popconfirm, message,
  Tooltip, Input, Select, Grid, Dropdown,
} from 'antd'
import {
  PlusOutlined, EditOutlined, PlayCircleOutlined, DeleteOutlined,
  LockOutlined, SearchOutlined, UserOutlined, MoreOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import api from '@/api/axios'
import type { ColumnType } from 'antd/es/table'

const { Title } = Typography

const screenTypeLabel: Record<string, { label: string; color: string }> = {
  form:            { label: '입력폼',        color: 'blue' },
  grid:            { label: '그리드조회',    color: 'green' },
  'master-detail': { label: '마스터-디테일', color: 'purple' },
  popup:           { label: '팝업',          color: 'orange' },
  composite:       { label: '복합레이아웃',  color: 'cyan' },
  dashboard:       { label: '대시보드',      color: 'geekblue' },
  report:          { label: '리포트',        color: 'volcano' },
  canvas:          { label: '캔버스',        color: 'magenta' },
}

interface StatusCfg {
  dot:     string
  label:   string
  tooltip: string
  canEdit: boolean
}

const EDIT_STATUS: Record<string, StatusCfg> = {
  EDITING: {
    dot:     '#ef4444',
    label:   '작업 중',
    tooltip: '다른 사용자가 작업 중입니다. 설계 페이지를 열 수 없습니다.',
    canEdit: false,
  },
  DONE: {
    dot:     '#fca5a5',
    label:   '미커밋',
    tooltip: '작업 완료 후 아직 Git 커밋·Push 되지 않았습니다. 실행은 가능하나 설계는 불가합니다.',
    canEdit: false,
  },
  COMMITTED: {
    dot:     '#4ade80',
    label:   '커밋됨',
    tooltip: 'Git Push 완료 상태입니다. 자유롭게 설계 및 실행 가능합니다.',
    canEdit: true,
  },
}

interface ScreenRow {
  screenId:   string
  screenNm:   string
  screenType: string
  description:string
  version:    number
  projectId:  string
  editStatus: string
  lastEditor: string | null
  lockedBy:   string | null
}

const StatusDot: React.FC<{ row: ScreenRow; currentUser: string; compact?: boolean }> = ({ row, currentUser, compact }) => {
  const status = row.editStatus ?? 'DONE'
  const cfg    = EDIT_STATUS[status] ?? EDIT_STATUS.DONE
  const isMyLock = status === 'EDITING' && row.lockedBy === currentUser
  const editorLabel = row.lockedBy ?? row.lastEditor

  const dot = (
    <span style={{
      display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
      background: cfg.dot, flexShrink: 0,
      boxShadow: status === 'EDITING' ? `0 0 6px ${cfg.dot}` : undefined,
    }} />
  )

  if (compact) {
    return (
      <Tooltip title={isMyLock ? '내가 작업 중입니다.' : cfg.tooltip}>
        {dot}
      </Tooltip>
    )
  }

  return (
    <Tooltip title={isMyLock ? '내가 작업 중입니다.' : cfg.tooltip}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {dot}
        <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{cfg.label}</span>
        {editorLabel && (
          <span style={{ fontSize: 11, color: '#94a3b8' }}>({editorLabel})</span>
        )}
      </div>
    </Tooltip>
  )
}

const ScreenListPage: React.FC = () => {
  const navigate    = useNavigate()
  const { currentProject, roles, userId } = useAuthStore()
  const queryClient = useQueryClient()
  const isSysAdmin  = roles.includes('SYSTEM_ADMIN')
  const currentUser = userId ?? ''

  const screens = Grid.useBreakpoint()
  const isMobile = screens.md === false
  const isTablet = screens.md === true && screens.lg === false

  const [searchNm,   setSearchNm]   = useState('')
  const [filterDev,  setFilterDev]  = useState<string | null>(null)

  const { data: allData = [], isLoading } = useQuery<ScreenRow[]>({
    queryKey: ['adminScreens', currentProject?.projectId],
    queryFn: () =>
      api.get('/schema/admin/screens', {
        params: { projectId: currentProject?.projectId },
      }).then(r => r.data.data ?? []),
    refetchInterval: 10000,
  })

  const developerOptions = useMemo(() => {
    const set = new Set<string>()
    allData.forEach(r => {
      if (r.lastEditor) set.add(r.lastEditor)
      if (r.lockedBy)   set.add(r.lockedBy)
    })
    return Array.from(set).sort().map(v => ({ value: v, label: v }))
  }, [allData])

  const filtered = useMemo(() => {
    return allData.filter(r => {
      const nmOk  = !searchNm.trim() || r.screenNm.includes(searchNm.trim())
      const devOk = !filterDev || r.lastEditor === filterDev || r.lockedBy === filterDev
      return nmOk && devOk
    })
  }, [allData, searchNm, filterDev])

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

  const handleDesign = (row: ScreenRow) => {
    const status   = row.editStatus ?? 'DONE'
    const isMyLock = status === 'EDITING' && row.lockedBy === currentUser
    if (isSysAdmin) { navigate(`/admin/screens/${row.screenId}`); return }
    if (status === 'EDITING' && !isMyLock) {
      message.warning(`${row.lockedBy} 님이 작업 중입니다. 설계 페이지에 접근할 수 없습니다.`)
      return
    }
    if (status === 'DONE') {
      message.warning('미커밋 상태입니다. 담당자가 커밋·Push 후에 설계 가능합니다.')
      return
    }
    navigate(`/admin/screens/${row.screenId}`)
  }

  // ── 모바일 액션 드롭다운 ────────────────────────────────────
  const getMobileActions = (r: ScreenRow) => {
    const status   = r.editStatus ?? 'DONE'
    const isMyLock = status === 'EDITING' && r.lockedBy === currentUser
    const canDesign = status === 'COMMITTED' || isMyLock || isSysAdmin
    const cfg = EDIT_STATUS[status] ?? EDIT_STATUS.DONE

    const items = [
      {
        key: 'design',
        icon: canDesign ? <EditOutlined /> : <LockOutlined />,
        label: canDesign ? '설계' : `설계 불가 (${cfg.label})`,
        disabled: !canDesign,
        onClick: () => canDesign && handleDesign(r),
      },
      {
        key: 'run',
        icon: <PlayCircleOutlined />,
        label: '실행',
        onClick: () => navigate(`/app/${r.screenId}`),
      },
      ...(isSysAdmin ? [{
        key: 'delete',
        icon: <DeleteOutlined />,
        label: '삭제',
        danger: true,
        onClick: () => {
          if (window.confirm(`'${r.screenNm}'을(를) 삭제하시겠습니까?`)) {
            deleteMutation.mutate(r.screenId)
          }
        },
      }] : []),
    ]
    return items
  }

  // ── 공용: 모바일/태블릿 액션 컬럼 ────────────────────────
  const compactActionCol: ColumnType<ScreenRow> = {
    title: '',
    width: 36,
    render: (_: unknown, r: ScreenRow) => (
      <Dropdown menu={{ items: getMobileActions(r) }} placement="bottomRight" trigger={['click']}>
        <Button type="text" icon={<MoreOutlined style={{ fontSize: 18 }} />} size="small" style={{ color: '#64748b' }} />
      </Dropdown>
    ),
  }

  // ── 공용: 화면 정보 카드 컬럼 ─────────────────────────
  const infoCardCol: ColumnType<ScreenRow> = {
    title: '화면',
    render: (_: unknown, r: ScreenRow) => {
      const t = screenTypeLabel[r.screenType] ?? { label: r.screenType, color: 'default' }
      return (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {r.screenNm}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {r.screenId}
          </div>
          <Tag color={t.color} style={{ fontSize: 10, padding: '0 4px', lineHeight: '16px', marginTop: 3 }}>
            {t.label}
          </Tag>
        </div>
      )
    },
  }

  // ── 컬럼 정의 ─────────────────────────────────────────────
  const columns: ColumnType<ScreenRow>[] = isMobile ? [
    // ── 모바일: 상태점 | 화면카드 | ...메뉴 ──────────────
    {
      title: '',
      width: 18,
      render: (_: unknown, r: ScreenRow) => <StatusDot row={r} currentUser={currentUser} compact />,
    },
    infoCardCol,
    compactActionCol,

  ] : isTablet ? [
    // ── 태블릿(768~991px): 상태 | 화면카드 | 작업 ────────
    {
      title: '상태',
      width: 24,
      render: (_: unknown, r: ScreenRow) => <StatusDot row={r} currentUser={currentUser} compact />,
    },
    infoCardCol,
    {
      title: '버전',
      dataIndex: 'version',
      width: 44,
      align: 'center' as const,
    },
    compactActionCol,

  ] : [
    // ── 데스크탑(≥992px): 전체 컬럼 ─────────────────────
    {
      title: '상태', width: 140,
      render: (_: unknown, r: ScreenRow) => <StatusDot row={r} currentUser={currentUser} />,
    },
    { title: '화면ID', dataIndex: 'screenId', width: 160, ellipsis: true },
    { title: '화면명', dataIndex: 'screenNm', width: 160, ellipsis: true },
    {
      title: '유형', dataIndex: 'screenType', width: 120,
      render: (type: string) => {
        const t = screenTypeLabel[type] ?? { label: type, color: 'default' }
        return <Tag color={t.color}>{t.label}</Tag>
      },
    },
    { title: '설명', dataIndex: 'description', ellipsis: true, width: 220 },
    { title: '버전', dataIndex: 'version', width: 55, align: 'center' as const },
    {
      title: '프로젝트', dataIndex: 'projectId', width: 100, ellipsis: true,
      render: (v: string) => v ?? <Tag>플랫폼</Tag>,
    },
    {
      title: '작업', width: isSysAdmin ? 200 : 140, fixed: 'right' as const,
      render: (_: unknown, r: ScreenRow) => {
        const status    = r.editStatus ?? 'DONE'
        const isMyLock  = status === 'EDITING' && r.lockedBy === currentUser
        const canDesign = status === 'COMMITTED' || isMyLock || isSysAdmin
        return (
          <Space>
            <Tooltip title={!canDesign ? (EDIT_STATUS[status]?.tooltip ?? '') : '설계 페이지 열기'}>
              <Button
                size="small"
                icon={canDesign ? <EditOutlined /> : <LockOutlined />}
                onClick={() => handleDesign(r)}
                disabled={!canDesign}
                style={canDesign ? undefined : { opacity: 0.55 }}
              >
                설계
              </Button>
            </Tooltip>
            <Button size="small" icon={<PlayCircleOutlined />} onClick={() => navigate(`/app/${r.screenId}`)}>
              실행
            </Button>
            {isSysAdmin && (
              <Popconfirm
                title="화면 삭제"
                description={`'${r.screenNm}'을(를) 삭제하시겠습니까?`}
                onConfirm={() => deleteMutation.mutate(r.screenId)}
                okText="삭제" cancelText="취소" okButtonProps={{ danger: true }}
              >
                <Button
                  size="small" danger icon={<DeleteOutlined />}
                  loading={deleteMutation.isPending && deleteMutation.variables === r.screenId}
                >
                  삭제
                </Button>
              </Popconfirm>
            )}
          </Space>
        )
      },
    },
  ]

  // ── 범례 ────────────────────────────────────────────────
  const legend = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
      {Object.entries(EDIT_STATUS).map(([key, cfg]) => (
        <Tooltip key={key} title={cfg.tooltip}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'help' }}>
            <span style={{
              display: 'inline-block', width: 9, height: 9, borderRadius: '50%',
              background: cfg.dot,
              boxShadow: key === 'EDITING' ? `0 0 5px ${cfg.dot}` : undefined,
            }} />
            <span style={{ fontSize: 12, color: '#64748b' }}>{cfg.label}</span>
          </div>
        </Tooltip>
      ))}
      {!isMobile && (
        <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 4 }}>
          ↻ 10초마다 자동 갱신
        </span>
      )}
    </div>
  )

  return (
    <div className="rsp-page-content" style={{ padding: 24 }}>

      {/* 헤더 */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 10, flexWrap: 'wrap', gap: 8,
      }}>
        <Space wrap>
          <Title level={4} style={{ margin: 0 }}>화면 목록</Title>
          {currentProject && <Tag color="blue">{currentProject.projectNm}</Tag>}
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/admin/screens/new')}>
          {isMobile ? '' : '화면 등록'}
        </Button>
      </div>

      {/* 범례 */}
      <div style={{ marginBottom: 12 }}>{legend}</div>

      {/* 검색/필터 바 */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 14,
        padding: '10px 12px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        flexWrap: 'wrap',
      }}>
        <Input
          allowClear
          prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
          placeholder="화면명으로 검색"
          value={searchNm}
          onChange={e => setSearchNm(e.target.value)}
          style={{ flex: 1, minWidth: 140 }}
        />
        {!isMobile && (
          <Select
            allowClear
            showSearch
            placeholder={
              <span>
                <UserOutlined style={{ marginRight: 6, color: '#94a3b8' }} />
                개발자 선택
              </span>
            }
            value={filterDev}
            onChange={v => setFilterDev(v ?? null)}
            options={developerOptions}
            style={{ width: 180 }}
            notFoundContent={
              <span style={{ color: '#94a3b8', fontSize: 12 }}>
                {allData.length === 0 ? '화면 없음' : '등록된 개발자가 없습니다.'}
              </span>
            }
            optionRender={opt => (
              <Space size={6}>
                <UserOutlined style={{ color: '#6366f1', fontSize: 13 }} />
                <span>{opt.label}</span>
              </Space>
            )}
          />
        )}
        {(searchNm || filterDev) && (
          <Button
            type="link" size="small" style={{ padding: '0 4px', fontSize: 12 }}
            onClick={() => { setSearchNm(''); setFilterDev(null) }}
          >
            초기화 ({filtered.length}/{allData.length})
          </Button>
        )}
      </div>

      {/* 테이블 */}
      <Table
        dataSource={filtered}
        columns={columns}
        rowKey="screenId"
        loading={isLoading}
        size={isMobile ? 'small' : 'middle'}
        tableLayout="fixed"
        scroll={{ x: 1100 }}
        pagination={{
          pageSize: isMobile ? 10 : 20,
          showTotal: (total) => `총 ${total}개`,
          showSizeChanger: false,
          simple: isMobile,
        }}
        rowClassName={(r: ScreenRow) =>
          r.editStatus === 'EDITING' && r.lockedBy !== currentUser ? 'row-locked' : ''
        }
      />

      <style>{`
        .row-locked { background: #fef2f2 !important; }
        .row-locked:hover > td { background: #fee2e2 !important; }
      `}</style>
    </div>
  )
}

export default ScreenListPage
