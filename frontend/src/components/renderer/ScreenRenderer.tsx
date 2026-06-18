import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  Row, Col, Button, Space, Spin, Alert, message,
  Input, Divider, Popconfirm, Typography, Card, Modal, Table, Tag, Tabs
} from 'antd'
import {
  SearchOutlined, PlusOutlined, SaveOutlined, ReloadOutlined,
  EditOutlined, DeleteOutlined, TableOutlined, FormOutlined,
  FileTextOutlined
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, GridReadyEvent, CellValueChangedEvent, GridApi } from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import { schemaApi } from '@/api/schema'
import { FieldRenderer } from '@/components/fields/FieldRenderer'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { validateAll } from './ValidationRunner'
import { evaluateFieldConditions } from '@/utils/conditionEvaluator'
import { executeActions, getBindingsForEvent } from '@/utils/eventActionExecutor'
import type { EventBinding } from '@/types/events'
import { DashboardRenderer } from './DashboardRenderer'
import { ReportRenderer } from './ReportRenderer'
import CanvasPageRenderer from './CanvasPageRenderer'
import type { ScreenSchema, FieldDef, ScreenSection, CanvasConfig } from '@/types/schema'
import api from '@/api/axios'
import { useTabStore } from '@/store/tabStore'

const { Title, Text } = Typography

type CodeMap = Record<string, { value: string; label: string }[]>

interface Props {
  screenId: string
  initialValues?: Record<string, unknown>
  onSuccess?: (data: unknown) => void
  popupMode?: boolean
  onSelect?: (row: Record<string, unknown>) => void
}

function getLayoutConfig(cfg: unknown): Record<string, unknown> {
  if (!cfg) return {}
  if (typeof cfg === 'string') { try { return JSON.parse(cfg) } catch { return {} } }
  return cfg as Record<string, unknown>
}

function getButtonConfig(cfg: unknown) {
  const obj = getLayoutConfig(cfg)
  const buttons = (obj.buttons as Array<Record<string, unknown>> | undefined) ?? []
  const submitBtn = buttons.find(b => b.action === 'submit')
  const resetBtn = buttons.find(b => b.action === 'reset')
  return {
    align: (obj.align as 'left' | 'center' | 'right') ?? 'center',
    submitLabel: (submitBtn?.label as string) || undefined,
    resetLabel: (resetBtn?.label as string) || undefined,
    showReset: (resetBtn?.visible as boolean) !== false,
  }
}

const ALIGN_MAP: Record<string, string> = { left: 'flex-start', center: 'center', right: 'flex-end' }

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

// rowSpan으로 덮이는 셀 좌표 집합 (렌더링 시 스킵 대상)
function buildRowspanCovered(fields: FieldDef[]): Set<string> {
  const covered = new Set<string>()
  for (const f of fields) {
    if ((f.rowSpan || 1) <= 1) continue
    const rSpan = f.rowSpan
    const cSpan = f.colSpan || 1
    for (let ri = f.rowPos + 1; ri < f.rowPos + rSpan; ri++) {
      for (let ci = f.colPos; ci < f.colPos + cSpan; ci++) {
        covered.add(`${ri}-${ci}`)
      }
    }
  }
  return covered
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
  fields?: FieldDef[]
  eventBindings?: EventBinding[]
}> = ({ schema, screenId, initialValues = {}, onSuccess, compact, fields: propFields, eventBindings }) => {
  const [values, setValues] = useState<Record<string, unknown>>(initialValues)
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const [submitting, setSubmitting] = useState(false)
  const [codeMap, setCodeMap] = useState<CodeMap>({})
  const editId = initialValues._dataId as number | undefined
  const formId = `form-${screenId}-${Math.random().toString(36).slice(2, 7)}`

  const allFields = propFields ?? schema.fields

  const conditionResults = useMemo(() => {
    const map: Record<number, { visible: boolean; required: boolean; disabled: boolean }> = {}
    allFields.forEach(f => { map[f.fieldId] = evaluateFieldConditions(f.extraConfig, values) })
    return map
  }, [allFields, values])

  const codeFields = allFields.filter(f => f.codeGroup && ['select', 'radio', 'checkbox'].includes(f.fieldType))
  const uniqueGroups = [...new Set(codeFields.map(f => f.codeGroup!))]

  const handleCodeLoaded = useCallback((groupCd: string, opts: { value: string; label: string }[]) => {
    setCodeMap(prev => ({ ...prev, [groupCd]: opts }))
  }, [])

  useEffect(() => {
    const defaults: Record<string, unknown> = {}
    allFields.forEach(f => {
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

  // 데이터 바인딩: 화면 로드 시 data-source 실행 후 필드 값 주입 (신규 폼만)
  useEffect(() => {
    if (editId) return  // 기존 레코드 편집 시 바인딩 건너뜀

    interface DataBinding { enabled?: boolean; sourceNm?: string; column?: string; rowIndex?: number }
    const boundFields = allFields.filter(f => (f.extraConfig?.dataBinding as DataBinding | undefined)?.enabled === true)
    if (!boundFields.length) return

    api.get(`/schema/admin/screens/${screenId}/data-sources`)
      .then(r => {
        const sources: Array<{ id: number; sourceNm: string }> = r.data.data ?? []

        // sourceNm 별로 바인딩 필드 그룹핑
        const bySource = new Map<string, typeof boundFields>()
        boundFields.forEach(f => {
          const db = f.extraConfig?.dataBinding as DataBinding
          if (db?.sourceNm) {
            if (!bySource.has(db.sourceNm)) bySource.set(db.sourceNm, [])
            bySource.get(db.sourceNm)!.push(f)
          }
        })

        // 각 데이터 소스 실행 후 결과를 폼 값에 병합
        bySource.forEach((fields, sourceNm) => {
          const src = sources.find(s => s.sourceNm === sourceNm)
          if (!src) return

          api.post(`/schema/screens/${screenId}/data-sources/${src.id}/execute`, { inputParams: {} })
            .then(res => {
              const rows: Array<Record<string, unknown>> = res.data.data?.rows ?? []
              setValues(prev => {
                const next = { ...prev }
                fields.forEach(f => {
                  const db = f.extraConfig?.dataBinding as DataBinding
                  const col = db?.column
                  const rowIdx = db?.rowIndex ?? 0
                  if (col && rows[rowIdx] !== undefined && rows[rowIdx][col] !== undefined) {
                    next[f.fieldNm] = rows[rowIdx][col]
                  }
                })
                return next
              })
            })
            .catch(err => {
              console.warn(`데이터 바인딩 실패 [${sourceNm}]:`, err)
            })
        })
      })
      .catch(() => {/* 데이터 소스 목록 로드 실패 무시 */})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenId])

  // onLoad 이벤트 실행
  useEffect(() => {
    const actions = getBindingsForEvent(eventBindings, 'onLoad')
    if (actions.length) {
      executeActions(actions, {
        formValues: values,
        setFieldValue: handleChange,
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async () => {
    const currentVisibleFields = allFields.filter(f => !f.hidden && conditionResults[f.fieldId]?.visible !== false)
    const errs = validateAll(currentVisibleFields, values)
    // 조건부 필수 검증
    const condReqErrs: Record<string, string> = {}
    currentVisibleFields.forEach(f => {
      if (conditionResults[f.fieldId]?.required) {
        const val = values[f.fieldNm]
        if (val === undefined || val === null || String(val).trim() === '') {
          condReqErrs[f.fieldNm] = `${f.fieldLabel}은(는) 필수 입력입니다.`
        }
      }
    })
    const eventErrs = Object.entries(errors).filter(([, v]) => v).reduce<Record<string, string>>(
      (acc, [k, v]) => { acc[k] = v as string; return acc }, {}
    )
    const allErrs = { ...errs, ...condReqErrs, ...eventErrs }
    if (Object.keys(allErrs).length > 0) { setErrors(allErrs); message.error('입력값을 확인해주세요.'); return }
    setSubmitting(true)
    try {
      if (editId) await api.put(`/biz/${screenId}/${editId}`, values)
      else await api.post(`/biz/${screenId}`, values)
      message.success('저장되었습니다.')
      handleReset()
      onSuccess?.(values)
      // onSubmit 이벤트 실행
      const submitActions = getBindingsForEvent(eventBindings, 'onSubmit')
      if (submitActions.length) {
        executeActions(submitActions, {
          formValues: values,
          setFieldValue: handleChange,
        })
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      message.error(err.response?.data?.message ?? '저장 중 오류가 발생했습니다.')
    } finally { setSubmitting(false) }
  }

  const handleReset = () => { setValues({}); setErrors({}) }

  const visibleFields = allFields.filter(f => !f.hidden && conditionResults[f.fieldId]?.visible !== false)
  const layoutCfg = getLayoutConfig(schema.layoutConfig)
  const formCols = (layoutCfg.formCols as number) ?? 1
  const btnCfg = getButtonConfig(schema.buttonConfig)

  const rowsByPos = groupByRowPos(visibleFields)
  const sortedRowNums = [...rowsByPos.keys()].sort((a, b) => a - b)
  const rowspanCovered = useMemo(() => buildRowspanCovered(visibleFields), [visibleFields])

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
        <table
          style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}
          role="presentation"
        >
          <tbody>
            {sortedRowNums.map(rowNum => {
              const rowFields = rowsByPos.get(rowNum)!
              const slotMap = new Map<number, FieldDef>()
              for (const f of rowFields) slotMap.set(f.colPos ?? 0, f)

              const cells: React.ReactNode[] = []
              let col = 0
              while (col < formCols) {
                // rowSpan으로 이미 덮인 셀은 스킵
                if (rowspanCovered.has(`${rowNum}-${col}`)) { col++; continue }

                const field = slotMap.get(col)
                if (field) {
                  const span    = Math.min(field.colSpan || 1, formCols - col)
                  const rSpan   = field.rowSpan || 1
                  const tdColSpan = span > 1 ? 2 * span - 1 : 1
                  const fieldError = errors[field.fieldNm]
                  const condResult = conditionResults[field.fieldId] ?? { visible: true, required: false, disabled: false }
                  const isRequired = field.validationRules.some(r => r.ruleType === 'required') || condResult.required
                  const isCondDisabled = condResult.disabled

                  // info-banner / editor / grid / textarea → 전체 행 (th 레이블 + td 전체 너비)
                  const isFullWidth = field.fieldType === 'info-banner'
                    || field.fieldType === 'editor'
                    || field.fieldType === 'grid'
                    || (field.fieldType === 'textarea' && field.colSpan >= formCols)

                  // stat-card → th 없이 td만 (카드 자체에 레이블 포함)
                  const isStatCard = field.fieldType === 'stat-card'

                  if (isFullWidth) {
                    // info-banner는 th 레이블 숨김 (안내 내용 자체가 전체)
                    const showThLabel = field.fieldType !== 'info-banner'
                    cells.push(
                      <th key={`th-${field.fieldId}`} scope="row" style={showThLabel ? thStyle : { ...thStyle, padding: 0, width: 0, border: 'none' }}>
                        {showThLabel && (
                          <label htmlFor={`${formId}-${field.fieldNm}`}>
                            {field.fieldLabel}
                            {isRequired && <span aria-hidden="true" style={{ color: '#ff4d4f', marginLeft: 3 }}>*</span>}
                          </label>
                        )}
                      </th>,
                      <td key={`td-${field.fieldId}`} colSpan={showThLabel ? formCols * 2 - 1 : formCols * 2} style={{ ...tdStyle, background: fieldError ? '#fff2f0' : undefined }}>
                        <FieldRenderer
                          field={field} value={values[field.fieldNm]}
                          onChange={handleChange} error={fieldError}
                          codeOptions={field.codeGroup ? (codeMap[field.codeGroup] ?? []) : []}
                          formValues={values} onSetError={handleSetError}
                          disabled={isCondDisabled}
                        />
                        {fieldError && <div role="alert" style={{ color: '#ff4d4f', fontSize: 12, marginTop: 4 }}>{fieldError}</div>}
                      </td>,
                    )
                    col = formCols
                  } else if (isStatCard) {
                    cells.push(
                      <td key={`td-${field.fieldId}`} colSpan={tdColSpan + 1}
                          rowSpan={rSpan > 1 ? rSpan : undefined}
                          style={tdStyle}>
                        <FieldRenderer
                          field={field} value={values[field.fieldNm]}
                          onChange={handleChange} error={fieldError}
                          codeOptions={[]}
                          formValues={values} onSetError={handleSetError}
                          disabled={isCondDisabled}
                        />
                      </td>,
                    )
                    col += span
                  } else {
                    cells.push(
                      <th key={`th-${field.fieldId}`} scope="row"
                          rowSpan={rSpan > 1 ? rSpan : undefined}
                          style={{ ...thStyle, verticalAlign: rSpan > 1 ? 'top' : 'middle' }}>
                        <label htmlFor={`${formId}-${field.fieldNm}`}>
                          {field.fieldLabel}
                          {isRequired && <span aria-hidden="true" style={{ color: '#ff4d4f', marginLeft: 3 }}>*</span>}
                        </label>
                      </th>,
                      <td key={`td-${field.fieldId}`} colSpan={tdColSpan}
                          rowSpan={rSpan > 1 ? rSpan : undefined}
                          style={{ ...tdStyle, background: fieldError ? '#fff2f0' : undefined,
                                   verticalAlign: rSpan > 1 ? 'top' : 'middle' }}>
                        <FieldRenderer
                          field={field} value={values[field.fieldNm]}
                          onChange={handleChange} error={fieldError}
                          codeOptions={field.codeGroup ? (codeMap[field.codeGroup] ?? []) : []}
                          formValues={values} onSetError={handleSetError}
                          disabled={isCondDisabled}
                        />
                        {fieldError && <div role="alert" style={{ color: '#ff4d4f', fontSize: 12, marginTop: 4 }}>{fieldError}</div>}
                      </td>,
                    )
                    col += span
                  }
                } else {
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

        {!compact && (
          <div style={{ display: 'flex', justifyContent: ALIGN_MAP[btnCfg.align] ?? 'center', gap: 8, marginTop: 16 }}>
            {(schema.canCreate || schema.canUpdate) && (
              <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={submitting}>
                {btnCfg.submitLabel ?? (editId ? '수정' : '저장')}
              </Button>
            )}
            {btnCfg.showReset && (
              <Button icon={<ReloadOutlined />} onClick={handleReset}>{btnCfg.resetLabel ?? '초기화'}</Button>
            )}
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

// ─── AG Grid 기반 그리드 렌더러 ──────────────────────────────
const AgGridBody: React.FC<{
  schema: ScreenSchema
  screenId: string
  onSelect?: (row: Record<string, unknown>) => void
  popupMode?: boolean
  height?: number
}> = ({ schema, screenId, onSelect, popupMode, height = 400 }) => {
  const gridRef = useRef<GridApi | null>(null)
  const [searchValues, setSearchValues] = useState<Record<string, string>>({})
  const [page, setPage] = useState(1)
  const [pendingChanges, setPendingChanges] = useState<Map<number, Record<string, unknown>>>(new Map())
  const [newRows, setNewRows] = useState<Record<string, unknown>[]>([])
  const queryClient = useQueryClient()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['bizData', screenId, page, searchValues],
    queryFn: () => api.get(`/biz/${screenId}`, { params: { page, size: 500, ...searchValues } }).then(r => r.data.data),
    staleTime: 0,
  })

  const deleteMutation = useMutation({
    mutationFn: (dataId: number) => api.delete(`/biz/${screenId}/${dataId}`),
    onSuccess: () => { message.success('삭제되었습니다.'); queryClient.invalidateQueries({ queryKey: ['bizData', screenId] }) },
  })

  const visibleFields = schema.fields.filter(f => !f.hidden)

  const colDefs: ColDef[] = [
    ...(popupMode ? [] : [{
      headerName: '',
      field: '_action',
      width: 80,
      pinned: 'left' as const,
      editable: false,
      cellRenderer: (params: { data: Record<string, unknown> }) => {
        const div = document.createElement('div')
        div.style.display = 'flex'; div.style.gap = '4px'; div.style.alignItems = 'center'
        if (params.data._isNew) {
          div.innerHTML = '<span style="color:#52c41a;font-size:11px">신규</span>'
        } else if (schema.canDelete) {
          const btn = document.createElement('button')
          btn.textContent = '삭제'
          btn.style.cssText = 'font-size:11px;padding:1px 6px;border:1px solid #ff4d4f;color:#ff4d4f;background:transparent;border-radius:4px;cursor:pointer'
          btn.onclick = () => { if (params.data._dataId) deleteMutation.mutate(params.data._dataId as number) }
          div.appendChild(btn)
        }
        return div
      },
    }]),
    ...visibleFields.map(f => ({
      headerName: f.fieldLabel,
      field: f.fieldNm,
      editable: !f.readonly && (schema.canCreate || schema.canUpdate),
      flex: f.colSpan || 1,
      minWidth: 100,
      cellStyle: { fontSize: '13px' },
      ...(f.fieldType === 'select' && { cellEditor: 'agSelectCellEditor', cellEditorParams: { values: [] } }),
      ...(f.fieldType === 'number' && { cellEditor: 'agNumberCellEditor' }),
    })),
  ]

  const rowData = [
    ...(data?.rows ?? []),
    ...newRows,
  ]

  const handleCellValueChanged = (event: CellValueChangedEvent) => {
    const row = event.data as Record<string, unknown>
    if (row._isNew) {
      setNewRows(prev => prev.map(r =>
        r._tempId === row._tempId ? { ...r, [event.colDef.field!]: event.newValue } : r
      ))
    } else {
      const dataId = row._dataId as number
      setPendingChanges(prev => {
        const next = new Map(prev)
        const existing = next.get(dataId) ?? { ...row }
        next.set(dataId, { ...existing, [event.colDef.field!]: event.newValue })
        return next
      })
    }
  }

  const handleSaveAll = async () => {
    try {
      // 기존 행 수정 저장
      for (const [dataId, changes] of pendingChanges.entries()) {
        await api.put(`/biz/${screenId}/${dataId}`, changes)
      }
      // 신규 행 저장
      for (const row of newRows) {
        const { _isNew, _tempId, ...data } = row
        await api.post(`/biz/${screenId}`, data)
      }
      setPendingChanges(new Map())
      setNewRows([])
      message.success('저장되었습니다.')
      refetch()
    } catch {
      message.error('저장 중 오류가 발생했습니다.')
    }
  }

  const handleAddRow = () => {
    setNewRows(prev => [...prev, { _isNew: true, _tempId: Date.now() }])
  }

  const searchFields = visibleFields.filter(f => ['text', 'select'].includes(f.fieldType)).slice(0, 3)

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {searchFields.map(f => (
          <Input
            key={f.fieldId}
            placeholder={f.fieldLabel}
            style={{ width: 160 }}
            value={searchValues[f.fieldNm] ?? ''}
            onChange={e => setSearchValues(prev => ({ ...prev, [f.fieldNm]: e.target.value }))}
            allowClear
            onPressEnter={() => { setPage(1); refetch() }}
          />
        ))}
        <Button icon={<SearchOutlined />} onClick={() => { setPage(1); refetch() }}>검색</Button>
        <div style={{ flex: 1 }} />
        {(pendingChanges.size > 0 || newRows.length > 0) && (
          <Tag color="orange">{pendingChanges.size + newRows.length}건 변경됨</Tag>
        )}
        {!popupMode && (schema.canCreate || schema.canUpdate) && (
          <>
            {schema.canCreate && (
              <Button icon={<PlusOutlined />} onClick={handleAddRow}>행 추가</Button>
            )}
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveAll}
              disabled={pendingChanges.size === 0 && newRows.length === 0}>
              전체 저장
            </Button>
          </>
        )}
      </div>

      <div className="ag-theme-alpine" style={{ height, width: '100%' }}>
        <AgGridReact
          rowData={rowData}
          columnDefs={colDefs}
          onGridReady={(e: GridReadyEvent) => { gridRef.current = e.api; e.api.sizeColumnsToFit() }}
          onCellValueChanged={handleCellValueChanged}
          onRowClicked={popupMode ? (e) => onSelect?.(e.data as Record<string, unknown>) : undefined}
          onRowDoubleClicked={popupMode ? (e) => onSelect?.(e.data as Record<string, unknown>) : undefined}
          loading={isLoading}
          rowSelection={popupMode ? 'single' : 'multiple'}
          stopEditingWhenCellsLoseFocus
          undoRedoCellEditing
          undoRedoCellEditingLimit={20}
          getRowStyle={(params) => params.data?._isNew ? { background: '#f6ffed' } : params.data?._dataId && pendingChanges.has(params.data._dataId) ? { background: '#fff7e6' } : undefined}
          suppressRowClickSelection={!popupMode}
          domLayout="normal"
          pagination={!popupMode}
          paginationPageSize={20}
          paginationPageSizeSelector={[10, 20, 50, 100]}
        />
      </div>
    </div>
  )
}

// ─── Ant Table 기반 그리드 렌더러 (기본) ─────────────────────
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

  const layoutCfg = getLayoutConfig(schema.layoutConfig)
  const useAgGrid = !!layoutCfg.useAgGrid

  const codeFields = schema.fields.filter(f => f.codeGroup && ['select', 'radio', 'checkbox'].includes(f.fieldType))
  const uniqueGroups = [...new Set(codeFields.map(f => f.codeGroup!))]
  const handleCodeLoaded = useCallback((g: string, opts: { value: string; label: string }[]) => {
    setCodeMap(prev => ({ ...prev, [g]: opts }))
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['bizData', screenId, page, searchValues],
    queryFn: () => api.get(`/biz/${screenId}`, { params: { page, size: 20, ...searchValues } }).then(r => r.data.data),
    staleTime: 0,
  })

  const deleteMutation = useMutation({
    mutationFn: (dataId: number) => api.delete(`/biz/${screenId}/${dataId}`),
    onSuccess: () => {
      message.success('삭제되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['bizData', screenId] })
    },
  })

  const doSearch = () => setPage(1)

  const columns = [
    ...schema.fields.filter(f => !f.hidden).map(f => ({
      title: f.fieldLabel,
      dataIndex: f.fieldNm,
      key: f.fieldNm,
      ellipsis: true,
      render: (v: unknown) => {
        if (f.fieldType === 'password') return '••••••'
        if (f.codeGroup && codeMap[f.codeGroup]) {
          const opt = codeMap[f.codeGroup].find(o => o.value === String(v ?? ''))
          return opt?.label ?? String(v ?? '')
        }
        if (f.fieldType === 'editor') {
          return <span dangerouslySetInnerHTML={{ __html: String(v ?? '') }} style={{ fontSize: 12 }} />
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

  const searchFields = schema.fields.filter(f => !f.hidden && ['text', 'select'].includes(f.fieldType)).slice(0, 3)

  if (useAgGrid) {
    return (
      <div style={{ padding: 24 }}>
        {uniqueGroups.map(g => <CodeOptionsLoader key={g} groupCd={g} onLoaded={handleCodeLoaded} />)}
        <Title level={4} style={{ marginBottom: 16 }}>{schema.screenNm}</Title>
        <AgGridBody schema={schema} screenId={screenId} onSelect={onSelect} popupMode={popupMode} height={500} />
      </div>
    )
  }

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

// ─── 섹션별 렌더러 (composite 레이아웃) ─────────────────────
const CompositeRenderer: React.FC<{ schema: ScreenSchema; screenId: string }> = ({ schema, screenId }) => {
  const layoutCfg = getLayoutConfig(schema.layoutConfig)
  const sections = (layoutCfg.sections ?? []) as ScreenSection[]

  if (sections.length === 0) {
    return <FormRenderer schema={schema} screenId={screenId} />
  }

  // 어느 섹션에도 fieldIds로 명시 등록되지 않은 필드를 찾아 누락 없이 표시
  const claimedFieldIds = new Set(sections.flatMap(s => s.fieldIds ?? []))
  const hasExplicitFieldIds = claimedFieldIds.size > 0
  const unclaimedFields = hasExplicitFieldIds
    ? schema.fields.filter(f => !claimedFieldIds.has(f.fieldId))
    : []

  const renderSectionContent = (section: ScreenSection, sectionFields: typeof schema.fields) => (
    <div style={{
      border: '1px solid #e8e8e8',
      borderTop: section.title ? 'none' : '1px solid #e8e8e8',
      borderRadius: section.title ? '0 0 6px 6px' : 6,
      padding: '16px',
      background: '#fff',
    }}>
      {section.type === 'form' && (
        <FormBody schema={schema} screenId={screenId} fields={sectionFields} />
      )}
      {section.type === 'grid' && (
        <AgGridBody schema={schema} screenId={screenId} height={350} />
      )}
      {section.type === 'editor' && sectionFields[0] && (
        <div>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            {sectionFields[0].fieldLabel}
          </Text>
          <RichTextEditor
            placeholder={sectionFields[0].placeholder}
            minHeight={250}
          />
        </div>
      )}
      {section.type === 'canvas' && (
        (section as { canvasConfig?: CanvasConfig }).canvasConfig
          ? <CanvasPageRenderer
              config={(section as { canvasConfig: CanvasConfig }).canvasConfig}
              screenId={screenId}
            />
          : <div style={{ padding: 20, textAlign: 'center', color: '#bbb', border: '1px dashed #ddd', borderRadius: 6 }}>
              캔버스 섹션 (설계 필요)
            </div>
      )}
    </div>
  )

  const renderSectionHeader = (section: ScreenSection) =>
    section.title ? (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', background: '#f0f5ff', borderRadius: '6px 6px 0 0',
        borderBottom: '2px solid #4096ff',
      }}>
        {section.type === 'form' && <FormOutlined style={{ color: '#4096ff' }} />}
        {section.type === 'grid' && <TableOutlined style={{ color: '#4096ff' }} />}
        {section.type === 'editor' && <FileTextOutlined style={{ color: '#4096ff' }} />}
        {section.type === 'canvas' && <span style={{ color: '#4096ff' }}>🎨</span>}
        <Text strong style={{ color: '#1677ff' }}>{section.title}</Text>
      </div>
    ) : null

  return (
    <div style={{ padding: 24 }}>
      <Title level={4} style={{ marginBottom: 20 }}>{schema.screenNm}</Title>
      {sections.map((section, idx) => {
        // fieldIds가 없는 섹션은 아직 어느 섹션에도 배정되지 않은 필드를 보여줌
        const sectionFields = section.fieldIds
          ? schema.fields.filter(f => section.fieldIds!.includes(f.fieldId))
          : hasExplicitFieldIds
            ? schema.fields.filter(f => !claimedFieldIds.has(f.fieldId))
            : schema.fields

        return (
          <div key={section.id ?? idx} style={{ marginBottom: 20 }}>
            {renderSectionHeader(section)}
            {renderSectionContent(section, sectionFields)}
          </div>
        )
      })}

      {/* fieldIds로 지정된 섹션이 있고 배정되지 않은 필드가 있으면 자동으로 표시 */}
      {unclaimedFields.length > 0 && !sections.some(s => !s.fieldIds) && (
        <div style={{ marginBottom: 20 }}>
          <FormBody schema={schema} screenId={screenId} fields={unclaimedFields} />
        </div>
      )}
    </div>
  )
}

// ─── Form 렌더러 (전체 페이지) ───────────────────────────────
const FormRenderer: React.FC<{
  schema: ScreenSchema
  screenId: string
  initialValues?: Record<string, unknown>
  onSuccess?: (data: unknown) => void
}> = ({ schema, screenId, initialValues, onSuccess }) => {
  const cfg = getLayoutConfig(schema.layoutConfig)
  const eventBindings = (cfg.eventBindings as EventBinding[] | undefined) ?? []
  return (
    <div style={{ padding: 24 }}>
      <Title level={4} style={{ marginBottom: 20 }}>{schema.screenNm}</Title>
      <FormBody
        schema={schema} screenId={screenId}
        initialValues={initialValues} onSuccess={onSuccess}
        eventBindings={eventBindings}
      />
    </div>
  )
}

// ─── Master-Detail 렌더러 ─────────────────────────────────────
const MasterDetailRenderer: React.FC<{ schema: ScreenSchema; screenId: string }> = ({ schema, screenId }) => {
  const [selectedRow, setSelectedRow] = useState<Record<string, unknown> | null>(null)
  const layoutCfg = getLayoutConfig(schema.layoutConfig)
  const useAgGrid = !!layoutCfg.useAgGrid

  return (
    <div>
      {useAgGrid ? (
        <div style={{ padding: 24 }}>
          <Title level={4} style={{ marginBottom: 16 }}>{schema.screenNm}</Title>
          <AgGridBody schema={schema} screenId={screenId} onSelect={setSelectedRow} height={300} />
        </div>
      ) : (
        <GridRenderer schema={schema} screenId={screenId} onSelect={setSelectedRow} />
      )}
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
interface ExtendedProps extends Props {
  ignoreOpenType?: boolean  // 디자인 페이지 미리보기에서는 탭/팝업 동작 무시
}

export const ScreenRenderer: React.FC<ExtendedProps> = ({
  screenId, initialValues, onSuccess, popupMode, onSelect, ignoreOpenType
}) => {
  const { data: schema, isLoading, error } = useQuery<ScreenSchema>({
    queryKey: ['schema', screenId],
    queryFn: () => schemaApi.getSchema(screenId),
    staleTime: 5 * 60 * 1000,
  })

  const addTab = useTabStore(s => s.addTab)

  // openType='tab'이면 탭 스토어에 등록
  useEffect(() => {
    if (!ignoreOpenType && schema?.openType === 'tab') {
      addTab({ screenId: schema.screenId, title: schema.screenNm, path: `/app/${schema.screenId}` })
    }
  }, [schema, ignoreOpenType, addTab])

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '60px auto' }} />
  if (error || !schema) return <Alert type="error" message="화면 스키마를 불러오지 못했습니다." />

  const renderContent = () => {
    switch (schema.screenType) {
      case 'grid':
        return <GridRenderer schema={schema} screenId={screenId} onSelect={onSelect} popupMode={popupMode} />
      case 'master-detail':
        return <MasterDetailRenderer schema={schema} screenId={screenId} />
      case 'composite':
        return <CompositeRenderer schema={schema} screenId={screenId} />
      case 'popup':
        return <GridRenderer schema={schema} screenId={screenId} onSelect={onSelect} popupMode />
      case 'dashboard':
        return (
          <div style={{ padding: '8px 0' }}>
            <Title level={4} style={{ margin: '0 16px 8px' }}>{schema.screenNm}</Title>
            <DashboardRenderer layoutConfig={getLayoutConfig(schema.layoutConfig)} />
          </div>
        )
      case 'report':
        return (
          <ReportRenderer
            layoutConfig={getLayoutConfig(schema.layoutConfig)}
            screenNm={schema.screenNm}
          />
        )
      case 'canvas': {
        const canvasCfg = getLayoutConfig(schema.layoutConfig) as unknown as CanvasConfig
        if (!canvasCfg?.elements?.length) {
          return <div style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>캔버스가 비어 있습니다.</div>
        }
        return (
          <CanvasPageRenderer
            config={canvasCfg}
            screenId={screenId}
            onSuccess={onSuccess}
          />
        )
      }
      case 'form':
      default:
        return <FormRenderer schema={schema} screenId={screenId} initialValues={initialValues} onSuccess={onSuccess} />
    }
  }

  // openType='popup'이고 직접 접근했을 때 팝업 스타일로 렌더링
  if (!ignoreOpenType && schema.openType === 'popup' && !popupMode) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{
          border: '1px solid #e8e8e8', borderRadius: 8,
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)', background: '#fff', overflow: 'hidden'
        }}>
          <div style={{
            padding: '12px 20px', background: '#f0f5ff', borderBottom: '1px solid #d6e4ff',
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            <Tag color="blue">팝업</Tag>
            <Text strong>{schema.screenNm}</Text>
          </div>
          {renderContent()}
        </div>
      </div>
    )
  }

  return renderContent()
}
