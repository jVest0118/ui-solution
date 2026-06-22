import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Typography, Button, Space, Tag, Spin, Progress,
  Row, Col, Statistic, Card, Modal, Form, Input, Select,
  InputNumber, Switch, message, Segmented,
} from 'antd'
import {
  ReloadOutlined, CheckCircleFilled, CloseCircleFilled,
  ClockCircleFilled, QuestionCircleFilled, ApiOutlined,
  ThunderboltOutlined, WarningFilled, AppstoreOutlined,
  ApartmentOutlined, SaveOutlined,
} from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/api/axios'
import { useAuthStore } from '@/store/authStore'

const { Title, Text } = Typography

type CheckStatus = 'UP' | 'DOWN' | 'TIMEOUT' | 'ERROR' | 'CHECKING' | 'UNKNOWN'

interface StatusResult {
  id: number
  connNm: string
  baseUrl: string
  healthUrl: string
  status: CheckStatus
  statusCode: number | null
  responseTimeMs: number
  checkedAt: string
  errorMessage: string | null
}

interface ApiConn {
  id: number
  connNm: string
  baseUrl: string
  healthUrl: string | null
  method: string
  reqHeaders: string | null
  timeoutMs: number
  description: string | null
  useYn: string
}

const STATUS_CFG: Record<CheckStatus, {
  color: string; bg: string; border: string
  darkBg: string; darkBorder: string
  icon: React.ReactNode; label: string
}> = {
  UP:       { color: '#16a34a', bg: '#f0fdf4', border: '#86efac', darkBg: '#14532d', darkBorder: '#22c55e', icon: <CheckCircleFilled />, label: '정상' },
  DOWN:     { color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', darkBg: '#450a0a', darkBorder: '#ef4444', icon: <CloseCircleFilled />, label: '오류' },
  TIMEOUT:  { color: '#d97706', bg: '#fffbeb', border: '#fcd34d', darkBg: '#451a03', darkBorder: '#f59e0b', icon: <ClockCircleFilled />, label: '타임아웃' },
  ERROR:    { color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', darkBg: '#450a0a', darkBorder: '#ef4444', icon: <CloseCircleFilled />, label: '오류' },
  CHECKING: { color: '#6366f1', bg: '#eef2ff', border: '#a5b4fc', darkBg: '#1e1b4b', darkBorder: '#6366f1', icon: <Spin size="small" />, label: '확인 중' },
  UNKNOWN:  { color: '#64748b', bg: '#f8fafc', border: '#cbd5e1', darkBg: '#1e293b', darkBorder: '#475569', icon: <QuestionCircleFilled />, label: '미확인' },
}

const LINE_STYLE: Record<string, { stroke: string; dasharray: string; opacity: number; animated: boolean; dur: number }> = {
  UP:       { stroke: '#22c55e', dasharray: '8,4',   opacity: 0.85, animated: true,  dur: 2.0 },
  DOWN:     { stroke: '#ef4444', dasharray: '4,8',   opacity: 0.50, animated: false, dur: 0 },
  TIMEOUT:  { stroke: '#f59e0b', dasharray: '3,9',   opacity: 0.50, animated: false, dur: 0 },
  ERROR:    { stroke: '#ef4444', dasharray: '4,8',   opacity: 0.50, animated: false, dur: 0 },
  CHECKING: { stroke: '#6366f1', dasharray: '6,4',   opacity: 0.60, animated: false, dur: 0 },
  UNKNOWN:  { stroke: '#475569', dasharray: '2,10',  opacity: 0.30, animated: false, dur: 0 },
}

/* ─── Topology SVG ──────────────────────────────────────────── */
const TopologySVG: React.FC<{
  connections: ApiConn[]
  results: Record<number, StatusResult>
  projectName: string
  onNodeClick: (conn: ApiConn) => void
}> = ({ connections, results, projectName, onNodeClick }) => {
  const W = 900
  const H = 500
  const CX = W / 2
  const CY = H / 2

  const { nodePositions, sc, nW, nH, hubR, fNm, fUrl, fSt, fHub } = useMemo(() => {
    const n = connections.length
    // 연결 수에 따라 전체 노드 크기 자동 축소
    const sc = n <= 3 ? 1.0 : n <= 5 ? 0.88 : n <= 7 ? 0.74 : n <= 10 ? 0.60 : 0.48
    const nW   = Math.round(136 * sc)
    const nH   = Math.round(76  * sc)
    const hubR = Math.round(56  * sc)
    const fNm  = Math.max(8,  Math.round(11 * sc))
    const fUrl = Math.max(7,  Math.round(9  * sc))
    const fSt  = Math.max(7,  Math.round(9  * sc))
    const fHub = Math.max(9,  Math.round(12 * sc))
    if (n === 0) return { nodePositions: [], sc, nW, nH, hubR, fNm, fUrl, fSt, fHub }
    // 타원 반경도 수에 맞게 확장
    const RX = Math.min(360, 170 + n * 20)
    const RY = Math.min(205, 115 + n * 13)
    const nodePositions = connections.map((_, i) => ({
      x: CX + RX * Math.cos((2 * Math.PI * i / n) - Math.PI / 2),
      y: CY + RY * Math.sin((2 * Math.PI * i / n) - Math.PI / 2),
    }))
    return { nodePositions, sc, nW, nH, hubR, fNm, fUrl, fSt, fHub }
  }, [connections, CX, CY])

  if (connections.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0', background: '#0f172a', borderRadius: 16, color: '#475569' }}>
        <ApiOutlined style={{ fontSize: 48, marginBottom: 12, display: 'block' }} />
        등록된 연계API가 없습니다.
      </div>
    )
  }

  return (
    <div style={{ background: '#0f172a', borderRadius: 16, overflow: 'hidden', border: '1px solid #1e293b' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
        <defs>
          <pattern id="topo-grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <circle cx="15" cy="15" r="0.7" fill="#334155" opacity="0.5" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#topo-grid)" />

        {/* Lines + animated flow dots */}
        {connections.map((conn, idx) => {
          const pos = nodePositions[idx]
          if (!pos) return null
          const status = results[conn.id]?.status ?? 'UNKNOWN'
          const ls = LINE_STYLE[status] ?? LINE_STYLE.UNKNOWN
          const pathD = `M ${CX},${CY} L ${pos.x},${pos.y}`
          return (
            <g key={`line-${conn.id}`}>
              <line
                x1={CX} y1={CY} x2={pos.x} y2={pos.y}
                stroke={ls.stroke} strokeWidth={1.5}
                strokeDasharray={ls.dasharray} opacity={ls.opacity}
              />
              {ls.animated && [0, 1].map(di => (
                <circle key={di} r={4} fill={ls.stroke} opacity={0.9}>
                  <animateMotion
                    path={pathD}
                    dur={`${ls.dur + idx * 0.22}s`}
                    begin={`${di * (ls.dur / 2) + idx * 0.1}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              ))}
            </g>
          )
        })}

        {/* Center hub — 선택된 프로젝트(내 사이트) */}
        <g transform={`translate(${CX},${CY})`}>
          <circle r={hubR + 14} fill="none" stroke="#6366f1" strokeWidth={1} opacity={0.2}>
            <animate attributeName="r" values={`${hubR+14};${hubR+28};${hubR+14}`} dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.2;0;0.2" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle r={hubR} fill="#1e293b" stroke="#6366f1" strokeWidth={2.5} />
          <text y={-hubR * 0.22} textAnchor="middle" fill="#6366f1" fontSize={Math.round(fHub * 1.8)} fontWeight="bold">◈</text>
          <text y={hubR * 0.12} textAnchor="middle" fill="#e2e8f0" fontSize={fHub} fontWeight="600">
            {projectName.length > 12 ? projectName.slice(0, 12) + '…' : projectName}
          </text>
          <text y={hubR * 0.38} textAnchor="middle" fill="#94a3b8" fontSize={Math.round(fHub * 0.82)}>내 서비스</text>
        </g>

        {/* API nodes */}
        {connections.map((conn, idx) => {
          const pos = nodePositions[idx]
          if (!pos) return null
          const result  = results[conn.id]
          const status  = result?.status ?? 'UNKNOWN'
          const cfg     = STATUS_CFG[status]
          const isUp    = status === 'UP'
          const nameClr = isUp ? '#86efac' : status === 'TIMEOUT' ? '#fcd34d' : ['DOWN','ERROR'].includes(status) ? '#fca5a5' : '#94a3b8'
          const symbol  = isUp ? '●' : ['DOWN','ERROR'].includes(status) ? '✕' : status === 'TIMEOUT' ? '⧖' : status === 'CHECKING' ? '◌' : '○'
          const rawUrl  = result?.healthUrl ?? conn.healthUrl ?? conn.baseUrl ?? ''

          const hw = Math.round(nW / 2)
          const hh = Math.round(nH / 2)
          const badgeR = Math.max(7, Math.round(10 * sc))
          const maxNmLen = Math.max(10, Math.round(15 * sc))
          const maxUrlLen = Math.max(18, Math.round(26 * sc))
          const shortNmS  = conn.connNm.length > maxNmLen ? conn.connNm.slice(0, maxNmLen) + '…' : conn.connNm
          const shortUrlS = rawUrl.replace(/^https?:\/\//, '').slice(0, maxUrlLen)

          return (
            <g
              key={`node-${conn.id}`}
              transform={`translate(${pos.x},${pos.y})`}
              style={{ cursor: 'pointer' }}
              onClick={() => onNodeClick(conn)}
            >
              {/* invisible hit target */}
              <rect x={-(hw+6)} y={-(hh+6)} width={nW+12} height={nH+12} rx={14} fill="transparent" />
              {/* node body */}
              <rect x={-hw} y={-hh} width={nW} height={nH} rx={Math.round(11 * sc)} fill={cfg.darkBg} stroke={cfg.darkBorder} strokeWidth={Math.max(1, 2 * sc)} />
              {/* edit badge */}
              <circle cx={hw - badgeR} cy={-(hh - badgeR)} r={badgeR} fill="#0f172a" stroke={cfg.darkBorder} strokeWidth={1.5} />
              <text x={hw - badgeR} y={-(hh - badgeR) + Math.round(4 * sc)} textAnchor="middle" fill={cfg.color} fontSize={Math.round(11 * sc)}>✎</text>
              {/* name */}
              <text y={Math.round(-nH * 0.24)} textAnchor="middle" fill={nameClr} fontSize={fNm} fontWeight={700}>
                {symbol} {shortNmS}
              </text>
              {/* url */}
              <text y={Math.round(-nH * 0.03)} textAnchor="middle" fill="#64748b" fontSize={fUrl} fontFamily="monospace">
                {shortUrlS}
              </text>
              {/* status */}
              <text y={Math.round(nH * 0.19)} textAnchor="middle" fill={cfg.color} fontSize={fSt} fontWeight={600}>
                {cfg.label}{result?.responseTimeMs ? ` · ${result.responseTimeMs}ms` : ''}
              </text>
              {result?.errorMessage && (
                <text y={Math.round(nH * 0.37)} textAnchor="middle" fill="#f87171" fontSize={Math.max(6, fSt - 1)}>
                  {result.errorMessage.slice(0, Math.round(32 * sc))}
                </text>
              )}
            </g>
          )
        })}

        {/* Legend */}
        <g transform="translate(14,14)">
          <rect width={194} height={72} rx={6} fill="#1e293b" opacity={0.9} />
          {[
            { color: '#22c55e', label: '정상 (UP) — 데이터 흐름 애니메이션' },
            { color: '#ef4444', label: '오류 (DOWN)' },
            { color: '#f59e0b', label: '타임아웃 (TIMEOUT)' },
          ].map((it, i) => (
            <g key={i} transform={`translate(12,${18 + i * 18})`}>
              <circle r={5} fill={it.color} />
              <text x={14} y={4} fill="#94a3b8" fontSize={9}>{it.label}</text>
            </g>
          ))}
        </g>

        {/* hint */}
        <text x={W - 14} y={H - 12} textAnchor="end" fill="#334155" fontSize={9}>
          노드 클릭 시 연결 설정 편집
        </text>
      </svg>
    </div>
  )
}

/* ─── ResponseBar ───────────────────────────────────────────── */
const ResponseBar: React.FC<{ ms: number; timeout: number }> = ({ ms, timeout }) => {
  const pct   = Math.min(100, Math.round((ms / timeout) * 100))
  const color = ms < 500 ? '#22c55e' : ms < 1500 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ marginTop: 6 }}>
      <Progress percent={pct} strokeColor={color} showInfo={false} size="small" style={{ marginBottom: 2 }} />
      <Text style={{ fontSize: 11, color }}>{ms.toLocaleString()} ms</Text>
    </div>
  )
}

/* ─── Edit + Test Modal ─────────────────────────────────────── */
const EditTestModal: React.FC<{
  open: boolean
  conn: ApiConn | null
  initResult: StatusResult | null
  onClose: () => void
  onSaved: () => void
  onChecked: (r: StatusResult) => void
}> = ({ open, conn, initResult, onClose, onSaved, onChecked }) => {
  const [form]       = Form.useForm()
  const [testing, setTesting]       = useState(false)
  const [testResult, setTestResult] = useState<StatusResult | null>(null)
  const queryClient  = useQueryClient()

  useEffect(() => {
    if (open && conn) {
      form.setFieldsValue({ ...conn, useYn: conn.useYn === 'Y' })
      setTestResult(initResult)
    }
  }, [open, conn, initResult, form])

  const handleTest = async () => {
    if (!conn) return
    setTesting(true)
    try {
      const res  = await api.get(`/api-conn/${conn.id}/status`)
      const data = res.data.data as StatusResult
      setTestResult(data)
      onChecked(data)
    } catch {
      const err: StatusResult = {
        id: conn.id, connNm: conn.connNm,
        baseUrl: conn.baseUrl, healthUrl: conn.healthUrl ?? conn.baseUrl,
        status: 'ERROR', statusCode: null, responseTimeMs: 0,
        checkedAt: new Date().toISOString(), errorMessage: '요청 실패',
      }
      setTestResult(err)
      onChecked(err)
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    if (!conn) return
    try {
      const values = await form.validateFields()
      await api.put(`/api-conn/${conn.id}`, { ...values, useYn: values.useYn ? 'Y' : 'N' })
      message.success('저장되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['apiConnections'] })
      onSaved()
      onClose()
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return
      message.error('저장 중 오류가 발생했습니다.')
    }
  }

  const st      = testResult?.status
  const stColor = ({ UP: '#22c55e', DOWN: '#ef4444', TIMEOUT: '#f59e0b', ERROR: '#ef4444' } as Record<string, string>)[st ?? ''] ?? '#94a3b8'
  const stLabel = st === 'UP' ? '● 정상' : st === 'TIMEOUT' ? '⧖ 타임아웃' : st === 'CHECKING' ? '◌ 확인 중' : st ? '✕ 오류' : null

  return (
    <Modal
      title={
        <Space>
          <ApiOutlined style={{ color: '#6366f1' }} />
          <span>API 연결 설정</span>
          {conn?.connNm && <Tag color="purple">{conn.connNm}</Tag>}
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={640}
      destroyOnClose
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            icon={<ReloadOutlined spin={testing} />}
            onClick={handleTest}
            loading={testing}
          >
            연결 테스트
          </Button>
          <Space>
            <Button onClick={onClose}>취소</Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>저장</Button>
          </Space>
        </div>
      }
    >
      {/* 테스트 결과 배너 */}
      {testResult && stLabel && (
        <div style={{
          padding: '10px 16px', marginBottom: 16, borderRadius: 8,
          background: stColor + '18', border: `1px solid ${stColor}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
        }}>
          <Space wrap>
            <span style={{ color: stColor, fontWeight: 700, fontSize: 14 }}>{stLabel}</span>
            {(testResult.responseTimeMs ?? 0) > 0 && (
              <Text style={{ fontSize: 12, color: '#64748b' }}>{testResult.responseTimeMs}ms</Text>
            )}
            {testResult.statusCode != null && (
              <Tag color={testResult.statusCode < 400 ? 'green' : 'red'} style={{ margin: 0 }}>
                HTTP {testResult.statusCode}
              </Tag>
            )}
            {testResult.errorMessage && (
              <Text style={{ fontSize: 12, color: '#ef4444' }}>{testResult.errorMessage}</Text>
            )}
          </Space>
          {testResult.checkedAt && (
            <Text style={{ fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap' }}>
              {new Date(testResult.checkedAt).toLocaleTimeString('ko-KR')}
            </Text>
          )}
        </div>
      )}

      <Form form={form} layout="vertical" style={{ marginTop: 4 }}>
        <Form.Item name="connNm" label="연결 이름" rules={[{ required: true, message: '이름을 입력하세요.' }]}>
          <Input placeholder="예: 결제 게이트웨이, 사용자 인증 서버" />
        </Form.Item>

        <Form.Item name="method" label="HTTP 메서드" rules={[{ required: true }]}>
          <Select style={{ width: 120 }}
            options={[{ value: 'GET', label: 'GET' }, { value: 'POST', label: 'POST' }]} />
        </Form.Item>

        <Form.Item name="baseUrl" label="기본 URL" rules={[{ required: true, message: 'URL을 입력하세요.' }]}>
          <Input placeholder="https://api.example.com" />
        </Form.Item>

        <Form.Item name="healthUrl" label="상태확인 URL" extra="비워두면 기본 URL로 상태를 확인합니다.">
          <Input placeholder="https://api.example.com/health" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="timeoutMs" label="타임아웃 (ms)" rules={[{ required: true }]}>
              <InputNumber min={500} max={30000} step={500} style={{ width: '100%' }} addonAfter="ms" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="reqHeaders" label="요청 헤더 (JSON)"
          extra='예: {"Authorization": "Bearer TOKEN", "X-API-Key": "KEY"}'>
          <Input.TextArea rows={2} placeholder='{"Authorization": "Bearer your-token"}' />
        </Form.Item>

        <Form.Item name="description" label="설명">
          <Input.TextArea rows={2} placeholder="이 API 연결에 대한 설명" />
        </Form.Item>

        <Form.Item name="useYn" label="사용여부" valuePropName="checked">
          <Switch checkedChildren="사용" unCheckedChildren="미사용" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

/* ─── Main Page ─────────────────────────────────────────────── */
const ApiStatusPage: React.FC = () => {
  const { currentProject } = useAuthStore()
  const queryClient = useQueryClient()

  const [results,     setResults]     = useState<Record<number, StatusResult>>({})
  const [checking,    setChecking]    = useState(false)
  const [lastAll,     setLastAll]     = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [viewMode,    setViewMode]    = useState<'card' | 'topology'>('topology')
  const [editConn,    setEditConn]    = useState<ApiConn | null>(null)
  const [editOpen,    setEditOpen]    = useState(false)

  const { data: connections = [] } = useQuery<ApiConn[]>({
    queryKey: ['apiConnections', currentProject?.projectId],
    queryFn: () =>
      api.get('/api-conn', { params: { projectId: currentProject?.projectId } })
        .then(r => (r.data.data ?? []).filter((c: ApiConn) => c.useYn === 'Y')),
  })

  const checkAll = useCallback(async () => {
    if (checking) return
    setChecking(true)
    const pending: Record<number, StatusResult> = {}
    connections.forEach(c => {
      pending[c.id] = {
        id: c.id, connNm: c.connNm, baseUrl: c.baseUrl,
        healthUrl: c.healthUrl ?? c.baseUrl,
        status: 'CHECKING', statusCode: null,
        responseTimeMs: 0, checkedAt: new Date().toISOString(), errorMessage: null,
      }
    })
    setResults(prev => ({ ...prev, ...pending }))
    try {
      const res  = await api.get('/api-conn/status', { params: { projectId: currentProject?.projectId } })
      const data: StatusResult[] = res.data.data ?? []
      const map: Record<number, StatusResult> = {}
      data.forEach(d => { map[d.id] = d })
      setResults(prev => ({ ...prev, ...map }))
      setLastAll(new Date().toLocaleTimeString('ko-KR'))
    } finally {
      setChecking(false)
    }
  }, [checking, connections, currentProject?.projectId])

  useEffect(() => { if (connections.length > 0) checkAll() }, [connections.length]) // eslint-disable-line

  useEffect(() => {
    if (!autoRefresh) return
    const t = setInterval(checkAll, 30000)
    return () => clearInterval(t)
  }, [autoRefresh, checkAll])

  const handleChecked = (result: StatusResult) =>
    setResults(prev => ({ ...prev, [result.id]: result }))

  const openEdit = (conn: ApiConn) => { setEditConn(conn); setEditOpen(true) }

  /* stats */
  const total        = connections.length
  const upCount      = Object.values(results).filter(r => r.status === 'UP').length
  const downCount    = Object.values(results).filter(r => ['DOWN','ERROR'].includes(r.status)).length
  const timeoutCount = Object.values(results).filter(r => r.status === 'TIMEOUT').length
  const avgMs        = (() => {
    const ups = Object.values(results).filter(r => r.status === 'UP' && r.responseTimeMs > 0)
    return ups.length ? Math.round(ups.reduce((s, r) => s + r.responseTimeMs, 0) / ups.length) : 0
  })()

  return (
    <div style={{ padding: 24 }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
        <Space>
          <Title level={4} style={{ margin: 0 }}>API 상태조회</Title>
          {currentProject && <Tag color="blue">{currentProject.projectNm}</Tag>}
          {lastAll && <Text style={{ fontSize: 12, color: '#94a3b8' }}>마지막 확인: {lastAll}</Text>}
        </Space>
        <Space wrap>
          <Segmented
            value={viewMode}
            onChange={v => setViewMode(v as 'card' | 'topology')}
            options={[
              { label: <Space size={4}><AppstoreOutlined />카드</Space>,      value: 'card' },
              { label: <Space size={4}><ApartmentOutlined />토폴로지</Space>, value: 'topology' },
            ]}
          />
          <Button
            size="small"
            type={autoRefresh ? 'primary' : 'default'}
            onClick={() => setAutoRefresh(v => !v)}
            style={{ fontSize: 12 }}
          >
            {autoRefresh ? '🔄 자동갱신 ON (30s)' : '자동갱신 OFF'}
          </Button>
          <Button
            icon={<ReloadOutlined spin={checking} />}
            type="primary"
            onClick={checkAll}
            loading={checking}
          >
            전체 확인
          </Button>
        </Space>
      </div>

      {/* 요약 카드 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small" style={{ background: '#f0fdf4', border: '1px solid #86efac' }}>
            <Statistic
              title={<span style={{ color: '#15803d', fontSize: 12 }}>정상 (UP)</span>}
              value={upCount} suffix={`/ ${total}`}
              valueStyle={{ color: '#16a34a', fontSize: 24 }}
              prefix={<CheckCircleFilled />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ background: '#fef2f2', border: '1px solid #fca5a5' }}>
            <Statistic
              title={<span style={{ color: '#dc2626', fontSize: 12 }}>오류 (DOWN)</span>}
              value={downCount} suffix={`/ ${total}`}
              valueStyle={{ color: '#dc2626', fontSize: 24 }}
              prefix={<CloseCircleFilled />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ background: '#fffbeb', border: '1px solid #fcd34d' }}>
            <Statistic
              title={<span style={{ color: '#d97706', fontSize: 12 }}>타임아웃</span>}
              value={timeoutCount} suffix={`/ ${total}`}
              valueStyle={{ color: '#d97706', fontSize: 24 }}
              prefix={<WarningFilled />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ background: '#eef2ff', border: '1px solid #a5b4fc' }}>
            <Statistic
              title={<span style={{ color: '#4f46e5', fontSize: 12 }}>평균 응답시간</span>}
              value={avgMs} suffix="ms"
              valueStyle={{ color: '#6366f1', fontSize: 24 }}
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 뷰 콘텐츠 */}
      {connections.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
          <ApiOutlined style={{ fontSize: 48, marginBottom: 12 }} />
          <div>등록된 연계API가 없습니다.</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>
            <a href="/admin/api-connections">연계API 설정</a>에서 API를 먼저 등록해 주세요.
          </div>
        </div>
      ) : viewMode === 'topology' ? (
        <TopologySVG
          connections={connections}
          results={results}
          projectName={currentProject?.projectNm ?? '내 서비스'}
          onNodeClick={openEdit}
        />
      ) : (
        <Row gutter={[16, 16]}>
          {connections.map(conn => {
            const result = results[conn.id]
            const status: CheckStatus = result?.status ?? 'UNKNOWN'
            const cfg = STATUS_CFG[status]
            return (
              <Col key={conn.id} xs={24} sm={12} lg={8} xl={6}>
                <div
                  onClick={() => openEdit(conn)}
                  style={{
                    background: cfg.bg, border: `1px solid ${cfg.border}`,
                    borderRadius: 12, padding: 16, height: '100%',
                    display: 'flex', flexDirection: 'column', gap: 8,
                    cursor: 'pointer', transition: 'box-shadow 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <ApiOutlined style={{ color: '#6366f1', marginRight: 6 }} />
                        {conn.connNm}
                      </div>
                      {conn.description && (
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {conn.description}
                        </div>
                      )}
                    </div>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      fontSize: 12, fontWeight: 700, color: cfg.color,
                      background: 'white', borderRadius: 20, padding: '2px 10px',
                      border: `1px solid ${cfg.border}`, whiteSpace: 'nowrap',
                    }}>
                      {cfg.icon}&nbsp;{cfg.label}
                    </div>
                  </div>

                  <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#475569', background: 'white', borderRadius: 6, padding: '4px 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {result?.healthUrl ?? conn.healthUrl ?? conn.baseUrl}
                  </div>

                  {result && ['UP','DOWN','TIMEOUT'].includes(result.status) && result.responseTimeMs > 0 && (
                    <ResponseBar ms={result.responseTimeMs} timeout={conn.timeoutMs} />
                  )}

                  {result?.errorMessage && (
                    <div style={{ fontSize: 11, color: '#dc2626', background: '#fff', borderRadius: 6, padding: '3px 8px', border: '1px solid #fca5a5' }}>
                      {result.errorMessage}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                    <Space size={4}>
                      {result?.statusCode != null && (
                        <Tag style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px', margin: 0 }}
                          color={result.statusCode < 400 ? 'green' : 'red'}>
                          HTTP {result.statusCode}
                        </Tag>
                      )}
                      {result?.checkedAt && (
                        <Text style={{ fontSize: 10, color: '#94a3b8' }}>
                          {new Date(result.checkedAt).toLocaleTimeString('ko-KR')}
                        </Text>
                      )}
                    </Space>
                    <Text style={{ fontSize: 11, color: '#6366f1' }}>클릭하여 편집 ›</Text>
                  </div>
                </div>
              </Col>
            )
          })}
        </Row>
      )}

      {/* 편집 팝업 */}
      <EditTestModal
        open={editOpen}
        conn={editConn}
        initResult={editConn ? (results[editConn.id] ?? null) : null}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['apiConnections'] })
          if (editConn) {
            api.get(`/api-conn/${editConn.id}/status`)
              .then(res => handleChecked(res.data.data))
              .catch(() => {})
          }
        }}
        onChecked={handleChecked}
      />
    </div>
  )
}

export default ApiStatusPage
