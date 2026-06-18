// 화면 스키마 타입 정의 - 백엔드 ScreenSchemaDto와 1:1 대응

export type FieldType =
  | 'text' | 'password' | 'number' | 'date' | 'datetime' | 'year' | 'month'
  | 'select' | 'radio' | 'checkbox' | 'textarea'
  | 'file' | 'popup' | 'grid' | 'editor'
  | 'date-range' | 'info-banner' | 'stat-card'
  | 'address' | 'phone'
  | 'canvas-section'

export type ScreenType = 'form' | 'grid' | 'master-detail' | 'popup' | 'composite' | 'dashboard' | 'report' | 'canvas'

// ─── 캔버스 자유 배치형 ───────────────────────────────────────
export type CanvasElementType =
  | 'heading' | 'paragraph'
  | 'text-input' | 'split-input'
  | 'address-input' | 'phone-input' | 'date-input'
  | 'button' | 'divider' | 'checkbox-group'
  | 'user-profile'

export interface SplitPart {
  fieldNm: string
  maxLength: number
  width?: number    // px
  mask?: boolean    // true면 ●●● 표시
  separator?: string // 이 파트 다음에 오는 구분 문자 (예: '-')
}

export interface CanvasElement {
  id: string
  type: CanvasElementType
  x: number
  y: number
  w: number
  h: number
  zIndex?: number
  props: {
    // heading / paragraph
    text?: string
    fontSize?: number
    fontWeight?: string
    color?: string
    textAlign?: 'left' | 'center' | 'right'
    underline?: boolean
    italic?: boolean
    // inputs 공통
    label?: string
    fieldNm?: string
    placeholder?: string
    labelPosition?: 'top' | 'none'
    inputType?: string
    required?: boolean
    // split-input
    parts?: SplitPart[]
    // checkbox-group
    options?: { value: string; label: string; required?: boolean }[]
    // button
    buttonType?: 'primary' | 'default' | 'danger'
    action?: 'submit' | 'reset'
    // divider
    dividerColor?: string
    thickness?: number
    dividerStyle?: 'solid' | 'dashed'
    // text-input behavior
    behavior?: 'normal' | 'name' | 'password'
    minLength?: number
    // address-input
    fieldNmZip?: string
    fieldNmAddr?: string
    fieldNmAddrDetail?: string
    searchBtnLabel?: string
    // phone-input
    fieldNm1?: string
    fieldNm2?: string
    fieldNm3?: string
    prefix?: string
    // date-input
    format?: string
    [key: string]: unknown
  }
}

export interface CanvasConfig {
  canvasWidth: number
  canvasHeight: number
  backgroundColor?: string
  elements: CanvasElement[]
}

export type ReportColumnFormat = 'text' | 'number' | 'currency' | 'date' | 'percent'

export interface ReportColumn {
  id: string
  field: string
  label: string
  width?: number
  align?: 'left' | 'center' | 'right'
  format?: ReportColumnFormat
  showSubtotal?: boolean
}

export interface ReportConfig {
  title?: string
  subtitle?: string
  apiEndpoint?: string
  columns: ReportColumn[]
  groupBy?: string
  showTotal?: boolean
  orientation?: 'portrait' | 'landscape'
}

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
  type: 'form' | 'grid' | 'editor' | 'canvas'
  title?: string
  fieldIds?: number[]      // form/editor 섹션 전용: 해당 섹션에 속하는 fieldId 목록 (미지정 시 모든 필드)
  canvasConfig?: CanvasConfig  // canvas 섹션 전용: 자유 배치 캔버스 설정
}

export type OpenType = 'page' | 'tab' | 'popup'

export interface ActionButton {
  key: string
  label: string
  type: 'primary' | 'default' | 'danger'
  action: 'submit' | 'reset'
  visible: boolean
}

export interface ButtonConfig {
  align: 'left' | 'center' | 'right'
  buttons: ActionButton[]
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
