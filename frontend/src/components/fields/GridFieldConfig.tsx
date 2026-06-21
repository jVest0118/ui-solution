import React, { useState, useEffect } from 'react'
import {
  Modal, Button, Table, Input, Select, InputNumber,
  Space, Popconfirm, Divider, Typography, Switch, Form, Row, Col
} from 'antd'
import { ResizableModal } from '@/components/ui/ResizableModal'
import { PlusOutlined, DeleteOutlined, HolderOutlined } from '@ant-design/icons'

const { Text } = Typography

export interface GridColumnDef {
  id: string
  label: string
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox'
  width?: number
  editable?: boolean
  required?: boolean
  groupId?: string
  codeGroup?: string
}

export interface GridGroupDef {
  id: string
  label: string
}

export interface GridConfig {
  columns: GridColumnDef[]
  groups?: GridGroupDef[]
  canAddRow?: boolean
  canDeleteRow?: boolean
  height?: number
}

interface Props {
  open: boolean
  config: GridConfig
  onSave: (config: GridConfig) => void
  onClose: () => void
}

const COL_TYPES = [
  { value: 'text', label: '텍스트' },
  { value: 'number', label: '숫자' },
  { value: 'date', label: '날짜' },
  { value: 'select', label: '선택(코드)' },
  { value: 'checkbox', label: '체크박스' },
]

export const GridFieldConfig: React.FC<Props> = ({ open, config, onSave, onClose }) => {
  const [columns, setColumns] = useState<GridColumnDef[]>(config.columns ?? [])
  const [groups, setGroups] = useState<GridGroupDef[]>(config.groups ?? [])
  const [canAddRow, setCanAddRow] = useState(config.canAddRow ?? true)
  const [canDeleteRow, setCanDeleteRow] = useState(config.canDeleteRow ?? true)
  const [height, setHeight] = useState(config.height ?? 300)

  useEffect(() => {
    if (open) {
      setColumns(config.columns ?? [])
      setGroups(config.groups ?? [])
      setCanAddRow(config.canAddRow ?? true)
      setCanDeleteRow(config.canDeleteRow ?? true)
      setHeight(config.height ?? 300)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const addColumn = () => {
    const id = `col_${Date.now()}`
    setColumns(prev => [...prev, { id, label: '새 컬럼', type: 'text', width: 120, editable: true }])
  }

  const updateColumn = (idx: number, patch: Partial<GridColumnDef>) => {
    setColumns(prev => prev.map((c, i) => i === idx ? { ...c, ...patch } : c))
  }

  const removeColumn = (idx: number) => {
    setColumns(prev => prev.filter((_, i) => i !== idx))
  }

  const addGroup = () => {
    const id = `grp_${Date.now()}`
    setGroups(prev => [...prev, { id, label: '그룹 헤더' }])
  }

  const updateGroup = (idx: number, patch: Partial<GridGroupDef>) => {
    setGroups(prev => prev.map((g, i) => i === idx ? { ...g, ...patch } : g))
  }

  const removeGroup = (idx: number) => {
    const groupId = groups[idx].id
    setGroups(prev => prev.filter((_, i) => i !== idx))
    setColumns(prev => prev.map(c => c.groupId === groupId ? { ...c, groupId: undefined } : c))
  }

  const handleSave = () => {
    onSave({ columns, groups: groups.length > 0 ? groups : undefined, canAddRow, canDeleteRow, height })
  }

  // id 기반 포커스 이동 (Input/InputNumber 모두 id가 inner <input>에 전달됨)
  const focusCell = (colKey: string, rowIdx: number) => {
    setTimeout(() => {
      const el = document.getElementById(`gc-${colKey}-${rowIdx}`) as HTMLInputElement | null
      el?.focus()
      el?.select()
    }, 30)
  }

  const handleEnter = (colKey: string, idx: number) => (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (idx < columns.length - 1) {
      focusCell(colKey, idx + 1)
    } else {
      const newId = `col_${Date.now()}`
      setColumns(prev => [...prev, { id: newId, label: '새 컬럼', type: 'text', width: 120, editable: true }])
      focusCell(colKey, idx + 1)
    }
  }

  const handleGroupEnter = (idx: number) => (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    setTimeout(() => {
      const el = document.getElementById(`gc-grp-${idx + 1}`) as HTMLInputElement | null
      el?.focus()
      el?.select()
    }, 30)
  }

  return (
    <ResizableModal
      title="그리드 컬럼 설정"
      open={open}
      onCancel={onClose}
      onOk={handleSave}
      okText="적용"
      width={860}
      destroyOnHidden
    >
      {/* 옵션 */}
      <Row gutter={24} style={{ marginBottom: 16 }}>
        <Col>
          <Space>
            <Text>행 추가 허용:</Text>
            <Switch checked={canAddRow} onChange={setCanAddRow} size="small" />
          </Space>
        </Col>
        <Col>
          <Space>
            <Text>행 삭제 허용:</Text>
            <Switch checked={canDeleteRow} onChange={setCanDeleteRow} size="small" />
          </Space>
        </Col>
        <Col>
          <Space>
            <Text>그리드 높이(px):</Text>
            <InputNumber value={height} onChange={v => setHeight(v ?? 300)} min={100} max={800} style={{ width: 90 }} />
          </Space>
        </Col>
      </Row>

      {/* 그룹 헤더 (병합) */}
      <Divider orientation="left" style={{ fontSize: 13 }}>
        컬럼 그룹 (헤더 병합)
        <Button size="small" icon={<PlusOutlined />} onClick={addGroup} style={{ marginLeft: 12 }}>그룹 추가</Button>
      </Divider>
      {groups.length === 0 ? (
        <Text type="secondary" style={{ fontSize: 12 }}>그룹 없음 – 그룹을 추가하면 컬럼을 묶어 병합된 헤더를 만들 수 있습니다</Text>
      ) : (
        <Table
          dataSource={groups}
          rowKey="id"
          size="small"
          pagination={false}
          style={{ marginBottom: 8 }}
          columns={[
            { title: 'ID', dataIndex: 'id', width: 140, render: (v) => <Text code style={{ fontSize: 11 }}>{v}</Text> },
            {
              title: '그룹 헤더명', dataIndex: 'label',
              render: (v, _, idx) => (
                <Input size="small" value={v}
                  id={`gc-grp-${idx}`}
                  onChange={e => updateGroup(idx, { label: e.target.value })}
                  onKeyDown={handleGroupEnter(idx)}
                />
              ),
            },
            {
              title: '', key: 'action', width: 50,
              render: (_, __, idx) => (
                <Popconfirm title="그룹을 삭제하시겠습니까?" onConfirm={() => removeGroup(idx)}>
                  <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              ),
            },
          ]}
        />
      )}

      {/* 컬럼 목록 */}
      <Divider orientation="left" style={{ fontSize: 13 }}>
        컬럼 목록
        <Button size="small" icon={<PlusOutlined />} onClick={addColumn} style={{ marginLeft: 12 }}>컬럼 추가</Button>
      </Divider>
      <Table
        dataSource={columns}
        rowKey="id"
        size="small"
        pagination={false}
        scroll={{ x: 780 }}
        columns={[
          {
            title: '⠿', key: 'drag', width: 30,
            render: () => <HolderOutlined style={{ color: '#c0c0c0', cursor: 'grab' }} />,
          },
          {
            title: '필드명', dataIndex: 'id', width: 130,
            render: (v, _, idx) => (
              <Input size="small" value={v}
                id={`gc-id-${idx}`}
                onChange={e => updateColumn(idx, { id: e.target.value.replace(/\s/g, '_').toLowerCase() })}
                placeholder="field_name"
                onKeyDown={handleEnter('id', idx)}
              />
            ),
          },
          {
            title: '헤더(레이블)', dataIndex: 'label', width: 130,
            render: (v, _, idx) => (
              <Input size="small" value={v}
                id={`gc-label-${idx}`}
                onChange={e => updateColumn(idx, { label: e.target.value })}
                onKeyDown={handleEnter('label', idx)}
              />
            ),
          },
          {
            title: '타입', dataIndex: 'type', width: 110,
            render: (v, _, idx) => (
              <Select size="small" value={v} options={COL_TYPES} style={{ width: '100%' }}
                onChange={val => updateColumn(idx, { type: val })} />
            ),
          },
          {
            title: '너비', dataIndex: 'width', width: 80,
            render: (v, _, idx) => (
              <InputNumber size="small" value={v} min={40} max={500} style={{ width: '100%' }}
                id={`gc-width-${idx}`}
                onChange={val => updateColumn(idx, { width: val ?? 100 })}
                onKeyDown={handleEnter('width', idx)}
              />
            ),
          },
          {
            title: '그룹', dataIndex: 'groupId', width: 120,
            render: (v, _, idx) => (
              <Select size="small" value={v} allowClear placeholder="없음" style={{ width: '100%' }}
                options={groups.map(g => ({ value: g.id, label: g.label }))}
                onChange={val => updateColumn(idx, { groupId: val })} />
            ),
          },
          {
            title: '수정', dataIndex: 'editable', width: 55,
            render: (v, _, idx) => (
              <Switch size="small" checked={!!v} onChange={val => updateColumn(idx, { editable: val })} />
            ),
          },
          {
            title: '필수', dataIndex: 'required', width: 55,
            render: (v, _, idx) => (
              <Switch size="small" checked={!!v} onChange={val => updateColumn(idx, { required: val })} />
            ),
          },
          {
            title: '', key: 'action', width: 44,
            render: (_, __, idx) => (
              <Popconfirm title="컬럼을 삭제하시겠습니까?" onConfirm={() => removeColumn(idx)}>
                <Button size="small" type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            ),
          },
        ]}
      />
    </ResizableModal>
  )
}
