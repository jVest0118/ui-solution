import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  Button, Input, Select, InputNumber, ColorPicker, Switch,
  Divider, Typography, Space, message, Tooltip, Popconfirm, Slider
} from 'antd'
import {
  SaveOutlined, ArrowLeftOutlined, DeleteOutlined, PlusOutlined,
  FontSizeOutlined, BoldOutlined, UnderlineOutlined, ItalicOutlined,
  MinusOutlined, FormOutlined, SplitCellsOutlined, CheckSquareOutlined,
  AlignLeftOutlined, AlignCenterOutlined, AlignRightOutlined, EyeOutlined,
  HomeOutlined, PhoneOutlined, CalendarOutlined, UserOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/axios'
import { ScreenRenderer } from '@/components/renderer/ScreenRenderer'
import type { CanvasElement, CanvasElementType, SplitPart, CanvasConfig } from '@/types/schema'

const { Text, Title } = Typography

// ─── 팔레트 정의 ─────────────────────────────────────────────
const PALETTE: { type: CanvasElementType; label: string; icon: React.ReactNode; defaultW: number; defaultH: number }[] = [
  { type: 'heading',       label: '제목',     icon: <FontSizeOutlined />,      defaultW: 360, defaultH: 48 },
  { type: 'paragraph',     label: '단락',     icon: <FormOutlined />,          defaultW: 360, defaultH: 60 },
  { type: 'text-input',    label: '텍스트 입력', icon: <MinusOutlined />,       defaultW: 360, defaultH: 70 },
  { type: 'split-input',   label: '분할 입력', icon: <SplitCellsOutlined />,   defaultW: 360, defaultH: 70 },
  { type: 'checkbox-group',label: '체크박스', icon: <CheckSquareOutlined />,   defaultW: 360, defaultH: 100 },
  { type: 'address-input', label: '주소 입력', icon: <HomeOutlined />,         defaultW: 360, defaultH: 110 },
  { type: 'phone-input',   label: '핸드폰 번호', icon: <PhoneOutlined />,      defaultW: 340, defaultH: 70 },
  { type: 'date-input',    label: '날짜 입력', icon: <CalendarOutlined />,     defaultW: 240, defaultH: 70 },
  { type: 'button',        label: '버튼',     icon: <FormOutlined />,          defaultW: 140, defaultH: 44 },
  { type: 'divider',       label: '구분선',   icon: <MinusOutlined />,         defaultW: 360, defaultH: 16 },
  { type: 'user-profile',  label: '사용자 프로필', icon: <UserOutlined />,      defaultW: 260, defaultH: 200 },
]

function genId() { return 'el_' + Math.random().toString(36).slice(2, 9) }

function defaultProps(type: CanvasElementType): CanvasElement['props'] {
  switch (type) {
    case 'heading':
      return { text: '제목을 입력하세요', fontSize: 22, fontWeight: 'bold', color: '#1a1a1a', textAlign: 'left' }
    case 'paragraph':
      return { text: '내용을 입력하세요', fontSize: 13, color: '#555', textAlign: 'left' }
    case 'text-input':
      return { label: '레이블', fieldNm: 'field_' + Math.random().toString(36).slice(2,5), placeholder: '입력하세요', labelPosition: 'top', inputType: 'text' }
    case 'split-input':
      return {
        label: '주민등록번호',
        parts: [
          { fieldNm: 'ssn_front', maxLength: 6, width: 120 },
          { fieldNm: 'ssn_back', maxLength: 1, width: 50, separator: '-' },
          { fieldNm: 'ssn_mask', maxLength: 6, width: 120, mask: true },
        ],
      }
    case 'checkbox-group':
      return {
        label: '동의 항목',
        options: [
          { value: 'all', label: '전체 동의', required: false },
          { value: 'terms', label: '이용약관 (필수)', required: true },
          { value: 'privacy', label: '개인정보 수집·이용 (필수)', required: true },
        ],
      }
    case 'address-input':
      return {
        label: '주소', searchBtnLabel: '주소검색',
        fieldNmZip: 'zipCode', fieldNmAddr: 'address', fieldNmAddrDetail: 'addressDetail',
      }
    case 'phone-input':
      return {
        label: '핸드폰 번호', prefix: '010',
        fieldNm1: 'phone1', fieldNm2: 'phone2', fieldNm3: 'phone3',
      }
    case 'date-input':
      return { label: '날짜', fieldNm: 'date', format: 'YYYY-MM-DD', placeholder: 'YYYY-MM-DD' }
    case 'button':
      return { label: '확인', buttonType: 'primary', action: 'submit' }
    case 'divider':
      return { dividerColor: '#e0e0e0', thickness: 1, dividerStyle: 'solid' }
    case 'user-profile':
      return { title: '', bgColor: '#1677ff', showLogout: true, avatarSize: 80, stats: [] }
    default:
      return {}
  }
}

// ─── 캔버스 위 요소 미리보기 렌더링 ──────────────────────────
const ElementPreview: React.FC<{ el: CanvasElement; selected: boolean }> = ({ el, selected }) => {
  const p = el.props

  const renderInner = () => {
    switch (el.type) {
      case 'heading':
        return (
          <div style={{
            fontSize: p.fontSize ?? 22,
            fontWeight: p.fontWeight ?? 'bold',
            color: p.color ?? '#1a1a1a',
            textAlign: p.textAlign as React.CSSProperties['textAlign'] ?? 'left',
            textDecoration: p.underline ? 'underline' : undefined,
            fontStyle: p.italic ? 'italic' : undefined,
            lineHeight: 1.2,
            padding: '4px 0',
            userSelect: 'none',
          }}>
            {(p.text as string) || '제목'}
          </div>
        )
      case 'paragraph':
        return (
          <div style={{
            fontSize: p.fontSize ?? 13,
            color: p.color ?? '#555',
            textAlign: p.textAlign as React.CSSProperties['textAlign'] ?? 'left',
            lineHeight: 1.5,
            padding: '2px 0',
            userSelect: 'none',
            whiteSpace: 'pre-wrap',
          }}>
            {(p.text as string) || '내용'}
          </div>
        )
      case 'text-input':
        return (
          <div style={{ width: '100%' }}>
            {p.label && p.labelPosition !== 'none' && (
              <div style={{ fontSize: 12, color: '#555', marginBottom: 4, userSelect: 'none' }}>
                {p.label as string}
                {p.required && <span style={{ color: '#ff4d4f', marginLeft: 2 }}>*</span>}
              </div>
            )}
            <div style={{
              border: '1px solid #d0d0d0', borderRadius: 6, padding: '6px 10px',
              background: '#fff', fontSize: 13, color: '#aaa', userSelect: 'none',
              minHeight: 32,
            }}>
              {(p.placeholder as string) || '입력하세요'}
            </div>
          </div>
        )
      case 'split-input': {
        const parts = (p.parts as SplitPart[]) ?? []
        return (
          <div style={{ width: '100%' }}>
            {p.label && (
              <div style={{ fontSize: 12, color: '#555', marginBottom: 4, userSelect: 'none' }}>
                {p.label as string}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {parts.map((part, i) => (
                <React.Fragment key={i}>
                  {part.separator && <span style={{ color: '#888', fontSize: 14 }}>{part.separator}</span>}
                  {part.mask ? (
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      {Array.from({ length: part.maxLength }).map((_, j) => (
                        <div key={j} style={{ width: 10, height: 10, borderRadius: '50%', background: '#888' }} />
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      border: '1px solid #d0d0d0', borderRadius: 6, padding: '5px 8px',
                      background: '#fff', fontSize: 12, color: '#aaa', userSelect: 'none',
                      width: part.width ?? 80, minHeight: 30,
                    }}>
                      {'x'.repeat(Math.min(part.maxLength, 6))}
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )
      }
      case 'checkbox-group': {
        const opts = (p.options as { value: string; label: string; required?: boolean }[]) ?? []
        return (
          <div style={{ width: '100%' }}>
            {p.label && (
              <div style={{ fontSize: 12, color: '#555', marginBottom: 6, fontWeight: 600, userSelect: 'none' }}>
                {p.label as string}
              </div>
            )}
            {opts.map((opt, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ width: 16, height: 16, border: '2px solid #d0d0d0', borderRadius: 3, background: '#fff', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#333', userSelect: 'none' }}>{opt.label}</span>
              </div>
            ))}
          </div>
        )
      }
      case 'address-input':
        return (
          <div style={{ width: '100%' }}>
            {p.label && <div style={{ fontSize: 12, color: '#555', marginBottom: 4, userSelect: 'none' }}>{p.label as string}</div>}
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <div style={{ flex: 1, border: '1px solid #d0d0d0', borderRadius: 6, padding: '5px 10px', background: '#f5f5f5', fontSize: 12, color: '#bbb', userSelect: 'none' }}>주소를 검색하세요</div>
              <div style={{ padding: '5px 10px', background: '#1677ff', color: '#fff', borderRadius: 6, fontSize: 12, userSelect: 'none', whiteSpace: 'nowrap' }}>
                {(p.searchBtnLabel as string) || '주소검색'}
              </div>
            </div>
            <div style={{ border: '1px solid #d0d0d0', borderRadius: 6, padding: '5px 10px', background: '#fff', fontSize: 12, color: '#bbb', userSelect: 'none' }}>상세 주소 입력</div>
          </div>
        )
      case 'phone-input':
        return (
          <div style={{ width: '100%' }}>
            {p.label && <div style={{ fontSize: 12, color: '#555', marginBottom: 4, userSelect: 'none' }}>{p.label as string}</div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 52, border: '1px solid #d0d0d0', borderRadius: 6, padding: '5px 8px', background: '#f5f5f5', fontSize: 13, textAlign: 'center', userSelect: 'none' }}>{(p.prefix as string) || '010'}</div>
              <span style={{ color: '#999', fontWeight: 600 }}>-</span>
              <div style={{ flex: 1, border: '1px solid #d0d0d0', borderRadius: 6, padding: '5px 8px', background: '#fff', fontSize: 12, color: '#ccc', textAlign: 'center', userSelect: 'none' }}>4자리</div>
              <span style={{ color: '#999', fontWeight: 600 }}>-</span>
              <div style={{ flex: 1, border: '1px solid #d0d0d0', borderRadius: 6, padding: '5px 8px', background: '#fff', fontSize: 12, color: '#ccc', textAlign: 'center', userSelect: 'none' }}>4자리</div>
            </div>
          </div>
        )
      case 'date-input':
        return (
          <div style={{ width: '100%' }}>
            {p.label && <div style={{ fontSize: 12, color: '#555', marginBottom: 4, userSelect: 'none' }}>{p.label as string}</div>}
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d0d0d0', borderRadius: 6, padding: '5px 10px', background: '#fff', gap: 8 }}>
              <span style={{ flex: 1, fontSize: 13, color: '#ccc', userSelect: 'none' }}>YYYY-MM-DD</span>
              <CalendarOutlined style={{ color: '#1677ff' }} />
            </div>
          </div>
        )
      case 'button':
        return (
          <button
            style={{
              background: p.buttonType === 'primary' ? '#1677ff' : p.buttonType === 'danger' ? '#ff4d4f' : '#fff',
              color: p.buttonType === 'primary' || p.buttonType === 'danger' ? '#fff' : '#333',
              border: p.buttonType === 'default' ? '1px solid #d9d9d9' : 'none',
              borderRadius: 6, padding: '0 16px', height: el.h - 4,
              fontSize: 14, cursor: 'pointer', width: '100%', userSelect: 'none',
              fontWeight: 500,
            }}
          >
            {(p.label as string) || '버튼'}
          </button>
        )
      case 'divider':
        return (
          <hr style={{
            border: 'none',
            borderTop: `${p.thickness ?? 1}px ${p.dividerStyle ?? 'solid'} ${p.dividerColor ?? '#e0e0e0'}`,
            margin: 0, width: '100%',
          }} />
        )
      case 'user-profile':
        return (
          <div style={{
            width: '100%', height: '100%',
            background: (p.bgColor as string) ?? '#1677ff',
            borderRadius: 12,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: 12, boxSizing: 'border-box', gap: 6,
            userSelect: 'none',
          }}>
            <div style={{
              width: (p.avatarSize as number) ?? 80, height: (p.avatarSize as number) ?? 80,
              borderRadius: '50%', background: 'rgba(255,255,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '3px solid rgba(255,255,255,0.6)',
            }}>
              <UserOutlined style={{ fontSize: ((p.avatarSize as number) ?? 80) * 0.45, color: '#fff' }} />
            </div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>홍길동</div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>개발팀</div>
            {(p.title as string) && <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10 }}>{p.title as string}</div>}
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        outline: selected ? '2px solid #1677ff' : '1px dashed transparent',
        boxSizing: 'border-box',
        padding: el.type === 'divider' ? '6px 0' : el.type === 'user-profile' ? 0 : 4,
        display: 'flex',
        alignItems: el.type === 'divider' ? 'center' : 'flex-start',
        overflow: 'hidden',
        borderRadius: 2,
      }}
    >
      {renderInner()}
    </div>
  )
}

// ─── 리사이즈 핸들 ────────────────────────────────────────────
const HANDLES = ['nw','n','ne','e','se','s','sw','w'] as const
type Handle = typeof HANDLES[number]

const handleStyle = (h: Handle): React.CSSProperties => {
  const s = 8
  const pos: Record<Handle, React.CSSProperties> = {
    nw: { top: -s/2, left: -s/2, cursor: 'nw-resize' },
    n:  { top: -s/2, left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize' },
    ne: { top: -s/2, right: -s/2, cursor: 'ne-resize' },
    e:  { top: '50%', right: -s/2, transform: 'translateY(-50%)', cursor: 'e-resize' },
    se: { bottom: -s/2, right: -s/2, cursor: 'se-resize' },
    s:  { bottom: -s/2, left: '50%', transform: 'translateX(-50%)', cursor: 's-resize' },
    sw: { bottom: -s/2, left: -s/2, cursor: 'sw-resize' },
    w:  { top: '50%', left: -s/2, transform: 'translateY(-50%)', cursor: 'w-resize' },
  }
  return { position: 'absolute', width: s, height: s, background: '#1677ff', border: '1.5px solid #fff', borderRadius: 2, zIndex: 10, ...pos[h] }
}

// ─── 속성 패널 ────────────────────────────────────────────────
const PropsPanel: React.FC<{
  el: CanvasElement
  onChange: (id: string, props: Partial<CanvasElement['props']>) => void
  onGeometry: (id: string, geo: Partial<Pick<CanvasElement,'x'|'y'|'w'|'h'>>) => void
  onDelete: (id: string) => void
}> = ({ el, onChange, onGeometry, onDelete }) => {
  const p = el.props
  const set = (key: string, val: unknown) => onChange(el.id, { [key]: val })

  return (
    <div style={{ padding: '12px 14px', overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text strong style={{ fontSize: 13 }}>{PALETTE.find(p => p.type === el.type)?.label ?? el.type}</Text>
        <Popconfirm title="이 요소를 삭제하시겠습니까?" onConfirm={() => onDelete(el.id)} okText="삭제" cancelText="취소">
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </div>

      {/* 위치/크기 */}
      <Divider orientation="left" plain style={{ fontSize: 11, margin: '6px 0' }}>위치·크기</Divider>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
        {(['x','y','w','h'] as const).map(k => (
          <div key={k}>
            <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>{k.toUpperCase()}</div>
            <InputNumber size="small" style={{ width: '100%' }} value={el[k]}
              onChange={v => onGeometry(el.id, { [k]: v ?? 0 })} min={0} step={1} />
          </div>
        ))}
      </div>

      {/* 텍스트 요소 공통 */}
      {(el.type === 'heading' || el.type === 'paragraph') && (
        <>
          <Divider orientation="left" plain style={{ fontSize: 11, margin: '6px 0' }}>텍스트</Divider>
          <Input.TextArea
            rows={el.type === 'paragraph' ? 3 : 1}
            value={(p.text as string) ?? ''}
            onChange={e => set('text', e.target.value)}
            style={{ marginBottom: 8, fontSize: 12 }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>크기 (px)</div>
              <InputNumber size="small" style={{ width: '100%' }} value={(p.fontSize as number) ?? 14}
                onChange={v => set('fontSize', v)} min={8} max={72} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>색상</div>
              <Input size="small" value={(p.color as string) ?? '#1a1a1a'}
                onChange={e => set('color', e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
            <Tooltip title="굵게"><Button size="small" type={(p.fontWeight === 'bold' || p.fontWeight === '700') ? 'primary' : 'default'}
              icon={<BoldOutlined />} onClick={() => set('fontWeight', (p.fontWeight === 'bold') ? 'normal' : 'bold')} /></Tooltip>
            <Tooltip title="기울임"><Button size="small" type={p.italic ? 'primary' : 'default'}
              icon={<ItalicOutlined />} onClick={() => set('italic', !p.italic)} /></Tooltip>
            <Tooltip title="밑줄"><Button size="small" type={p.underline ? 'primary' : 'default'}
              icon={<UnderlineOutlined />} onClick={() => set('underline', !p.underline)} /></Tooltip>
            <Tooltip title="왼쪽"><Button size="small" type={p.textAlign === 'left' || !p.textAlign ? 'primary' : 'default'}
              icon={<AlignLeftOutlined />} onClick={() => set('textAlign', 'left')} /></Tooltip>
            <Tooltip title="가운데"><Button size="small" type={p.textAlign === 'center' ? 'primary' : 'default'}
              icon={<AlignCenterOutlined />} onClick={() => set('textAlign', 'center')} /></Tooltip>
            <Tooltip title="오른쪽"><Button size="small" type={p.textAlign === 'right' ? 'primary' : 'default'}
              icon={<AlignRightOutlined />} onClick={() => set('textAlign', 'right')} /></Tooltip>
          </div>
        </>
      )}

      {/* 텍스트 입력 */}
      {el.type === 'text-input' && (
        <>
          <Divider orientation="left" plain style={{ fontSize: 11, margin: '6px 0' }}>입력 필드</Divider>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div><div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>입력 동작</div>
              <Select size="small" style={{ width: '100%' }} value={(p.behavior as string) ?? 'normal'} onChange={v => set('behavior', v)}
                options={[
                  { value: 'normal', label: '일반 텍스트' },
                  { value: 'name', label: '이름 (공백 자동 제거)' },
                  { value: 'password', label: '비밀번호 (최소 8자)' },
                ]} /></div>
            <div><div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>레이블</div>
              <Input size="small" value={(p.label as string) ?? ''} onChange={e => set('label', e.target.value)} /></div>
            <div><div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>필드명 (영문)</div>
              <Input size="small" value={(p.fieldNm as string) ?? ''} onChange={e => set('fieldNm', e.target.value)} /></div>
            <div><div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>플레이스홀더</div>
              <Input size="small" value={(p.placeholder as string) ?? ''} onChange={e => set('placeholder', e.target.value)} /></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Switch size="small" checked={!!(p.required)} onChange={v => set('required', v)} />
              <Text style={{ fontSize: 12 }}>필수 입력</Text>
            </div>
          </div>
        </>
      )}

      {/* 주소 입력 */}
      {el.type === 'address-input' && (
        <>
          <Divider orientation="left" plain style={{ fontSize: 11, margin: '6px 0' }}>주소 입력</Divider>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div><div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>레이블</div>
              <Input size="small" value={(p.label as string) ?? ''} onChange={e => set('label', e.target.value)} /></div>
            <div><div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>검색 버튼 텍스트</div>
              <Input size="small" value={(p.searchBtnLabel as string) ?? '주소검색'} onChange={e => set('searchBtnLabel', e.target.value)} /></div>
            <div><div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>우편번호 필드명</div>
              <Input size="small" value={(p.fieldNmZip as string) ?? 'zipCode'} onChange={e => set('fieldNmZip', e.target.value)} /></div>
            <div><div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>주소 필드명</div>
              <Input size="small" value={(p.fieldNmAddr as string) ?? 'address'} onChange={e => set('fieldNmAddr', e.target.value)} /></div>
            <div><div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>상세주소 필드명</div>
              <Input size="small" value={(p.fieldNmAddrDetail as string) ?? 'addressDetail'} onChange={e => set('fieldNmAddrDetail', e.target.value)} /></div>
          </div>
        </>
      )}

      {/* 핸드폰 번호 */}
      {el.type === 'phone-input' && (
        <>
          <Divider orientation="left" plain style={{ fontSize: 11, margin: '6px 0' }}>핸드폰 번호</Divider>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div><div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>레이블</div>
              <Input size="small" value={(p.label as string) ?? ''} onChange={e => set('label', e.target.value)} /></div>
            <div><div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>첫 번째 번호 (고정)</div>
              <Input size="small" value={(p.prefix as string) ?? '010'} onChange={e => set('prefix', e.target.value)} /></div>
            <div><div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>2번째 파트 필드명</div>
              <Input size="small" value={(p.fieldNm2 as string) ?? 'phone2'} onChange={e => set('fieldNm2', e.target.value)} /></div>
            <div><div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>3번째 파트 필드명</div>
              <Input size="small" value={(p.fieldNm3 as string) ?? 'phone3'} onChange={e => set('fieldNm3', e.target.value)} /></div>
          </div>
        </>
      )}

      {/* 날짜 입력 */}
      {el.type === 'date-input' && (
        <>
          <Divider orientation="left" plain style={{ fontSize: 11, margin: '6px 0' }}>날짜 입력</Divider>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div><div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>레이블</div>
              <Input size="small" value={(p.label as string) ?? ''} onChange={e => set('label', e.target.value)} /></div>
            <div><div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>필드명 (영문)</div>
              <Input size="small" value={(p.fieldNm as string) ?? 'date'} onChange={e => set('fieldNm', e.target.value)} /></div>
            <div><div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>형식</div>
              <Select size="small" style={{ width: '100%' }} value={(p.format as string) ?? 'YYYY-MM-DD'} onChange={v => set('format', v)}
                options={[
                  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
                  { value: 'YYYY/MM/DD', label: 'YYYY/MM/DD' },
                  { value: 'YYYYMMDD', label: 'YYYYMMDD' },
                ]} /></div>
          </div>
        </>
      )}

      {/* 분할 입력 */}
      {el.type === 'split-input' && (
        <>
          <Divider orientation="left" plain style={{ fontSize: 11, margin: '6px 0' }}>분할 입력</Divider>
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>레이블</div>
            <Input size="small" value={(p.label as string) ?? ''} onChange={e => set('label', e.target.value)} />
          </div>
          <div style={{ fontSize: 10, color: '#888', marginBottom: 4 }}>파트 구성</div>
          {((p.parts as SplitPart[]) ?? []).map((part, idx) => (
            <div key={idx} style={{ background: '#f8f9fa', borderRadius: 6, padding: 8, marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ fontSize: 11 }} strong>파트 {idx + 1}</Text>
                <Button size="small" danger type="text" onClick={() => {
                  const parts = [...((p.parts as SplitPart[]) ?? [])]
                  parts.splice(idx, 1)
                  set('parts', parts)
                }}>×</Button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                <div><div style={{ fontSize: 10, color: '#888' }}>필드명</div>
                  <Input size="small" value={part.fieldNm} onChange={e => {
                    const parts = [...((p.parts as SplitPart[]) ?? [])]
                    parts[idx] = { ...parts[idx], fieldNm: e.target.value }
                    set('parts', parts)
                  }} /></div>
                <div><div style={{ fontSize: 10, color: '#888' }}>자릿수</div>
                  <InputNumber size="small" style={{ width: '100%' }} min={1} max={20} value={part.maxLength} onChange={v => {
                    const parts = [...((p.parts as SplitPart[]) ?? [])]
                    parts[idx] = { ...parts[idx], maxLength: v ?? 1 }
                    set('parts', parts)
                  }} /></div>
                <div><div style={{ fontSize: 10, color: '#888' }}>구분자</div>
                  <Input size="small" value={part.separator ?? ''} onChange={e => {
                    const parts = [...((p.parts as SplitPart[]) ?? [])]
                    parts[idx] = { ...parts[idx], separator: e.target.value }
                    set('parts', parts)
                  }} /></div>
                <div><div style={{ fontSize: 10, color: '#888' }}>너비(px)</div>
                  <InputNumber size="small" style={{ width: '100%' }} min={20} value={part.width ?? 80} onChange={v => {
                    const parts = [...((p.parts as SplitPart[]) ?? [])]
                    parts[idx] = { ...parts[idx], width: v ?? 80 }
                    set('parts', parts)
                  }} /></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <Switch size="small" checked={!!part.mask} onChange={v => {
                  const parts = [...((p.parts as SplitPart[]) ?? [])]
                  parts[idx] = { ...parts[idx], mask: v }
                  set('parts', parts)
                }} />
                <Text style={{ fontSize: 11 }}>마스크 (●●●)</Text>
              </div>
            </div>
          ))}
          <Button size="small" icon={<PlusOutlined />} block onClick={() => {
            const parts = [...((p.parts as SplitPart[]) ?? [])]
            parts.push({ fieldNm: 'part_' + parts.length, maxLength: 4, width: 80 })
            set('parts', parts)
          }}>파트 추가</Button>
        </>
      )}

      {/* 체크박스 그룹 */}
      {el.type === 'checkbox-group' && (
        <>
          <Divider orientation="left" plain style={{ fontSize: 11, margin: '6px 0' }}>체크박스</Divider>
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>그룹 레이블</div>
            <Input size="small" value={(p.label as string) ?? ''} onChange={e => set('label', e.target.value)} />
          </div>
          <div style={{ fontSize: 10, color: '#888', marginBottom: 4 }}>항목</div>
          {((p.options as {value:string;label:string;required?:boolean}[]) ?? []).map((opt, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 4, marginBottom: 4, alignItems: 'center' }}>
              <Input size="small" value={opt.label} style={{ flex: 1 }} onChange={e => {
                const opts = [...((p.options as {value:string;label:string}[]) ?? [])]
                opts[idx] = { ...opts[idx], label: e.target.value }
                set('options', opts)
              }} />
              <Button size="small" danger type="text" onClick={() => {
                const opts = [...((p.options as {value:string;label:string}[]) ?? [])]
                opts.splice(idx, 1)
                set('options', opts)
              }}>×</Button>
            </div>
          ))}
          <Button size="small" icon={<PlusOutlined />} block onClick={() => {
            const opts = [...((p.options as {value:string;label:string}[]) ?? [])]
            opts.push({ value: 'opt_' + opts.length, label: '항목 ' + (opts.length + 1) })
            set('options', opts)
          }}>항목 추가</Button>
        </>
      )}

      {/* 버튼 */}
      {el.type === 'button' && (
        <>
          <Divider orientation="left" plain style={{ fontSize: 11, margin: '6px 0' }}>버튼</Divider>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div><div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>레이블</div>
              <Input size="small" value={(p.label as string) ?? ''} onChange={e => set('label', e.target.value)} /></div>
            <div><div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>스타일</div>
              <Select size="small" style={{ width: '100%' }} value={(p.buttonType as string) ?? 'primary'} onChange={v => set('buttonType', v)}
                options={[{value:'primary',label:'Primary (파란색)'},{value:'default',label:'Default (흰색)'},{value:'danger',label:'Danger (빨간색)'}]} /></div>
            <div><div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>동작</div>
              <Select size="small" style={{ width: '100%' }} value={(p.action as string) ?? 'submit'} onChange={v => set('action', v)}
                options={[{value:'submit',label:'저장/제출'},{value:'reset',label:'초기화'},{value:'close',label:'닫기'}]} /></div>
          </div>
        </>
      )}

      {/* 구분선 */}
      {el.type === 'divider' && (
        <>
          <Divider orientation="left" plain style={{ fontSize: 11, margin: '6px 0' }}>구분선</Divider>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div><div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>색상</div>
              <Input size="small" value={(p.dividerColor as string) ?? '#e0e0e0'} onChange={e => set('dividerColor', e.target.value)} /></div>
            <div><div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>두께 (px)</div>
              <InputNumber size="small" style={{ width: '100%' }} min={1} max={8} value={(p.thickness as number) ?? 1} onChange={v => set('thickness', v)} /></div>
            <div><div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>스타일</div>
              <Select size="small" style={{ width: '100%' }} value={(p.dividerStyle as string) ?? 'solid'} onChange={v => set('dividerStyle', v)}
                options={[{value:'solid',label:'실선'},{value:'dashed',label:'점선'}]} /></div>
          </div>
        </>
      )}

      {/* 사용자 프로필 */}
      {el.type === 'user-profile' && (
        <>
          <Divider orientation="left" plain style={{ fontSize: 11, margin: '6px 0' }}>사용자 프로필</Divider>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div>
              <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>배경 색상</div>
              <ColorPicker
                size="small"
                value={(p.bgColor as string) ?? '#1677ff'}
                onChange={c => set('bgColor', c.toHexString())}
                showText
              />
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>타이틀 (선택)</div>
              <Input size="small" value={(p.title as string) ?? ''} onChange={e => set('title', e.target.value)} placeholder="예) 내 정보" />
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>아바타 크기 (px)</div>
              <InputNumber size="small" style={{ width: '100%' }} min={40} max={160} value={(p.avatarSize as number) ?? 80} onChange={v => set('avatarSize', v)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Switch size="small" checked={p.showLogout !== false} onChange={v => set('showLogout', v)} />
              <Text style={{ fontSize: 12 }}>로그아웃 버튼 표시</Text>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── 메인 페이지 ─────────────────────────────────────────────
interface DragState {
  type: 'move' | 'resize'
  id: string
  handle?: Handle
  startMX: number; startMY: number
  startEX: number; startEY: number
  startEW: number; startEH: number
}

const CanvasDesignerPage: React.FC = () => {
  const { screenId } = useParams<{ screenId: string }>()
  const [searchParams] = useSearchParams()
  const fieldId = searchParams.get('fieldId') ? Number(searchParams.get('fieldId')) : null
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [elements, setElements] = useState<CanvasElement[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [canvasW, setCanvasW] = useState(420)
  const [canvasH, setCanvasH] = useState(720)
  const [canvasBg, setCanvasBg] = useState('#ffffff')
  const [previewMode, setPreviewMode] = useState(false)

  const dragState = useRef<DragState | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  // 화면 데이터 로드
  const { data: screen } = useQuery({
    queryKey: ['screenDetail', screenId],
    queryFn: () => api.get(`/schema/admin/screens/${screenId}`).then(r => r.data.data),
    enabled: !!screenId,
  })

  // 필드 모드: 특정 필드의 canvasConfig 로드
  const fieldData = fieldId != null
    ? (screen?.fields as Array<Record<string, unknown>> | undefined)?.find((f) => f.fieldId === fieldId)
    : null

  useEffect(() => {
    if (fieldId != null) {
      // 필드 모드: 필드의 extraConfig.canvasConfig에서 로드
      if (fieldData?.extraConfig) {
        const extra = fieldData.extraConfig as Record<string, unknown>
        const cfg = extra.canvasConfig as CanvasConfig | undefined
        if (cfg) {
          if (cfg.elements) setElements(cfg.elements)
          if (cfg.canvasWidth) setCanvasW(cfg.canvasWidth)
          if (cfg.canvasHeight) setCanvasH(cfg.canvasHeight)
          if (cfg.backgroundColor) setCanvasBg(cfg.backgroundColor)
        }
      }
    } else if (screen?.layoutConfig) {
      // 화면 모드: layoutConfig에서 로드
      try {
        const cfg: CanvasConfig = typeof screen.layoutConfig === 'string'
          ? JSON.parse(screen.layoutConfig)
          : screen.layoutConfig
        if (cfg.elements) setElements(cfg.elements)
        if (cfg.canvasWidth) setCanvasW(cfg.canvasWidth)
        if (cfg.canvasHeight) setCanvasH(cfg.canvasHeight)
        if (cfg.backgroundColor) setCanvasBg(cfg.backgroundColor)
      } catch { /* ignore */ }
    }
  }, [screen, fieldId, fieldData])

  // 화면 캔버스 저장
  const saveMutation = useMutation({
    mutationFn: () => {
      const canvasConfig: CanvasConfig = {
        canvasWidth: canvasW,
        canvasHeight: canvasH,
        backgroundColor: canvasBg,
        elements,
      }
      return api.post('/schema/admin/screens', {
        screenId,
        screenNm: screen?.screenNm,
        screenType: 'canvas',
        description: screen?.description,
        apiResource: screen?.apiResource,
        projectId: screen?.projectId,
        layoutConfig: JSON.stringify(canvasConfig),
        openType: screen?.openType ?? 'page',
      })
    },
    onSuccess: () => {
      message.success('저장되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['schema', screenId] })
    },
    onError: () => message.error('저장 중 오류가 발생했습니다.'),
  })

  // 필드 캔버스 저장 (canvas-section 필드 모드)
  const saveFieldMutation = useMutation({
    mutationFn: () => {
      if (!fieldData || !screenId) throw new Error('필드 데이터 없음')
      const canvasConfig: CanvasConfig = {
        canvasWidth: canvasW,
        canvasHeight: canvasH,
        backgroundColor: canvasBg,
        elements,
      }
      const extra = (fieldData.extraConfig as Record<string, unknown> | null) ?? {}
      return api.post(`/schema/admin/screens/${screenId}/fields`, {
        ...fieldData,
        extraConfig: { ...extra, canvasConfig },
      })
    },
    onSuccess: () => {
      message.success('캔버스 섹션이 저장되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['screenDetail', screenId] })
      navigate(`/admin/screens/${screenId}`)
    },
    onError: () => message.error('저장 중 오류가 발생했습니다.'),
  })

  // 요소 추가
  const addElement = (type: CanvasElementType, defaultW: number, defaultH: number) => {
    const id = genId()
    setElements(prev => {
      const y = prev.length > 0 ? Math.max(...prev.map(e => e.y + e.h)) + 10 : 20
      const el: CanvasElement = { id, type, x: 20, y, w: defaultW, h: defaultH, props: defaultProps(type) }
      return [...prev, el]
    })
    setSelectedId(id)
  }

  // 드래그 시작 (요소 이동)
  const handleElementMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setSelectedId(id)
    const el = elements.find(el => el.id === id)!
    dragState.current = {
      type: 'move', id,
      startMX: e.clientX, startMY: e.clientY,
      startEX: el.x, startEY: el.y,
      startEW: el.w, startEH: el.h,
    }
  }

  // 리사이즈 핸들 mousedown
  const handleResizeMouseDown = (e: React.MouseEvent, id: string, handle: Handle) => {
    e.stopPropagation()
    const el = elements.find(el => el.id === id)!
    dragState.current = {
      type: 'resize', id, handle,
      startMX: e.clientX, startMY: e.clientY,
      startEX: el.x, startEY: el.y,
      startEW: el.w, startEH: el.h,
    }
  }

  // 마우스 이동 (window 레벨)
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.current || !canvasRef.current) return
    const { type, id, handle, startMX, startMY, startEX, startEY, startEW, startEH } = dragState.current
    const dx = e.clientX - startMX
    const dy = e.clientY - startMY

    setElements(prev => prev.map(el => {
      if (el.id !== id) return el
      if (type === 'move') {
        return {
          ...el,
          x: Math.max(0, startEX + dx),
          y: Math.max(0, startEY + dy),
        }
      } else {
        // resize
        let x = startEX, y = startEY, w = startEW, h = startEH
        if (handle?.includes('e')) w = Math.max(40, startEW + dx)
        if (handle?.includes('s')) h = Math.max(20, startEH + dy)
        if (handle?.includes('w')) { x = startEX + dx; w = Math.max(40, startEW - dx) }
        if (handle?.includes('n')) { y = startEY + dy; h = Math.max(20, startEH - dy) }
        return { ...el, x, y, w, h }
      }
    }))
  }, [])

  const handleMouseUp = useCallback(() => { dragState.current = null }, [])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  // 속성 변경
  const handlePropsChange = (id: string, props: Partial<CanvasElement['props']>) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, props: { ...el.props, ...props } } : el))
  }
  const handleGeometryChange = (id: string, geo: Partial<Pick<CanvasElement,'x'|'y'|'w'|'h'>>) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...geo } : el))
  }
  const handleDelete = (id: string) => {
    setElements(prev => prev.filter(el => el.id !== id))
    setSelectedId(null)
  }

  const selectedEl = elements.find(el => el.id === selectedId) ?? null

  if (previewMode && screenId) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0f2f5' }}>
        <div style={{ padding: '12px 24px', background: '#fff', borderBottom: '1px solid #e8e8e8', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button onClick={() => setPreviewMode(false)}>← 디자이너로 돌아가기</Button>
          <Text strong>미리보기 모드</Text>
        </div>
        <div style={{ padding: 24 }}>
          <ScreenRenderer screenId={screenId} ignoreOpenType />
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#f0f2f5' }}>
      {/* 상단 툴바 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
        background: '#fff', borderBottom: '1px solid #e8e8e8', flexShrink: 0, zIndex: 10,
      }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(fieldId != null ? `/admin/screens/${screenId}` : '/admin/screens')}>
          {fieldId != null ? '화면 디자인으로' : '목록'}
        </Button>
        <div style={{ width: 1, height: 20, background: '#e8e8e8' }} />
        <Title level={5} style={{ margin: 0 }}>
          {fieldId != null
            ? `캔버스 섹션 편집 — ${(fieldData?.fieldLabel as string) ?? String(fieldId)}`
            : screen?.screenNm ?? '캔버스 디자이너'}
        </Title>
        <div style={{ flex: 1 }} />
        {/* 캔버스 크기 */}
        <Text style={{ fontSize: 12, color: '#888' }}>캔버스 크기:</Text>
        <InputNumber size="small" value={canvasW} onChange={v => setCanvasW(v ?? 420)} min={200} max={1920} style={{ width: 70 }} addonAfter="W" />
        <InputNumber size="small" value={canvasH} onChange={v => setCanvasH(v ?? 720)} min={200} max={3000} style={{ width: 70 }} addonAfter="H" />
        <Text style={{ fontSize: 12, color: '#888' }}>배경:</Text>
        <input type="color" value={canvasBg} onChange={e => setCanvasBg(e.target.value)}
          style={{ width: 28, height: 28, padding: 1, border: '1px solid #d9d9d9', borderRadius: 4, cursor: 'pointer' }} />
        {fieldId == null && (
          <Button icon={<EyeOutlined />} onClick={() => setPreviewMode(true)}>미리보기</Button>
        )}
        <Button
          type="primary" icon={<SaveOutlined />}
          loading={fieldId != null ? saveFieldMutation.isPending : saveMutation.isPending}
          onClick={() => fieldId != null ? saveFieldMutation.mutate() : saveMutation.mutate()}
        >저장</Button>
      </div>

      {/* 3-패널 레이아웃 */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 좌측 팔레트 */}
        <div style={{
          width: 160, flexShrink: 0, background: '#fff', borderRight: '1px solid #e8e8e8',
          overflowY: 'auto', padding: '12px 8px',
        }}>
          <Text style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 8, paddingLeft: 4 }}>요소 추가</Text>
          {PALETTE.map(item => (
            <button
              key={item.type}
              onClick={() => addElement(item.type, item.defaultW, item.defaultH)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '8px 10px', border: '1px solid #e8e8e8', borderRadius: 6,
                background: '#fafafa', cursor: 'pointer', marginBottom: 6,
                fontSize: 12, color: '#333', textAlign: 'left',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#e6f4ff'; (e.currentTarget as HTMLElement).style.borderColor = '#91caff' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fafafa'; (e.currentTarget as HTMLElement).style.borderColor = '#e8e8e8' }}
            >
              <span style={{ color: '#1677ff', fontSize: 14 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        {/* 중앙 캔버스 영역 */}
        <div style={{ flex: 1, overflow: 'auto', background: '#e8ecf0', display: 'flex', justifyContent: 'center', padding: '32px' }}>
          <div
            ref={canvasRef}
            style={{
              position: 'relative',
              width: canvasW,
              height: canvasH,
              background: canvasBg,
              boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
              borderRadius: 8,
              overflow: 'hidden',
              flexShrink: 0,
            }}
            onClick={e => { if (e.target === canvasRef.current) setSelectedId(null) }}
          >
            {elements.map(el => (
              <div
                key={el.id}
                style={{
                  position: 'absolute',
                  left: el.x,
                  top: el.y,
                  width: el.w,
                  height: el.h,
                  cursor: 'move',
                  userSelect: 'none',
                }}
                onMouseDown={e => handleElementMouseDown(e, el.id)}
              >
                <ElementPreview el={el} selected={el.id === selectedId} />
                {el.id === selectedId && HANDLES.map(h => (
                  <div
                    key={h}
                    style={handleStyle(h)}
                    onMouseDown={e => handleResizeMouseDown(e, el.id, h)}
                  />
                ))}
              </div>
            ))}

            {elements.length === 0 && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', color: '#bbb', gap: 8,
              }}>
                <div style={{ fontSize: 40 }}>🎨</div>
                <div style={{ fontSize: 14 }}>왼쪽 패널에서 요소를 추가하세요</div>
              </div>
            )}
          </div>
        </div>

        {/* 우측 속성 패널 */}
        <div style={{
          width: 260, flexShrink: 0, background: '#fff', borderLeft: '1px solid #e8e8e8',
          overflowY: 'auto',
        }}>
          {selectedEl ? (
            <PropsPanel
              el={selectedEl}
              onChange={handlePropsChange}
              onGeometry={handleGeometryChange}
              onDelete={handleDelete}
            />
          ) : (
            <div style={{ padding: 16, color: '#bbb', fontSize: 13, textAlign: 'center', marginTop: 40 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>←</div>
              요소를 클릭하면<br />속성을 편집할 수 있습니다
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CanvasDesignerPage
