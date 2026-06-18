import React, { useState, useEffect } from 'react'
import {
  Button, Modal, Form, Input, Select, InputNumber, Row, Col,
  Card, Space, Tooltip, Popconfirm, Badge, Typography, Alert, Divider, Tag, message,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  BarChartOutlined, LineChartOutlined, PieChartOutlined, AreaChartOutlined,
  NumberOutlined, TableOutlined, FileTextOutlined, ReloadOutlined,
} from '@ant-design/icons'
import type { DashboardWidget } from '@/components/renderer/DashboardRenderer'

const { Text } = Typography

// ─── 위젯 타입 메타 ──────────────────────────────────────────
const WIDGET_TYPES = [
  { value: 'stat',       label: '통계 카드',    icon: <NumberOutlined />,   color: '#1677ff' },
  { value: 'chart-bar',  label: '막대 그래프',  icon: <BarChartOutlined />,  color: '#52c41a' },
  { value: 'chart-line', label: '선 그래프',    icon: <LineChartOutlined />, color: '#faad14' },
  { value: 'chart-pie',  label: '원형 그래프',  icon: <PieChartOutlined />,  color: '#f5222d' },
  { value: 'chart-area', label: '영역 그래프',  icon: <AreaChartOutlined />, color: '#722ed1' },
  { value: 'table',      label: '데이터 테이블', icon: <TableOutlined />,    color: '#13c2c2' },
  { value: 'text',       label: '텍스트/공지',  icon: <FileTextOutlined />,  color: '#fa8c16' },
]

const typeMap = Object.fromEntries(WIDGET_TYPES.map(t => [t.value, t]))

// ─── 위젯 카드 (디자이너용) ───────────────────────────────────
const WidgetPreviewCard: React.FC<{
  widget: DashboardWidget
  cols: number
  rowHeight: number
  onEdit: () => void
  onDelete: () => void
}> = ({ widget, rowHeight, onEdit, onDelete }) => {
  const meta = typeMap[widget.type]
  const cardH = widget.rowSpan * rowHeight + (widget.rowSpan - 1) * 8
  return (
    <div style={{
      height: cardH,
      background: '#fff',
      border: `2px solid ${meta?.color ?? '#1677ff'}30`,
      borderRadius: 8,
      padding: '10px 14px',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ color: meta?.color, fontSize: 16 }}>{meta?.icon}</span>
        <span style={{ fontWeight: 600, fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {widget.title || meta?.label}
        </span>
        <Space size={2}>
          <Tooltip title="편집">
            <Button size="small" type="text" icon={<EditOutlined />} onClick={onEdit} />
          </Tooltip>
          <Popconfirm title="위젯을 삭제하시겠습니까?" onConfirm={onDelete} okText="삭제" cancelText="취소">
            <Tooltip title="삭제">
              <Button size="small" type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      </div>
      <Tag color={meta?.color} style={{ alignSelf: 'flex-start', fontSize: 11, marginBottom: 4 }}>{meta?.label}</Tag>
      <div style={{ fontSize: 11, color: '#999', marginTop: 'auto' }}>
        {widget.config.apiEndpoint
          ? <span>API: {widget.config.apiEndpoint as string}</span>
          : <span style={{ color: '#bbb' }}>API 미설정</span>}
      </div>
      <div style={{ fontSize: 10, color: '#d9d9d9', marginTop: 2 }}>
        {widget.colSpan}×{widget.rowSpan} · [{widget.rowPos},{widget.colPos}]
      </div>
    </div>
  )
}

// ─── 위젯 설정 폼 (타입별 추가 필드) ────────────────────────
const WidgetConfigFields: React.FC<{ widgetType: string }> = ({ widgetType }) => {
  switch (widgetType) {
    case 'stat':
      return (
        <>
          <Form.Item name={['config', 'apiEndpoint']} label="API 엔드포인트" tooltip="GET 요청 — /biz/{screenId}?... 형태">
            <Input placeholder="예: /biz/USER_STATS" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name={['config', 'valueField']} label="값 필드명">
                <Input placeholder="예: total, count" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name={['config', 'prefix']} label="접두어">
                <Input placeholder="예: ₩" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name={['config', 'suffix']} label="접미어">
                <Input placeholder="예: 명, 건" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name={['config', 'color']} label="색상" initialValue="#1677ff">
            <Input type="color" style={{ width: 80, height: 32 }} />
          </Form.Item>
        </>
      )

    case 'chart-bar':
    case 'chart-line':
    case 'chart-area':
      return (
        <>
          <Form.Item name={['config', 'apiEndpoint']} label="API 엔드포인트" tooltip="rows 배열을 반환해야 합니다">
            <Input placeholder="예: /biz/MONTHLY_STATS" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name={['config', 'xField']} label="X축 필드명" tooltip="가로축 (카테고리)">
                <Input placeholder="예: month, date, name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={['config', 'yField']} label="Y축 필드명" tooltip="세로축 (값)">
                <Input placeholder="예: count, amount" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name={['config', 'yFields']} label="Y축 필드 목록 (복수 시리즈)" tooltip="쉼표로 구분 — 빈 값이면 Y축 필드명 단일 사용">
            <Select mode="tags" placeholder="count, amount, total..." tokenSeparators={[',']} />
          </Form.Item>
        </>
      )

    case 'chart-pie':
      return (
        <>
          <Form.Item name={['config', 'apiEndpoint']} label="API 엔드포인트">
            <Input placeholder="예: /biz/CATEGORY_STATS" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name={['config', 'xField']} label="이름 필드 (nameKey)">
                <Input placeholder="예: category, name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={['config', 'yField']} label="값 필드 (dataKey)">
                <Input placeholder="예: count, value" />
              </Form.Item>
            </Col>
          </Row>
        </>
      )

    case 'table':
      return (
        <>
          <Form.Item name={['config', 'apiEndpoint']} label="API 엔드포인트">
            <Input placeholder="예: /biz/RECENT_ORDERS" />
          </Form.Item>
          <Alert
            message="컬럼 미설정 시 API 응답의 첫 행 키를 자동으로 컬럼으로 사용합니다."
            type="info" showIcon style={{ fontSize: 11, marginBottom: 12 }}
          />
          <Form.Item name={['config', 'columnsJson']} label="컬럼 설정 (JSON, 선택)" tooltip='예: [{"key":"name","label":"이름"},{"key":"amount","label":"금액"}]'>
            <Input.TextArea rows={3} placeholder={'[{"key":"name","label":"이름"},{"key":"amount","label":"금액"}]'} style={{ fontFamily: 'monospace', fontSize: 11 }} />
          </Form.Item>
        </>
      )

    case 'text':
      return (
        <>
          <Form.Item name={['config', 'content']} label="내용 (HTML 가능)">
            <Input.TextArea rows={5} placeholder="<b>공지사항</b><br/>여기에 내용을 입력하세요." />
          </Form.Item>
        </>
      )

    default:
      return null
  }
}

// ─── 위젯 추가/편집 모달 ─────────────────────────────────────
const WidgetModal: React.FC<{
  open: boolean
  editing: DashboardWidget | null
  cols: number
  onClose: () => void
  onSave: (widget: DashboardWidget) => void
}> = ({ open, editing, cols, onClose, onSave }) => {
  const [form] = Form.useForm()
  const watchedType = Form.useWatch('type', form)

  useEffect(() => {
    if (!open) return
    if (editing) {
      const cfg = { ...editing.config }
      if (Array.isArray(cfg.columns)) {
        cfg.columnsJson = JSON.stringify(cfg.columns)
      }
      form.setFieldsValue({ ...editing, config: cfg })
    } else {
      form.resetFields()
      form.setFieldsValue({ type: 'stat', colSpan: 3, rowSpan: 1, colPos: 0, rowPos: 0 })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleOk = () => {
    return form.validateFields()
      .then(v => {
        const cfg = { ...(v.config ?? {}) }
        if (cfg.columnsJson) {
          try { cfg.columns = JSON.parse(cfg.columnsJson) } catch { /* ignore */ }
          delete cfg.columnsJson
        }
        if (Array.isArray(cfg.yFields) && cfg.yFields.length === 0) delete cfg.yFields

        const widget: DashboardWidget = {
          id: editing?.id ?? `w_${Date.now()}`,
          type: v.type,
          title: v.title,
          colPos: v.colPos ?? 0,
          rowPos: v.rowPos ?? 0,
          colSpan: v.colSpan ?? 4,
          rowSpan: v.rowSpan ?? 1,
          config: cfg,
        }
        onSave(widget)
        onClose()
        form.resetFields()
      })
      .catch(() => {
        message.warning('위젯 유형을 선택해주세요.')
      })
  }

  return (
    <Modal
      title={editing ? '위젯 편집' : '위젯 추가'}
      open={open}
      onOk={handleOk}
      onCancel={() => { onClose(); form.resetFields() }}
      okText="저장"
      width={560}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="type" label="위젯 유형" initialValue="stat" rules={[{ required: true }]}>
              <Select options={WIDGET_TYPES.map(t => ({
                value: t.value,
                label: (
                  <Space>
                    <span style={{ color: t.color }}>{t.icon}</span>
                    {t.label}
                  </Space>
                ),
              }))} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="title" label="위젯 제목">
              <Input placeholder="예: 총 사용자 수" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={8}>
          <Col span={6}>
            <Form.Item name="rowPos" label="행 위치" initialValue={0}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="colPos" label="열 위치" initialValue={0}>
              <InputNumber min={0} max={cols - 1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="rowSpan" label="행 병합" initialValue={1} tooltip="1~5행 병합">
              <InputNumber min={1} max={5} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="colSpan" label="열 병합" initialValue={3} tooltip={`1~${cols}열 병합`}>
              <InputNumber min={1} max={cols} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: '8px 0' }} />

        {watchedType && <WidgetConfigFields widgetType={watchedType} />}
      </Form>
    </Modal>
  )
}

// ─── 대시보드 디자이너 메인 ──────────────────────────────────
interface DashboardDesignerProps {
  widgets: DashboardWidget[]
  cols: number
  rowHeight: number
  onSave: (widgets: DashboardWidget[], cfg?: { cols: number; rowHeight: number }) => void
  saving?: boolean
}

export const DashboardDesigner: React.FC<DashboardDesignerProps> = ({
  widgets, cols, rowHeight, onSave, saving,
}) => {
  const [localWidgets, setLocalWidgets] = useState<DashboardWidget[]>(widgets)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<DashboardWidget | null>(null)
  const [localCols, setLocalCols] = useState(cols)
  const [localRowH, setLocalRowH] = useState(rowHeight)

  const maxRow = localWidgets.reduce((m, w) => Math.max(m, w.rowPos + w.rowSpan - 1), -1)
  const gridRowCount = maxRow + 2

  const handleSaveWidget = (w: DashboardWidget) => {
    setLocalWidgets(prev => {
      const idx = prev.findIndex(x => x.id === w.id)
      return idx >= 0 ? prev.map((x, i) => i === idx ? w : x) : [...prev, w]
    })
  }

  const handleDelete = (id: string) => {
    setLocalWidgets(prev => prev.filter(w => w.id !== id))
  }

  return (
    <div>
      {/* 툴바 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Space>
          <Text type="secondary" style={{ fontSize: 12 }}>컬럼 수</Text>
          <InputNumber
            min={1} max={24} value={localCols} size="small"
            onChange={v => setLocalCols(v ?? 12)}
            style={{ width: 64 }}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>행 높이(px)</Text>
          <InputNumber
            min={80} max={400} value={localRowH} step={20} size="small"
            onChange={v => setLocalRowH(v ?? 160)}
            style={{ width: 72 }}
          />
        </Space>
        <div style={{ flex: 1 }} />
        <Badge count={localWidgets.length} style={{ backgroundColor: '#1677ff' }} showZero>
          <span style={{ fontSize: 12, color: '#888', paddingRight: 4 }}>위젯</span>
        </Badge>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => { setLocalWidgets(widgets); setLocalCols(cols); setLocalRowH(rowHeight) }}
          size="small"
        >
          되돌리기
        </Button>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => { setEditing(null); setModalOpen(true) }}
        >
          위젯 추가
        </Button>
        <Button
          type="primary"
          loading={saving}
          onClick={() => onSave(localWidgets, { cols: localCols, rowHeight: localRowH })}
          style={{ background: '#52c41a', borderColor: '#52c41a' }}
        >
          저장
        </Button>
      </div>

      {/* 그리드 미리보기 */}
      {localWidgets.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 40 }}>
          <Text type="secondary">위젯이 없습니다. 위젯 추가 버튼으로 시작하세요.</Text>
        </Card>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${localCols}, 1fr)`,
            gap: 8,
            padding: 16,
            background: '#f7f8fa',
            borderRadius: 8,
            border: '1px dashed #d9d9d9',
            minHeight: 200,
          }}
        >
          {Array.from({ length: gridRowCount }, (_, rowIdx) =>
            Array.from({ length: localCols }, (_, colIdx) => {
              const widget = localWidgets.find(
                w => w.rowPos === rowIdx && w.colPos === colIdx
              )
              if (!widget) {
                // spanned by another widget?
                const spanned = localWidgets.some(
                  w => w.rowPos <= rowIdx && rowIdx < w.rowPos + w.rowSpan &&
                    w.colPos <= colIdx && colIdx < w.colPos + w.colSpan &&
                    !(w.rowPos === rowIdx && w.colPos === colIdx)
                )
                if (spanned) return null
                return (
                  <div
                    key={`empty-${rowIdx}-${colIdx}`}
                    style={{
                      minHeight: localRowH,
                      border: '1.5px dashed #d9d9d9',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#bfbfbf',
                      fontSize: 20,
                      cursor: 'pointer',
                      background: '#fafafa',
                    }}
                    onClick={() => {
                      setEditing(null)
                      setModalOpen(true)
                    }}
                    title="클릭하여 위젯 추가"
                  >+</div>
                )
              }
              return (
                <div
                  key={widget.id}
                  style={{
                    gridColumn: `span ${Math.min(widget.colSpan, localCols - colIdx)}`,
                    gridRow: `span ${widget.rowSpan}`,
                  }}
                >
                  <WidgetPreviewCard
                    widget={widget}
                    cols={localCols}
                    rowHeight={localRowH}
                    onEdit={() => { setEditing(widget); setModalOpen(true) }}
                    onDelete={() => handleDelete(widget.id)}
                  />
                </div>
              )
            }).filter(Boolean)
          )}
        </div>
      )}

      <WidgetModal
        open={modalOpen}
        editing={editing}
        cols={localCols}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        onSave={handleSaveWidget}
      />
    </div>
  )
}
