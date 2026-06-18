import React, { useState, useRef, useEffect } from 'react'
import { Button, message } from 'antd'
import api from '@/api/axios'
import type { CanvasConfig, CanvasElement, SplitPart } from '@/types/schema'
import UserProfileCard from '@/components/canvas/UserProfileCard'

// Kakao Postcode API 타입 선언
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

// ─── 주소 입력 컴포넌트 ───────────────────────────────────────
const AddressField: React.FC<{
  el: CanvasElement
  values: Record<string, string>
  set: (field: string, val: string) => void
}> = ({ el, values, set }) => {
  const p = el.props
  const fieldNmZip = (p.fieldNmZip as string) ?? 'zipCode'
  const fieldNmAddr = (p.fieldNmAddr as string) ?? 'address'
  const fieldNmAddrDetail = (p.fieldNmAddrDetail as string) ?? 'addressDetail'

  // Kakao Postcode 스크립트 로드 (한 번만)
  useEffect(() => {
    if (window.daum?.Postcode) return
    const script = document.createElement('script')
    script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'
    script.async = true
    document.head.appendChild(script)
  }, [])

  const openPostcode = () => {
    if (!window.daum?.Postcode) {
      message.warning('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도하세요.')
      return
    }
    new window.daum.Postcode({
      oncomplete(data) {
        set(fieldNmZip, data.zonecode)
        set(fieldNmAddr, data.roadAddress || data.jibunAddress)
      },
    }).open()
  }

  return (
    <div style={{ width: '100%' }}>
      {p.label && (
        <label style={{ display: 'block', fontSize: 12, color: '#555', marginBottom: 4 }}>
          {p.label as string}
        </label>
      )}
      {/* 우편번호 + 검색 버튼 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
        <input
          type="text"
          readOnly
          value={values[fieldNmZip] ?? ''}
          placeholder="우편번호"
          style={{
            width: 100, boxSizing: 'border-box',
            border: '1px solid #d0d0d0', borderRadius: 6,
            padding: '8px 10px', fontSize: 13, background: '#f5f5f5',
            color: '#555', cursor: 'not-allowed', outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={openPostcode}
          style={{
            padding: '0 14px', background: '#1677ff', color: '#fff',
            border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer',
            fontWeight: 500, whiteSpace: 'nowrap',
          }}
        >
          {(p.searchBtnLabel as string) || '주소검색'}
        </button>
      </div>
      {/* 주소 (disable) */}
      <input
        type="text"
        readOnly
        value={values[fieldNmAddr] ?? ''}
        placeholder="주소 (검색 후 자동 입력)"
        style={{
          width: '100%', boxSizing: 'border-box', marginBottom: 6,
          border: '1px solid #d0d0d0', borderRadius: 6,
          padding: '8px 12px', fontSize: 13, background: '#f5f5f5',
          color: '#555', cursor: 'not-allowed', outline: 'none',
        }}
      />
      {/* 상세 주소 */}
      <input
        type="text"
        value={values[fieldNmAddrDetail] ?? ''}
        onChange={e => set(fieldNmAddrDetail, e.target.value)}
        placeholder="상세 주소 입력"
        style={{
          width: '100%', boxSizing: 'border-box',
          border: '1px solid #d0d0d0', borderRadius: 6,
          padding: '8px 12px', fontSize: 13, outline: 'none',
          transition: 'border-color 0.2s',
        }}
        onFocus={e => { e.target.style.borderColor = '#1677ff' }}
        onBlur={e => { e.target.style.borderColor = '#d0d0d0' }}
      />
    </div>
  )
}

// ─── 핸드폰 번호 컴포넌트 ────────────────────────────────────
const PhoneField: React.FC<{
  el: CanvasElement
  values: Record<string, string>
  set: (field: string, val: string) => void
}> = ({ el, values, set }) => {
  const p = el.props
  const prefix = (p.prefix as string) ?? '010'
  const fieldNm2 = (p.fieldNm2 as string) ?? 'phone2'
  const fieldNm3 = (p.fieldNm3 as string) ?? 'phone3'
  const ref2 = useRef<HTMLInputElement>(null)
  const ref3 = useRef<HTMLInputElement>(null)

  const inputStyle: React.CSSProperties = {
    border: '1px solid #d0d0d0', borderRadius: 6,
    padding: '8px 0', fontSize: 14, outline: 'none',
    textAlign: 'center', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  }

  return (
    <div style={{ width: '100%' }}>
      {p.label && (
        <label style={{ display: 'block', fontSize: 12, color: '#555', marginBottom: 4 }}>
          {p.label as string}
        </label>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* 첫 번째: 고정 */}
        <input
          type="text"
          readOnly
          value={prefix}
          style={{ ...inputStyle, width: 56, background: '#f5f5f5', color: '#555', cursor: 'not-allowed' }}
        />
        <span style={{ color: '#999', fontWeight: 600, fontSize: 16 }}>-</span>
        {/* 두 번째: 4자리 입력 시 자동 이동 */}
        <input
          ref={ref2}
          type="tel"
          maxLength={4}
          value={values[fieldNm2] ?? ''}
          placeholder="0000"
          style={{ ...inputStyle, flex: 1 }}
          onChange={e => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 4)
            set(fieldNm2, v)
            if (v.length === 4) ref3.current?.focus()
          }}
          onFocus={e => { e.target.style.borderColor = '#1677ff' }}
          onBlur={e => { e.target.style.borderColor = '#d0d0d0' }}
        />
        <span style={{ color: '#999', fontWeight: 600, fontSize: 16 }}>-</span>
        {/* 세 번째: 4자리 */}
        <input
          ref={ref3}
          type="tel"
          maxLength={4}
          value={values[fieldNm3] ?? ''}
          placeholder="0000"
          style={{ ...inputStyle, flex: 1 }}
          onChange={e => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 4)
            set(fieldNm3, v)
          }}
          onFocus={e => { e.target.style.borderColor = '#1677ff' }}
          onBlur={e => { e.target.style.borderColor = '#d0d0d0' }}
        />
      </div>
    </div>
  )
}

// ─── 날짜 입력 컴포넌트 ──────────────────────────────────────
const DateField: React.FC<{
  el: CanvasElement
  values: Record<string, string>
  set: (field: string, val: string) => void
}> = ({ el, values, set }) => {
  const p = el.props
  const fieldNm = (p.fieldNm as string) ?? 'date'
  const fmt = (p.format as string) ?? 'YYYY-MM-DD'
  const calRef = useRef<HTMLInputElement>(null)

  const formatDate = (raw: string): string => {
    const digits = raw.replace(/\D/g, '')
    if (digits.length < 8) return raw
    const y = digits.slice(0, 4)
    const m = digits.slice(4, 6)
    const d = digits.slice(6, 8)
    if (fmt === 'YYYYMMDD') return `${y}${m}${d}`
    if (fmt === 'YYYY/MM/DD') return `${y}/${m}/${d}`
    return `${y}-${m}-${d}`
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    // 구분자 제거 후 숫자 카운트
    const digits = raw.replace(/\D/g, '')
    if (digits.length >= 8) {
      set(fieldNm, formatDate(raw))
    } else {
      set(fieldNm, raw)
    }
  }

  const handleCalendarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // native date picker returns 'YYYY-MM-DD'
    const v = e.target.value // e.g. '2026-01-01'
    if (!v) return
    const digits = v.replace(/-/g, '') // '20260101'
    set(fieldNm, formatDate(digits))
  }

  return (
    <div style={{ width: '100%' }}>
      {p.label && (
        <label style={{ display: 'block', fontSize: 12, color: '#555', marginBottom: 4 }}>
          {p.label as string}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type="text"
          value={values[fieldNm] ?? ''}
          onChange={handleChange}
          placeholder={`${fmt} 또는 YYYYMMDD`}
          style={{
            flex: 1, boxSizing: 'border-box',
            border: '1px solid #d0d0d0', borderRadius: 6,
            padding: '8px 40px 8px 12px', fontSize: 14, outline: 'none',
            transition: 'border-color 0.2s',
          }}
          onFocus={e => { e.target.style.borderColor = '#1677ff' }}
          onBlur={e => { e.target.style.borderColor = '#d0d0d0' }}
        />
        {/* 달력 아이콘 — native date picker 열기 */}
        <span
          onClick={() => calRef.current?.showPicker?.() ?? calRef.current?.click()}
          style={{
            position: 'absolute', right: 10, cursor: 'pointer',
            color: '#1677ff', fontSize: 16, lineHeight: 1,
          }}
        >📅</span>
        {/* 숨겨진 native date picker */}
        <input
          ref={calRef}
          type="date"
          style={{ position: 'absolute', right: 0, opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
          onChange={handleCalendarChange}
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

  const set = (fieldNm: string, val: string) =>
    setValues(prev => ({ ...prev, [fieldNm]: val }))

  const handleSubmit = async () => {
    // 비밀번호 최소 길이 검증
    const newErrors: Record<string, string> = {}
    config.elements.forEach(el => {
      if (el.type === 'text-input' && el.props.behavior === 'password') {
        const fieldNm = el.props.fieldNm as string
        if (fieldNm && (values[fieldNm] ?? '').length < 8) {
          newErrors[fieldNm] = '비밀번호는 8자 이상이어야 합니다.'
        }
      }
    })
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
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
          <div style={{
            fontSize: p.fontSize ?? 22, fontWeight: p.fontWeight ?? 'bold',
            color: p.color ?? '#1a1a1a',
            textAlign: p.textAlign as React.CSSProperties['textAlign'] ?? 'left',
            textDecoration: p.underline ? 'underline' : undefined,
            fontStyle: p.italic ? 'italic' : undefined, lineHeight: 1.2,
          }}>
            {p.text as string}
          </div>
        )

      case 'paragraph':
        return (
          <div style={{
            fontSize: p.fontSize ?? 13, color: p.color ?? '#555',
            textAlign: p.textAlign as React.CSSProperties['textAlign'] ?? 'left',
            lineHeight: 1.6, whiteSpace: 'pre-wrap',
          }}>
            {p.text as string}
          </div>
        )

      case 'text-input': {
        const fieldNm = p.fieldNm as string
        const behavior = (p.behavior as string) ?? 'normal'
        const isPassword = behavior === 'password'
        const isName = behavior === 'name'
        const errMsg = errors[fieldNm]

        return (
          <div style={{ width: '100%' }}>
            {p.label && p.labelPosition !== 'none' && (
              <label style={{ display: 'block', fontSize: 12, color: '#555', marginBottom: 4 }}>
                {p.label as string}
                {p.required && <span style={{ color: '#ff4d4f', marginLeft: 2 }}>*</span>}
              </label>
            )}
            <input
              type={isPassword ? 'password' : 'text'}
              value={values[fieldNm] ?? ''}
              onChange={e => {
                let v = e.target.value
                if (isName) v = v.replace(/\s/g, '')   // 이름: 공백 실시간 제거
                set(fieldNm, v)
                if (errMsg) setErrors(prev => ({ ...prev, [fieldNm]: '' }))
              }}
              placeholder={(p.placeholder as string) ?? ''}
              style={{
                width: '100%', boxSizing: 'border-box',
                border: `1px solid ${errMsg ? '#ff4d4f' : '#d0d0d0'}`, borderRadius: 6,
                padding: '8px 12px', fontSize: 14, outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => { e.target.style.borderColor = errMsg ? '#ff4d4f' : '#1677ff' }}
              onBlur={e => {
                e.target.style.borderColor = errMsg ? '#ff4d4f' : '#d0d0d0'
                if (isPassword && e.target.value.length > 0 && e.target.value.length < 8) {
                  setErrors(prev => ({ ...prev, [fieldNm]: '비밀번호는 8자 이상이어야 합니다.' }))
                }
              }}
            />
            {errMsg && <div style={{ fontSize: 11, color: '#ff4d4f', marginTop: 3 }}>{errMsg}</div>}
          </div>
        )
      }

      case 'split-input': {
        const parts = (p.parts as SplitPart[]) ?? []
        return (
          <div style={{ width: '100%' }}>
            {p.label && (
              <label style={{ display: 'block', fontSize: 12, color: '#555', marginBottom: 4 }}>
                {p.label as string}
              </label>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {parts.map((part, i) => (
                <React.Fragment key={i}>
                  {part.separator && (
                    <span style={{ color: '#555', fontSize: 16, fontWeight: 500 }}>{part.separator}</span>
                  )}
                  {part.mask ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {Array.from({ length: part.maxLength }).map((_, j) => (
                        <div key={j} style={{ width: 10, height: 10, borderRadius: '50%', background: '#555' }} />
                      ))}
                    </div>
                  ) : (
                    <input
                      type="text"
                      maxLength={part.maxLength}
                      value={values[part.fieldNm] ?? ''}
                      onChange={e => set(part.fieldNm, e.target.value)}
                      style={{
                        width: part.width ?? 80, border: '1px solid #d0d0d0', borderRadius: 6,
                        padding: '8px 10px', fontSize: 14, outline: 'none', textAlign: 'center',
                      }}
                      onFocus={e => { e.target.style.borderColor = '#1677ff' }}
                      onBlur={e => { e.target.style.borderColor = '#d0d0d0' }}
                    />
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
            {p.label && (
              <div style={{ fontSize: 12, color: '#555', marginBottom: 8, fontWeight: 600 }}>
                {p.label as string}
              </div>
            )}
            {opts.map(opt => (
              <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={values[opt.value] === 'true'}
                  onChange={e => set(opt.value, e.target.checked ? 'true' : 'false')}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
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
            }}
            disabled={submitting && action === 'submit'}
            style={{
              width: '100%', height: el.h - 4,
              background: bType === 'primary' ? '#1677ff' : bType === 'danger' ? '#ff4d4f' : '#fff',
              color: (bType === 'primary' || bType === 'danger') ? '#fff' : '#333',
              border: bType === 'default' ? '1px solid #d9d9d9' : 'none',
              borderRadius: 6, fontSize: 15, fontWeight: 500,
              cursor: 'pointer', transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.85' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
          >
            {submitting && action === 'submit' ? '처리 중...' : (p.label as string) ?? '확인'}
          </button>
        )
      }

      case 'divider':
        return (
          <hr style={{
            border: 'none', margin: 0,
            borderTop: `${p.thickness ?? 1}px ${p.dividerStyle ?? 'solid'} ${p.dividerColor ?? '#e0e0e0'}`,
            width: '100%',
          }} />
        )

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

      default:
        return null
    }
  }

  return (
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
              overflow: 'visible',
            }}
          >
            {renderElement(el)}
          </div>
        ))}
    </div>
  )
}

export default CanvasPageRenderer
