import React, { useState } from 'react'
import {
  Drawer, Button, Modal, Form, Input, Select, Space, Popconfirm,
  Tag, Tooltip, message, Alert, Typography, Badge, Divider, Row, Col,
  InputNumber, Empty, Switch
} from 'antd'
import { ResizableModal } from '@/components/ui/ResizableModal'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, PlayCircleOutlined,
  DatabaseOutlined, CheckCircleOutlined, CloseCircleOutlined,
  LoadingOutlined, CodeOutlined
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/axios'

const { Text } = Typography

// ─── 타입 ──────────────────────────────────────────────────────

export interface ScreenDataSource {
  id: number
  screenId: string
  sourceNm: string
  sourceType: string
  connId: string | null
  sqlText: string | null
  paramsDef: string | null
  description: string | null
  sortOrder: number
}

export interface ParamDef {
  name: string
  source: 'session' | 'input' | 'static'
  sourceKey: string
  defaultValue?: string
  label?: string
}

// ─── 파라미터 정의 에디터 ───────────────────────────────────────

const ParamDefEditor: React.FC<{
  value?: ParamDef[]
  onChange?: (v: ParamDef[]) => void
}> = ({ value = [], onChange }) => {
  const add = () =>
    onChange?.([...value, { name: '', source: 'input', sourceKey: '', defaultValue: '', label: '' }])
  const remove = (idx: number) => onChange?.(value.filter((_, i) => i !== idx))
  const update = (idx: number, field: keyof ParamDef, val: string) => {
    const next = [...value]
    next[idx] = { ...next[idx], [field]: val }
    onChange?.(next)
  }

  return (
    <div>
      <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>
        SQL에서 <code style={{ fontSize: 11 }}>:paramName</code> 형식으로 선언한 파라미터를 정의합니다.
      </div>
      {value.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
          {['이름 (:paramName)', '소스', 'sourceKey', '기본값', '레이블', ''].map((h, i) => (
            <div key={i} style={{
              fontSize: 10, color: '#aaa', fontWeight: 600,
              width: i === 0 ? 110 : i === 1 ? 108 : i === 2 ? 110 : i === 3 ? 88 : i === 4 ? 'auto' : 20,
              flex: i === 4 ? 1 : undefined,
            }}>{h}</div>
          ))}
        </div>
      )}
      {value.map((p, idx) => (
        <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
          <Input
            size="small" placeholder="userId"
            value={p.name}
            onChange={e => update(idx, 'name', e.target.value)}
            style={{ width: 110 }}
          />
          <Select
            size="small" value={p.source}
            onChange={v => update(idx, 'source', v)}
            style={{ width: 108 }}
            options={[
              { value: 'input',   label: '입력값' },
              { value: 'session', label: '세션(현재유저)' },
              { value: 'static',  label: '고정값' },
            ]}
          />
          <Input
            size="small"
            placeholder={p.source === 'session' ? 'userId' : p.source === 'static' ? '값 직접 입력' : '파라미터명과 동일'}
            value={p.sourceKey}
            onChange={e => update(idx, 'sourceKey', e.target.value)}
            style={{ width: 110 }}
          />
          <Input
            size="small" placeholder="기본값"
            value={p.defaultValue ?? ''}
            onChange={e => update(idx, 'defaultValue', e.target.value)}
            style={{ width: 88 }}
          />
          <Input
            size="small" placeholder="레이블 (화면 표시용)"
            value={p.label ?? ''}
            onChange={e => update(idx, 'label', e.target.value)}
            style={{ flex: 1 }}
          />
          <Button size="small" type="text" danger onClick={() => remove(idx)}>×</Button>
        </div>
      ))}
      <Button size="small" icon={<PlusOutlined />} onClick={add} style={{ marginTop: 4 }}>
        파라미터 추가
      </Button>
    </div>
  )
}

// ─── 데이터소스 바인딩 에디터 (필드 모달에서 사용) ────────────────

export interface DataBindingValue {
  enabled?: boolean
  sourceNm?: string
  column?: string
  rowIndex?: number
}

export const DataBindingEditor: React.FC<{
  value?: DataBindingValue
  onChange?: (v: DataBindingValue) => void
  screenId: string | undefined
}> = ({ value = {}, onChange, screenId }) => {
  const { data: dataSources = [] } = useQuery<ScreenDataSource[]>({
    queryKey: ['dataSources', screenId],
    queryFn: () => api.get(`/schema/admin/screens/${screenId}/data-sources`).then(r => r.data.data ?? []),
    enabled: !!screenId,
    staleTime: 30_000,
  })

  const set = (patch: Partial<DataBindingValue>) => onChange?.({ ...value, ...patch })

  // 선택된 소스의 컬럼 힌트 (마지막 테스트 결과 없이는 텍스트 입력만 가능)
  const selectedSource = dataSources.find(s => s.sourceNm === value.sourceNm)

  return (
    <div>
      <Alert
        message="데이터 바인딩"
        description="화면 로드 시 데이터 소스를 실행하고 지정한 컬럼 값을 이 필드에 자동으로 채웁니다. 먼저 '데이터 소스' 버튼에서 SQL을 등록하세요."
        type="info" showIcon style={{ marginBottom: 14, fontSize: 12 }}
      />

      <Form.Item label="데이터 바인딩 사용" style={{ marginBottom: 12 }}>
        <Switch
          checked={!!value.enabled}
          onChange={v => set({ enabled: v })}
          checkedChildren="ON" unCheckedChildren="OFF"
        />
      </Form.Item>

      {value.enabled && (
        <>
          {dataSources.length === 0 ? (
            <Alert
              message="등록된 데이터 소스가 없습니다."
              description="상단 툴바의 '데이터 소스' 버튼을 클릭하여 SQL 소스를 먼저 등록하세요."
              type="warning" showIcon style={{ marginBottom: 12 }}
            />
          ) : (
            <>
              <Form.Item label="데이터 소스" style={{ marginBottom: 12 }}>
                <Select
                  placeholder="데이터 소스 선택"
                  value={value.sourceNm ?? undefined}
                  onChange={v => set({ sourceNm: v, column: '' })}
                  options={dataSources.map(s => ({
                    value: s.sourceNm,
                    label: (
                      <Space size={4}>
                        <span style={{ fontWeight: 600 }}>{s.sourceNm}</span>
                        {s.description && <Text type="secondary" style={{ fontSize: 11 }}>— {s.description}</Text>}
                      </Space>
                    ),
                  }))}
                />
              </Form.Item>

              {selectedSource?.sqlText && (
                <div style={{
                  marginBottom: 12, background: '#f5f5f5', borderRadius: 4,
                  padding: '6px 10px', fontFamily: 'monospace', fontSize: 11, color: '#555',
                }}>
                  {selectedSource.sqlText.substring(0, 200)}
                  {(selectedSource.sqlText.length ?? 0) > 200 ? '...' : ''}
                </div>
              )}

              <Form.Item
                label={<Space size={4}>컬럼명<Text type="secondary" style={{ fontSize: 11 }}>(SQL 결과의 컬럼명 — 소문자)</Text></Space>}
                style={{ marginBottom: 12 }}
              >
                <Input
                  placeholder="예: user_nm, dept_nm"
                  value={value.column ?? ''}
                  onChange={e => set({ column: e.target.value })}
                />
              </Form.Item>

              <Form.Item label="행 인덱스 (0부터)" tooltip="단일 행 조회는 0, 여러 행의 특정 인덱스 지정" style={{ marginBottom: 8 }}>
                <InputNumber
                  min={0}
                  value={value.rowIndex ?? 0}
                  onChange={v => set({ rowIndex: v ?? 0 })}
                  style={{ width: 120 }}
                />
              </Form.Item>
            </>
          )}
        </>
      )}
    </div>
  )
}

// ─── DataSourceManager (Drawer + Modal) ────────────────────────

interface DataSourceManagerProps {
  screenId: string | undefined
  open: boolean
  onClose: () => void
}

const DataSourceManager: React.FC<DataSourceManagerProps> = ({ screenId, open, onClose }) => {
  const queryClient = useQueryClient()
  const [editOpen,    setEditOpen]    = useState(false)
  const [editingItem, setEditingItem] = useState<ScreenDataSource | null>(null)
  const [testLoading, setTestLoading] = useState(false)
  const [testResult,  setTestResult]  = useState<{
    success: boolean; rowCount?: number
    previewRows?: Record<string, unknown>[]
    error?: string; elapsedMs?: number
  } | null>(null)
  const [testParams, setTestParams] = useState<Record<string, string>>({})
  const [form] = Form.useForm()

  const watchedParamsDef = Form.useWatch('paramsDef', form) as ParamDef[] | undefined ?? []

  // ─── 쿼리 ─────────────────────────────────────────────────
  const { data: dataSources = [], isLoading } = useQuery<ScreenDataSource[]>({
    queryKey: ['dataSources', screenId],
    queryFn: () => api.get(`/schema/admin/screens/${screenId}/data-sources`).then(r => r.data.data ?? []),
    enabled: !!screenId && open,
  })

  const { data: dbConns = [] } = useQuery<{ connId: string; connName: string }[]>({
    queryKey: ['dbConnections'],
    queryFn: () => api.get('/datasource/connections').then(r => r.data.data ?? []),
    enabled: open,
  })

  // ─── Mutations ─────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (v: Record<string, unknown>) => {
      const paramsDef = Array.isArray(v.paramsDef) && (v.paramsDef as unknown[]).length > 0
        ? JSON.stringify(v.paramsDef)
        : null
      const body = { ...v, paramsDef, connId: v.connId || null }
      if (editingItem) {
        return api.put(`/schema/admin/screens/${screenId}/data-sources/${editingItem.id}`, body)
      }
      return api.post(`/schema/admin/screens/${screenId}/data-sources`, body)
    },
    onSuccess: () => {
      message.success(editingItem ? '데이터 소스가 수정되었습니다.' : '데이터 소스가 추가되었습니다.')
      closeEditModal()
      queryClient.invalidateQueries({ queryKey: ['dataSources', screenId] })
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } }
      message.error(e.response?.data?.message ?? '저장 중 오류가 발생했습니다.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      api.delete(`/schema/admin/screens/${screenId}/data-sources/${id}`),
    onSuccess: () => {
      message.success('삭제되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['dataSources', screenId] })
    },
    onError: () => message.error('삭제 중 오류가 발생했습니다.'),
  })

  // ─── 핸들러 ────────────────────────────────────────────────
  const closeEditModal = () => {
    setEditOpen(false)
    setEditingItem(null)
    setTestResult(null)
    setTestParams({})
    form.resetFields()
  }

  const openAdd = () => {
    setEditingItem(null)
    setTestResult(null)
    setTestParams({})
    form.resetFields()
    form.setFieldsValue({ paramsDef: [], sortOrder: 0 })
    setEditOpen(true)
  }

  const openEdit = (item: ScreenDataSource) => {
    setEditingItem(item)
    setTestResult(null)
    const parsedParams: ParamDef[] = (() => {
      try { return JSON.parse(item.paramsDef ?? '[]') } catch { return [] }
    })()
    const inputDefaults = Object.fromEntries(
      parsedParams.filter(p => p.source === 'input').map(p => [p.name, p.defaultValue ?? ''])
    )
    setTestParams(inputDefaults)
    form.setFieldsValue({ ...item, paramsDef: parsedParams })
    setEditOpen(true)
  }

  const handleTest = async () => {
    if (!editingItem) {
      message.warning('먼저 저장 후 테스트하세요.')
      return
    }
    setTestLoading(true)
    setTestResult(null)
    try {
      const currentSql = form.getFieldValue('sqlText') as string | undefined
      const res = await api.post(
        `/schema/admin/screens/${screenId}/data-sources/${editingItem.id}/test`,
        { testParams, sqlText: currentSql ?? '' }
      )
      setTestResult(res.data.data)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { data?: { error?: string } } } }
      setTestResult({ success: false, error: e.response?.data?.data?.error ?? '실행 오류 발생' })
    } finally {
      setTestLoading(false)
    }
  }

  // 입력 파라미터 (source === 'input')만 테스트 패널에서 입력받음
  const inputParams = watchedParamsDef.filter((p: ParamDef) => p.source === 'input')
  const resultColumns = testResult?.previewRows?.[0] ? Object.keys(testResult.previewRows[0]) : []

  return (
    <>
      {/* ─ 목록 Drawer ─ */}
      <Drawer
        title={
          <Space>
            <DatabaseOutlined style={{ color: '#1677ff' }} />
            데이터 소스 관리
            <Badge count={dataSources.length} style={{ backgroundColor: '#1677ff' }} showZero />
          </Space>
        }
        open={open}
        onClose={onClose}
        width={560}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd} disabled={!screenId}>
            소스 추가
          </Button>
        }
      >
        <Alert
          message="SQL 데이터 소스"
          description="화면 로드 시 자동으로 SQL을 실행하여 필드에 데이터를 바인딩합니다. :paramName 방식으로 파라미터를 사용하세요."
          type="info" showIcon style={{ marginBottom: 16 }}
        />

        {!screenId ? (
          <Alert message="화면을 먼저 저장하세요." type="warning" showIcon />
        ) : isLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <LoadingOutlined style={{ fontSize: 24 }} />
            <div style={{ marginTop: 8, color: '#999' }}>불러오는 중...</div>
          </div>
        ) : dataSources.length === 0 ? (
          <Empty description="등록된 데이터 소스가 없습니다." style={{ padding: 40 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>소스 추가</Button>
          </Empty>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {dataSources.map(src => (
              <div
                key={src.id}
                style={{
                  border: '1px solid #f0f0f0', borderRadius: 8, padding: 14,
                  background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Space wrap>
                      <Text strong style={{ fontSize: 14 }}>{src.sourceNm}</Text>
                      <Tag color="blue">{src.sourceType}</Tag>
                      <Tag color={src.connId ? 'orange' : 'green'} style={{ fontSize: 11 }}>
                        {src.connId ?? 'SYSTEM_DB'}
                      </Tag>
                    </Space>
                    {src.description && (
                      <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{src.description}</div>
                    )}
                    {src.sqlText && (
                      <div style={{
                        marginTop: 8, background: '#f7f8fa', borderRadius: 4, padding: '4px 8px',
                        fontFamily: 'monospace', fontSize: 11, color: '#555',
                        maxHeight: 54, overflow: 'hidden', whiteSpace: 'pre',
                        borderLeft: '3px solid #1677ff',
                      }}>
                        {src.sqlText.substring(0, 140)}{src.sqlText.length > 140 ? '...' : ''}
                      </div>
                    )}
                    {src.paramsDef && (() => {
                      try {
                        const params: ParamDef[] = JSON.parse(src.paramsDef)
                        if (params.length === 0) return null
                        return (
                          <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {params.map(p => (
                              <Tag key={p.name} style={{ fontSize: 10 }}>
                                :{p.name} ({p.source})
                              </Tag>
                            ))}
                          </div>
                        )
                      } catch { return null }
                    })()}
                  </div>
                  <Space style={{ flexShrink: 0, marginLeft: 8 }}>
                    <Tooltip title="편집">
                      <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(src)} />
                    </Tooltip>
                    <Popconfirm
                      title="이 데이터 소스를 삭제하시겠습니까?"
                      description="이 소스에 바인딩된 필드도 함께 해제됩니다."
                      onConfirm={() => deleteMutation.mutate(src.id)}
                      okText="삭제" cancelText="취소" okButtonProps={{ danger: true }}
                    >
                      <Tooltip title="삭제">
                        <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                      </Tooltip>
                    </Popconfirm>
                  </Space>
                </div>
              </div>
            ))}
          </div>
        )}
      </Drawer>

      {/* ─ 추가/편집 모달 ─ */}
      <ResizableModal
        title={
          <Space>
            <DatabaseOutlined />
            {editingItem ? `데이터 소스 편집 — ${editingItem.sourceNm}` : '데이터 소스 추가'}
          </Space>
        }
        open={editOpen}
        onOk={() => form.submit()}
        onCancel={closeEditModal}
        confirmLoading={saveMutation.isPending}
        okText="저장"
        width={740}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={(v) => saveMutation.mutate(v as Record<string, unknown>)}>

          <Row gutter={12}>
            <Col span={10}>
              <Form.Item
                name="sourceNm"
                label="소스 이름"
                rules={[
                  { required: true, message: '이름 필수' },
                  { pattern: /^[A-Z][A-Z0-9_]*$/, message: '대문자 영문+_ 만 허용 (예: MAIN, USER_LIST)' },
                ]}
                tooltip="필드 바인딩 시 참조 키 — 대문자 영문+_ 형식"
              >
                <Input
                  placeholder="예: MAIN, USER_LOOKUP"
                  onChange={e => form.setFieldValue('sourceNm', e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="connId" label="DB 연결" tooltip="비워두면 시스템 DB 사용">
                <Select
                  allowClear placeholder="시스템 DB (기본)"
                  options={dbConns.map(c => ({ value: c.connId, label: `${c.connId} — ${c.connName}` }))}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="sortOrder" label="순서" initialValue={0}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="설명">
            <Input placeholder="예: 메인 사용자 조회" />
          </Form.Item>

          <Form.Item
            name="sqlText"
            label={
              <Space size={4}>
                <CodeOutlined />SQL
                <Text type="secondary" style={{ fontSize: 11 }}>
                  (SELECT / WITH 만 허용 · :paramName 으로 파라미터 사용)
                </Text>
              </Space>
            }
            rules={[{ required: true, message: 'SQL을 입력하세요' }]}
          >
            <Input.TextArea
              rows={7}
              style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6 }}
              placeholder={'SELECT user_id, user_nm, dept_nm\nFROM usr_info\nWHERE user_id = :userId\n  AND user_nm LIKE :keyword'}
            />
          </Form.Item>

          <Divider orientation="left" plain style={{ fontSize: 13 }}>파라미터 정의</Divider>
          <Form.Item name="paramsDef" noStyle initialValue={[]}>
            <ParamDefEditor />
          </Form.Item>

          {/* ─ 테스트 실행 패널 ─ */}
          <Divider orientation="left" plain style={{ fontSize: 13, marginTop: 16 }}>테스트 실행</Divider>

          {!editingItem ? (
            <Alert message="저장 후 테스트가 가능합니다." type="info" showIcon />
          ) : (
            <div>
              {inputParams.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <Text style={{ fontSize: 12, color: '#666' }}>입력 파라미터 값 (source=input 파라미터만 표시됩니다):</Text>
                  <Row gutter={8} style={{ marginTop: 6 }}>
                    {inputParams.map((p: ParamDef) => (
                      <Col key={p.name} span={12} style={{ marginBottom: 6 }}>
                        <Space.Compact style={{ width: '100%' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center',
                            padding: '0 8px', background: '#f5f5f5',
                            border: '1px solid #d9d9d9', borderRight: 'none',
                            borderRadius: '6px 0 0 6px', fontSize: 11, color: '#1677ff', whiteSpace: 'nowrap',
                          }}>:{p.name}</span>
                          <Input
                            size="small"
                            placeholder={p.label ?? p.name}
                            value={testParams[p.name] ?? ''}
                            onChange={e => setTestParams(prev => ({ ...prev, [p.name]: e.target.value }))}
                            style={{ borderRadius: '0 6px 6px 0' }}
                          />
                        </Space.Compact>
                      </Col>
                    ))}
                  </Row>
                </div>
              )}

              <Button
                icon={<PlayCircleOutlined />}
                loading={testLoading}
                onClick={handleTest}
                type="primary"
                ghost
                size="small"
              >
                SQL 테스트 실행
              </Button>

              {testResult && (
                <div style={{ marginTop: 12 }}>
                  {testResult.success ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
                        <Text style={{ color: '#52c41a', fontWeight: 600 }}>
                          실행 성공 — {testResult.rowCount}행 반환 ({testResult.elapsedMs}ms)
                        </Text>
                      </div>
                      {resultColumns.length > 0 && (
                        <div style={{
                          fontSize: 11, color: '#1677ff', marginBottom: 8,
                          background: '#e6f4ff', borderRadius: 4, padding: '4px 10px',
                        }}>
                          <strong>반환 컬럼:</strong> {resultColumns.join(', ')}
                          <span style={{ color: '#888', marginLeft: 8 }}>← 필드 바인딩 시 이 이름을 사용하세요</span>
                        </div>
                      )}
                      {(testResult.previewRows ?? []).length > 0 && (
                        <div style={{ overflow: 'auto', maxHeight: 180, border: '1px solid #f0f0f0', borderRadius: 4 }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                            <thead>
                              <tr style={{ background: '#fafafa' }}>
                                {resultColumns.map(col => (
                                  <th key={col} style={{
                                    border: '1px solid #f0f0f0', padding: '4px 8px',
                                    textAlign: 'left', whiteSpace: 'nowrap',
                                  }}>
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {(testResult.previewRows ?? []).slice(0, 5).map((row, i) => (
                                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                  {resultColumns.map(col => (
                                    <td key={col} style={{ border: '1px solid #f0f0f0', padding: '4px 8px' }}>
                                      {String(row[col] ?? '')}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {(testResult.rowCount ?? 0) > 5 && (
                            <div style={{ textAlign: 'center', color: '#999', fontSize: 11, padding: 4 }}>
                              ... 총 {testResult.rowCount}행 중 최대 5행 미리보기
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Alert
                      type="error"
                      icon={<CloseCircleOutlined />}
                      message="실행 실패"
                      description={<code style={{ fontSize: 11 }}>{testResult.error}</code>}
                      showIcon
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </Form>
      </ResizableModal>
    </>
  )
}

export default DataSourceManager
