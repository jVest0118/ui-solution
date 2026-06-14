import React, { useState, useEffect, useCallback } from 'react'
import {
  Row, Col, Button, Space, Spin, Alert, message,
  Table, Input, Divider, Popconfirm, Typography, Card, Modal
} from 'antd'
import {
  SearchOutlined, PlusOutlined, SaveOutlined, ReloadOutlined,
  EditOutlined, DeleteOutlined
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { schemaApi } from '@/api/schema'
import { FieldRenderer } from '@/components/fields/FieldRenderer'
import { validateAll } from './ValidationRunner'
import type { ScreenSchema, FieldDef } from '@/types/schema'
import api from '@/api/axios'

const { Title } = Typography

type CodeMap = Record<string, { value: string; label: string }[]>

interface Props {
  screenId: string
  initialValues?: Record<string, unknown>
  onSuccess?: (data: unknown) => void
  popupMode?: boolean
  onSelect?: (row: Record<string, unknown>) => void
}

// layoutConfig를 JSON 파싱 (문자열 또는 객체 모두 처리)
function getLayoutConfig(cfg: unknown): Record<string, unknown> {
  if (!cfg) return {}
  if (typeof cfg === 'string') { try { return JSON.parse(cfg) } catch { return {} } }
  return cfg as Record<string, unknown>
}

// rowPos 기준으로 필드를 그룹핑 (2D 그리드: rowPos → 정렬된 필드 배열)
function groupByRowPos(fields: FieldDef[]): Map<number, FieldDef[]> {
  const map = new Map<number, FieldDef[]>()
  for (const f of fields) {
    const row = f.rowPos ?? 0
    if (!map.has(row)) map.set(row, [])
    map.get(row)!.push(f)
  }
  for (const rowFields of map.values()) {
    rowFields.sort((a, b) => (a.colPos ?? 0) - (b.colPos ?? 0))
  }
  return map
}

// ─── 코드옵션 로더 ────────────────────────────────────────────
const CodeOptionsLoader: React.FC<{
  groupCd: string
  onLoaded: (groupCd: string, options: { value: string; label: string }[]) => void
}> = ({ groupCd, onLoaded }) => {
  const { data } = useQuery({
    queryKey: ['codeOptions', groupCd],
    queryFn: () => api.get(`/admin/codes/${groupCd}/options`).then(r => r.data.data ?? []),
    staleTime: 10 * 60 * 1000,
  })
  useEffect(() => { if (data) onLoaded(groupCd, data) }, [data, groupCd, onLoaded])
  return null
}

// ─── 폼 내부 (표 레이아웃) ───────────────────────────────────
const FormBody: React.FC<{
  schema: ScreenSchema
  screenId: string
  initialValues?: Record<string, unknown>
  onSuccess?: (data: unknown) => void
  compact?: boolean
}> = ({ schema, screenId, initialValues = {}, onSuccess, compact }) => {
  const [values, setValues] = useState<Record<string, unknown>>(initialValues)
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const [submitting, setSubmitting] = useState(false)
  const [codeMap, setCodeMap] = useState<CodeMap>({})
  const editId = initialValues._dataId as number | undefined
  const apiPath = schema.apiResource ?? screenId
  const formId = `form-${screenId}`

  const codeFields = schema.fields.filter(f => f.codeGroup && ['select', 'radio', 'checkbox'].includes(f.fieldType))
  const uniqueGroups = [...new Set(codeFields.map(f => f.codeGroup!))]

  const handleCodeLoaded = useCallback((groupCd: string, opts: { value: string; label: string }[]) => {
    setCodeMap(prev => ({ ...prev, [groupCd]: opts }))
  }, [])

  useEffect(() => {
    const defaults: Record<string, unknown> = {}
    schema.fields.forEach(f => {
      if (f.defaultValue !== undefined)
        defaults[f.fieldNm] = f.defaultValue === 'today' ? new Date().toISOString().slice(0, 10) : f.defaultValue
    })
    setValues(prev => ({ ...defaults, ...prev }))
  }, [schema])

  const handleChange = useCallback((fieldNm: string, value: unknown) => {
    setValues(prev => ({ ...prev, [fieldNm]: value }))
    setErrors(prev => { const n = { ...prev }; delete n[fieldNm]; return n })
  }, [])

  const handleSetError = useCallback((fieldNm: string, msg: string | undefined) => {
    setErrors(prev => ({ ...prev, [fieldNm]: msg }))
  }, [])

  const handleSave = async () => {
    const errs = validateAll(schema.fields, values)
    const eventErrs = Object.entries(errors).filter(([, v]) => v).reduce<Record<string, string>>(
      (acc, [k, v]) => { acc[k] = v as string; return acc }, {}
    )
    const allErrs = { ...errs, ...eventErrs }
    if (Object.keys(allErrs).length > 0) { setErrors(allErrs); message.error('입력값을 확인해주세요.'); return }
    setSubmitting(true)
    try {
      if (editId) await api.put(`/biz/${apiPath}/${editId}`, values)
      else await api.post(`/biz/${apiPath}`, values)
      message.success('저장되었습니다.')
      handleReset()
      onSuccess?.(values)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      message.error(err.response?.data?.message ?? '저장 중 오류가 발생했습니다.')
    } finally { setSubmitting(false) }
  }

  const handleReset = () => { setValues({}); setErrors({}) }

  const visibleFields = schema.fields.filter(f => !f.hidden)
  const layoutCfg = getLayoutConfig(schema.layoutConfig)
  const formCols = (layoutCfg.formCols as number) ?? 1

  // rowPos → colPos 정렬된 필드 맵
  const rowsByPos = groupByRowPos(visibleFields)
  const sortedRowNums = [...rowsByPos.keys()].sort((a, b) => a - b)

  // 표 셀 스타일
  const thStyle: React.CSSProperties = {
    background: '#fafafa',
    border: '1px solid #e8e8e8',
    padding: '10px 14px',
    fontWeight: 600,
    fontSize: 13,
    color: '#333',
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
    width: formCols > 1 ? '120px' : '140px',
  }

  const tdStyle: React.CSSProperties = {
    border: '1px solid #e8e8e8',
    padding: '8px 12px',
    verticalAlign: 'middle',
  }

  return (
    <>
      {uniqueGroups.map(g => <CodeOptionsLoader key={g} groupCd={g} onLoaded={handleCodeLoaded} />)}
      <form
        id={formId}
        aria-label={schema.screenNm}
        role="form"
        noValidate
        onSubmit={e => { e.preventDefault(); handleSave() }}
      >
        {/* ─ 표 형식 폼 레이아웃 (rowPos/colPos 기반 2D 배치) ─ */}
        <table
          style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}
          role="presentation"
        >
          <tbody>
            {sortedRowNums.map(rowNum => {
              const rowFields = rowsByPos.get(rowNum)!
              // 이 행에서 colPos → 필드 맵 (슬롯 점유 계산)
              const slotMap = new Map<number, FieldDef>()
              for (const f of rowFields) slotMap.set(f.colPos ?? 0, f)

              const cells: React.ReactNode[] = []
              let col = 0
              while (col < formCols) {
                const field = slotMap.get(col)
                if (field) {
                  const span = Math.min(field.colSpan || 1, formCols - col)
                  // th는 1 HTML 열, td는 2*span-1 HTML 열 (다음 슬롯들의 th+td 포함)
                  const tdColSpan = span > 1 ? 2 * span - 1 : 1
                  const fieldError = errors[field.fieldNm]
                  const isRequired = field.validationRules.some(r => r.ruleType === 'required')
                  cells.push(
                    <th key={`th-${field.fieldId}`} scope="row" style={thStyle}>
                      <label htmlFor={`${formId}-${field.fieldNm}`}>
                        {field.fieldLabel}
                        {isRequired && (
                          <span aria-hidden="true" style={{ color: '#ff4d4f', marginLeft: 3 }}>*</span>
                        )}
                      </label>
                    </th>,
                    <td
                      key={`td-${field.fieldId}`}
                      colSpan={tdColSpan}
                      style={{ ...tdStyle, background: fieldError ? '#fff2f0' : undefined }}
                    >
                      <FieldRenderer
                        field={field}
                        value={values[field.fieldNm]}
                        onChange={handleChange}
                        error={fieldError}
                        codeOptions={field.codeGroup ? (codeMap[field.codeGroup] ?? []) : []}
                        formValues={values}
                        onSetError={handleSetError}
                      />
                      {fieldError && (
                        <div role="alert" style={{ color: '#ff4d4f', fontSize: 12, marginTop: 4 }}>
                          {fieldError}
                        </div>
                      )}
                    </td>,
                  )
                  col += span
                } else {
                  // 빈 슬롯
                  cells.push(
                    <th key={`empty-th-${rowNum}-${col}`} style={thStyle} />,
                    <td key={`empty-td-${rowNum}-${col}`} style={tdStyle} />,
                  )
                  col++
                }
              }

              return <tr key={rowNum}>{cells}</tr>
            })}
          </tbody>
        </table>

        {/* ─ 버튼 영역 ─ */}
        {!compact && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
            {(schema.canCreate || schema.canUpdate) && (
              <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={submitting}>
                {editId ? '수정' : '저장'}
              </Button>
            )}
            <Button icon={<ReloadOutlined />} onClick={handleReset}>초기화</Button>
          </div>
        )}
        {compact && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <Button onClick={handleReset}>취소</Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={submitting}>저장</Button>
          </div>
        )}
      </form>
    </>
  )
}

// ─── Grid 렌더러 ─────────────────────────────────────────────
const GridRenderer: React.FC<{
  schema: ScreenSchema
  screenId: string
  onSelect?: (row: Record<string, unknown>) => void
  popupMode?: boolean
}> = ({ schema, screenId, onSelect, popupMode }) => {
  const [searchValues, setSearchValues] = useState<Record<string, string>>({})
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editRow, setEditRow] = useState<Record<string, unknown> | null>(null)
  const [codeMap, setCodeMap] = useState<CodeMap>({})
  const queryClient = useQueryClient()
  const apiPath = schema.apiResource ?? screenId

  const codeFields = schema.fields.filter(f => f.codeGroup && ['select', 'radio', 'checkbox'].includes(f.fieldType))
  const uniqueGroups = [...new Set(codeFields.map(f => f.codeGroup!))]
  const handleCodeLoaded = useCallback((g: string, opts: { value: string; label: string }[]) => {
    setCodeMap(prev => ({ ...prev, [g]: opts }))
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['bizData', screenId, page, searchValues],
    queryFn: () => api.get(`/biz/${apiPath}`, { params: { page, size: 20, ...searchValues } }).then(r => r.data.data),
    staleTime: 0,
  })

  const deleteMutation = useMutation({
    mutationFn: (dataId: number) => api.delete(`/biz/${apiPath}/${dataId}`),
    onSuccess: () => {
      message.success('삭제되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['bizData', screenId] })
    },
  })

  const searchFields = schema.fields.filter(f => !f.hidden && ['text', 'select'].includes(f.fieldType)).slice(0, 3)

  const columns = [
    ...schema.fields.filter(f => !f.hidden).map(f => ({
      title: f.fieldLabel,
      dataIndex: f.fieldNm,
      key: f.fieldNm,
      ellipsis: true,
      render: (v: unknown) => {
        if (f.codeGroup && codeMap[f.codeGroup]) {
          const opt = codeMap[f.codeGroup].find(o => o.value === String(v ?? ''))
          return opt?.label ?? String(v ?? '')
        }
        return String(v ?? '')
      },
    })),
    {
      title: '작업', key: '_action', width: popupMode ? 80 : 140,
      render: (_: unknown, row: Record<string, unknown>) => (
        <Space size={4}>
          {popupMode ? (
            <Button size="small" type="primary" onClick={() => onSelect?.(row)}>선택</Button>
          ) : (
            <>
              {schema.canUpdate && (
                <Button size="small" icon={<EditOutlined />}
                  onClick={() => { setEditRow(row); setModalOpen(true) }} />
              )}
              {schema.canDelete && (
                <Popconfirm title="삭제하시겠습니까?" onConfirm={() => deleteMutation.mutate(row._dataId as number)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              )}
            </>
          )}
        </Space>
      ),
    },
  ]

  const doSearch = () => { setPage(1); queryClient.invalidateQueries({ queryKey: ['bizData', screenId] }) }

  return (
    <div style={{ padding: 24 }}>
      {uniqueGroups.map(g => <CodeOptionsLoader key={g} groupCd={g} onLoaded={handleCodeLoaded} />)}
      <Title level={4} style={{ marginBottom: 16 }}>{schema.screenNm}</Title>

      {searchFields.length > 0 && (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={12} align="middle">
            {searchFields.map(f => (
              <Col key={f.fieldId} span={7}>
                <Input
                  placeholder={f.fieldLabel}
                  value={searchValues[f.fieldNm] ?? ''}
                  onChange={e => setSearchValues(prev => ({ ...prev, [f.fieldNm]: e.target.value }))}
                  allowClear
                  onPressEnter={doSearch}
                />
              </Col>
            ))}
            <Col><Button icon={<SearchOutlined />} onClick={doSearch}>검색</Button></Col>
            {schema.canCreate && !popupMode && (
              <Col>
                <Button type="primary" icon={<PlusOutlined />}
                  onClick={() => { setEditRow(null); setModalOpen(true) }}>등록</Button>
              </Col>
            )}
          </Row>
        </Card>
      )}

      <Table
        dataSource={data?.rows ?? []}
        columns={columns}
        rowKey="_dataId"
        loading={isLoading}
        size="middle"
        pagination={{ current: page, total: data?.total ?? 0, pageSize: 20, onChange: setPage, showTotal: t => `총 ${t}건` }}
        onRow={popupMode ? row => ({ onDoubleClick: () => onSelect?.(row as Record<string, unknown>) }) : undefined}
      />

      <Modal
        title={editRow?._dataId ? '수정' : '신규 등록'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditRow(null) }}
        footer={null}
        width={680}
        destroyOnHidden
      >
        <FormBody
          schema={schema}
          screenId={screenId}
          initialValues={editRow ?? {}}
          compact
          onSuccess={() => {
            setModalOpen(false)
            setEditRow(null)
            queryClient.invalidateQueries({ queryKey: ['bizData', screenId] })
          }}
        />
      </Modal>
    </div>
  )
}

// ─── Form 렌더러 (전체 페이지) ───────────────────────────────
const FormRenderer: React.FC<{
  schema: ScreenSchema
  screenId: string
  initialValues?: Record<string, unknown>
  onSuccess?: (data: unknown) => void
}> = ({ schema, screenId, initialValues, onSuccess }) => (
  <div style={{ padding: 24 }}>
    <Title level={4} style={{ marginBottom: 20 }}>{schema.screenNm}</Title>
    <FormBody schema={schema} screenId={screenId} initialValues={initialValues} onSuccess={onSuccess} />
  </div>
)

// ─── Master-Detail 렌더러 ─────────────────────────────────────
const MasterDetailRenderer: React.FC<{ schema: ScreenSchema; screenId: string }> = ({ schema, screenId }) => {
  const [selectedRow, setSelectedRow] = useState<Record<string, unknown> | null>(null)

  return (
    <div>
      <GridRenderer schema={schema} screenId={screenId} onSelect={setSelectedRow} />
      {selectedRow && (
        <>
          <Divider style={{ margin: 0 }} />
          <Card title="상세 정보" style={{ margin: '0 24px 24px' }}>
            <FormBody schema={schema} screenId={screenId} initialValues={selectedRow} compact
              onSuccess={() => setSelectedRow(null)} />
          </Card>
        </>
      )}
    </div>
  )
}

// ─── 메인 진입점 ─────────────────────────────────────────────
export const ScreenRenderer: React.FC<Props> = ({ screenId, initialValues, onSuccess, popupMode, onSelect }) => {
  const { data: schema, isLoading, error } = useQuery<ScreenSchema>({
    queryKey: ['schema', screenId],
    queryFn: () => schemaApi.getSchema(screenId),
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '60px auto' }} />
  if (error || !schema) return <Alert type="error" message="화면 스키마를 불러오지 못했습니다." />

  switch (schema.screenType) {
    case 'grid':
      return <GridRenderer schema={schema} screenId={screenId} onSelect={onSelect} popupMode={popupMode} />
    case 'master-detail':
      return <MasterDetailRenderer schema={schema} screenId={screenId} />
    case 'popup':
      return <GridRenderer schema={schema} screenId={screenId} onSelect={onSelect} popupMode />
    case 'form':
    default:
      return <FormRenderer schema={schema} screenId={screenId} initialValues={initialValues} onSuccess={onSuccess} />
  }
}
