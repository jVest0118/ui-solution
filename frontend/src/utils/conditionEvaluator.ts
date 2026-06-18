export type ConditionOp =
  | 'eq' | 'ne'
  | 'gt' | 'lt' | 'gte' | 'lte'
  | 'in' | 'notIn'
  | 'contains' | 'empty' | 'notEmpty'

export interface ConditionRule {
  field: string
  op: ConditionOp
  value?: unknown
}

export interface FieldConditions {
  showWhen?: ConditionRule[]
  hideWhen?: ConditionRule[]
  requiredWhen?: ConditionRule[]
  disabledWhen?: ConditionRule[]
}

export interface FieldConditionResult {
  visible: boolean
  required: boolean
  disabled: boolean
}

function evalOne(rule: ConditionRule, formValues: Record<string, unknown>): boolean {
  const fieldVal = formValues[rule.field]
  const ruleVal = rule.value

  switch (rule.op) {
    case 'eq':  return String(fieldVal ?? '') === String(ruleVal ?? '')
    case 'ne':  return String(fieldVal ?? '') !== String(ruleVal ?? '')
    case 'gt':  return Number(fieldVal) > Number(ruleVal)
    case 'lt':  return Number(fieldVal) < Number(ruleVal)
    case 'gte': return Number(fieldVal) >= Number(ruleVal)
    case 'lte': return Number(fieldVal) <= Number(ruleVal)
    case 'in': {
      const arr = Array.isArray(ruleVal)
        ? ruleVal.map(String)
        : String(ruleVal ?? '').split(',').map(s => s.trim()).filter(Boolean)
      return arr.includes(String(fieldVal ?? ''))
    }
    case 'notIn': {
      const arr = Array.isArray(ruleVal)
        ? ruleVal.map(String)
        : String(ruleVal ?? '').split(',').map(s => s.trim()).filter(Boolean)
      return !arr.includes(String(fieldVal ?? ''))
    }
    case 'contains':  return String(fieldVal ?? '').includes(String(ruleVal ?? ''))
    case 'empty':     return fieldVal === undefined || fieldVal === null || fieldVal === ''
    case 'notEmpty':  return fieldVal !== undefined && fieldVal !== null && fieldVal !== ''
    default: return false
  }
}

export function evaluateFieldConditions(
  extraConfig: Record<string, unknown> | undefined,
  formValues: Record<string, unknown>,
): FieldConditionResult {
  if (!extraConfig?.conditions) {
    return { visible: true, required: false, disabled: false }
  }

  const cond = extraConfig.conditions as FieldConditions

  let visible = true
  if (cond.showWhen && cond.showWhen.length > 0) {
    visible = cond.showWhen.every(r => evalOne(r, formValues))
  }
  if (visible && cond.hideWhen && cond.hideWhen.length > 0) {
    if (cond.hideWhen.some(r => evalOne(r, formValues))) visible = false
  }

  const required = !!(cond.requiredWhen?.length && cond.requiredWhen.every(r => evalOne(r, formValues)))
  const disabled = !!(cond.disabledWhen?.length && cond.disabledWhen.some(r => evalOne(r, formValues)))

  return { visible, required, disabled }
}
