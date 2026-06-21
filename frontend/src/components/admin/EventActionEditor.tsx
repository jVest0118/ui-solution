import React, { useState } from 'react'
import {
  Button, Modal, Form, Input, Select, Space, Tag, Divider,
  Row, Col, Popconfirm, Alert, Typography,
} from 'antd'
import { ResizableModal } from '@/components/ui/ResizableModal'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ThunderboltOutlined,
  HolderOutlined,
} from '@ant-design/icons'
import type { EventBinding, EventType, ActionType, ActionDef } from '@/types/events'

const { Text } = Typography

// ─── 메타 정보 ───────────────────────────────────────────────
const EVENT_OPTIONS: { value: EventType; label: string; color: string }[] = [
  { value: 'onChange',    label: '값 변경 (onChange)',     color: '#1677ff' },
  { value: 'onBlur',      label: '포커스 아웃 (onBlur)',   color: '#722ed1' },
  { value: 'onLoad',      label: '화면 로드 (onLoad)',     color: '#52c41a' },
  { value: 'onSubmit',    label: '폼 제출 후 (onSubmit)',  color: '#fa8c16' },
  { value: 'onRowSelect', label: '행 선택 (onRowSelect)',  color: '#13c2c2' },
]

const ACTION_OPTIONS: { value: ActionType; label: string; desc: string }[] = [
  { value: 'showMessage',   label: '메시지 표시',      desc: '성공/오류/경고 메시지를 화면에 표시합니다' },
  { value: 'setFieldValue', label: '필드 값 설정',     desc: '다른 필드의 값을 지정된 값이나 표현식으로 설정합니다' },
  { value: 'clearField',    label: '필드 초기화',      desc: '하나 이상의 필드를 비웁니다' },
  { value: 'callApi',       label: 'API 호출',         desc: 'GET/POST API를 호출하고 결과를 필드에 반영합니다' },
  { value: 'navigate',      label: '화면 이동',        desc: '다른 화면으로 이동합니다' },
  { value: 'openPopup',     label: '팝업 열기',        desc: '다른 화면을 팝업으로 엽니다' },
  { value: 'refreshData',   label: '데이터 새로고침',  desc: '현재 화면의 데이터를 다시 불러옵니다' },
  { value: 'closePopup',    label: '팝업 닫기',        desc: '현재 팝업을 닫습니다' },
]

const eventMeta = Object.fromEntries(EVENT_OPTIONS.map(e => [e.value, e]))
const actionMeta = Object.fromEntries(ACTION_OPTIONS.map(a => [a.value, a]))

// ─── 액션별 파라미터 폼 ──────────────────────────────────────
const ActionParamsForm: React.FC<{
  actionType: ActionType
  namePrefix: number
  availableFields: { fieldNm: string; fieldLabel: string }[]
}> = ({ actionType, namePrefix, availableFields }) => {
  const fieldOptions = availableFields.map(f => ({
    value: f.fieldNm,
    label: `${f.fieldLabel} (${f.fieldNm})`,
  }))

  switch (actionType) {
    case 'showMessage':
      return (
        <Row gutter={12}>
          <Col span={8}>
            <Form.Item name={[namePrefix, 'params', 'messageType']} label="유형" initialValue="info">
              <Select options={[
                { value: 'success', label: '✅ 성공' },
                { value: 'error',   label: '❌ 오류' },
                { value: 'warning', label: '⚠️ 경고' },
                { value: 'info',    label: 'ℹ️ 안내' },
              ]} />
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item name={[namePrefix, 'params', 'content']} label="내용" rules={[{ required: true }]}>
              <Input placeholder="예: 저장되었습니다. ${user_nm}님" />
            </Form.Item>
          </Col>
        </Row>
      )

    case 'setFieldValue':
      return (
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name={[namePrefix, 'params', 'field']} label="대상 필드" rules={[{ required: true }]}>
              <Select showSearch options={fieldOptions} placeholder="필드 선택" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name={[namePrefix, 'params', 'valueExpr']} label="값 (표현식 가능)">
              <Input placeholder="예: ${dept_cd} 또는 고정값" />
            </Form.Item>
          </Col>
        </Row>
      )

    case 'clearField':
      return (
        <Form.Item name={[namePrefix, 'params', 'fields']} label="초기화할 필드" rules={[{ required: true }]}>
          <Select mode="multiple" showSearch options={fieldOptions} placeholder="필드 선택 (복수 가능)" />
        </Form.Item>
      )

    case 'callApi':
      return (
        <>
          <Row gutter={12}>
            <Col span={6}>
              <Form.Item name={[namePrefix, 'params', 'method']} label="메서드" initialValue="GET">
                <Select options={[{ value: 'GET' }, { value: 'POST' }]} />
              </Form.Item>
            </Col>
            <Col span={18}>
              <Form.Item name={[namePrefix, 'params', 'endpoint']} label="API 경로" rules={[{ required: true }]}>
                <Input placeholder="예: /biz/USER_CHECK  (${변수명} 표현식 사용 가능)" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name={[namePrefix, 'params', 'resultField']} label="결과 → 저장 필드" tooltip="API 응답 data 객체에서 이 키의 값을 해당 필드에 저장">
                <Select allowClear showSearch options={fieldOptions} placeholder="예: dept_nm" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={[namePrefix, 'params', 'errorCondition']} label="오류 조건" tooltip="API 응답을 보고 오류 판단. 예: total > 0">
                <Input placeholder="예: total > 0" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name={[namePrefix, 'params', 'errorMessage']} label="오류 메시지">
            <Input placeholder="예: 이미 사용 중인 아이디입니다" />
          </Form.Item>
        </>
      )

    case 'navigate':
      return (
        <Row gutter={12}>
          <Col span={16}>
            <Form.Item name={[namePrefix, 'params', 'screenId']} label="이동 화면 ID" rules={[{ required: true }]}>
              <Input placeholder="예: USER_LIST" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name={[namePrefix, 'params', 'openType']} label="열기 방식" initialValue="page">
              <Select options={[
                { value: 'page',  label: '페이지' },
                { value: 'tab',   label: '탭' },
                { value: 'popup', label: '팝업' },
              ]} />
            </Form.Item>
          </Col>
        </Row>
      )

    case 'openPopup':
      return (
        <Form.Item name={[namePrefix, 'params', 'screenId']} label="팝업 화면 ID" rules={[{ required: true }]}>
          <Input placeholder="예: USER_POPUP" />
        </Form.Item>
      )

    case 'refreshData':
    case 'closePopup':
    default:
      return <Text type="secondary" style={{ fontSize: 12 }}>추가 설정 없음</Text>
  }
}

// ─── 액션 아이템 (Form.List 내부) ────────────────────────────
const ActionItem: React.FC<{
  name: number
  remove: () => void
  availableFields: { fieldNm: string; fieldLabel: string }[]
  form: ReturnType<typeof Form.useForm>[0]
}> = ({ name, remove, availableFields, form }) => {
  const watchedType = Form.useWatch(['actions', name, 'type'], form) as ActionType | undefined

  return (
    <div style={{
      border: '1px solid #e8e8e8', borderRadius: 6,
      padding: '12px 12px 4px', marginBottom: 8,
      background: '#fafafa', position: 'relative',
    }}>
      <Button
        type="text" danger size="small" icon={<DeleteOutlined />}
        style={{ position: 'absolute', top: 8, right: 8 }}
        onClick={remove}
      />
      <Form.Item name={[name, 'id']} hidden initialValue={`a_${Date.now()}_${name}`}>
        <Input />
      </Form.Item>
      <Form.Item
        name={[name, 'type']} label="액션 유형"
        initialValue="showMessage" rules={[{ required: true }]}
        style={{ marginBottom: 8 }}
      >
        <Select
          style={{ width: 200 }}
          options={ACTION_OPTIONS.map(a => ({ value: a.value, label: a.label }))}
        />
      </Form.Item>
      {watchedType && (
        <ActionParamsForm
          actionType={watchedType}
          namePrefix={name}
          availableFields={availableFields}
        />
      )}
    </div>
  )
}

// ─── 메인 이벤트/액션 에디터 ─────────────────────────────────
export const EventActionEditor: React.FC<{
  value?: EventBinding[]
  onChange?: (v: EventBinding[]) => void
  availableFields?: { fieldNm: string; fieldLabel: string }[]
  scopedEvents?: EventType[]
}> = ({
  value = [],
  onChange,
  availableFields = [],
  scopedEvents,
}) => {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form] = Form.useForm()

  const eventOptions = (scopedEvents
    ? EVENT_OPTIONS.filter(e => scopedEvents.includes(e.value))
    : EVENT_OPTIONS
  ).map(e => ({ value: e.value, label: e.label }))

  const openAdd = () => {
    setEditingId(null)
    form.resetFields()
    form.setFieldsValue({ event: eventOptions[0]?.value ?? 'onChange', actions: [] })
    setModalOpen(true)
  }

  const openEdit = (binding: EventBinding) => {
    setEditingId(binding.id)
    form.setFieldsValue({ event: binding.event, label: binding.label, actions: binding.actions })
    setModalOpen(true)
  }

  const handleDelete = (id: string) => {
    onChange?.(value.filter(b => b.id !== id))
  }

  const handleSave = () => {
    return form.validateFields()
      .then(v => {
        const binding: EventBinding = {
          id: editingId ?? `eb_${Date.now()}`,
          event: v.event,
          label: v.label,
          actions: (v.actions ?? []).map((a: ActionDef, i: number) => ({
            ...a,
            id: a.id || `a_${Date.now()}_${i}`,
          })),
        }
        if (editingId) {
          onChange?.(value.map(b => b.id === editingId ? binding : b))
        } else {
          onChange?.([...value, binding])
        }
        setModalOpen(false)
      })
      .catch(() => {})
  }

  return (
    <div>
      <Alert
        message="이벤트가 발생하면 설정된 액션들을 순서대로 실행합니다. ${필드명} 표현식으로 폼 값을 참조할 수 있습니다."
        type="info" showIcon style={{ fontSize: 12, marginBottom: 12 }}
      />

      {value.length === 0 ? (
        <div style={{ color: '#bbb', fontSize: 12, marginBottom: 8, padding: '8px 0' }}>
          등록된 이벤트 바인딩이 없습니다.
        </div>
      ) : (
        <div style={{ marginBottom: 8 }}>
          {value.map(binding => {
            const meta = eventMeta[binding.event]
            return (
              <div
                key={binding.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  marginBottom: 6, padding: '8px 12px',
                  background: '#f9f9f9', borderRadius: 6, border: '1px solid #e8e8e8',
                }}
              >
                <HolderOutlined style={{ color: '#d9d9d9' }} />
                <Tag color={meta?.color} style={{ margin: 0, flexShrink: 0 }}>
                  <ThunderboltOutlined style={{ marginRight: 3 }} />
                  {meta?.label ?? binding.event}
                </Tag>
                {binding.label && (
                  <Text type="secondary" style={{ fontSize: 12, flexShrink: 0 }}>{binding.label}</Text>
                )}
                <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {binding.actions.map((a, i) => (
                    <Tag key={a.id || i} style={{ fontSize: 11, margin: 0 }}>
                      {i + 1}. {actionMeta[a.type]?.label ?? a.type}
                    </Tag>
                  ))}
                  {binding.actions.length === 0 && (
                    <Text type="secondary" style={{ fontSize: 11 }}>액션 없음</Text>
                  )}
                </div>
                <Space size={2} style={{ flexShrink: 0 }}>
                  <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(binding)} />
                  <Popconfirm
                    title="이 이벤트 바인딩을 삭제하시겠습니까?"
                    onConfirm={() => handleDelete(binding.id)}
                    okText="삭제" cancelText="취소"
                  >
                    <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              </div>
            )
          })}
        </div>
      )}

      <Button icon={<PlusOutlined />} size="small" onClick={openAdd}>
        이벤트 바인딩 추가
      </Button>

      <ResizableModal
        title={
          <Space>
            <ThunderboltOutlined style={{ color: '#fa8c16' }} />
            {editingId ? '이벤트 바인딩 편집' : '이벤트 바인딩 추가'}
          </Space>
        }
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText="저장"
        width={660}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="event" label="이벤트" initialValue={eventOptions[0]?.value} rules={[{ required: true }]}>
                <Select options={eventOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="label" label="설명 (선택)">
                <Input placeholder="예: 부서 변경 시 하위 코드 초기화" />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '4px 0 12px' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>액션 목록 (순서대로 실행)</Text>
          </Divider>

          <Form.List name="actions">
            {(fields, { add, remove }) => (
              <>
                {fields.length === 0 && (
                  <div style={{ color: '#bbb', fontSize: 12, textAlign: 'center', padding: '8px 0 12px' }}>
                    아래 버튼으로 액션을 추가하세요
                  </div>
                )}
                {fields.map(({ key, name }) => (
                  <ActionItem
                    key={key}
                    name={name}
                    remove={() => remove(name)}
                    availableFields={availableFields}
                    form={form}
                  />
                ))}
                <Button
                  type="dashed"
                  onClick={() => add({ id: `a_${Date.now()}`, type: 'showMessage', params: {} })}
                  icon={<PlusOutlined />}
                  block
                >
                  액션 추가
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </ResizableModal>
    </div>
  )
}
