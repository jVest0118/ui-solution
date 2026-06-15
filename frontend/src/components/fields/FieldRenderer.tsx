import React, { useState } from 'react'
import {
  Input, InputNumber, DatePicker, Select, Radio,
  Checkbox, Upload, Button, message, Space, Typography, Alert, Progress
} from 'antd'
import {
  SearchOutlined, DownloadOutlined,
  DeleteOutlined, FileOutlined, CloudUploadOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import type { FieldDef } from '@/types/schema'
import api from '@/api/axios'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { InlineGrid } from './InlineGrid'
import type { GridConfig } from './GridFieldConfig'

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

interface FileUploadFieldProps {
  field: FieldDef
  value: FileValue | null
  onChange: (val: FileValue | null) => void
  disabled?: boolean
  error?: string
  extraConfig: Record<string, unknown>
}

const FileUploadField: React.FC<FileUploadFieldProps> = ({
  field, value, onChange, disabled, error, extraConfig,
}) => {
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)

  const doUpload = async (file: File) => {
    setUploading(true)
    setProgress(0)
    try {
      const form = new FormData()
      form.append('file', file)
      if (extraConfig.screenId) form.append('screenId', String(extraConfig.screenId))
      form.append('fieldNm', field.fieldNm)
      const res = await api.post('/files/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (evt.total) setProgress(Math.round((evt.loaded / evt.total) * 100))
        },
      })
      const data = res.data.data
      onChange({ fileId: data.fileId, originalNm: data.originalNm, fileSize: data.fileSize, contentType: data.contentType })
      message.success(`${file.name} 업로드 완료`)
    } catch {
      message.error('파일 업로드에 실패했습니다.')
      setProgress(0)
    } finally {
      setUploading(false)
    }
    return false
  }

  return (
    <div>
      {value?.fileId ? (
        <Space>
          <FileOutlined style={{ color: '#1677ff' }} />
          <Text>{value.originalNm}</Text>
          {value.fileSize && <Text type="secondary">({formatFileSize(value.fileSize)})</Text>}
          <Button size="small" icon={<DownloadOutlined />}
            onClick={() => window.open(`/api/files/${value.fileId}/download`, '_blank')}>
            다운로드
          </Button>
          {!disabled && (
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => onChange(null)}>
              삭제
            </Button>
          )}
        </Space>
      ) : (
        <>
          <Upload.Dragger
            disabled={disabled}
            showUploadList={false}
            beforeUpload={doUpload}
            customRequest={() => {}}
            style={{ padding: '8px 0' }}
          >
            <p className="ant-upload-drag-icon" style={{ marginBottom: 8 }}>
              <CloudUploadOutlined style={{ fontSize: 32, color: uploading ? '#52c41a' : '#1677ff' }} />
            </p>
            <p className="ant-upload-text" style={{ fontSize: 14, marginBottom: 4 }}>
              {uploading ? '업로드 중...' : '파일을 드래그하거나 클릭하여 업로드'}
            </p>
            <p className="ant-upload-hint">파일선택</p>
          </Upload.Dragger>
          {uploading && (
            <Progress
              percent={progress}
              size="small"
              status={progress === 100 ? 'success' : 'active'}
              style={{ marginTop: 8 }}
            />
          )}
        </>
      )}
      {error && <div style={{ color: '#ff4d4f', fontSize: 12, marginTop: 4 }}>{error}</div>}
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
    const events = extraConfig.events as FieldEvents | undefined
    if (events?.onChange?.type) {
      executeEvent(events.onChange, field.fieldNm, val, { ...formValues, [field.fieldNm]: val }, onSetError, onChange)
    }
  }

  const handleBlur = () => {
    const events = extraConfig.events as FieldEvents | undefined
    if (events?.onBlur?.type) {
      executeEvent(events.onBlur, field.fieldNm, value, formValues, onSetError, onChange)
    }
  }

  switch (field.fieldType) {
    case 'text':
      return (
        <Input
          {...commonProps}
          type={field.inputType || 'text'}
          value={value as string ?? ''}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          status={status}
        />
      )

    case 'password':
      return (
        <Input.Password
          {...commonProps}
          value={value as string ?? ''}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          status={status}
          autoComplete="current-password"
        />
      )

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
        <DatePicker
          {...commonProps}
          value={value ? dayjs(value as string) : null}
          onChange={(d) => handleChange(d ? d.format('YYYY-MM-DD') : null)}
          status={status}
          style={{ width: '100%' }}
          format="YYYY-MM-DD"
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

    case 'file':
      return (
        <FileUploadField
          field={field}
          value={value as FileValue | null}
          onChange={(val) => handleChange(val)}
          disabled={isDisabled}
          error={error}
          extraConfig={extraConfig}
        />
      )

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
