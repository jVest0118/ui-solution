import React, { useState, useEffect, useCallback, useRef, useMemo, Component } from 'react'
import {
  Row, Col, Button, Space, Alert, message,
  Input, Divider, Popconfirm, Typography, Card, Table, Tag, Tabs, Collapse
} from 'antd'
import { BugOutlined, ReloadOutlined as ReloadIcon } from '@ant-design/icons'
import {
  SearchOutlined, PlusOutlined, SaveOutlined, ReloadOutlined,
  EditOutlined, DeleteOutlined, TableOutlined, FormOutlined,
  FileTextOutlined, FileExcelOutlined, ColumnWidthOutlined,
  CompressOutlined, MenuOutlined, AppstoreOutlined,
} from '@ant-design/icons'
import * as XLSX from 'xlsx'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, GridReadyEvent, CellValueChangedEvent, GridApi } from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import { schemaApi } from '@/api/schema'
import { QSpinner } from '@/components/QSpinner'
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
import { ZoomModal, useZoomTrigger } from '@/components/ui/ZoomModal'

const { Title, Text } = Typography

// ─── Error Boundary ──────────────────────────────────────────
interface EBState { hasError: boolean; error: Error | null; info: string }
class ScreenErrorBoundary extends Component<{ screenId: string; children: React.ReactNode }, EBState> {
  state: EBState = { hasError: false, error: null, info: '' }

  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, error, info: '' }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ info: info.componentStack ?? '' })
    console.error(`[ScreenRenderer] 화면 렌더링 오류 (${this.props.screenId}):`, error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const { error, info } = this.state
    const msg = error?.message ?? '알 수 없는 오류'

    return (
      <div style={{ padding: 32 }}>
        <Alert
          type="error"
          icon={<BugOutlined />}
          showIcon
          message={`화면 렌더링 오류 — ${this.props.screenId}`}
          description={
            <div>
              <div style={{ fontWeight: 600, marginBottom: 8, color: '#ff4d4f' }}>{msg}</div>
              <Collapse
                size="small"
                style={{ marginTop: 8 }}
                items={[
                  {
                    key: '1',
                    label: '상세 오류 정보 (개발자용)',
                    children: (
                      <pre style={{
                        fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                        background: '#1e1e1e', color: '#d4d4d4',
                        padding: 12, borderRadius: 4, maxHeight: 300, overflowY: 'auto',
                        margin: 0,
                      }}>
                        {error?.stack ?? '스택 없음'}
                        {info ? `\n\n컴포넌트 트리:\n${info}` : ''}
                      </pre>
                    ),
                  },
                ]}
              />
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <Button
                  icon={<ReloadIcon />}
                  size="small"
                  onClick={() => this.setState({ hasError: false, error: null, info: '' })}
                >
                  다시 시도
                </Button>
                <Button size="small" onClick={() => window.location.reload()}>
                  페이지 새로고침
                </Button>
              </div>
            </div>
          }
        />
      </div>
    )
  }
}

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

// ─── JSON 경로 추출 유틸 ─────────────────────────────────────
// jsonPath 예: "[0].email"  "[0].phone"  "name"
function extractByJsonPath(raw: unknown, jsonPath: string): string {
  if (raw == null || raw === '') return ''
  try {
    // 문자열이면 파싱, 이미 객체/배열이면 그대로
    const parsed: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw
    // 경로 토큰 분리: "[0]", ".email" → ["0", "email"]
    const tokens = jsonPath
      .replace(/\[(\d+)\]/g, '.$1')   // [0] → .0
      .split('.')
      .filter(Boolean)
    let cur: unknown = parsed
    for (const token of tokens) {
      if (cur == null || typeof cur !== 'object') return ''
      cur = (cur as Record<string, unknown>)[token]
    }
    return cur != null ? String(cur) : ''
  } catch {
    return String(raw)
  }
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

                  // stat-card / display → th 없이 td만
                  const isStatCard = field.fieldType === 'stat-card'

                  // extraConfig.showLabel === false 이면 레이블 th 숨김
                  const showLabel = field.extraConfig?.showLabel !== false

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
                      ...(showLabel ? [
                        <th key={`th-${field.fieldId}`} scope="row"
                            rowSpan={rSpan > 1 ? rSpan : undefined}
                            style={{ ...thStyle, verticalAlign: rSpan > 1 ? 'top' : 'middle' }}>
                          <label htmlFor={`${formId}-${field.fieldNm}`}>
                            {field.fieldLabel}
                            {isRequired && <span aria-hidden="true" style={{ color: '#ff4d4f', marginLeft: 3 }}>*</span>}
                          </label>
                        </th>,
                      ] : []),
                      <td key={`td-${field.fieldId}`}
                          colSpan={showLabel ? tdColSpan : tdColSpan + 1}
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
  fixedParams?: Record<string, unknown>  // 항상 포함되는 고정 쿼리 파라미터 (마스터→디테일 필터용)
}> = ({ schema, screenId, onSelect, popupMode, height = 400, fixedParams }) => {
  const gridRef = useRef<GridApi | null>(null)
  const [searchValues, setSearchValues] = useState<Record<string, string>>({})
  const [page, setPage] = useState(1)
  const [pendingChanges, setPendingChanges] = useState<Map<number, Record<string, unknown>>>(new Map())
  const [newRows, setNewRows] = useState<Record<string, unknown>[]>([])
  const queryClient = useQueryClient()

  // 그리드 스타일 설정
  const layoutCfgForStyle = getLayoutConfig(schema.layoutConfig)
  const gridStyles = layoutCfgForStyle.gridStyles as {
    header?: { backgroundColor?: string; color?: string; fontSize?: number; fontWeight?: string; height?: number }
    row?: { fontSize?: number; height?: number }
    statusBar?: { height?: number; fontSize?: number; justifyContent?: string }
  } | undefined

  const agCssVars: React.CSSProperties = {
    ...(gridStyles?.header?.backgroundColor && { '--ag-header-background-color': gridStyles.header.backgroundColor } as React.CSSProperties),
    ...(gridStyles?.header?.color          && { '--ag-header-foreground-color': gridStyles.header.color } as React.CSSProperties),
    ...(gridStyles?.header?.fontSize       && { '--ag-header-font-size': `${gridStyles.header.fontSize}px` } as React.CSSProperties),
    ...(gridStyles?.row?.fontSize          && { '--ag-font-size': `${gridStyles.row.fontSize}px` } as React.CSSProperties),
  }

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['bizData', screenId, page, searchValues, fixedParams],
    queryFn: () => api.get(`/biz/${screenId}`, { params: { page, size: 500, ...fixedParams, ...searchValues } }).then(r => r.data.data),
    staleTime: 0,
    retry: 1,
  })

  // 복합 PK 처리: pkColumn = "col1" 또는 "col1,col2"
  const isBizData = !schema.datasourceType || schema.datasourceType === 'biz_data'
  const pkCols = useMemo(() =>
    schema.pkColumn?.split(',').map(c => c.trim()).filter(Boolean) ?? [],
  [schema.pkColumn])

  const deleteMutation = useMutation({
    mutationFn: (row: Record<string, unknown>) => {
      if (isBizData) {
        return api.delete(`/biz/${screenId}/${row._dataId}`)
      }
      // 복합 PK — 각 PK 컬럼 값을 쿼리 파라미터로 전달
      const params = pkCols.reduce<Record<string, unknown>>((acc, col) => {
        acc[col] = row[col]; return acc
      }, {})
      return api.delete(`/biz/${screenId}/by-pk`, { params })
    },
    onSuccess: () => { message.success('삭제되었습니다.'); queryClient.invalidateQueries({ queryKey: ['bizData', screenId] }) },
    onError: (err) => {
      const axErr = err as { response?: { data?: { message?: string }; status?: number }; message?: string }
      const msg = axErr?.response?.data?.message ?? axErr?.message ?? '삭제 중 오류가 발생했습니다.'
      message.error(axErr?.response?.status ? `[${axErr.response.status}] ${msg}` : msg)
    },
  })

  const visibleFields = schema.fields.filter(f => !f.hidden)

  // 필드 정의 없을 때 데이터 첫 행에서 컬럼 자동 감지
  const autoColDefs: ColDef[] = useMemo(() => {
    if (visibleFields.length > 0) return []
    const rows = data?.rows as Record<string, unknown>[] | undefined
    if (!rows?.length) return []
    return Object.keys(rows[0])
      .filter(k => k !== '_dataId')
      .map(k => ({
        headerName: k,
        field: k,
        flex: 1,
        minWidth: 80,
        cellStyle: { fontSize: '13px' },
        valueFormatter: (p: { value: unknown }) => p.value != null ? String(p.value) : '',
      }))
  }, [visibleFields.length, data?.rows])

  // 외부 테이블의 복합 PK 컬럼 — 이미 visible field에 없으면 숨김 컬럼으로 추가
  const visibleFieldNms = useMemo(() => new Set(visibleFields.map(f => f.fieldNm)), [visibleFields])
  const hiddenPkColDefs: ColDef[] = useMemo(() =>
    isBizData ? [] : pkCols
      .filter(col => !visibleFieldNms.has(col))
      .map(col => ({ field: col, hide: true, editable: false })),
  [isBizData, pkCols, visibleFieldNms])

  // 액션 버튼 스타일 (아이콘 버튼 공통)
  const iconBtnStyle = (color?: string): React.CSSProperties => ({
    border: `1px solid ${color ?? '#d9d9d9'}`,
    background: '#fff',
    borderRadius: 4,
    cursor: 'pointer',
    padding: '2px 6px',
    color: color ?? '#595959',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    lineHeight: 1,
  })

  const actionCol: ColDef = {
    headerName: '',
    field: '_action',
    width: popupMode ? 70 : ((schema.canUpdate ? 1 : 0) + (schema.canDelete ? 1 : 0)) * 36 + 8,
    pinned: 'right' as const,   // ← 오른쪽 고정
    editable: false,
    cellRenderer: (params: { data: Record<string, unknown> }) => {
      const row = params.data
      if (row._isNew) {
        return <span style={{ color: '#52c41a', fontSize: 11, padding: '0 4px' }}>신규</span>
      }
      if (popupMode) {
        return (
          <button style={{ ...iconBtnStyle('#1677ff'), padding: '2px 8px', fontSize: 11 }}
            onClick={() => onSelect?.(row as Record<string, unknown>)}>
            선택
          </button>
        )
      }
      return (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', height: '100%' }}>
          {schema.canUpdate && (
            <button title="수정" style={iconBtnStyle()}>
              {/* pencil SVG — Ant Design EditOutlined 동일 shape */}
              <svg viewBox="64 64 896 896" width="1em" height="1em" fill="currentColor">
                <path d="M257.7 752c2 0 4-.2 6-.5L431.9 722c2-.4 3.9-1.3 5.3-2.8l423.9-423.9a9.96 9.96 0 000-14.1L694.9 114.9c-1.9-1.9-4.4-2.9-7.1-2.9s-5.2 1-7.1 2.9L256.8 538.8c-1.5 1.5-2.4 3.3-2.8 5.3l-29.5 168.2a33.5 33.5 0 009.4 29.8c6.6 6.4 14.9 9.9 23.8 9.9zm67.4-174.4L687.8 215l73.3 73.3-362.7 362.6-88.9 15.7 15.6-89zM880 836H144c-17.7 0-32 14.3-32 32v36c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-36c0-17.7-14.3-32-32-32z"/>
              </svg>
            </button>
          )}
          {schema.canDelete && (
            <button title="삭제" style={iconBtnStyle('#ff4d4f')}
              onClick={() => {
                if (!window.confirm('삭제하시겠습니까?')) return
                deleteMutation.mutate(row as Record<string, unknown>)
              }}>
              {/* trash SVG — Ant Design DeleteOutlined 동일 shape */}
              <svg viewBox="64 64 896 896" width="1em" height="1em" fill="currentColor">
                <path d="M360 184h-8c4.4 0 8-3.6 8-8v8h304v-8c0 4.4 3.6 8 8 8h-8v72h72v-80c0-35.3-28.7-64-64-64H352c-35.3 0-64 28.7-64 64v80h72v-72zm504 72H160c-17.7 0-32 14.3-32 32v32c0 4.4 3.6 8 8 8h60.4l24.7 523c1.6 34.1 29.8 61 63.9 61h454c34.2 0 62.3-26.8 63.9-61l24.7-523H888c4.4 0 8-3.6 8-8v-32c0-17.7-14.3-32-32-32zM731.3 840H292.7l-24.2-512h487l-24.2 512z"/>
              </svg>
            </button>
          )}
        </div>
      )
    },
  }

  const colDefs: ColDef[] = [
    ...hiddenPkColDefs,   // 숨김 PK 컬럼 (복합 PK 지원)
    ...(visibleFields.length > 0
      ? visibleFields.map(f => {
          const jsonPath = f.extraConfig?.jsonPath as string | undefined
          return {
            headerName: f.fieldLabel,
            field: f.fieldNm,
            editable: !f.readonly && !jsonPath && (schema.canCreate || schema.canUpdate),
            flex: f.colSpan || 1,
            minWidth: 100,
            cellStyle: {
              fontSize: '13px',
              textAlign: f.fieldType === 'number'
                ? 'right'
                : ((f.extraConfig?.align as string | undefined) ?? 'left'),
            },
            headerClass: f.fieldType === 'number' ? 'ag-right-aligned-header' : undefined,
            ...(jsonPath && {
              valueFormatter: (p: { value: unknown }) => extractByJsonPath(p.value, jsonPath),
            }),
            ...(f.fieldType === 'select' && !jsonPath && { cellEditor: 'agSelectCellEditor', cellEditorParams: { values: [] } }),
            ...(f.fieldType === 'number' && !jsonPath && {
              cellEditor: 'agNumberCellEditor',
              valueFormatter: (p: { value: unknown }) => {
                if (p.value === null || p.value === undefined || p.value === '') return ''
                const n = Number(p.value)
                return isNaN(n) ? String(p.value) : n.toLocaleString()
              },
            }),
          }
        })
      : autoColDefs),
    ...(popupMode ? [] : [actionCol]),   // ← 액션 컬럼을 맨 오른쪽에
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
    } catch (e) {
      const axErr = e as { response?: { data?: { message?: string; error?: string }; status?: number }; message?: string }
      const status = axErr?.response?.status
      const msg = axErr?.response?.data?.message ?? axErr?.response?.data?.error ?? axErr?.message ?? '저장 중 오류가 발생했습니다.'
      message.error(status ? `[HTTP ${status}] ${msg}` : msg)
    }
  }

  const handleAddRow = () => {
    setNewRows(prev => [...prev, { _isNew: true, _tempId: Date.now() }])
  }

  const searchFields = visibleFields.filter(f => ['text', 'select'].includes(f.fieldType)).slice(0, 3)

  if (isError) {
    const errMsg = (error as { response?: { data?: { message?: string } }; message?: string })
      ?.response?.data?.message ?? (error as Error)?.message ?? '알 수 없는 오류'
    return (
      <Alert
        type="error"
        showIcon
        message="데이터 조회 실패"
        description={
          <div>
            <div style={{ marginBottom: 8 }}>{errMsg}</div>
            <Button size="small" icon={<ReloadOutlined />} onClick={() => refetch()}>다시 시도</Button>
          </div>
        }
        style={{ margin: 16 }}
      />
    )
  }

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

      <div
        className="ag-theme-alpine"
        style={{
          height,
          width: '100%',
          ...agCssVars,
        }}
      >
        <style>{`
          .ag-theme-alpine .ag-header-cell-label {
            ${gridStyles?.header?.fontWeight ? `font-weight: ${gridStyles.header.fontWeight};` : ''}
          }
          .ag-theme-alpine .ag-paging-panel {
            ${gridStyles?.statusBar?.height ? `height: ${gridStyles.statusBar.height}px !important; min-height: ${gridStyles.statusBar.height}px !important;` : ''}
            ${gridStyles?.statusBar?.fontSize ? `font-size: ${gridStyles.statusBar.fontSize}px !important;` : ''}
            ${gridStyles?.statusBar?.justifyContent ? `justify-content: ${gridStyles.statusBar.justifyContent} !important;` : ''}
          }
        `}</style>
        <AgGridReact
          rowData={rowData}
          columnDefs={colDefs}
          onGridReady={(e: GridReadyEvent) => { gridRef.current = e.api; e.api.sizeColumnsToFit() }}
          onCellValueChanged={handleCellValueChanged}
          onRowClicked={onSelect ? (e) => onSelect(e.data as Record<string, unknown>) : undefined}
          onRowDoubleClicked={onSelect ? (e) => onSelect(e.data as Record<string, unknown>) : undefined}
          loading={isLoading}
          rowSelection={(onSelect || popupMode) ? 'single' : 'multiple'}
          stopEditingWhenCellsLoseFocus
          undoRedoCellEditing
          undoRedoCellEditingLimit={20}
          getRowStyle={(params) => params.data?._isNew ? { background: '#f6ffed' } : params.data?._dataId && pendingChanges.has(params.data._dataId) ? { background: '#fff7e6' } : undefined}
          suppressRowClickSelection={!(onSelect || popupMode)}
          domLayout="normal"
          pagination={!popupMode}
          paginationPageSize={20}
          paginationPageSizeSelector={[10, 20, 50, 100]}
          headerHeight={gridStyles?.header?.height ?? undefined}
          rowHeight={gridStyles?.row?.height ?? undefined}
        />
      </div>
    </div>
  )
}

// ─── 컬럼 폭 드래그 리사이즈 헤더 셀 ─────────────────────────
const ResizableTitle: React.FC<React.ThHTMLAttributes<HTMLTableCellElement> & {
  onResize?: (w: number) => void
}> = ({ onResize, children, style, ...rest }) => {
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!onResize) return
    const startX = e.clientX
    const th = (e.currentTarget as HTMLElement).parentElement as HTMLElement
    const startW = th.offsetWidth
    const onMove = (ev: MouseEvent) => onResize(Math.max(60, startW + ev.clientX - startX))
    const onUp   = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    e.preventDefault(); e.stopPropagation()
  }
  return (
    <th {...rest} style={{ ...style, position: 'relative', userSelect: 'none' }}>
      {children}
      {onResize && (
        <span
          style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 6,
            cursor: 'col-resize', zIndex: 1, background: 'transparent' }}
          onMouseDown={handleMouseDown}
        />
      )}
    </th>
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
  const [pageSize, setPageSize] = useState(20)
  const [editRow, setEditRow] = useState<Record<string, unknown> | null>(null)
  const [codeMap, setCodeMap] = useState<CodeMap>({})
  const [colWidths, setColWidths] = useState<Record<string, number>>({})
  const [tableSize, setTableSize] = useState<'large' | 'middle' | 'small'>('middle')
  const [selectedRowKey, setSelectedRowKey] = useState<unknown>(null)
  const { open: modalOpen, triggerEl: modalTriggerEl, handleTrigger: openModal, handleClose: closeModal } = useZoomTrigger()
  const queryClient = useQueryClient()

  const layoutCfg = getLayoutConfig(schema.layoutConfig)
  const useAgGrid = !!layoutCfg.useAgGrid
  const gridSettings = (layoutCfg.gridSettings as {
    showSearch?: boolean
    searchFields?: string[]
    showExcelDownload?: boolean
  } | undefined) ?? {}
  const showSearch = gridSettings.showSearch !== false
  const showExcelDownload = !!gridSettings.showExcelDownload

  const codeFields = schema.fields.filter(f => f.codeGroup && ['select', 'radio', 'checkbox'].includes(f.fieldType))
  const uniqueGroups = [...new Set(codeFields.map(f => f.codeGroup!))]
  const handleCodeLoaded = useCallback((g: string, opts: { value: string; label: string }[]) => {
    setCodeMap(prev => ({ ...prev, [g]: opts }))
  }, [])

  const { data, isLoading, isError, error: dataError } = useQuery({
    queryKey: ['bizData', screenId, page, pageSize, searchValues],
    queryFn: () => api.get(`/biz/${screenId}`, { params: { page, size: pageSize, ...searchValues } }).then(r => r.data.data),
    staleTime: 0,
  })

  // 복합 PK 처리 (GridRenderer용)
  const isBizDataTable = !schema.datasourceType || schema.datasourceType === 'biz_data'
  const gridPkCols = useMemo(() =>
    schema.pkColumn?.split(',').map(c => c.trim()).filter(Boolean) ?? [],
  [schema.pkColumn])

  const deleteMutation = useMutation({
    mutationFn: (row: Record<string, unknown>) => {
      if (isBizDataTable) {
        return api.delete(`/biz/${screenId}/${row._dataId}`)
      }
      // 복합 PK — 각 PK 컬럼 값을 쿼리 파라미터로 전달
      const params = gridPkCols.reduce<Record<string, unknown>>((acc, col) => {
        acc[col] = row[col]; return acc
      }, {})
      return api.delete(`/biz/${screenId}/by-pk`, { params })
    },
    onSuccess: () => {
      message.success('삭제되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['bizData', screenId] })
    },
    onError: (err) => {
      const axErr = err as { response?: { data?: { message?: string }; status?: number }; message?: string }
      const msg = axErr?.response?.data?.message ?? axErr?.message ?? '삭제 중 오류가 발생했습니다.'
      const status = axErr?.response?.status
      message.error(status ? `[${status}] ${msg}` : msg)
    },
  })

  const doSearch = () => setPage(1)

  const setColWidth = (key: string, w: number) => setColWidths(prev => ({ ...prev, [key]: w }))

  const columns = [
    ...schema.fields.filter(f => !f.hidden).map(f => ({
      title: f.fieldLabel,
      dataIndex: f.fieldNm,
      key: f.fieldNm,
      ellipsis: true,
      width: colWidths[f.fieldNm],
      align: (f.fieldType === 'number'
        ? 'right'
        : ((f.extraConfig?.align as string | undefined) ?? 'left')) as 'left' | 'center' | 'right',
      onHeaderCell: (col: { width?: number }) => ({
        width: col.width,
        onResize: (w: number) => setColWidth(f.fieldNm, w),
      }),
      render: (v: unknown) => {
        if (f.fieldType === 'password') return '••••••'
        if (f.codeGroup && codeMap[f.codeGroup]) {
          const opt = codeMap[f.codeGroup].find(o => o.value === String(v ?? ''))
          return opt?.label ?? String(v ?? '')
        }
        if (f.fieldType === 'editor') {
          return <span dangerouslySetInnerHTML={{ __html: String(v ?? '') }} style={{ fontSize: 12 }} />
        }
        const jsonPath = f.extraConfig?.jsonPath as string | undefined
        if (jsonPath) return extractByJsonPath(v, jsonPath)
        if (f.fieldType === 'number' && v !== null && v !== undefined && v !== '') {
          const n = Number(v)
          return isNaN(n) ? String(v) : n.toLocaleString()
        }
        return String(v ?? '')
      },
    })),
    {
      title: '작업', key: '_action',
      width: colWidths['_action'] ?? (popupMode ? 80 : 120),
      onHeaderCell: (col: { width?: number }) => ({
        width: col.width,
        onResize: (w: number) => setColWidth('_action', w),
      }),
      render: (_: unknown, row: Record<string, unknown>) => (
        <Space size={4}>
          {popupMode ? (
            <Button size="small" type="primary" onClick={() => onSelect?.(row)}>선택</Button>
          ) : (
            <>
              {schema.canUpdate && (
                <Button size="small" icon={<EditOutlined />}
                  onClick={(e) => { setEditRow(row); openModal(e) }} />
              )}
              {schema.canDelete && (
                <Popconfirm title="삭제하시겠습니까?" onConfirm={() => deleteMutation.mutate(row)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              )}
            </>
          )}
        </Space>
      ),
    },
  ]

  // 설계에서 명시적으로 지정한 필드, 없으면 text/select 앞 3개 자동
  const searchFields = showSearch
    ? (gridSettings.searchFields?.length
      ? schema.fields.filter(f => !f.hidden && gridSettings.searchFields!.includes(f.fieldNm))
      : schema.fields.filter(f => !f.hidden && ['text', 'select'].includes(f.fieldType)).slice(0, 3))
    : []

  const handleExcelDownload = () => {
    const rows = data?.rows ?? []
    const visFields = schema.fields.filter(f => !f.hidden)
    const ws = XLSX.utils.aoa_to_sheet([
      visFields.map(f => f.fieldLabel),
      ...rows.map((r: Record<string, unknown>) => visFields.map(f => String(r[f.fieldNm] ?? ''))),
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '데이터')
    XLSX.writeFile(wb, `${schema.screenNm}_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  // 데이터 조회 오류 패널 (개발자용)
  const dataErrorBanner = isError ? (() => {
    const axErr = dataError as { response?: { data?: { message?: string; error?: string }; status?: number }; message?: string } | null
    const httpStatus = axErr?.response?.status
    const serverMsg = axErr?.response?.data?.message ?? axErr?.response?.data?.error
    const errMsg = serverMsg ?? axErr?.message ?? '알 수 없는 오류'
    return (
      <Alert
        type="error"
        showIcon
        style={{ marginBottom: 12 }}
        message="데이터 조회 실패"
        description={
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <div>
              {httpStatus && <Tag color="red" style={{ marginRight: 6 }}>HTTP {httpStatus}</Tag>}
              {errMsg}
            </div>
            <Button size="small" icon={<ReloadOutlined />} onClick={() => queryClient.invalidateQueries({ queryKey: ['bizData', screenId] })}>
              다시 시도
            </Button>
          </Space>
        }
      />
    )
  })() : null

  if (useAgGrid) {
    return (
      <div style={{ padding: 24 }}>
        {uniqueGroups.map(g => <CodeOptionsLoader key={g} groupCd={g} onLoaded={handleCodeLoaded} />)}
        <Title level={4} style={{ marginBottom: 16 }}>{schema.screenNm}</Title>
        {dataErrorBanner}
        <AgGridBody schema={schema} screenId={screenId} onSelect={onSelect} popupMode={popupMode} height={500} />
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      {uniqueGroups.map(g => <CodeOptionsLoader key={g} groupCd={g} onLoaded={handleCodeLoaded} />)}
      <Title level={4} style={{ marginBottom: 16 }}>{schema.screenNm}</Title>
      {dataErrorBanner}

      {(searchFields.length > 0 || schema.canCreate || showExcelDownload) && !popupMode && (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={[12, 8]} align="middle">
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
            {searchFields.length > 0 && (
              <Col><Button icon={<SearchOutlined />} onClick={doSearch}>검색</Button></Col>
            )}
            <Col flex="auto" />
            {showExcelDownload && (
              <Col>
                <Button icon={<FileExcelOutlined />} onClick={handleExcelDownload} style={{ color: '#1d6f42', borderColor: '#1d6f42' }}>
                  엑셀 다운로드
                </Button>
              </Col>
            )}
            {schema.canCreate && (
              <Col>
                <Button type="primary" icon={<PlusOutlined />}
                  onClick={(e) => { setEditRow(null); openModal(e) }}>등록</Button>
              </Col>
            )}
            {/* 그리드 사이즈 컨트롤 */}
            {!popupMode && (
              <Col>
                <Space size={2}>
                  <Button
                    size="small" title="넓게"
                    type={tableSize === 'large' ? 'primary' : 'default'}
                    icon={<AppstoreOutlined />}
                    onClick={() => setTableSize('large')}
                  />
                  <Button
                    size="small" title="보통"
                    type={tableSize === 'middle' ? 'primary' : 'default'}
                    icon={<MenuOutlined />}
                    onClick={() => setTableSize('middle')}
                  />
                  <Button
                    size="small" title="좁게"
                    type={tableSize === 'small' ? 'primary' : 'default'}
                    icon={<CompressOutlined />}
                    onClick={() => setTableSize('small')}
                  />
                  <Button
                    size="small" title="컬럼 폭 초기화"
                    icon={<ColumnWidthOutlined />}
                    onClick={() => setColWidths({})}
                  />
                </Space>
              </Col>
            )}
          </Row>
        </Card>
      )}

      <Table
        dataSource={data?.rows ?? []}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        columns={columns as any}
        components={{ header: { cell: ResizableTitle } }}
        rowKey="_dataId"
        loading={isLoading}
        size={tableSize}
        scroll={{ x: 'max-content' }}
        pagination={{
          current: page,
          total: data?.total ?? 0,
          pageSize,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          onChange: (p, ps) => { setPage(p); if (ps !== pageSize) { setPageSize(ps); setPage(1) } },
          showTotal: t => `총 ${t}건`,
        }}
        onRow={onSelect ? (row) => ({
          onClick: () => {
            const r = row as unknown as Record<string, unknown>
            onSelect(r)
            setSelectedRowKey(r._dataId)
          },
          style: { cursor: 'pointer', background: selectedRowKey === (row as unknown as Record<string, unknown>)._dataId ? '#e6f4ff' : undefined },
        }) : undefined}
      />

      <ZoomModal
        title={editRow?._dataId ? '수정' : '신규 등록'}
        open={modalOpen}
        onClose={() => { closeModal(); setEditRow(null) }}
        triggerEl={modalTriggerEl}
        width={680}
      >
        <FormBody
          schema={schema}
          screenId={screenId}
          initialValues={editRow ?? {}}
          compact
          onSuccess={() => {
            closeModal()
            setEditRow(null)
            queryClient.invalidateQueries({ queryKey: ['bizData', screenId] })
          }}
        />
      </ZoomModal>
    </div>
  )
}

// ─── 외부 화면 연결 섹션 렌더러 (screenId가 설정된 섹션 전용) ──
const LinkedSectionContent: React.FC<{
  section: ScreenSection
  masterRow: Record<string, unknown> | null
  isMaster: boolean
  onMasterSelect?: (row: Record<string, unknown>) => void
}> = ({ section, masterRow, isMaster, onMasterSelect }) => {
  const { data: linkedSchema, isLoading } = useQuery<ScreenSchema>({
    queryKey: ['schema', section.screenId],
    queryFn: () => schemaApi.getSchema(section.screenId!),
    enabled: !!section.screenId,
    staleTime: 30_000,
  })

  // 마스터 행의 linkField 값으로 detail 레코드 조회 (form/detail 섹션만)
  const linkValue = masterRow && section.linkField ? masterRow[section.linkField] : undefined
  const { data: linkedRecord } = useQuery<Record<string, unknown> | null>({
    queryKey: ['bizData', section.screenId, 'linked', String(linkValue ?? '')],
    queryFn: () =>
      api.get(`/biz/${section.screenId}`, {
        params: { [section.linkField!]: linkValue, size: 1 },
      }).then(r => (r.data.data?.rows?.[0] ?? null)),
    enabled: !!section.screenId && linkValue !== undefined && section.type === 'form' && section.role === 'detail',
    staleTime: 0,
  })

  if (isLoading || !linkedSchema) {
    return <div style={{ padding: 20, display: 'flex', justifyContent: 'center' }}><QSpinner size={32} /></div>
  }

  if (section.type === 'grid') {
    const isDetailGrid = section.role === 'detail' && !!section.linkField
    if (isDetailGrid && !masterRow) {
      return (
        <div style={{ padding: '40px 24px', textAlign: 'center', color: '#aaa' }}>
          <TableOutlined style={{ fontSize: 28, marginBottom: 10, display: 'block', color: '#d9d9d9' }} />
          <Text type="secondary">위 목록에서 항목을 선택하면 스펙 정보가 표시됩니다</Text>
        </div>
      )
    }
    const fixedParams = isDetailGrid && masterRow
      ? { [section.linkField!]: masterRow[section.linkField!] }
      : undefined
    return (
      <AgGridBody
        schema={linkedSchema}
        screenId={section.screenId!}
        height={section.height ?? 300}
        onSelect={isMaster ? onMasterSelect : undefined}
        fixedParams={fixedParams}
      />
    )
  }

  if (section.type === 'form') {
    const isDetail = section.role === 'detail'
    if (isDetail && !masterRow) {
      return (
        <div style={{ padding: '40px 24px', textAlign: 'center', color: '#aaa' }}>
          <TableOutlined style={{ fontSize: 28, marginBottom: 10, display: 'block', color: '#d9d9d9' }} />
          <Text type="secondary">위 목록에서 항목을 선택하면 상세 정보가 표시됩니다</Text>
        </div>
      )
    }
    const formKey = `linked:${section.screenId}:${String(linkValue ?? 'empty')}`
    // 기존 레코드가 있으면 그 값으로, 없으면 linkField 값만 채운 빈 폼
    const initValues: Record<string, unknown> = linkedRecord
      ? linkedRecord
      : masterRow && section.linkField
        ? { [section.linkField]: linkValue }
        : {}
    return (
      <div style={{ padding: '16px' }}>
        <FormBody
          key={formKey}
          schema={linkedSchema}
          screenId={section.screenId!}
          initialValues={initValues}
        />
      </div>
    )
  }

  return null
}

// ─── 섹션별 렌더러 (composite 레이아웃) ─────────────────────
const CompositeRenderer: React.FC<{ schema: ScreenSchema; screenId: string }> = ({ schema, screenId }) => {
  const layoutCfg = getLayoutConfig(schema.layoutConfig)
  const sections = (layoutCfg.sections ?? []) as ScreenSection[]

  // 마스터 섹션별 선택된 행 (sectionId → selectedRow)
  const [masterData, setMasterData] = useState<Record<string, Record<string, unknown> | null>>({})

  if (sections.length === 0) {
    return <FormRenderer schema={schema} screenId={screenId} />
  }

  const claimedFieldIds = new Set(sections.flatMap(s => s.fieldIds ?? []))
  const hasExplicitFieldIds = claimedFieldIds.size > 0
  const unclaimedFields = hasExplicitFieldIds
    ? schema.fields.filter(f => !claimedFieldIds.has(f.fieldId))
    : []

  const handleMasterSelect = useCallback((sectionId: string) => (row: Record<string, unknown>) => {
    setMasterData(prev => ({ ...prev, [sectionId]: row }))
  }, [])

  const renderSectionContent = (section: ScreenSection, sectionFields: typeof schema.fields) => {
    const isMaster = section.role === 'master'
    const isDetail = section.role === 'detail'

    // ── 별도 화면(외부 테이블) 연결 섹션 ──────────────────────
    if (section.screenId) {
      const masterRow = isDetail && section.masterSectionId
        ? (masterData[section.masterSectionId] ?? null)
        : null
      return (
        <div style={{
          border: '1px solid #e8e8e8',
          borderTop: section.title ? 'none' : '1px solid #e8e8e8',
          borderRadius: section.title ? '0 0 6px 6px' : 6,
          background: '#fff',
          overflow: 'hidden',
        }}>
          <LinkedSectionContent
            section={section}
            masterRow={masterRow}
            isMaster={isMaster}
            onMasterSelect={isMaster ? handleMasterSelect(section.id) : undefined}
          />
        </div>
      )
    }

    // ── 동일 화면 내 섹션 (기존 로직) ──────────────────────────
    const detailValues: Record<string, unknown> | null =
      isDetail && section.masterSectionId
        ? (masterData[section.masterSectionId] ?? null)
        : null

    const rowKey = detailValues
      ? String(detailValues._dataId ?? JSON.stringify(Object.values(detailValues).slice(0, 3)))
      : 'empty'
    const formKey = `${section.id}:${section.masterSectionId ?? ''}:${rowKey}`

    const gridSchema = sectionFields.length > 0 && sectionFields.length < schema.fields.length
      ? { ...schema, fields: sectionFields }
      : schema

    return (
      <div style={{
        border: '1px solid #e8e8e8',
        borderTop: section.title ? 'none' : '1px solid #e8e8e8',
        borderRadius: section.title ? '0 0 6px 6px' : 6,
        background: '#fff',
        overflow: 'hidden',
      }}>
        {section.type === 'form' && (
          isDetail && !detailValues ? (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: '#aaa' }}>
              <TableOutlined style={{ fontSize: 28, marginBottom: 10, display: 'block', color: '#d9d9d9' }} />
              <Text type="secondary">위 목록에서 항목을 선택하면 상세 정보가 표시됩니다</Text>
            </div>
          ) : (
            <div style={{ padding: '16px' }}>
              <FormBody
                key={formKey}
                schema={schema}
                screenId={screenId}
                fields={sectionFields}
                initialValues={detailValues ?? {}}
              />
            </div>
          )
        )}
        {section.type === 'grid' && (
          <AgGridBody
            schema={gridSchema}
            screenId={screenId}
            height={section.height ?? 300}
            onSelect={isMaster ? handleMasterSelect(section.id) : undefined}
          />
        )}
        {section.type === 'editor' && sectionFields[0] && (
          <div style={{ padding: '16px' }}>
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
  }

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
        {section.role === 'master' && (
          <Tag color="blue" style={{ marginLeft: 'auto', fontSize: 11, marginRight: 0 }}>마스터</Tag>
        )}
        {section.role === 'detail' && (
          <Tag color="green" style={{ marginLeft: 'auto', fontSize: 11, marginRight: 0 }}>디테일</Tag>
        )}
      </div>
    ) : null

  return (
    <div style={{ padding: 24 }}>
      <Title level={4} style={{ marginBottom: 20 }}>{schema.screenNm}</Title>
      {sections.map((section, idx) => {
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
    staleTime: 0,
  })

  const addTab = useTabStore(s => s.addTab)

  // openType='tab'이면 탭 스토어에 등록
  useEffect(() => {
    if (!ignoreOpenType && schema?.openType === 'tab') {
      addTab({ screenId: schema.screenId, title: schema.screenNm, path: `/app/${schema.screenId}` })
    }
  }, [schema, ignoreOpenType, addTab])

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', margin: '80px 0' }}><QSpinner size={72} /></div>
  if (error || !schema) {
    const axiosErr = error as { response?: { data?: { message?: string; error?: string }; status?: number }; message?: string } | null
    const httpStatus = axiosErr?.response?.status
    const serverMsg = axiosErr?.response?.data?.message ?? axiosErr?.response?.data?.error
    const errMsg = serverMsg ?? axiosErr?.message ?? '알 수 없는 오류'
    return (
      <div style={{ padding: 32 }}>
        <Alert
          type="error"
          showIcon
          message={`화면 스키마 로드 실패 — ${screenId}`}
          description={
            <div>
              {httpStatus && <Tag color="red" style={{ marginBottom: 6 }}>HTTP {httpStatus}</Tag>}
              <div style={{ marginBottom: 8 }}>{errMsg}</div>
              {(error as Error)?.stack && (
                <Collapse size="small" items={[{
                  key: '1',
                  label: '스택 트레이스 (개발자용)',
                  children: (
                    <pre style={{ fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                      background: '#1e1e1e', color: '#d4d4d4', padding: 10, borderRadius: 4,
                      maxHeight: 200, overflowY: 'auto', margin: 0 }}>
                      {(error as Error).stack}
                    </pre>
                  ),
                }]} />
              )}
            </div>
          }
        />
      </div>
    )
  }

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
          <ScreenErrorBoundary screenId={screenId}>
            {renderContent()}
          </ScreenErrorBoundary>
        </div>
      </div>
    )
  }

  return (
    <ScreenErrorBoundary screenId={screenId}>
      {renderContent()}
    </ScreenErrorBoundary>
  )
}
