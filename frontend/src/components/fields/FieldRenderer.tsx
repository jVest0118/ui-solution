import React, { useState, useRef, useEffect } from 'react'
import {
  Input, InputNumber, DatePicker, Select, Radio,
  Checkbox, Upload, Button, message, Typography, Alert, Progress, Space
} from 'antd'
import {
  SearchOutlined, CheckOutlined, PaperClipOutlined,
  CloseOutlined, FileOutlined, CloudUploadOutlined, CalendarOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import type { FieldDef } from '@/types/schema'
import type { EventBinding } from '@/types/events'
import { executeActions, getBindingsForEvent } from '@/utils/eventActionExecutor'
import api from '@/api/axios'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { InlineGrid } from './InlineGrid'
import type { GridConfig } from './GridFieldConfig'
import CanvasPageRenderer from '@/components/renderer/CanvasPageRenderer'

const { Text } = Typography

interface EventAction {
  type?: 'API_CALL' | 'SET_VALUE'
  endpoint?: string
  errorCondition?: string
  errorMessage?: string
  targetField?: string
}

interface FieldEvents {
  onBlur?: EventAction
  onChange?: EventAction
}

interface FileValue {
  fileId: number
  originalNm: string
  fileSize?: number
  contentType?: string
}

interface Props {
  field: FieldDef
  value: unknown
  onChange: (fieldNm: string, value: unknown) => void
  error?: string
  disabled?: boolean
  codeOptions?: { label: string; value: string }[]
  formValues?: Record<string, unknown>
  onSetError?: (fieldNm: string, msg: string | undefined) => void
}

async function executeEvent(
  action: EventAction,
  fieldNm: string,
  value: unknown,
  formValues: Record<string, unknown>,
  onSetError: (fieldNm: string, msg: string | undefined) => void,
  onChange: (fieldNm: string, value: unknown) => void
) {
  if (!action.type) return

  if (action.type === 'API_CALL' && action.endpoint) {
    try {
      const params: Record<string, string> = { [fieldNm]: String(value ?? '') }
      Object.entries(formValues).forEach(([k, v]) => { params[k] = String(v ?? '') })
      const res = await api.get(action.endpoint, { params: { [fieldNm]: String(value ?? '') } })
      const data = res.data.data

      if (action.errorCondition && data != null) {
        const total = typeof data === 'object' && data !== null ? (data as Record<string, unknown>).total : null
        const conditionMet = action.errorCondition.includes('> 0')
          ? Number(total) > 0
          : action.errorCondition.includes('== 0')
            ? Number(total) === 0
            : false
        if (conditionMet) {
          onSetError(fieldNm, action.errorMessage ?? '유효하지 않은 값입니다')
          return
        }
      }
      onSetError(fieldNm, undefined)

      if (action.targetField && data) {
        const val = typeof data === 'object' ? (data as Record<string, unknown>)[action.targetField] : null
        if (val !== undefined) onChange(action.targetField, val)
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      message.error(err.response?.data?.message ?? '이벤트 실행 중 오류가 발생했습니다')
    }
  }

  if (action.type === 'SET_VALUE' && action.targetField) {
    onChange(action.targetField, '')
  }
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

interface UploadingEntry { key: string; name: string; progress: number }

// ─── Kakao Postcode API 전역 타입 ────────────────────────────
declare global {
  interface Window {
    daum?: {
      Postcode: new (opts: {
        oncomplete: (data: { zonecode: string; roadAddress: string; jibunAddress: string }) => void
      }) => { open: () => void }
    }
  }
}

// ─── 주소 입력 필드 ──────────────────────────────────────────
interface AddressFormFieldProps {
  value: string                                    // 주소 (fieldNm)
  formValues: Record<string, unknown>
  onChange: (fieldNm: string, value: unknown) => void
  fieldNm: string
  fieldNmZip: string
  fieldNmAddrDetail: string
  searchBtnLabel: string
  disabled: boolean
  error?: string
  placeholder?: string
}

const AddressFormField: React.FC<AddressFormFieldProps> = ({
  value, formValues, onChange, fieldNm, fieldNmZip, fieldNmAddrDetail,
  searchBtnLabel, disabled, error, placeholder,
}) => {
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
        onChange(fieldNmZip, data.zonecode)
        onChange(fieldNm, data.roadAddress || data.jibunAddress)
      },
    }).open()
  }

  const inputStyle: React.CSSProperties = {
    border: `1px solid ${error ? '#ff4d4f' : '#d9d9d9'}`,
    borderRadius: 6, padding: '4px 11px', fontSize: 14,
    outline: 'none', width: '100%', boxSizing: 'border-box',
    background: '#f5f5f5', color: '#555', cursor: 'not-allowed',
    lineHeight: '22px', height: 32,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* 우편번호 + 검색 버튼 */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          readOnly
          value={(formValues[fieldNmZip] as string) ?? ''}
          placeholder="우편번호"
          style={{ ...inputStyle, width: 110 }}
        />
        <Button
          onClick={openPostcode}
          disabled={disabled}
          type="primary"
          style={{ flexShrink: 0 }}
        >
          {searchBtnLabel}
        </Button>
      </div>
      {/* 주소 (비활성) */}
      <input
        readOnly
        value={value ?? ''}
        placeholder={placeholder ?? '주소 검색 후 자동 입력'}
        style={inputStyle}
      />
      {/* 상세 주소 (직접 입력) */}
      <Input
        disabled={disabled}
        value={(formValues[fieldNmAddrDetail] as string) ?? ''}
        onChange={e => onChange(fieldNmAddrDetail, e.target.value)}
        placeholder="상세 주소를 입력하세요"
        status={error ? 'error' : undefined}
      />
      {error && <div style={{ color: '#ff4d4f', fontSize: 12 }}>{error}</div>}
    </div>
  )
}

// ─── 핸드폰 번호 필드 ────────────────────────────────────────
interface PhoneFormFieldProps {
  value: string                                    // 조합된 번호 "010-XXXX-XXXX"
  onChange: (fieldNm: string, value: unknown) => void
  fieldNm: string
  prefix: string
  disabled: boolean
  error?: string
}

const PhoneFormField: React.FC<PhoneFormFieldProps> = ({
  value, onChange, fieldNm, prefix, disabled, error,
}) => {
  // 현재 value에서 파트 분리
  const parts = (value ?? '').split('-')
  const [p2, setP2] = useState(parts[1] ?? '')
  const [p3, setP3] = useState(parts[2] ?? '')
  const ref3 = useRef<HTMLInputElement>(null)

  // 외부 value 변경 시 동기화
  useEffect(() => {
    const ps = (value ?? '').split('-')
    setP2(ps[1] ?? '')
    setP3(ps[2] ?? '')
  }, [value])

  const compose = (second: string, third: string) => {
    const composed = `${prefix}-${second}-${third}`
    onChange(fieldNm, composed)
  }

  const inputStyle: React.CSSProperties = {
    border: `1px solid ${error ? '#ff4d4f' : '#d9d9d9'}`,
    borderRadius: 6, padding: '4px 8px', fontSize: 14,
    outline: 'none', textAlign: 'center', boxSizing: 'border-box',
    height: 32, transition: 'border-color 0.2s',
    background: disabled ? '#f5f5f5' : '#fff',
    cursor: disabled ? 'not-allowed' : 'text',
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* 첫 번째 고정 */}
        <input
          readOnly
          value={prefix}
          style={{ ...inputStyle, width: 54, background: '#f5f5f5', color: '#555', cursor: 'not-allowed' }}
        />
        <span style={{ color: '#aaa', fontWeight: 600 }}>-</span>
        {/* 두 번째: 4자리 → 자동 이동 */}
        <input
          type="tel"
          maxLength={4}
          disabled={disabled}
          value={p2}
          placeholder="0000"
          style={{ ...inputStyle, flex: 1 }}
          onChange={e => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 4)
            setP2(v)
            compose(v, p3)
            if (v.length === 4) ref3.current?.focus()
          }}
          onFocus={e => { e.target.style.borderColor = '#1677ff' }}
          onBlur={e => { e.target.style.borderColor = error ? '#ff4d4f' : '#d9d9d9' }}
        />
        <span style={{ color: '#aaa', fontWeight: 600 }}>-</span>
        {/* 세 번째: 4자리 */}
        <input
          ref={ref3}
          type="tel"
          maxLength={4}
          disabled={disabled}
          value={p3}
          placeholder="0000"
          style={{ ...inputStyle, flex: 1 }}
          onChange={e => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 4)
            setP3(v)
            compose(p2, v)
          }}
          onFocus={e => { e.target.style.borderColor = '#1677ff' }}
          onBlur={e => { e.target.style.borderColor = error ? '#ff4d4f' : '#d9d9d9' }}
        />
      </div>
      {error && <div style={{ color: '#ff4d4f', fontSize: 12, marginTop: 4 }}>{error}</div>}
    </div>
  )
}

// ─── 날짜 입력 필드 (YYYYMMDD 자동변환 + 달력) ──────────────
interface SmartDateFieldProps {
  value: string
  onChange: (val: string | null) => void
  disabled: boolean
  error?: string
  placeholder?: string
  format?: string
}

const SmartDateField: React.FC<SmartDateFieldProps> = ({
  value, onChange, disabled, error, placeholder, format = 'YYYY-MM-DD',
}) => {
  const [text, setText] = useState(value ?? '')
  const calRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setText(value ?? '') }, [value])

  const applyFormat = (digits: string): string => {
    const y = digits.slice(0, 4), m = digits.slice(4, 6), d = digits.slice(6, 8)
    if (format === 'YYYYMMDD') return `${y}${m}${d}`
    if (format === 'YYYY/MM/DD') return `${y}/${m}/${d}`
    return `${y}-${m}-${d}`
  }

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    const digits = raw.replace(/\D/g, '')
    if (digits.length >= 8) {
      const formatted = applyFormat(digits)
      setText(formatted)
      onChange(formatted)
    } else {
      setText(raw)
      if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(raw)) onChange(raw)
      else if (raw === '') onChange(null)
    }
  }

  const handleCalendar = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return
    const digits = e.target.value.replace(/-/g, '')
    const formatted = applyFormat(digits)
    setText(formatted)
    onChange(formatted)
  }

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <input
        type="text"
        value={text}
        onChange={handleInput}
        disabled={disabled}
        placeholder={placeholder ?? `${format} 또는 YYYYMMDD`}
        style={{
          flex: 1, boxSizing: 'border-box',
          border: `1px solid ${error ? '#ff4d4f' : '#d9d9d9'}`,
          borderRadius: 6, padding: '4px 36px 4px 11px',
          fontSize: 14, outline: 'none', height: 32,
          background: disabled ? '#f5f5f5' : '#fff',
          transition: 'border-color 0.2s',
        }}
        onFocus={e => { if (!disabled) e.target.style.borderColor = '#1677ff' }}
        onBlur={e => { e.target.style.borderColor = error ? '#ff4d4f' : '#d9d9d9' }}
      />
      {!disabled && (
        <CalendarOutlined
          onClick={() => calRef.current?.showPicker?.() ?? calRef.current?.click()}
          style={{
            position: 'absolute', right: 10, cursor: 'pointer',
            color: '#1677ff', fontSize: 15,
          }}
        />
      )}
      <input
        ref={calRef}
        type="date"
        onChange={handleCalendar}
        style={{ position: 'absolute', right: 0, opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
      />
    </div>
  )
}

interface FileUploadFieldProps {
  field: FieldDef
  value: FileValue[]
  onChange: (val: FileValue[]) => void
  disabled?: boolean
  error?: string
  extraConfig: Record<string, unknown>
}

const FileUploadField: React.FC<FileUploadFieldProps> = ({
  field, value, onChange, disabled, error, extraConfig,
}) => {
  const [uploadingList, setUploadingList] = useState<UploadingEntry[]>([])
  const maxCount = (extraConfig.maxCount as number) ?? 5
  const files: FileValue[] = Array.isArray(value) ? value
    : value && typeof value === 'object' && 'fileId' in (value as object) ? [value as FileValue]
    : []

  // ref로 최신 files 추적 (병렬 업로드 race condition 방지)
  const filesRef = useRef(files)
  useEffect(() => { filesRef.current = files }, [files])

  const canUpload = !disabled && files.length + uploadingList.length < maxCount
  const totalSize = files.reduce((sum, f) => sum + (f.fileSize ?? 0), 0)

  const doUpload = async (file: File) => {
    if (filesRef.current.length + uploadingList.length >= maxCount) {
      message.warning(`최대 ${maxCount}개까지 업로드할 수 있습니다.`)
      return false
    }
    const key = `${file.name}-${Date.now()}`
    setUploadingList(prev => [...prev, { key, name: file.name, progress: 0 }])
    try {
      const form = new FormData()
      form.append('file', file)
      if (extraConfig.screenId) form.append('screenId', String(extraConfig.screenId))
      form.append('fieldNm', field.fieldNm)
      const res = await api.post('/files/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (evt.total) {
            const pct = Math.round((evt.loaded / evt.total) * 100)
            setUploadingList(prev => prev.map(u => u.key === key ? { ...u, progress: pct } : u))
          }
        },
      })
      const data = res.data.data
      const newFile: FileValue = {
        fileId: data.fileId, originalNm: data.originalNm,
        fileSize: data.fileSize, contentType: data.contentType,
      }
      const next = [...filesRef.current, newFile]
      filesRef.current = next
      onChange(next)
      message.success(`${file.name} 업로드 완료`)
    } catch {
      message.error(`${file.name} 업로드에 실패했습니다.`)
    } finally {
      setUploadingList(prev => prev.filter(u => u.key !== key))
    }
    return false
  }

  const removeFile = (fileId: number) => {
    const next = files.filter(f => f.fileId !== fileId)
    onChange(next)
  }

  const hasFiles = files.length > 0 || uploadingList.length > 0

  return (
    <div style={{ border: '1px solid #e8e8e8', borderRadius: 6, overflow: 'hidden' }}>
      {/* 헤더 바 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        padding: '6px 10px', background: '#fafafa',
        borderBottom: hasFiles ? '1px solid #e8e8e8' : 'none',
      }}>
        <Upload
          disabled={!canUpload}
          showUploadList={false}
          beforeUpload={doUpload}
          customRequest={() => {}}
          multiple
        >
          <Button icon={<PaperClipOutlined />} size="small" disabled={!canUpload}>
            파일 첨부하기
          </Button>
        </Upload>

        {files.length > 0 && !disabled && (
          <Button size="small" onClick={() => { onChange([]); filesRef.current = [] }}>
            모두삭제
          </Button>
        )}

        {files.length > 0 && (
          <Text style={{ fontSize: 12, color: '#52c41a', fontWeight: 500 }}>
            <CheckOutlined style={{ marginRight: 3 }} />
            {files.length}개 업로드 완료
          </Text>
        )}

        <Text type="secondary" style={{ fontSize: 11, marginLeft: 'auto', whiteSpace: 'nowrap' }}>
          {totalSize > 0 ? `${formatFileSize(totalSize)} · ` : ''}최대 {maxCount}개
        </Text>
      </div>

      {/* 업로드 중 진행 바 */}
      {uploadingList.map(u => (
        <div key={u.key} style={{ padding: '6px 10px', background: '#f0f5ff', borderBottom: '1px solid #d6e4ff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <Text style={{ fontSize: 12 }} ellipsis>{u.name}</Text>
            <Text style={{ fontSize: 11, color: '#1677ff', flexShrink: 0, marginLeft: 8 }}>{u.progress}%</Text>
          </div>
          <Progress percent={u.progress} size="small" status={u.progress === 100 ? 'success' : 'active'} showInfo={false} />
        </div>
      ))}

      {/* 업로드된 파일 목록 */}
      {files.map((file, idx) => (
        <div key={file.fileId} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px',
          background: '#fff',
          borderBottom: idx < files.length - 1 ? '1px solid #f5f5f5' : 'none',
        }}>
          {!disabled && (
            <CloseOutlined
              style={{ fontSize: 10, color: '#bbb', cursor: 'pointer', flexShrink: 0, padding: 2 }}
              onClick={() => removeFile(file.fileId)}
            />
          )}
          <FileOutlined style={{ color: '#1677ff', flexShrink: 0 }} />
          <Text
            ellipsis
            style={{ flex: 1, fontSize: 12, cursor: 'pointer', color: '#1677ff', minWidth: 0 }}
            title={file.originalNm}
            onClick={() => window.open(`/api/files/${file.fileId}/download`, '_blank')}
          >
            {file.originalNm}
          </Text>
          {file.fileSize && (
            <Text type="secondary" style={{ fontSize: 11, flexShrink: 0 }}>
              {formatFileSize(file.fileSize)}
            </Text>
          )}
        </div>
      ))}

      {/* 드래그앤드랍 영역 */}
      {canUpload && (
        <Upload.Dragger
          disabled={!canUpload}
          showUploadList={false}
          beforeUpload={doUpload}
          customRequest={() => {}}
          multiple
          style={{ border: 'none', borderTop: hasFiles ? '1px dashed #d9d9d9' : 'none', borderRadius: 0 }}
        >
          <p className="ant-upload-drag-icon" style={{ marginBottom: 4 }}>
            <CloudUploadOutlined style={{ fontSize: 22, color: '#aaa' }} />
          </p>
          <p className="ant-upload-text" style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>
            드래그하거나 클릭하여 파일 추가
          </p>
          <p className="ant-upload-hint" style={{ fontSize: 11 }}>
            {files.length}/{maxCount}개 · {maxCount - files.length}개 더 추가 가능
          </p>
        </Upload.Dragger>
      )}

      {error && <div style={{ color: '#ff4d4f', fontSize: 12, padding: '4px 10px' }}>{error}</div>}
    </div>
  )
}

export const FieldRenderer: React.FC<Props> = ({
  field, value, onChange, error, disabled, codeOptions = [],
  formValues = {}, onSetError = () => {}
}) => {
  // extraConfig는 백엔드에서 JSON 문자열로 올 수 있으므로 정규화
  const extraConfig: Record<string, unknown> = (() => {
    const raw = field.extraConfig
    if (!raw) return {}
    if (typeof raw === 'string') {
      try { return JSON.parse(raw) as Record<string, unknown> } catch { return {} }
    }
    return raw
  })()

  const isDisabled = disabled || field.readonly
  const commonProps = {
    disabled: isDisabled,
    placeholder: field.placeholder,
    'aria-label': field.fieldLabel,
    'aria-required': field.validationRules.some(r => r.ruleType === 'required'),
    'aria-invalid': !!error,
    ...(error ? { 'aria-describedby': `${field.fieldNm}-error` } : {}),
  }
  const status = error ? 'error' as const : undefined

  const handleChange = (val: unknown) => {
    onChange(field.fieldNm, val)
    // 기존 레거시 이벤트
    const events = extraConfig.events as FieldEvents | undefined
    if (events?.onChange?.type) {
      executeEvent(events.onChange, field.fieldNm, val, { ...formValues, [field.fieldNm]: val }, onSetError, onChange)
    }
    // 새 eventBindings
    const bindings = extraConfig.eventBindings as EventBinding[] | undefined
    const actions = getBindingsForEvent(bindings, 'onChange')
    if (actions.length) {
      executeActions(actions, {
        formValues: { ...formValues, [field.fieldNm]: val },
        fieldValue: val,
        fieldNm: field.fieldNm,
        setFieldValue: onChange,
        onSetError,
      })
    }
  }

  const handleBlur = () => {
    // 기존 레거시 이벤트
    const events = extraConfig.events as FieldEvents | undefined
    if (events?.onBlur?.type) {
      executeEvent(events.onBlur, field.fieldNm, value, formValues, onSetError, onChange)
    }
    // 새 eventBindings
    const bindings = extraConfig.eventBindings as EventBinding[] | undefined
    const actions = getBindingsForEvent(bindings, 'onBlur')
    if (actions.length) {
      executeActions(actions, {
        formValues,
        fieldValue: value,
        fieldNm: field.fieldNm,
        setFieldValue: onChange,
        onSetError,
      })
    }
  }

  switch (field.fieldType) {
    case 'text': {
      const behavior = extraConfig.behavior as string | undefined
      const isNameField = behavior === 'name'
      return (
        <Input
          {...commonProps}
          type={field.inputType || 'text'}
          value={value as string ?? ''}
          onChange={e => {
            const v = isNameField ? e.target.value.replace(/\s/g, '') : e.target.value
            handleChange(v)
          }}
          onBlur={handleBlur}
          status={status}
        />
      )
    }

    case 'password': {
      const minLen = (extraConfig.minLength as number) ?? 8
      return (
        <div>
          <Input.Password
            {...commonProps}
            value={value as string ?? ''}
            onChange={e => handleChange(e.target.value)}
            onBlur={e => {
              handleBlur()
              const v = e.target.value
              if (v && v.length < minLen) {
                onSetError(field.fieldNm, `비밀번호는 ${minLen}자 이상이어야 합니다.`)
              } else {
                onSetError(field.fieldNm, undefined)
              }
            }}
            status={status}
            autoComplete="current-password"
          />
          {error && <div style={{ color: '#ff4d4f', fontSize: 12, marginTop: 2 }}>{error}</div>}
          {!error && <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{minLen}자 이상 입력</div>}
        </div>
      )
    }

    case 'number':
      return (
        <InputNumber
          {...commonProps}
          value={value as number}
          onChange={(val) => { handleChange(val); handleBlur() }}
          status={status}
          style={{ width: '100%' }}
          min={extraConfig.min as number}
          max={extraConfig.max as number}
        />
      )

    case 'date':
      return (
        <SmartDateField
          value={value as string ?? ''}
          onChange={val => handleChange(val)}
          disabled={isDisabled}
          error={error}
          placeholder={field.placeholder}
          format={(extraConfig.format as string) ?? 'YYYY-MM-DD'}
        />
      )

    case 'datetime':
      return (
        <DatePicker
          {...commonProps}
          showTime
          value={value ? dayjs(value as string) : null}
          onChange={(d) => handleChange(d ? d.format('YYYY-MM-DD HH:mm:ss') : null)}
          status={status}
          style={{ width: '100%' }}
          format="YYYY-MM-DD HH:mm:ss"
        />
      )

    case 'select':
      return (
        <Select
          {...commonProps}
          value={value as string}
          onChange={(val) => { handleChange(val); handleBlur() }}
          options={codeOptions}
          status={status}
          style={{ width: '100%' }}
          allowClear
        />
      )

    case 'radio':
      return (
        <Radio.Group
          disabled={isDisabled}
          value={value}
          onChange={(e) => { handleChange(e.target.value); handleBlur() }}
          aria-label={field.fieldLabel}
        >
          {codeOptions.map((opt) => (
            <Radio key={opt.value} value={opt.value}>{opt.label}</Radio>
          ))}
        </Radio.Group>
      )

    case 'checkbox':
      return (
        <Checkbox
          disabled={isDisabled}
          checked={!!value}
          onChange={(e) => handleChange(e.target.checked)}
          aria-label={field.fieldLabel}
        >
          {field.fieldLabel}
        </Checkbox>
      )

    case 'textarea':
      return (
        <Input.TextArea
          {...commonProps}
          value={value as string ?? ''}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          status={status}
          rows={extraConfig.rows as number ?? 4}
          autoSize={{ minRows: extraConfig.rows as number ?? 4, maxRows: 20 }}
        />
      )

    case 'editor':
      return (
        <RichTextEditor
          value={value as string ?? ''}
          onChange={(html) => handleChange(html)}
          placeholder={field.placeholder ?? '내용을 입력하세요...'}
          disabled={isDisabled}
          minHeight={extraConfig.minHeight as number ?? 200}
        />
      )

    case 'grid': {
      const gridConfig = (extraConfig.gridConfig ?? { columns: [] }) as GridConfig
      const rows = (value as Record<string, unknown>[] | undefined) ?? []
      return (
        <InlineGrid
          config={gridConfig}
          value={rows}
          onChange={(newRows) => onChange(field.fieldNm, newRows)}
          disabled={isDisabled}
        />
      )
    }

    case 'file': {
      // 구버전 단일 FileValue 객체 → 배열로 정규화
      const fileArr: FileValue[] = Array.isArray(value) ? (value as FileValue[])
        : value && typeof value === 'object' && 'fileId' in (value as object) ? [value as FileValue]
        : []
      return (
        <FileUploadField
          field={field}
          value={fileArr}
          onChange={(val) => handleChange(val)}
          disabled={isDisabled}
          error={error}
          extraConfig={extraConfig}
        />
      )
    }

    case 'year':
      return (
        <DatePicker
          {...commonProps}
          picker="year"
          value={value ? dayjs(String(value), 'YYYY') : null}
          onChange={(d) => handleChange(d ? d.format('YYYY') : null)}
          status={status}
          style={{ width: '100%' }}
          format="YYYY"
        />
      )

    case 'month':
      return (
        <DatePicker
          {...commonProps}
          picker="month"
          value={value ? dayjs(String(value), 'YYYY-MM') : null}
          onChange={(d) => handleChange(d ? d.format('YYYY-MM') : null)}
          status={status}
          style={{ width: '100%' }}
          format="YYYY-MM"
        />
      )

    case 'date-range': {
      const rangeVal = value as { start?: string; end?: string } | null
      return (
        <DatePicker.RangePicker
          disabled={isDisabled}
          value={rangeVal?.start && rangeVal?.end
            ? [dayjs(rangeVal.start), dayjs(rangeVal.end)]
            : null}
          onChange={(dates) => handleChange(
            dates ? { start: dates[0]?.format('YYYY-MM-DD'), end: dates[1]?.format('YYYY-MM-DD') } : null
          )}
          status={status}
          style={{ width: '100%' }}
          format={(extraConfig.format as string) ?? 'YYYY-MM-DD'}
        />
      )
    }

    case 'info-banner': {
      const bannerType = (extraConfig.bannerType as 'info' | 'warning' | 'success' | 'error') ?? 'info'
      const content = (extraConfig.content as string) ?? field.fieldLabel ?? ''
      return (
        <Alert
          type={bannerType}
          showIcon
          message={<div dangerouslySetInnerHTML={{ __html: content }} />}
          style={{ width: '100%' }}
        />
      )
    }

    case 'stat-card': {
      const numVal = typeof value === 'number' ? value : Number(value ?? 0)
      const color = (extraConfig.color as string) ?? '#1677ff'
      const suffix = (extraConfig.suffix as string) ?? ''
      const showPercent = (extraConfig.showPercent as boolean) ?? false
      const totalFieldNm = extraConfig.totalField as string | undefined
      const totalVal = totalFieldNm ? Number(formValues[totalFieldNm] ?? 0) : 0
      const percent = showPercent && totalVal > 0 ? Math.round((numVal / totalVal) * 100) : 0
      return (
        <div style={{
          background: '#fafafa', border: '1px solid #e8e8e8',
          borderRadius: 8, padding: '14px 18px', textAlign: 'center', width: '100%',
        }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 6, whiteSpace: 'nowrap' }}>
            {field.fieldLabel}
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1.2 }}>
            {numVal.toLocaleString()}
            {suffix && <span style={{ fontSize: 13, marginLeft: 2, fontWeight: 400 }}>{suffix}</span>}
          </div>
          {showPercent && (
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 3 }}>({percent}%)</div>
          )}
        </div>
      )
    }

    case 'address':
      return (
        <AddressFormField
          value={value as string ?? ''}
          formValues={formValues}
          onChange={onChange}
          fieldNm={field.fieldNm}
          fieldNmZip={(extraConfig.fieldNmZip as string) ?? `${field.fieldNm}Zip`}
          fieldNmAddrDetail={(extraConfig.fieldNmAddrDetail as string) ?? `${field.fieldNm}Detail`}
          searchBtnLabel={(extraConfig.searchBtnLabel as string) ?? '주소검색'}
          disabled={isDisabled}
          error={error}
          placeholder={field.placeholder}
        />
      )

    case 'phone':
      return (
        <PhoneFormField
          value={value as string ?? ''}
          onChange={onChange}
          fieldNm={field.fieldNm}
          prefix={(extraConfig.prefix as string) ?? '010'}
          disabled={isDisabled}
          error={error}
        />
      )

    case 'popup':
      return (
        <Input.Search
          {...commonProps}
          value={value as string ?? ''}
          onChange={(e) => handleChange(e.target.value)}
          status={status}
          enterButton={<SearchOutlined />}
          readOnly
        />
      )

    case 'canvas-section': {
      // 캔버스 섹션: extraConfig.canvasConfig를 CanvasPageRenderer로 렌더링
      const canvasConfig = extraConfig.canvasConfig
      if (!canvasConfig) {
        return (
          <div style={{
            padding: 16, textAlign: 'center', color: '#bbb',
            border: '1px dashed #d9d9d9', borderRadius: 6, width: '100%',
          }}>
            캔버스 섹션 (설계 필요)
          </div>
        )
      }
      return (
        <div style={{ width: '100%', overflow: 'hidden', borderRadius: 6 }}>
          <CanvasPageRenderer
            config={canvasConfig as import('@/types/schema').CanvasConfig}
            screenId={field.fieldNm}
          />
        </div>
      )
    }

    default:
      return (
        <Input
          {...commonProps}
          value={value as string ?? ''}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          status={status}
        />
      )
  }
}
