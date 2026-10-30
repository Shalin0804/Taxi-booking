import { useState } from 'react'
import StatusBadge from '../components/StatusBadge'
import { DataTable, Modal, PageHeader, date, useApi, useToast } from './kit'
import { request } from '../lib/api'
import { useAdmin } from './adminAuth'

export default function Enquiries({ type }) {
  const { can } = useAdmin()
  const [status, setStatus] = useState('')
  const [open, setOpen] = useState(null)
  const toast = useToast()
  const qs = new URLSearchParams(Object.entries({ type, status }).filter(([, v]) => v)).toString()
  const { data, error, loading, reload } = useApi(`/api/admin/enquiries${qs ? `?${qs}` : ''}`)

  const setEnquiryStatus = async (e, s) => {
    try {
      await request(`/api/admin/enquiries/${e.id}`, { method: 'PATCH', body: { status: s } })
      toast('Enquiry updated')
      setOpen(null)
      reload()
    } catch (ex) { toast(ex.message, 'error') }
  }

  return (
    <>
      <PageHeader title={type === 'corporate' ? 'Corporate enquiries' : 'Contact enquiries'} sub={type === 'corporate' ? 'Requests from the corporate transportation form.' : 'Messages from the contact form.'} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className="input !w-auto !py-2.5">
          <option value="">All statuses</option><option value="new">New</option><option value="in_progress">In progress</option><option value="closed">Closed</option>
        </select>
      </div>
      <DataTable loading={loading} error={error} rows={data?.rows} onRowClick={setOpen} empty="No enquiries yet."
        columns={[
          { key: 'type', label: 'Type', render: (r) => <span className="capitalize">{r.type}</span> },
          { key: 'name', label: 'From', render: (r) => <><span className="block font-medium">{r.company || r.name}</span><span className="text-slate">{r.company ? r.name : r.email}</span></> },
          { key: 'message', label: 'Message', render: (r) => <span className="line-clamp-2 max-w-md">{r.subject ? `${r.subject}: ` : ''}{r.message}</span> },
          { key: 'created_at', label: 'Received', render: (r) => date(r.created_at) },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
        ]} />
      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `${open.type === 'corporate' ? 'Corporate' : 'Contact'} enquiry` : ''}>
        {open && (
          <>
            <dl className="grid gap-2.5 text-sm">
              {[['Name', open.name], ['Company', open.company], ['Employees', open.employees], ['Subject', open.subject],
                ['Email', <a key="e" className="text-electric" href={`mailto:${open.email}`}>{open.email}</a>],
                ['Phone', <a key="p" className="text-electric" href={`tel:${open.phone}`}>{open.phone}</a>], ['Received', date(open.created_at)]]
                .filter(([, v]) => v).map(([k, v]) => <div key={k} className="grid grid-cols-[6.5rem_1fr] gap-3"><dt className="text-slate">{k}</dt><dd>{v}</dd></div>)}
            </dl>
            <p className="mt-5 whitespace-pre-wrap rounded-xl bg-mist p-4 text-[0.95rem]">{open.message}</p>
            {can('enquiries:write') && <div className="mt-6 flex flex-wrap justify-end gap-2">
              {open.status !== 'in_progress' && <button onClick={() => setEnquiryStatus(open, 'in_progress')} className="btn btn-line !py-2.5">Mark in progress</button>}
              {open.status !== 'closed' && <button onClick={() => setEnquiryStatus(open, 'closed')} className="btn btn-navy !py-2.5">Mark closed</button>}
              {open.status === 'closed' && <button onClick={() => setEnquiryStatus(open, 'new')} className="btn btn-line !py-2.5">Reopen</button>}
            </div>}
          </>
        )}
      </Modal>
    </>
  )
}
