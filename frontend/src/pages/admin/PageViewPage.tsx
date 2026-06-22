import React from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Alert } from 'antd'
import { AppstoreAddOutlined } from '@ant-design/icons'
import api from '@/api/axios'
import { QSpinner } from '@/components/QSpinner'
import { ScreenRenderer } from '@/components/renderer/ScreenRenderer'

interface PageCell {
  id: string
  colSpan: number
  screenId?: string
  screenNm?: string
  height?: number
  showTitle?: boolean
}

interface PageRow {
  id: string
  cells: PageCell[]
}

interface PageLayout {
  totalCols: number
  rows: PageRow[]
}

interface PageData {
  pageId: string
  pageNm: string
  description?: string
  layoutJson?: string
}

const PageViewPage: React.FC = () => {
  const { pageId } = useParams<{ pageId: string }>()

  const { data, isLoading, error } = useQuery<PageData>({
    queryKey: ['pageDefView', pageId],
    queryFn: () => api.get(`/page-def/${pageId}`).then(r => r.data.data),
    enabled: !!pageId,
    staleTime: 30_000,
  })

  if (isLoading) return <QSpinner />
  if (error || !data) {
    return (
      <div style={{ padding: 32 }}>
        <Alert type="error" message="페이지를 불러올 수 없습니다." showIcon />
      </div>
    )
  }

  let layout: PageLayout = { totalCols: 12, rows: [] }
  try {
    if (data.layoutJson) layout = JSON.parse(data.layoutJson)
  } catch {
    // ignore parse error
  }

  if (layout.rows.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
        <AppstoreAddOutlined style={{ fontSize: 40, marginBottom: 12 }} />
        <div>배치된 화면이 없습니다.</div>
      </div>
    )
  }

  const totalCols = layout.totalCols || 12

  return (
    <div style={{ padding: 16 }}>
      {/* 페이지 제목 — 설정한 경우에만 표시 */}
      {data.pageNm && (
        <div style={{
          marginBottom: 16, fontSize: 17, fontWeight: 700, color: '#1e293b',
          borderBottom: '1px solid #f1f5f9', paddingBottom: 10,
        }}>
          {data.pageNm}
          {data.description && (
            <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 400, marginLeft: 10 }}>
              {data.description}
            </span>
          )}
        </div>
      )}

      {layout.rows.map(row => (
        <div
          key={row.id}
          style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}
        >
          {row.cells.map(cell => (
            <div
              key={cell.id}
              style={{
                flex: cell.colSpan,
                minWidth: 0,
                minHeight: cell.height,
              }}
            >
              {/* 제목 — showTitle === true 일 때만 표시 */}
              {cell.showTitle === true && cell.screenId && (
                <div style={{
                  fontSize: 14, fontWeight: 600, color: '#1e293b',
                  marginBottom: 8, paddingBottom: 6,
                  borderBottom: '1px solid #e2e8f0',
                }}>
                  {cell.screenNm ?? cell.screenId}
                </div>
              )}

              {cell.screenId ? (
                <ScreenRenderer screenId={cell.screenId} />
              ) : null}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export default PageViewPage
