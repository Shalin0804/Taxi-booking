import { useState } from 'react'
import { Mail, MessageCircle, Phone, Headset } from 'lucide-react'
import Seo from '../components/Seo'
import { Page, PageHero } from '../components/ui'
import { Field, SubmitButton, SubmitResult, isEmail, isPhone, useSubmit } from '../components/forms'
import { Instagram, Facebook } from '../components/Footer'
import { submitEnquiry } from '../lib/api'
import { company } from '../data/site'

// Subjects offered by the live contact form.
const subjects = ['Business query', 'Join as a vendor', 'Other']

export default function Contact() {
  const [f, setF] = useState({ name: '', email: '', phone: '', subject: subjects[0], message: '' })
  const [errors, setErrors] = useState({})
  const [state, run, reset] = useSubmit(submitEnquiry)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    const err = {}
    if (!f.name.trim()) err.name = 'Enter your name'
    if (!isEmail(f.email)) err.email = 'Enter a valid email, like name@example.com'
    if (!isPhone(f.phone)) err.phone = 'Enter a 10-digit mobile number'
    if (f.message.trim().length < 10) err.message = 'Tell us a little more (at least 10 characters)'
    setErrors(err)
    if (!Object.keys(err).length) run({ type: 'contact', ...f })
  }

  const summary = { Name: f.name, Email: f.email, Phone: f.phone, Subject: f.subject, Message: f.message }
  const channels = [
    { icon: Phone, label: 'Call', value: company.phoneDisplay, href: company.phoneHref },
    { icon: MessageCircle, label: 'WhatsApp', value: company.phoneDisplay, href: `https://wa.me/${company.whatsapp}` },
    { icon: Mail, label: 'Email', value: company.email, href: `mailto:${company.email}` },
  ]

  return (
    <Page>
      <Seo path="/contact" />
      <PageHero image="city" title="We're here to help." lede="Our team will get back to you within 24 hours. For a ride today, calling is fastest." />

      <section className="py-24 sm:py-32">
        <div className="wrap grid gap-14 lg:grid-cols-[1fr_1.3fr] lg:gap-20">
          <div>
            <h2 className="text-3xl font-semibold" data-reveal>Talk to us directly</h2>
            <ul className="mt-8 grid gap-3" data-stagger>
              {channels.map((c) => (
                <li key={c.label} data-reveal>
                  <a href={c.href} target={c.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
                    className="group flex items-center gap-4 rounded-2xl border border-line p-5 transition-all duration-500 hover:border-midnight hover:bg-midnight hover:text-white">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-mist text-navy transition-colors duration-500 group-hover:bg-gold group-hover:text-midnight">
                      <c.icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm text-slate transition-colors group-hover:text-white/60">{c.label}</span>
                      <span className="block break-all font-semibold">{c.value}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex items-center gap-4 rounded-2xl bg-mist p-5" data-reveal>
              <Headset className="h-5 w-5 shrink-0 text-navy" />
              <p className="text-[0.95rem] text-slate">Customer support is available 24/7 by phone, email and chat.</p>
            </div>
            <div className="mt-8 flex gap-3" data-reveal>
              <a href={company.socials.instagram} target="_blank" rel="noopener noreferrer" className="btn btn-line !px-5 !py-2.5"><Instagram className="h-4 w-4" /> Instagram</a>
              <a href={company.socials.facebook} target="_blank" rel="noopener noreferrer" className="btn btn-line !px-5 !py-2.5"><Facebook className="h-4 w-4" /> Facebook</a>
            </div>
          </div>

          <div data-reveal>
            {state.status === 'idle' || state.status === 'sending' ? (
              <form onSubmit={submit} noValidate className="rounded-[1.5rem] bg-mist p-6 sm:p-10">
                <h2 className="text-3xl font-semibold">Send us a message</h2>
                <div className="mt-8 grid gap-5 sm:grid-cols-2">
                  <Field label="Your name" error={errors.name}><input className="input" value={f.name} onChange={set('name')} autoComplete="name" aria-invalid={!!errors.name} /></Field>
                  <Field label="Email" error={errors.email}><input type="email" className="input" value={f.email} onChange={set('email')} autoComplete="email" aria-invalid={!!errors.email} /></Field>
                  <Field label="Phone" error={errors.phone}><input type="tel" className="input" value={f.phone} onChange={set('phone')} autoComplete="tel" inputMode="tel" aria-invalid={!!errors.phone} /></Field>
                  <Field label="Subject">
                    <select className="input" value={f.subject} onChange={set('subject')}>{subjects.map((s) => <option key={s}>{s}</option>)}</select>
                  </Field>
                  <Field label="Your message" error={errors.message} className="sm:col-span-2">
                    <textarea rows={5} className="input resize-y" value={f.message} onChange={set('message')} aria-invalid={!!errors.message} />
                  </Field>
                </div>
                <SubmitButton sending={state.status === 'sending'} className="btn-navy mt-8 w-full sm:w-auto">Send message</SubmitButton>
              </form>
            ) : (
              <SubmitResult state={state} title="Website enquiry" summary={summary} onReset={reset}
                sentText="Thanks for getting in touch. Our team will reply within 24 hours." />
            )}
          </div>
        </div>
      </section>
    </Page>
  )
}
