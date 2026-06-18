import { message } from 'antd'
import api from '@/api/axios'
import type { ActionDef, EventBinding, EventType } from '@/types/events'

export interface ExecuteContext {
  formValues?: Record<string, unknown>
  fieldValue?: unknown
  fieldNm?: string
  setFieldValue?: (fieldNm: string, value: unknown) => void
  navigate?: (screenId: string, openType?: string) => void
  openPopup?: (screenId: string) => void
  refreshData?: () => void
  closePopup?: () => void
  onSetError?: (fieldNm: string, msg: string | undefined) => void
}

function resolveExpr(expr: string | undefined, ctx: ExecuteContext): string {
  if (!expr) return ''
  return expr.replace(/\$\{(\w+)\}/g, (_, key) => {
    if (key === '__value') return String(ctx.fieldValue ?? '')
    return String(ctx.formValues?.[key] ?? '')
  })
}

async function runAction(action: ActionDef, ctx: ExecuteContext): Promise<boolean> {
  switch (action.type) {
    case 'showMessage': {
      const mtype = (action.params.messageType as string) ?? 'info'
      const content = resolveExpr(action.params.content as string, ctx)
      ;(message as unknown as Record<string, (msg: string) => void>)[mtype]?.(content)
      return true
    }

    case 'setFieldValue': {
      const field = action.params.field as string
      const valueExpr = resolveExpr(action.params.valueExpr as string, ctx)
      ctx.setFieldValue?.(field, valueExpr)
      return true
    }

    case 'clearField': {
      const fields = (action.params.fields as string[]) ?? []
      fields.forEach(f => ctx.setFieldValue?.(f, undefined))
      return true
    }

    case 'callApi': {
      const method = ((action.params.method as string) ?? 'GET').toLowerCase()
      const endpoint = resolveExpr(action.params.endpoint as string, ctx)
      if (!endpoint) return true

      const params: Record<string, string> = {}
      if (ctx.fieldNm && ctx.fieldValue !== undefined)
        params[ctx.fieldNm] = String(ctx.fieldValue ?? '')
      Object.entries(ctx.formValues ?? {}).forEach(([k, v]) => { params[k] = String(v ?? '') })

      const res = method === 'get'
        ? await api.get(endpoint, { params })
        : await api.post(endpoint, params)
      const data = res.data.data

      // Error condition check
      const errCond = action.params.errorCondition as string | undefined
      if (errCond && data != null) {
        const total = typeof data === 'object' ? (data as Record<string, unknown>).total : null
        const condMet = errCond.includes('> 0')
          ? Number(total) > 0
          : errCond.includes('== 0')
            ? Number(total) === 0
            : false
        if (condMet) {
          if (ctx.onSetError && ctx.fieldNm)
            ctx.onSetError(ctx.fieldNm, (action.params.errorMessage as string) ?? '유효하지 않은 값입니다')
          return false  // stop chain
        }
      }
      if (ctx.onSetError && ctx.fieldNm) ctx.onSetError(ctx.fieldNm, undefined)

      // Map result fields
      const mapping = action.params.resultMapping as Array<{ apiField: string; targetField: string }> | undefined
      if (mapping?.length && ctx.setFieldValue && data) {
        mapping.forEach(m => {
          const val = typeof data === 'object' ? (data as Record<string, unknown>)[m.apiField] : null
          if (val !== undefined && val !== null) ctx.setFieldValue!(m.targetField, val)
        })
      }
      const resultField = action.params.resultField as string | undefined
      if (resultField && ctx.setFieldValue && data) {
        const val = typeof data === 'object' ? (data as Record<string, unknown>)[resultField] : data
        if (val !== undefined) ctx.setFieldValue(resultField, val)
      }
      return true
    }

    case 'navigate':
      ctx.navigate?.(action.params.screenId as string, action.params.openType as string)
      return true

    case 'openPopup':
      ctx.openPopup?.(action.params.screenId as string)
      return true

    case 'refreshData':
      ctx.refreshData?.()
      return true

    case 'closePopup':
      ctx.closePopup?.()
      return true

    default:
      return true
  }
}

export async function executeActions(actions: ActionDef[], ctx: ExecuteContext): Promise<void> {
  for (const action of actions) {
    try {
      const cont = await runAction(action, ctx)
      if (!cont) break
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      message.error(err.response?.data?.message ?? `액션 실행 오류 (${action.type})`)
    }
  }
}

export function getBindingsForEvent(
  bindings: EventBinding[] | undefined,
  event: EventType,
): ActionDef[] {
  return (bindings ?? [])
    .filter(b => b.event === event)
    .flatMap(b => b.actions)
}
