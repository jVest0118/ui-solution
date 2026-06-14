import React, { useState, useRef, useEffect } from 'react'
import {
  Button, Modal, Form, Input, Select, InputNumber,
  message, Typography, Card, Row, Col, Divider, Space, Tooltip,
  Badge, AutoComplete, Collapse, Tabs, Popconfirm, Tag
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
  ArrowLeftOutlined, InfoCircleOutlined, ThunderboltOutlined
} from '@ant-design/icons'
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext, useSortable, rectSortingStrategy, arrayMove,
  sortableKeyboardCoordinates
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import api from '@/api/axios'
import { useAuthStore } from '@/store/authStore'
import { ScreenRenderer } from '@/components/renderer/ScreenRenderer'

const { Title, Text } = Typography

// ─── snake_case 변환 ──────────────────────────────────────────
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

const TYPE_COLORS: Record<string, string> = {
  text: '#1677ff', password: '#722ed1', number: '#52c41a',
  date: '#fa8c16', datetime: '#fa541c', select: '#13c2c2',
  textarea: '#eb2f96', file: '#f5222d', popup: '#faad14',
  radio: '#2f54eb', checkbox: '#389e0d',
}

interface Field {
  fieldId?: number
  fieldNm: string
  fieldLabel: string
  fieldType: string
  placeholder?: string
  defaultValue?: string
  colSpan: number
  sortOrder: number
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

// ─── SnakeCaseInput: fieldNm 첫 글자 버그 수정 ───────────────
// getValueFromEvent 대신 controlled value + onChange 직접 처리로 버그 수정
// (Ant Design AutoComplete의 내부 display state와 form state 분리 문제 해결)
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

// ─── SortableFieldCard: 드래그 앤 드랍 필드 카드 ─────────────
const SortableFieldCard: React.FC<{
  field: Field
  onEdit: () => void
  onDelete: () => void
}> = ({ field, onEdit, onDelete }) => {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: field.fieldId ?? field.fieldNm })

  return (
    <div
      ref={setNodeRef}
      style={{
        gridColumn: `span ${Math.min(field.colSpan || 1, 4)}`,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
        zIndex: isDragging ? 999 : 1,
      }}
      {...attributes}
    >
      <Card
        size="small"
        style={{
          border: `1.5px solid ${isDragging ? '#1677ff' : '#e8e8e8'}`,
          background: isDragging ? '#e6f4ff' : '#fff',
          cursor: 'default',
          userSelect: 'none',
        }}
        bodyStyle={{ padding: '8px 10px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* 드래그 핸들 */}
          <span
            {...listeners}
            title="드래그하여 순서 변경"
            style={{
              cursor: isDragging ? 'grabbing' : 'grab',
              color: '#c0c0c0',
              fontSize: 18,
              lineHeight: 1,
              flexShrink: 0,
              touchAction: 'none',
            }}
          >
            ⠿
          </span>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontWeight: 600,
              fontSize: 13,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {field.fieldLabel}
            </div>
            <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 1 }}>
              <Tag
                color={TYPE_COLORS[field.fieldType] ?? '#1677ff'}
                style={{ fontSize: 10, padding: '0 4px', lineHeight: '16px', marginRight: 4 }}
              >
                {field.fieldType}
              </Tag>
              {field.fieldNm}
              <span style={{ color: '#bfbfbf', margin: '0 3px' }}>·</span>
              {field.colSpan}/4열
              {field.extraConfig?.events != null && (
                <ThunderboltOutlined style={{ color: '#fa8c16', marginLeft: 4 }} title="이벤트 설정됨" />
              )}
            </div>
          </div>

          <Space size={2}>
            <Tooltip title="편집">
              <Button
                size="small"
                type="text"
                icon={<EditOutlined />}
                onClick={onEdit}
              />
            </Tooltip>
            <Popconfirm
              title="이 필드를 삭제하시겠습니까?"
              onConfirm={onDelete}
              okText="삭제"
              cancelText="취소"
            >
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

// ─── 메인 페이지 ─────────────────────────────────────────────
const ScreenDesignPage: React.FC = () => {
  const { screenId } = useParams<{ screenId?: string }>()
  const navigate = useNavigate()
  const { currentProject } = useAuthStore()
  const queryClient = useQueryClient()

  const [fieldOpen,   setFieldOpen]   = useState(false)
  const [screenOpen,  setScreenOpen]  = useState(!screenId)
  const [previewMode, setPreviewMode] = useState(false)
  const [editingField, setEditingField] = useState<Field | null>(null)
  const [localFields, setLocalFields] = useState<Field[]>([])

  const [fieldForm]  = Form.useForm()
  const [screenForm] = Form.useForm()

  const nameAc  = useFieldSuggestions('name')
  const labelAc = useFieldSuggestions('label')

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // 화면 상세 조회
  const { data: screen, isLoading } = useQuery<ScreenDetail>({
    queryKey: ['screenDetail', screenId],
    queryFn: () => api.get(`/schema/admin/screens/${screenId}`).then(r => r.data.data),
    enabled: !!screenId,
  })

  // 서버 데이터 → 로컬 상태 동기화 (낙관적 업데이트용)
  useEffect(() => {
    if (screen?.fields) setLocalFields([...screen.fields])
  }, [screen?.fields])

  // 공통코드 그룹 목록
  const { data: codeGroups } = useQuery({
    queryKey: ['codeGroups'],
    queryFn: () => api.get('/admin/codes/groups').then(r => r.data.data ?? []),
  })

  // 화면 저장
  const saveScreenMutation = useMutation({
    mutationFn: (v: Record<string, unknown>) =>
      api.post('/schema/admin/screens', { ...v, projectId: currentProject?.projectId }),
    onSuccess: (res) => {
      message.success('화면이 저장되었습니다.')
      setScreenOpen(false)
      navigate(`/admin/screens/${res.data.data.screenId}`)
      queryClient.invalidateQueries({ queryKey: ['adminScreens'] })
    },
    onError: () => message.error('저장 중 오류가 발생했습니다.'),
  })

  // 필드 저장
  const saveFieldMutation = useMutation({
    mutationFn: (v: Record<string, unknown>) =>
      api.post(`/schema/admin/screens/${screenId}/fields`, v),
    onSuccess: () => {
      message.success('필드가 저장되었습니다.')
      setFieldOpen(false)
      fieldForm.resetFields()
      setEditingField(null)
      queryClient.invalidateQueries({ queryKey: ['screenDetail', screenId] })
    },
    onError: () => message.error('저장 중 오류가 발생했습니다.'),
  })

  // 필드 삭제
  const deleteFieldMutation = useMutation({
    mutationFn: (fieldId: number) =>
      api.delete(`/schema/admin/screens/${screenId}/fields/${fieldId}`),
    onSuccess: () => {
      message.success('필드가 삭제되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['screenDetail', screenId] })
    },
  })

  // 순서 변경
  const reorderMutation = useMutation({
    mutationFn: (fieldIds: number[]) =>
      api.put(`/schema/admin/screens/${screenId}/fields/order`, fieldIds),
    onError: () => {
      // 실패 시 서버 데이터로 롤백
      if (screen?.fields) setLocalFields([...screen.fields])
      message.error('순서 변경 중 오류가 발생했습니다.')
    },
  })

  // 드래그 종료 처리
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = localFields.findIndex(f => (f.fieldId ?? f.fieldNm) === active.id)
    const newIdx = localFields.findIndex(f => (f.fieldId ?? f.fieldNm) === over.id)
    if (oldIdx < 0 || newIdx < 0) return
    const reordered = arrayMove(localFields, oldIdx, newIdx)
    setLocalFields(reordered)  // 낙관적 업데이트
    reorderMutation.mutate(reordered.map(f => f.fieldId!))
  }

  const openAddField = () => {
    fieldForm.resetFields()
    setEditingField(null)
    nameAc.fetch('')
    labelAc.fetch('')
    setFieldOpen(true)
  }

  const openEditField = (field: Field) => {
    setEditingField(field)
    fieldForm.setFieldsValue({
      ...field,
      extraConfig: field.extraConfig ?? {},
    })
    nameAc.fetch(field.fieldNm)
    labelAc.fetch(field.fieldLabel)
    setFieldOpen(true)
  }

  const sortableIds = localFields.map(f => f.fieldId ?? f.fieldNm)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* ─ 상단 툴바 ─ */}
      <div style={{
        padding: '12px 24px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#fff',
      }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/screens')}>목록</Button>
          {screen && (
            <>
              <Divider type="vertical" />
              <Title level={5} style={{ margin: 0 }}>{screen.screenNm}</Title>
              <Tag color="purple">{screen.screenType}</Tag>
              {screen.projectId && <Tag>{screen.projectId}</Tag>}
            </>
          )}
        </Space>
        <Space>
          {screenId && (
            <Button
              icon={<EyeOutlined />}
              onClick={() => setPreviewMode(p => !p)}
              type={previewMode ? 'primary' : 'default'}
            >
              {previewMode ? '편집 모드' : '미리보기'}
            </Button>
          )}
          <Button
            icon={<EditOutlined />}
            onClick={() => { if (screen) screenForm.setFieldsValue(screen); setScreenOpen(true) }}
          >
            화면 정보 편집
          </Button>
        </Space>
      </div>

      {/* ─ 메인 영역 ─ */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {previewMode && screenId ? (
          <ScreenRenderer screenId={screenId} />
        ) : (
          <>
            {/* 캔버스 헤더 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Space>
                <Title level={5} style={{ margin: 0 }}>
                  필드 디자인 캔버스
                </Title>
                <Badge
                  count={localFields.length}
                  style={{ backgroundColor: '#1677ff' }}
                  showZero
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  ⠿ 드래그하여 순서 변경 · 클릭 ✏️ 편집
                </Text>
              </Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={openAddField}
                disabled={!screenId}
              >
                필드 추가
              </Button>
            </div>

            {!screenId ? (
              <Card style={{ textAlign: 'center', padding: 40 }}>
                <Text type="secondary">먼저 화면 정보를 등록하세요</Text>
                <br /><br />
                <Button type="primary" onClick={() => setScreenOpen(true)}>화면 등록</Button>
              </Card>
            ) : localFields.length === 0 && !isLoading ? (
              <Card
                style={{
                  textAlign: 'center',
                  padding: 60,
                  background: '#fafafa',
                  borderStyle: 'dashed',
                }}
              >
                <Text type="secondary">
                  필드가 없습니다. <br />
                  [필드 추가] 버튼을 클릭하여 입력 필드를 추가하세요.
                </Text>
              </Card>
            ) : (
              /* ─ D&D 그리드 캔버스 ─ */
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: 10,
                      padding: 16,
                      background: '#f7f8fa',
                      borderRadius: 8,
                      border: '1px dashed #d9d9d9',
                      minHeight: 200,
                    }}
                    role="list"
                    aria-label="필드 목록 (드래그하여 순서 변경)"
                  >
                    {localFields.map(f => (
                      <SortableFieldCard
                        key={f.fieldId ?? f.fieldNm}
                        field={f}
                        onEdit={() => openEditField(f)}
                        onDelete={() => { if (f.fieldId) deleteFieldMutation.mutate(f.fieldId) }}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {/* 4열 그리드 범례 */}
            {localFields.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  📐 4열 기준 — 1/4: 좁음, 2/4: 보통, 3/4: 넓음, 4/4: 전체 폭
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
        onCancel={() => { if (screenId) setScreenOpen(false) }}
        okText="저장"
        closable={!!screenId}
        maskClosable={!!screenId}
        width={560}
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
          <Form.Item name="apiResource" label="API 경로" tooltip="데이터 조회/저장에 사용할 API 리소스">
            <Input placeholder="예: USER_FORM (비워두면 화면ID 사용)" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ─ 필드 편집 모달 ─ */}
      <Modal
        title={editingField ? '필드 편집' : '필드 추가'}
        open={fieldOpen}
        onOk={() => fieldForm.submit()}
        onCancel={() => { setFieldOpen(false); setEditingField(null); fieldForm.resetFields() }}
        okText="저장"
        width={660}
        destroyOnHidden
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
                        {/* ─ 필드명: SnakeCaseInput으로 첫 글자 버그 수정 ─ */}
                        <Form.Item
                          name="fieldNm"
                          label={
                            <Space size={4}>
                              필드명 (영문)
                              <Tooltip title="소문자 + 언더스코어(_)만 허용. 입력 시 자동 변환됩니다.">
                                <InfoCircleOutlined style={{ color: '#1677ff', fontSize: 12 }} />
                              </Tooltip>
                            </Space>
                          }
                          rules={[
                            { required: true, message: '필드명을 입력하세요' },
                            {
                              validator: (_, v) =>
                                !v || SNAKE_CASE_RE.test(v)
                                  ? Promise.resolve()
                                  : Promise.reject(new Error('소문자와 _ 만 사용 (예: user_name)')),
                            },
                          ]}
                        >
                          <SnakeCaseInput options={nameAc.options} onFetch={nameAc.fetch} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          name="fieldLabel"
                          label="레이블 (한글)"
                          rules={[{ required: true, message: '레이블을 입력하세요' }]}
                        >
                          <AutoComplete
                            options={labelAc.options}
                            filterOption={false}
                            placeholder="예: 사용자명"
                            onSearch={(val) => labelAc.fetch(val)}
                            onFocus={() => labelAc.fetch(fieldForm.getFieldValue('fieldLabel') ?? '')}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={12}>
                      <Col span={12}>
                        <Form.Item name="fieldType" label="필드 타입" initialValue="text" rules={[{ required: true }]}>
                          <Select options={FIELD_TYPES} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="colSpan" label="컬럼폭 (1~4)" initialValue={2}>
                          <InputNumber min={1} max={4} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="sortOrder" label="정렬순서" initialValue={0}>
                          <InputNumber min={0} style={{ width: '100%' }} />
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
                        <Form.Item
                          name="codeGroup"
                          label="공통코드 그룹"
                          tooltip="select/radio/checkbox 타입에서 사용"
                        >
                          <Select
                            allowClear
                            placeholder="코드그룹 선택"
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

                    <div style={{
                      background: '#f6ffed',
                      border: '1px solid #b7eb8f',
                      borderRadius: 6,
                      padding: '8px 12px',
                      fontSize: 12,
                      color: '#389e0d',
                    }}>
                      💡 필드명은 <strong>소문자_영문</strong> 형식으로 자동 변환됩니다.
                      예: <code>userName</code> → <code>user_name</code>
                    </div>
                  </>
                ),
              },
              {
                key: 'events',
                label: (
                  <Space size={4}>
                    <ThunderboltOutlined />
                    이벤트 설정
                  </Space>
                ),
                children: (
                  <div>
                    <div style={{
                      background: '#fff7e6',
                      border: '1px solid #ffd591',
                      borderRadius: 6,
                      padding: '8px 12px',
                      fontSize: 12,
                      color: '#d46b08',
                      marginBottom: 16,
                    }}>
                      ⚡ 필드 이벤트 설정: 포커스 아웃 시 DB 중복 체크, 값 변경 시 연동 필드 자동 설정 등<br />
                      API 호출 시 현재 필드값이 쿼리 파라미터로 함께 전달됩니다.
                    </div>

                    <Collapse ghost>
                      <Collapse.Panel header="포커스 아웃 (onBlur)" key="onBlur">
                        <Row gutter={12}>
                          <Col span={8}>
                            <Form.Item
                              name={['extraConfig', 'events', 'onBlur', 'type']}
                              label="액션 유형"
                            >
                              <Select
                                allowClear
                                placeholder="없음"
                                options={[
                                  { value: 'API_CALL', label: 'API 호출 (GET)' },
                                  { value: 'SET_VALUE', label: '다른 필드 지우기' },
                                ]}
                              />
                            </Form.Item>
                          </Col>
                          <Col span={16}>
                            <Form.Item
                              name={['extraConfig', 'events', 'onBlur', 'endpoint']}
                              label="API 경로"
                              tooltip="예: /biz/USERS → GET /api/biz/USERS?user_id=입력값"
                            >
                              <Input placeholder="예: /biz/USERS" />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Row gutter={12}>
                          <Col span={12}>
                            <Form.Item
                              name={['extraConfig', 'events', 'onBlur', 'errorCondition']}
                              label="오류 조건"
                              tooltip="응답 data의 total 필드 기준: 'total > 0' 또는 'total == 0'"
                            >
                              <Input placeholder="예: total > 0" />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item
                              name={['extraConfig', 'events', 'onBlur', 'errorMessage']}
                              label="오류 메시지"
                            >
                              <Input placeholder="예: 이미 사용 중인 아이디입니다" />
                            </Form.Item>
                          </Col>
                        </Row>
                      </Collapse.Panel>

                      <Collapse.Panel header="값 변경 (onChange)" key="onChange">
                        <Row gutter={12}>
                          <Col span={8}>
                            <Form.Item
                              name={['extraConfig', 'events', 'onChange', 'type']}
                              label="액션 유형"
                            >
                              <Select
                                allowClear
                                placeholder="없음"
                                options={[
                                  { value: 'API_CALL', label: 'API 호출 (GET)' },
                                  { value: 'SET_VALUE', label: '다른 필드 지우기' },
                                ]}
                              />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item
                              name={['extraConfig', 'events', 'onChange', 'endpoint']}
                              label="API 경로"
                            >
                              <Input placeholder="예: /biz/DEPT" />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item
                              name={['extraConfig', 'events', 'onChange', 'targetField']}
                              label="결과 저장 필드"
                              tooltip="API 응답에서 같은 이름의 값을 해당 필드에 설정"
                            >
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
    </div>
  )
}

export default ScreenDesignPage
