import React from 'react'
import {
  Input, InputNumber, DatePicker, Select, Radio,
  Checkbox, Upload, Button, message
} from 'antd'
import { SearchOutlined, UploadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { FieldDef } from '@/types/schema'
import api from '@/api/axios'

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
      // inject {{fieldNm}} template values from other fields
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

export const FieldRenderer: React.FC<Props> = ({
  field, value, onChange, error, disabled, codeOptions = [],
  formValues = {}, onSetError = () => {}
}) => {
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
    const events = field.extraConfig?.events as FieldEvents | undefined
    if (events?.onChange?.type) {
      executeEvent(events.onChange, field.fieldNm, val, { ...formValues, [field.fieldNm]: val }, onSetError, onChange)
    }
  }

  const handleBlur = () => {
    const events = field.extraConfig?.events as FieldEvents | undefined
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
          min={field.extraConfig?.min as number}
          max={field.extraConfig?.max as number}
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
          rows={field.extraConfig?.rows as number ?? 3}
        />
      )

    case 'file':
      return (
        <Upload disabled={isDisabled} beforeUpload={() => false} aria-label={field.fieldLabel}>
          <Button icon={<UploadOutlined />} disabled={isDisabled}>
            파일 선택
          </Button>
        </Upload>
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
