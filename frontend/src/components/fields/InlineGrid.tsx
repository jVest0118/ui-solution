import React, { useRef, useCallback, useMemo } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, ColGroupDef, GridReadyEvent, CellValueChangedEvent, ICellRendererParams } from 'ag-grid-community'
import { Button, Space, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { GridConfig } from './GridFieldConfig'

const LOCALE_KO = { noRowsToShow: '정보가 존재하지 않습니다' }

interface Props {
  config: GridConfig
  value: Record<string, unknown>[]
  onChange: (rows: Record<string, unknown>[]) => void
  disabled?: boolean
}

export const InlineGrid: React.FC<Props> = ({ config, value, onChange, disabled }) => {
  // onChange를 ref로 유지해 memoized cellRenderer에서 최신 값 참조
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const valueRef = useRef(value)
  valueRef.current = value

  // 삭제 버튼 cellRenderer (React 컴포넌트)
  const DeleteCellRenderer = useMemo(() => {
    return (params: ICellRendererParams) => {
      const handleDelete = () => {
        const allRows: Record<string, unknown>[] = []
        params.api.forEachNode(node => { if (node.data !== params.data) allRows.push(node.data) })
        onChangeRef.current(allRows)
      }
      return (
        <button
          onClick={handleDelete}
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#ff4d4f', fontSize: 14, padding: '0 4px', lineHeight: 1 }}
        >
          ✕
        </button>
      )
    }
  }, [])

  const buildColDefs = useCallback((): (ColDef | ColGroupDef)[] => {
    const { columns = [], groups = [] } = config
    const groupMap = new Map(groups.map(g => [g.id, g]))

    const groupedCols = new Map<string, ColDef[]>()
    const ungroupedCols: ColDef[] = []

    const makeColDef = (col: typeof columns[number]): ColDef => ({
      field: col.id,
      headerName: col.label,
      width: col.width ?? 120,
      editable: !disabled && col.editable,
      cellStyle: { fontSize: 13 },
      ...(col.type === 'number' && { cellEditor: 'agNumberCellEditor', type: 'numericColumn' }),
      ...(col.type === 'date' && { cellEditor: 'agDateStringCellEditor' }),
      ...(col.type === 'checkbox' && {
        cellRenderer: 'agCheckboxCellRenderer',
        cellEditor: 'agCheckboxCellEditor',
      }),
      headerClass: col.required ? 'required-header' : undefined,
    })

    for (const col of columns) {
      const def = makeColDef(col)
      if (col.groupId) {
        if (!groupedCols.has(col.groupId)) groupedCols.set(col.groupId, [])
        groupedCols.get(col.groupId)!.push(def)
      } else {
        ungroupedCols.push(def)
      }
    }

    const result: (ColDef | ColGroupDef)[] = []

    if (!disabled && config.canDeleteRow) {
      result.push({
        headerName: '',
        field: '_action',
        width: 50,
        pinned: 'left' as const,
        editable: false,
        cellRenderer: DeleteCellRenderer,
        sortable: false,
        filter: false,
      })
    }

    for (const col of ungroupedCols) result.push(col)

    for (const [groupId, children] of groupedCols.entries()) {
      const group = groupMap.get(groupId)
      if (group) {
        result.push({ headerName: group.label, children, marryChildren: true })
      } else {
        result.push(...children)
      }
    }

    return result
  }, [config, disabled, DeleteCellRenderer])

  const handleCellValueChanged = useCallback((event: CellValueChangedEvent) => {
    const newRows: Record<string, unknown>[] = []
    event.api.forEachNode(node => newRows.push(node.data))
    onChangeRef.current(newRows)
  }, [])

  const handleAddRow = () => {
    const newRow: Record<string, unknown> = {}
    for (const col of config.columns ?? []) {
      newRow[col.id] = col.type === 'number' ? 0 : col.type === 'checkbox' ? false : ''
    }
    onChangeRef.current([...(valueRef.current ?? []), newRow])
  }

  const colDefs = buildColDefs()
  const rows = value ?? []

  return (
    <div>
      {!disabled && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          {config.canAddRow && (
            <Button size="small" icon={<PlusOutlined />} onClick={handleAddRow}>행 추가</Button>
          )}
          {rows.length > 0 && (
            <Tag color="blue" style={{ fontSize: 11 }}>{rows.length}행</Tag>
          )}
        </div>
      )}
      <style>{`
        .required-header::after { content: ' *'; color: #ff4d4f; }
        .ag-theme-alpine .ag-header-group-cell { background: #e6f4ff; border-bottom: 2px solid #4096ff; font-weight: 700; }
      `}</style>
      <div className="ag-theme-alpine" style={{ height: config.height ?? 300, width: '100%' }}>
        <AgGridReact
          theme="legacy"
          rowData={rows}
          columnDefs={colDefs}
          onGridReady={(e: GridReadyEvent) => { e.api.sizeColumnsToFit() }}
          onCellValueChanged={handleCellValueChanged}
          localeText={LOCALE_KO}
          stopEditingWhenCellsLoseFocus
          domLayout="normal"
          suppressRowClickSelection
          animateRows={false}
        />
      </div>
    </div>
  )
}
