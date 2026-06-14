import type { ValidationRule, FieldDef } from '@/types/schema'

type FormValues = Record<string, unknown>

export function runValidation(
  field: FieldDef,
  value: unknown,
  allValues: FormValues
): string | null {
  for (const rule of field.validationRules) {
    if (!isConditionMet(rule, allValues)) continue

    const error = checkRule(rule, value, field)
    if (error) return error
  }
  return null
}

function checkRule(rule: ValidationRule, value: unknown, field: FieldDef): string | null {
  const str = value == null ? '' : String(value).trim()

  switch (rule.ruleType) {
    case 'required':
      if (!str) return rule.errorMsg
      break
    case 'minLength':
      if (str && str.length < Number(rule.ruleValue))
        return rule.errorMsg
      break
    case 'maxLength':
      if (str.length > Number(rule.ruleValue))
        return rule.errorMsg
      break
    case 'min':
      if (str && Number(str) < Number(rule.ruleValue))
        return rule.errorMsg
      break
    case 'max':
      if (str && Number(str) > Number(rule.ruleValue))
        return rule.errorMsg
      break
    case 'regex':
      if (str && !new RegExp(rule.ruleValue!).test(str))
        return rule.errorMsg
      break
    case 'email':
      if (str && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str))
        return rule.errorMsg
      break
    case 'number':
      if (str && !/^\d+(\.\d+)?$/.test(str))
        return rule.errorMsg
      break
  }
  return null
}

function isConditionMet(rule: ValidationRule, allValues: FormValues): boolean {
  if (!rule.conditionJson) return true
  const { field, operator, value } = rule.conditionJson
  const actual = allValues[field]

  switch (operator) {
    case '==': return actual === value
    case '!=': return actual !== value
    case '>':  return Number(actual) > Number(value)
    case '<':  return Number(actual) < Number(value)
    case 'in': return Array.isArray(value) && value.includes(actual)
    case 'notIn': return Array.isArray(value) && !value.includes(actual)
    default: return true
  }
}

export function validateAll(
  fields: FieldDef[],
  values: FormValues
): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const field of fields) {
    if (field.hidden) continue
    const error = runValidation(field, values[field.fieldNm], values)
    if (error) errors[field.fieldNm] = error
  }
  return errors
}
