import React, { useState, useCallback } from 'react'
import {
  Button, Input, InputNumber, Select, Switch, Space, Typography,
  Card, Divider, Form, Modal, Tag, Tooltip, Row, Col
} from 'antd'
import { ResizableModal } from '@/components/ui/ResizableModal'
import {
  PlusOutlined, DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined,
  EyeOutlined, SaveOutlined
} from '@ant-design/icons'
import { nanoid } from 'nanoid'
import { ReportRenderer } from '@/components/renderer/ReportRenderer'
import type { ReportConfig, ReportColumn } from '@/types/schema'

const { Title, Text } = Typography

const FORMAT_OPTIONS = [
  { value: 'text',     label: '텍스트' },
  { value: 'number',   label: '숫자 (,)' },
  { value: 'currency', label: '통화 (₩)' },
  { value: 'percent',  label: '퍼센트 (%)' },
  { value: 'date',     label: '날짜' },
]

const ALIGN_OPTIONS = [
  { value: 'left',   label: '왼쪽' },
  { value: 'center', label: '가운데' },
  { value: 'right',  label: '오른쪽' },
]

interface Props {
  config: ReportConfig
  onSave: (config: ReportConfig) => void
  saving?: boolean
}

function emptyColumn(): ReportColumn {
  return { id: nanoid(8), field: '', label: '', format: 'text', align: 'left' }
}

export const ReportDesigner: React.FC<Props> = ({ config, onSave, saving }) => {
  const [title, setTitle] = useState(config.title ?? '')
  const [subtitle, setSubtitle] = useState(config.subtitle ?? '')
  const [apiEndpoint, setApiEndpoint] = useState(config.apiEndpoint ?? '')
  const [groupBy, setGroupBy] = useState(config.groupBy ?? '')
  const [showTotal, setShowTotal] = useState(config.showTotal ?? false)
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(config.orientation ?? 'portrait')
  const [columns, setColumns] = useState<ReportColumn[]>(
    config.columns?.length ? config.columns : [emptyColumn()]
  )
  const [previewOpen, setPreviewOpen] = useState(false)

  const addColumn = useCallback(() => {
    setColumns(prev => [...prev, emptyColumn()])
  }, [])

  const removeColumn = useCallback((idx: number) => {
    setColumns(prev => prev.filter((_, i) => i !== idx))
  }, [])

  const moveUp = useCallback((idx: number) => {
    if (idx === 0) return
    setColumns(prev => { const a = [...prev]; [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]]; return a })
  }, [])

  const moveDown = useCallback((idx: number) => {
    setColumns(prev => {
      if (idx >= prev.length - 1) return prev
      const a = [...prev]; [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]]; return a
    })
  }, [])

  const updateColumn = useCallback((idx: number, key: keyof ReportColumn, value: unknown) => {
    setColumns(prev => prev.map((c, i) => i === idx ? { ...c, [key]: value } : c))
  }, [])

  const buildConfig = (): ReportConfig => ({
    title: title || undefined,
    subtitle: subtitle || undefined,
    apiEndpoint: apiEndpoint || undefined,
    groupBy: groupBy || undefined,
    showTotal,
    orientation,
    columns: columns.filter(c => c.field && c.label),
  })

  const handleSave = () => onSave(buildConfig())

  const previewConfig = buildConfig()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 기본 설정 */}
      <Card
        size="small"
        title={<Text strong>리포트 기본 설정</Text>}
        extra={
          <Space>
            <Button icon={<EyeOutlined />} onClick={() => setPreviewOpen(true)}>미리보기</Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>저장</Button>
          </Space>
        }
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="제목" style={{ marginBottom: 8 }}>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="리포트 제목" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="부제목" style={{ marginBottom: 8 }}>
              <Input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="부제목 (선택)" />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item label="API 엔드포인트" style={{ marginBottom: 8 }} required>
              <Space.Compact style={{ width: '100%' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', padding: '0 11px',
                  background: '#fafafa', border: '1px solid #d9d9d9', borderRight: 'none',
                  borderRadius: '6px 0 0 6px', color: '#555', whiteSpace: 'nowrap', fontSize: 13,
                }}>GET</span>
                <Input
                  value={apiEndpoint}
                  onChange={e => setApiEndpoint(e.target.value)}
                  placeholder="/biz/{screenId} 또는 /admin/codes/{group}/options"
                  style={{ borderRadius: '0 6px 6px 0' }}
                />
              </Space.Compact>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="그룹 기준 필드" style={{ marginBottom: 8 }}>
              <Input value={groupBy} onChange={e => setGroupBy(e.target.value)} placeholder="필드명 (예: dept)" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="용지 방향" style={{ marginBottom: 8 }}>
              <Select
                value={orientation}
                onChange={v => setOrientation(v)}
                options={[{ value: 'portrait', label: '세로 (Portrait)' }, { value: 'landscape', label: '가로 (Landscape)' }]}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="합계 행 표시" style={{ marginBottom: 8 }}>
              <Switch checked={showTotal} onChange={setShowTotal} checkedChildren="표시" unCheckedChildren="숨김" />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      {/* 컬럼 설정 */}
      <Card
        size="small"
        title={
          <Space>
            <Text strong>컬럼 설정</Text>
            <Tag color="blue">{columns.length}개</Tag>
          </Space>
        }
        extra={
          <Button size="small" icon={<PlusOutlined />} onClick={addColumn}>컬럼 추가</Button>
        }
      >
        {/* 컬럼 헤더 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, paddingLeft: 40 }}>
          {[
            { label: '필드명', flex: 2 },
            { label: '레이블', flex: 2 },
            { label: '너비(px)', flex: 1 },
            { label: '정렬', flex: 1 },
            { label: '형식', flex: 1.5 },
            { label: '소계', flex: 1 },
          ].map(h => (
            <div key={h.label} style={{ flex: h.flex, fontSize: 11, color: '#888', fontWeight: 600 }}>{h.label}</div>
          ))}
          <div style={{ width: 32 }} />
        </div>

        {columns.map((col, idx) => (
          <div key={col.id} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            {/* 순서 이동 버튼 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
              <Tooltip title="위로">
                <Button size="small" icon={<ArrowUpOutlined />} disabled={idx === 0} onClick={() => moveUp(idx)} style={{ padding: '0 4px', height: 20 }} />
              </Tooltip>
              <Tooltip title="아래로">
                <Button size="small" icon={<ArrowDownOutlined />} disabled={idx === columns.length - 1} onClick={() => moveDown(idx)} style={{ padding: '0 4px', height: 20 }} />
              </Tooltip>
            </div>

            <div style={{ flex: 2 }}>
              <Input
                size="small"
                placeholder="fieldName"
                value={col.field}
                onChange={e => updateColumn(idx, 'field', e.target.value)}
              />
            </div>

            <div style={{ flex: 2 }}>
              <Input
                size="small"
                placeholder="레이블"
                value={col.label}
                onChange={e => updateColumn(idx, 'label', e.target.value)}
              />
            </div>

            <div style={{ flex: 1 }}>
              <InputNumber
                size="small"
                placeholder="auto"
                value={col.width}
                onChange={v => updateColumn(idx, 'width', v ?? undefined)}
                min={40}
                max={400}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ flex: 1 }}>
              <Select
                size="small"
                value={col.align ?? 'left'}
                onChange={v => updateColumn(idx, 'align', v)}
                options={ALIGN_OPTIONS}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ flex: 1.5 }}>
              <Select
                size="small"
                value={col.format ?? 'text'}
                onChange={v => updateColumn(idx, 'format', v)}
                options={FORMAT_OPTIONS}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <Switch
                size="small"
                checked={!!col.showSubtotal}
                onChange={v => updateColumn(idx, 'showSubtotal', v)}
                disabled={col.format === 'text' || col.format === 'date'}
              />
            </div>

            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => removeColumn(idx)}
              style={{ flexShrink: 0 }}
            />
          </div>
        ))}

        {columns.length === 0 && (
          <div style={{ textAlign: 'center', padding: 24, color: '#aaa' }}>
            컬럼을 추가해주세요
          </div>
        )}
      </Card>

      {/* 미리보기 모달 */}
      <ResizableModal
        title="리포트 미리보기"
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={null}
        width={900}
        style={{ top: 20 }}
        destroyOnHidden
      >
        <div style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          <ReportRenderer layoutConfig={previewConfig as unknown as Record<string, unknown>} />
        </div>
      </ResizableModal>
    </div>
  )
}
