// 화면 스키마 타입 정의 - 백엔드 ScreenSchemaDto와 1:1 대응

export type FieldType =
  | 'text' | 'password' | 'number' | 'date' | 'datetime' | 'year' | 'month'
  | 'select' | 'radio' | 'checkbox' | 'textarea'
  | 'file' | 'popup' | 'grid' | 'editor'
  | 'date-range' | 'info-banner' | 'stat-card'

export type ScreenType = 'form' | 'grid' | 'master-detail' | 'popup' | 'composite'

export interface ValidationRule {
  ruleId: number
  ruleType: 'required' | 'minLength' | 'maxLength' | 'min' | 'max' | 'regex' | 'email' | 'number' | 'custom'
  ruleValue?: string
  errorMsg: string
  conditionJson?: ConditionJson
}

export interface ConditionJson {
  field: string
  operator: '==' | '!=' | '>' | '<' | 'in' | 'notIn'
  value: unknown
}

export interface FieldDef {
  fieldId: number
  fieldNm: string
  fieldLabel: string
  fieldType: FieldType
  inputType?: string
  placeholder?: string
  defaultValue?: string
  colSpan: number
  rowSpan: number
  sortOrder: number
  rowPos: number
  colPos: number
  readonly: boolean
  hidden: boolean
  codeGroup?: string
  popupScreenId?: string
  extraConfig?: Record<string, unknown>
  validationRules: ValidationRule[]
}

export interface ScreenSection {
  id: string
  type: 'form' | 'grid' | 'editor'
  title?: string
  fieldIds?: number[]   // form/editor 섹션 전용: 해당 섹션에 속하는 fieldId 목록 (미지정 시 모든 필드)
}

export type OpenType = 'page' | 'tab' | 'popup'

export interface ScreenSchema {
  screenId: string
  screenNm: string
  screenType: ScreenType
  description?: string
  apiResource?: string
  layoutConfig?: Record<string, unknown>
  buttonConfig?: Record<string, unknown>
  version: number
  openType?: OpenType
  fields: FieldDef[]
  // 권한
  canRead: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  canExcel: boolean
  canPrint: boolean
}

export interface ScreenListItem {
  screenId: string
  screenNm: string
  screenType: ScreenType
  description?: string
  version: number
}
