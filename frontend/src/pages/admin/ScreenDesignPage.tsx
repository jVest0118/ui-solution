import React, { useState, useRef, useEffect } from 'react'
import {
  Button, Modal, Form, Input, Select, InputNumber,
  message, Typography, Card, Row, Col, Divider, Space, Tooltip,
  Badge, AutoComplete, Collapse, Tabs, Popconfirm, Tag, Checkbox
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
  ArrowLeftOutlined, InfoCircleOutlined, ThunderboltOutlined,
  AppstoreAddOutlined, CopyOutlined
} from '@ant-design/icons'
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, DragOverlay, useDraggable, useDroppable
} from '@dnd-kit/core'
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import api from '@/api/axios'
import { useAuthStore } from '@/store/authStore'
import { ScreenRenderer } from '@/components/renderer/ScreenRenderer'

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
  { value: 'text',     label: 'Text' },
  { value: 'password', label: 'Password' },
  { value: 'number',   label: 'Number' },
  { value: 'date',     label: 'Date' },
  { value: 'datetime', label: 'DateTime' },
  { value: 'select',   label: 'Select (공통코드)' },
  { value: 'radio',    label: 'Radio' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'file',     label: 'File Upload' },
  { value: 'popup',    label: 'Popup Search' },
]

const SCREEN_TYPES = [
  { value: 'form',          label: '입력 폼' },
  { value: 'grid',          label: '그리드 목록' },
  { value: 'master-detail', label: '마스터-디테일' },
  { value: 'popup',         label: '팝업' },
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
  date: '#fa8c16', datetime: '#fa541c', select: '#13c2c2',
  textarea: '#eb2f96', file: '#f5222d', popup: '#faad14',
  radio: '#2f54eb', checkbox: '#389e0d',
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
  sortOrder: number
  rowPos: number
  colPos: number
  readonlyYn: string
  hiddenYn: string
  codeGroup?: string
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

// ─── 셀 위치 맵: 어떤 필드가 어느 셀을 차지하는지 ─────────────
type CellOccupant = Field | 'spanned'

function buildCellMap(fields: Field[], formCols: number): Map<string, CellOccupant> {
  const map = new Map<string, CellOccupant>()
  for (const f of fields) {
    const r = f.rowPos ?? 0
    const c = f.colPos ?? 0
    const span = Math.min(f.colSpan || 1, formCols - c)
    map.set(`${r}-${c}`, f)
    for (let ci = c + 1; ci < c + span; ci++) {
      map.set(`${r}-${ci}`, 'spanned')
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
    bodyStyle={{ padding: '8px 12px' }}
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
    <div ref={setNodeRef} style={{ opacity: isDragging ? 0.25 : 1, height: '100%' }} {...attributes}>
      <Card
        size="small"
        style={{
          border: `1.5px solid ${TYPE_COLORS[field.fieldType] ?? '#e8e8e8'}40`,
          background: '#fff', cursor: 'grab', userSelect: 'none', height: '100%',
        }}
        bodyStyle={{ padding: '8px 10px' }}
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
                <span style={{ color: '#1677ff', marginLeft: 4, fontSize: 10 }}>×{field.colSpan}열</span>
              )}
            </div>
            <div style={{ fontSize: 10, color: '#bfbfbf', marginTop: 2 }}>
              {field.rowPos}행 {field.colPos}열
            </div>
          </div>
          <Space size={2} style={{ flexShrink: 0 }}>
            <Tooltip title="편집">
              <Button size="small" type="text" icon={<EditOutlined />} onClick={e => { e.stopPropagation(); onEdit() }} />
            </Tooltip>
            <Popconfirm title="이 필드를 삭제하시겠습니까?" onConfirm={onDelete} okText="삭제" cancelText="취소">
              <Tooltip title="삭제">
                <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={e => e.stopPropagation()} />
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
  row: number; col: number; colSpan?: number; children: React.ReactNode
}> = ({ row, col, colSpan = 1, children }) => {
  const { setNodeRef, isOver } = useDroppable({ id: `cell-${row}-${col}` })
  return (
    <div
      ref={setNodeRef}
      style={{
        gridColumn: colSpan > 1 ? `span ${colSpan}` : undefined,
        borderRadius: 8,
        border: isOver ? '2px dashed #1677ff' : '2px solid transparent',
        background: isOver ? '#e6f4ff' : 'transparent',
        transition: 'border-color 0.15s, background 0.15s',
        minHeight: 64,
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
    <Modal
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
    </Modal>
  )
}

// ─── 메인 페이지 ─────────────────────────────────────────────
const ScreenDesignPage: React.FC = () => {
  const { screenId } = useParams<{ screenId?: string }>()
  const navigate = useNavigate()
  const { currentProject } = useAuthStore()
  const queryClient = useQueryClient()

  const [fieldOpen,    setFieldOpen]    = useState(false)
  const [screenOpen,   setScreenOpen]   = useState(!screenId)
  const [copyOpen,     setCopyOpen]     = useState(false)
  const [previewMode,  setPreviewMode]  = useState(false)
  const [editingField, setEditingField] = useState<Field | null>(null)
  const [localFields,  setLocalFields]  = useState<Field[]>([])
  const [activeField,  setActiveField]  = useState<Field | null>(null)
  const [copyLoading,  setCopyLoading]  = useState(false)

  const [fieldForm]  = Form.useForm()
  const [screenForm] = Form.useForm()

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

  useEffect(() => {
    if (screen?.fields) setLocalFields([...screen.fields])
  }, [screen])

  const { data: codeGroups } = useQuery({
    queryKey: ['codeGroups'],
    queryFn: () => api.get('/admin/codes/groups').then(r => r.data.data ?? []),
  })

  // ─── Mutations ───────────────────────────────────────────
  const saveScreenMutation = useMutation({
    mutationFn: (v: Record<string, unknown>) => {
      const { formCols, ...rest } = v
      return api.post('/schema/admin/screens', {
        ...rest,
        layoutConfig: JSON.stringify({ formCols: formCols ?? 2 }),
        projectId: currentProject?.projectId,
      })
    },
    onSuccess: (res) => {
      message.success('화면이 저장되었습니다.')
      setScreenOpen(false)
      navigate(`/admin/screens/${res.data.data.screenId}`)
      queryClient.invalidateQueries({ queryKey: ['adminScreens'] })
    },
    onError: () => message.error('저장 중 오류가 발생했습니다.'),
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
    },
    onError: () => message.error('저장 중 오류가 발생했습니다.'),
  })

  const deleteFieldMutation = useMutation({
    mutationFn: (fieldId: number) =>
      api.delete(`/schema/admin/screens/${screenId}/fields/${fieldId}`),
    onSuccess: (_data, fieldId) => {
      message.success('필드가 삭제되었습니다.')
      // 즉시 제거
      setLocalFields(prev => prev.filter(f => f.fieldId !== fieldId))
      queryClient.invalidateQueries({ queryKey: ['screenDetail', screenId] })
    },
  })

  const moveMutation = useMutation({
    mutationFn: ({ fieldId, rowPos, colPos }: { fieldId: number; rowPos: number; colPos: number }) =>
      api.put(`/schema/admin/screens/${screenId}/fields/${fieldId}/move`, { rowPos, colPos }),
    onError: () => {
      if (screen?.fields) setLocalFields([...screen.fields])
      message.error('위치 변경 중 오류가 발생했습니다.')
    },
  })

  // ─── 그리드 설정 ─────────────────────────────────────────
  const layoutCfg = safeParseJson(screen?.layoutConfig)
  const formCols = (layoutCfg.formCols as number) ?? 2

  const maxRow = localFields.reduce((m, f) => Math.max(m, f.rowPos ?? 0), -1)
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
    fieldForm.setFieldsValue({ ...field, extraConfig: field.extraConfig ?? {} })
    nameAc.fetch(field.fieldNm)
    labelAc.fetch(field.fieldLabel)
    setFieldOpen(true)
  }

  const openScreenModal = () => {
    if (screen) {
      const cfg = safeParseJson(screen.layoutConfig)
      screenForm.setFieldsValue({ ...screen, formCols: (cfg.formCols as number) ?? 2 })
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

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* ─ 상단 툴바 ─ */}
      <div style={{
        padding: '12px 24px', borderBottom: '1px solid #f0f0f0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff',
      }}>
        <Space>
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
        <Space>
          {screenId && (
            <Button icon={<EyeOutlined />} onClick={() => setPreviewMode(p => !p)} type={previewMode ? 'primary' : 'default'}>
              {previewMode ? '편집 모드' : '미리보기'}
            </Button>
          )}
          <Button icon={<EditOutlined />} onClick={openScreenModal}>화면 정보 편집</Button>
        </Space>
      </div>

      {/* ─ 메인 영역 ─ */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {previewMode && screenId ? (
          <ScreenRenderer screenId={screenId} />
        ) : (
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

                      return (
                        <DroppableCell key={`cell-${rowIdx}-${colIdx}`} row={rowIdx} col={colIdx} colSpan={cellColSpan}>
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
      <Modal
        title={screenId ? '화면 정보 편집' : '새 화면 등록'}
        open={screenOpen}
        onOk={() => screenForm.submit()}
        onCancel={() => { screenId ? setScreenOpen(false) : navigate('/admin/screens') }}
        okText="저장" closable maskClosable={!!screenId} width={580}
      >
        <Form form={screenForm} layout="vertical" onFinish={saveScreenMutation.mutate}>
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
        </Form>
      </Modal>

      {/* ─ 필드 편집 모달 ─ */}
      <Modal
        title={editingField ? `필드 편집 — ${editingField.fieldLabel}` : '필드 추가'}
        open={fieldOpen}
        onOk={() => fieldForm.submit()}
        onCancel={() => { setFieldOpen(false); setEditingField(null); fieldForm.resetFields() }}
        okText="저장" width={660} destroyOnHidden
      >
        <Form
          form={fieldForm}
          layout="vertical"
          onFinish={(v) => saveFieldMutation.mutate({ ...v, fieldId: editingField?.fieldId })}
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
                      <Col span={12}>
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
                      <Col span={12}>
                        <Form.Item name="fieldLabel" label="레이블 (한글)" rules={[{ required: true }]}>
                          <AutoComplete
                            options={labelAc.options} filterOption={false} placeholder="예: 사용자명"
                            onSearch={labelAc.fetch} onFocus={() => labelAc.fetch(fieldForm.getFieldValue('fieldLabel') ?? '')}
                            style={{ width: '100%' }}
                          />
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
                        <Form.Item name="colSpan" label="열 병합" initialValue={1} tooltip={`1~${formCols}열`}>
                          <InputNumber min={1} max={formCols} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={5}>
                        <Form.Item
                          name="rowPos"
                          label="행 위치"
                          initialValue={0}
                          tooltip="0부터 시작하는 행 번호. 기존 필드 위치는 자동으로 채워집니다."
                        >
                          <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={5}>
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
                      <Col span={6}>
                        <Form.Item name="readonlyYn" label="읽기전용" initialValue="N">
                          <Select options={[{ value: 'N', label: '아니오' }, { value: 'Y', label: '예' }]} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
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
                label: <Space size={4}><ThunderboltOutlined />이벤트 설정</Space>,
                children: (
                  <div>
                    <div style={{
                      background: '#fff7e6', border: '1px solid #ffd591',
                      borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#d46b08', marginBottom: 16,
                    }}>
                      ⚡ 포커스 아웃 시 DB 중복 체크, 값 변경 시 연동 필드 자동 설정 등
                    </div>
                    <Collapse ghost>
                      <Collapse.Panel header="포커스 아웃 (onBlur)" key="onBlur">
                        <Row gutter={12}>
                          <Col span={8}>
                            <Form.Item name={['extraConfig', 'events', 'onBlur', 'type']} label="액션 유형">
                              <Select allowClear placeholder="없음" options={[
                                { value: 'API_CALL', label: 'API 호출 (GET)' },
                                { value: 'SET_VALUE', label: '다른 필드 지우기' },
                              ]} />
                            </Form.Item>
                          </Col>
                          <Col span={16}>
                            <Form.Item name={['extraConfig', 'events', 'onBlur', 'endpoint']} label="API 경로">
                              <Input placeholder="예: /biz/USERS" />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Row gutter={12}>
                          <Col span={12}>
                            <Form.Item name={['extraConfig', 'events', 'onBlur', 'errorCondition']} label="오류 조건">
                              <Input placeholder="예: total > 0" />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item name={['extraConfig', 'events', 'onBlur', 'errorMessage']} label="오류 메시지">
                              <Input placeholder="예: 이미 사용 중인 아이디입니다" />
                            </Form.Item>
                          </Col>
                        </Row>
                      </Collapse.Panel>
                      <Collapse.Panel header="값 변경 (onChange)" key="onChange">
                        <Row gutter={12}>
                          <Col span={8}>
                            <Form.Item name={['extraConfig', 'events', 'onChange', 'type']} label="액션 유형">
                              <Select allowClear placeholder="없음" options={[
                                { value: 'API_CALL', label: 'API 호출 (GET)' },
                                { value: 'SET_VALUE', label: '다른 필드 지우기' },
                              ]} />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item name={['extraConfig', 'events', 'onChange', 'endpoint']} label="API 경로">
                              <Input placeholder="예: /biz/DEPT" />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item name={['extraConfig', 'events', 'onChange', 'targetField']} label="결과 저장 필드">
                              <Input placeholder="예: dept_nm" />
                            </Form.Item>
                          </Col>
                        </Row>
                      </Collapse.Panel>
                    </Collapse>
                  </div>
                ),
              },
            ]}
          />
        </Form>
      </Modal>

      {/* ─ 필드 복사 모달 ─ */}
      {screenId && (
        <CopyFieldsModal
          open={copyOpen}
          onClose={() => setCopyOpen(false)}
          currentScreenId={screenId}
          onCopy={handleCopyFields}
        />
      )}
    </div>
  )
}

export default ScreenDesignPage
