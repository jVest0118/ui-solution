import React, { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Button, Checkbox, Input, Tag, Space, Alert, Tooltip, Typography,
  Timeline, Badge, Empty, Spin, message, Popconfirm,
} from 'antd'
import {
  CloudUploadOutlined, CloudDownloadOutlined, CheckSquareOutlined,
  ReloadOutlined, WarningOutlined, CheckCircleOutlined,
  BranchesOutlined, ClockCircleOutlined, UserOutlined,
  SendOutlined, ApartmentOutlined,
} from '@ant-design/icons'
import api from '@/api/axios'
import ConflictResolverModal from '@/components/git/ConflictResolverModal'

const { Text } = Typography
const { TextArea } = Input

interface GitFile {
  path:   string
  status: 'modified' | 'added' | 'untracked' | 'deleted' | 'missing' | 'conflict'
}

interface GitStatus {
  files:       GitFile[]
  conflicting: string[]
  clean:       boolean
  branch:      string
}

interface LogEntry {
  commitId:  string
  shortMsg:  string
  message:   string
  author:    string
  email:     string
  date:      string
  timestamp: number
}

const STATUS_COLORS: Record<string, string> = {
  modified:  '#f59e0b',
  added:     '#22c55e',
  untracked: '#6366f1',
  deleted:   '#ef4444',
  missing:   '#ef4444',
  conflict:  '#dc2626',
}

const STATUS_LABELS: Record<string, string> = {
  modified:  '수정',
  added:     '추가',
  untracked: '신규',
  deleted:   '삭제',
  missing:   '없음',
  conflict:  '충돌',
}

const GitManagementPage: React.FC = () => {
  const qc = useQueryClient()

  const [checked,    setChecked]    = useState<string[]>([])
  const [commitMsg,  setCommitMsg]  = useState('')
  const [activeTab,  setActiveTab]  = useState<'changes' | 'history'>('changes')
  const [pullResult, setPullResult] = useState<Record<string, unknown> | null>(null)
  const [conflictFile, setConflictFile] = useState<string | null>(null)

  /* ── 데이터 조회 ─────────────────────────────────────── */
  const { data: statusData, isFetching: loadingStatus, refetch: refetchStatus } = useQuery<GitStatus>({
    queryKey: ['git-status'],
    queryFn:  () => api.get('/git/status').then(r => r.data.data),
    refetchOnWindowFocus: false,
    retry: false,
  })

  const { data: logData, isFetching: loadingLog } = useQuery<LogEntry[]>({
    queryKey: ['git-log'],
    queryFn:  () => api.get('/git/log', { params: { count: 50 } }).then(r => r.data.data),
    refetchOnWindowFocus: false,
    enabled: activeTab === 'history',
    retry: false,
  })

  /* ── 변경파일 선택 ───────────────────────────────────── */
  const files = statusData?.files ?? []

  const toggleAll = () => {
    const all = files.map(f => f.path)
    setChecked(prev => prev.length === all.length ? [] : all)
  }

  const toggle = (path: string) => {
    setChecked(prev => prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path])
  }

  /* ── 커밋 ────────────────────────────────────────────── */
  const commitMut = useMutation({
    mutationFn: () => api.post('/git/commit', {
      paths:   checked,
      message: commitMsg,
    }),
    onSuccess: () => {
      message.success('커밋 완료!')
      setCommitMsg('')
      setChecked([])
      qc.invalidateQueries({ queryKey: ['git-status'] })
      qc.invalidateQueries({ queryKey: ['git-log'] })
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } } }
      message.error(err.response?.data?.message ?? '커밋 실패')
    },
  })

  /* ── 푸시 ────────────────────────────────────────────── */
  const pushMut = useMutation({
    mutationFn: () => api.post('/git/push'),
    onSuccess: async () => {
      // Push 성공 시 DONE 상태인 화면을 모두 COMMITTED로 전환
      try {
        const r = await api.post('/schema/admin/screens/bulk-commit')
        const count = r.data.data?.count ?? 0
        message.success(`Push 완료! (화면 ${count}개 커밋됨 처리)`)
      } catch {
        message.success('Push 완료!')
      }
      qc.invalidateQueries({ queryKey: ['git-log'] })
      qc.invalidateQueries({ queryKey: ['adminScreens'] })
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } } }
      message.error(err.response?.data?.message ?? 'Push 실패')
    },
  })

  /* ── 풀 ─────────────────────────────────────────────── */
  const pullMut = useMutation({
    mutationFn: () => api.post('/git/pull'),
    onSuccess: (res) => {
      const d = res.data.data as Record<string, unknown>
      setPullResult(d)
      if (!d.hasConflict) {
        message.success(d.message as string)
        qc.invalidateQueries({ queryKey: ['git-status'] })
        qc.invalidateQueries({ queryKey: ['git-log'] })
      }
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } } }
      message.error(err.response?.data?.message ?? 'Pull 실패')
    },
  })

  const onConflictResolved = useCallback((fp: string) => {
    qc.invalidateQueries({ queryKey: ['git-status'] })
    setPullResult(prev => {
      if (!prev) return prev
      const list = (prev.conflicting as string[]).filter(c => c !== fp)
      return { ...prev, conflicting: list, hasConflict: list.length > 0 }
    })
  }, [qc])

  /* ── UI ─────────────────────────────────────────────── */
  const hasConflicts = (statusData?.conflicting?.length ?? 0) > 0

  return (
    <div style={{ padding: '24px 28px', height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Git 형상관리</h2>
          <Space size={8} style={{ marginTop: 4 }}>
            {statusData?.branch && (
              <Tag color="purple" icon={<BranchesOutlined />}>
                {statusData.branch}
              </Tag>
            )}
            {statusData?.clean && <Tag color="success" icon={<CheckCircleOutlined />}>변경 없음</Tag>}
            {hasConflicts && <Tag color="error" icon={<WarningOutlined />}>충돌 {statusData!.conflicting.length}개</Tag>}
          </Space>
        </div>

        <Button icon={<ReloadOutlined />} onClick={() => refetchStatus()} loading={loadingStatus}>
          새로고침
        </Button>
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid #e2e8f0' }}>
        {(['changes', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 20px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: activeTab === tab ? 700 : 400,
              color: activeTab === tab ? '#6366f1' : '#64748b',
              borderBottom: activeTab === tab ? '2px solid #6366f1' : '2px solid transparent',
              marginBottom: -1,
              transition: 'all 0.15s',
            }}
          >
            {tab === 'changes'
              ? `변경사항 ${files.length > 0 ? `(${files.length})` : ''}`
              : '커밋 히스토리'}
          </button>
        ))}
      </div>

      {/* ─── 변경사항 탭 ─── */}
      {activeTab === 'changes' && (
        <div style={{ display: 'flex', gap: 16, flex: 1, overflow: 'hidden' }}>

          {/* 파일 목록 */}
          <div style={{
            flex: 1, border: '1px solid #e2e8f0', borderRadius: 10,
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
            background: '#fff',
          }}>
            {/* 목록 헤더 */}
            <div style={{
              padding: '10px 14px',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <Space size={8}>
                <Checkbox
                  indeterminate={checked.length > 0 && checked.length < files.length}
                  checked={files.length > 0 && checked.length === files.length}
                  onChange={toggleAll}
                />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                  변경 파일
                </span>
                <Badge count={files.length} style={{ background: '#6366f1' }} />
              </Space>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {checked.length > 0 ? `${checked.length}개 선택됨` : '파일 선택 후 커밋'}
              </Text>
            </div>

            {/* 파일 목록 */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loadingStatus && (
                <div style={{ textAlign: 'center', padding: 32 }}>
                  <Spin tip="로딩 중..." />
                </div>
              )}

              {!loadingStatus && files.length === 0 && (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="변경된 파일이 없습니다."
                  style={{ margin: '40px auto' }}
                />
              )}

              {files.map(f => (
                <div
                  key={f.path}
                  onClick={() => toggle(f.path)}
                  style={{
                    padding: '9px 14px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                    background: checked.includes(f.path) ? '#f5f3ff' : 'transparent',
                    transition: 'background 0.1s',
                  }}
                >
                  <Checkbox checked={checked.includes(f.path)} onChange={() => toggle(f.path)} onClick={e => e.stopPropagation()} />
                  <Tag
                    style={{
                      margin: 0, minWidth: 34, textAlign: 'center',
                      background: STATUS_COLORS[f.status] + '22',
                      borderColor: STATUS_COLORS[f.status] + '88',
                      color: STATUS_COLORS[f.status],
                      fontSize: 10, fontWeight: 700,
                    }}
                  >
                    {STATUS_LABELS[f.status]}
                  </Tag>
                  <Text
                    style={{
                      flex: 1, fontSize: 12.5,
                      fontFamily: 'Consolas, "Courier New", monospace',
                      color: f.status === 'conflict' ? '#dc2626' : '#1e293b',
                      fontWeight: f.status === 'conflict' ? 700 : 400,
                    }}
                    ellipsis={{ tooltip: f.path }}
                  >
                    {f.path}
                  </Text>
                  {f.status === 'conflict' && (
                    <Tooltip title="충돌 해결">
                      <Button
                        size="small"
                        danger
                        icon={<WarningOutlined />}
                        onClick={e => { e.stopPropagation(); setConflictFile(f.path) }}
                        style={{ fontSize: 11 }}
                      >
                        해결
                      </Button>
                    </Tooltip>
                  )}
                </div>
              ))}
            </div>

            {/* 파일 목록 하단 */}
            {files.length > 0 && (
              <div style={{ padding: '8px 14px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <Button
                  size="small"
                  icon={<CheckSquareOutlined />}
                  onClick={toggleAll}
                  type="link"
                  style={{ fontSize: 12, padding: 0 }}
                >
                  {checked.length === files.length ? '전체 해제' : '전체 선택'}
                </Button>
              </div>
            )}
          </div>

          {/* 오른쪽: 커밋 패널 */}
          <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Pull 결과 */}
            {pullResult && (pullResult.hasConflict as boolean) && (
              <Alert
                type="error"
                showIcon
                icon={<WarningOutlined />}
                message="충돌이 발생했습니다"
                description={
                  <div>
                    <p style={{ margin: '4px 0 8px', fontSize: 12 }}>아래 파일의 충돌을 해결 후 커밋하세요.</p>
                    {(pullResult.conflicting as string[]).map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 11, fontFamily: 'monospace' }} ellipsis={{ tooltip: f }}>{f}</Text>
                        <Button size="small" danger onClick={() => setConflictFile(f)} style={{ fontSize: 11 }}>해결</Button>
                      </div>
                    ))}
                  </div>
                }
                closable
                onClose={() => setPullResult(null)}
              />
            )}

            {pullResult && !(pullResult.hasConflict as boolean) && (pullResult.restarting as boolean) && (
              <Alert
                type="info"
                showIcon
                message="Pull 완료 — 서버 재시작 중"
                description="잠시 후 서버가 자동으로 재시작됩니다."
                closable
                onClose={() => setPullResult(null)}
              />
            )}

            {/* 커밋 박스 */}
            <div style={{
              border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff', padding: 16,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 10 }}>
                커밋 메시지
              </div>
              <TextArea
                rows={4}
                value={commitMsg}
                onChange={e => setCommitMsg(e.target.value)}
                placeholder="변경 내용을 간략히 설명하세요.&#10;예: feat: 로그인 화면 UI 수정"
                style={{ fontSize: 13, resize: 'none' }}
              />
              <div style={{ marginTop: 8, color: '#94a3b8', fontSize: 11 }}>
                {checked.length === 0
                  ? '선택된 파일 없음 (전체 변경사항 커밋)'
                  : `${checked.length}개 파일 선택됨`}
              </div>

              <Button
                type="primary"
                block
                style={{ marginTop: 10 }}
                icon={<ApartmentOutlined />}
                loading={commitMut.isPending}
                disabled={!commitMsg.trim()}
                onClick={() => commitMut.mutate()}
              >
                커밋
              </Button>
            </div>

            {/* Push / Pull */}
            <div style={{
              border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff', padding: 16,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 10 }}>
                원격 저장소
              </div>

              <Space direction="vertical" style={{ width: '100%' }} size={8}>
                <Popconfirm
                  title="Push 하시겠습니까?"
                  description="커밋된 변경사항을 원격 저장소에 업로드합니다."
                  onConfirm={() => pushMut.mutate()}
                  okText="Push"
                  cancelText="취소"
                >
                  <Button
                    block
                    icon={<CloudUploadOutlined />}
                    loading={pushMut.isPending}
                    style={{ background: '#f0fdf4', borderColor: '#86efac', color: '#15803d' }}
                  >
                    Push (업로드)
                  </Button>
                </Popconfirm>

                <Popconfirm
                  title="Pull 하시겠습니까?"
                  description="원격 저장소의 최신 코드를 가져옵니다. 충돌이 발생할 수 있습니다."
                  onConfirm={() => pullMut.mutate()}
                  okText="Pull"
                  cancelText="취소"
                >
                  <Button
                    block
                    icon={<CloudDownloadOutlined />}
                    loading={pullMut.isPending}
                    style={{ background: '#eff6ff', borderColor: '#93c5fd', color: '#1d4ed8' }}
                  >
                    Pull (다운로드)
                  </Button>
                </Popconfirm>

                <Button
                  block
                  icon={<SendOutlined />}
                  loading={commitMut.isPending || pushMut.isPending}
                  disabled={!commitMsg.trim()}
                  onClick={async () => {
                    try {
                      await commitMut.mutateAsync()
                      await pushMut.mutateAsync()
                      // pushMut.onSuccess에서 bulk-commit과 메시지 처리
                    } catch {/* 각 뮤테이션에서 에러 처리 */}
                  }}
                  style={{ fontWeight: 600 }}
                  type="primary"
                  ghost
                >
                  커밋 + Push
                </Button>
              </Space>
            </div>
          </div>
        </div>
      )}

      {/* ─── 히스토리 탭 ─── */}
      {activeTab === 'history' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingLog && (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin tip="히스토리 로딩 중..." />
            </div>
          )}

          {!loadingLog && (!logData || logData.length === 0) && (
            <Empty description="커밋 히스토리가 없습니다." style={{ marginTop: 60 }} />
          )}

          {!loadingLog && logData && logData.length > 0 && (
            <Timeline
              style={{ marginTop: 8, paddingLeft: 8 }}
              items={logData.map((log, idx) => ({
                color: idx === 0 ? 'green' : 'blue',
                children: (
                  <div style={{
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '10px 14px',
                    marginBottom: 4,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', lineHeight: '1.4' }}>
                          {log.shortMsg}
                        </div>
                        {log.message !== log.shortMsg && (
                          <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 3, whiteSpace: 'pre-wrap' }}>
                            {log.message}
                          </div>
                        )}
                      </div>
                      <Tag
                        style={{
                          fontFamily: 'Consolas, monospace', fontSize: 11,
                          background: '#f1f5f9', borderColor: '#cbd5e1', color: '#475569',
                          flexShrink: 0,
                        }}
                      >
                        {log.commitId}
                      </Tag>
                    </div>
                    <Space size={12} style={{ marginTop: 6 }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        <UserOutlined style={{ marginRight: 4 }} />{log.author}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        <ClockCircleOutlined style={{ marginRight: 4 }} />{log.date}
                      </Text>
                    </Space>
                  </div>
                ),
              }))}
            />
          )}
        </div>
      )}

      {/* 충돌 해결 모달 */}
      <ConflictResolverModal
        open={conflictFile !== null}
        filePath={conflictFile}
        onClose={() => setConflictFile(null)}
        onResolved={onConflictResolved}
      />
    </div>
  )
}

export default GitManagementPage
