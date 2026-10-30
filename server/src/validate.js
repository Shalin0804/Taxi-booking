// Small validators. Each returns an error message or '' so routes can collect them per field.
export const str = (v, max = 255) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)
/** Normalises Indian mobile numbers to 10 digits (drops spaces, dashes and a +91/91/0 prefix). */
export const normPhone = (v) => {
  const d = String(v ?? '').replace(/[\s-]/g, '').replace(/^(\+?91|0)(?=\d{10}$)/, '')
  return d.slice(0, 20)
}
export const isPhone =(v) => /^(\+?91[\s-]?)?[6-9]\d{9}$/.test(String(v).replace(/[\s-]/g, ''))
export const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))
export const isTime = (v) => /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(v)
export const today = () => new Date().toISOString().slice(0, 10)

/** Throws a 400 with field errors when any rule fails. rules: { field: [condition, message] } */
export function check(rules) {
  const errors = {}
  for (const [field, [ok, msg]] of Object.entries(rules)) if (!ok) errors[field] = msg
  if (Object.keys(errors).length) {
    const e = new Error('Please fix the highlighted fields.')
    e.status = 400
    e.fields = errors
    throw e
  }
}
