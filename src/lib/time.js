// India-time dates for booking forms. Mirrors server/src/validate.js, which has the final say.
const TZ = 'Asia/Kolkata'
const dateFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
const timeFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

/** 'YYYY-MM-DD' in India, optionally offset by whole days. */
export const today = (offsetDays = 0) => dateFmt.format(new Date(Date.now() + offsetDays * 864e5))
export const nowTime = () => timeFmt.format(new Date())
export const MAX_ADVANCE_DAYS = 180
export const lastBookableDate = () => today(MAX_ADVANCE_DAYS)
