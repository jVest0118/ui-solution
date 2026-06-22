import React, { useMemo, useState } from 'react'
import {
  Table, Tag, Button, Space, Typography, Popconfirm, message,
  Tooltip, Input, Select, Grid, Dropdown, Modal, Tree,
} from 'antd'
import type { DataNode } from 'antd/es/tree'
import {
  PlusOutlined, EditOutlined, PlayCircleOutlined, DeleteOutlined,
  LockOutlined, SearchOutlined, UserOutlined, MoreOutlined,
  FolderOutlined, FolderOpenOutlined, FileOutlined,
  FolderAddOutlined, AppstoreOutlined,
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

interface StatusCfg { dot: string; label: string; tooltip: string; canEdit: boolean }
const EDIT_STATUS: Record<string, StatusCfg> = {
  EDITING:   { dot: '#ef4444', label: '작업 중', tooltip: '다른 사용자가 작업 중입니다.', canEdit: false },
  DONE:      { dot: '#fca5a5', label: '미커밋',  tooltip: '아직 Git 커밋·Push 되지 않았습니다.', canEdit: false },
  COMMITTED: { dot: '#4ade80', label: '커밋됨',  tooltip: 'Git Push 완료 상태입니다.', canEdit: true },
}

interface ScreenRow {
  screenId:    string
  screenNm:    string
  screenType:  string
  description: string
  version:     number
  projectId:   string
  editStatus:  string
  lastEditor:  string | null
  lockedBy:    string | null
  createdAt:   string | null
  screenGroup: string | null
}

/* ── 상태 점 컴포넌트 ── */
const StatusDot: React.FC<{ row: ScreenRow; currentUser: string; compact?: boolean }> = ({ row, currentUser, compact }) => {
  const status     = row.editStatus ?? 'DONE'
  const cfg        = EDIT_STATUS[status] ?? EDIT_STATUS.DONE
  const isMyLock   = status === 'EDITING' && row.lockedBy === currentUser
  const editorLabel = row.lockedBy ?? row.lastEditor

  const dot = (
    <span style={{
      display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
      background: cfg.dot, flexShrink: 0,
      boxShadow: status === 'EDITING' ? `0 0 6px ${cfg.dot}` : undefined,
    }} />
  )

  if (compact) return <Tooltip title={isMyLock ? '내가 작업 중입니다.' : cfg.tooltip}>{dot}</Tooltip>

  return (
    <Tooltip title={isMyLock ? '내가 작업 중입니다.' : cfg.tooltip}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {dot}
        <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{cfg.label}</span>
        {editorLabel && <span style={{ fontSize: 11, color: '#94a3b8' }}>({editorLabel})</span>}
      </div>
    </Tooltip>
  )
}

/* ═══════════════════════════════════════════════ */
const ScreenListPage: React.FC = () => {
  const navigate      = useNavigate()
  const { currentProject, roles, userId } = useAuthStore()
  const queryClient   = useQueryClient()
  const isSysAdmin    = roles.includes('SYSTEM_ADMIN')
  const currentUser   = userId ?? ''

  const bp       = Grid.useBreakpoint()
  const isMobile = bp.md === false
  const isTablet = bp.md === true && bp.lg === false

  const [searchNm,  setSearchNm]  = useState('')
  const [filterDev, setFilterDev] = useState<string | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<string>('__ALL__')
  const [selectedScreenId, setSelectedScreenId] = useState<string | null>(null)
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])

  /* 그룹 이동 모달 */
  const [moveModal, setMoveModal]     = useState(false)
  const [moveTarget, setMoveTarget]   = useState<ScreenRow | null>(null)
  const [moveGroupVal, setMoveGroupVal] = useState('')

  /* 신규 그룹 생성 모달 */
  const [newGroupModal, setNewGroupModal] = useState(false)
  const [newGroupName,  setNewGroupName]  = useState('')
  /* 로컬에만 존재하는 임시 그룹 (화면 배정 전) */
  const [localGroups, setLocalGroups] = useState<string[]>([])

  /* ── 데이터 로드 ── */
  const { data: allData = [], isLoading } = useQuery<ScreenRow[]>({
    queryKey: ['adminScreens', currentProject?.projectId],
    queryFn: () => api.get('/schema/admin/screens', {
      params: { projectId: currentProject?.projectId },
    }).then(r => r.data.data ?? []),
    refetchInterval: 10000,
  })

  const { data: groupList = [] } = useQuery<string[]>({
    queryKey: ['screenGroups', currentProject?.projectId],
    queryFn: () => api.get('/schema/admin/screens/groups', {
      params: { projectId: currentProject?.projectId },
    }).then(r => r.data.data ?? []),
    staleTime: 10_000,
  })

  /* ── 그룹 이동 mutation ── */
  const moveMutation = useMutation({
    mutationFn: ({ screenId, screenGroup }: { screenId: string; screenGroup: string | null }) =>
      api.patch(`/schema/admin/screens/${screenId}/group`, { screenGroup }),
    onSuccess: () => {
      message.success('그룹이 변경되었습니다.')
      setMoveModal(false)
      queryClient.invalidateQueries({ queryKey: ['adminScreens'] })
      queryClient.invalidateQueries({ queryKey: ['screenGroups'] })
    },
    onError: () => message.error('그룹 변경 중 오류가 발생했습니다.'),
  })

  /* ── 폴더 트리 데이터 ── */
  const ungroupedCount = allData.filter(s => !s.screenGroup).length
  const mergedGroups = [...groupList, ...localGroups.filter(g => !groupList.includes(g))]

  const makeScreenNodes = (screens: ScreenRow[]) =>
    screens.map(s => {
      const status = s.editStatus ?? 'DONE'
      const cfg    = EDIT_STATUS[status] ?? EDIT_STATUS.DONE
      const t      = screenTypeLabel[s.screenType] ?? { label: s.screenType, color: 'default' }
      const isSelected = selectedScreenId === s.screenId
      return {
        key: `SCREEN:${s.screenId}`,
        isLeaf: true,
        title: (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5, minWidth: 0,
            background: isSelected ? '#ede9fe' : undefined,
            borderRadius: 4, padding: '1px 4px', margin: '0 -4px',
          }}>
            <span style={{
              display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
              background: cfg.dot, flexShrink: 0,
              boxShadow: status === 'EDITING' ? `0 0 4px ${cfg.dot}` : undefined,
            }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: isSelected ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1e293b' }}>
                {s.screenNm}
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.screenId} · <span style={{ color: `var(--ant-${t.color}-6, #6366f1)` }}>{t.label}</span>
              </div>
            </div>
          </div>
        ),
      }
    })

  const treeData: DataNode[] = [
    {
      key: '__ALL__',
      title: (
        <span style={{ fontWeight: selectedGroup === '__ALL__' && !selectedScreenId ? 700 : 400 }}>
          <AppstoreOutlined style={{ marginRight: 5, color: '#6366f1' }} />
          전체 ({allData.length})
        </span>
      ),
      children: makeScreenNodes(allData),
    },
    {
      key: '__NONE__',
      title: (
        <span style={{ fontWeight: selectedGroup === '__NONE__' && !selectedScreenId ? 700 : 400 }}>
          <FileOutlined style={{ marginRight: 5, color: '#94a3b8' }} />
          미분류 ({ungroupedCount})
        </span>
      ),
      children: makeScreenNodes(allData.filter(s => !s.screenGroup)),
    },
    ...mergedGroups.map(g => {
      const screens = allData.filter(s => s.screenGroup === g)
      const isLocal = !groupList.includes(g)
      return {
        key: g,
        title: (
          <span style={{ fontWeight: selectedGroup === g && !selectedScreenId ? 700 : 400 }}>
            {expandedKeys.includes(g)
              ? <FolderOpenOutlined style={{ marginRight: 5, color: isLocal ? '#94a3b8' : '#f59e0b' }} />
              : <FolderOutlined style={{ marginRight: 5, color: isLocal ? '#94a3b8' : '#f59e0b' }} />}
            {g} ({screens.length}){isLocal && <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 4 }}>비어있음</span>}
          </span>
        ),
        children: makeScreenNodes(screens),
      }
    }),
  ]

  /* ── 필터링 ── */
  const developerOptions = useMemo(() => {
    const set = new Set<string>()
    allData.forEach(r => { if (r.lastEditor) set.add(r.lastEditor); if (r.lockedBy) set.add(r.lockedBy) })
    return Array.from(set).sort().map(v => ({ value: v, label: v }))
  }, [allData])

  const filtered = useMemo(() => {
    return allData.filter(r => {
      if (selectedScreenId) return r.screenId === selectedScreenId
      const nmOk    = !searchNm.trim() || r.screenNm.includes(searchNm.trim())
      const devOk   = !filterDev || r.lastEditor === filterDev || r.lockedBy === filterDev
      const grpOk   = selectedGroup === '__ALL__'
        ? true
        : selectedGroup === '__NONE__'
          ? !r.screenGroup
          : r.screenGroup === selectedGroup
      return nmOk && devOk && grpOk
    })
  }, [allData, searchNm, filterDev, selectedGroup, selectedScreenId])

  /* ── 삭제 mutation ── */
  const deleteMutation = useMutation({
    mutationFn: (screenId: string) => api.delete(`/schema/admin/screens/${screenId}`),
    onSuccess: () => { message.success('화면이 삭제되었습니다.'); queryClient.invalidateQueries({ queryKey: ['adminScreens'] }) },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } }
      message.error(e.response?.data?.message ?? '삭제 중 오류가 발생했습니다.')
    },
  })

  const handleDesign = (row: ScreenRow) => {
    const status   = row.editStatus ?? 'DONE'
    const isMyLock = status === 'EDITING' && row.lockedBy === currentUser
    if (isSysAdmin) { navigate(`/admin/screens/${row.screenId}`); return }
    if (status === 'EDITING' && !isMyLock) { message.warning(`${row.lockedBy} 님이 작업 중입니다.`); return }
    if (status === 'DONE') { message.warning('미커밋 상태입니다. 커밋·Push 후 설계 가능합니다.'); return }
    navigate(`/admin/screens/${row.screenId}`)
  }

  /* ── 그룹 이동 버튼 클릭 ── */
  const openMoveModal = (row: ScreenRow) => {
    setMoveTarget(row)
    setMoveGroupVal(row.screenGroup ?? '')
    setMoveModal(true)
  }

  /* ── 모바일 드롭다운 ── */
  const getMobileActions = (r: ScreenRow) => {
    const status   = r.editStatus ?? 'DONE'
    const isMyLock = status === 'EDITING' && r.lockedBy === currentUser
    const canDesign = status === 'COMMITTED' || isMyLock || isSysAdmin
    const cfg = EDIT_STATUS[status] ?? EDIT_STATUS.DONE
    return [
      { key: 'design', icon: canDesign ? <EditOutlined /> : <LockOutlined />, label: canDesign ? '설계' : `설계 불가 (${cfg.label})`, disabled: !canDesign, onClick: () => canDesign && handleDesign(r) },
      { key: 'run', icon: <PlayCircleOutlined />, label: '실행', onClick: () => navigate(`/app/${r.screenId}`) },
      { key: 'move', icon: <FolderOutlined />, label: '그룹 이동', onClick: () => openMoveModal(r) },
      ...(isSysAdmin ? [{ key: 'delete', icon: <DeleteOutlined />, label: '삭제', danger: true, onClick: () => { if (window.confirm(`'${r.screenNm}'을(를) 삭제하시겠습니까?`)) deleteMutation.mutate(r.screenId) } }] : []),
    ]
  }

  const compactActionCol: ColumnType<ScreenRow> = {
    title: '', width: 36,
    render: (_: unknown, r: ScreenRow) => (
      <Dropdown menu={{ items: getMobileActions(r) }} placement="bottomRight" trigger={['click']}>
        <Button type="text" icon={<MoreOutlined style={{ fontSize: 18 }} />} size="small" style={{ color: '#64748b' }} />
      </Dropdown>
    ),
  }

  const infoCardCol: ColumnType<ScreenRow> = {
    title: '화면',
    render: (_: unknown, r: ScreenRow) => {
      const t = screenTypeLabel[r.screenType] ?? { label: r.screenType, color: 'default' }
      return (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.screenNm}</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.screenId}</div>
          <Tag color={t.color} style={{ fontSize: 10, padding: '0 4px', lineHeight: '16px', marginTop: 3 }}>{t.label}</Tag>
        </div>
      )
    },
  }

  /* ── 데스크탑 컬럼 ── */
  const columns: ColumnType<ScreenRow>[] = isMobile ? [
    { title: '', width: 18, render: (_: unknown, r: ScreenRow) => <StatusDot row={r} currentUser={currentUser} compact /> },
    infoCardCol,
    compactActionCol,
  ] : isTablet ? [
    { title: '상태', width: 24, render: (_: unknown, r: ScreenRow) => <StatusDot row={r} currentUser={currentUser} compact /> },
    infoCardCol,
    { title: '버전', dataIndex: 'version', width: 44, align: 'center' as const },
    compactActionCol,
  ] : [
    { title: '상태', width: 140, render: (_: unknown, r: ScreenRow) => <StatusDot row={r} currentUser={currentUser} /> },
    { title: '화면ID', dataIndex: 'screenId', width: 160, ellipsis: true },
    { title: '화면명', dataIndex: 'screenNm', width: 160, ellipsis: true },
    {
      title: '유형', dataIndex: 'screenType', width: 120,
      render: (type: string) => {
        const t = screenTypeLabel[type] ?? { label: type, color: 'default' }
        return <Tag color={t.color}>{t.label}</Tag>
      },
    },
    { title: '설명', dataIndex: 'description', ellipsis: true, width: 200 },
    { title: '버전', dataIndex: 'version', width: 55, align: 'center' as const },
    {
      title: '작성일시', dataIndex: 'createdAt', width: 130,
      render: (v: string | null) => {
        if (!v) return '-'
        const d = new Date(v)
        return (
          <span style={{ fontSize: 12, color: '#64748b' }}>
            {d.toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' })}
            {' '}{d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}
          </span>
        )
      },
    },
    {
      title: '작업', width: isSysAdmin ? 230 : 170, fixed: 'right' as const,
      render: (_: unknown, r: ScreenRow) => {
        const status    = r.editStatus ?? 'DONE'
        const isMyLock  = status === 'EDITING' && r.lockedBy === currentUser
        const canDesign = status === 'COMMITTED' || isMyLock || isSysAdmin
        return (
          <Space>
            <Tooltip title={!canDesign ? (EDIT_STATUS[status]?.tooltip ?? '') : '설계 페이지 열기'}>
              <Button size="small" icon={canDesign ? <EditOutlined /> : <LockOutlined />}
                onClick={() => handleDesign(r)} disabled={!canDesign}
                style={canDesign ? undefined : { opacity: 0.55 }}>설계</Button>
            </Tooltip>
            <Button size="small" icon={<PlayCircleOutlined />} onClick={() => navigate(`/app/${r.screenId}`)}>실행</Button>
            <Tooltip title="그룹 이동">
              <Button size="small" icon={<FolderOutlined />} onClick={() => openMoveModal(r)} />
            </Tooltip>
            {isSysAdmin && (
              <Popconfirm title="화면 삭제" description={`'${r.screenNm}'을(를) 삭제하시겠습니까?`}
                onConfirm={() => deleteMutation.mutate(r.screenId)} okText="삭제" cancelText="취소" okButtonProps={{ danger: true }}>
                <Button size="small" danger icon={<DeleteOutlined />}
                  loading={deleteMutation.isPending && deleteMutation.variables === r.screenId}>삭제</Button>
              </Popconfirm>
            )}
          </Space>
        )
      },
    },
  ]

  const legend = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
      {Object.entries(EDIT_STATUS).map(([key, cfg]) => (
        <Tooltip key={key} title={cfg.tooltip}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'help' }}>
            <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: cfg.dot, boxShadow: key === 'EDITING' ? `0 0 5px ${cfg.dot}` : undefined }} />
            <span style={{ fontSize: 12, color: '#64748b' }}>{cfg.label}</span>
          </div>
        </Tooltip>
      ))}
      {!isMobile && <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 4 }}>↻ 10초마다 자동 갱신</span>}
    </div>
  )

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>

      {/* ── 좌측 폴더 트리 패널 ── */}
      {!isMobile && (
        <div style={{
          width: 220, flexShrink: 0,
          background: '#fff', borderRight: '1px solid #e2e8f0',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{
            padding: '12px 12px 8px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', letterSpacing: 0.4 }}>
              업무 그룹
            </span>
            <Tooltip title="그룹 추가">
              <Button
                type="text" size="small" icon={<FolderAddOutlined />}
                style={{ color: '#6366f1', padding: '0 4px' }}
                onClick={() => { setNewGroupName(''); setNewGroupModal(true) }}
              />
            </Tooltip>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 4px' }}>
            <Tree
              treeData={treeData}
              selectedKeys={selectedScreenId ? [`SCREEN:${selectedScreenId}`] : [selectedGroup]}
              expandedKeys={expandedKeys}
              onExpand={keys => setExpandedKeys(keys as string[])}
              onSelect={keys => {
                if (keys.length === 0) return
                const key = keys[0] as string
                if (key.startsWith('SCREEN:')) {
                  const screenId = key.replace('SCREEN:', '')
                  setSelectedScreenId(screenId)
                } else {
                  setSelectedScreenId(null)
                  setSelectedGroup(key)
                }
              }}
              blockNode
              style={{ fontSize: 13 }}
            />
          </div>
        </div>
      )}

      {/* ── 우측 메인 영역 ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="rsp-page-content" style={{ padding: 24, flex: 1, overflowY: 'auto' }}>

          {/* 헤더 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
            <Space wrap>
              <Title level={4} style={{ margin: 0 }}>화면 목록</Title>
              {currentProject && <Tag color="blue">{currentProject.projectNm}</Tag>}
              {selectedScreenId ? (
                <Tag color="purple" closable onClose={() => setSelectedScreenId(null)}>
                  {allData.find(s => s.screenId === selectedScreenId)?.screenNm ?? selectedScreenId}
                </Tag>
              ) : selectedGroup !== '__ALL__' && (
                <Tag color="orange" closable onClose={() => setSelectedGroup('__ALL__')}>
                  {selectedGroup === '__NONE__' ? '미분류' : selectedGroup}
                </Tag>
              )}
            </Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/admin/screens/new')}>
              {isMobile ? '' : '화면 등록'}
            </Button>
          </div>

          {/* 범례 */}
          <div style={{ marginBottom: 12 }}>{legend}</div>

          {/* 검색/필터 바 */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, flexWrap: 'wrap' }}>
            <Input
              allowClear prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              placeholder="화면명으로 검색"
              value={searchNm} onChange={e => setSearchNm(e.target.value)}
              style={{ flex: 1, minWidth: 140 }}
            />
            {!isMobile && (
              <Select
                allowClear showSearch
                placeholder={<span><UserOutlined style={{ marginRight: 6, color: '#94a3b8' }} />개발자 선택</span>}
                value={filterDev} onChange={v => setFilterDev(v ?? null)}
                options={developerOptions} style={{ width: 180 }}
                notFoundContent={<span style={{ color: '#94a3b8', fontSize: 12 }}>등록된 개발자가 없습니다.</span>}
                optionRender={opt => <Space size={6}><UserOutlined style={{ color: '#6366f1', fontSize: 13 }} /><span>{opt.label}</span></Space>}
              />
            )}
            {(searchNm || filterDev) && (
              <Button type="link" size="small" style={{ padding: '0 4px', fontSize: 12 }}
                onClick={() => { setSearchNm(''); setFilterDev(null) }}>
                초기화 ({filtered.length}/{allData.length})
              </Button>
            )}
          </div>

          {/* 테이블 */}
          <Table
            dataSource={filtered} columns={columns} rowKey="screenId"
            loading={isLoading} size={isMobile ? 'small' : 'middle'}
            tableLayout="fixed" scroll={{ x: 1050 }}
            pagination={{ pageSize: isMobile ? 10 : 20, showTotal: total => `총 ${total}개`, showSizeChanger: false, simple: isMobile }}
            rowClassName={(r: ScreenRow) => r.editStatus === 'EDITING' && r.lockedBy !== currentUser ? 'row-locked' : ''}
          />

          <style>{`.row-locked { background: #fef2f2 !important; } .row-locked:hover > td { background: #fee2e2 !important; }`}</style>
        </div>
      </div>

      {/* ── 그룹 이동 모달 ── */}
      <Modal
        title={`그룹 이동 — ${moveTarget?.screenNm}`}
        open={moveModal}
        onOk={() => {
          if (moveTarget) moveMutation.mutate({ screenId: moveTarget.screenId, screenGroup: moveGroupVal || null })
        }}
        onCancel={() => setMoveModal(false)}
        okText="이동" cancelText="취소"
        confirmLoading={moveMutation.isPending}
      >
        <div style={{ marginBottom: 8, fontSize: 12, color: '#64748b' }}>그룹을 선택하거나 새 그룹명을 입력하세요.</div>
        <Select
          style={{ width: '100%' }}
          value={moveGroupVal || undefined}
          onChange={v => setMoveGroupVal(v ?? '')}
          allowClear
          placeholder="그룹 없음 (미분류)"
          showSearch
          optionFilterProp="label"
          options={mergedGroups.map(g => ({ value: g, label: g }))}
          dropdownRender={menu => (
            <>
              {menu}
              <div style={{ padding: '6px 8px', borderTop: '1px solid #f0f0f0' }}>
                <Input
                  size="small" placeholder="새 그룹명 직접 입력..."
                  value={moveGroupVal}
                  onChange={e => setMoveGroupVal(e.target.value)}
                />
              </div>
            </>
          )}
        />
      </Modal>

      {/* ── 신규 그룹 생성 모달 ── */}
      <Modal
        title="새 그룹 만들기"
        open={newGroupModal}
        onOk={() => {
          const name = newGroupName.trim()
          if (!name) { message.warning('그룹명을 입력하세요.'); return }
          if (mergedGroups.includes(name)) { message.warning('이미 존재하는 그룹명입니다.'); return }
          setLocalGroups(prev => [...prev, name])
          setSelectedGroup(name)
          message.success(`'${name}' 그룹이 추가되었습니다. 화면을 이 그룹으로 이동하면 영구 저장됩니다.`)
          setNewGroupModal(false)
          setNewGroupName('')
        }}
        onCancel={() => setNewGroupModal(false)}
        okText="확인" cancelText="취소"
      >
        <Input
          placeholder="예: 인사관리, 재무회계, 영업관리..."
          value={newGroupName}
          onChange={e => setNewGroupName(e.target.value)}
          onPressEnter={() => {
            const name = newGroupName.trim()
            if (!name) return
            if (mergedGroups.includes(name)) { message.warning('이미 존재하는 그룹명입니다.'); return }
            setLocalGroups(prev => [...prev, name])
            setSelectedGroup(name)
            message.success(`'${name}' 그룹이 추가되었습니다.`)
            setNewGroupModal(false)
            setNewGroupName('')
          }}
        />
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
          그룹이 즉시 트리에 표시됩니다. 화면을 이 그룹으로 이동하면 영구 저장됩니다.
        </div>
      </Modal>
    </div>
  )
}

export default ScreenListPage
