import React, { useState, useCallback, useMemo } from 'react'
import {
  Input, Button, Select, Switch, InputNumber, Divider,
  message, Popconfirm, Tooltip, Modal, Space,
} from 'antd'
import {
  PlusOutlined, DeleteOutlined, SaveOutlined, EyeOutlined,
  TableOutlined, CloseOutlined, AppstoreAddOutlined,
  LayoutOutlined, SearchOutlined, LinkOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '@/api/axios'
import { QSpinner } from '@/components/QSpinner'

/* ── 타입 ──────────────────────────────────────────────────── */
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

interface PageItem {
  pageId: string
  pageNm: string
  description?: string
  layoutJson?: string
  updatedAt?: string
}

interface ScreenItem {
  screenId: string
  screenNm: string
  screenType: string
}

/* ── 유틸 ──────────────────────────────────────────────────── */
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

const emptyLayout = (): PageLayout => ({ totalCols: 12, rows: [] })

const parseLayout = (json?: string | null): PageLayout => {
  if (!json) return emptyLayout()
  try { return JSON.parse(json) } catch { return emptyLayout() }
}

const TYPE_COLOR: Record<string, string> = {
  grid: '#3b82f6', form: '#10b981', composite: '#8b5cf6',
  dashboard: '#f59e0b', report: '#ef4444', canvas: '#ec4899',
}

const PANEL_HEADER = (label: string, color = '#1a1535') => ({
  style: {
    background: color, color: '#fff',
    padding: '4px 10px', borderRadius: 4,
    fontSize: 12, fontWeight: 700 as const, letterSpacing: 0.5,
    marginBottom: 8,
  },
  children: label,
})

/* ═══════════════════════════════════════════════════════════ */
const PageComposerPage: React.FC = () => {
  const qc = useQueryClient()
  const navigate = useNavigate()

  /* ── 데이터 로드 ── */
  const { data: pages = [], isLoading: pagesLoading } = useQuery<PageItem[]>({
    queryKey: ['pageDefList'],
    queryFn: () => api.get('/page-def').then(r => r.data.data ?? []),
    staleTime: 10_000,
  })

  const { data: screenList = [] } = useQuery<ScreenItem[]>({
    queryKey: ['adminScreensForComposer'],
    queryFn: () => api.get('/schema/admin/screens').then(r => r.data.data ?? []),
    staleTime: 30_000,
  })

  /* ── 에디터 상태 ── */
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [pageNm, setPageNm]           = useState('')
  const [pageId, setPageId]           = useState('')
  const [description, setDescription] = useState('')
  const [layout, setLayout]           = useState<PageLayout>(emptyLayout())
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null)
  const [screenSearch, setScreenSearch]     = useState('')

  /* 오른쪽 패널 — 표 삽입 설정 */
  const [insertRows, setInsertRows] = useState(2)
  const [insertCols, setInsertCols] = useState(2)

  /* 미리보기 모달 */
  const [previewOpen, setPreviewOpen] = useState(false)

  /* ── 선택된 셀 / 행 ── */
  const selectedCell: PageCell | null = useMemo(() => {
    for (const row of layout.rows) {
      const c = row.cells.find(c => c.id === selectedCellId)
      if (c) return c
    }
    return null
  }, [layout, selectedCellId])

  const selectedRow: PageRow | null = useMemo(() => {
    if (!selectedCellId) return null
    return layout.rows.find(r => r.cells.some(c => c.id === selectedCellId)) ?? null
  }, [layout, selectedCellId])

  /* ── 페이지 불러오기 ── */
  const loadPage = useCallback((p: PageItem) => {
    setSelectedPageId(p.pageId)
    setPageId(p.pageId)
    setPageNm(p.pageNm)
    setDescription(p.description ?? '')
    setLayout(parseLayout(p.layoutJson))
    setSelectedCellId(null)
  }, [])

  /* ── 신규 페이지 ── */
  const newPage = useCallback(() => {
    setSelectedPageId(null)
    setPageId(`PAGE_${Date.now()}`)
    setPageNm('')
    setDescription('')
    setLayout(emptyLayout())
    setSelectedCellId(null)
  }, [])

  /* ── 레이아웃 조작 ── */
  const insertTable = useCallback((rows: number, cols: number) => {
    const cs = Math.floor(12 / cols)
    const newRows: PageRow[] = Array.from({ length: rows }, () => ({
      id: uid(),
      cells: Array.from({ length: cols }, () => ({
        id: uid(), colSpan: cs, height: 300, showTitle: false,
      })),
    }))
    setLayout(prev => ({ ...prev, rows: [...prev.rows, ...newRows] }))
    message.success(`${rows}행 × ${cols}열 표가 삽입되었습니다.`)
  }, [])

  const addRow = useCallback((cols = 1) => {
    const cs = Math.floor(12 / cols)
    setLayout(prev => ({
      ...prev,
      rows: [...prev.rows, {
        id: uid(),
        cells: Array.from({ length: cols }, () => ({
          id: uid(), colSpan: cs, height: 300, showTitle: false,
        })),
      }],
    }))
  }, [])

  const removeRow = useCallback((rowId: string) => {
    setLayout(prev => ({ ...prev, rows: prev.rows.filter(r => r.id !== rowId) }))
    setSelectedCellId(null)
  }, [])

  const addCellToRow = useCallback((rowId: string) => {
    setLayout(prev => ({
      ...prev,
      rows: prev.rows.map(r => r.id !== rowId ? r : {
        ...r,
        cells: [...r.cells, { id: uid(), colSpan: 3, height: 300, showTitle: false }],
      }),
    }))
  }, [])

  const removeCellFromRow = useCallback((rowId: string, cellId: string) => {
    setLayout(prev => ({
      ...prev,
      rows: prev.rows
        .map(r => r.id !== rowId ? r : { ...r, cells: r.cells.filter(c => c.id !== cellId) })
        .filter(r => r.cells.length > 0),
    }))
    setSelectedCellId(prev => prev === cellId ? null : prev)
  }, [])

  const placeScreen = useCallback((screenId: string, screenNm: string) => {
    if (!selectedCellId) {
      message.warning('먼저 캔버스에서 배치할 셀을 클릭하여 선택하세요.')
      return
    }
    setLayout(prev => ({
      ...prev,
      rows: prev.rows.map(r => ({
        ...r,
        cells: r.cells.map(c => c.id !== selectedCellId ? c : { ...c, screenId, screenNm }),
      })),
    }))
    message.success(`[${screenNm}] 화면이 배치되었습니다.`)
  }, [selectedCellId])

  const clearCell = useCallback((cellId: string) => {
    setLayout(prev => ({
      ...prev,
      rows: prev.rows.map(r => ({
        ...r,
        cells: r.cells.map(c => c.id !== cellId ? c : { ...c, screenId: undefined, screenNm: undefined }),
      })),
    }))
  }, [])

  const updateCellProp = useCallback(<K extends keyof PageCell>(
    cellId: string, prop: K, value: PageCell[K],
  ) => {
    setLayout(prev => ({
      ...prev,
      rows: prev.rows.map(r => ({
        ...r,
        cells: r.cells.map(c => c.id !== cellId ? c : { ...c, [prop]: value }),
      })),
    }))
  }, [])

  /* ── 저장 ── */
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!pageNm.trim()) throw new Error('페이지명을 입력하세요.')
      if (!pageId.trim()) throw new Error('페이지 ID를 입력하세요.')
      await api.post('/page-def', {
        pageId: pageId.trim(),
        pageNm: pageNm.trim(),
        description,
        layoutJson: JSON.stringify(layout),
      })
      return pageId.trim()
    },
    onSuccess: (id) => {
      setSelectedPageId(id)
      message.success('저장되었습니다.')
      qc.invalidateQueries({ queryKey: ['pageDefList'] })
    },
    onError: (e: Error) => message.error(e.message),
  })

  /* ── 삭제 ── */
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/page-def/${id}`),
    onSuccess: () => {
      message.success('삭제되었습니다.')
      newPage()
      qc.invalidateQueries({ queryKey: ['pageDefList'] })
    },
  })

  /* ── 필터된 화면 목록 ── */
  const filteredScreens = useMemo(() =>
    screenList.filter(s =>
      !screenSearch ||
      s.screenNm.toLowerCase().includes(screenSearch.toLowerCase()) ||
      s.screenId.toLowerCase().includes(screenSearch.toLowerCase()),
    ), [screenList, screenSearch])

  /* ── 렌더 ── */
  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden', background: '#f1f5f9' }}>

      {/* ════════════════════════════════════
          좌측 패널: 화면목록 + 저장된 페이지
          ════════════════════════════════════ */}
      <div style={{
        width: 220, flexShrink: 0, background: '#fff',
        borderRight: '1px solid #e2e8f0',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* 화면 목록 헤더 */}
        <div style={{ padding: '10px 10px 6px', borderBottom: '1px solid #f1f5f9' }}>
          <div {...PANEL_HEADER('화면목록')} />
          <Input
            size="small"
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            placeholder="화면 검색..."
            value={screenSearch}
            onChange={e => setScreenSearch(e.target.value)}
            allowClear
          />
        </div>

        {/* 화면 목록 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 8px' }}>
          <div style={{ fontSize: 10, color: '#94a3b8', padding: '6px 4px 4px', letterSpacing: 0.4 }}>
            더블클릭 → 선택된 셀에 배치
          </div>
          {filteredScreens.map(s => (
            <div
              key={s.screenId}
              title={`더블클릭: 선택된 셀에 배치\nID: ${s.screenId}\n유형: ${s.screenType}`}
              onDoubleClick={() => placeScreen(s.screenId, s.screenNm)}
              style={{
                padding: '7px 10px', marginBottom: 3, borderRadius: 6,
                background: TYPE_COLOR[s.screenType] ?? '#6366f1',
                color: '#fff', cursor: 'pointer',
                fontSize: 12, fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 5,
                userSelect: 'none',
              }}
            >
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.screenNm}
              </span>
              <span style={{
                fontSize: 9, background: 'rgba(0,0,0,0.2)',
                padding: '1px 5px', borderRadius: 3, flexShrink: 0,
              }}>{s.screenType}</span>
            </div>
          ))}
          {filteredScreens.length === 0 && (
            <div style={{ color: '#94a3b8', fontSize: 11, textAlign: 'center', marginTop: 20 }}>
              {screenSearch ? '검색 결과 없음' : '화면이 없습니다'}
            </div>
          )}
        </div>

        {/* 저장된 페이지 목록 */}
        <div style={{ borderTop: '1px solid #e2e8f0', padding: '8px 8px 8px' }}>
          <div style={{ fontSize: 10, color: '#64748b', padding: '0 4px 5px', fontWeight: 700, letterSpacing: 0.4 }}>
            저장된 페이지
          </div>
          <Button
            size="small" type="dashed" icon={<PlusOutlined />} block
            onClick={newPage} style={{ marginBottom: 4 }}
          >신규 페이지</Button>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {pagesLoading
              ? <QSpinner />
              : pages.map(p => (
                <div
                  key={p.pageId}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '4px 6px', borderRadius: 5, marginBottom: 2,
                    background: selectedPageId === p.pageId ? 'rgba(99,102,241,0.1)' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  <div
                    onClick={() => loadPage(p)}
                    style={{
                      flex: 1, cursor: 'pointer', fontSize: 12,
                      color: selectedPageId === p.pageId ? '#6366f1' : '#374151',
                      fontWeight: selectedPageId === p.pageId ? 600 : 400,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                  >
                    <LayoutOutlined style={{ marginRight: 4, fontSize: 11 }} />
                    {p.pageNm}
                  </div>
                  <Tooltip title="페이지 열기">
                    <Button
                      type="text" size="small"
                      icon={<LinkOutlined style={{ fontSize: 11 }} />}
                      style={{ flexShrink: 0, padding: '0 4px', height: 20, color: '#6366f1' }}
                      onClick={e => { e.stopPropagation(); navigate(`/page-view/${p.pageId}`) }}
                    />
                  </Tooltip>
                </div>
              ))
            }
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════
          중앙 패널: 화면 구성 캔버스
          ════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* 상단 툴바 */}
        <div style={{
          padding: '8px 14px', background: '#fff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        }}>
          <div {...PANEL_HEADER('화면 구성')} />
          <Input
            size="small"
            value={pageId}
            onChange={e => setPageId(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
            placeholder="PAGE_ID"
            style={{ width: 130 }}
            disabled={!!selectedPageId}
            addonBefore="ID"
          />
          <Input
            size="small"
            value={pageNm}
            onChange={e => setPageNm(e.target.value)}
            placeholder="페이지명 입력..."
            style={{ width: 200 }}
          />
          <Input
            size="small"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="설명 (선택)"
            style={{ flex: 1, minWidth: 80, maxWidth: 300 }}
          />
          <Button
            type="primary" icon={<SaveOutlined />} size="small"
            loading={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >저장</Button>
          {selectedPageId && (
            <>
              <Button
                icon={<EyeOutlined />} size="small"
                onClick={() => setPreviewOpen(true)}
              >미리보기</Button>
              <Button
                icon={<LinkOutlined />} size="small" type="dashed"
                onClick={() => navigate(`/page-view/${selectedPageId}`)}
              >페이지 열기</Button>
              <Popconfirm
                title="이 페이지를 삭제하시겠습니까?"
                onConfirm={() => deleteMutation.mutate(selectedPageId)}
              >
                <Button danger icon={<DeleteOutlined />} size="small" />
              </Popconfirm>
            </>
          )}
        </div>

        {/* 캔버스 영역 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {layout.rows.length === 0 ? (
            /* 빈 상태 */
            <div style={{
              minHeight: 320,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              border: '2px dashed #cbd5e1', borderRadius: 10,
              background: '#fafafa', gap: 10, color: '#94a3b8',
            }}>
              <TableOutlined style={{ fontSize: 44, color: '#cbd5e1' }} />
              <div style={{ fontSize: 15, fontWeight: 600 }}>아이템 더블클릭 우측으로 이동</div>
              <div style={{ fontSize: 12 }}>또는 우측 패널에서 표를 삽입하여 시작하세요</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <Button icon={<TableOutlined />} onClick={() => insertTable(1, 2)}>1행 2열 삽입</Button>
                <Button icon={<TableOutlined />} onClick={() => insertTable(2, 2)}>2행 2열 삽입</Button>
              </div>
            </div>
          ) : (
            <div style={{
              background: '#fff', borderRadius: 8,
              border: '1px solid #e2e8f0', overflow: 'hidden',
            }}>
              {layout.rows.map((row, rowIdx) => (
                <div
                  key={row.id}
                  style={{
                    display: 'flex',
                    borderBottom: rowIdx < layout.rows.length - 1 ? '1px solid #e2e8f0' : 'none',
                    position: 'relative',
                  }}
                >
                  {/* 행 제어 버튼 (행 왼쪽) */}
                  <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0,
                    width: 24, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    gap: 2, zIndex: 3, background: '#f8fafc',
                    borderRight: '1px solid #f1f5f9',
                  }}>
                    <Tooltip title="행 삭제" placement="right">
                      <Button
                        size="small" type="text" danger icon={<DeleteOutlined />}
                        style={{ padding: 0, height: 18, width: 20, fontSize: 10 }}
                        onClick={() => removeRow(row.id)}
                      />
                    </Tooltip>
                    <Tooltip title="셀 추가" placement="right">
                      <Button
                        size="small" type="text" icon={<PlusOutlined />}
                        style={{ padding: 0, height: 18, width: 20, fontSize: 10, color: '#6366f1' }}
                        onClick={() => addCellToRow(row.id)}
                      />
                    </Tooltip>
                  </div>

                  {/* 셀 컨테이너 */}
                  <div style={{ display: 'flex', flex: 1, marginLeft: 24 }}>
                    {row.cells.map((cell, cellIdx) => {
                      const isSelected = selectedCellId === cell.id
                      const widthPct = `${(cell.colSpan / layout.totalCols) * 100}%`
                      const screenInfo = screenList.find(s => s.screenId === cell.screenId)

                      return (
                        <div
                          key={cell.id}
                          onClick={() => setSelectedCellId(cell.id)}
                          style={{
                            width: widthPct, flexShrink: 0,
                            height: cell.height ?? 280,
                            borderLeft: cellIdx > 0 ? '1px solid #e2e8f0' : 'none',
                            outline: isSelected ? '2px solid #6366f1' : 'none',
                            outlineOffset: -2,
                            boxSizing: 'border-box',
                            background: isSelected ? 'rgba(99,102,241,0.03)' : '#fff',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'outline-color 0.15s, background 0.15s',
                            overflow: 'hidden',
                          }}
                        >
                          {/* 셀 우상단 버튼 */}
                          <div style={{
                            position: 'absolute', top: 4, right: 4,
                            display: 'flex', gap: 2, zIndex: 4,
                            opacity: isSelected ? 1 : 0,
                            transition: 'opacity 0.15s',
                          }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                            onMouseLeave={e => { if (!isSelected) e.currentTarget.style.opacity = '0' }}
                          >
                            {cell.screenId && (
                              <Tooltip title="화면 제거">
                                <Button
                                  size="small" type="text" danger icon={<CloseOutlined />}
                                  style={{ padding: 0, height: 20, width: 20, fontSize: 11 }}
                                  onClick={e => { e.stopPropagation(); clearCell(cell.id) }}
                                />
                              </Tooltip>
                            )}
                            <Tooltip title="셀 삭제">
                              <Popconfirm
                                title="이 셀을 삭제하시겠습니까?"
                                onConfirm={() => removeCellFromRow(row.id, cell.id)}
                              >
                                <Button
                                  size="small" type="text" danger icon={<DeleteOutlined />}
                                  style={{ padding: 0, height: 20, width: 20, fontSize: 11 }}
                                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                />
                              </Popconfirm>
                            </Tooltip>
                          </div>

                          {/* 셀 내용 */}
                          {cell.screenId ? (
                            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                              {cell.showTitle !== false && (
                                <div style={{
                                  padding: '5px 10px',
                                  background: `${TYPE_COLOR[screenInfo?.screenType ?? ''] ?? '#6366f1'}15`,
                                  borderBottom: `2px solid ${TYPE_COLOR[screenInfo?.screenType ?? ''] ?? '#6366f1'}50`,
                                  fontSize: 12, fontWeight: 600, color: '#1e293b',
                                  display: 'flex', alignItems: 'center', gap: 6,
                                  flexShrink: 0,
                                }}>
                                  <span style={{
                                    width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                                    background: TYPE_COLOR[screenInfo?.screenType ?? ''] ?? '#6366f1',
                                  }} />
                                  {cell.screenNm}
                                  <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 'auto' }}>
                                    {cell.screenId}
                                  </span>
                                </div>
                              )}
                              <div style={{
                                flex: 1, display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center',
                                gap: 6, color: '#94a3b8',
                              }}>
                                <AppstoreAddOutlined style={{
                                  fontSize: 32,
                                  color: `${TYPE_COLOR[screenInfo?.screenType ?? ''] ?? '#6366f1'}60`,
                                }} />
                                <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
                                  {cell.screenNm}
                                </span>
                                <span style={{
                                  fontSize: 10, color: '#94a3b8',
                                  background: '#f1f5f9', padding: '2px 8px', borderRadius: 4,
                                }}>
                                  {screenInfo?.screenType ?? ''} · {cell.screenId}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div style={{
                              height: '100%', display: 'flex', flexDirection: 'column',
                              alignItems: 'center', justifyContent: 'center',
                              gap: 4, color: '#d1d5db',
                            }}>
                              <TableOutlined style={{ fontSize: 22 }} />
                              <span style={{ fontSize: 11 }}>셀 클릭 후</span>
                              <span style={{ fontSize: 11 }}>화면 더블클릭</span>
                            </div>
                          )}

                          {/* 선택 표시 */}
                          {isSelected && (
                            <div style={{
                              position: 'absolute', top: 3, left: 3,
                              background: '#6366f1', color: '#fff',
                              fontSize: 9, padding: '1px 5px', borderRadius: 3,
                              lineHeight: '16px',
                            }}>선택</div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}

              {/* 행 추가 버튼 */}
              <div
                onClick={() => addRow(2)}
                style={{
                  padding: '8px', textAlign: 'center', cursor: 'pointer',
                  color: '#94a3b8', fontSize: 12,
                  borderTop: '1px dashed #e2e8f0',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <PlusOutlined style={{ marginRight: 4 }} />행 추가
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════
          우측 패널: 삽입 + 속성
          ════════════════════════════════════ */}
      <div style={{
        width: 240, flexShrink: 0, background: '#fff',
        borderLeft: '1px solid #e2e8f0',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}>
        {/* 삽입 섹션 */}
        <div style={{ padding: 12 }}>
          <div {...PANEL_HEADER('삽입', '#f59e0b')} />

          {/* 표 삽입 카드 */}
          <div style={{
            border: '1px solid #e2e8f0', borderRadius: 8,
            padding: 10, marginBottom: 10,
            background: '#fafafa',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10,
              paddingBottom: 8, borderBottom: '1px solid #f1f5f9',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 6,
                background: '#f1f5f9', border: '1px solid #e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <TableOutlined style={{ fontSize: 20, color: '#475569' }} />
              </div>
              <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>
                화면구성을 위한 삽입
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: '#64748b', width: 22 }}>행</span>
              <InputNumber
                size="small" min={1} max={10}
                value={insertRows}
                onChange={v => setInsertRows(v ?? 1)}
                style={{ width: 58 }}
              />
              <span style={{ fontSize: 11, color: '#64748b', width: 22 }}>열</span>
              <InputNumber
                size="small" min={1} max={6}
                value={insertCols}
                onChange={v => setInsertCols(v ?? 1)}
                style={{ width: 58 }}
              />
            </div>
            <Button
              type="primary" size="small" block icon={<TableOutlined />}
              onClick={() => insertTable(insertRows, insertCols)}
            >표 삽입</Button>
          </div>

          <Button
            size="small" block icon={<PlusOutlined />}
            onClick={() => addRow(2)} style={{ marginBottom: 4 }}
          >행 추가 (2열)</Button>
          <Button
            size="small" block icon={<PlusOutlined />}
            onClick={() => addRow(1)} style={{ marginBottom: 4 }}
          >행 추가 (1열)</Button>
          <Button
            size="small" block icon={<PlusOutlined />}
            onClick={() => addRow(3)}
          >행 추가 (3열)</Button>
        </div>

        <Divider style={{ margin: 0 }} />

        {/* 속성 섹션 */}
        <div style={{ padding: 12, flex: 1 }}>
          <div {...PANEL_HEADER('속성', '#f59e0b')} />

          {selectedCell && selectedRow ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* 배치 화면 */}
              <div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>배치 화면</div>
                <Select
                  size="small" style={{ width: '100%' }}
                  value={selectedCell.screenId}
                  allowClear placeholder="화면 선택..."
                  showSearch optionFilterProp="label"
                  onChange={v => {
                    if (v) {
                      const s = screenList.find(x => x.screenId === v)
                      updateCellProp(selectedCell.id, 'screenId', v)
                      updateCellProp(selectedCell.id, 'screenNm', s?.screenNm ?? v)
                    } else {
                      clearCell(selectedCell.id)
                    }
                  }}
                  options={screenList.map(s => ({
                    value: s.screenId,
                    label: `${s.screenNm} (${s.screenId})`,
                  }))}
                />
              </div>

              {/* 너비 */}
              <div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                  셀 너비 (전체 {layout.totalCols}열 중)
                </div>
                <InputNumber
                  size="small" min={1} max={layout.totalCols}
                  value={selectedCell.colSpan}
                  onChange={v => v && updateCellProp(selectedCell.id, 'colSpan', v)}
                  style={{ width: '100%' }}
                  addonAfter={`/ ${layout.totalCols}`}
                />
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                  현재: {Math.round((selectedCell.colSpan / layout.totalCols) * 100)}% 너비
                </div>
              </div>

              {/* 높이 */}
              <div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>셀 높이</div>
                <InputNumber
                  size="small" min={100} max={1200} step={50}
                  value={selectedCell.height ?? 300}
                  onChange={v => v && updateCellProp(selectedCell.id, 'height', v)}
                  style={{ width: '100%' }}
                  addonAfter="px"
                />
              </div>

              {/* 제목 표시 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: '#64748b' }}>제목 표시</span>
                <Switch
                  size="small"
                  checked={selectedCell.showTitle === true}
                  onChange={v => updateCellProp(selectedCell.id, 'showTitle', v)}
                />
              </div>

              {/* 화면 제거 */}
              {selectedCell.screenId && (
                <Button
                  size="small" danger icon={<CloseOutlined />}
                  onClick={() => clearCell(selectedCell.id)}
                >화면 제거</Button>
              )}

              {/* 셀 삭제 */}
              <Popconfirm
                title="이 셀을 삭제하시겠습니까?"
                onConfirm={() => removeCellFromRow(selectedRow.id, selectedCell.id)}
              >
                <Button size="small" danger type="dashed" icon={<DeleteOutlined />}>
                  셀 삭제
                </Button>
              </Popconfirm>
            </div>
          ) : (
            <div style={{
              textAlign: 'center', color: '#94a3b8', fontSize: 12,
              marginTop: 20, lineHeight: '22px',
            }}>
              화면목록 선택 시<br />각 속성 값을 지정
            </div>
          )}
        </div>
      </div>

      {/* ── 미리보기 모달 ── */}
      <Modal
        title={`미리보기 — ${pageNm}`}
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={null}
        width="90vw"
        style={{ top: 20 }}
        styles={{ body: { maxHeight: '85vh', overflowY: 'auto', padding: 0 } }}
      >
        <PageLayoutPreview layout={layout} screenList={screenList} />
      </Modal>
    </div>
  )
}

/* ── 미리보기 컴포넌트 ──────────────────────────────────────── */
const PageLayoutPreview: React.FC<{
  layout: PageLayout
  screenList: ScreenItem[]
}> = ({ layout, screenList }) => {
  if (layout.rows.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
        배치된 화면이 없습니다.
      </div>
    )
  }

  return (
    <div style={{ padding: 16 }}>
      {layout.rows.map(row => (
        <div key={row.id} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          {row.cells.map(cell => {
            const screenInfo = screenList.find(s => s.screenId === cell.screenId)
            return (
              <div
                key={cell.id}
                style={{
                  flex: `0 0 calc(${(cell.colSpan / layout.totalCols) * 100}% - 4px)`,
                  minWidth: 0,
                  height: cell.height ?? 300,
                  border: '1px solid #e2e8f0',
                  borderRadius: 8, overflow: 'hidden',
                  background: cell.screenId ? '#fafafa' : '#f8fafc',
                }}
              >
                {cell.screenId ? (
                  <>
                    {cell.showTitle !== false && (
                      <div style={{
                        padding: '8px 14px',
                        background: `${TYPE_COLOR[screenInfo?.screenType ?? ''] ?? '#6366f1'}15`,
                        borderBottom: `2px solid ${TYPE_COLOR[screenInfo?.screenType ?? ''] ?? '#6366f1'}40`,
                        fontSize: 13, fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        <span style={{
                          width: 7, height: 7, borderRadius: '50%',
                          background: TYPE_COLOR[screenInfo?.screenType ?? ''] ?? '#6366f1',
                          flexShrink: 0,
                        }} />
                        {cell.screenNm ?? cell.screenId}
                        <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 'auto' }}>
                          {screenInfo?.screenType}
                        </span>
                      </div>
                    )}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      height: cell.showTitle !== false ? 'calc(100% - 37px)' : '100%',
                      color: '#94a3b8', fontSize: 12, flexDirection: 'column', gap: 6,
                    }}>
                      <AppstoreAddOutlined style={{ fontSize: 28, color: '#cbd5e1' }} />
                      <span>실제 구동 시 {cell.screenNm} 화면이 표시됩니다</span>
                    </div>
                  </>
                ) : (
                  <div style={{
                    height: '100%', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: '#d1d5db', fontSize: 12,
                  }}>
                    빈 셀
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

export default PageComposerPage
