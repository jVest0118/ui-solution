import React, { useState } from 'react'
import {
  Button, Table, Modal, Form, Input, InputNumber, Select, Switch,
  Space, Tag, Tooltip, message, Popconfirm, Alert, Divider, Row, Col,
  Card, Badge, Typography, Tabs, Statistic, Spin
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ApiOutlined,
  CheckCircleOutlined, CloseCircleOutlined,
  InfoCircleOutlined, DatabaseOutlined, ReloadOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/axios'

const { Text, Title } = Typography

// ─── 타입 ────────────────────────────────────────────────────
interface DbConn {
  connId: string
  connName: string
  dbType: string
  host?: string
  port?: number
  dbName?: string
  schemaName?: string
  username?: string
  password?: string
  jdbcUrl?: string
  xaClass?: string
  isXa: string
  isActive: string
  isDefault: string
  poolMin: number
  poolMax: number
  connTimeout: number
  testQuery?: string
  description?: string
}

interface RuntimeStatus {
  status: 'ACTIVE' | 'ERROR' | 'INACTIVE' | 'PENDING' | 'STOPPED'
  isSystem: boolean
  registered: boolean
  error?: string
  poolActive?: number
  poolIdle?: number
  poolTotal?: number
  poolWaiting?: number
}

// ─── 상수 ────────────────────────────────────────────────────
const DB_TYPES = [
  { value: 'H2',         label: 'H2' },
  { value: 'MYSQL',      label: 'MySQL' },
  { value: 'MARIADB',    label: 'MariaDB' },
  { value: 'POSTGRESQL', label: 'PostgreSQL' },
  { value: 'ORACLE',     label: 'Oracle' },
  { value: 'MSSQL',      label: 'SQL Server' },
]

const DEFAULT_PORTS: Record<string, number> = {
  MYSQL: 3306, MARIADB: 3306, POSTGRESQL: 5432,
  ORACLE: 1521, MSSQL: 1433, H2: 9092,
}

const XA_CLASSES: Record<string, string> = {
  MYSQL:      'com.mysql.cj.jdbc.MysqlXADataSource',
  MARIADB:    'org.mariadb.jdbc.MariaDbXADataSource',
  POSTGRESQL: 'org.postgresql.xa.PGXADataSource',
  ORACLE:     'oracle.jdbc.xa.client.OracleXADataSource',
  MSSQL:      'com.microsoft.sqlserver.jdbc.SQLServerXADataSource',
}

const DB_COLORS: Record<string, string> = {
  H2: '#1890ff', MYSQL: '#f57c00', MARIADB: '#a33838',
  POSTGRESQL: '#336791', ORACLE: '#c74634', MSSQL: '#cc2927',
}

// ─── 런타임 상태 뱃지 ──────────────────────────────────────────
const RuntimeBadge: React.FC<{ rt?: RuntimeStatus }> = ({ rt }) => {
  if (!rt) return <Badge status="default" text="확인 중" />

  if (rt.isSystem) {
    return (
      <Tooltip title="Spring Boot 기본 DataSource — 항상 활성">
        <Badge status="processing" color="blue" text="시스템 DB" />
      </Tooltip>
    )
  }

  switch (rt.status) {
    case 'ACTIVE':
      return (
        <Tooltip title={
          rt.poolTotal !== undefined
            ? `사용중: ${rt.poolActive} / 유휴: ${rt.poolIdle} / 전체: ${rt.poolTotal}${rt.poolWaiting ? ` / 대기: ${rt.poolWaiting}` : ''}`
            : '런타임 등록됨'
        }>
          <Space size={4}>
            <Badge status="success" text="실행중" />
            {rt.poolTotal !== undefined && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                ({rt.poolActive}/{rt.poolTotal})
              </Text>
            )}
          </Space>
        </Tooltip>
      )
    case 'ERROR':
      return (
        <Tooltip title={rt.error ?? '초기화 실패 — 행을 펼쳐서 상세 오류 확인'}>
          <Badge status="error" text="오류" />
        </Tooltip>
      )
    case 'INACTIVE':
      return <Badge status="default" text="비활성" />
    case 'PENDING':
      return (
        <Tooltip title="활성 연결이지만 아직 등록되지 않음 — 재시작 후 등록됩니다">
          <Badge status="warning" text="재시작 필요" />
        </Tooltip>
      )
    default:
      return <Badge status="default" text={rt.status} />
  }
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────
const DbConnectionPage: React.FC = () => {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<DbConn | null>(null)
  const [testing, setTesting] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; elapsedMs?: number } | null>(null)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const watchedDbType = Form.useWatch('dbType', form)
  const watchedIsXa   = Form.useWatch('isXa', form)

  // ── 연결 목록
  const { data: connections = [], isLoading } = useQuery<DbConn[]>({
    queryKey: ['dbConnections'],
    queryFn: () => api.get('/datasource/connections').then(r => r.data.data),
  })

  // ── 런타임 상태 (30초 자동 갱신)
  const {
    data: runtimeMap = {},
    isLoading: rtLoading,
    refetch: refetchRuntime,
    isFetching: rtFetching,
  } = useQuery<Record<string, RuntimeStatus>>({
    queryKey: ['dbRuntimeStatus'],
    queryFn: () => api.get('/datasource/connections/runtime-status').then(r => r.data.data),
    refetchInterval: 30_000,
  })

  const activeCount  = Object.values(runtimeMap).filter(r => r.status === 'ACTIVE').length
  const errorCount   = Object.values(runtimeMap).filter(r => r.status === 'ERROR').length
  const pendingCount = Object.values(runtimeMap).filter(r => r.status === 'PENDING').length

  // ── Mutations
  const saveMutation = useMutation({
    mutationFn: (v: Record<string, unknown>) => api.post('/datasource/connections', v),
    onSuccess: () => {
      message.success('저장되었습니다.')
      setOpen(false); form.resetFields(); setEditing(null); setTestResult(null)
      queryClient.invalidateQueries({ queryKey: ['dbConnections'] })
      queryClient.invalidateQueries({ queryKey: ['dbRuntimeStatus'] })
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } }
      message.error(e.response?.data?.message ?? '저장 중 오류가 발생했습니다.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (connId: string) => api.delete(`/datasource/connections/${connId}`),
    onSuccess: () => {
      message.success('삭제되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['dbConnections'] })
      queryClient.invalidateQueries({ queryKey: ['dbRuntimeStatus'] })
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } }
      message.error(e.response?.data?.message ?? '삭제 중 오류가 발생했습니다.')
    },
  })

  // ── 모달
  const openAdd = () => {
    form.resetFields()
    form.setFieldsValue({ isXa: false, isActive: true, isDefault: false, poolMin: 2, poolMax: 10, connTimeout: 30000 })
    setEditing(null); setTestResult(null); setOpen(true)
  }

  const openEdit = (conn: DbConn) => {
    setEditing(conn); setTestResult(null)
    form.setFieldsValue({
      ...conn,
      isXa:      conn.isXa      === 'Y',
      isActive:  conn.isActive  === 'Y',
      isDefault: conn.isDefault === 'Y',
      password: '',
    })
    setOpen(true)
  }

  const handleDbTypeChange = (dbType: string) => {
    form.setFieldValue('port',      DEFAULT_PORTS[dbType] ?? null)
    form.setFieldValue('xaClass',   XA_CLASSES[dbType]   ?? null)
    form.setFieldValue('testQuery', dbType === 'ORACLE' ? 'SELECT 1 FROM DUAL' : 'SELECT 1')
  }

  const handleTestDirect = async () => {
    const values = form.getFieldsValue()
    setTesting('direct'); setTestResult(null)
    try {
      const res = await api.post('/datasource/connections/test-direct', {
        ...values,
        isXa: values.isXa ? 'Y' : 'N', isActive: values.isActive ? 'Y' : 'N', isDefault: values.isDefault ? 'Y' : 'N',
      })
      setTestResult(res.data.data)
    } catch {
      setTestResult({ success: false, message: '연결 테스트 중 오류가 발생했습니다.' })
    } finally { setTesting(null) }
  }

  const handleTestSaved = async (connId: string) => {
    setTesting(connId)
    try {
      const res = await api.post(`/datasource/connections/${connId}/test`)
      const r = res.data.data
      r.success ? message.success(`[${connId}] 연결 성공 (${r.elapsedMs}ms)`) : message.error(`[${connId}] 연결 실패: ${r.message}`)
    } catch { message.error('연결 테스트 중 오류가 발생했습니다.') }
    finally { setTesting(null) }
  }

  const handleSave = (v: Record<string, unknown>) => {
    saveMutation.mutate({
      ...v,
      connId:    editing?.connId ?? v.connId,
      isXa:      v.isXa      ? 'Y' : 'N',
      isActive:  v.isActive  ? 'Y' : 'N',
      isDefault: v.isDefault ? 'Y' : 'N',
    })
  }

  // ── 테이블 컬럼
  const columns = [
    {
      title: '런타임 상태',
      width: 140,
      render: (_: unknown, r: DbConn) =>
        rtLoading ? <Spin size="small" /> : <RuntimeBadge rt={runtimeMap[r.connId]} />,
    },
    {
      title: '연결명',
      dataIndex: 'connName',
      render: (v: string, r: DbConn) => (
        <Space>
          <DatabaseOutlined style={{ color: DB_COLORS[r.dbType] ?? '#1677ff' }} />
          <Text strong>{v}</Text>
          {r.isDefault === 'Y' && <Tag color="blue">기본</Tag>}
          {r.isXa      === 'Y' && <Tag color="purple">XA</Tag>}
          {r.isActive  === 'N' && <Tag color="default">비활성</Tag>}
        </Space>
      ),
    },
    {
      title: 'DB 유형', dataIndex: 'dbType', width: 110,
      render: (v: string) => <Tag color={DB_COLORS[v] ?? 'default'}>{v}</Tag>,
    },
    {
      title: '연결 정보',
      render: (_: unknown, r: DbConn) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {r.jdbcUrl || (r.host ? `${r.host}:${r.port ?? '-'} / ${r.dbName ?? '-'}` : '-')}
        </Text>
      ),
    },
    {
      title: '커넥션 풀 (사용/유휴/전체)',
      width: 170,
      render: (_: unknown, r: DbConn) => {
        const rt = runtimeMap[r.connId]
        if (rt?.poolTotal !== undefined) {
          return (
            <Space size={4} style={{ fontSize: 12 }}>
              <Tooltip title="사용중"><Tag color="blue"  style={{ margin: 0 }}>{rt.poolActive}</Tag></Tooltip>
              <Text type="secondary">/</Text>
              <Tooltip title="유휴"><Tag color="green" style={{ margin: 0 }}>{rt.poolIdle}</Tag></Tooltip>
              <Text type="secondary">/</Text>
              <Tooltip title="전체"><Tag style={{ margin: 0 }}>{rt.poolTotal}</Tag></Tooltip>
            </Space>
          )
        }
        return <Text type="secondary" style={{ fontSize: 12 }}>{r.poolMin} ~ {r.poolMax}</Text>
      },
    },
    {
      title: '설명', dataIndex: 'description',
      render: (v: string) => <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: '작업', width: 120,
      render: (_: unknown, r: DbConn) => (
        <Space size={4}>
          <Tooltip title="연결 테스트">
            <Button size="small" type="text" icon={<ApiOutlined />}
              loading={testing === r.connId} onClick={() => handleTestSaved(r.connId)} />
          </Tooltip>
          <Tooltip title="편집">
            <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          </Tooltip>
          {r.connId !== 'SYSTEM_DB' && (
            <Popconfirm title="이 연결을 삭제하시겠습니까?" onConfirm={() => deleteMutation.mutate(r.connId)} okText="삭제" cancelText="취소">
              <Tooltip title="삭제"><Button size="small" type="text" danger icon={<DeleteOutlined />} /></Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>데이터베이스 연결 관리</Title>
          <Text type="secondary">외부 DB 연결 설정 및 런타임 DataSource 상태 모니터링</Text>
        </div>
        <Space>
          <Tooltip title="런타임 상태 새로고침">
            <Button icon={<ReloadOutlined spin={rtFetching} />} onClick={() => refetchRuntime()}>상태 갱신</Button>
          </Tooltip>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>연결 추가</Button>
        </Space>
      </div>

      {/* 재시작 안내 */}
      <Alert
        type="info" showIcon style={{ marginBottom: 16 }}
        message="변경사항 적용 안내"
        description="연결 추가·수정·삭제는 DB에 저장됩니다. 런타임 DataSource 등록은 애플리케이션 재시작 시 자동으로 적용됩니다."
      />

      {/* 오류 배너 */}
      {errorCount > 0 && (
        <Alert type="error" showIcon style={{ marginBottom: 16 }}
          message={`${errorCount}개 연결 초기화 실패`}
          description="행을 클릭해 오류 메시지를 확인하고, 연결 정보 수정 후 재시작하세요."
        />
      )}

      {/* 통계 카드 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        {[
          { title: '실행중',       value: activeCount,         icon: <CheckCircleOutlined />, color: '#52c41a' },
          { title: '오류',         value: errorCount,          icon: <CloseCircleOutlined />, color: errorCount  > 0 ? '#ff4d4f' : undefined },
          { title: '재시작 필요',  value: pendingCount,        icon: <ClockCircleOutlined />, color: pendingCount > 0 ? '#fa8c16' : undefined },
          { title: '전체 등록',    value: connections.length,  icon: <DatabaseOutlined />,    color: undefined },
        ].map(s => (
          <Col span={6} key={s.title}>
            <Card size="small">
              <Statistic title={s.title} value={s.value}
                prefix={React.cloneElement(s.icon, { style: { color: s.color } })}
                valueStyle={{ color: s.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* 연결 목록 */}
      <Table
        rowKey="connId"
        columns={columns}
        dataSource={connections}
        loading={isLoading}
        pagination={false}
        size="small"
        bordered
        expandable={{
          expandedRowRender: (r: DbConn) => {
            const rt = runtimeMap[r.connId]
            return (
              <Card size="small" style={{ margin: '4px 0' }}>
                <Row gutter={16}>
                  <Col span={6}><Text type="secondary">연결 ID</Text><br /><Text code>{r.connId}</Text></Col>
                  <Col span={6}><Text type="secondary">사용자명</Text><br /><Text>{r.username || '-'}</Text></Col>
                  <Col span={6}><Text type="secondary">타임아웃</Text><br /><Text>{r.connTimeout}ms</Text></Col>
                  <Col span={6}><Text type="secondary">테스트 쿼리</Text><br /><Text code>{r.testQuery || 'SELECT 1'}</Text></Col>
                </Row>
                {rt?.error && (
                  <Alert type="error" showIcon style={{ marginTop: 8 }}
                    message="초기화 오류" description={<Text code style={{ fontSize: 12 }}>{rt.error}</Text>}
                  />
                )}
              </Card>
            )
          },
          rowExpandable: () => true,
        }}
      />

      {/* 추가/편집 모달 */}
      <Modal
        title={editing ? `연결 편집 — ${editing.connName}` : '새 DB 연결 추가'}
        open={open}
        onOk={() => form.submit()}
        onCancel={() => { setOpen(false); setTestResult(null) }}
        confirmLoading={saveMutation.isPending}
        okText="저장" width={700} destroyOnHidden
      >
        <Alert type="warning" showIcon style={{ marginBottom: 16 }}
          message="저장 후 애플리케이션 재시작 시 DataSource가 자동으로 등록됩니다."
        />

        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Tabs size="small" items={[
            {
              key: 'basic', label: '기본 설정',
              children: (
                <>
                  <Row gutter={12}>
                    <Col span={12}>
                      <Form.Item name="connId" label="연결 ID"
                        rules={[{ required: true }, { pattern: /^[A-Z][A-Z0-9_]*$/, message: '대문자·숫자·밑줄만 허용' }]}>
                        <Input placeholder="BIZMAIN_DB" disabled={!!editing}
                          onChange={e => form.setFieldValue('connId', e.target.value.toUpperCase())} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="connName" label="연결명" rules={[{ required: true }]}>
                        <Input placeholder="업무 메인 DB" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={12}>
                    <Col span={8}>
                      <Form.Item name="dbType" label="DB 유형" rules={[{ required: true }]}>
                        <Select options={DB_TYPES} onChange={handleDbTypeChange} placeholder="선택" />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name="isActive" label="활성 여부" valuePropName="checked">
                        <Switch checkedChildren="활성" unCheckedChildren="비활성" />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name="isDefault" label="기본 연결" valuePropName="checked">
                        <Switch checkedChildren="기본" unCheckedChildren="일반" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Divider orientation="left" plain style={{ fontSize: 12 }}>연결 정보</Divider>
                  <Form.Item name="jdbcUrl" label={
                    <Space>JDBC URL <Text type="secondary" style={{ fontSize: 11 }}>(입력 시 Host/Port 무시)</Text></Space>
                  }>
                    <Input placeholder="jdbc:mysql://localhost:3306/mydb" />
                  </Form.Item>
                  <Row gutter={12}>
                    <Col span={14}><Form.Item name="host" label="Host"><Input placeholder="localhost" /></Form.Item></Col>
                    <Col span={10}><Form.Item name="port" label="Port"><InputNumber style={{ width: '100%' }} min={1} max={65535} /></Form.Item></Col>
                  </Row>
                  <Row gutter={12}>
                    <Col span={12}><Form.Item name="dbName" label="DB명"><Input placeholder="mydb" /></Form.Item></Col>
                    <Col span={12}><Form.Item name="schemaName" label="스키마명"><Input placeholder="public" /></Form.Item></Col>
                  </Row>
                  <Row gutter={12}>
                    <Col span={12}><Form.Item name="username" label="사용자명"><Input placeholder="root" /></Form.Item></Col>
                    <Col span={12}>
                      <Form.Item name="password" label={editing ? '비밀번호 (변경 시에만 입력)' : '비밀번호'}>
                        <Input.Password placeholder={editing ? '변경하지 않으려면 비워두세요' : ''} />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item name="description" label="설명">
                    <Input.TextArea rows={2} />
                  </Form.Item>
                </>
              ),
            },
            {
              key: 'pool', label: '커넥션 풀',
              children: (
                <>
                  <Alert type="info" showIcon style={{ marginBottom: 16 }} message="HikariCP 설정 — 재시작 시 적용됩니다." />
                  <Row gutter={12}>
                    <Col span={8}><Form.Item name="poolMin" label="최소 풀 크기"><InputNumber min={1} max={100} style={{ width: '100%' }} /></Form.Item></Col>
                    <Col span={8}><Form.Item name="poolMax" label="최대 풀 크기"><InputNumber min={1} max={500} style={{ width: '100%' }} /></Form.Item></Col>
                    <Col span={8}><Form.Item name="connTimeout" label="연결 타임아웃 (ms)"><InputNumber min={1000} max={300000} style={{ width: '100%' }} /></Form.Item></Col>
                  </Row>
                  <Form.Item name="testQuery" label="유효성 테스트 쿼리"><Input placeholder="SELECT 1" /></Form.Item>
                </>
              ),
            },
            {
              key: 'xa',
              label: <Space>XA 설정 {watchedIsXa && <Badge dot status="processing" />}</Space>,
              children: (
                <>
                  <Alert type="warning" showIcon style={{ marginBottom: 16 }} message="XA 분산 트랜잭션 설정"
                    description={<ul style={{ margin: 0, paddingLeft: 16 }}>
                      <li>여러 DB에 걸친 ACID 트랜잭션을 보장합니다.</li>
                      <li>Spring Boot JTA(Atomikos) 의존성이 필요합니다.</li>
                      <li>H2는 XA를 지원하지 않습니다.</li>
                    </ul>}
                  />
                  <Form.Item name="isXa" label="XA DataSource 사용" valuePropName="checked">
                    <Switch checkedChildren="XA 사용" unCheckedChildren="일반" disabled={watchedDbType === 'H2'} />
                  </Form.Item>
                  {watchedIsXa && (
                    <>
                      <Form.Item name="xaClass"
                        label={<Space>XA DataSource 클래스 <Tooltip title="DB 벤더 제공 XADataSource 구현 클래스"><InfoCircleOutlined /></Tooltip></Space>}
                        rules={[{ required: true, message: 'XA 클래스명 필수' }]}>
                        <Input placeholder="com.mysql.cj.jdbc.MysqlXADataSource" />
                      </Form.Item>
                      <Card size="small" style={{ background: '#f6ffed', border: '1px solid #b7eb8f' }}>
                        <Text style={{ fontSize: 12 }}>
                          <strong>주요 XA 클래스:</strong><br />
                          MySQL: <code>com.mysql.cj.jdbc.MysqlXADataSource</code><br />
                          PostgreSQL: <code>org.postgresql.xa.PGXADataSource</code><br />
                          MariaDB: <code>org.mariadb.jdbc.MariaDbXADataSource</code><br />
                          Oracle: <code>oracle.jdbc.xa.client.OracleXADataSource</code><br />
                          MSSQL: <code>com.microsoft.sqlserver.jdbc.SQLServerXADataSource</code>
                        </Text>
                      </Card>
                    </>
                  )}
                </>
              ),
            },
          ]} />

          <Divider />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Button icon={<ApiOutlined />} loading={testing === 'direct'} onClick={handleTestDirect}>
              저장 전 연결 테스트
            </Button>
            {testResult && (
              <Space>
                {testResult.success
                  ? <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
                  : <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />
                }
                <Text type={testResult.success ? 'success' : 'danger'}>
                  {testResult.success ? `연결 성공 (${testResult.elapsedMs}ms)` : testResult.message}
                </Text>
              </Space>
            )}
          </div>
        </Form>
      </Modal>
    </div>
  )
}

export default DbConnectionPage
