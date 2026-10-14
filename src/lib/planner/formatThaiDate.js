const WEEKDAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

/** Format YYYY-MM-DD as Thai label matching the HTML planner. */
export function formatThaiPlanDate(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d))
  const weekday = WEEKDAYS[utc.getUTCDay()]
  return `วัน${weekday} ${d} ${MONTHS[m - 1]} ${y + 543}`
}
