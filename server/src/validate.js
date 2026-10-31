// Small validators. Each returns an error message or '' so routes can collect them per field.
export const str = (v, max = 255) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)
/** Normalises Indian mobile numbers to 10 digits (drops spaces, dashes and a +91/91/0 prefix). */
export const normPhone = (v) => {
  const d = String(v ?? '').replace(/[\s-]/g, '').replace(/^(\+?91|0)(?=\d{10}$)/, '')
  return d.slice(0, 20)
}
export const isPhone = (v) => /^(\+?91[\s-]?)?[6-9]\d{9}$/.test(String(v).replace(/[\s-]/g, ''))
export const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))
export const isTime = (v) => /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(v)

// The business runs on India time. Dates are 'YYYY-MM-DD' and times 'HH:MM' in Asia/Kolkata.
export const TZ = 'Asia/Kolkata'
const dateFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
const timeFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
export const today = (offsetDays = 0) => dateFmt.format(new Date(Date.now() + offsetDays * 864e5))
export const nowTime = () => timeFmt.format(new Date())
/** How far ahead customers can book online. */
export const MAX_ADVANCE_DAYS = 180
/** True when the pickup is later than the current India time and within the booking window. */
export const isFuturePickup = (date, time) =>
  isDate(date) && isTime(time) && date <= today(MAX_ADVANCE_DAYS) && (date > today() || (date === today() && time.slice(0, 5) > nowTime()))

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
