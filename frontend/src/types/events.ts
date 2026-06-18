export type EventType = 'onChange' | 'onBlur' | 'onLoad' | 'onSubmit' | 'onRowSelect'

export type ActionType =
  | 'showMessage'
  | 'setFieldValue'
  | 'clearField'
  | 'callApi'
  | 'navigate'
  | 'openPopup'
  | 'refreshData'
  | 'closePopup'

export interface ActionDef {
  id: string
  type: ActionType
  params: Record<string, unknown>
}

export interface EventBinding {
  id: string
  event: EventType
  label?: string
  actions: ActionDef[]
}
