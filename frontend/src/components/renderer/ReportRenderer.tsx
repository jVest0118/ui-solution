import React, { useMemo, useRef } from 'react'
import { Button, Space, Spin, Alert, Typography, Tag } from 'antd'
import { PrinterOutlined, FileExcelOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import api from '@/api/axios'
import type { ReportConfig, ReportColumn } from '@/types/schema'

const { Title, Text } = Typography

interface Props {
  layoutConfig: Record<string, unknown>
  screenNm?: string
}

function formatValue(value: unknown, format?: string): string {
  if (value === null || value === undefined || value === '') return ''
  const num = Number(value)
  switch (format) {
    case 'number':
      return isNaN(num) ? String(value) : num.toLocaleString('ko-KR')
    case 'currency':
      return isNaN(num) ? String(value) : '₩' + num.toLocaleString('ko-KR')
    case 'percent':
      return isNaN(num) ? String(value) : num.toFixed(1) + '%'
    case 'date':
      return String(value).slice(0, 10)
    default:
      return String(value)
  }
}

function isNumericFormat(format?: string) {
  return format === 'number' || format === 'currency' || format === 'percent'
}

interface GroupedRow {
  type: 'data' | 'groupHeader' | 'groupSubtotal' | 'grandTotal'
  data?: Record<string, unknown>
  groupValue?: unknown
  totals?: Record<string, number>
  label?: string
}

function buildRows(
  rawRows: Record<string, unknown>[],
  config: ReportConfig,
): GroupedRow[] {
  const { groupBy, columns, showTotal } = config
  const numCols = columns.filter(c => isNumericFormat(c.format))
  const hasSubtotal = columns.some(c => c.showSubtotal && isNumericFormat(c.format))

  if (!groupBy) {
    const rows: GroupedRow[] = rawRows.map(r => ({ type: 'data', data: r }))
    if (showTotal && numCols.length) {
      const totals: Record<string, number> = {}
      numCols.forEach(c => { totals[c.field] = rawRows.reduce((s, r) => s + (Number(r[c.field]) || 0), 0) })
      rows.push({ type: 'grandTotal', totals, label: '합계' })
    }
    return rows
  }

  // sort by groupBy field
  const sorted = [...rawRows].sort((a, b) => String(a[groupBy] ?? '').localeCompare(String(b[groupBy] ?? '')))

  const result: GroupedRow[] = []
  let currentGroup: unknown = Symbol('NONE')
  let groupTotals: Record<string, number> = {}
  let grandTotals: Record<string, number> = {}
  numCols.forEach(c => { grandTotals[c.field] = 0 })

  const flushGroup = () => {
    if (hasSubtotal && currentGroup !== Symbol('NONE')) {
      result.push({ type: 'groupSubtotal', totals: groupTotals, groupValue: currentGroup, label: `소계` })
    }
    groupTotals = {}
    numCols.forEach(c => { groupTotals[c.field] = 0 })
  }

  for (const row of sorted) {
    const gval = row[groupBy]
    if (gval !== currentGroup) {
      if (currentGroup !== Symbol('NONE')) flushGroup()
      currentGroup = gval
      numCols.forEach(c => { groupTotals[c.field] = 0 })
      result.push({ type: 'groupHeader', groupValue: gval })
    }
    result.push({ type: 'data', data: row })
    numCols.forEach(c => {
      const n = Number(row[c.field]) || 0
      groupTotals[c.field] = (groupTotals[c.field] ?? 0) + n
      grandTotals[c.field] = (grandTotals[c.field] ?? 0) + n
    })
  }
  if (sorted.length) flushGroup()

  if (showTotal && numCols.length) {
    result.push({ type: 'grandTotal', totals: grandTotals, label: '합계' })
  }

  return result
}

export const ReportRenderer: React.FC<Props> = ({ layoutConfig, screenNm }) => {
  const config = layoutConfig as unknown as ReportConfig
  const { apiEndpoint, columns = [], title, subtitle, orientation } = config
  const printRef = useRef<HTMLDivElement>(null)

  const { data: rawData, isLoading, error, refetch } = useQuery<Record<string, unknown>[]>({
    queryKey: ['reportData', apiEndpoint],
    queryFn: async () => {
      if (!apiEndpoint) return []
      const res = await api.get(apiEndpoint)
      const d = res.data?.data
      if (Array.isArray(d)) return d
      if (Array.isArray(d?.rows)) return d.rows
      return []
    },
    enabled: !!apiEndpoint,
    staleTime: 0,
  })

  const rows = useMemo(() => buildRows(rawData ?? [], config), [rawData, config])

  const handlePrint = () => {
    const printStyle = `
      <style>
        @page { size: A4 ${orientation === 'landscape' ? 'landscape' : 'portrait'}; margin: 15mm; }
        body { font-family: 'Malgun Gothic', sans-serif; font-size: 12px; }
        .no-print { display: none !important; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #999; padding: 5px 8px; }
        th { background: #f0f0f0; font-weight: bold; }
        .group-header { background: #e6f0ff; font-weight: bold; }
        .subtotal-row { background: #fffbe6; font-weight: bold; }
        .total-row { background: #f6ffed; font-weight: bold; }
      </style>
    `
    const content = printRef.current?.innerHTML ?? ''
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><title>${title ?? screenNm ?? '리포트'}</title>${printStyle}</head><body>${content}</body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 300)
  }

  const handleExcel = () => {
    const wsData: unknown[][] = []
    // header row
    wsData.push(columns.map(c => c.label))
    // data rows
    for (const row of rows) {
      if (row.type === 'groupHeader') {
        wsData.push([`[${row.groupValue ?? ''}]`])
      } else if (row.type === 'data' && row.data) {
        wsData.push(columns.map(c => {
          const v = row.data![c.field]
          return isNumericFormat(c.format) ? (Number(v) || 0) : String(v ?? '')
        }))
      } else if ((row.type === 'groupSubtotal' || row.type === 'grandTotal') && row.totals) {
        wsData.push(columns.map(c =>
          isNumericFormat(c.format) && c.showSubtotal ? (row.totals![c.field] ?? 0) : (row.type === 'grandTotal' ? '합계' : '소계')
        ))
      }
    }
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    // set column widths
    ws['!cols'] = columns.map(c => ({ wch: c.width ? Math.round(c.width / 7) : 15 }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, title ?? '리포트')
    XLSX.writeFile(wb, `${title ?? screenNm ?? 'report'}.xlsx`)
  }

  const thStyle: React.CSSProperties = {
    background: '#f5f5f5',
    border: '1px solid #d9d9d9',
    padding: '8px 12px',
    fontWeight: 600,
    fontSize: 13,
    whiteSpace: 'nowrap',
  }

  const tdBase: React.CSSProperties = {
    border: '1px solid #e8e8e8',
    padding: '7px 12px',
    fontSize: 13,
  }

  const renderCell = (col: ReportColumn, value: unknown) => ({
    ...tdBase,
    textAlign: col.align ?? (isNumericFormat(col.format) ? 'right' : 'left'),
    width: col.width,
  } as React.CSSProperties)

  if (!apiEndpoint) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <Alert type="info" message="API 엔드포인트가 설정되지 않았습니다. 리포트 디자이너에서 설정해주세요." />
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      {/* 헤더 버튼 (인쇄 시 숨김) */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          {title && <Title level={4} style={{ margin: 0 }}>{title}</Title>}
          {subtitle && <Text type="secondary">{subtitle}</Text>}
        </Space>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={isLoading}>새로고침</Button>
          <Button icon={<FileExcelOutlined />} onClick={handleExcel} disabled={isLoading || !rawData?.length}>Excel</Button>
          <Button type="primary" icon={<PrinterOutlined />} onClick={handlePrint} disabled={isLoading || !rawData?.length}>인쇄</Button>
        </Space>
      </div>

      {isLoading && <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />}
      {error && <Alert type="error" message="데이터 조회 중 오류가 발생했습니다." />}

      {/* 인쇄 영역 */}
      <div ref={printRef}>
        {(title || subtitle) && (
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            {title && <div style={{ fontSize: 20, fontWeight: 700 }}>{title}</div>}
            {subtitle && <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>{subtitle}</div>}
          </div>
        )}

        {!isLoading && rawData && (
          <>
            <div style={{ marginBottom: 8, color: '#888', fontSize: 12 }}>
              총 {rawData.length.toLocaleString()}건
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    {columns.map(col => (
                      <th key={col.id} style={{ ...thStyle, width: col.width, textAlign: col.align ?? 'left' }}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    if (row.type === 'groupHeader') {
                      return (
                        <tr key={`gh-${idx}`} style={{ background: '#e6f0ff' }}>
                          <td colSpan={columns.length} style={{ ...tdBase, fontWeight: 700, color: '#1677ff', paddingLeft: 16 }}>
                            {String(row.groupValue ?? '')}
                          </td>
                        </tr>
                      )
                    }
                    if (row.type === 'groupSubtotal') {
                      return (
                        <tr key={`gs-${idx}`} style={{ background: '#fffbe6' }}>
                          {columns.map((col, ci) => (
                            <td key={col.id} style={{ ...renderCell(col, null), fontWeight: 600 }}>
                              {ci === 0
                                ? '소계'
                                : col.showSubtotal && isNumericFormat(col.format)
                                  ? formatValue(row.totals?.[col.field], col.format)
                                  : ''}
                            </td>
                          ))}
                        </tr>
                      )
                    }
                    if (row.type === 'grandTotal') {
                      return (
                        <tr key="grand-total" style={{ background: '#f6ffed', fontWeight: 700 }}>
                          {columns.map((col, ci) => (
                            <td key={col.id} style={{ ...renderCell(col, null), fontWeight: 700 }}>
                              {ci === 0
                                ? '합계'
                                : isNumericFormat(col.format)
                                  ? formatValue(row.totals?.[col.field], col.format)
                                  : ''}
                            </td>
                          ))}
                        </tr>
                      )
                    }
                    // data row
                    return (
                      <tr key={`d-${idx}`} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                        {columns.map(col => (
                          <td key={col.id} style={renderCell(col, row.data?.[col.field])}>
                            {formatValue(row.data?.[col.field], col.format)}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                  {rows.length === 0 && !isLoading && (
                    <tr>
                      <td colSpan={columns.length} style={{ ...tdBase, textAlign: 'center', color: '#aaa', padding: 32 }}>
                        데이터가 없습니다
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* 행 수 표시 */}
      {rawData && rawData.length > 0 && (
        <div className="no-print" style={{ marginTop: 8, textAlign: 'right' }}>
          <Tag>{rawData.length.toLocaleString()}건</Tag>
        </div>
      )}
    </div>
  )
}
