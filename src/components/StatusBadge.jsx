const styles = {
  pending: ['Pending', 'bg-amber-50 text-amber-800 ring-amber-200'],
  confirmed: ['Confirmed', 'bg-blue-50 text-blue-700 ring-blue-200'],
  assigned: ['Driver assigned', 'bg-indigo-50 text-indigo-700 ring-indigo-200'],
  in_progress: ['On trip', 'bg-violet-50 text-violet-700 ring-violet-200'],
  completed: ['Completed', 'bg-emerald-50 text-emerald-700 ring-emerald-200'],
  cancelled: ['Cancelled', 'bg-slate-100 text-slate-600 ring-slate-200'],
  new: ['New', 'bg-amber-50 text-amber-800 ring-amber-200'],
  closed: ['Closed', 'bg-slate-100 text-slate-600 ring-slate-200'],
  active: ['Active', 'bg-emerald-50 text-emerald-700 ring-emerald-200'],
  available: ['Available', 'bg-emerald-50 text-emerald-700 ring-emerald-200'],
  on_trip: ['On trip', 'bg-violet-50 text-violet-700 ring-violet-200'],
  off_duty: ['Off duty', 'bg-slate-100 text-slate-600 ring-slate-200'],
  maintenance: ['Maintenance', 'bg-amber-50 text-amber-800 ring-amber-200'],
  inactive: ['Inactive', 'bg-slate-100 text-slate-600 ring-slate-200'],
}

export const statusLabel = (s) => styles[s]?.[0] || s

export default function StatusBadge({ status }) {
  const [label, cls] = styles[status] || [status, 'bg-slate-100 text-slate-600 ring-slate-200']
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${cls}`}>{label}</span>
}
