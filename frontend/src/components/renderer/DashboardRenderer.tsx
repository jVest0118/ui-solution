import React from 'react'
import { Card, Statistic, Table, Spin, Alert, Empty } from 'antd'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import api from '@/api/axios'

export interface DashboardWidget {
  id: string
  type: 'stat' | 'chart-bar' | 'chart-line' | 'chart-pie' | 'chart-area' | 'table' | 'text'
  title?: string
  colPos: number
  rowPos: number
  colSpan: number
  rowSpan: number
  config: Record<string, unknown>
}

const CHART_COLORS = ['#1677ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#fa8c16', '#eb2f96']

function useWidgetData(endpoint: string | undefined) {
  return useQuery({
    queryKey: ['widgetData', endpoint],
    queryFn: () => api.get(endpoint!).then(r => r.data.data),
    enabled: !!endpoint,
    staleTime: 30_000,
  })
}

function toRows(data: unknown): Record<string, unknown>[] {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (typeof data === 'object' && data !== null) {
    const d = data as Record<string, unknown>
    if (Array.isArray(d.rows)) return d.rows as Record<string, unknown>[]
    if (Array.isArray(d.content)) return d.content as Record<string, unknown>[]
  }
  return []
}

// ─── 통계 카드 ───────────────────────────────────────────────
const StatWidget: React.FC<{ widget: DashboardWidget }> = ({ widget }) => {
  const cfg = widget.config
  const { data, isLoading } = useWidgetData(cfg.apiEndpoint as string)
  const rows = toRows(data)
  const raw = rows[0]?.[cfg.valueField as string] ?? data?.[cfg.valueField as string]
  const value = Number(raw ?? 0)

  if (isLoading) return <Spin />
  return (
    <Statistic
      title={<span style={{ fontSize: 12, color: '#888' }}>{widget.title}</span>}
      value={value}
      suffix={cfg.suffix as string}
      prefix={cfg.prefix as string}
      valueStyle={{ color: (cfg.color as string) ?? '#1677ff', fontSize: 32, fontWeight: 700 }}
    />
  )
}

// ─── 막대 그래프 ─────────────────────────────────────────────
const BarChartWidget: React.FC<{ widget: DashboardWidget; h: number }> = ({ widget, h }) => {
  const cfg = widget.config
  const { data, isLoading } = useWidgetData(cfg.apiEndpoint as string)
  const chartData = toRows(data)
  if (isLoading) return <Spin />
  if (!chartData.length) return <Empty description="데이터 없음" image={Empty.PRESENTED_IMAGE_SIMPLE} />
  const yFields = cfg.yFields as string[] | undefined
  const yField = cfg.yField as string ?? 'value'
  const fields = yFields ?? [yField]
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={chartData} margin={{ top: 4, right: 12, bottom: 4, left: -8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey={cfg.xField as string ?? 'name'} tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        {fields.length > 1 && <Legend />}
        {fields.map((f, i) => (
          <Bar key={f} dataKey={f} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[3, 3, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── 선 그래프 ───────────────────────────────────────────────
const LineChartWidget: React.FC<{ widget: DashboardWidget; h: number }> = ({ widget, h }) => {
  const cfg = widget.config
  const { data, isLoading } = useWidgetData(cfg.apiEndpoint as string)
  const chartData = toRows(data)
  if (isLoading) return <Spin />
  if (!chartData.length) return <Empty description="데이터 없음" image={Empty.PRESENTED_IMAGE_SIMPLE} />
  const yFields = cfg.yFields as string[] | undefined
  const yField = cfg.yField as string ?? 'value'
  const fields = yFields ?? [yField]
  return (
    <ResponsiveContainer width="100%" height={h}>
      <LineChart data={chartData} margin={{ top: 4, right: 12, bottom: 4, left: -8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey={cfg.xField as string ?? 'name'} tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        {fields.length > 1 && <Legend />}
        {fields.map((f, i) => (
          <Line key={f} type="monotone" dataKey={f} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

// ─── 영역 그래프 ─────────────────────────────────────────────
const AreaChartWidget: React.FC<{ widget: DashboardWidget; h: number }> = ({ widget, h }) => {
  const cfg = widget.config
  const { data, isLoading } = useWidgetData(cfg.apiEndpoint as string)
  const chartData = toRows(data)
  if (isLoading) return <Spin />
  if (!chartData.length) return <Empty description="데이터 없음" image={Empty.PRESENTED_IMAGE_SIMPLE} />
  const yFields = cfg.yFields as string[] | undefined
  const yField = cfg.yField as string ?? 'value'
  const fields = yFields ?? [yField]
  return (
    <ResponsiveContainer width="100%" height={h}>
      <AreaChart data={chartData} margin={{ top: 4, right: 12, bottom: 4, left: -8 }}>
        <defs>
          {fields.map((f, i) => (
            <linearGradient key={f} id={`grad-${widget.id}-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.3} />
              <stop offset="95%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.05} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey={cfg.xField as string ?? 'name'} tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        {fields.length > 1 && <Legend />}
        {fields.map((f, i) => (
          <Area
            key={f} type="monotone" dataKey={f}
            stroke={CHART_COLORS[i % CHART_COLORS.length]}
            fill={`url(#grad-${widget.id}-${i})`}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── 원형 그래프 ─────────────────────────────────────────────
const PieChartWidget: React.FC<{ widget: DashboardWidget; h: number }> = ({ widget, h }) => {
  const cfg = widget.config
  const { data, isLoading } = useWidgetData(cfg.apiEndpoint as string)
  const chartData = toRows(data)
  if (isLoading) return <Spin />
  if (!chartData.length) return <Empty description="데이터 없음" image={Empty.PRESENTED_IMAGE_SIMPLE} />
  return (
    <ResponsiveContainer width="100%" height={h}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey={cfg.yField as string ?? 'value'}
          nameKey={cfg.xField as string ?? 'name'}
          cx="50%" cy="45%"
          outerRadius="65%"
          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ─── 데이터 테이블 ───────────────────────────────────────────
const TableWidget: React.FC<{ widget: DashboardWidget; h: number }> = ({ widget, h }) => {
  const cfg = widget.config
  const { data, isLoading } = useWidgetData(cfg.apiEndpoint as string)
  const rows = toRows(data)
  const cfgCols = cfg.columns as Array<{ key: string; label: string }> | undefined
  const columns = cfgCols?.map(c => ({ title: c.label, dataIndex: c.key, key: c.key, ellipsis: true }))
    ?? (rows[0]
      ? Object.keys(rows[0]).filter(k => !k.startsWith('_')).slice(0, 6).map(k => ({ title: k, dataIndex: k, key: k, ellipsis: true }))
      : [])
  return (
    <Table
      dataSource={rows}
      columns={columns}
      loading={isLoading}
      size="small"
      pagination={{ pageSize: 5, size: 'small', simple: true }}
      scroll={{ y: h - 90 }}
      rowKey={(r, i) => String(r._dataId ?? i)}
    />
  )
}

// ─── 텍스트/공지 ─────────────────────────────────────────────
const TextWidget: React.FC<{ widget: DashboardWidget }> = ({ widget }) => (
  <div
    style={{ fontSize: 13, lineHeight: 1.8, color: '#333', overflowY: 'auto', height: '100%' }}
    dangerouslySetInnerHTML={{ __html: (widget.config.content as string) ?? '' }}
  />
)

// ─── 위젯 카드 래퍼 ──────────────────────────────────────────
const WidgetCard: React.FC<{ widget: DashboardWidget; rowHeight: number }> = ({ widget, rowHeight }) => {
  const totalH = widget.rowSpan * rowHeight + (widget.rowSpan - 1) * 8
  const contentH = totalH - 52  // card header ~52px

  const body = (() => {
    switch (widget.type) {
      case 'stat':        return <StatWidget widget={widget} />
      case 'chart-bar':  return <BarChartWidget widget={widget} h={contentH} />
      case 'chart-line': return <LineChartWidget widget={widget} h={contentH} />
      case 'chart-pie':  return <PieChartWidget widget={widget} h={contentH} />
      case 'chart-area': return <AreaChartWidget widget={widget} h={contentH} />
      case 'table':      return <TableWidget widget={widget} h={totalH} />
      case 'text':       return <TextWidget widget={widget} />
      default:           return <Alert message="알 수 없는 위젯 유형" type="warning" />
    }
  })()

  return (
    <Card
      title={widget.type !== 'stat' ? widget.title : undefined}
      size="small"
      style={{ height: totalH, boxShadow: '0 1px 6px rgba(0,0,0,0.08)', overflow: 'hidden' }}
      styles={{ header: { fontSize: 13, fontWeight: 600, borderBottom: '1px solid #f0f0f0', minHeight: 40, padding: '0 16px' }, body: { padding: 16, height: widget.type === 'stat' ? undefined : contentH, overflow: 'hidden' } }}
    >
      {body}
    </Card>
  )
}

// ─── 메인 대시보드 렌더러 ─────────────────────────────────────
export const DashboardRenderer: React.FC<{
  layoutConfig: Record<string, unknown>
}> = ({ layoutConfig }) => {
  const cols = (layoutConfig.cols as number) ?? 12
  const rowHeight = (layoutConfig.rowHeight as number) ?? 160
  const widgets = (layoutConfig.widgets as DashboardWidget[]) ?? []

  if (!widgets.length) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <Empty description="위젯이 없습니다. 화면 정보 편집에서 위젯을 추가하세요." />
      </div>
    )
  }

  const maxRow = widgets.reduce((m, w) => Math.max(m, w.rowPos + w.rowSpan), 0)

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridAutoRows: `${rowHeight}px`,
        gap: 8,
        padding: 16,
      }}
    >
      {widgets.map(w => (
        <div
          key={w.id}
          style={{
            gridColumn: `${(w.colPos ?? 0) + 1} / span ${w.colSpan ?? 4}`,
            gridRow: `${(w.rowPos ?? 0) + 1} / span ${w.rowSpan ?? 1}`,
          }}
        >
          <WidgetCard widget={w} rowHeight={rowHeight} />
        </div>
      ))}
      {/* 빈 공간 확보 */}
      <div style={{ gridColumn: `1 / span ${cols}`, gridRow: `${maxRow + 1}` }} />
    </div>
  )
}
