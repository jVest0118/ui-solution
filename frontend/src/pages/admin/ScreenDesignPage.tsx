import React, { useState, useRef, useEffect } from 'react'
import {
  Button, Modal, Form, Input, Select, InputNumber, Switch, Radio,
  message, Typography, Card, Row, Col, Divider, Space, Tooltip,
  Badge, AutoComplete, Collapse, Tabs, Popconfirm, Tag, Checkbox, Alert, Drawer,
  Dropdown, Grid,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
  ArrowLeftOutlined, InfoCircleOutlined, ThunderboltOutlined,
  AppstoreAddOutlined, CopyOutlined, TableOutlined, BranchesOutlined, CloseOutlined,
  DatabaseOutlined, MoreOutlined, DownOutlined, ExpandAltOutlined,
  AlignLeftOutlined, AlignCenterOutlined, AlignRightOutlined,
} from '@ant-design/icons'
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, DragOverlay, useDraggable, useDroppable,
} from '@dnd-kit/core'
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import api from '@/api/axios'
import { useAuthStore } from '@/store/authStore'
import { ScreenRenderer } from '@/components/renderer/ScreenRenderer'
import { ResizableModal } from '@/components/ui/ResizableModal'
import DataSourceManager, { DataBindingEditor } from '@/components/admin/DataSourceManager'
import { GridFieldConfig } from '@/components/fields/GridFieldConfig'
import type { GridConfig } from '@/components/fields/GridFieldConfig'
import { DashboardDesigner } from './DashboardDesigner'
import { ReportDesigner } from './ReportDesigner'
import type { DashboardWidget } from '@/components/renderer/DashboardRenderer'
import { EventActionEditor } from '@/components/admin/EventActionEditor'
import type { EventBinding } from '@/types/events'

const { Title, Text } = Typography

// ─── 유틸 ────────────────────────────────────────────────────
const toSnakeCase = (raw: string): string => {
  if (!raw) return ''
  return raw
    .replace(/([A-Z])/g, '_$1')
    .replace(/[-\s.]+/g, '_')
    .replace(/[^a-z0-9_]/gi, '')
    .toLowerCase()
    .replace(/_+/g, '_')
    .replace(/^_+/, '')
}
const SNAKE_CASE_RE = /^[a-z][a-z0-9_]*$/

const safeParseJson = (s: unknown): Record<string, unknown> => {
  if (!s) return {}
  if (typeof s === 'object') return s as Record<string, unknown>
  try { return JSON.parse(s as string) } catch { return {} }
}

// ─── 상수 ────────────────────────────────────────────────────
const FIELD_TYPES = [
  // ─── 입력 필드 ───────────────────────────────
  { value: 'text',       label: 'Text' },
  { value: 'password',   label: 'Password' },
  { value: 'number',     label: 'Number' },
  { value: 'textarea',   label: 'Textarea (장문)' },
  // ─── 날짜/기간 ──────────────────────────────
  { value: 'date',       label: 'Date (날짜)' },
  { value: 'datetime',   label: 'DateTime (날짜+시간)' },
  { value: 'year',       label: 'Year (연도)' },
  { value: 'month',      label: 'Month (연월)' },
  { value: 'date-range', label: 'Date Range (기간)' },
  // ─── 선택 ───────────────────────────────────
  { value: 'select',     label: 'Select (공통코드)' },
  { value: 'radio',      label: 'Radio' },
  { value: 'checkbox',   label: 'Checkbox' },
  // ─── 복합 입력 ──────────────────────────────
  { value: 'address',    label: 'Address (주소 검색)' },
  { value: 'phone',      label: 'Phone (핸드폰 번호)' },
  // ─── 복합 컴포넌트 ──────────────────────────
  { value: 'editor',     label: 'Editor (리치 텍스트)' },
  { value: 'grid',       label: 'Grid (인라인 그리드)' },
  { value: 'file',       label: 'File Upload' },
  { value: 'popup',      label: 'Popup Search' },
  // ─── 표시 전용 ──────────────────────────────
  { value: 'display',        label: '데이터 표시 (레이블:값)' },
  { value: 'info-banner',    label: 'Info Banner (안내 배너)' },
  { value: 'stat-card',      label: 'Stat Card (통계 카드)' },
  // ─── 캔버스 섹션 ─────────────────────────────
  { value: 'canvas-section', label: '🎨 캔버스 섹션 (열 병합용)' },
]

const OPEN_TYPES = [
  { value: 'page',  label: '일반 페이지' },
  { value: 'tab',   label: '탭으로 열기' },
  { value: 'popup', label: '팝업으로 열기' },
]

const SCREEN_TYPES = [
  { value: 'form',          label: '입력 폼' },
  { value: 'grid',          label: '그리드 목록' },
  { value: 'master-detail', label: '마스터-디테일' },
  { value: 'composite',     label: '복합 레이아웃 (섹션)' },
  { value: 'popup',         label: '팝업' },
  { value: 'dashboard',     label: '대시보드 (차트/통계)' },
  { value: 'report',        label: '리포트 (출력/Excel)' },
  { value: 'canvas',        label: '🎨 자유 배치 캔버스' },
]

const FORM_COLS_OPTIONS = [
  { value: 1, label: '1열' },
  { value: 2, label: '2열' },
  { value: 3, label: '3열' },
  { value: 4, label: '4열' },
  { value: 6, label: '6열' },
]

const TYPE_COLORS: Record<string, string> = {
  text: '#1677ff', password: '#722ed1', number: '#52c41a',
  date: '#fa8c16', datetime: '#fa541c', year: '#d46b08', month: '#d46b08', 'date-range': '#ad6800',
  select: '#13c2c2', radio: '#2f54eb', checkbox: '#389e0d',
  textarea: '#eb2f96', editor: '#531dab', file: '#f5222d',
  grid: '#0958d9', popup: '#faad14',
  'info-banner': '#08979c', 'stat-card': '#0958d9',
  address: '#7cb305', phone: '#c41d7f',
}

// ─── 타입 ────────────────────────────────────────────────────
interface Field {
  fieldId?: number
  fieldNm: string
  fieldLabel: string
  fieldType: string
  placeholder?: string
  defaultValue?: string
  colSpan: number
  rowSpan: number
  sortOrder: number
  rowPos: number
  colPos: number
  readonlyYn: string
  hiddenYn: string
  useYn: string
  codeGroup?: string
  columnNm?: string
  extraConfig?: Record<string, unknown>
}

interface ScreenDetail {
  screenId: string
  screenNm: string
  screenType: string
  description?: string
  apiResource?: string
  projectId?: string
  layoutConfig?: string
  buttonConfig?: string
  openType?: string
  datasourceType?: string
  tableNm?: string
  pkColumn?: string
  dbConnId?: string
  fields: Field[]
}

// ─── 자동완성 훅 ─────────────────────────────────────────────
function useFieldSuggestions(type: 'name' | 'label') {
  const [options, setOptions] = useState<{ value: string }[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const fetch = (q: string) => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      try {
        const ep = type === 'name'
          ? '/schema/admin/fields/suggestions/name'
          : '/schema/admin/fields/suggestions/label'
        const res = await api.get(ep, { params: q ? { q } : {} })
        setOptions((res.data.data ?? []).map((v: string) => ({ value: v })))
      } catch { /* ignore */ }
    }, 250)
  }
  return { options, fetch }
}

// ─── SnakeCaseInput ───────────────────────────────────────────
const SnakeCaseInput: React.FC<{
  value?: string
  onChange?: (val: string) => void
  options: { value: string }[]
  onFetch: (q: string) => void
}> = ({ value = '', onChange, options, onFetch }) => (
  <AutoComplete
    value={value}
    onChange={(val) => {
      const snaked = toSnakeCase(String(val ?? ''))
      onChange?.(snaked)
      onFetch(snaked)
    }}
    options={options}
    filterOption={false}
    placeholder="예: user_name"
    onFocus={() => onFetch(value || '')}
    style={{ width: '100%' }}
  />
)

// ─── 섹션 설정 타입 ──────────────────────────────────────────
interface SectionConfig {
  id: string
  type: 'form' | 'grid' | 'editor' | 'canvas'
  role?: 'master' | 'detail' | 'independent'
  masterSectionId?: string
  screenId?: string    // 별도 화면(다른 테이블) 연결 시 해당 screenId
  linkField?: string   // master→detail 조인 필드명 (screenId 사용 시)
  title?: string
  height?: number
  fieldIds?: number[]
}

// ─── 섹션 시각 편집기 ─────────────────────────────────────────
const SectionEditorUI: React.FC<{
  sections: SectionConfig[]
  onChange: (s: SectionConfig[]) => void
  fields: Field[]
}> = ({ sections, onChange, fields }) => {
  // 별도 화면 연결용 화면 목록
  const { data: screenList = [] } = useQuery<{ screenId: string; screenNm: string }[]>({
    queryKey: ['adminScreensForSection'],
    queryFn: () => api.get('/schema/admin/screens').then(r => r.data.data ?? []),
    staleTime: 30_000,
  })

  const masterSections = sections.filter(s => s.role === 'master')

  const addSection = () => {
    const newId = `s${Date.now()}`
    onChange([...sections, { id: newId, type: 'form', role: 'independent', title: `섹션 ${sections.length + 1}` }])
  }

  const update = (idx: number, patch: Partial<SectionConfig>) => {
    onChange(sections.map((s, i) => i === idx ? { ...s, ...patch } : s))
  }

  const remove = (idx: number) => {
    onChange(sections.filter((_, i) => i !== idx))
  }

  const moveUp = (idx: number) => {
    if (idx === 0) return
    const next = [...sections]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    onChange(next)
  }

  const moveDown = (idx: number) => {
    if (idx === sections.length - 1) return
    const next = [...sections]
    ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    onChange(next)
  }

  const ROLE_COLOR: Record<string, string> = { master: 'blue', detail: 'green', independent: 'default' }
  const ROLE_LABEL: Record<string, string> = { master: '마스터', detail: '디테일', independent: '독립' }
  const TYPE_COLOR: Record<string, string> = { grid: '#1677ff', form: '#52c41a', editor: '#722ed1', canvas: '#fa8c16' }

  return (
    <div>
      {sections.length === 0 && (
        <div style={{ padding: '20px', textAlign: 'center', color: '#aaa', border: '1px dashed #d9d9d9', borderRadius: 6, marginBottom: 8 }}>
          섹션이 없습니다. 아래 버튼으로 추가하세요.
        </div>
      )}
      {sections.map((sec, idx) => (
        <Card
          key={sec.id}
          size="small"
          style={{ marginBottom: 8, borderLeft: `3px solid ${TYPE_COLOR[sec.type] ?? '#d9d9d9'}` }}
          styles={{ body: { padding: '10px 12px' } }}
          title={
            <Space size={4}>
              <Tag color={TYPE_COLOR[sec.type]} style={{ fontSize: 11, margin: 0 }}>{sec.type}</Tag>
              {sec.role && sec.role !== 'independent' && (
                <Tag color={ROLE_COLOR[sec.role]} style={{ fontSize: 11, margin: 0 }}>{ROLE_LABEL[sec.role]}</Tag>
              )}
              {sec.screenId && <Tag color="orange" style={{ fontSize: 11, margin: 0 }}>외부화면</Tag>}
              <span style={{ fontWeight: 500, fontSize: 13 }}>{sec.title || `섹션 ${idx + 1}`}</span>
            </Space>
          }
          extra={
            <Space size={2}>
              <Button size="small" icon={<span style={{ fontSize: 10 }}>▲</span>} onClick={() => moveUp(idx)} disabled={idx === 0} />
              <Button size="small" icon={<span style={{ fontSize: 10 }}>▼</span>} onClick={() => moveDown(idx)} disabled={idx === sections.length - 1} />
              <Button size="small" danger icon={<DeleteOutlined />} onClick={() => remove(idx)} />
            </Space>
          }
        >
          <Row gutter={[8, 6]}>
            {/* ── 기본 설정 행 ── */}
            <Col span={6}>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>타입</div>
              <Select
                size="small" style={{ width: '100%' }}
                value={sec.type}
                onChange={v => update(idx, { type: v as SectionConfig['type'] })}
                options={[
                  { value: 'grid',   label: '그리드 (목록)' },
                  { value: 'form',   label: '폼 (입력/상세)' },
                  { value: 'editor', label: '에디터 (리치텍스트)' },
                ]}
              />
            </Col>
            <Col span={6}>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>역할</div>
              <Select
                size="small" style={{ width: '100%' }}
                value={sec.role ?? 'independent'}
                onChange={v => update(idx, { role: v as SectionConfig['role'], masterSectionId: undefined })}
                options={[
                  { value: 'independent', label: '독립 (연동 없음)' },
                  { value: 'master',      label: '마스터 (행 선택)' },
                  { value: 'detail',      label: '디테일 (마스터 연동)' },
                ]}
              />
            </Col>
            <Col span={sec.type === 'grid' ? 6 : 12}>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>제목</div>
              <Input
                size="small"
                value={sec.title ?? ''}
                onChange={e => update(idx, { title: e.target.value })}
                placeholder="섹션 제목 (빈칸 가능)"
              />
            </Col>
            {sec.type === 'grid' && (
              <Col span={6}>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>높이 (px)</div>
                <InputNumber
                  size="small" style={{ width: '100%' }}
                  min={100} max={1000} step={50}
                  value={sec.height ?? 300}
                  onChange={v => update(idx, { height: v ?? 300 })}
                />
              </Col>
            )}

            {/* ── 마스터 연결 (detail 역할일 때) ── */}
            {sec.role === 'detail' && (
              <Col span={sec.screenId ? 12 : 24}>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>연결할 마스터 섹션</div>
                <Select
                  size="small" style={{ width: '100%' }}
                  value={sec.masterSectionId}
                  onChange={v => update(idx, { masterSectionId: v })}
                  placeholder="마스터 섹션 선택"
                  options={masterSections
                    .filter(m => m.id !== sec.id)
                    .map(m => ({ value: m.id, label: `${m.title || m.id} (마스터)` }))}
                  notFoundContent="마스터 섹션 없음 (다른 섹션 역할을 '마스터'로 설정)"
                />
              </Col>
            )}

            {/* ── 별도 화면 연결 ── */}
            <Col span={24}>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 4, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Switch
                  size="small"
                  checked={!!sec.screenId}
                  onChange={v => update(idx, { screenId: v ? '' : undefined, linkField: undefined, fieldIds: undefined })}
                />
                <span>별도 화면 연결 <span style={{ fontWeight: 400, color: '#aaa' }}>(다른 테이블 사용 시)</span></span>
              </div>
              {sec.screenId !== undefined && (
                <Row gutter={[8, 0]}>
                  <Col span={sec.role === 'detail' ? 14 : 24}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>연결 화면 (screenId)</div>
                    <Select
                      size="small" style={{ width: '100%' }}
                      showSearch
                      value={sec.screenId || undefined}
                      onChange={v => update(idx, { screenId: v })}
                      placeholder="화면 선택..."
                      optionFilterProp="label"
                      options={screenList.map(s => ({
                        value: s.screenId,
                        label: `${s.screenNm} (${s.screenId})`,
                      }))}
                      notFoundContent="화면 없음"
                    />
                  </Col>
                  {sec.role === 'detail' && (
                    <Col span={10}>
                      <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>조인 필드 (linkField)</div>
                      <Input
                        size="small"
                        value={sec.linkField ?? ''}
                        onChange={e => update(idx, { linkField: e.target.value })}
                        placeholder="예: product_id"
                      />
                    </Col>
                  )}
                </Row>
              )}
            </Col>

            {/* ── 포함 필드 (별도 화면 미사용 시만) ── */}
            {!sec.screenId && (
              <Col span={24}>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>포함 필드 <span style={{ fontWeight: 400 }}>(비워두면 미배정 필드 전체 표시)</span></div>
                <Select
                  size="small" mode="multiple" style={{ width: '100%' }}
                  value={sec.fieldIds ?? []}
                  onChange={v => update(idx, { fieldIds: v as number[] })}
                  placeholder="필드 선택..."
                  optionFilterProp="label"
                  options={fields
                    .filter(f => f.fieldId != null)
                    .map(f => ({ value: f.fieldId!, label: `${f.fieldLabel} (${f.fieldNm})` }))}
                />
              </Col>
            )}
          </Row>
        </Card>
      ))}
      <Button type="dashed" block icon={<PlusOutlined />} onClick={addSection} style={{ marginTop: 4 }}>
        섹션 추가
      </Button>
    </div>
  )
}

// ─── 셀 위치 맵: 어떤 필드가 어느 셀을 차지하는지 ─────────────
type CellOccupant = Field | 'spanned'

function buildCellMap(fields: Field[], formCols: number): Map<string, CellOccupant> {
  const map = new Map<string, CellOccupant>()
  for (const f of fields) {
    const r = f.rowPos ?? 0
    const c = f.colPos ?? 0
    const cSpan = Math.min(f.colSpan || 1, formCols - c)
    const rSpan = f.rowSpan || 1
    map.set(`${r}-${c}`, f)
    // 같은 행에서 colSpan으로 덮이는 셀
    for (let ci = c + 1; ci < c + cSpan; ci++) map.set(`${r}-${ci}`, 'spanned')
    // rowSpan으로 덮이는 아래 행 셀들
    for (let ri = r + 1; ri < r + rSpan; ri++) {
      for (let ci = c; ci < c + cSpan; ci++) map.set(`${ri}-${ci}`, 'spanned')
    }
  }
  return map
}

// 다음 배치 위치 계산 (기존 필드들의 maxRow + 1, 0열)
function nextAvailablePos(fields: Field[]): { rowPos: number; colPos: number } {
  const maxRow = fields.reduce((m, f) => Math.max(m, f.rowPos ?? 0), -1)
  return { rowPos: maxRow + 1, colPos: 0 }
}

// ─── 드래그 중 오버레이 ──────────────────────────────────────
const FieldDragOverlay: React.FC<{ field: Field }> = ({ field }) => (
  <Card
    size="small"
    style={{
      border: `2px solid ${TYPE_COLORS[field.fieldType] ?? '#1677ff'}`,
      background: '#fff', opacity: 0.92, cursor: 'grabbing',
      minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
    }}
    styles={{ body: { padding: '8px 12px' } }}
  >
    <div style={{ fontWeight: 600, fontSize: 13 }}>{field.fieldLabel}</div>
    <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{field.fieldNm}</div>
    <Tag color={TYPE_COLORS[field.fieldType]} style={{ fontSize: 10, marginTop: 4 }}>
      {field.fieldType}
    </Tag>
  </Card>
)

// ─── 드래그 가능한 필드 카드 ──────────────────────────────────
const DraggableFieldCard: React.FC<{
  field: Field
  onEdit: () => void
  onDelete: () => void
}> = ({ field, onEdit, onDelete }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: field.fieldId ?? field.fieldNm,
    data: { field },
  })

  return (
    <div ref={setNodeRef} style={{ opacity: isDragging ? 0.25 : (field.useYn === 'N' ? 0.45 : 1), height: '100%' }} {...attributes}>
      <Card
        size="small"
        style={{
          border: `1.5px solid ${field.useYn === 'N' ? '#d9d9d9' : (TYPE_COLORS[field.fieldType] ?? '#e8e8e8') + '40'}`,
          background: field.useYn === 'N' ? '#fafafa' : '#fff', cursor: 'grab', userSelect: 'none', height: '100%',
        }}
        styles={{ body: { padding: '8px 10px' } }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
          <span
            {...listeners}
            style={{ cursor: 'grab', color: '#c0c0c0', fontSize: 16, flexShrink: 0, touchAction: 'none', paddingTop: 1 }}
            title="드래그하여 위치 변경"
          >⠿</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {field.fieldLabel}
              {field.useYn === 'N' && <Tag color="default" style={{ fontSize: 10, padding: '0 4px', lineHeight: '16px', marginLeft: 4 }}>미사용</Tag>}
              {field.extraConfig?.events != null && (
                <ThunderboltOutlined style={{ color: '#fa8c16', marginLeft: 4, fontSize: 11 }} />
              )}
            </div>
            <div style={{ fontSize: 11, color: '#999', marginTop: 1 }}>
              <Tag color={TYPE_COLORS[field.fieldType] ?? '#1677ff'} style={{ fontSize: 10, padding: '0 4px', lineHeight: '16px', marginRight: 3 }}>
                {field.fieldType}
              </Tag>
              {field.fieldNm}
              {(field.colSpan || 1) > 1 && (
                <span style={{ color: '#1677ff', marginLeft: 4, fontSize: 10 }}>←{field.colSpan}열→</span>
              )}
              {(field.rowSpan || 1) > 1 && (
                <span style={{ color: '#52c41a', marginLeft: 4, fontSize: 10 }}>↕{field.rowSpan}행</span>
              )}
            </div>
            <div style={{ fontSize: 10, color: '#bfbfbf', marginTop: 2 }}>
              {field.rowPos}행 {field.colPos}열
            </div>
          </div>
          <Space size={2} style={{ flexShrink: 0 }}>
            {field.fieldType === 'canvas-section' && field.fieldId && (
              <Tooltip title="캔버스 편집">
                <Button
                  size="small" type="primary" ghost
                  style={{ fontSize: 11 }}
                  onClick={e => {
                    e.stopPropagation()
                    const screenId = window.location.pathname.split('/')[3]
                    window.location.href = `/admin/screens/${screenId}/canvas?fieldId=${field.fieldId}`
                  }}
                >🎨</Button>
              </Tooltip>
            )}
            <Tooltip title="편집">
              <Button size="small" type="text" icon={<EditOutlined />} onClick={e => { e.stopPropagation(); onEdit() }} />
            </Tooltip>
            <Popconfirm title="이 필드를 삭제하시겠습니까?" onConfirm={onDelete} okText="삭제" cancelText="취소">
              <Tooltip title="삭제">
                <Button size="small" type="text" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          </Space>
        </div>
      </Card>
    </div>
  )
}

// ─── 드랍 가능한 셀 ──────────────────────────────────────────
const DroppableCell: React.FC<{
  row: number; col: number; colSpan?: number; rowSpan?: number; children: React.ReactNode
}> = ({ row, col, colSpan = 1, rowSpan = 1, children }) => {
  const { setNodeRef, isOver } = useDroppable({ id: `cell-${row}-${col}` })
  return (
    <div
      ref={setNodeRef}
      style={{
        gridColumn: colSpan > 1 ? `span ${colSpan}` : undefined,
        gridRow:    rowSpan > 1 ? `span ${rowSpan}` : undefined,
        borderRadius: 8,
        border: isOver ? '2px dashed #1677ff' : '2px solid transparent',
        background: isOver ? '#e6f4ff' : 'transparent',
        transition: 'border-color 0.15s, background 0.15s',
        minHeight: rowSpan > 1 ? 64 * rowSpan + 8 * (rowSpan - 1) : 64,
      }}
    >
      {children}
    </div>
  )
}

// ─── 빈 셀 ───────────────────────────────────────────────────
const EmptyCell: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <div
    onClick={onClick}
    title="클릭하여 필드 추가"
    style={{
      height: '100%', minHeight: 60,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: '1.5px dashed #d9d9d9', borderRadius: 8, background: '#fafafa',
      cursor: 'pointer', color: '#bfbfbf', fontSize: 22, transition: 'all 0.15s',
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1677ff'; (e.currentTarget as HTMLElement).style.color = '#1677ff' }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#d9d9d9'; (e.currentTarget as HTMLElement).style.color = '#bfbfbf' }}
  >+</div>
)

// ─── 조건부 로직 에디터 ──────────────────────────────────────
const OP_OPTIONS = [
  { value: 'eq',       label: '= 같음' },
  { value: 'ne',       label: '≠ 다름' },
  { value: 'gt',       label: '> 초과' },
  { value: 'lt',       label: '< 미만' },
  { value: 'gte',      label: '≥ 이상' },
  { value: 'lte',      label: '≤ 이하' },
  { value: 'in',       label: '포함 (쉼표 구분)' },
  { value: 'notIn',    label: '미포함 (쉼표 구분)' },
  { value: 'contains', label: '문자열 포함' },
  { value: 'empty',    label: '비어있음' },
  { value: 'notEmpty', label: '비어있지 않음' },
]

interface ConditionRuleUi { field: string; op: string; value: string }
interface ConditionsValue {
  showWhen?: ConditionRuleUi[]
  hideWhen?: ConditionRuleUi[]
  requiredWhen?: ConditionRuleUi[]
  disabledWhen?: ConditionRuleUi[]
}

const ConditionsEditor: React.FC<{
  value?: ConditionsValue
  onChange?: (v: ConditionsValue) => void
  availableFields: { fieldNm: string; fieldLabel: string }[]
}> = ({ value = {}, onChange, availableFields }) => {
  const update = (key: keyof ConditionsValue, rules: ConditionRuleUi[]) =>
    onChange?.({ ...value, [key]: rules.length ? rules : undefined })

  const renderGroup = (
    key: keyof ConditionsValue,
    label: string,
    logic: string,
    desc: string,
    color: string,
  ) => {
    const rules = (value[key] ?? []) as ConditionRuleUi[]
    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ fontWeight: 600, color, fontSize: 13 }}>{label}</div>
          <div style={{ fontSize: 11, color: '#999', background: '#f5f5f5', borderRadius: 4, padding: '1px 6px' }}>{logic}</div>
        </div>
        <div style={{ fontSize: 11, color: '#bbb', marginBottom: 6 }}>{desc}</div>
        {rules.map((rule, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
            <Select
              size="small" style={{ flex: 1, minWidth: 100 }}
              placeholder="필드 선택"
              value={rule.field || undefined}
              onChange={v => { const n = [...rules]; n[idx] = { ...n[idx], field: v }; update(key, n) }}
              options={availableFields.map(f => ({ value: f.fieldNm, label: `${f.fieldLabel} (${f.fieldNm})` }))}
              showSearch
              filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
            />
            <Select
              size="small" style={{ width: 130 }}
              value={rule.op || undefined}
              onChange={v => { const n = [...rules]; n[idx] = { ...n[idx], op: v }; update(key, n) }}
              options={OP_OPTIONS}
            />
            {!['empty', 'notEmpty'].includes(rule.op) && (
              <Input
                size="small" style={{ flex: 1, minWidth: 80 }}
                placeholder={['in', 'notIn'].includes(rule.op) ? 'A, B, C' : '값'}
                value={rule.value ?? ''}
                onChange={e => { const n = [...rules]; n[idx] = { ...n[idx], value: e.target.value }; update(key, n) }}
              />
            )}
            <Button size="small" type="text" danger icon={<CloseOutlined />}
              onClick={() => update(key, rules.filter((_, i) => i !== idx))} />
          </div>
        ))}
        <Button size="small" icon={<PlusOutlined />} style={{ fontSize: 11 }}
          onClick={() => update(key, [...rules, { field: '', op: 'eq', value: '' }])}>
          조건 추가
        </Button>
      </div>
    )
  }

  return (
    <div>
      <Alert
        message="다른 필드 값에 따라 이 필드를 동적으로 제어합니다"
        description="예: 결제유형이 '계좌이체'일 때만 계좌번호 필드 표시"
        type="info" showIcon style={{ marginBottom: 14, fontSize: 12 }} />
      {renderGroup('showWhen',     '표시 조건 (showWhen)',     'AND — 모두 만족 시 표시', '설정 시 조건 불만족이면 필드 숨김 (기본: 항상 표시)', '#1677ff')}
      <Divider style={{ margin: '8px 0' }} />
      {renderGroup('hideWhen',     '숨김 조건 (hideWhen)',     'OR — 하나라도 만족 시 숨김', '설정 시 조건 만족이면 필드 숨김', '#fa8c16')}
      <Divider style={{ margin: '8px 0' }} />
      {renderGroup('requiredWhen', '필수 조건 (requiredWhen)', 'AND — 모두 만족 시 필수', '설정 시 조건 만족이면 필수 입력으로 변경', '#f5222d')}
      <Divider style={{ margin: '8px 0' }} />
      {renderGroup('disabledWhen', '비활성화 조건 (disabledWhen)', 'OR — 하나라도 만족 시 비활성', '설정 시 조건 만족이면 입력 불가', '#8c8c8c')}
    </div>
  )
}

// ─── 필드 복사 모달 ──────────────────────────────────────────
const CopyFieldsModal: React.FC<{
  open: boolean
  onClose: () => void
  currentScreenId: string
  onCopy: (fields: Field[]) => void
}> = ({ open, onClose, currentScreenId, onCopy }) => {
  const [selectedScreenId, setSelectedScreenId] = useState<string>('')
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  useEffect(() => {
    if (!open) { setSelectedScreenId(''); setSelectedIds([]) }
  }, [open])

  const { data: screens } = useQuery({
    queryKey: ['adminScreens'],
    queryFn: () => api.get('/schema/admin/screens').then(r => r.data.data ?? []),
    enabled: open,
  })

  const { data: srcScreen, isLoading: srcLoading } = useQuery<ScreenDetail>({
    queryKey: ['screenDetail', selectedScreenId],
    queryFn: () => api.get(`/schema/admin/screens/${selectedScreenId}`).then(r => r.data.data),
    enabled: !!selectedScreenId,
  })

  const availableScreens = (screens ?? []).filter((s: { screenId: string }) => s.screenId !== currentScreenId)
  const srcFields = srcScreen?.fields ?? []
  const allSelected = srcFields.length > 0 && selectedIds.length === srcFields.length

  const handleOk = () => {
    const fields = srcFields.filter(f => f.fieldId != null && selectedIds.includes(f.fieldId))
    if (fields.length === 0) { message.warning('복사할 필드를 선택하세요.'); return }
    onCopy(fields)
    onClose()
  }

  return (
    <ResizableModal
      title={<Space><CopyOutlined />다른 화면에서 필드 복사</Space>}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText={`복사 (${selectedIds.length}개)`}
      okButtonProps={{ disabled: selectedIds.length === 0 }}
      width={560}
    >
      <div style={{ marginBottom: 12 }}>
        <Select
          style={{ width: '100%' }}
          placeholder="원본 화면 선택"
          value={selectedScreenId || undefined}
          onChange={(v) => { setSelectedScreenId(v); setSelectedIds([]) }}
          options={availableScreens.map((s: { screenId: string; screenNm: string }) => ({
            value: s.screenId,
            label: `[${s.screenId}] ${s.screenNm}`,
          }))}
          showSearch
          filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
        />
      </div>

      {selectedScreenId && (
        srcLoading ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>불러오는 중...</div>
        ) : srcFields.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>이 화면에 필드가 없습니다.</div>
        ) : (
          <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, overflow: 'hidden' }}>
            {/* 전체선택 헤더 */}
            <div style={{ padding: '8px 14px', background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
              <Checkbox
                checked={allSelected}
                indeterminate={selectedIds.length > 0 && !allSelected}
                onChange={e => setSelectedIds(e.target.checked ? srcFields.map(f => f.fieldId!) : [])}
              >
                <Text strong>전체 선택 ({srcFields.length}개)</Text>
              </Checkbox>
            </div>
            {/* 필드 목록 */}
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {srcFields.map(f => (
                <div
                  key={f.fieldId}
                  style={{
                    padding: '8px 14px',
                    borderBottom: '1px solid #f5f5f5',
                    background: f.fieldId != null && selectedIds.includes(f.fieldId) ? '#e6f4ff' : '#fff',
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onClick={() => {
                    if (f.fieldId == null) return
                    setSelectedIds(prev =>
                      prev.includes(f.fieldId!) ? prev.filter(id => id !== f.fieldId) : [...prev, f.fieldId!]
                    )
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Checkbox checked={f.fieldId != null && selectedIds.includes(f.fieldId)} />
                    <Tag color={TYPE_COLORS[f.fieldType] ?? '#1677ff'} style={{ fontSize: 10 }}>{f.fieldType}</Tag>
                    <span style={{ fontWeight: 600 }}>{f.fieldLabel}</span>
                    <span style={{ color: '#999', fontSize: 12 }}>({f.fieldNm})</span>
                    {f.codeGroup && <Tag style={{ fontSize: 10 }}>{f.codeGroup}</Tag>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}
    </ResizableModal>
  )
}

// ─── 섹션 헤더 (접기/펼치기) ─────────────────────────────────
const SectionHeader: React.FC<{
  title: string
  collapsed: boolean
  onToggle: () => void
}> = ({ title, collapsed, onToggle }) => (
  <div
    onClick={onToggle}
    style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '7px 14px', margin: '12px 0 0',
      background: 'linear-gradient(90deg, #f0f5ff 0%, #f5f5f5 100%)',
      borderRadius: 6, cursor: 'pointer', userSelect: 'none',
      border: '1px solid #d6e4ff',
    }}
  >
    <span style={{ fontWeight: 700, fontSize: 12, color: '#1677ff', letterSpacing: 0.3 }}>{title}</span>
    <DownOutlined style={{
      fontSize: 11, color: '#1677ff',
      transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
      transition: 'transform 0.22s ease',
    }} />
  </div>
)

// ─── 메인 페이지 ─────────────────────────────────────────────
const ScreenDesignPage: React.FC = () => {
  const { screenId } = useParams<{ screenId?: string }>()
  const navigate = useNavigate()
  const { currentProject, roles, userId } = useAuthStore()
  const isSysAdmin = roles.includes('SYSTEM_ADMIN')
  const queryClient = useQueryClient()

  const bpScreens = Grid.useBreakpoint()
  const isMobile = bpScreens.md === false

  const [fieldOpen,      setFieldOpen]      = useState(false)
  const [sectionsOn,     setSectionsOn]     = useState(false)
  const [localSections,  setLocalSections]  = useState<SectionConfig[]>([])
  const [screenOpen,     setScreenOpen]     = useState(!screenId)
  const [copyOpen,       setCopyOpen]       = useState(false)
  const [gridConfigOpen, setGridConfigOpen] = useState(false)
  const [previewMode,    setPreviewMode]    = useState(false)
  const [editingField,   setEditingField]   = useState<Field | null>(null)
  const [localFields,    setLocalFields]    = useState<Field[]>([])
  const [activeField,    setActiveField]    = useState<Field | null>(null)
  const [copyLoading,    setCopyLoading]    = useState(false)
  const [dashSaving,     setDashSaving]     = useState(false)
  const [reportSaving,   setReportSaving]   = useState(false)
  const [eventDrawerOpen, setEventDrawerOpen] = useState(false)
  const [screenEvents,    setScreenEvents]    = useState<EventBinding[]>([])
  const [eventSaving,     setEventSaving]     = useState(false)
  const [dsDrawerOpen,    setDsDrawerOpen]    = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  const toggleSection = (key: string) => setCollapsedSections(prev => {
    const next = new Set(prev)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  })

  // localSections → sectionsJson 폼 필드 동기화
  useEffect(() => {
    if (sectionsOn) {
      screenForm.setFieldValue('sectionsJson', JSON.stringify(localSections))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSections, sectionsOn])

  const [fieldForm]  = Form.useForm()
  const [screenForm] = Form.useForm()
  const watchedFieldType = Form.useWatch('fieldType', fieldForm)

  const nameAc  = useFieldSuggestions('name')
  const labelAc = useFieldSuggestions('label')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const { data: screen, isLoading } = useQuery<ScreenDetail>({
    queryKey: ['screenDetail', screenId],
    queryFn: () => api.get(`/schema/admin/screens/${screenId}`).then(r => r.data.data),
    enabled: !!screenId,
  })

  // 설계 페이지 진입 시 잠금, 이탈 시 해제
  useEffect(() => {
    if (!screenId) return
    api.post(`/schema/admin/screens/${screenId}/lock`).catch(() => {/* 신규 화면이면 무시 */})

    const unlockBeacon = () => {
      // beforeunload(탭 닫기·새로고침)에서는 keepalive fetch 사용
      const token = localStorage.getItem('accessToken')
      fetch(`/api/schema/admin/screens/${screenId}/unlock`, {
        method: 'POST', keepalive: true,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      }).catch(() => {})
    }

    const unlockSpa = () => {
      // SPA 라우팅(컴포넌트 언마운트)에서는 axios 사용
      api.post(`/schema/admin/screens/${screenId}/unlock`).catch(() => {})
    }

    window.addEventListener('beforeunload', unlockBeacon)
    return () => {
      unlockSpa()
      window.removeEventListener('beforeunload', unlockBeacon)
    }
  }, [screenId])

  // canvas 타입이면 캔버스 디자이너로 이동
  useEffect(() => {
    if (screen?.screenType === 'canvas' && screenId) {
      navigate(`/admin/screens/${screenId}/canvas`, { replace: true })
    }
  }, [screen, screenId, navigate])

  useEffect(() => {
    if (screen?.fields) setLocalFields([...screen.fields])
    if (screen?.layoutConfig) {
      const cfg = safeParseJson(screen.layoutConfig)
      setScreenEvents((cfg.eventBindings as EventBinding[]) ?? [])
    }
    // screenForm을 화면 데이터로 미리 채워야 watchedTableNm 등이 정상 동작함
    if (screen) {
      const cfg = safeParseJson(screen.layoutConfig)
      const gs = (cfg.gridSettings as { showSearch?: boolean; searchFields?: string[]; showExcelDownload?: boolean } | undefined) ?? {}
      screenForm.setFieldsValue({
        datasourceType: screen.datasourceType ?? 'biz_data',
        tableNm:        screen.tableNm ?? '',
        pkColumn:       screen.pkColumn ?? 'id',
        dbConnId:       screen.dbConnId ?? undefined,
        useAgGrid:      !!cfg.useAgGrid,
        gridShowSearch: gs.showSearch !== false,
        gridSearchFields: gs.searchFields ?? [],
        gridStyles:     cfg.gridStyles ?? {},
      })
    }
  }, [screen, screenForm])

  const { data: codeGroups } = useQuery({
    queryKey: ['codeGroups'],
    queryFn: () => api.get('/admin/codes/groups').then(r => r.data.data ?? []),
  })

  const watchedDatasourceType = Form.useWatch('datasourceType', screenForm)
  const watchedTableNm        = Form.useWatch('tableNm', screenForm)
  const watchedDbConnId       = Form.useWatch('dbConnId', screenForm)
  const watchedScreenType     = Form.useWatch('screenType', screenForm)
  const watchedUseAgGrid      = Form.useWatch('useAgGrid', screenForm)

  const { data: dbConnections } = useQuery({
    queryKey: ['dbConnections'],
    queryFn: () => api.get('/datasource/connections').then(r => r.data.data ?? []),
  })

  const { data: dbTables = [] } = useQuery<string[]>({
    queryKey: ['dbTables', watchedDbConnId],
    queryFn: () => api.get('/schema/admin/db-meta/tables', {
      params: watchedDbConnId ? { dbConnId: watchedDbConnId } : {},
    }).then(r => r.data.data ?? []),
    enabled: watchedDatasourceType === 'table',
  })

  const { data: dbColumns = [] } = useQuery<{ column_name: string; data_type: string }[]>({
    queryKey: ['dbColumns', watchedTableNm, watchedDbConnId],
    queryFn: () => api.get(`/schema/admin/db-meta/tables/${watchedTableNm}/columns`, {
      params: watchedDbConnId ? { dbConnId: watchedDbConnId } : {},
    }).then(r => (r.data.data ?? []).map((c: Record<string, string>) => ({
      column_name: c.column_name ?? c.COLUMN_NAME,
      data_type: c.data_type ?? c.DATA_TYPE,
    }))),
    enabled: watchedDatasourceType === 'table' && !!watchedTableNm,
  })

  // ─── Mutations ───────────────────────────────────────────
  const saveScreenMutation = useMutation({
    mutationFn: (v: Record<string, unknown>) => {
      const { formCols, useAgGrid, sectionsJson, openType, btnAlign, btnSubmitLabel, btnResetLabel, btnShowReset,
              datasourceType, tableNm, pkColumn, dbConnId,
              gridShowSearch, gridSearchFields, gridShowExcelDownload,
              gridStyles,
              ...rest } = v
      let sections: unknown = undefined
      if (sectionsJson) {
        try { sections = JSON.parse(sectionsJson as string) } catch { sections = undefined }
      }
      const layoutConfig: Record<string, unknown> = { formCols: formCols ?? 2 }
      if (useAgGrid) layoutConfig.useAgGrid = true
      if (sections) layoutConfig.sections = sections
      // 그리드/마스터-디테일 화면만 검색 설정 저장
      const st = rest.screenType as string
      if (st === 'grid' || st === 'master-detail') {
        layoutConfig.gridSettings = {
          showSearch: gridShowSearch !== false,
          ...(Array.isArray(gridSearchFields) && gridSearchFields.length > 0
            ? { searchFields: gridSearchFields } : {}),
          showExcelDownload: !!gridShowExcelDownload,
        }
        if (gridStyles && typeof gridStyles === 'object') {
          layoutConfig.gridStyles = gridStyles
        }
      }
      const buttonConfig = {
        align: btnAlign ?? 'center',
        buttons: [
          { key: 'submit', label: (btnSubmitLabel as string) || '저장', type: 'primary', action: 'submit', visible: true },
          { key: 'reset', label: (btnResetLabel as string) || '초기화', type: 'default', action: 'reset', visible: btnShowReset !== false },
        ],
      }
      return api.post('/schema/admin/screens', {
        ...rest,
        layoutConfig: JSON.stringify(layoutConfig),
        buttonConfig: JSON.stringify(buttonConfig),
        projectId: currentProject?.projectId,
        openType: openType ?? 'page',
        datasourceType: datasourceType ?? 'biz_data',
        tableNm: tableNm ?? null,
        pkColumn: pkColumn ?? 'id',
        dbConnId: dbConnId ?? null,
      })
    },
    onSuccess: (res) => {
      message.success('화면이 저장되었습니다.')
      setScreenOpen(false)
      navigate(`/admin/screens/${res.data.data.screenId}`)
      queryClient.invalidateQueries({ queryKey: ['adminScreens'] })
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string }; status?: number } }
      const msg = e.response?.data?.message ?? '저장 중 오류가 발생했습니다.'
      message.error(`[${e.response?.status ?? 'ERR'}] ${msg}`)
    },
  })

  const saveFieldMutation = useMutation({
    mutationFn: (v: Record<string, unknown>) =>
      api.post(`/schema/admin/screens/${screenId}/fields`, v),
    onSuccess: (res) => {
      message.success('필드가 저장되었습니다.')
      setFieldOpen(false)
      fieldForm.resetFields()
      setEditingField(null)
      // 백엔드 응답에 포함된 최신 필드 목록으로 즉시 반영 (비동기 refetch 기다리지 않음)
      const updatedFields = res.data?.data?.fields
      if (Array.isArray(updatedFields)) {
        setLocalFields(updatedFields)
        queryClient.setQueryData(['screenDetail', screenId], (old: ScreenDetail | undefined) =>
          old ? { ...old, fields: updatedFields } : old
        )
      } else {
        queryClient.invalidateQueries({ queryKey: ['screenDetail', screenId] })
      }
      // 런타임 스키마 캐시도 무효화 (미리보기에서 최신 필드가 바로 반영되도록)
      queryClient.invalidateQueries({ queryKey: ['schema', screenId] })
    },
    onError: () => message.error('저장 중 오류가 발생했습니다.'),
  })

  const deleteFieldMutation = useMutation({
    mutationFn: (fieldId: number) =>
      api.delete(`/schema/admin/screens/${screenId}/fields/${fieldId}`),
    onSuccess: (_data, fieldId) => {
      message.success('필드가 삭제되었습니다.')
      setLocalFields(prev => prev.filter(f => f.fieldId !== fieldId))
      queryClient.invalidateQueries({ queryKey: ['screenDetail', screenId] })
      queryClient.invalidateQueries({ queryKey: ['schema', screenId] })
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string }; status?: number } }
      const msg = e.response?.data?.message ?? '삭제 중 오류가 발생했습니다.'
      message.error(`[${e.response?.status ?? 'ERR'}] ${msg}`)
    },
  })

  const moveMutation = useMutation({
    mutationFn: ({ fieldId, rowPos, colPos }: { fieldId: number; rowPos: number; colPos: number }) =>
      api.put(`/schema/admin/screens/${screenId}/fields/${fieldId}/move`, { rowPos, colPos }),
    onSuccess: () => {
      // screenDetail 캐시도 갱신하여 폼 저장 시 useEffect가 stale 데이터로 덮어쓰지 않도록
      queryClient.invalidateQueries({ queryKey: ['screenDetail', screenId] })
      queryClient.invalidateQueries({ queryKey: ['schema', screenId] })
    },
    onError: () => {
      if (screen?.fields) setLocalFields([...screen.fields])
      message.error('위치 변경 중 오류가 발생했습니다.')
    },
  })

  // ─── 그리드 설정 ─────────────────────────────────────────
  const layoutCfg = safeParseJson(screen?.layoutConfig)
  const formCols = (layoutCfg.formCols as number) ?? 2

  const maxRow = localFields.reduce((m, f) => Math.max(m, (f.rowPos ?? 0) + (f.rowSpan || 1) - 1), -1)
  const gridRowCount = maxRow + 2
  const cellMap = buildCellMap(localFields, formCols)

  // ─── DnD 핸들러 ──────────────────────────────────────────
  const handleDragStart = (event: DragStartEvent) => {
    const field = localFields.find(f => (f.fieldId ?? f.fieldNm) === event.active.id)
    setActiveField(field ?? null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveField(null)
    const { active, over } = event
    if (!over) return

    const overId = String(over.id)
    if (!overId.startsWith('cell-')) return

    const parts = overId.split('-')
    const targetRow = parseInt(parts[1])
    const targetCol = parseInt(parts[2])

    const draggedField = localFields.find(f => (f.fieldId ?? f.fieldNm) === active.id)
    if (!draggedField) return
    if (draggedField.rowPos === targetRow && draggedField.colPos === targetCol) return

    const occupant = localFields.find(f =>
      f.fieldId !== draggedField.fieldId &&
      f.rowPos === targetRow &&
      targetCol >= (f.colPos ?? 0) &&
      targetCol < (f.colPos ?? 0) + (f.colSpan ?? 1)
    )

    const fromRow = draggedField.rowPos
    const fromCol = draggedField.colPos

    setLocalFields(prev => prev.map(f => {
      if ((f.fieldId ?? f.fieldNm) === (draggedField.fieldId ?? draggedField.fieldNm)) {
        return { ...f, rowPos: targetRow, colPos: targetCol }
      }
      if (occupant && (f.fieldId ?? f.fieldNm) === (occupant.fieldId ?? occupant.fieldNm)) {
        return { ...f, rowPos: fromRow, colPos: fromCol }
      }
      return f
    }))

    if (occupant?.fieldId) moveMutation.mutate({ fieldId: occupant.fieldId, rowPos: fromRow, colPos: fromCol })
    if (draggedField.fieldId) moveMutation.mutate({ fieldId: draggedField.fieldId, rowPos: targetRow, colPos: targetCol })
  }

  // ─── 모달 열기 ───────────────────────────────────────────
  const openAddField = () => {
    const pos = nextAvailablePos(localFields)
    fieldForm.resetFields()
    fieldForm.setFieldsValue({ rowPos: pos.rowPos, colPos: pos.colPos })
    setEditingField(null)
    nameAc.fetch('')
    labelAc.fetch('')
    setFieldOpen(true)
  }

  const openAddFieldAtCell = (row: number, col: number) => {
    fieldForm.resetFields()
    fieldForm.setFieldsValue({ rowPos: row, colPos: col })
    setEditingField(null)
    nameAc.fetch('')
    labelAc.fetch('')
    setFieldOpen(true)
  }

  const openEditField = (field: Field) => {
    setEditingField(field)
    fieldForm.setFieldsValue({ ...field, columnNm: field.columnNm ?? undefined, extraConfig: field.extraConfig ?? {} })
    nameAc.fetch(field.fieldNm)
    labelAc.fetch(field.fieldLabel)
    setFieldOpen(true)
  }

  const openScreenModal = () => {
    if (!screen) {
      setSectionsOn(false)
      setLocalSections([])
      screenForm.resetFields()
    }
    if (screen) {
      const cfg = safeParseJson(screen.layoutConfig)
      const sections = cfg.sections as SectionConfig[] | undefined
      const parsedSections: SectionConfig[] = Array.isArray(sections) ? sections : []
      const btnCfg = safeParseJson(screen.buttonConfig)
      const buttons = (btnCfg.buttons as Array<Record<string, unknown>> | undefined) ?? []
      const submitBtn = buttons.find(b => b.action === 'submit')
      const resetBtn = buttons.find(b => b.action === 'reset')
      const gs = (cfg.gridSettings as { showSearch?: boolean; searchFields?: string[]; showExcelDownload?: boolean } | undefined) ?? {}
      setSectionsOn(parsedSections.length > 0)
      setLocalSections(parsedSections)
      screenForm.setFieldsValue({
        ...screen,
        formCols: (cfg.formCols as number) ?? 2,
        useAgGrid: !!cfg.useAgGrid,
        sectionsJson: parsedSections.length > 0 ? JSON.stringify(parsedSections) : '',
        openType: screen.openType ?? 'page',
        btnAlign: (btnCfg.align as string) ?? 'center',
        btnSubmitLabel: (submitBtn?.label as string) ?? '',
        btnResetLabel: (resetBtn?.label as string) ?? '',
        btnShowReset: (resetBtn?.visible as boolean) !== false,
        datasourceType: screen.datasourceType ?? 'biz_data',
        tableNm: screen.tableNm ?? '',
        pkColumn: screen.pkColumn ?? 'id',
        dbConnId: screen.dbConnId ?? undefined,
        gridShowSearch: gs.showSearch !== false,
        gridSearchFields: gs.searchFields ?? [],
        gridShowExcelDownload: !!gs.showExcelDownload,
        gridStyles: cfg.gridStyles ?? {},
      })
    }
    setScreenOpen(true)
  }

  // ─── 필드 복사 ───────────────────────────────────────────
  const handleCopyFields = async (fields: Field[]) => {
    if (!screenId) return
    setCopyLoading(true)
    try {
      const startRow = localFields.reduce((m, f) => Math.max(m, f.rowPos ?? 0), -1) + 1
      for (let i = 0; i < fields.length; i++) {
        const f = fields[i]
        await api.post(`/schema/admin/screens/${screenId}/fields`, {
          fieldNm: f.fieldNm,
          fieldLabel: f.fieldLabel,
          fieldType: f.fieldType,
          placeholder: f.placeholder,
          defaultValue: f.defaultValue,
          colSpan: f.colSpan,
          readonlyYn: f.readonlyYn ?? 'N',
          hiddenYn: f.hiddenYn ?? 'N',
          codeGroup: f.codeGroup,
          rowPos: startRow + i,
          colPos: 0,
        })
      }
      message.success(`${fields.length}개 필드가 복사되었습니다.`)
      queryClient.invalidateQueries({ queryKey: ['screenDetail', screenId] })
    } catch {
      message.error('복사 중 오류가 발생했습니다.')
    } finally {
      setCopyLoading(false)
    }
  }

  // ─── 대시보드 위젯 저장 ─────────────────────────────────────
  const handleSaveDashboard = async (
    widgets: DashboardWidget[],
    gridCfg?: { cols: number; rowHeight: number },
  ) => {
    if (!screen) return
    setDashSaving(true)
    try {
      const existing = safeParseJson(screen.layoutConfig)
      const updated = {
        ...existing,
        widgets,
        ...(gridCfg ?? {}),
      }
      await api.post('/schema/admin/screens', {
        screenId: screen.screenId,
        screenNm: screen.screenNm,
        screenType: screen.screenType,
        description: screen.description,
        apiResource: screen.apiResource,
        projectId: screen.projectId,
        layoutConfig: JSON.stringify(updated),
      })
      message.success('대시보드가 저장되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['screenDetail', screenId] })
      queryClient.invalidateQueries({ queryKey: ['schema', screenId] })
    } catch {
      message.error('저장 중 오류가 발생했습니다.')
    } finally {
      setDashSaving(false)
    }
  }

  // ─── 리포트 설정 저장 ─────────────────────────────────────
  const handleSaveReport = async (config: import('@/types/schema').ReportConfig) => {
    if (!screen) return
    setReportSaving(true)
    try {
      const existing = safeParseJson(screen.layoutConfig)
      const updated = { ...existing, ...config }
      await api.post('/schema/admin/screens', {
        screenId: screen.screenId,
        screenNm: screen.screenNm,
        screenType: screen.screenType,
        description: screen.description,
        apiResource: screen.apiResource,
        projectId: screen.projectId,
        layoutConfig: JSON.stringify(updated),
      })
      message.success('리포트 설정이 저장되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['screenDetail', screenId] })
      queryClient.invalidateQueries({ queryKey: ['schema', screenId] })
    } catch {
      message.error('저장 중 오류가 발생했습니다.')
    } finally {
      setReportSaving(false)
    }
  }

  // ─── 화면 이벤트 저장 ─────────────────────────────────────
  const handleSaveScreenEvents = async (bindings: EventBinding[]) => {
    if (!screen) return
    setEventSaving(true)
    try {
      const existing = safeParseJson(screen.layoutConfig)
      await api.post('/schema/admin/screens', {
        screenId: screen.screenId,
        screenNm: screen.screenNm,
        screenType: screen.screenType,
        description: screen.description,
        apiResource: screen.apiResource,
        projectId: screen.projectId,
        layoutConfig: JSON.stringify({ ...existing, eventBindings: bindings }),
      })
      message.success('화면 이벤트가 저장되었습니다.')
      setScreenEvents(bindings)
      setEventDrawerOpen(false)
      queryClient.invalidateQueries({ queryKey: ['screenDetail', screenId] })
      queryClient.invalidateQueries({ queryKey: ['schema', screenId] })
    } catch {
      message.error('저장 중 오류가 발생했습니다.')
    } finally {
      setEventSaving(false)
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* ─ 상단 툴바 ─ */}
      <div style={{
        padding: '8px 16px', borderBottom: '1px solid #f0f0f0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff',
        flexWrap: 'wrap', gap: 8, minHeight: 56,
      }}>
        <Space wrap>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/screens')}>목록</Button>
          {screen && (
            <>
              <Divider type="vertical" />
              <Title level={5} style={{ margin: 0 }}>{screen.screenNm}</Title>
              <Tag color="purple">{screen.screenType}</Tag>
              {screen.projectId && <Tag>{screen.projectId}</Tag>}
              <Tag color="blue">{formCols}열 그리드</Tag>
            </>
          )}
        </Space>
        {isMobile ? (
          /* ── 모바일: 핵심 버튼 + ... 드롭다운 ── */
          <Space size={4}>
            {screenId && (
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => setPreviewMode(p => !p)}
                type={previewMode ? 'primary' : 'default'}
              />
            )}
            <Button size="small" icon={<EditOutlined />} onClick={openScreenModal} />
            {screenId && (
              <Dropdown
                placement="bottomRight"
                trigger={['click']}
                menu={{
                  items: [
                    {
                      key: 'ds',
                      icon: <DatabaseOutlined />,
                      label: '데이터 소스',
                      onClick: () => setDsDrawerOpen(true),
                    },
                    {
                      key: 'ev',
                      icon: <ThunderboltOutlined />,
                      label: `화면 이벤트${screenEvents.length > 0 ? ` (${screenEvents.length})` : ''}`,
                      onClick: () => setEventDrawerOpen(true),
                    },
                    ...(isSysAdmin ? [{
                      key: 'del',
                      icon: <DeleteOutlined />,
                      label: '화면 삭제',
                      danger: true,
                      onClick: async () => {
                        if (!window.confirm(`'${screen?.screenNm ?? screenId}'을(를) 삭제하시겠습니까?`)) return
                        try {
                          await api.delete(`/schema/admin/screens/${screenId}`)
                          message.success('화면이 삭제되었습니다.')
                          queryClient.invalidateQueries({ queryKey: ['adminScreens'] })
                          navigate('/admin/screens')
                        } catch (err: unknown) {
                          const e = err as { response?: { data?: { message?: string } } }
                          message.error(e.response?.data?.message ?? '삭제 중 오류가 발생했습니다.')
                        }
                      },
                    }] : []),
                  ],
                }}
              >
                <Button size="small" icon={<MoreOutlined />} />
              </Dropdown>
            )}
          </Space>
        ) : (
          /* ── 데스크탑: 전체 버튼 ── */
          <Space wrap>
            {screenId && (
              <Button icon={<EyeOutlined />} onClick={() => setPreviewMode(p => !p)} type={previewMode ? 'primary' : 'default'}>
                {previewMode ? '편집 모드' : '미리보기'}
              </Button>
            )}
            {screenId && (
              <Button icon={<DatabaseOutlined />} onClick={() => setDsDrawerOpen(true)}>
                데이터 소스
              </Button>
            )}
            {screenId && (
              <Button icon={<ThunderboltOutlined />} onClick={() => setEventDrawerOpen(true)}>
                화면 이벤트
                {screenEvents.length > 0 && (
                  <Badge count={screenEvents.length} style={{ marginLeft: 4, backgroundColor: '#fa8c16' }} />
                )}
              </Button>
            )}
            {isSysAdmin && screenId && (
              <Popconfirm
                title="화면 삭제"
                description={`'${screen?.screenNm ?? screenId}'을(를) 삭제하시겠습니까? 모든 필드 정보도 함께 삭제됩니다.`}
                onConfirm={async () => {
                  try {
                    await api.delete(`/schema/admin/screens/${screenId}`)
                    message.success('화면이 삭제되었습니다.')
                    queryClient.invalidateQueries({ queryKey: ['adminScreens'] })
                    navigate('/admin/screens')
                  } catch (err: unknown) {
                    const e = err as { response?: { data?: { message?: string } } }
                    message.error(e.response?.data?.message ?? '삭제 중 오류가 발생했습니다.')
                  }
                }}
                okText="삭제"
                cancelText="취소"
                okButtonProps={{ danger: true }}
              >
                <Button danger icon={<DeleteOutlined />}>화면 삭제</Button>
              </Popconfirm>
            )}
            <Button icon={<EditOutlined />} onClick={openScreenModal}>화면 정보 편집</Button>
          </Space>
        )}
      </div>

      {/* ─ 메인 영역 ─ */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {previewMode && screenId ? (
          <ScreenRenderer screenId={screenId} />
        ) : screen?.screenType === 'report' ? (
          /* ─ 리포트 디자이너 ─ */
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Space>
                <Title level={5} style={{ margin: 0 }}>리포트 디자이너</Title>
                <Tag color="cyan">Report</Tag>
                <Text type="secondary" style={{ fontSize: 12 }}>컬럼을 설정하고 데이터를 인쇄·Excel로 출력합니다</Text>
              </Space>
            </div>
            {isLoading ? (
              <Card style={{ textAlign: 'center', padding: 40 }}>
                <Text type="secondary">불러오는 중...</Text>
              </Card>
            ) : (
              <ReportDesigner
                config={safeParseJson(screen?.layoutConfig) as unknown as import('@/types/schema').ReportConfig}
                onSave={handleSaveReport}
                saving={reportSaving}
              />
            )}
          </>
        ) : screen?.screenType === 'dashboard' ? (
          /* ─ 대시보드 디자이너 ─ */
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Space>
                <Title level={5} style={{ margin: 0 }}>대시보드 위젯 디자인</Title>
                <Tag color="purple">Dashboard</Tag>
                <Text type="secondary" style={{ fontSize: 12 }}>위젯을 추가·편집하여 대시보드를 구성합니다</Text>
              </Space>
            </div>
            {isLoading ? (
              <Card style={{ textAlign: 'center', padding: 40 }}>
                <Text type="secondary">불러오는 중...</Text>
              </Card>
            ) : (
              <DashboardDesigner
                widgets={(safeParseJson(screen?.layoutConfig).widgets as DashboardWidget[]) ?? []}
                cols={(safeParseJson(screen?.layoutConfig).cols as number) ?? 12}
                rowHeight={(safeParseJson(screen?.layoutConfig).rowHeight as number) ?? 160}
                onSave={handleSaveDashboard}
                saving={dashSaving}
              />
            )}
          </>
        ) : (
          /* ─ 필드 디자이너 ─ */
          <>
            {/* 캔버스 헤더 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Space>
                <Title level={5} style={{ margin: 0 }}>필드 디자인 캔버스</Title>
                <Badge count={localFields.length} style={{ backgroundColor: '#1677ff' }} showZero />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  ⠿ 드래그하여 셀 이동 · 빈 칸 클릭하여 필드 추가
                </Text>
              </Space>
              <Space>
                <Button
                  icon={<CopyOutlined />}
                  onClick={() => setCopyOpen(true)}
                  disabled={!screenId}
                  loading={copyLoading}
                >
                  다른 화면에서 복사
                </Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={openAddField} disabled={!screenId}>
                  필드 추가
                </Button>
              </Space>
            </div>

            {!screenId ? (
              <Card style={{ textAlign: 'center', padding: 40 }}>
                <Text type="secondary">먼저 화면 정보를 등록하세요</Text><br /><br />
                <Button type="primary" onClick={() => setScreenOpen(true)}>화면 등록</Button>
              </Card>
            ) : isLoading ? (
              <Card style={{ textAlign: 'center', padding: 40 }}>
                <Text type="secondary">불러오는 중...</Text>
              </Card>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${formCols}, 1fr)`,
                    gap: 8, padding: 16,
                    background: '#f7f8fa', borderRadius: 8, border: '1px dashed #d9d9d9', minHeight: 200,
                  }}
                  role="grid"
                  aria-label={`${formCols}열 필드 배치 그리드`}
                >
                  {Array.from({ length: gridRowCount }, (_, rowIdx) =>
                    Array.from({ length: formCols }, (_, colIdx) => {
                      const cellKey = `${rowIdx}-${colIdx}`
                      const occupant = cellMap.get(cellKey)
                      if (occupant === 'spanned') return null

                      const field = occupant ?? null
                      const cellColSpan = field ? Math.min(field.colSpan || 1, formCols - colIdx) : 1
                      const cellRowSpan = field ? (field.rowSpan || 1) : 1

                      return (
                        <DroppableCell key={`cell-${rowIdx}-${colIdx}`} row={rowIdx} col={colIdx} colSpan={cellColSpan} rowSpan={cellRowSpan}>
                          {field ? (
                            <DraggableFieldCard
                              field={field}
                              onEdit={() => openEditField(field)}
                              onDelete={() => { if (field.fieldId) deleteFieldMutation.mutate(field.fieldId) }}
                            />
                          ) : (
                            <EmptyCell onClick={() => openAddFieldAtCell(rowIdx, colIdx)} />
                          )}
                        </DroppableCell>
                      )
                    }).filter(Boolean)
                  )}
                </div>
                <DragOverlay dropAnimation={null}>
                  {activeField && <FieldDragOverlay field={activeField} />}
                </DragOverlay>
              </DndContext>
            )}

            {localFields.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  <AppstoreAddOutlined style={{ marginRight: 4 }} />
                  그리드 열 수는 [화면 정보 편집]에서 변경 · colSpan으로 여러 열 병합 가능
                </Text>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─ 화면 정보 모달 ─ */}
      <ResizableModal
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 32 }}>
            <span>{screenId ? '화면 정보 편집' : '새 화면 등록'}</span>
            <Button
              size="small" type="link" icon={<ExpandAltOutlined />}
              onClick={() => setCollapsedSections(new Set())}
              style={{ fontSize: 12, color: '#1677ff' }}
            >
              모두 펼치기
            </Button>
          </div>
        }
        open={screenOpen}
        onOk={() => screenForm.submit()}
        confirmLoading={saveScreenMutation.isPending}
        onCancel={() => { if (!saveScreenMutation.isPending) { screenId ? setScreenOpen(false) : navigate('/admin/screens') } }}
        okText="저장" closable maskClosable={!!screenId}
        width={700}
      >
        <Form form={screenForm} layout="vertical" onFinish={saveScreenMutation.mutate}>

          {/* ── 섹션 1: 기본 정보 ── */}
          <SectionHeader title="기본 정보" collapsed={collapsedSections.has('basic')} onToggle={() => toggleSection('basic')} />
          <div style={{ padding: '8px 2px 4px', display: collapsedSections.has('basic') ? 'none' : '' }}>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="screenId" label="화면ID" rules={[{ required: true }]}>
                    <Input placeholder="예: USER_REG_FORM" disabled={!!screenId} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="screenType" label="화면유형" rules={[{ required: true }]} initialValue="form">
                    <Select options={SCREEN_TYPES} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="screenNm" label="화면명" rules={[{ required: true }]}>
                <Input placeholder="예: 사용자 등록 폼" />
              </Form.Item>
              <Form.Item name="description" label="설명">
                <Input.TextArea rows={2} />
              </Form.Item>
              <Row gutter={12}>
                <Col span={14}>
                  <Form.Item name="apiResource" label="API 경로">
                    <Input placeholder="예: USER_FORM" />
                  </Form.Item>
                </Col>
                <Col span={10}>
                  <Form.Item name="formCols" label="그리드 열 수" initialValue={2}
                    tooltip="한 행에 배치할 필드의 최대 수">
                    <Select options={FORM_COLS_OPTIONS} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="useAgGrid" label="AG Grid 사용" valuePropName="checked" initialValue={false}
                    tooltip="그리드 화면에서 인라인 편집 가능한 AG Grid를 사용합니다">
                    <Checkbox>AG Grid (인라인 편집 지원)</Checkbox>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="openType" label="화면 열기 방식" initialValue="page"
                    tooltip="메뉴에서 이 화면을 열 때의 방식">
                    <Select options={OPEN_TYPES} />
                  </Form.Item>
                </Col>
              </Row>
              {/* 섹션 레이아웃 — 숨김 폼 필드 (SectionEditorUI가 값을 갱신) */}
              <Form.Item name="sectionsJson" hidden><Input /></Form.Item>

              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>섹션 레이아웃</span>
                  <Switch
                    size="small"
                    checked={sectionsOn}
                    checkedChildren="ON"
                    unCheckedChildren="OFF"
                    onChange={v => {
                      setSectionsOn(v)
                      if (v && localSections.length === 0) {
                        const id1 = `s${Date.now()}`
                        const id2 = `s${Date.now() + 1}`
                        const defaults: SectionConfig[] = [
                          { id: id1, type: 'grid', role: 'master', title: '목록', height: 280 },
                          { id: id2, type: 'form', role: 'detail', title: '상세 정보', masterSectionId: id1 },
                        ]
                        setLocalSections(defaults)
                      } else if (!v) {
                        setLocalSections([])
                        screenForm.setFieldValue('sectionsJson', '')
                      }
                    }}
                  />
                  <span style={{ fontSize: 11, color: '#888' }}>
                    복합 레이아웃(마스터-디테일 등) 사용 시 ON
                  </span>
                </div>
                {sectionsOn && (
                  <SectionEditorUI
                    sections={localSections}
                    onChange={setLocalSections}
                    fields={localFields}
                  />
                )}
              </div>
            </div>

          {/* ── 섹션 2: 데이터 소스 설정 ── */}
          <SectionHeader title="데이터 소스 설정" collapsed={collapsedSections.has('datasource')} onToggle={() => toggleSection('datasource')} />
          <div style={{ padding: '8px 2px 4px', display: collapsedSections.has('datasource') ? 'none' : '' }}>
              <Form.Item name="datasourceType" label="데이터 저장 방식" initialValue="biz_data"
                tooltip="biz_data: 내장 JSON 저장소(빠른 개발) / table: 실제 DB 테이블 직접 연동">
                <Select options={[
                  { value: 'biz_data', label: 'biz_data — 내장 JSON 저장소 (기본)' },
                  { value: 'table',    label: 'table — 실제 DB 테이블 매핑' },
                ]} />
              </Form.Item>
              {watchedDatasourceType === 'table' && (
                <>
                  <Row gutter={12}>
                    <Col span={12}>
                      <Form.Item name="dbConnId" label="DB 연결" tooltip="비워두면 기본 데이터소스(H2/운영 DB) 사용">
                        <Select allowClear placeholder="기본 DB 사용"
                          options={(dbConnections ?? []).map((c: { connId: string; connName: string }) => ({
                            value: c.connId, label: `${c.connName} (${c.connId})`,
                          }))}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="pkColumn" label="PK 컬럼명" initialValue="id"
                        rules={[{ required: watchedDatasourceType === 'table', message: 'PK 컬럼명을 입력하세요' }]}>
                        <Select showSearch allowClear placeholder="id"
                          options={dbColumns.map(c => ({ value: c.column_name, label: `${c.column_name} (${c.data_type})` }))}
                          notFoundContent={watchedTableNm ? '테이블을 먼저 선택하세요' : '컬럼 없음'}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item name="tableNm" label="테이블명"
                    rules={[{ required: watchedDatasourceType === 'table', message: '테이블명을 입력하세요' }]}>
                    <Select showSearch allowClear placeholder="테이블 선택 또는 직접 입력"
                      options={dbTables.map(t => ({ value: t, label: t }))}
                      notFoundContent="테이블을 찾을 수 없습니다"
                      onChange={() => screenForm.setFieldValue('pkColumn', 'id')}
                    />
                  </Form.Item>
                  {dbColumns.length > 0 && (
                    <Alert
                      message={`테이블 컬럼 ${dbColumns.length}개 감지됨`}
                      description={`컬럼: ${dbColumns.slice(0, 8).map(c => c.column_name).join(', ')}${dbColumns.length > 8 ? ' ...' : ''}`}
                      type="success" showIcon style={{ marginBottom: 12, fontSize: 12 }}
                    />
                  )}
                </>
              )}
            </div>

          {/* ── 섹션 3: 그리드 기능 설정 (grid / master-detail) ── */}
          {(watchedScreenType === 'grid' || watchedScreenType === 'master-detail') && (
            <>
              <SectionHeader title="그리드 검색 / 기능 설정" collapsed={collapsedSections.has('gridFeature')} onToggle={() => toggleSection('gridFeature')} />
              <div style={{ padding: '8px 2px 4px', display: collapsedSections.has('gridFeature') ? 'none' : '' }}>
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item name="gridShowSearch" label="검색바 표시" valuePropName="checked" initialValue={true}
                      tooltip="켜면 검색 입력창이 그리드 위에 표시됩니다">
                      <Switch checkedChildren="켜짐" unCheckedChildren="꺼짐" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="gridShowExcelDownload" label="엑셀 다운로드 버튼" valuePropName="checked" initialValue={false}
                      tooltip="켜면 현재 조회 데이터를 엑셀로 다운로드하는 버튼이 표시됩니다">
                      <Switch checkedChildren="켜짐" unCheckedChildren="꺼짐" />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item name="gridSearchFields" label="검색 대상 필드"
                  tooltip="선택하지 않으면 text/select 타입 필드 앞 3개가 자동으로 사용됩니다">
                  <Select mode="multiple" allowClear placeholder="검색할 필드 선택 (미선택 = 자동)"
                    options={localFields.filter(f => f.hiddenYn !== 'Y').map(f => ({
                      value: f.fieldNm, label: `${f.fieldLabel} (${f.fieldNm})`,
                    }))}
                  />
                </Form.Item>
              </div>
            </>
          )}

          {/* ── 섹션 4: 그리드 스타일 설정 (AG Grid 화면) ── */}
          {(watchedScreenType === 'grid' || watchedScreenType === 'master-detail') && watchedUseAgGrid && (
            <>
              <SectionHeader title="그리드 스타일 설정" collapsed={collapsedSections.has('gridStyle')} onToggle={() => toggleSection('gridStyle')} />
              <div style={{ padding: '8px 2px 4px', display: collapsedSections.has('gridStyle') ? 'none' : '' }}>
                  <div style={{ fontWeight: 600, fontSize: 12, color: '#666', marginBottom: 8 }}>헤더</div>
                  <Row gutter={12}>
                    <Col span={6}>
                      <Form.Item name={['gridStyles', 'header', 'backgroundColor']} label="배경색">
                        <Input type="color" style={{ height: 32, padding: '2px 4px', width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item name={['gridStyles', 'header', 'color']} label="폰트 색">
                        <Input type="color" style={{ height: 32, padding: '2px 4px', width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item name={['gridStyles', 'header', 'fontSize']} label="폰트 크기 (px)">
                        <InputNumber min={10} max={24} style={{ width: '100%' }} placeholder="13" />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item name={['gridStyles', 'header', 'fontWeight']} label="폰트 굵기">
                        <Select allowClear placeholder="보통" options={[
                          { value: 'normal', label: '보통' },
                          { value: '600',    label: '세미볼드' },
                          { value: 'bold',   label: '볼드' },
                        ]} />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={12}>
                    <Col span={6}>
                      <Form.Item name={['gridStyles', 'header', 'height']} label="헤더 높이 (px)">
                        <InputNumber min={24} max={80} style={{ width: '100%' }} placeholder="40" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <div style={{ fontWeight: 600, fontSize: 12, color: '#666', marginBottom: 8, marginTop: 4 }}>행 (Row)</div>
                  <Row gutter={12}>
                    <Col span={6}>
                      <Form.Item name={['gridStyles', 'row', 'fontSize']} label="폰트 크기 (px)">
                        <InputNumber min={10} max={24} style={{ width: '100%' }} placeholder="13" />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item name={['gridStyles', 'row', 'height']} label="행 높이 (px)">
                        <InputNumber min={24} max={100} style={{ width: '100%' }} placeholder="40" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <div style={{ fontWeight: 600, fontSize: 12, color: '#666', marginBottom: 8, marginTop: 4 }}>하단 상태바 (페이지네이션)</div>
                  <Row gutter={12}>
                    <Col span={6}>
                      <Form.Item name={['gridStyles', 'statusBar', 'height']} label="높이 (px)">
                        <InputNumber min={24} max={80} style={{ width: '100%' }} placeholder="32" />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item name={['gridStyles', 'statusBar', 'fontSize']} label="폰트 크기 (px)">
                        <InputNumber min={10} max={20} style={{ width: '100%' }} placeholder="12" />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name={['gridStyles', 'statusBar', 'justifyContent']} label="정렬 위치">
                        <Select allowClear placeholder="우측 (기본)" options={[
                          { value: 'flex-start', label: '좌측' },
                          { value: 'center',     label: '가운데' },
                          { value: 'flex-end',   label: '우측' },
                        ]} />
                      </Form.Item>
                    </Col>
                  </Row>
              </div>
            </>
          )}

          {/* ── 섹션 5: 버튼 설정 ── */}
          <SectionHeader title="버튼 설정" collapsed={collapsedSections.has('button')} onToggle={() => toggleSection('button')} />
          <div style={{ padding: '8px 2px 4px', display: collapsedSections.has('button') ? 'none' : '' }}>
              <Row gutter={12}>
                <Col span={10}>
                  <Form.Item name="btnAlign" label="버튼 위치" initialValue="center">
                    <Select options={[
                      { value: 'left',   label: '좌측' },
                      { value: 'center', label: '가운데' },
                      { value: 'right',  label: '우측' },
                    ]} />
                  </Form.Item>
                </Col>
                <Col span={14}>
                  <Form.Item name="btnSubmitLabel" label="저장 버튼 텍스트" tooltip="비워두면 '저장' 또는 '수정' 기본값 사용">
                    <Input placeholder="저장" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={10}>
                  <Form.Item name="btnShowReset" label="초기화 버튼" valuePropName="checked" initialValue={true}>
                    <Checkbox>표시</Checkbox>
                  </Form.Item>
                </Col>
                <Col span={14}>
                  <Form.Item name="btnResetLabel" label="초기화 버튼 텍스트" tooltip="비워두면 '초기화' 기본값 사용">
                    <Input placeholder="초기화" />
                  </Form.Item>
                </Col>
              </Row>
            </div>

        </Form>
      </ResizableModal>

      {/* ─ 필드 편집 모달 ─ */}
      <ResizableModal
        title={editingField ? `필드 편집 — ${editingField.fieldLabel}` : '필드 추가'}
        open={fieldOpen}
        onOk={() => fieldForm.submit()}
        onCancel={() => { setFieldOpen(false); setEditingField(null); fieldForm.resetFields() }}
        okText="저장" width={780} destroyOnHidden
      >
        <Form
          form={fieldForm}
          layout="vertical"
          onFinish={(v) => {
            // Form.Item이 없는 경로(extraConfig.gridConfig 등)는 validateFields() 결과에서 누락됨
            // → getFieldValue로 직접 읽어서 병합
            const gridConfig = fieldForm.getFieldValue(['extraConfig', 'gridConfig'])
            const merged = {
              ...v,
              extraConfig: {
                ...(v.extraConfig as Record<string, unknown> | undefined ?? {}),
                ...(gridConfig != null ? { gridConfig } : {}),
              },
            }
            saveFieldMutation.mutate({ ...merged, fieldId: editingField?.fieldId, columnNm: v.columnNm ?? null })
          }}
        >
          <Tabs
            size="small"
            items={[
              {
                key: 'basic',
                label: '기본 설정',
                children: (
                  <>
                    <Row gutter={12}>
                      <Col span={11}>
                        <Form.Item
                          name="fieldNm"
                          label={<Space size={4}>필드명 (영문)<Tooltip title="소문자+언더스코어만 허용"><InfoCircleOutlined style={{ color: '#1677ff', fontSize: 12 }} /></Tooltip></Space>}
                          rules={[
                            { required: true, message: '필드명을 입력하세요' },
                            { validator: (_, v) => !v || SNAKE_CASE_RE.test(v) ? Promise.resolve() : Promise.reject(new Error('소문자와 _ 만 사용')) },
                          ]}
                        >
                          <SnakeCaseInput options={nameAc.options} onFetch={nameAc.fetch} />
                        </Form.Item>
                      </Col>
                      <Col span={10}>
                        <Form.Item name="fieldLabel" label="레이블 (한글)" rules={[{ required: true }]}>
                          <AutoComplete
                            options={labelAc.options} filterOption={false} placeholder="예: 사용자명"
                            onSearch={labelAc.fetch} onFocus={() => labelAc.fetch(fieldForm.getFieldValue('fieldLabel') ?? '')}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={3}>
                        <Form.Item
                          name={['extraConfig', 'showLabel']}
                          label="레이블 표시"
                          initialValue={true}
                          valuePropName="checked"
                        >
                          <Switch size="small" checkedChildren="표시" unCheckedChildren="숨김" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={12}>
                      <Col span={10}>
                        <Form.Item name="fieldType" label="필드 타입" initialValue="text" rules={[{ required: true }]}>
                          <Select options={FIELD_TYPES} />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item name="colSpan" label="열 병합(→)" initialValue={1} tooltip={`1~${formCols}: 가로로 병합할 열 수`}>
                          <InputNumber min={1} max={formCols} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item name="rowSpan" label="행 병합(↕)" initialValue={1} tooltip="세로로 병합할 행 수">
                          <InputNumber min={1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={3}>
                        <Form.Item
                          name="rowPos"
                          label="행 위치"
                          initialValue={0}
                          tooltip="0부터 시작하는 행 번호. 기존 필드 위치는 자동으로 채워집니다."
                        >
                          <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={3}>
                        <Form.Item
                          name="colPos"
                          label="열 위치"
                          initialValue={0}
                          tooltip={`0~${formCols - 1}: 해당 행에서의 열 번호`}
                        >
                          <InputNumber min={0} max={formCols - 1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={12}>
                      <Col span={12}>
                        <Form.Item name="placeholder" label="Placeholder">
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="defaultValue" label="기본값">
                          <Input />
                        </Form.Item>
                      </Col>
                    </Row>

                    {watchedFieldType === 'text' && (
                      <Form.Item
                        name={['extraConfig', 'align']}
                        label="정렬"
                        initialValue="left"
                      >
                        <Radio.Group size="small" buttonStyle="solid">
                          <Radio.Button value="left"><AlignLeftOutlined /> 좌측</Radio.Button>
                          <Radio.Button value="center"><AlignCenterOutlined /> 중앙</Radio.Button>
                          <Radio.Button value="right"><AlignRightOutlined /> 우측</Radio.Button>
                        </Radio.Group>
                      </Form.Item>
                    )}
                    {watchedFieldType === 'number' && (
                      <Form.Item label="정렬">
                        <Radio.Group size="small" buttonStyle="solid" value="right" disabled>
                          <Radio.Button value="right"><AlignRightOutlined /> 우측 (고정)</Radio.Button>
                        </Radio.Group>
                      </Form.Item>
                    )}

                    {screen?.datasourceType === 'table' && (
                      <Form.Item name="columnNm" label="DB 컬럼명"
                        tooltip="실제 테이블 컬럼명. 비워두면 필드명을 컬럼명으로 사용합니다.">
                        <Select
                          showSearch allowClear placeholder={`기본값: 필드명 사용`}
                          options={dbColumns.map(c => ({
                            value: c.column_name,
                            label: `${c.column_name} (${c.data_type})`,
                          }))}
                          notFoundContent={dbColumns.length === 0 ? '화면 정보에서 테이블을 먼저 선택하세요' : '없음'}
                        />
                      </Form.Item>
                    )}

                    <Form.Item
                      name={['extraConfig', 'jsonPath']}
                      label="JSON 경로"
                      tooltip="컬럼 값이 JSON 배열/객체일 때 추출할 경로. 예) [0].email  /  [0].phone  /  name"
                    >
                      <Input placeholder="예: [0].email" allowClear />
                    </Form.Item>

                    <Row gutter={12}>
                      <Col span={12}>
                        <Form.Item name="codeGroup" label="공통코드 그룹">
                          <Select
                            allowClear placeholder="코드그룹 선택"
                            options={(codeGroups ?? []).map((g: { groupCd: string; groupNm: string }) => ({
                              value: g.groupCd, label: `${g.groupCd} - ${g.groupNm}`,
                            }))}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item name="useYn" label="사용여부" initialValue="Y">
                          <Select options={[{ value: 'Y', label: '사용' }, { value: 'N', label: '미사용' }]} />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item name="readonlyYn" label="읽기전용" initialValue="N">
                          <Select options={[{ value: 'N', label: '아니오' }, { value: 'Y', label: '예' }]} />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item name="hiddenYn" label="숨김" initialValue="N">
                          <Select options={[{ value: 'N', label: '아니오' }, { value: 'Y', label: '예' }]} />
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                ),
              },
              {
                key: 'events',
                label: <Space size={4}><ThunderboltOutlined />이벤트/액션</Space>,
                children: (
                  <Form.Item name={['extraConfig', 'eventBindings']} noStyle>
                    <EventActionEditor
                      scopedEvents={['onChange', 'onBlur']}
                      availableFields={localFields
                        .filter(f => f.fieldId !== editingField?.fieldId)
                        .map(f => ({ fieldNm: f.fieldNm, fieldLabel: f.fieldLabel }))}
                    />
                  </Form.Item>
                ),
              },
              ...(watchedFieldType === 'grid' ? [{
                key: 'grid',
                label: <Space size={4}><TableOutlined />그리드 설정</Space>,
                children: (
                  <div>
                    <Alert message="그리드 컬럼을 설정한 후 저장하세요" type="info" showIcon style={{ marginBottom: 12 }} />
                    <Button icon={<TableOutlined />} onClick={() => setGridConfigOpen(true)}>
                      그리드 컬럼 편집기 열기
                    </Button>
                    <GridFieldConfig
                      open={gridConfigOpen}
                      config={(fieldForm.getFieldValue(['extraConfig', 'gridConfig']) as GridConfig) ?? { columns: [] }}
                      onSave={(cfg) => {
                        fieldForm.setFieldValue(['extraConfig', 'gridConfig'], cfg)
                        setGridConfigOpen(false)
                      }}
                      onClose={() => setGridConfigOpen(false)}
                    />
                  </div>
                ),
              }] : []),
              {
                key: 'dataBinding',
                label: <Space size={4}><DatabaseOutlined />데이터 바인딩</Space>,
                children: (
                  <Form.Item name={['extraConfig', 'dataBinding']} noStyle>
                    <DataBindingEditor screenId={screenId} />
                  </Form.Item>
                ),
              },
              {
                key: 'conditions',
                label: <Space size={4}><BranchesOutlined />조건부 로직</Space>,
                children: (
                  <Form.Item name={['extraConfig', 'conditions']} noStyle>
                    <ConditionsEditor
                      availableFields={localFields
                        .filter(f => f.fieldId !== editingField?.fieldId)
                        .map(f => ({ fieldNm: f.fieldNm, fieldLabel: f.fieldLabel }))}
                    />
                  </Form.Item>
                ),
              },
              ...(watchedFieldType === 'info-banner' ? [{
                key: 'banner',
                label: '배너 설정',
                children: (
                  <div>
                    <Alert message="배너 내용은 HTML을 지원합니다. 예: <b>굵게</b>, <br/> 줄바꿈" type="info" showIcon style={{ marginBottom: 12 }} />
                    <Form.Item name={['extraConfig', 'bannerType']} label="배너 유형" initialValue="info">
                      <Select options={[
                        { value: 'info',    label: '안내 (파란색)' },
                        { value: 'warning', label: '경고 (주황색)' },
                        { value: 'success', label: '성공 (초록색)' },
                        { value: 'error',   label: '오류 (빨간색)' },
                      ]} />
                    </Form.Item>
                    <Form.Item name={['extraConfig', 'content']} label="내용 (HTML 가능)">
                      <Input.TextArea rows={6} placeholder="예: <b>[등록 안내]</b><br/>현재 화면은 연도별 등급 현황입니다." />
                    </Form.Item>
                  </div>
                ),
              }] : []),
              ...(watchedFieldType === 'stat-card' ? [{
                key: 'stat',
                label: '통계 카드 설정',
                children: (
                  <div>
                    <Alert message="통계 카드는 검색/조회 후 폼 값이 채워지면 자동으로 표시됩니다." type="info" showIcon style={{ marginBottom: 12 }} />
                    <Row gutter={12}>
                      <Col span={12}>
                        <Form.Item name={['extraConfig', 'color']} label="색상 (hex)" initialValue="#1677ff">
                          <Input placeholder="#1677ff" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name={['extraConfig', 'suffix']} label="단위">
                          <Input placeholder="예: 명, 건, %" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={12}>
                      <Col span={12}>
                        <Form.Item name={['extraConfig', 'showPercent']} label="비율(%) 표시" valuePropName="checked">
                          <Switch />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name={['extraConfig', 'totalField']} label="기준 필드명 (비율 분모)">
                          <Input placeholder="예: total_count" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                ),
              }] : []),
            ]}
          />
        </Form>
      </ResizableModal>

      {/* ─ 필드 복사 모달 ─ */}
      {screenId && (
        <CopyFieldsModal
          open={copyOpen}
          onClose={() => setCopyOpen(false)}
          currentScreenId={screenId}
          onCopy={handleCopyFields}
        />
      )}

      {/* ─ 데이터 소스 관리 ─ */}
      <DataSourceManager
        screenId={screenId}
        open={dsDrawerOpen}
        onClose={() => setDsDrawerOpen(false)}
      />

      {/* ─ 화면 이벤트/액션 드로어 ─ */}
      <Drawer
        title={
          <Space>
            <ThunderboltOutlined style={{ color: '#fa8c16' }} />
            화면 이벤트/액션 빌더
          </Space>
        }
        open={eventDrawerOpen}
        onClose={() => setEventDrawerOpen(false)}
        width={680}
        extra={
          <Button
            type="primary"
            loading={eventSaving}
            onClick={() => handleSaveScreenEvents(screenEvents)}
          >
            저장
          </Button>
        }
      >
        <Alert
          message="화면 수준 이벤트 설정"
          description={
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
              <li><b>onLoad</b> — 화면이 처음 로드될 때 자동 실행</li>
              <li><b>onSubmit</b> — 폼 저장 성공 후 실행 (이동, 메시지 등)</li>
              <li><b>onRowSelect</b> — 그리드에서 행을 선택할 때 실행</li>
            </ul>
          }
          type="info" showIcon style={{ marginBottom: 16 }}
        />
        <EventActionEditor
          value={screenEvents}
          onChange={setScreenEvents}
          scopedEvents={['onLoad', 'onSubmit', 'onRowSelect']}
          availableFields={localFields.map(f => ({ fieldNm: f.fieldNm, fieldLabel: f.fieldLabel }))}
        />
      </Drawer>
    </div>
  )
}

export default ScreenDesignPage
