// 화면 스키마 타입 정의 - 백엔드 ScreenSchemaDto와 1:1 대응

export type FieldType =
  | 'text' | 'password' | 'number' | 'date' | 'datetime'
  | 'select' | 'radio' | 'checkbox' | 'textarea'
  | 'file' | 'popup' | 'grid'

export type ScreenType = 'form' | 'grid' | 'master-detail' | 'popup'

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
  readonly: boolean
  hidden: boolean
  codeGroup?: string
  popupScreenId?: string
  extraConfig?: Record<string, unknown>
  validationRules: ValidationRule[]
}

export interface ScreenSchema {
  screenId: string
  screenNm: string
  screenType: ScreenType
  description?: string
  apiResource?: string
  layoutConfig?: Record<string, unknown>
  buttonConfig?: Record<string, unknown>
  version: number
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
