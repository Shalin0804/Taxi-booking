import { useState } from 'react'
import { ArrowRight, Briefcase, Building2, Users, Route } from 'lucide-react'
import Seo from '../components/Seo'
import { Page, PageHero, Picture, SectionHead } from '../components/ui'
import { Field, SubmitButton, SubmitResult, isEmail, isPhone, useSubmit } from '../components/forms'
import { submitEnquiry } from '../lib/api'

const offers = [
  { icon: Users, title: 'Employee transportation', text: 'Well-managed, structured commute facilities that improve employee experience and productivity.' },
  { icon: Building2, title: 'Workplace commute', text: 'Hassle-free daily office commutes, planned around your shifts and locations.' },
  { icon: Briefcase, title: 'Corporate travel', text: 'Business rentals for meetings, client visits and airport runs, with professional chauffeurs.' },
  { icon: Route, title: 'Business mobility', text: 'Customised plans across our cities, with hourly, one-way and round-trip options.' },
]
const sizes = ['1–25', '26–100', '101–500', '500+']

export default function Corporate() {
  const [f, setF] = useState({ company: '', contact: '', email: '', phone: '', employees: '', requirements: '' })
  const [errors, setErrors] = useState({})
  const [state, run, reset] = useSubmit(submitEnquiry)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    const err = {}
    if (!f.company.trim()) err.company = 'Enter your company name'
    if (!f.contact.trim()) err.contact = 'Enter a contact person'
    if (!isEmail(f.email)) err.email = 'Enter a valid work email'
    if (!isPhone(f.phone)) err.phone = 'Enter a 10-digit mobile number'
    if (!f.employees) err.employees = 'Choose an employee count'
    if (f.requirements.trim().length < 10) err.requirements = 'Describe your requirements (at least 10 characters)'
    setErrors(err)
    if (!Object.keys(err).length) run({ type: 'corporate', ...f })
  }

  const summary = { Company: f.company, 'Contact person': f.contact, Email: f.email, Phone: f.phone, Employees: f.employees, Requirements: f.requirements }

  return (
    <Page>
      <Seo path="/corporate" />
      <PageHero image="handshake" title="Transport your business can rely on."
        lede="Rethink commuting for a better employee experience and a smarter, more sustainable workplace.">
        <a href="#enquiry" className="btn btn-gold">Request corporate transportation <ArrowRight className="h-4 w-4" /></a>
      </PageHero>

      <section className="py-24 sm:py-32">
        <div className="wrap">
          <SectionHead title="One partner for how your people move."
            lede="Our workplace commute service aims to exceed expectations on service and overall value in people transportation." />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" data-stagger>
            {offers.map((o) => (
              <div key={o.title} data-reveal className="group rounded-[1.5rem] border border-line p-7 transition-all duration-500 hover:-translate-y-1 hover:border-navy hover:shadow-[0_30px_60px_-30px_rgb(16_36_61/0.35)]">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-navy text-gold transition-transform duration-500 group-hover:scale-110"><o.icon className="h-5 w-5" /></span>
                <h3 className="mt-7 text-xl font-semibold">{o.title}</h3>
                <p className="mt-3 text-[0.97rem] text-slate">{o.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-navy py-24 text-white sm:py-32">
        <div className="wrap grid items-center gap-14 lg:grid-cols-2">
          <div className="aspect-[5/4] overflow-hidden rounded-[1.5rem]" data-mask>
            <Picture name="commute" alt="Morning traffic on a street in Dadar, Mumbai" sizes="(min-width: 1024px) 50vw, 100vw" className="h-full w-full object-cover" />
          </div>
          <div>
            <h2 className="h2" data-reveal>Built around your workforce.</h2>
            <p className="lede mt-6 text-white/70" data-reveal>
              Drivers are background-verified and trained, vehicles are inspected routinely, and support is on hand 24/7.
              Share your locations, shift timings and headcount, and we'll put together a plan.
            </p>
          </div>
        </div>
      </section>

      <section id="enquiry" className="scroll-mt-24 py-24 sm:py-32">
        <div className="wrap grid gap-14 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
          <div data-reveal>
            <h2 className="h2">Request corporate transportation</h2>
            <p className="lede mt-5 text-slate">Tell us about your team and we'll get back to you within 24 hours.</p>
          </div>
          <div data-reveal>
            {state.status === 'idle' || state.status === 'sending' ? (
              <form onSubmit={submit} noValidate className="grid gap-5 rounded-[1.5rem] bg-mist p-6 sm:grid-cols-2 sm:p-10">
                <Field label="Company name" error={errors.company}><input className="input" value={f.company} onChange={set('company')} autoComplete="organization" aria-invalid={!!errors.company} /></Field>
                <Field label="Contact person" error={errors.contact}><input className="input" value={f.contact} onChange={set('contact')} autoComplete="name" aria-invalid={!!errors.contact} /></Field>
                <Field label="Work email" error={errors.email}><input type="email" className="input" value={f.email} onChange={set('email')} autoComplete="email" aria-invalid={!!errors.email} /></Field>
                <Field label="Phone" error={errors.phone}><input type="tel" inputMode="tel" className="input" value={f.phone} onChange={set('phone')} autoComplete="tel" aria-invalid={!!errors.phone} /></Field>
                <fieldset className="sm:col-span-2">
                  <legend className="field-label">Employee count</legend>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {sizes.map((s) => (
                      <label key={s} className={`cursor-pointer rounded-xl border px-4 py-3 text-center text-[0.95rem] font-medium transition-all duration-300 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-electric ${
                        f.employees === s ? 'border-navy bg-navy text-white' : 'border-line bg-white hover:border-navy/40'}`}>
                        <input type="radio" name="employees" value={s} checked={f.employees === s} onChange={set('employees')} className="sr-only" />
                        {s}
                      </label>
                    ))}
                  </div>
                  {errors.employees && <p className="field-error" role="alert">{errors.employees}</p>}
                </fieldset>
                <Field label="Requirements" error={errors.requirements} className="sm:col-span-2" hint="Locations, shift timings, vehicle types, start date">
                  <textarea rows={5} className="input resize-y" value={f.requirements} onChange={set('requirements')} aria-invalid={!!errors.requirements} />
                </Field>
                <div className="sm:col-span-2">
                  <SubmitButton sending={state.status === 'sending'} className="btn-navy w-full whitespace-normal text-center sm:w-auto">Request Corporate Transportation</SubmitButton>
                </div>
              </form>
            ) : (
              <SubmitResult state={state} title="Corporate transportation enquiry" summary={summary} onReset={reset}
                sentText="Thanks. Our corporate team will contact you within 24 hours." />
            )}
          </div>
        </div>
      </section>
    </Page>
  )
}
