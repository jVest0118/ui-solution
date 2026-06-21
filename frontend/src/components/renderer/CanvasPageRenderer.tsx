import React, { useState, useRef, useEffect } from 'react'
import { Button, message, Modal, Table, Input, Space, Tooltip, Popconfirm } from 'antd'
import { SearchOutlined, PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined, FileExcelOutlined } from '@ant-design/icons'
import * as XLSX from 'xlsx'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/axios'
import type { CanvasConfig, CanvasElement, SplitPart } from '@/types/schema'
import UserProfileCard from '@/components/canvas/UserProfileCard'
import { ScreenRenderer } from '@/components/renderer/ScreenRenderer'

declare global {
  interface Window {
    daum?: {
      Postcode: new (opts: {
        oncomplete: (data: { zonecode: string; roadAddress: string; jibunAddress: string }) => void
      }) => { open: () => void }
    }
  }
}

interface Props {
  config: CanvasConfig
  screenId: string
  onSuccess?: (data: unknown) => void
}

interface PopupState {
  screenId: string
  initialValues?: Record<string, unknown>
  title?: string
}

// ─── 주소 입력 ───────────────────────────────────────────────
const AddressField: React.FC<{
  el: CanvasElement; values: Record<string, string>
  set: (field: string, val: string) => void
}> = ({ el, values, set }) => {
  const p = el.props
  const fieldNmZip = (p.fieldNmZip as string) ?? 'zipCode'
  const fieldNmAddr = (p.fieldNmAddr as string) ?? 'address'
  const fieldNmAddrDetail = (p.fieldNmAddrDetail as string) ?? 'addressDetail'

  useEffect(() => {
    if (window.daum?.Postcode) return
    const s = document.createElement('script')
    s.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'
    s.async = true
    document.head.appendChild(s)
  }, [])

  const openPostcode = () => {
    if (!window.daum?.Postcode) { message.warning('주소 검색 서비스를 불러오는 중입니다.'); return }
    new window.daum.Postcode({
      oncomplete(data) {
        set(fieldNmZip, data.zonecode)
        set(fieldNmAddr, data.roadAddress || data.jibunAddress)
      },
    }).open()
  }

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', border: '1px solid #d0d0d0',
    borderRadius: 6, padding: '8px 12px', fontSize: 13, background: '#f5f5f5',
    color: '#555', cursor: 'not-allowed', outline: 'none', lineHeight: '22px', height: 32,
  }
  return (
    <div style={{ width: '100%' }}>
      {p.label && <label style={{ display: 'block', fontSize: 12, color: '#555', marginBottom: 4 }}>{p.label as string}</label>}
      <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
        <input readOnly value={values[fieldNmZip] ?? ''} placeholder="우편번호" style={{ ...inp, width: 100 }} />
        <button type="button" onClick={openPostcode} style={{ padding: '0 14px', background: '#1677ff', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
          {(p.searchBtnLabel as string) || '주소검색'}
        </button>
      </div>
      <input readOnly value={values[fieldNmAddr] ?? ''} placeholder="주소 (검색 후 자동 입력)" style={{ ...inp, marginBottom: 6 }} />
      <input type="text" value={values[fieldNmAddrDetail] ?? ''} onChange={e => set(fieldNmAddrDetail, e.target.value)}
        placeholder="상세 주소 입력" style={{ ...inp, background: '#fff', cursor: 'text', color: '#333' }}
        onFocus={e => { e.target.style.borderColor = '#1677ff' }} onBlur={e => { e.target.style.borderColor = '#d0d0d0' }} />
    </div>
  )
}

// ─── 핸드폰 번호 ─────────────────────────────────────────────
const PhoneField: React.FC<{
  el: CanvasElement; values: Record<string, string>
  set: (field: string, val: string) => void
}> = ({ el, values, set }) => {
  const p = el.props
  const prefix = (p.prefix as string) ?? '010'
  const fieldNm2 = (p.fieldNm2 as string) ?? 'phone2'
  const fieldNm3 = (p.fieldNm3 as string) ?? 'phone3'
  const ref3 = useRef<HTMLInputElement>(null)
  const inp: React.CSSProperties = { border: '1px solid #d0d0d0', borderRadius: 6, padding: '8px 0', fontSize: 14, outline: 'none', textAlign: 'center', boxSizing: 'border-box', transition: 'border-color 0.2s' }
  return (
    <div style={{ width: '100%' }}>
      {p.label && <label style={{ display: 'block', fontSize: 12, color: '#555', marginBottom: 4 }}>{p.label as string}</label>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input readOnly value={prefix} style={{ ...inp, width: 56, background: '#f5f5f5', color: '#555', cursor: 'not-allowed' }} />
        <span style={{ color: '#999', fontWeight: 600, fontSize: 16 }}>-</span>
        <input type="tel" maxLength={4} value={values[fieldNm2] ?? ''} placeholder="0000" style={{ ...inp, flex: 1 }}
          onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 4); set(fieldNm2, v); if (v.length === 4) ref3.current?.focus() }}
          onFocus={e => { e.target.style.borderColor = '#1677ff' }} onBlur={e => { e.target.style.borderColor = '#d0d0d0' }} />
        <span style={{ color: '#999', fontWeight: 600, fontSize: 16 }}>-</span>
        <input ref={ref3} type="tel" maxLength={4} value={values[fieldNm3] ?? ''} placeholder="0000" style={{ ...inp, flex: 1 }}
          onChange={e => { set(fieldNm3, e.target.value.replace(/\D/g, '').slice(0, 4)) }}
          onFocus={e => { e.target.style.borderColor = '#1677ff' }} onBlur={e => { e.target.style.borderColor = '#d0d0d0' }} />
      </div>
    </div>
  )
}

// ─── 날짜 입력 ───────────────────────────────────────────────
const DateField: React.FC<{
  el: CanvasElement; values: Record<string, string>
  set: (field: string, val: string) => void
}> = ({ el, values, set }) => {
  const p = el.props
  const fieldNm = (p.fieldNm as string) ?? 'date'
  const fmt = (p.format as string) ?? 'YYYY-MM-DD'
  const calRef = useRef<HTMLInputElement>(null)

  const applyFmt = (digits: string) => {
    const y = digits.slice(0, 4), m = digits.slice(4, 6), d = digits.slice(6, 8)
    if (fmt === 'YYYYMMDD') return `${y}${m}${d}`
    if (fmt === 'YYYY/MM/DD') return `${y}/${m}/${d}`
    return `${y}-${m}-${d}`
  }
  return (
    <div style={{ width: '100%' }}>
      {p.label && <label style={{ display: 'block', fontSize: 12, color: '#555', marginBottom: 4 }}>{p.label as string}</label>}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input type="text" value={values[fieldNm] ?? ''} placeholder={`${fmt} 또는 YYYYMMDD`}
          onChange={e => { const d = e.target.value.replace(/\D/g, ''); set(fieldNm, d.length >= 8 ? applyFmt(e.target.value) : e.target.value) }}
          style={{ flex: 1, boxSizing: 'border-box', border: '1px solid #d0d0d0', borderRadius: 6, padding: '8px 40px 8px 12px', fontSize: 14, outline: 'none', transition: 'border-color 0.2s' }}
          onFocus={e => { e.target.style.borderColor = '#1677ff' }} onBlur={e => { e.target.style.borderColor = '#d0d0d0' }} />
        <span onClick={() => calRef.current?.showPicker?.() ?? calRef.current?.click()} style={{ position: 'absolute', right: 10, cursor: 'pointer', color: '#1677ff', fontSize: 16 }}>📅</span>
        <input ref={calRef} type="date" style={{ position: 'absolute', right: 0, opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
          onChange={e => { if (!e.target.value) return; set(fieldNm, applyFmt(e.target.value.replace(/-/g, ''))) }} />
      </div>
    </div>
  )
}

// ─── 데이터 그리드 ────────────────────────────────────────────
const DataGrid: React.FC<{
  el: CanvasElement
  onOpenPopup: (state: PopupState) => void
}> = ({ el, onOpenPopup }) => {
  const p = el.props
  const apiEndpoint = (p.apiEndpoint as string) ?? ''
  const columns = (p.columns as { field: string; header: string; width?: number }[]) ?? []
  const toolbarButtons = (p.toolbarButtons as { label: string; buttonType: string; action: string; targetScreenId?: string }[]) ?? []
  const rowClickAction = (p.rowClickAction as string) ?? 'none'
  const rowClickTargetScreenId = (p.rowClickTargetScreenId as string) ?? ''
  const gridHeight = (p.gridHeight as number) ?? 300
  const pageSize = (p.pageSize as number) ?? 20
  const searchFields = (p.searchFields as string[]) ?? []
  const showRowEdit = !!(p.showRowEdit)
  const showRowDelete = !!(p.showRowDelete)
  const showExcelDownload = !!(p.showExcelDownload)

  const [searchValues, setSearchValues] = useState<Record<string, string>>({})
  const [page, setPage] = useState(1)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['canvasGrid', apiEndpoint, page, searchValues],
    queryFn: () => api.get(apiEndpoint, { params: { page, size: pageSize, ...searchValues } }).then(r => r.data.data),
    enabled: !!apiEndpoint,
    staleTime: 0,
  })

  const deleteMutation = useMutation({
    mutationFn: (dataId: unknown) => api.delete(`${apiEndpoint}/${dataId}`),
    onSuccess: () => {
      message.success('삭제되었습니다.')
      qc.invalidateQueries({ queryKey: ['canvasGrid', apiEndpoint] })
    },
    onError: () => message.error('삭제 중 오류가 발생했습니다.'),
  })

  const rows: Record<string, unknown>[] = data?.rows ?? data ?? []
  const total: number = data?.total ?? rows.length

  // 컬럼 헤더 맵 (검색 레이블용)
  const colHeaderMap = Object.fromEntries(columns.map(c => [c.field, c.header]))

  const openEditPopup = (row: Record<string, unknown>) => {
    if (rowClickTargetScreenId) {
      onOpenPopup({ screenId: rowClickTargetScreenId, initialValues: { ...row, _dataId: row._dataId ?? row.id }, title: '수정' })
    }
  }

  const antColumns: {
    title: string
    dataIndex?: string
    key: string
    width?: number
    ellipsis?: boolean
    fixed?: 'right'
    render: (v: unknown, row: Record<string, unknown>) => React.ReactNode
  }[] = columns.map(col => ({
    title: col.header,
    dataIndex: col.field,
    key: col.field,
    width: col.width,
    ellipsis: true,
    render: (v: unknown) => v != null ? String(v) : '',
  }))

  if (showRowEdit || showRowDelete) {
    antColumns.push({
      title: '작업',
      key: '_actions',
      width: (showRowEdit && showRowDelete) ? 80 : 50,
      fixed: 'right',
      render: (_: unknown, row: Record<string, unknown>) => (
        <Space size={4}>
          {showRowEdit && (
            <Tooltip title="수정">
              <Button size="small" icon={<EditOutlined />}
                onClick={e => { e.stopPropagation(); openEditPopup(row) }} />
            </Tooltip>
          )}
          {showRowDelete && (
            <Popconfirm title="삭제하시겠습니까?" okText="삭제" cancelText="취소"
              okButtonProps={{ danger: true }}
              onConfirm={() => deleteMutation.mutate(row._dataId ?? row.id)}>
              <Tooltip title="삭제">
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    })
  }

  const handleRowClick = (row: Record<string, unknown>) => {
    if (rowClickAction === 'open-popup' && rowClickTargetScreenId) {
      onOpenPopup({ screenId: rowClickTargetScreenId, initialValues: { ...row, _dataId: row._dataId ?? row.id }, title: '상세 / 수정' })
    }
  }

  if (!apiEndpoint) {
    return (
      <div style={{ width: '100%', height: '100%', border: '1px dashed #d0d0d0', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 13 }}>
        API 엔드포인트를 설정하세요
      </div>
    )
  }

  const hasSearch = searchFields.length > 0

  const handleExcelDownload = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      columns.map(c => c.header),
      ...rows.map(r => columns.map(c => String(r[c.field] ?? ''))),
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '데이터')
    XLSX.writeFile(wb, `data_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* 검색 바 + 툴바 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {searchFields.map(f => (
          <Input key={f} size="small"
            placeholder={colHeaderMap[f] ?? f}
            prefix={<SearchOutlined style={{ color: '#bbb' }} />}
            style={{ width: 150 }}
            value={searchValues[f] ?? ''} allowClear
            onChange={e => setSearchValues(prev => ({ ...prev, [f]: e.target.value }))}
            onPressEnter={() => { setPage(1); qc.invalidateQueries({ queryKey: ['canvasGrid', apiEndpoint] }) }}
          />
        ))}
        {hasSearch && (
          <Button size="small" type="primary" ghost icon={<SearchOutlined />}
            onClick={() => { setPage(1); qc.invalidateQueries({ queryKey: ['canvasGrid', apiEndpoint] }) }}>검색</Button>
        )}
        <div style={{ flex: 1 }} />
        {showExcelDownload && (
          <Button size="small" icon={<FileExcelOutlined />} onClick={handleExcelDownload}
            style={{ color: '#1d6f42', borderColor: '#1d6f42' }}>엑셀</Button>
        )}
        <Button size="small" icon={<ReloadOutlined />}
          onClick={() => qc.invalidateQueries({ queryKey: ['canvasGrid', apiEndpoint] })} />
        {toolbarButtons.map((btn, i) => (
          <Button key={i} size="small"
            type={(btn.buttonType === 'danger' ? 'default' : btn.buttonType) as 'primary' | 'default'}
            danger={btn.buttonType === 'danger'}
            icon={btn.action === 'open-popup' ? <PlusOutlined /> : undefined}
            onClick={() => {
              if (btn.action === 'open-popup' && btn.targetScreenId) {
                onOpenPopup({ screenId: btn.targetScreenId, title: btn.label })
              } else if (btn.action === 'refresh') {
                qc.invalidateQueries({ queryKey: ['canvasGrid', apiEndpoint] })
              }
            }}
          >
            {btn.label}
          </Button>
        ))}
      </div>

      {/* 테이블 */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Table
          size="small"
          dataSource={rows.map((r, i) => ({ ...r, _rowKey: String(r._dataId ?? r.id ?? i) }))}
          columns={antColumns}
          rowKey="_rowKey"
          loading={isLoading}
          scroll={{ y: gridHeight - (hasSearch ? 100 : 80), x: 'max-content' }}
          pagination={total > pageSize ? {
            current: page, total, pageSize, size: 'small',
            onChange: setPage, showTotal: t => `총 ${t}건`,
          } : false}
          onRow={row => ({
            onClick: () => handleRowClick(row as Record<string, unknown>),
            style: rowClickAction !== 'none' ? { cursor: 'pointer' } : undefined,
          })}
        />
      </div>
    </div>
  )
}

// ─── 메인 렌더러 ──────────────────────────────────────────────
const CanvasPageRenderer: React.FC<Props> = ({ config, screenId, onSuccess }) => {
  const [values, setValues] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [popup, setPopup] = useState<PopupState | null>(null)
  const qc = useQueryClient()

  const set = (fieldNm: string, val: string) =>
    setValues(prev => ({ ...prev, [fieldNm]: val }))

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {}
    config.elements.forEach(el => {
      if (el.type === 'text-input' && el.props.behavior === 'password') {
        const fieldNm = el.props.fieldNm as string
        if (fieldNm && (values[fieldNm] ?? '').length < 8) newErrors[fieldNm] = '비밀번호는 8자 이상이어야 합니다.'
      }
    })
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }
    setErrors({})
    setSubmitting(true)
    try {
      await api.post(`/biz/${screenId}`, values)
      message.success('저장되었습니다.')
      setValues({})
      onSuccess?.(values)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      message.error(err.response?.data?.message ?? '저장 중 오류가 발생했습니다.')
    } finally { setSubmitting(false) }
  }

  const renderElement = (el: CanvasElement) => {
    const p = el.props
    switch (el.type) {
      case 'heading':
        return (
          <div style={{ fontSize: p.fontSize ?? 22, fontWeight: p.fontWeight ?? 'bold', color: p.color ?? '#1a1a1a', textAlign: p.textAlign as React.CSSProperties['textAlign'] ?? 'left', textDecoration: p.underline ? 'underline' : undefined, fontStyle: p.italic ? 'italic' : undefined, lineHeight: 1.2 }}>
            {p.text as string}
          </div>
        )

      case 'paragraph':
        return (
          <div style={{ fontSize: p.fontSize ?? 13, color: p.color ?? '#555', textAlign: p.textAlign as React.CSSProperties['textAlign'] ?? 'left', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {p.text as string}
          </div>
        )

      case 'text-input': {
        const fieldNm = p.fieldNm as string
        const isPassword = p.behavior === 'password'
        const isName = p.behavior === 'name'
        const errMsg = errors[fieldNm]
        return (
          <div style={{ width: '100%' }}>
            {p.label && p.labelPosition !== 'none' && (
              <label style={{ display: 'block', fontSize: 12, color: '#555', marginBottom: 4 }}>
                {p.label as string}{p.required && <span style={{ color: '#ff4d4f', marginLeft: 2 }}>*</span>}
              </label>
            )}
            <input type={isPassword ? 'password' : 'text'} value={values[fieldNm] ?? ''}
              onChange={e => { let v = e.target.value; if (isName) v = v.replace(/\s/g, ''); set(fieldNm, v); if (errMsg) setErrors(prev => ({ ...prev, [fieldNm]: '' })) }}
              placeholder={(p.placeholder as string) ?? ''}
              style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${errMsg ? '#ff4d4f' : '#d0d0d0'}`, borderRadius: 6, padding: '8px 12px', fontSize: 14, outline: 'none', transition: 'border-color 0.2s' }}
              onFocus={e => { e.target.style.borderColor = errMsg ? '#ff4d4f' : '#1677ff' }}
              onBlur={e => {
                e.target.style.borderColor = errMsg ? '#ff4d4f' : '#d0d0d0'
                if (isPassword && e.target.value.length > 0 && e.target.value.length < 8) setErrors(prev => ({ ...prev, [fieldNm]: '비밀번호는 8자 이상이어야 합니다.' }))
              }} />
            {errMsg && <div style={{ fontSize: 11, color: '#ff4d4f', marginTop: 3 }}>{errMsg}</div>}
          </div>
        )
      }

      case 'select-input': {
        const fieldNm = p.fieldNm as string
        const opts = (p.options as { value: string; label: string }[]) ?? []
        return (
          <div style={{ width: '100%' }}>
            {p.label && <label style={{ display: 'block', fontSize: 12, color: '#555', marginBottom: 4 }}>{p.label as string}</label>}
            <select value={values[fieldNm] ?? ''} onChange={e => set(fieldNm, e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d0d0d0', borderRadius: 6, padding: '8px 12px', fontSize: 14, outline: 'none', background: '#fff', cursor: 'pointer' }}
              onFocus={e => { e.target.style.borderColor = '#1677ff' }} onBlur={e => { e.target.style.borderColor = '#d0d0d0' }}>
              <option value="">{(p.placeholder as string) ?? '선택하세요'}</option>
              {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        )
      }

      case 'split-input': {
        const parts = (p.parts as SplitPart[]) ?? []
        return (
          <div style={{ width: '100%' }}>
            {p.label && <label style={{ display: 'block', fontSize: 12, color: '#555', marginBottom: 4 }}>{p.label as string}</label>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {parts.map((part, i) => (
                <React.Fragment key={i}>
                  {part.separator && <span style={{ color: '#555', fontSize: 16, fontWeight: 500 }}>{part.separator}</span>}
                  {part.mask ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {Array.from({ length: part.maxLength }).map((_, j) => (
                        <div key={j} style={{ width: 10, height: 10, borderRadius: '50%', background: '#555' }} />
                      ))}
                    </div>
                  ) : (
                    <input type="text" maxLength={part.maxLength} value={values[part.fieldNm] ?? ''} onChange={e => set(part.fieldNm, e.target.value)}
                      style={{ width: part.width ?? 80, border: '1px solid #d0d0d0', borderRadius: 6, padding: '8px 10px', fontSize: 14, outline: 'none', textAlign: 'center' }}
                      onFocus={e => { e.target.style.borderColor = '#1677ff' }} onBlur={e => { e.target.style.borderColor = '#d0d0d0' }} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )
      }

      case 'address-input':
        return <AddressField el={el} values={values} set={set} />

      case 'phone-input':
        return <PhoneField el={el} values={values} set={set} />

      case 'date-input':
        return <DateField el={el} values={values} set={set} />

      case 'checkbox-group': {
        const opts = (p.options as { value: string; label: string }[]) ?? []
        return (
          <div style={{ width: '100%' }}>
            {p.label && <div style={{ fontSize: 12, color: '#555', marginBottom: 8, fontWeight: 600 }}>{p.label as string}</div>}
            {opts.map(opt => (
              <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={values[opt.value] === 'true'} onChange={e => set(opt.value, e.target.checked ? 'true' : 'false')} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                <span style={{ fontSize: 13, color: '#333' }}>{opt.label}</span>
              </label>
            ))}
          </div>
        )
      }

      case 'button': {
        const action = p.action as string
        const bType = p.buttonType as string
        return (
          <button
            onClick={() => {
              if (action === 'submit') handleSubmit()
              else if (action === 'reset') { setValues({}); setErrors({}) }
              else if (action === 'open-popup' && p.targetScreenId) {
                setPopup({ screenId: p.targetScreenId as string, title: p.label as string })
              }
              else if (action === 'navigate' && p.navigatePath) {
                window.location.href = p.navigatePath as string
              }
            }}
            disabled={submitting && action === 'submit'}
            style={{
              width: '100%', height: el.h - 4,
              background: bType === 'primary' ? '#1677ff' : bType === 'danger' ? '#ff4d4f' : '#fff',
              color: (bType === 'primary' || bType === 'danger') ? '#fff' : '#333',
              border: bType === 'default' ? '1px solid #d9d9d9' : 'none',
              borderRadius: 6, fontSize: 15, fontWeight: 500, cursor: 'pointer', transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.85' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
          >
            {submitting && action === 'submit' ? '처리 중...' : (p.label as string) ?? '확인'}
          </button>
        )
      }

      case 'divider':
        return <hr style={{ border: 'none', margin: 0, borderTop: `${p.thickness ?? 1}px ${p.dividerStyle ?? 'solid'} ${p.dividerColor ?? '#e0e0e0'}`, width: '100%' }} />

      case 'user-profile':
        return (
          <UserProfileCard
            title={p.title as string | undefined}
            bgColor={p.bgColor as string | undefined}
            showLogout={p.showLogout !== false}
            stats={(p.stats as { label: string; value: string | number }[] | undefined) ?? []}
            avatarSize={(p.avatarSize as number | undefined) ?? 100}
            width={el.w}
            height={el.h}
          />
        )

      case 'data-grid':
        return (
          <DataGrid
            el={el}
            onOpenPopup={setPopup}
          />
        )

      default:
        return null
    }
  }

  return (
    <>
      <div
        style={{
          position: 'relative',
          width: config.canvasWidth,
          height: config.canvasHeight,
          background: config.backgroundColor ?? '#fff',
          margin: '0 auto',
          overflow: 'hidden',
        }}
      >
        {[...config.elements]
          .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
          .map(el => (
            <div
              key={el.id}
              style={{
                position: 'absolute', left: el.x, top: el.y, width: el.w, height: el.h,
                display: 'flex',
                alignItems: el.type === 'divider' ? 'center' : 'flex-start',
                overflow: el.type === 'data-grid' ? 'hidden' : 'visible',
              }}
            >
              {renderElement(el)}
            </div>
          ))}
      </div>

      {/* 팝업 Modal */}
      <Modal
        open={!!popup}
        title={popup?.title ?? '상세'}
        onCancel={() => setPopup(null)}
        footer={null}
        width={720}
        destroyOnHidden
        styles={{ body: { padding: 0, maxHeight: '80vh', overflowY: 'auto' } }}
      >
        {popup && (
          <ScreenRenderer
            screenId={popup.screenId}
            initialValues={popup.initialValues}
            popupMode
            ignoreOpenType
            onSuccess={() => {
              setPopup(null)
              // 그리드가 있으면 새로고침
              config.elements
                .filter(e => e.type === 'data-grid')
                .forEach(e => qc.invalidateQueries({ queryKey: ['canvasGrid', e.props.apiEndpoint] }))
            }}
          />
        )}
      </Modal>
    </>
  )
}

export default CanvasPageRenderer
